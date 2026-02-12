'use strict';

/* WireGuard Manager – GNOME Shell Extension (GNOME 42+)
 *
 * Polls actual interface state via unprivileged `ip link`, so CLI usage
 * (wg-quick up/down) is reflected in the panel within one refresh cycle.
 * Privileged actions (list configs, toggle, show stats) go through a
 * polkit-authorized helper to avoid password prompts on every poll.
 */

const { GLib, Gio, St, GObject } = imports.gi;
const PanelMenu    = imports.ui.panelMenu;
const PopupMenu    = imports.ui.popupMenu;
const Main         = imports.ui.main;
const MessageTray  = imports.ui.messageTray;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const HELPER_PATH = '/usr/local/bin/wg-manager-helper';

/* ── Indicator ─────────────────────────────────────────────────────── */

var WireGuardIndicator = GObject.registerClass(
class WireGuardIndicator extends PanelMenu.Button {

    _init() {
        super._init(0.0, 'WireGuard Manager');
        this.add_style_class_name('wireguard-manager-indicator');

        this._settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.wireguard-manager');

        /* Panel icon – custom shield SVGs */
        this._icon = new St.Icon({
            style_class: 'system-status-icon',
            icon_size: 16,
        });
        this.add_child(this._icon);
        this._setIcon(false);

        /* Internal state */
        this._configs        = [];          // discovered config names
        this._activeIfaces   = new Set();   // currently-up WG interfaces
        this._tunnelSwitches = {};          // name → PopupSwitchMenuItem
        this._statsItems     = {};          // name → PopupMenuItem (stats)
        this._statsLabels    = {};          // name → St.Label inside stats item
        this._fetchingStats  = new Set();   // guard concurrent fetches
        this._transitioning  = new Set();   // names being toggled right now
        this._pollSourceId   = null;
        this._settingsSigId  = null;
        this._menuBuilt      = false;

        /* Placeholder while discovering */
        this.menu.addMenuItem(
            new PopupMenu.PopupMenuItem('Loading…', { reactive: false }));

        /* Kick off async init: discover configs → poll state → build menu */
        this._discoverConfigs();

        /* Refresh immediately when the user opens the menu */
        this.menu.connect('open-state-changed', (_menu, open) => {
            if (open) this._pollState();
        });

        /* Re-start polling when interval changes */
        this._settingsSigId = this._settings.connect(
            'changed::refresh-interval', () => this._restartPolling());
    }

    /* ── Icon helpers ──────────────────────────────────────────────── */

    _setIcon(anyActive) {
        let name = anyActive ? 'wg-shield-on-symbolic' : 'wg-shield-off-symbolic';
        let gicon = Gio.icon_new_for_string(
            Me.path + '/icons/' + name + '.svg');
        this._icon.set_gicon(gicon);
    }

    /* ── Config discovery ──────────────────────────────────────────── */

    _discoverConfigs() {
        this._runHelper(['list'], (ok, stdout, _stderr) => {
            if (ok && stdout.trim().length > 0) {
                this._configs = stdout.trim().split('\n')
                    .map(s => s.trim()).filter(s => s.length > 0);
            }
            /* After discovery, get live state then build the menu */
            this._pollState(() => {
                this._buildMenu();
                this._startPolling();
            });
        });
    }

    /* ── State polling (UNPRIVILEGED – syncs CLI usage) ────────────── */

    _pollState(callback) {
        this._runCommand(
            ['ip', '-o', 'link', 'show', 'type', 'wireguard'],
            (ok, stdout, _stderr) => {
                let newActive = new Set();
                if (ok && stdout.trim()) {
                    for (let line of stdout.trim().split('\n')) {
                        let m = line.match(/^\d+:\s+(\S+?)[@:]/);
                        if (m) newActive.add(m[1]);
                    }
                }

                /* Detect interfaces that appeared via CLI but aren't in our
                   config list yet (e.g. user created a new .conf + brought
                   it up manually).  Trigger a re-discover if this happens. */
                let unknownFound = false;
                for (let iface of newActive) {
                    if (!this._configs.includes(iface)) {
                        unknownFound = true;
                        break;
                    }
                }
                if (unknownFound) {
                    this._runHelper(['list'], (ok2, out2) => {
                        if (ok2 && out2.trim().length > 0) {
                            this._configs = out2.trim().split('\n')
                                .map(s => s.trim()).filter(s => s.length > 0);
                        }
                        // Add any still-unknown interfaces
                        for (let iface of newActive) {
                            if (!this._configs.includes(iface))
                                this._configs.push(iface);
                        }
                        this._applyState(newActive);
                        if (callback) callback();
                    });
                    return;
                }

                this._applyState(newActive);
                if (callback) callback();
            }
        );
    }

    _applyState(newActive) {
        let changed = false;

        for (let name of this._configs) {
            let wasActive = this._activeIfaces.has(name);
            let isActive  = newActive.has(name);

            if (wasActive !== isActive) changed = true;

            /* Update switch (setToggleState does NOT fire 'toggled') */
            if (this._tunnelSwitches[name])
                this._tunnelSwitches[name].setToggleState(isActive);

            /* Stats visibility */
            if (this._statsItems[name])
                this._statsItems[name].visible = isActive;

            if (isActive)
                this._fetchStats(name);
        }

        this._activeIfaces = newActive;
        this._setIcon(newActive.size > 0);

        /* If the config list itself changed, rebuild the menu */
        if (changed && !this._menuBuilt)
            this._buildMenu();
    }

    /* ── Menu construction ─────────────────────────────────────────── */

    _buildMenu() {
        this.menu.removeAll();
        this._tunnelSwitches = {};
        this._statsItems     = {};
        this._statsLabels    = {};

        if (this._configs.length === 0) {
            let empty = new PopupMenu.PopupMenuItem(
                'No WireGuard configs found', { reactive: false });
            this.menu.addMenuItem(empty);
        } else {
            /* Header */
            this.menu.addMenuItem(
                new PopupMenu.PopupSeparatorMenuItem('WireGuard'));

            for (let name of this._configs) {
                let isActive = this._activeIfaces.has(name);

                /* Toggle switch */
                let sw = new PopupMenu.PopupSwitchMenuItem(name, isActive);
                sw.connect('toggled', (_item, state) =>
                    this._onToggle(name, state));
                this.menu.addMenuItem(sw);
                this._tunnelSwitches[name] = sw;

                /* Stats (non-interactive, shown only when active) */
                let stats = new PopupMenu.PopupMenuItem('  loading…', {
                    reactive: false,
                    can_focus: false,
                });
                stats.label.add_style_class_name('wg-stats-label');
                stats.visible = isActive;
                this.menu.addMenuItem(stats);
                this._statsItems[name]  = stats;
                this._statsLabels[name] = stats.label;

                if (isActive) this._fetchStats(name);
            }
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        /* Settings button */
        let settingsItem = new PopupMenu.PopupMenuItem('⚙  Settings');
        settingsItem.connect('activate', () => {
            try { ExtensionUtils.openPrefs(); } catch (_e) { /* ignore */ }
        });
        this.menu.addMenuItem(settingsItem);

        this._menuBuilt = true;
    }

    /* ── Toggle handler ────────────────────────────────────────────── */

    _onToggle(name, state) {
        if (this._transitioning.has(name)) return;
        this._transitioning.add(name);

        let action = state ? 'up' : 'down';

        if (this._tunnelSwitches[name])
            this._tunnelSwitches[name].setSensitive(false);

        this._runHelper([action, name], (ok, _stdout, stderr) => {
            this._transitioning.delete(name);

            if (this._tunnelSwitches[name])
                this._tunnelSwitches[name].setSensitive(true);

            if (ok) {
                this._notify('WireGuard',
                    name + (state ? ' connected' : ' disconnected'));
                /* Immediately refresh real state */
                this._pollState();
            } else {
                /* Revert the switch on failure */
                if (this._tunnelSwitches[name])
                    this._tunnelSwitches[name].setToggleState(!state);
                this._notify('WireGuard Error',
                    'Failed to ' + action + ' ' + name + ':\n'
                    + (stderr || '').trim());
            }
        });
    }

    /* ── Stats fetching ────────────────────────────────────────────── */

    _fetchStats(name) {
        if (this._fetchingStats.has(name)) return;
        this._fetchingStats.add(name);

        this._runHelper(['status', name], (ok, stdout, _stderr) => {
            this._fetchingStats.delete(name);

            if (!ok || !stdout || stdout.trim() === 'inactive') {
                if (this._statsItems[name])
                    this._statsItems[name].visible = false;
                return;
            }

            /* Filter out sensitive keys, keep useful info */
            let lines = stdout.split('\n').filter(l => {
                let t = l.trim().toLowerCase();
                return t.length > 0
                    && !t.startsWith('private key')
                    && !t.startsWith('preshared key');
            });

            let text = lines.join('\n');

            if (this._statsLabels[name])
                this._statsLabels[name].set_text(text);
            if (this._statsItems[name])
                this._statsItems[name].visible = true;
        });
    }

    /* ── Polling lifecycle ─────────────────────────────────────────── */

    _startPolling() {
        if (this._pollSourceId) return;
        let interval = this._settings.get_int('refresh-interval');
        this._pollSourceId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, interval, () => {
                this._pollState();
                return GLib.SOURCE_CONTINUE;
            });
    }

    _restartPolling() {
        if (this._pollSourceId) {
            GLib.Source.remove(this._pollSourceId);
            this._pollSourceId = null;
        }
        this._startPolling();
    }

    /* ── Subprocess helpers ────────────────────────────────────────── */

    _runCommand(argv, callback) {
        try {
            let proc = Gio.Subprocess.new(
                argv,
                Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_PIPE);
            proc.communicate_utf8_async(null, null, (p, res) => {
                try {
                    let [, out, err] = p.communicate_utf8_finish(res);
                    callback(p.get_successful(), out || '', err || '');
                } catch (e) {
                    callback(false, '', e.message);
                }
            });
        } catch (e) {
            callback(false, '', e.message);
        }
    }

    _runHelper(args, callback) {
        this._runCommand(
            ['pkexec', HELPER_PATH].concat(args), callback);
    }

    /* ── Notifications ─────────────────────────────────────────────── */

    _notify(title, body) {
        if (!this._settings.get_boolean('show-notifications')) return;
        try {
            let source = new MessageTray.Source(
                'WireGuard Manager', 'network-vpn-symbolic');
            Main.messageTray.add(source);
            let n = new MessageTray.Notification(source, title, body);
            n.setTransient(true);
            source.showNotification(n);
        } catch (_e) { /* swallow – notifications are best-effort */ }
    }

    /* ── Cleanup ───────────────────────────────────────────────────── */

    destroy() {
        if (this._pollSourceId) {
            GLib.Source.remove(this._pollSourceId);
            this._pollSourceId = null;
        }
        if (this._settingsSigId) {
            this._settings.disconnect(this._settingsSigId);
            this._settingsSigId = null;
        }
        super.destroy();
    }
});

/* ── Extension entry points ────────────────────────────────────────── */

let indicator;

function init() { /* nothing */ }

function enable() {
    indicator = new WireGuardIndicator();
    Main.panel.addToStatusArea('wireguard-manager', indicator);
}

function disable() {
    if (indicator) {
        indicator.destroy();
        indicator = null;
    }
}

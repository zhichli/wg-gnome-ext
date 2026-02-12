'use strict';

/* WireGuard Manager – Preferences (GTK 4, GNOME 42+) */

const { Gio, Gtk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

function init() { /* nothing */ }

function buildPrefsWidget() {
    let settings = ExtensionUtils.getSettings(
        'org.gnome.shell.extensions.wireguard-manager');

    let box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 16,
        margin_top: 24,
        margin_bottom: 24,
        margin_start: 24,
        margin_end: 24,
    });

    /* ── Title ─────────────────────────────────────────────────────── */
    let title = new Gtk.Label({
        label: '<b>WireGuard Manager</b>',
        use_markup: true,
        halign: Gtk.Align.START,
    });
    box.append(title);

    /* ── Refresh Interval ──────────────────────────────────────────── */
    let refreshRow = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12,
    });
    refreshRow.append(new Gtk.Label({
        label: 'Refresh interval (seconds)',
        hexpand: true,
        halign: Gtk.Align.START,
    }));

    let adj = new Gtk.Adjustment({
        lower: 1,
        upper: 30,
        step_increment: 1,
        page_increment: 5,
        value: settings.get_int('refresh-interval'),
    });
    let spin = new Gtk.SpinButton({ adjustment: adj, climb_rate: 1, digits: 0 });
    settings.bind('refresh-interval', spin, 'value',
        Gio.SettingsBindFlags.DEFAULT);
    refreshRow.append(spin);
    box.append(refreshRow);

    /* ── Notifications ─────────────────────────────────────────────── */
    let notifRow = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12,
    });
    notifRow.append(new Gtk.Label({
        label: 'Show notifications on connect / disconnect',
        hexpand: true,
        halign: Gtk.Align.START,
    }));

    let sw = new Gtk.Switch({
        active: settings.get_boolean('show-notifications'),
        valign: Gtk.Align.CENTER,
    });
    settings.bind('show-notifications', sw, 'active',
        Gio.SettingsBindFlags.DEFAULT);
    notifRow.append(sw);
    box.append(notifRow);

    /* ── Info ───────────────────────────────────────────────────────── */
    let info = new Gtk.Label({
        label: '<small>Configs are discovered from /etc/wireguard/*.conf\n'
             + 'State syncs automatically with CLI (wg-quick up/down)</small>',
        use_markup: true,
        halign: Gtk.Align.START,
        margin_top: 12,
        opacity: 0.6,
    });
    box.append(info);

    return box;
}

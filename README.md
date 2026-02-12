# WireGuard Manager – GNOME Shell Extension

A simple GNOME Shell panel extension to manage WireGuard VPN tunnels.
Auto-detects configs, provides one-click toggle, and shows live connection stats — right from the top bar.

![GNOME 42+](https://img.shields.io/badge/GNOME-42%2B-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green)

## Features

- **Auto-discovery** – Scans `/etc/wireguard/*.conf` automatically
- **One-click toggle** – Turn tunnels on/off from the panel dropdown
- **Live stats** – Shows endpoint, handshake, and transfer data from `wg show`
- **CLI sync** – Polls actual interface state, so `wg-quick up/down` from a terminal reflects instantly in the panel
- **Polkit integration** – No password prompt for active console sessions (like NetworkManager)
- **Settings** – Configurable refresh interval and notification toggle
- **Lightweight** – No dependencies beyond GNOME Shell and WireGuard tools

## Screenshots

| Tunnel Off | Tunnel On |
|:---:|:---:|
| Shield outline in panel | Filled shield + live stats in dropdown |

*(Replace with actual screenshots after install)*

## Requirements

- GNOME Shell 42+ (Ubuntu 22.04+, Fedora 36+, etc.)
- WireGuard tools (`wg-quick`, `wg`) installed
- At least one config in `/etc/wireguard/*.conf`
- `polkit` (pre-installed on most GNOME desktops)

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/wg-gnome-ext.git
cd wg-gnome-ext
bash install.sh
```

The installer will:
1. Copy the helper script to `/usr/local/bin/` (requires sudo)
2. Install a polkit policy for password-free tunnel management
3. Install the extension to `~/.local/share/gnome-shell/extensions/`
4. Compile GSettings schemas

Then **restart GNOME Shell**:
- **X11**: Press `Alt+F2`, type `r`, press Enter
- **Wayland**: Log out and log back in

Finally, enable the extension:

```bash
gnome-extensions enable wireguard-manager@wg-gnome-ext
```

## Uninstallation

```bash
cd wg-gnome-ext
bash uninstall.sh
```

## How It Works

| Component | Purpose |
|-----------|---------|
| `extension.js` | Panel indicator, dropdown menu, state polling |
| `prefs.js` | Settings dialog (refresh interval, notifications) |
| `wg-manager-helper` | Root helper script for `wg-quick` and `wg show` |
| Polkit policy | Authorizes helper without password for console sessions |

**State detection** uses unprivileged `ip link show type wireguard` every *N* seconds (default: 5). This means if you toggle a tunnel from the CLI, the panel icon updates automatically — no proprietary monitoring needed.

**Privileged operations** (toggle, stats) go through `pkexec wg-manager-helper`, authorized by the bundled polkit policy. Config names are strictly validated (`[a-zA-Z0-9_-]` only).

## Settings

Open via the ⚙ button in the dropdown, or:

```bash
gnome-extensions prefs wireguard-manager@wg-gnome-ext
```

| Setting | Default | Description |
|---------|---------|-------------|
| Refresh interval | 5 seconds | How often to poll interface state (1–30s) |
| Show notifications | On | Desktop notifications on connect/disconnect |

## Project Structure

```
wg-gnome-ext/
├── wireguard-manager@wg-gnome-ext/   # GNOME Shell extension
│   ├── extension.js
│   ├── prefs.js
│   ├── metadata.json
│   ├── stylesheet.css
│   ├── icons/
│   │   ├── wg-shield-on-symbolic.svg
│   │   └── wg-shield-off-symbolic.svg
│   └── schemas/
│       └── org.gnome.shell.extensions.wireguard-manager.gschema.xml
├── helpers/
│   ├── wg-manager-helper              # Privileged helper script
│   └── org.wireguard.manager.policy   # Polkit policy
├── install.sh
├── uninstall.sh
├── LICENSE
└── README.md
```

## Design Decisions

### Principles

- **Zero-config discovery** – Auto-scans `/etc/wireguard/*.conf`, no manual setup
- **Minimal, native UX** – Feels like a built-in GNOME system indicator
- **Safe privilege escalation** – Uses polkit for root ops, never stores credentials
- **Battery-conscious polling** – Lightweight `ip link` check, configurable interval

### Explicit Non-Goals

These are intentionally out of scope to keep the extension simple:

- Create / edit WireGuard configs from UI
- NetworkManager integration
- Import configs from arbitrary paths
- Split-tunnel / routing rule editor
- DNS leak testing / kill switch
- Auto-connect on login
- Transfer speed graphs / historical stats
- Multi-user / per-user tunnel isolation

### Alternatives

| Alternative | Pros | Cons |
|-------------|------|------|
| [WireGuard Indicator](https://github.com/atareao/wireguard-indicator) (atareao) | ~46k downloads | Battery drain reports, no live stats, limited GNOME version support |
| NetworkManager native | Zero-extension dependency | Doesn't use wg-quick configs, poor status visibility |
| CLI (`wg-quick` script) | Full control | No GUI, requires terminal |

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-change`)
3. Commit your changes (`git commit -am 'Add feature'`)
4. Push (`git push origin feature/my-change`)
5. Open a Pull Request

## License

[MIT](LICENSE) © Zhichao Li

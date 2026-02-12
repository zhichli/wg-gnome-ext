## 🎯 WireGuard Manager Extension

### 🧠 One-Line Definition

> **A GNOME Shell panel extension that auto-detects WireGuard configs in `/etc/wireguard/`, provides one-click toggle for each tunnel, and displays live connection stats — replacing manual `wg-quick` CLI usage.**

### Top Principles
- **Zero-config discovery**: Auto-scan `/etc/wireguard/*.conf` — no manual setup
- **Minimal, native UX**: Feels like a built-in GNOME system indicator
- **Safe privilege escalation**: Uses polkit (pkexec) for root operations — never stores credentials
- **Battery-conscious polling**: Refreshes only when tunnels are active, with configurable interval

---

### 1. Tunnel Discovery & Management

| Feature | Support |
|---------|---------|
| Auto-detect configs in `/etc/wireguard/*.conf` | ✅ |
| List all discovered tunnels in dropdown | ✅ |
| Toggle tunnel on/off via switch per config | ✅ |
| Show active tunnel count in panel (badge) | ✅ |
| Uses `wg-quick up/down <name>` for lifecycle | ✅ |
| Manual config path override | ❌ |

### 2. Status Display

| Feature | Support |
|---------|---------|
| Live `wg show <name>` output per active tunnel | ✅ |
| Peer endpoint, allowed IPs | ✅ |
| Latest handshake timestamp | ✅ |
| Transfer (received / sent) | ✅ |
| Auto-refresh every N seconds (default: 5s) | ✅ |
| Sync state when user runs `wg-quick` from CLI | ✅ |
| Peer names from config comments | ❌ |

### 3. Panel Indicator

| Feature | Support |
|---------|---------|
| Shield icon in top bar | ✅ |
| Filled shield = at least one tunnel active | ✅ |
| Outline shield = all tunnels down | ✅ |
| Color tint when active (subtle green/blue) | Optional |
| Tooltip showing active tunnel count | ✅ |

### 4. Authentication & Security

| Feature | Support |
|---------|---------|
| pkexec (polkit) for `wg-quick` and `wg show` | ✅ |
| Custom polkit policy file for wg-quick | ✅ |
| Passwordless sudo option | ❌ |
| Config file content never read by extension | ✅ |
| No credentials stored | ✅ |

### 5. Notifications

| Feature | Support |
|---------|---------|
| Notify on tunnel connect | ✅ |
| Notify on tunnel disconnect | ✅ |
| Notify on tunnel error / auth failure | ✅ |
| Desktop notification via GNOME notifications | ✅ |

### 6. Settings (Preferences Window)

| Feature | Support |
|---------|---------|
| Refresh interval slider (1–30 seconds) | ✅ |
| Enable/disable notifications toggle | ✅ |
| Config directory path (read-only display) | ✅ |

### 7. UI / UX Principles

| Principle | Description |
|-----------|-------------|
| Native GNOME feel | Use `PopupMenu`, `St.Icon`, standard GNOME Shell patterns |
| Immediate feedback | Toggle switch reflects state instantly, spinner during transition |
| Compact status | Show key stats (handshake, transfer) in monospace, collapsible per tunnel |
| Accessible | Keyboard navigable, proper ARIA labels |
| Non-intrusive | No persistent banners or overlays; panel icon + dropdown only |

### 8. Platform / Scope

| Platform | Priority |
|----------|----------|
| GNOME Shell 42 (Ubuntu 22.04) | **Primary** |
| GNOME Shell 43–46 | Supported |
| GNOME Shell 47+ | Future |
| KDE / other DEs | ❌ |
| Wayland | ✅ (primary) |
| X11 | ✅ |

### 9. Explicit Non-Goals

| Feature | Status |
|---------|--------|
| Create / edit WireGuard configs from UI | ❌ |
| NetworkManager integration (nm-connection-editor) | ❌ |
| Import `.conf` files from arbitrary paths | ❌ |
| Split-tunnel / routing rule editor | ❌ |
| DNS leak testing / kill switch | ❌ |
| Auto-connect on login | ❌ |
| Transfer speed graph / historical stats | ❌ |
| Multi-user / per-user tunnel isolation | ❌ |
| Mobile / non-GNOME platform support | ❌ |
| Publishing to extensions.gnome.org (v1) | ❌ |

---

### Market Context

| Competitor | Downloads | GNOME Support | Strengths | Weaknesses |
|-----------|-----------|---------------|-----------|------------|
| WireGuard Indicator (atareao) | ~46k | 40–44 | Good name recognition | Battery drain complaints, no live stats display, sparse settings |
| NetworkManager native | N/A | All | Zero-extension dependency | Doesn't use wg-quick configs, poor status visibility |
| CLI (`wg-quick` script) | N/A | N/A | Full control | No GUI, manual, requires terminal |

**Differentiation**: Live `wg show` stats in the dropdown, auto-discovery, proper polkit integration, configurable refresh interval, and modern GNOME 42+ compatibility.

#!/bin/bash
# uninstall.sh – Remove WireGuard Manager GNOME Extension
set -e

EXT_UUID="wireguard-manager@wg-gnome-ext"
EXT_DEST="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

echo "=== WireGuard Manager – Uninstaller ==="
echo ""

# Disable first
echo "[1/4] Disabling extension"
gnome-extensions disable "$EXT_UUID" 2>/dev/null || true

# Remove extension
echo "[2/4] Removing extension files"
rm -rf "$EXT_DEST"

# Remove helper
echo "[3/4] Removing helper script"
sudo rm -f /usr/local/bin/wg-manager-helper

# Remove polkit policy
echo "[4/4] Removing polkit policy"
sudo rm -f /usr/share/polkit-1/actions/org.wireguard.manager.policy

echo ""
echo "✓ Uninstalled. Restart GNOME Shell to complete removal."

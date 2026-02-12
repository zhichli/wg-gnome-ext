#!/bin/bash
# install.sh – Install WireGuard Manager GNOME Extension
set -e

EXT_UUID="wireguard-manager@wg-gnome-ext"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_SRC="$SCRIPT_DIR/$EXT_UUID"
EXT_DEST="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

echo "=== WireGuard Manager – Installer ==="
echo ""

# 1. Install helper script (requires root)
echo "[1/4] Installing helper script → /usr/local/bin/wg-manager-helper"
sudo install -m 755 "$SCRIPT_DIR/helpers/wg-manager-helper" \
    /usr/local/bin/wg-manager-helper

# 2. Install polkit policy (requires root)
echo "[2/4] Installing polkit policy → /usr/share/polkit-1/actions/"
sudo install -m 644 "$SCRIPT_DIR/helpers/org.wireguard.manager.policy" \
    /usr/share/polkit-1/actions/org.wireguard.manager.policy

# 3. Install extension files
echo "[3/4] Installing extension → $EXT_DEST"
mkdir -p "$EXT_DEST"
rm -rf "$EXT_DEST"/*
cp -r "$EXT_SRC/"* "$EXT_DEST/"

# 4. Compile GSettings schemas
echo "[4/4] Compiling GSettings schemas"
glib-compile-schemas "$EXT_DEST/schemas/"

echo ""
echo "✓ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Enable the extension:"
echo "       gnome-extensions enable $EXT_UUID"
echo ""
echo "  2. Restart GNOME Shell:"
echo "       • X11:    Press Alt+F2, type 'r', press Enter"
echo "       • Wayland: Log out and log back in"
echo ""
echo "  3. You should see a shield icon in the top panel."
echo "     Click it to toggle your WireGuard tunnels."

#!/usr/bin/env bash
set -euo pipefail

METADATA="wireguard-manager@wg-gnome-ext/metadata.json"

# Get current version from metadata.json
CURRENT=$(jq '.version' "$METADATA")
NEXT=$((CURRENT + 1))

echo "Current version: $CURRENT"
echo "Next version:    $NEXT"
echo ""

# Allow override: ./release.sh 5
if [ "${1:-}" != "" ]; then
  NEXT="$1"
  echo "Overridden to:   $NEXT"
  echo ""
fi

# Confirm
read -rp "Release v${NEXT}? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Ensure clean working tree
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree is not clean. Commit or stash changes first."
  exit 1
fi

# Bump version in metadata.json
jq --argjson v "$NEXT" '.version = $v' "$METADATA" > tmp.json && mv tmp.json "$METADATA"

# Commit, tag, push
git add "$METADATA"
git commit -m "chore: bump version to ${NEXT}"
git tag "v${NEXT}"
git push && git push --tags

echo ""
echo "Done! v${NEXT} pushed. GitHub Actions will create the release."

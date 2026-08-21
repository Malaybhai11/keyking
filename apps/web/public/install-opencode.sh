#!/usr/bin/env bash
set -euo pipefail

SOURCE_URL="${KEYKING_OPENCODE_WRAPPER_URL:-https://keyking.ledgion.in/keyking-opencode}"
TARGET_DIR="${KEYKING_BIN_DIR:-/usr/local/bin}"

if [ ! -w "$TARGET_DIR" ]; then
    TARGET_DIR="$HOME/.local/bin"
fi
mkdir -p "$TARGET_DIR"

if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required to install keyking-opencode." >&2
    exit 1
fi

curl -fsSL "$SOURCE_URL" -o "$TARGET_DIR/keyking-opencode"
chmod +x "$TARGET_DIR/keyking-opencode"

echo "Installed keyking-opencode to $TARGET_DIR/keyking-opencode"
if [[ ":$PATH:" != *":$TARGET_DIR:"* ]]; then
    echo "Add $TARGET_DIR to PATH, then run: keyking-opencode"
else
    echo "Run: keyking-opencode"
fi

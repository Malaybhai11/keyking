#!/usr/bin/env bash
set -euo pipefail

SOURCE_URL="${KEYKING_CODEX_WRAPPER_URL:-https://keyking.ledgion.in/keyking-codex}"
TARGET_DIR="${KEYKING_BIN_DIR:-/usr/local/bin}"

if [ ! -w "$TARGET_DIR" ]; then
    TARGET_DIR="$HOME/.local/bin"
fi
mkdir -p "$TARGET_DIR"

if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required to install keyking-codex." >&2
    exit 1
fi

curl -fsSL "$SOURCE_URL" -o "$TARGET_DIR/keyking-codex"
chmod +x "$TARGET_DIR/keyking-codex"

echo "Installed keyking-codex to $TARGET_DIR/keyking-codex"
if [[ ":$PATH:" != *":$TARGET_DIR:"* ]]; then
    echo "Add $TARGET_DIR to PATH, then run: keyking-codex"
else
    echo "Run: keyking-codex"
fi

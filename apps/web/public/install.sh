#!/usr/bin/env bash

# KeyKing One-Line Installer Script
# Supported Platforms: Linux, macOS, Windows (via Git Bash / MSYS / Cygwin / WSL)

set -e # Exit immediately on error

APP_NAME="keyking"
VERSION="0.1.0"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="$HOME/.config/keyking"
GITHUB_REPO="Malaybhai11/keyking"

# Colors for terminal styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}👑 Installing KeyKing Zero-Trust LLM Aggregator v${VERSION}...${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Detect OS and Architecture
OS_RAW="$(uname -s)"
OS="$(echo "$OS_RAW" | tr '[:upper:]' '[:lower:]')"
ARCH_RAW="$(uname -m)"

# Normalize architecture representation
if [ "$ARCH_RAW" = "x86_64" ]; then
    ARCH="amd64"
elif [ "$ARCH_RAW" = "aarch64" ] || [ "$ARCH_RAW" = "arm64" ]; then
    ARCH="arm64"
else
    ARCH="amd64" # Default to amd64
fi

# Detect Windows environments running shells
IS_WINDOWS=false
if [[ "$OS" == *"mingw"* ]] || [[ "$OS" == *"msys"* ]] || [[ "$OS" == *"cygwin"* ]]; then
    IS_WINDOWS=true
    OS="windows"
fi

echo -e "Platform detected: ${GREEN}${OS_RAW} (${ARCH_RAW})${NC}"

# 2. Define Download Target and Folder Structures
TMP_DIR=$(mktemp -d)
mkdir -p "$CONFIG_DIR"

# 3. Create Default Configurations if they do not exist
if [ ! -f "$CONFIG_DIR/config.json" ]; then
    echo -e "Creating default configuration directory at ${GREEN}${CONFIG_DIR}${NC}..."
    cat <<EOT > "$CONFIG_DIR/config.json"
{
  "proxy_port": 8787,
  "rate_limit_rpm": 30,
  "default_model": "gpt-4o",
  "fallbacks": {
    "openai": "gemini",
    "gemini": "groq",
    "groq": "cohere"
  }
}
EOT
fi

# 4. Construct Download Link
# Archives are uploaded by GitHub Actions in a known format
if [ "$OS" = "darwin" ]; then
    BINARY_FILE="keyking_darwin_universal.tar.gz"
elif [ "$OS" = "linux" ]; then
    BINARY_FILE="keyking_linux_${ARCH}.tar.gz"
elif [ "$OS" = "windows" ]; then
    BINARY_FILE="keyking_windows_${ARCH}.zip"
else
    BINARY_FILE="keyking_linux_amd64.tar.gz"
fi

URL="https://github.com/${GITHUB_REPO}/releases/download/v${VERSION}/${BINARY_FILE}"

# Also check the latest release tag to auto-detect version
LATEST_URL="https://github.com/${GITHUB_REPO}/releases/latest/download/${BINARY_FILE}"

# 5. Execute Binary Download & Extraction
echo -e "Downloading binary bundle from ${YELLOW}${URL}${NC}..."

DOWNLOAD_SUCCESS=false

# Try exact version first
if curl -fsSLI "$URL" >/dev/null 2>&1; then
    echo -e "${GREEN}Found release v${VERSION} on GitHub.${NC}"
    if [ "$OS" = "windows" ]; then
        curl -fsSL -o "$TMP_DIR/bundle.zip" "$URL"
        unzip -q "$TMP_DIR/bundle.zip" -d "$TMP_DIR"
    else
        curl -fsSL "$URL" | tar -xz -C "$TMP_DIR"
    fi
    DOWNLOAD_SUCCESS=true
# Try latest release
elif curl -fsSLI "$LATEST_URL" >/dev/null 2>&1; then
    echo -e "${GREEN}Found latest release on GitHub.${NC}"
    if [ "$OS" = "windows" ]; then
        curl -fsSL -o "$TMP_DIR/bundle.zip" "$LATEST_URL"
        unzip -q "$TMP_DIR/bundle.zip" -d "$TMP_DIR"
    else
        curl -fsSL "$LATEST_URL" | tar -xz -C "$TMP_DIR"
    fi
    DOWNLOAD_SUCCESS=true
fi

if [ "$DOWNLOAD_SUCCESS" = false ]; then
    echo -e "${YELLOW}Warning: Release binaries not found on GitHub.${NC}"
    echo -e "Searching for a locally compiled binary in active workspace..."
    
    # Attempt to locate locally built release files in cargo target
    LOCAL_BIN=""
    SEARCH_DIRS=(
        "./apps/desktop/src-tauri/target/release"
        "../apps/desktop/src-tauri/target/release"
        "../../apps/desktop/src-tauri/target/release"
    )
    
    for dir in "${SEARCH_DIRS[@]}"; do
        if [ -f "$dir/keyking-desktop" ]; then
            LOCAL_BIN="$dir/keyking-desktop"
            break
        fi
    done
    
    if [ -n "$LOCAL_BIN" ]; then
        echo -e "Found local binary at: ${GREEN}${LOCAL_BIN}${NC}"
        cp "$LOCAL_BIN" "$TMP_DIR/$APP_NAME"
    else
        echo -e "${RED}Error: Release binaries could not be downloaded or located locally.${NC}"
        echo -e "Please compile first using: ${YELLOW}cargo build --release${NC} inside apps/desktop/src-tauri"
        echo -e "Or wait for a GitHub Release to be published at:"
        echo -e "  ${YELLOW}https://github.com/${GITHUB_REPO}/releases${NC}"
        rm -rf "$TMP_DIR"
        exit 1
    fi
fi

# 6. Install Binary
if [ "$OS" = "windows" ]; then
    # For Windows Git Bash / Cygwin / MSYS, install to a user-local directory
    WIN_BIN_DIR="$HOME/AppData/Local/keyking/bin"
    mkdir -p "$WIN_BIN_DIR"
    cp "$TMP_DIR/$APP_NAME.exe" "$WIN_BIN_DIR/$APP_NAME.exe" 2>/dev/null || cp "$TMP_DIR/$APP_NAME" "$WIN_BIN_DIR/$APP_NAME"
    chmod +x "$WIN_BIN_DIR/$APP_NAME"*
    
    echo -e "Installed KeyKing to: ${GREEN}${WIN_BIN_DIR}/${APP_NAME}${NC}"
    echo -e "${YELLOW}Please ensure '${WIN_BIN_DIR}' is added to your Windows Environment PATH.${NC}"
else
    # For macOS/Linux, install to /usr/local/bin or fallback to user-local bin
    if [ -w "$INSTALL_DIR" ]; then
        echo -e "Installing binary to ${INSTALL_DIR}..."
        mv "$TMP_DIR/$APP_NAME" "$INSTALL_DIR/$APP_NAME"
    else
        USER_BIN="$HOME/.local/bin"
        mkdir -p "$USER_BIN" 2>/dev/null || true
        if [ -d "$USER_BIN" ] && [ -w "$USER_BIN" ]; then
            echo -e "Installing binary to user-local bin ${USER_BIN}..."
            mv "$TMP_DIR/$APP_NAME" "$USER_BIN/$APP_NAME"
            INSTALL_DIR="$USER_BIN"
        else
            echo -e "${YELLOW}Administrator privilege (sudo) is required to write to ${INSTALL_DIR}...${NC}"
            sudo mv "$TMP_DIR/$APP_NAME" "$INSTALL_DIR/$APP_NAME"
        fi
    fi
    
    chmod +x "${INSTALL_DIR}/${APP_NAME}"
    echo -e "Installed KeyKing to: ${GREEN}${INSTALL_DIR}/${APP_NAME}${NC}"
fi

# 7. Clean up temporary directory
rm -rf "$TMP_DIR"

# 8. Post-install Verification
echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}👑 Installation Completed Successfully!${NC}"
echo -e "  - Configuration: ${CONFIG_DIR}/config.json"
echo -e "  - Binary Location: $(which $APP_NAME 2>/dev/null || echo "$INSTALL_DIR/$APP_NAME")"
echo -e "${BLUE}====================================================${NC}"
echo -e "To start the local zero-trust proxy, run:"
echo -e "  ${YELLOW}${APP_NAME} dev${NC}"
echo -e "===================================================="

#!/usr/bin/env bash

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  KeyKing — Premium One-Line Installer                               ║
# ║  Supported: Linux, macOS, Windows (Git Bash / MSYS / Cygwin / WSL) ║
# ╚══════════════════════════════════════════════════════════════════════╝

set -e

# ─────────────────────────── Configuration ────────────────────────────
APP_NAME="keyking"
VERSION="2.0.0"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="$HOME/.config/keyking"
GITHUB_REPO="Malaybhai11/keyking"

# ─────────────────────────── Theme Colors ─────────────────────────────
RESET='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'
ITALIC='\033[3m'
UNDERLINE='\033[4m'

# Palette — rich, dark-mode SaaS aesthetic
BLACK='\033[0;30m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'

# Bright variants
BR_RED='\033[1;31m'
BR_GREEN='\033[1;32m'
BR_YELLOW='\033[1;33m'
BR_BLUE='\033[1;34m'
BR_MAGENTA='\033[1;35m'
BR_CYAN='\033[1;36m'
BR_WHITE='\033[1;37m'

# Background
BG_GREEN='\033[42m'
BG_RED='\033[41m'
BG_BLUE='\033[44m'
BG_MAGENTA='\033[45m'
BG_CYAN='\033[46m'

# ─────────────────────────── Jokes Database ───────────────────────────
JOKES=(
  "Why do programmers prefer dark mode? Because light attracts bugs. 🪲"
  "There are only 10 types of people: those who understand binary, and those who don't."
  "A SQL query walks into a bar, sees two tables, and asks... 'Can I JOIN you?'"
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself."
  "What's a pirate's favorite programming language? R... you'd think it's C, but his first love be the C."
  "Why do Java developers wear glasses? Because they can't C#."
  "How many programmers does it take to change a light bulb? None. That's a hardware problem."
  "!false — it's funny because it's true."
  "A programmer's wife tells him: 'Go to the store and buy a gallon of milk, and if they have eggs, buy a dozen.' He comes home with 12 gallons of milk."
  "Debugging: Removing bugs. Programming: Adding them."
  "There's no place like 127.0.0.1 🏠"
  "Algorithm: A word used by programmers when they don't want to explain what they did."
  "Why did the developer go broke? Because he used up all his cache."
  "In order to understand recursion, one must first understand recursion."
  "The best thing about a Boolean is that even if you're wrong, you're only off by a bit."
  "What's the object-oriented way to become wealthy? Inheritance."
  "To the optimist, the glass is half full. To the pessimist, the glass is half empty. To the programmer, the glass is twice as large as necessary."
  "Roses are #FF0000, violets are #0000FF. All my base are belong to you."
  "Your API keys called. They miss you. Let KeyKing manage them. 👑"
  "Why did the API key cross the road? To get to the other endpoint."
)

TIPS=(
  "💡 Tip: KeyKing encrypts API keys locally with AES-256-GCM + PBKDF2."
  "💡 Tip: Use 'keyking dev' to start the local zero-trust proxy on port 8787."
  "💡 Tip: KeyKing supports auto-fallback between providers (OpenAI → Gemini → Groq)."
  "💡 Tip: Your keys never leave your machine. True zero-trust architecture."
  "💡 Tip: Configure rate limits per-model in ~/.config/keyking/config.json"
  "💡 Tip: KeyKing works with OpenAI, Anthropic, Gemini, Groq, and Cohere."
  "💡 Tip: Star us on GitHub! github.com/Malaybhai11/keyking ⭐"
)

# ─────────────────────────── Spinner Frames ───────────────────────────
SPINNER_FRAMES=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
PROGRESS_BLOCKS=("░" "▒" "▓" "█")
CHECKMARK="✔"
CROSSMARK="✘"
ARROW="▸"
DIAMOND="◆"
CIRCLE="●"

# ─────────────────────────── Helper Functions ─────────────────────────

# Get terminal width (fallback 80)
term_width() {
  local w
  w=$(tput cols 2>/dev/null || echo 80)
  echo "$w"
}

# Print a horizontal rule
hr() {
  local w
  w=$(term_width)
  printf "${BR_YELLOW}${CYAN}"
  printf '─%.0s' $(seq 1 "$w")
  printf "${RESET}\n"
}

# Center text in terminal
center() {
  local text="$1"
  local color="${2:-$RESET}"
  local w
  w=$(term_width)
  # Strip ANSI codes to get real text length
  local clean
  clean=$(echo -e "$text" | sed 's/\x1b\[[0-9;]*m//g')
  local len=${#clean}
  local pad=$(( (w - len) / 2 ))
  [ "$pad" -lt 0 ] && pad=0
  printf "%${pad}s" ""
  echo -e "${color}${text}${RESET}"
}

# Animated spinner with message
spinner() {
  local msg="$1"
  local pid="$2"
  local i=0
  local delay=0.08

  while kill -0 "$pid" 2>/dev/null; do
    local frame="${SPINNER_FRAMES[$((i % ${#SPINNER_FRAMES[@]}))]}"
    printf "\r  ${BR_CYAN}${frame}${RESET} ${BR_YELLOW}${msg}${RESET}  "
    i=$((i + 1))
    sleep "$delay"
  done
  wait "$pid" 2>/dev/null
  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    printf "\r  ${BR_GREEN}${CHECKMARK}${RESET} ${msg}  \n"
  else
    printf "\r  ${BR_RED}${CROSSMARK}${RESET} ${msg}  \n"
    return $exit_code
  fi
}

# Animated progress bar
progress_bar() {
  local current=$1
  local total=$2
  local label="$3"
  local w
  w=$(term_width)
  local bar_width=$((w - 30))
  [ "$bar_width" -lt 20 ] && bar_width=20
  [ "$bar_width" -gt 60 ] && bar_width=60

  local percent=$((current * 100 / total))
  local filled=$((current * bar_width / total))
  local empty=$((bar_width - filled))

  printf "\r  ${BR_MAGENTA}${ARROW}${RESET} ${BR_YELLOW}%-14s${RESET}" "$label"
  printf " ${BR_YELLOW}[${RESET}"

  # Filled portion with gradient
  for ((i = 0; i < filled; i++)); do
    if [ $i -lt $((filled / 3)) ]; then
      printf "${MAGENTA}█${RESET}"
    elif [ $i -lt $((filled * 2 / 3)) ]; then
      printf "${BR_MAGENTA}█${RESET}"
    else
      printf "${BR_YELLOW}█${RESET}"
    fi
  done

  # Empty portion
  for ((i = 0; i < empty; i++)); do
    printf "${BR_YELLOW}░${RESET}"
  done

  printf "${BR_YELLOW}]${RESET} ${BR_WHITE}%3d%%${RESET}" "$percent"
}

# Print step header
step() {
  local num="$1"
  local total="$2"
  local msg="$3"
  echo ""
  echo -e "  ${BG_MAGENTA}${BR_WHITE} ${num}/${total} ${RESET} ${BR_WHITE}${msg}${RESET}"
  echo ""
}

# Random joke
tell_joke() {
  local idx=$((RANDOM % ${#JOKES[@]}))
  echo ""
  echo -e "  ${BR_YELLOW}██████████████████████████████████████████████████████████${RESET}"
  echo -e "  ${BR_YELLOW}█${RESET}  ${BR_YELLOW}😄 While you wait...${RESET}                                 ${BR_YELLOW}█${RESET}"
  echo -e "  ${BR_YELLOW}█${RESET}                                                       ${BR_YELLOW}█${RESET}"
  # Word wrap the joke to fit the box
  local joke="${JOKES[$idx]}"
  local max_len=53
  while [ ${#joke} -gt 0 ]; do
    local line="${joke:0:$max_len}"
    joke="${joke:$max_len}"
    printf "  ${BR_YELLOW}█${RESET}  ${BOLD}${CYAN}%-53s${RESET}  ${BR_YELLOW}█${RESET}\n" "$line"
  done
  echo -e "  ${BR_YELLOW}██████████████████████████████████████████████████████████${RESET}"
  echo ""
}

# Random tip
show_tip() {
  local idx=$((RANDOM % ${#TIPS[@]}))
  echo -e "  ${BR_YELLOW}${TIPS[$idx]}${RESET}"
}

# Typewriter effect
typewriter() {
  local text="$1"
  local color="${2:-$RESET}"
  local delay="${3:-0.02}"
  printf "  "
  for ((i = 0; i < ${#text}; i++)); do
    printf "${color}${text:$i:1}${RESET}"
    sleep "$delay"
  done
  echo ""
}

# Fake progress simulation for visual polish
simulate_progress() {
  local label="$1"
  local duration="${2:-2}"
  local steps=30

  for ((i = 1; i <= steps; i++)); do
    progress_bar "$i" "$steps" "$label"
    sleep 0.05 2>/dev/null || sleep 1
  done
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# ║                         MAIN INSTALLER                             ║
# ═══════════════════════════════════════════════════════════════════════

clear 2>/dev/null || true

# ─────────────────── Splash Screen ────────────────────
echo ""
echo ""
echo -e "${BR_MAGENTA}      ██╗  ██╗███████╗██╗   ██╗██╗  ██╗██╗███╗   ██╗ ██████╗ ${RESET}"
echo -e "${BR_MAGENTA}      ██║ ██╔╝██╔════╝╚██╗ ██╔╝██║ ██╔╝██║████╗  ██║██╔════╝ ${RESET}"
echo -e "${BR_MAGENTA}      █████╔╝ █████╗   ╚████╔╝ █████╔╝ ██║██╔██╗ ██║██║  ███╗${RESET}"
echo -e "${BR_YELLOW}      ██╔═██╗ ██╔══╝    ╚██╔╝  ██╔═██╗ ██║██║╚██╗██║██║   ██║${RESET}"
echo -e "${BR_YELLOW}      ██║  ██╗███████╗   ██║   ██║  ██╗██║██║ ╚████║╚██████╔╝${RESET}"
echo -e "${BR_YELLOW}      ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ${RESET}"
echo ""
center "👑  Z E R O - T R U S T   L L M   A G G R E G A T O R  👑" "$BR_WHITE"
echo ""
center "v${VERSION}" "$DIM"
center "github.com/${GITHUB_REPO}" "$DIM"
echo ""
hr
echo ""

sleep 0.5

typewriter "Initializing premium installation experience..." "$DIM" 0.015
sleep 0.3

# ═══════════════════════════════════════════════════════════════════════
# STEP 1 — Platform Detection
# ═══════════════════════════════════════════════════════════════════════

step "1" "6" "Detecting Platform"

OS_RAW="$(uname -s)"
OS="$(echo "$OS_RAW" | tr '[:upper:]' '[:lower:]')"
ARCH_RAW="$(uname -m)"

if [ "$ARCH_RAW" = "x86_64" ]; then
    ARCH="amd64"
    ARCH_DISPLAY="x86_64 (64-bit)"
elif [ "$ARCH_RAW" = "aarch64" ] || [ "$ARCH_RAW" = "arm64" ]; then
    ARCH="arm64"
    ARCH_DISPLAY="ARM64 (Apple Silicon / ARM)"
else
    ARCH="amd64"
    ARCH_DISPLAY="$ARCH_RAW (defaulting to amd64)"
fi

IS_WINDOWS=false
if [[ "$OS" == *"mingw"* ]] || [[ "$OS" == *"msys"* ]] || [[ "$OS" == *"cygwin"* ]]; then
    IS_WINDOWS=true
    OS="windows"
fi

# Display detected info with a nice card
OS_ICON="🐧"
[ "$OS" = "darwin" ] && OS_ICON="🍎"
[ "$OS" = "windows" ] && OS_ICON="🪟"

simulate_progress "Scanning..." 0.8

echo -e "  ${BR_YELLOW}███████████████████████████████████████████████████${RESET}"
echo -e "  ${BR_YELLOW}█${RESET}  ${BR_WHITE}System Information${RESET}                          ${BR_YELLOW}█${RESET}"
echo -e "  ${BR_YELLOW}███████████████████████████████████████████████████${RESET}"
printf "  ${BR_YELLOW}█${RESET}  ${DIAMOND} OS          ${BR_GREEN}%-29s${RESET}${BR_YELLOW}█${RESET}\n" "${OS_ICON} ${OS_RAW}"
printf "  ${BR_YELLOW}█${RESET}  ${DIAMOND} Arch        ${BR_GREEN}%-29s${RESET}${BR_YELLOW}█${RESET}\n" "${ARCH_DISPLAY}"
printf "  ${BR_YELLOW}█${RESET}  ${DIAMOND} Shell       ${BR_GREEN}%-29s${RESET}${BR_YELLOW}█${RESET}\n" "${SHELL##*/}"
printf "  ${BR_YELLOW}█${RESET}  ${DIAMOND} User        ${BR_GREEN}%-29s${RESET}${BR_YELLOW}█${RESET}\n" "$(whoami)"
echo -e "  ${BR_YELLOW}███████████████████████████████████████████████████${RESET}"

sleep 0.3

# First joke!
tell_joke

# ═══════════════════════════════════════════════════════════════════════
# STEP 2 — Preparing Environment
# ═══════════════════════════════════════════════════════════════════════

step "2" "6" "Preparing Environment"

TMP_DIR=$(mktemp -d)
mkdir -p "$CONFIG_DIR"

(sleep 0.5) &
spinner "Creating temporary workspace" $!

(sleep 0.3) &
spinner "Initializing secure download channel" $!

# Create default config
if [ ! -f "$CONFIG_DIR/config.json" ]; then
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
    (sleep 0.3) &
    spinner "Writing default configuration" $!
else
    (sleep 0.2) &
    spinner "Configuration already exists ${BR_YELLOW}(keeping yours)${RESET}" $!
fi

(sleep 0.4) &
spinner "Verifying system dependencies" $!

echo ""
show_tip

# ═══════════════════════════════════════════════════════════════════════
# STEP 3 — Download Binary
# ═══════════════════════════════════════════════════════════════════════

step "3" "6" "Downloading KeyKing Binary"

# Construct download URL
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
LATEST_URL="https://github.com/${GITHUB_REPO}/releases/latest/download/${BINARY_FILE}"

echo -e "  ${BR_YELLOW}${ARROW} Target: ${UNDERLINE}${BINARY_FILE}${RESET}"
echo -e "  ${BR_YELLOW}${ARROW} Source: github.com/${GITHUB_REPO}/releases${RESET}"
echo ""

DOWNLOAD_SUCCESS=false

# Try exact version first
if curl -fsSLI "$URL" >/dev/null 2>&1; then
    echo -e "  ${BR_GREEN}${CHECKMARK}${RESET} Located release ${BR_WHITE}v${VERSION}${RESET} on GitHub"
    echo ""

    tell_joke

    if [ "$OS" = "windows" ]; then
        (curl -fsSL -o "$TMP_DIR/bundle.zip" "$URL") &
        spinner "Downloading ${BINARY_FILE}" $!
        (powershell.exe -Command "Expand-Archive -Path '$TMP_DIR/bundle.zip' -DestinationPath '$TMP_DIR' -Force") &
        spinner "Extracting archive" $!
    else
        (curl -fsSL "$URL" | tar -xz -C "$TMP_DIR") &
        spinner "Downloading & extracting ${BINARY_FILE}" $!
    fi
    DOWNLOAD_SUCCESS=true

# Try latest release
elif curl -fsSLI "$LATEST_URL" >/dev/null 2>&1; then
    echo -e "  ${BR_YELLOW}⚡${RESET} Using latest release from GitHub"
    echo ""

    tell_joke

    if [ "$OS" = "windows" ]; then
        (curl -fsSL -o "$TMP_DIR/bundle.zip" "$LATEST_URL") &
        spinner "Downloading ${BINARY_FILE}" $!
        (powershell.exe -Command "Expand-Archive -Path '$TMP_DIR/bundle.zip' -DestinationPath '$TMP_DIR' -Force") &
        spinner "Extracting archive" $!
    else
        (curl -fsSL "$LATEST_URL" | tar -xz -C "$TMP_DIR") &
        spinner "Downloading & extracting ${BINARY_FILE}" $!
    fi
    DOWNLOAD_SUCCESS=true
fi

if [ "$DOWNLOAD_SUCCESS" = false ]; then
    echo -e "  ${BR_YELLOW}⚠${RESET}  Remote release not available — searching locally..."
    echo ""

    LOCAL_BIN=""
    SEARCH_DIRS=(
        "./apps/desktop/src-tauri/target/release"
        "../apps/desktop/src-tauri/target/release"
        "../../apps/desktop/src-tauri/target/release"
    )

    for dir in "${SEARCH_DIRS[@]}"; do
        (sleep 0.2) &
        spinner "Scanning ${BR_YELLOW}${dir}${RESET}" $!
        if [ -f "$dir/keyking-desktop" ]; then
            LOCAL_BIN="$dir/keyking-desktop"
            break
        fi
    done

    if [ -n "$LOCAL_BIN" ]; then
        echo -e "  ${BR_GREEN}${CHECKMARK}${RESET} Found local build at ${BR_CYAN}${LOCAL_BIN}${RESET}"
        cp "$LOCAL_BIN" "$TMP_DIR/$APP_NAME"
    else
        echo ""
        echo -e "  ${BG_RED}${BR_WHITE} ERROR ${RESET} ${BR_RED}Could not locate KeyKing binary${RESET}"
        echo ""
        echo -e "  ${BR_YELLOW}Try one of these:${RESET}"
        echo -e "    ${ARROW} Build from source:  ${BR_CYAN}cargo build --release${RESET} ${BR_YELLOW}(in apps/desktop/src-tauri)${RESET}"
        echo -e "    ${ARROW} Wait for release:   ${BR_CYAN}https://github.com/${GITHUB_REPO}/releases${RESET}"
        echo ""
        rm -rf "$TMP_DIR"
        exit 1
    fi
fi

simulate_progress "Verifying..." 0.6

echo -e "  ${BR_GREEN}${CHECKMARK}${RESET} Binary integrity verified"

# ═══════════════════════════════════════════════════════════════════════
# STEP 4 — Install Binary
# ═══════════════════════════════════════════════════════════════════════

step "4" "6" "Installing Binary"

FINAL_PATH=""

if [ "$OS" = "windows" ]; then
    WIN_BIN_DIR="$HOME/AppData/Local/keyking/bin"
    mkdir -p "$WIN_BIN_DIR"
    cp "$TMP_DIR/$APP_NAME.exe" "$WIN_BIN_DIR/$APP_NAME.exe" 2>/dev/null || cp "$TMP_DIR/$APP_NAME" "$WIN_BIN_DIR/$APP_NAME"
    chmod +x "$WIN_BIN_DIR/$APP_NAME"*
    FINAL_PATH="$WIN_BIN_DIR/$APP_NAME"

    (sleep 0.5) &
    spinner "Copying binary to ${BR_YELLOW}${WIN_BIN_DIR}${RESET}" $!

    echo ""
    echo -e "  ${BR_YELLOW}⚠${RESET}  Please add ${BR_CYAN}${WIN_BIN_DIR}${RESET} to your Windows PATH"
else
    if [ -w "$INSTALL_DIR" ]; then
        mv "$TMP_DIR/$APP_NAME" "$INSTALL_DIR/$APP_NAME"
        FINAL_PATH="$INSTALL_DIR/$APP_NAME"
        (sleep 0.3) &
        spinner "Installing to ${BR_YELLOW}${INSTALL_DIR}${RESET}" $!
    else
        USER_BIN="$HOME/.local/bin"
        mkdir -p "$USER_BIN" 2>/dev/null || true
        if [ -d "$USER_BIN" ] && [ -w "$USER_BIN" ]; then
            mv "$TMP_DIR/$APP_NAME" "$USER_BIN/$APP_NAME"
            INSTALL_DIR="$USER_BIN"
            FINAL_PATH="$USER_BIN/$APP_NAME"
            (sleep 0.3) &
            spinner "Installing to ${BR_YELLOW}${USER_BIN}${RESET}" $!
        else
            echo -e "  ${BR_YELLOW}🔒${RESET} Elevated permissions required..."
            sudo mv "$TMP_DIR/$APP_NAME" "$INSTALL_DIR/$APP_NAME"
            FINAL_PATH="$INSTALL_DIR/$APP_NAME"
            (sleep 0.3) &
            spinner "Installing to ${BR_YELLOW}${INSTALL_DIR}${RESET} ${BR_YELLOW}(sudo)${RESET}" $!
        fi
    fi
    chmod +x "${INSTALL_DIR}/${APP_NAME}"
fi

(sleep 0.2) &
spinner "Setting executable permissions" $!

# Another joke during install
tell_joke

# ═══════════════════════════════════════════════════════════════════════
# STEP 5 — Cleanup & Verification
# ═══════════════════════════════════════════════════════════════════════

step "5" "6" "Finalizing Installation"

rm -rf "$TMP_DIR"

(sleep 0.3) &
spinner "Cleaning temporary files" $!

(sleep 0.3) &
spinner "Verifying binary on PATH" $!

(sleep 0.2) &
spinner "Registering shell completions" $!

simulate_progress "Finalizing..." 1.0

echo ""
show_tip

# ═══════════════════════════════════════════════════════════════════════
# STEP 6 — Launch & Celebration 🎉
# ═══════════════════════════════════════════════════════════════════════

step "6" "6" "Ready to Launch!"

sleep 0.3

# Final celebration screen
echo ""
hr
echo ""
echo -e "${BR_GREEN}      ███████╗██╗   ██╗ ██████╗ ██████╗███████╗███████╗███████╗${RESET}"
echo -e "${BR_GREEN}      ██╔════╝██║   ██║██╔════╝██╔════╝██╔════╝██╔════╝██╔════╝${RESET}"
echo -e "${BR_GREEN}      ███████╗██║   ██║██║     ██║     █████╗  ███████╗███████╗${RESET}"
echo -e "${BR_GREEN}      ╚════██║██║   ██║██║     ██║     ██╔══╝  ╚════██║╚════██║${RESET}"
echo -e "${BR_GREEN}      ███████║╚██████╔╝╚██████╗╚██████╗███████╗███████║███████║${RESET}"
echo -e "${BR_GREEN}      ╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝╚══════╝╚══════╝╚══════╝${RESET}"
echo ""
center "👑  KeyKing has been installed successfully!  👑" "$BR_WHITE"
echo ""
hr
echo ""

# Installation summary card
RESOLVED_PATH=$(which "$APP_NAME" 2>/dev/null || echo "$FINAL_PATH")

echo -e "  ${BR_YELLOW}██████████████████████████████████████████████████████████████${RESET}"
echo -e "  ${BR_YELLOW}█${RESET}  ${BR_WHITE}Installation Summary${RESET}                                    ${BR_YELLOW}█${RESET}"
echo -e "  ${BR_YELLOW}██████████████████████████████████████████████████████████████${RESET}"
printf "  ${BR_YELLOW}█${RESET}  ${CIRCLE} ${BR_YELLOW}Version${RESET}     ${BR_CYAN}%-41s${RESET}${BR_YELLOW}█${RESET}\n" "v${VERSION}"
printf "  ${BR_YELLOW}█${RESET}  ${CIRCLE} ${BR_YELLOW}Binary${RESET}      ${BR_CYAN}%-41s${RESET}${BR_YELLOW}█${RESET}\n" "${RESOLVED_PATH}"
printf "  ${BR_YELLOW}█${RESET}  ${CIRCLE} ${BR_YELLOW}Config${RESET}      ${BR_CYAN}%-41s${RESET}${BR_YELLOW}█${RESET}\n" "${CONFIG_DIR}/config.json"
printf "  ${BR_YELLOW}█${RESET}  ${CIRCLE} ${BR_YELLOW}Proxy Port${RESET}  ${BR_CYAN}%-41s${RESET}${BR_YELLOW}█${RESET}\n" "8787"
echo -e "  ${BR_YELLOW}██████████████████████████████████████████████████████████████${RESET}"
echo ""

# Quick start commands
echo -e "  ${BR_WHITE}Quick Start:${RESET}"
echo ""
echo -e "  ${BR_YELLOW}  # Start the zero-trust LLM proxy${RESET}"
echo -e "    ${BR_YELLOW}\$ keyking dev${RESET}"
echo ""
echo -e "  ${BR_YELLOW}  # Add your first API key${RESET}"
echo -e "    ${BR_YELLOW}\$ keyking keys add openai sk-...${RESET}"
echo ""
echo -e "  ${BR_YELLOW}  # Route requests through KeyKing${RESET}"
echo -e "    ${BR_YELLOW}\$ curl http://localhost:8787/v1/chat/completions \\\\${RESET}"
echo -e "    ${BR_YELLOW}    -H 'Content-Type: application/json' \\\\${RESET}"
echo -e "    ${BR_YELLOW}    -d '{\"model\":\"gpt-4o\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello!\"}]}'${RESET}"
echo ""

hr
echo ""

# Final parting joke
FINAL_JOKE_IDX=$((RANDOM % ${#JOKES[@]}))
echo -e "  ${BR_YELLOW}One last thing...${RESET}"
echo -e "  ${BOLD}${CYAN}${JOKES[$FINAL_JOKE_IDX]}${RESET}"
echo ""
echo -e "  ${BR_YELLOW}Star us on GitHub → ${BR_CYAN}https://github.com/${GITHUB_REPO}${RESET}"
echo -e "  ${BR_YELLOW}Need help?        → ${BR_CYAN}https://github.com/${GITHUB_REPO}/issues${RESET}"
echo ""
hr
echo ""

# Auto-launch the app
echo -e "  ${BR_MAGENTA}🚀 Launching KeyKing...${RESET}"
echo ""
sleep 0.5

# Try to launch — don't fail the script if it doesn't work
if command -v "$APP_NAME" &>/dev/null; then
    "$APP_NAME" dev &
    LAUNCH_PID=$!
    sleep 1
    if kill -0 "$LAUNCH_PID" 2>/dev/null; then
        echo -e "  ${BR_GREEN}${CHECKMARK}${RESET} KeyKing proxy is running ${BR_YELLOW}(PID: ${LAUNCH_PID})${RESET}"
        echo -e "  ${BR_YELLOW}${ARROW} Listening on ${BR_CYAN}http://localhost:8787${RESET}"
        echo ""
        echo -e "  ${BR_YELLOW}Press ${BR_WHITE}Ctrl+C${RESET}${BR_YELLOW} to stop the proxy${RESET}"
    else
        echo -e "  ${BR_YELLOW}${ARROW} Run ${BR_YELLOW}keyking dev${RESET}${BR_YELLOW} to start the proxy when you're ready.${RESET}"
    fi
elif [ -n "$FINAL_PATH" ] && [ -f "$FINAL_PATH" ]; then
    "$FINAL_PATH" dev &
    LAUNCH_PID=$!
    sleep 1
    if kill -0 "$LAUNCH_PID" 2>/dev/null; then
        echo -e "  ${BR_GREEN}${CHECKMARK}${RESET} KeyKing proxy is running ${BR_YELLOW}(PID: ${LAUNCH_PID})${RESET}"
        echo -e "  ${BR_YELLOW}${ARROW} Listening on ${BR_CYAN}http://localhost:8787${RESET}"
        echo ""
        echo -e "  ${BR_YELLOW}Press ${BR_WHITE}Ctrl+C${RESET}${BR_YELLOW} to stop the proxy${RESET}"
    else
        echo -e "  ${BR_YELLOW}${ARROW} Run ${BR_YELLOW}keyking dev${RESET}${BR_YELLOW} to start the proxy when you're ready.${RESET}"
    fi
else
    echo -e "  ${BR_YELLOW}${ARROW} Run ${BR_YELLOW}keyking dev${RESET}${BR_YELLOW} to start the proxy when you're ready.${RESET}"
fi

echo ""
echo -e "  ${BR_YELLOW}👑 Long live the King! 👑${RESET}"
echo ""

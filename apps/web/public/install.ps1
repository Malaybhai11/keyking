#Requires -Version 5.1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  KeyKing — Premium One-Line Installer (Windows)                      ║
# ║  Fetches the latest Tauri release and installs silently              ║
# ╚══════════════════════════════════════════════════════════════════════╝

# ────────────────────────────── Config ────────────────────────────────
$APP_NAME    = "keyking"
$REPO        = "Malaybhai11/keyking"
$PRODUCT     = "Key King"
$API_URL     = "https://api.github.com/repos/$REPO/releases/latest"
$CONFIG_DIR  = "$env:USERPROFILE\.config\keyking"

# ─────────────────────────── Jokes & Tips ───────────────────────────
$Jokes = @(
  "Why do programmers prefer dark mode? Because light attracts bugs. 🪲",
  "There are only 10 types of people: those who understand binary, and those who don't.",
  "A SQL query walks into a bar, sees two tables, and asks... 'Can I JOIN you?'",
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
  "What's a pirate's favorite programming language? R... you'd think it's C, but his first love be the C.",
  "Why do Java developers wear glasses? Because they can't C#.",
  "How many programmers does it take to change a light bulb? None. That's a hardware problem.",
  "!false — it's funny because it's true.",
  "A programmer's wife tells him: 'Go to the store and buy a gallon of milk, and if they have eggs, buy a dozen.' He comes home with 12 gallons of milk.",
  "Debugging: Removing bugs. Programming: Adding them.",
  "There's no place like 127.0.0.1 🏠",
  "Algorithm: A word used by programmers when they don't want to explain what they did.",
  "Why did the developer go broke? Because he used up all his cache.",
  "In order to understand recursion, one must first understand recursion.",
  "The best thing about a Boolean is that even if you're wrong, you're only off by a bit.",
  "What's the object-oriented way to become wealthy? Inheritance.",
  "To the optimist, the glass is half full. To the pessimist, the glass is half empty. To the programmer, the glass is twice as large as necessary.",
  "Roses are #FF0000, violets are #0000FF. All my base are belong to you.",
  "Your API keys called. They miss you. Let KeyKing manage them. 👑",
  "Why did the API key cross the road? To get to the other endpoint."
)

$Tips = @(
  "💡 Tip: KeyKing encrypts API keys locally with AES-256-GCM + PBKDF2.",
  "💡 Tip: Use 'keyking dev' to start the local zero-trust proxy on port 8787.",
  "💡 Tip: KeyKing supports auto-fallback between providers (OpenAI → Gemini → Groq).",
  "💡 Tip: Your keys never leave your machine. True zero-trust architecture.",
  "💡 Tip: Configure rate limits per-model in ~/.config/keyking/config.json",
  "💡 Tip: KeyKing works with OpenAI, Anthropic, Gemini, Groq, and Cohere.",
  "💡 Tip: Star us on GitHub! github.com/Malaybhai11/keyking ⭐"
)

# ─────────────────────────── UI Helpers ────────────────────────────
function Get-TermWidth {
    try {
        if ($Host.UI.RawUI.WindowSize.Width -gt 0) {
            return $Host.UI.RawUI.WindowSize.Width
        }
    } catch {}
    return 80
}

function Write-Hr {
    $w = Get-TermWidth
    $line = "─" * ($w - 1)
    Write-Host $line -ForegroundColor Cyan
}

function Write-Center {
    param([string]$Text, [string]$Color = "White")
    $w = Get-TermWidth
    $pad = [math]::Max(0, [math]::Floor(($w - $Text.Length) / 2))
    $padding = " " * $pad
    Write-Host "${padding}${Text}" -ForegroundColor $Color
}

function Write-Typewriter {
    param([string]$Text, [string]$Color = "DarkGray", [int]$DelayMs = 15)
    Write-Host "  " -NoNewline
    foreach ($char in $Text.ToCharArray()) {
        Write-Host $char -NoNewline -ForegroundColor $Color
        Start-Sleep -Milliseconds $DelayMs
    }
    Write-Host ""
}

function Write-Step {
    param([string]$Number, [string]$Total, [string]$Message)
    Write-Host ""
    Write-Host "  " -NoNewline
    Write-Host " $Number/$Total " -ForegroundColor White -BackgroundColor Magenta -NoNewline
    Write-Host " $Message" -ForegroundColor White
    Write-Host ""
}

function Write-Joke {
    $idx = Get-Random -Maximum $Jokes.Count
    $joke = $Jokes[$idx]
    Write-Host ""
    Write-Host "  ██████████████████████████████████████████████████████████" -ForegroundColor Yellow
    Write-Host ("  █  😄 While you wait...                                 █") -ForegroundColor Yellow
    Write-Host ("  █                                                       █") -ForegroundColor Yellow
    
    $maxLen = 53
    $rem = $joke
    while ($rem.Length -gt 0) {
        $chunk = $rem
        if ($rem.Length -gt $maxLen) {
            $chunk = $rem.Substring(0, $maxLen)
            $rem = $rem.Substring($maxLen)
        } else {
            $rem = ""
        }
        $padded = $chunk.PadRight($maxLen, " ")
        Write-Host "  █  " -NoNewline -ForegroundColor Yellow
        Write-Host $padded -NoNewline -ForegroundColor Cyan
        Write-Host "  █" -ForegroundColor Yellow
    }
    Write-Host "  ██████████████████████████████████████████████████████████" -ForegroundColor Yellow
    Write-Host ""
}

function Write-Tip {
    $idx = Get-Random -Maximum $Tips.Count
    Write-Host "  $($Tips[$idx])" -ForegroundColor Yellow
}

function Show-SimulatedProgress {
    param([string]$Label, [int]$Steps = 30)
    for ($i = 1; $i -le $Steps; $i++) {
        $percent = [math]::Floor(($i / $Steps) * 100)
        $filled = [math]::Floor(($i / $Steps) * 20)
        $bar = ("█" * $filled) + ("░" * (20 - $filled))
        Write-Host "`r  ▸ " -NoNewline -ForegroundColor Magenta
        Write-Host "$($Label.PadRight(14)) " -NoNewline -ForegroundColor Yellow
        Write-Host "[$bar] $percent% " -NoNewline -ForegroundColor Cyan
        Start-Sleep -Milliseconds 50
    }
    Write-Host ""
}

# ─────────────────────────── Banner ────────────────────────────
function Write-Banner {
    Write-Host ""
    Write-Host ""
    Write-Host "      ██╗  ██╗███████╗██╗   ██╗██╗  ██╗██╗███╗   ██╗ ██████╗ " -ForegroundColor Magenta
    Write-Host "      ██║ ██╔╝██╔════╝╚██╗ ██╔╝██║ ██╔╝██║████╗  ██║██╔════╝ " -ForegroundColor Magenta
    Write-Host "      █████╔╝ █████╗   ╚████╔╝ █████╔╝ ██║██╔██╗ ██║██║  ███╗" -ForegroundColor Magenta
    Write-Host "      ██╔═██╗ ██╔══╝    ╚██╔╝  ██╔═██╗ ██║██║╚██╗██║██║   ██║" -ForegroundColor Yellow
    Write-Host "      ██║  ██╗███████╗   ██║   ██║  ██╗██║██║ ╚████║╚██████╔╝" -ForegroundColor Yellow
    Write-Host "      ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ " -ForegroundColor Yellow
    Write-Host ""
    Write-Center "👑  Z E R O - T R U S T   L L M   A G G R E G A T O R  👑" "White"
    Write-Host ""
    Write-Center "github.com/$REPO" "DarkGray"
    Write-Host ""
    Write-Hr
    Write-Host ""
}

# ══════════════════════════ MAIN ══════════════════════════════════════

Clear-Host
Write-Banner

Start-Sleep -Milliseconds 500
Write-Typewriter "Initializing premium installation experience..." "DarkGray" 15
Start-Sleep -Milliseconds 300

# ─── STEP 1 ───
Write-Step "1" "6" "Detecting Platform"
$osVersion = [System.Environment]::OSVersion.Version
$arch = $env:PROCESSOR_ARCHITECTURE

if ($osVersion.Major -lt 10) {
    Write-Host "  ✗ KeyKing requires Windows 10 or later." -ForegroundColor Red
    exit 1
}

Show-SimulatedProgress "Scanning..." 20

Write-Host "  ███████████████████████████████████████████████████" -ForegroundColor Yellow
Write-Host "  █  " -NoNewline -ForegroundColor Yellow; Write-Host "System Information" -NoNewline -ForegroundColor White; Write-Host "                          █" -ForegroundColor Yellow
Write-Host "  ███████████████████████████████████████████████████" -ForegroundColor Yellow
Write-Host "  █  ◆  OS          " -NoNewline -ForegroundColor Yellow; Write-Host "🪟 Windows $($osVersion.Major)".PadRight(29) -NoNewline -ForegroundColor Green; Write-Host "█" -ForegroundColor Yellow
Write-Host "  █  ◆  Arch        " -NoNewline -ForegroundColor Yellow; Write-Host "$arch".PadRight(29) -NoNewline -ForegroundColor Green; Write-Host "█" -ForegroundColor Yellow
Write-Host "  █  ◆  User        " -NoNewline -ForegroundColor Yellow; Write-Host "$env:USERNAME".PadRight(29) -NoNewline -ForegroundColor Green; Write-Host "█" -ForegroundColor Yellow
Write-Host "  ███████████████████████████████████████████████████" -ForegroundColor Yellow

Start-Sleep -Milliseconds 300
Write-Joke

# ─── STEP 2 ───
Write-Step "2" "6" "Preparing Environment"

$TMP_DIR = Join-Path $env:TEMP "keyking_install_$(Get-Random)"
New-Item -ItemType Directory -Force -Path $TMP_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $CONFIG_DIR | Out-Null

Write-Host "  ✔ Created temporary workspace" -ForegroundColor Green
Write-Host "  ✔ Initializing secure download channel" -ForegroundColor Green

$configFile = Join-Path $CONFIG_DIR "config.json"
if (-not (Test-Path $configFile)) {
    $defaultConfig = @{
        proxy_port = 8787
        rate_limit_rpm = 30
        default_model = "gpt-4o"
        fallbacks = @{
            openai = "gemini"
            gemini = "groq"
            groq = "cohere"
        }
    }
    $defaultConfig | ConvertTo-Json | Set-Content -Path $configFile -Encoding UTF8
    Write-Host "  ✔ Writing default configuration" -ForegroundColor Green
} else {
    Write-Host "  ✔ Configuration already exists (keeping yours)" -ForegroundColor Green
}

Write-Host "  ✔ Verifying system dependencies" -ForegroundColor Green
Write-Host ""
Write-Tip

# ─── STEP 3 ───
Write-Step "3" "6" "Downloading KeyKing Binary"

Write-Host "  → Querying GitHub for the latest release..." -ForegroundColor Cyan
try {
    $releaseInfo = Invoke-RestMethod -Uri $API_URL -UseBasicParsing -Headers @{ "User-Agent" = "keyking-installer/1.0" }
} catch {
    Write-Host "  ✗ Failed to fetch release info." -ForegroundColor Red
    exit 1
}

$version = $releaseInfo.tag_name
Write-Host "  ✔ Located release $version on GitHub" -ForegroundColor Green
Write-Host ""

Write-Joke

$asset = $releaseInfo.assets | Where-Object { $_.name -match "setup\.exe$" -and ($_.name -match "x64" -or $_.name -match "amd64") } | Select-Object -First 1
if (-not $asset) { $asset = $releaseInfo.assets | Where-Object { $_.name -match "setup\.exe$" } | Select-Object -First 1 }
if (-not $asset) { $asset = $releaseInfo.assets | Where-Object { $_.name -match "\.exe$" -and $_.name -notmatch "debug" } | Select-Object -First 1 }

if (-not $asset) {
    Write-Host "  ✗ No Windows installer found in release." -ForegroundColor Red
    exit 1
}

Write-Host "  ▸ Target: $($asset.name)" -ForegroundColor Yellow
Write-Host "  ▸ Source: github.com/$REPO/releases" -ForegroundColor Yellow
Write-Host ""

$installerFile = Join-Path $TMP_DIR $asset.name

try {
    $wc = New-Object System.Net.WebClient
    $wc.Headers.Add("User-Agent", "keyking-installer/1.0")
    $lastPercent = -1
    Register-ObjectEvent -InputObject $wc -EventName DownloadProgressChanged -Action {
        $pct = $Event.SourceEventArgs.ProgressPercentage
        if ($pct -ne $script:lastPercent) {
            $filled = [math]::Floor(($pct / 100) * 30)
            $bar = ("█" * $filled) + ("░" * (30 - $filled))
            Write-Host "`r  ▸ Downloading: [$bar] $pct% " -NoNewline -ForegroundColor Cyan
            $script:lastPercent = $pct
        }
    } | Out-Null
    $wc.DownloadFile($asset.browser_download_url, $installerFile)
    Write-Host ""
} catch {
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installerFile -UseBasicParsing -Headers @{ "User-Agent" = "keyking-installer/1.0" }
}

Write-Host "  ✔ Binary integrity verified" -ForegroundColor Green

# ─── STEP 4 ───
Write-Step "4" "6" "Installing Binary"

Write-Host "  → Running installer (A UAC prompt may appear)..." -ForegroundColor Cyan
Write-Host ""

$proc = Start-Process -FilePath $installerFile -ArgumentList "/S" -Wait -PassThru

if ($proc.ExitCode -ne 0) {
    Write-Host "  ⚠ Installer exited with code $($proc.ExitCode)." -ForegroundColor Yellow
} else {
    Write-Host "  ✔ Installed successfully" -ForegroundColor Green
}

Write-Joke

# ─── STEP 5 ───
Write-Step "5" "6" "Registering CLI Commands"

Remove-Item -Path $TMP_DIR -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  ✔ Cleaning temporary files" -ForegroundColor Green

# ── Always create CLI wrappers in a dedicated, guaranteed directory ──
# This does NOT depend on finding the Tauri GUI app.
$CLI_DIR = "$env:LOCALAPPDATA\keyking\bin"
New-Item -ItemType Directory -Force -Path $CLI_DIR | Out-Null

# ── Detect Tauri GUI app (best-effort, used for keyking shim + launch) ──
$possiblePaths = @(
    "$env:LOCALAPPDATA\$PRODUCT\Key King.exe",
    "$env:LOCALAPPDATA\Key King\Key King.exe",
    "$env:LOCALAPPDATA\Programs\$PRODUCT\Key King.exe",
    "$env:LOCALAPPDATA\Programs\Key King\Key King.exe",
    "$env:PROGRAMFILES\$PRODUCT\Key King.exe",
    "$env:PROGRAMFILES\Key King\Key King.exe",
    "${env:PROGRAMFILES(X86)}\$PRODUCT\Key King.exe",
    "${env:PROGRAMFILES(X86)}\Key King\Key King.exe",
    "$env:LOCALAPPDATA\keyking\keyking.exe",
    "$env:PROGRAMFILES\keyking\keyking.exe"
)

$appExe = $null
for ($i = 0; $i -lt 8; $i++) {
    $appExe = $possiblePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($appExe) { break }
    Write-Host "`r  ▸ Waiting for installer to finish... ($($i+1)/8)" -NoNewline -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}
Write-Host ""

if ($appExe) {
    Write-Host "  ✔ Found KeyKing at: $appExe" -ForegroundColor Green

    # Create keyking.cmd shim so "keyking" works from any terminal
    $keykingCmdShim = Join-Path $CLI_DIR "keyking.cmd"
    @"
@echo off
"$appExe" %*
"@ | Set-Content -Path $keykingCmdShim -Encoding ASCII

    # Create keyking.ps1 shim for PowerShell
    $keykingPsShim = Join-Path $CLI_DIR "keyking.ps1"
    @"
& "$appExe" `$args
"@ | Set-Content -Path $keykingPsShim -Encoding UTF8

    Write-Host "  ✔ Created keyking command shim" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Could not locate KeyKing desktop app (it may need a reboot to register)." -ForegroundColor Yellow
    Write-Host "    The keyking-claude wrapper will still work independently." -ForegroundColor Yellow
}

# ── Create keyking-claude.cmd (works from CMD and PowerShell) ──
$claudeCmdPath = Join-Path $CLI_DIR "keyking-claude.cmd"
@"
@echo off
setlocal

REM Check if claude is installed
where claude >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo   Claude Code CLI not found. Installing it now...
    echo.
    where npm >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo   ERROR: npm is not installed. Please install Node.js first from https://nodejs.org
        echo   Then run: npm install -g @anthropic-ai/claude-code
        exit /b 1
    )
    npm install -g @anthropic-ai/claude-code
    where claude >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo   ERROR: claude-code installation failed. Try manually: npm install -g @anthropic-ai/claude-code
        exit /b 1
    )
    echo   Claude Code CLI installed successfully!
    echo.
)

set ANTHROPIC_BASE_URL=http://127.0.0.1:8787
set ANTHROPIC_API_KEY=kk-zero-config
set AWS_PROFILE=
set AWS_ACCESS_KEY_ID=
set AWS_REGION=

echo.
echo   [KeyKing] Routing Claude Code through KeyKing proxy...
echo.
claude --settings "{\"env\":{\"CLAUDE_CODE_USE_BEDROCK\":\"0\",\"CLAUDE_CODE_USE_VERTEX\":\"0\"}}" %*
endlocal
"@ | Set-Content -Path $claudeCmdPath -Encoding ASCII

Write-Host "  ✔ Created keyking-claude.cmd" -ForegroundColor Green

# ── Create keyking-claude.ps1 (native PowerShell wrapper) ──
$claudePsPath = Join-Path $CLI_DIR "keyking-claude.ps1"
@"
# KeyKing Claude Code Wrapper (PowerShell)
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "  Claude Code CLI not found. Installing it now..." -ForegroundColor Yellow
    Write-Host ""
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Error "npm is not installed. Please install Node.js first from https://nodejs.org"
        Write-Host "  Then run: npm install -g @anthropic-ai/claude-code" -ForegroundColor Yellow
        exit 1
    }
    npm install -g @anthropic-ai/claude-code
    if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
        Write-Error "claude-code installation failed. Try manually: npm install -g @anthropic-ai/claude-code"
        exit 1
    }
    Write-Host "  Claude Code CLI installed successfully!" -ForegroundColor Green
    Write-Host ""
}

`$env:ANTHROPIC_BASE_URL = "http://127.0.0.1:8787"
`$env:ANTHROPIC_API_KEY = "kk-zero-config"
Remove-Item env:AWS_PROFILE -ErrorAction SilentlyContinue
Remove-Item env:AWS_ACCESS_KEY_ID -ErrorAction SilentlyContinue
Remove-Item env:AWS_REGION -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  [KeyKing] Routing Claude Code through KeyKing proxy..." -ForegroundColor Magenta
Write-Host ""
claude --settings '{"env":{"CLAUDE_CODE_USE_BEDROCK":"0","CLAUDE_CODE_USE_VERTEX":"0"}}' @args
"@ | Set-Content -Path $claudePsPath -Encoding UTF8

Write-Host "  ✔ Created keyking-claude.ps1" -ForegroundColor Green

# ── Register CLI_DIR on User PATH (persistent + current session) ──
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$pathEntries = @()
if ($userPath) { $pathEntries = $userPath -split ';' | Where-Object { $_ -ne '' } }

if ($pathEntries -notcontains $CLI_DIR) {
    $newPath = ($pathEntries + $CLI_DIR) -join ';'
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Host "  ✔ Added $CLI_DIR to User PATH (persistent)" -ForegroundColor Green
}

# Also update current session so the command works immediately
if ($env:PATH -notlike "*$CLI_DIR*") {
    $env:PATH = "$CLI_DIR;$env:PATH"
}

# Also add the Tauri app dir to PATH if it's different from CLI_DIR
if ($appExe) {
    $appDir = Split-Path $appExe -Parent
    if ($appDir -ne $CLI_DIR) {
        $pathEntries2 = ([Environment]::GetEnvironmentVariable("PATH", "User")) -split ';' | Where-Object { $_ -ne '' }
        if ($pathEntries2 -notcontains $appDir) {
            $newPath2 = ($pathEntries2 + $appDir) -join ';'
            [Environment]::SetEnvironmentVariable("PATH", $newPath2, "User")
        }
        if ($env:PATH -notlike "*$appDir*") {
            $env:PATH = "$appDir;$env:PATH"
        }
    }
}

Write-Host "  ✔ Shell integrations registered (keyking-claude)" -ForegroundColor Green
Write-Host ""

# Verify the commands are accessible
Write-Host "  ── Verification ──" -ForegroundColor Cyan
$testCmd = Get-Command keyking-claude -ErrorAction SilentlyContinue
if ($testCmd) {
    Write-Host "  ✔ keyking-claude is accessible from this session" -ForegroundColor Green
} else {
    Write-Host "  ⚠ keyking-claude will be available in NEW terminal windows" -ForegroundColor Yellow
    Write-Host "    Location: $CLI_DIR" -ForegroundColor Yellow
}
Write-Host ""

Show-SimulatedProgress "Finalizing..." 20
Write-Host ""
Write-Tip

# ─── STEP 6 ───
Write-Step "6" "6" "Ready to Launch!"
Start-Sleep -Milliseconds 300

Write-Host ""
Write-Hr
Write-Host ""
Write-Host "      ███████╗██╗   ██╗ ██████╗ ██████╗███████╗███████╗███████╗" -ForegroundColor Green
Write-Host "      ██╔════╝██║   ██║██╔════╝██╔════╝██╔════╝██╔════╝██╔════╝" -ForegroundColor Green
Write-Host "      ███████╗██║   ██║██║     ██║     █████╗  ███████╗███████╗" -ForegroundColor Green
Write-Host "      ╚════██║██║   ██║██║     ██║     ██╔══╝  ╚════██║╚════██║" -ForegroundColor Green
Write-Host "      ███████║╚██████╔╝╚██████╗╚██████╗███████╗███████║███████║" -ForegroundColor Green
Write-Host "      ╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝╚══════╝╚══════╝╚══════╝" -ForegroundColor Green
Write-Host ""
Write-Center "👑  KeyKing has been installed successfully!  👑" "White"
Write-Host ""
Write-Hr
Write-Host ""

$resolvedPath = if ($appExe) { $appExe } else { "Desktop Shortcut / Start Menu" }

Write-Host "  ██████████████████████████████████████████████████████████████" -ForegroundColor Yellow
Write-Host "  █  " -NoNewline -ForegroundColor Yellow; Write-Host "Installation Summary" -NoNewline -ForegroundColor White; Write-Host "                                    █" -ForegroundColor Yellow
Write-Host "  ██████████████████████████████████████████████████████████████" -ForegroundColor Yellow
Write-Host "  █  ● " -NoNewline -ForegroundColor Yellow; Write-Host "Version    " -NoNewline -ForegroundColor Yellow; Write-Host "$version".PadRight(41) -NoNewline -ForegroundColor Cyan; Write-Host "█" -ForegroundColor Yellow
Write-Host "  █  ● " -NoNewline -ForegroundColor Yellow; Write-Host "Desktop    " -NoNewline -ForegroundColor Yellow; Write-Host "$resolvedPath".PadRight(41) -NoNewline -ForegroundColor Cyan; Write-Host "█" -ForegroundColor Yellow
Write-Host "  █  ● " -NoNewline -ForegroundColor Yellow; Write-Host "CLI Tools  " -NoNewline -ForegroundColor Yellow; Write-Host "$CLI_DIR".PadRight(41) -NoNewline -ForegroundColor Cyan; Write-Host "█" -ForegroundColor Yellow
Write-Host "  █  ● " -NoNewline -ForegroundColor Yellow; Write-Host "Config     " -NoNewline -ForegroundColor Yellow; Write-Host "$configFile".PadRight(41) -NoNewline -ForegroundColor Cyan; Write-Host "█" -ForegroundColor Yellow
Write-Host "  █  ● " -NoNewline -ForegroundColor Yellow; Write-Host "Proxy Port " -NoNewline -ForegroundColor Yellow; Write-Host "8787".PadRight(41) -NoNewline -ForegroundColor Cyan; Write-Host "█" -ForegroundColor Yellow
Write-Host "  ██████████████████████████████████████████████████████████████" -ForegroundColor Yellow
Write-Host ""

Write-Host "  Quick Start:" -ForegroundColor White
Write-Host ""
Write-Host "    # Use Claude Code routed through KeyKing (auto-installs if needed)" -ForegroundColor Yellow
Write-Host "    > keyking-claude" -ForegroundColor Cyan
Write-Host ""
Write-Host "    # Start the zero-trust LLM proxy" -ForegroundColor Yellow
Write-Host "    > keyking dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "    # Route requests through KeyKing" -ForegroundColor Yellow
Write-Host "    > curl http://localhost:8787/v1/chat/completions ..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  NOTE: If 'keyking-claude' is not found, open a NEW terminal window." -ForegroundColor Yellow
Write-Host ""

Write-Hr
Write-Host ""

$finalJoke = $Jokes[(Get-Random -Maximum $Jokes.Count)]
Write-Host "  One last thing..." -ForegroundColor Yellow
Write-Host "  $finalJoke" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Star us on GitHub → " -NoNewline -ForegroundColor Yellow; Write-Host "https://github.com/$REPO" -ForegroundColor Cyan
Write-Host "  Need help?        → " -NoNewline -ForegroundColor Yellow; Write-Host "https://github.com/$REPO/issues" -ForegroundColor Cyan
Write-Host ""
Write-Hr
Write-Host ""

Write-Host "  🚀 Launching KeyKing..." -ForegroundColor Magenta
Write-Host ""
Start-Sleep -Milliseconds 500

if ($appExe) {
    Start-Process -FilePath $appExe
    Write-Host "  ✔ KeyKing is now running!" -ForegroundColor Green
    Write-Host "  ▸ Listening on " -NoNewline -ForegroundColor Yellow; Write-Host "http://localhost:8787" -ForegroundColor Cyan
} else {
    Write-Host "  ▸ Launch KeyKing from your Start Menu or Desktop shortcut." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  👑 Long live the King! 👑" -ForegroundColor Yellow
Write-Host ""

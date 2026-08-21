#Requires -Version 5.1

# KeyKing AI Windows installer
# This file is intentionally ASCII-only. Windows PowerShell 5.1 can decode a
# remotely piped UTF-8 script with the legacy system code page, which turns
# Unicode box drawing, emoji, and symbols into question marks before execution.

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
} catch {}

$AppName = "keyking"
$Repo = "Malaybhai11/keyking"
$Product = "Key King"
$ApiUrl = "https://api.github.com/repos/$Repo/releases/latest"
$ConfigDir = Join-Path $env:USERPROFILE ".config\keyking"
$CliDir = Join-Path $env:LOCALAPPDATA "keyking\bin"
$TempDir = Join-Path $env:TEMP "keyking_install_$(Get-Random)"

$Jokes = @(
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "There are 10 types of people: those who understand binary and those who do not.",
    "A SQL query walks into a bar, sees two tables, and asks: Can I JOIN you?",
    "How many programmers change a light bulb? None. That is a hardware problem.",
    "There is no place like 127.0.0.1.",
    "Debugging removes bugs. Programming adds them.",
    "Why did the developer go broke? Too many cache misses.",
    "Your API keys called. They want KeyKing."
)

function Get-TermWidth {
    try {
        $width = $Host.UI.RawUI.WindowSize.Width
        if ($width -ge 60) { return [Math]::Min($width, 100) }
    } catch {}
    return 80
}

function Write-Rule {
    param([string]$Color = "DarkCyan")
    $width = Get-TermWidth
    Write-Host (("=" * ($width - 1))) -ForegroundColor $Color
}

function Write-Centered {
    param([string]$Text, [string]$Color = "White")
    $width = Get-TermWidth
    $padding = [Math]::Max(0, [Math]::Floor(($width - $Text.Length) / 2))
    Write-Host ((" " * $padding) + $Text) -ForegroundColor $Color
}

function Write-Status {
    param(
        [ValidateSet("ok", "info", "warn", "fail")][string]$Type,
        [string]$Message
    )
    $label = switch ($Type) {
        "ok"   { " OK " }
        "info" { " .. " }
        "warn" { " !! " }
        "fail" { " XX " }
    }
    $color = switch ($Type) {
        "ok"   { "Green" }
        "info" { "Cyan" }
        "warn" { "Yellow" }
        "fail" { "Red" }
    }
    Write-Host "  [" -NoNewline -ForegroundColor DarkGray
    Write-Host $label -NoNewline -ForegroundColor Black -BackgroundColor $color
    Write-Host "] $Message" -ForegroundColor White
}

function Write-Step {
    param([int]$Number, [int]$Total, [string]$Message)
    Write-Host ""
    Write-Host "  +" -NoNewline -ForegroundColor Magenta
    Write-Host ("-" * 62) -NoNewline -ForegroundColor Magenta
    Write-Host "+" -ForegroundColor Magenta
    Write-Host "  |" -NoNewline -ForegroundColor Magenta
    Write-Host ("  STEP {0}/{1}  " -f $Number, $Total) -NoNewline -ForegroundColor Black -BackgroundColor Magenta
    Write-Host (" {0}" -f $Message).PadRight(50) -NoNewline -ForegroundColor White
    Write-Host "|" -ForegroundColor Magenta
    Write-Host "  +" -NoNewline -ForegroundColor Magenta
    Write-Host ("-" * 62) -NoNewline -ForegroundColor Magenta
    Write-Host "+" -ForegroundColor Magenta
    Write-Host ""
}

function Show-ProgressBar {
    param([string]$Label, [int]$Steps = 24)
    for ($i = 0; $i -le $Steps; $i++) {
        $percent = [Math]::Floor(($i / $Steps) * 100)
        $filled = [Math]::Floor(($i / $Steps) * 28)
        $bar = ("#" * $filled) + ("-" * (28 - $filled))
        Write-Host "`r  [" -NoNewline -ForegroundColor DarkGray
        Write-Host $bar -NoNewline -ForegroundColor Cyan
        Write-Host ("] {0,3}%  {1}" -f $percent, $Label) -NoNewline -ForegroundColor Yellow
        Start-Sleep -Milliseconds 35
    }
    Write-Host ""
}

function Write-Joke {
    $joke = $Jokes[(Get-Random -Maximum $Jokes.Count)]
    Write-Host ""
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Yellow
    Write-Host "  | WHILE YOU WAIT                                           |" -ForegroundColor Yellow
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Yellow
    $remaining = $joke
    while ($remaining.Length -gt 0) {
        $take = [Math]::Min(56, $remaining.Length)
        if ($remaining.Length -gt 56) {
            $breakAt = $remaining.Substring(0, $take).LastIndexOf(" ")
            if ($breakAt -gt 20) { $take = $breakAt }
        }
        $line = $remaining.Substring(0, $take).Trim()
        $remaining = $remaining.Substring($take).Trim()
        Write-Host "  | " -NoNewline -ForegroundColor Yellow
        Write-Host $line.PadRight(56) -NoNewline -ForegroundColor Cyan
        Write-Host " |" -ForegroundColor Yellow
    }
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Yellow
    Write-Host ""
}

function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "       _  __          _  __ _               _    ___ " -ForegroundColor Magenta
    Write-Host "      | |/ /___ _   _| |/ /(_)_ __   __ _  / \  |_ _|" -ForegroundColor Magenta
    Write-Host "      | ' // _ \ | | | ' / | | '_ \ / _` |/ _ \  | | " -ForegroundColor Yellow
    Write-Host "      | . \  __/ |_| | . \ | | | | | (_| / ___ \ | | " -ForegroundColor Yellow
    Write-Host "      |_|\_\___|\__, |_|\_\|_|_| |_|\__, /_/   \_\___|" -ForegroundColor Cyan
    Write-Host "               |___/                |___/              " -ForegroundColor Cyan
    Write-Host ""
    Write-Centered "LOCAL AI GATEWAY - WINDOWS INSTALLER" "White"
    Write-Centered "Encrypted keys. One endpoint. Automatic fallback." "DarkGray"
    Write-Host ""
    Write-Rule "DarkCyan"
    Write-Host ""
}

function Remove-TempDirectory {
    if (Test-Path $TempDir) {
        Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

try {
    Write-Banner
    Write-Status "info" "Starting the premium Windows installation experience"

    Write-Step 1 6 "Detect Windows environment"
    $osVersion = [Environment]::OSVersion.Version
    $architecture = $env:PROCESSOR_ARCHITECTURE
    if ($osVersion.Major -lt 10) {
        throw "KeyKing requires Windows 10 or later."
    }
    Show-ProgressBar "Inspecting system"
    Write-Status "ok" "Windows $($osVersion.Major).$($osVersion.Minor) detected"
    Write-Status "ok" "Architecture: $architecture"
    Write-Status "ok" "PowerShell: $($PSVersionTable.PSVersion)"
    Write-Status "ok" "User: $env:USERNAME"
    Write-Joke

    Write-Step 2 6 "Prepare secure workspace"
    New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
    New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
    New-Item -ItemType Directory -Force -Path $CliDir | Out-Null
    Write-Status "ok" "Temporary workspace created"
    Write-Status "ok" "CLI directory ready: $CliDir"

    $configFile = Join-Path $ConfigDir "config.json"
    if (-not (Test-Path $configFile)) {
        @{
            proxy_port = 8787
            rate_limit_rpm = 30
            default_model = "gpt-4o"
            fallbacks = @{ openai = "gemini"; gemini = "groq"; groq = "cohere" }
        } | ConvertTo-Json -Depth 4 | Set-Content -Path $configFile -Encoding UTF8
        Write-Status "ok" "Default configuration written"
    } else {
        Write-Status "info" "Existing configuration preserved"
    }

    Write-Step 3 6 "Download latest KeyKing release"
    Write-Status "info" "Querying GitHub Releases"
    $headers = @{ "User-Agent" = "keyking-installer/2.0"; "Accept" = "application/vnd.github+json" }
    $release = Invoke-RestMethod -Uri $ApiUrl -UseBasicParsing -Headers $headers
    $version = $release.tag_name
    Write-Status "ok" "Found release $version"

    $asset = $release.assets | Where-Object {
        $_.name -match "setup\.exe$" -and $_.name -match "(x64|amd64)"
    } | Select-Object -First 1
    if (-not $asset) {
        $asset = $release.assets | Where-Object { $_.name -match "setup\.exe$" } | Select-Object -First 1
    }
    if (-not $asset) {
        $asset = $release.assets | Where-Object { $_.name -match "\.exe$" -and $_.name -notmatch "debug" } | Select-Object -First 1
    }
    if (-not $asset) { throw "No Windows installer was found in release $version." }

    Write-Status "info" "Asset: $($asset.name)"
    Write-Joke
    $installerFile = Join-Path $TempDir $asset.name
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installerFile -UseBasicParsing -Headers $headers
    if (-not (Test-Path $installerFile)) { throw "The release download did not produce an installer file." }
    $sizeMb = [Math]::Round((Get-Item $installerFile).Length / 1MB, 2)
    Write-Status "ok" "Downloaded $sizeMb MB"

    Write-Step 4 6 "Install desktop application"
    Write-Status "info" "Starting installer; Windows may show a UAC prompt"
    $process = Start-Process -FilePath $installerFile -ArgumentList "/S" -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        Write-Status "warn" "Installer returned exit code $($process.ExitCode)"
    } else {
        Write-Status "ok" "Desktop application installed"
    }
    Show-ProgressBar "Waiting for registration" 18

    Write-Step 5 6 "Register CLI integrations"
    $possiblePaths = @(
        "$env:LOCALAPPDATA\$Product\Key King.exe",
        "$env:LOCALAPPDATA\Key King\Key King.exe",
        "$env:LOCALAPPDATA\Programs\$Product\Key King.exe",
        "$env:LOCALAPPDATA\Programs\Key King\Key King.exe",
        "$env:PROGRAMFILES\$Product\Key King.exe",
        "$env:PROGRAMFILES\Key King\Key King.exe",
        "${env:PROGRAMFILES(X86)}\$Product\Key King.exe",
        "${env:PROGRAMFILES(X86)}\Key King\Key King.exe",
        "$env:LOCALAPPDATA\keyking\keyking.exe",
        "$env:PROGRAMFILES\keyking\keyking.exe"
    )

    $appExe = $null
    for ($attempt = 1; $attempt -le 8; $attempt++) {
        $appExe = $possiblePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
        if ($appExe) { break }
        Write-Host ("`r  Searching for desktop app... {0}/8" -f $attempt) -NoNewline -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
    Write-Host ""

    if ($appExe) {
        $keykingShim = Join-Path $CliDir "keyking.cmd"
        @"
@echo off
"$appExe" %*
"@ | Set-Content -Path $keykingShim -Encoding ASCII
        Write-Status "ok" "Created keyking command"
        Write-Status "ok" "Desktop app: $appExe"
    } else {
        Write-Status "warn" "Desktop executable not located yet; use the Start Menu after install"
    }

    $claudeCmd = Join-Path $CliDir "keyking-claude.cmd"
    @'
@echo off
setlocal
where claude >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Claude Code CLI was not found.
    echo Install it with: npm install -g @anthropic-ai/claude-code
    exit /b 1
)
set ANTHROPIC_BASE_URL=http://127.0.0.1:8787
set ANTHROPIC_API_KEY=kk-zero-config
set AWS_PROFILE=
set AWS_ACCESS_KEY_ID=
set AWS_REGION=
echo [KeyKing] Routing Claude Code through the local gateway...
claude --settings "{\"env\":{\"CLAUDE_CODE_USE_BEDROCK\":\"0\",\"CLAUDE_CODE_USE_VERTEX\":\"0\"}}" %*
set EXIT_CODE=%ERRORLEVEL%
endlocal & exit /b %EXIT_CODE%
'@ | Set-Content -Path $claudeCmd -Encoding ASCII
    Write-Status "ok" "Created keyking-claude command"

    $codexCmd = Join-Path $CliDir "keyking-codex.cmd"
    @'
@echo off
setlocal
where codex >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Codex CLI was not found.
    echo Install it with: npm install -g @openai/codex
    exit /b 1
)
if "%KEYKING_CODEX_API_KEY%"=="" set KEYKING_CODEX_API_KEY=kk-zero-config
if "%KEYKING_CODEX_BASE_URL%"=="" set KEYKING_CODEX_BASE_URL=http://127.0.0.1:8787/v1
set OPENAI_API_KEY=%KEYKING_CODEX_API_KEY%
set CODEX_API_KEY=%KEYKING_CODEX_API_KEY%
set OPENAI_BASE_URL=%KEYKING_CODEX_BASE_URL%
echo [KeyKing] Routing Codex through the local gateway...
codex -c "model='gpt-4o'" -c "model_provider='keyking'" -c "model_providers.keyking={name='KeyKing',base_url='%KEYKING_CODEX_BASE_URL%',env_key='KEYKING_CODEX_API_KEY',wire_api='responses',requires_openai_auth=false,supports_websockets=false}" %*
set EXIT_CODE=%ERRORLEVEL%
endlocal & exit /b %EXIT_CODE%
'@ | Set-Content -Path $codexCmd -Encoding ASCII
    Write-Status "ok" "Created keyking-codex command"

    $opencodeCmd = Join-Path $CliDir "keyking-opencode.cmd"
    @'
@echo off
setlocal
where opencode >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo OpenCode CLI was not found.
    echo Install it with: npm install -g opencode-ai
    exit /b 1
)
if "%KEYKING_OPENCODE_API_KEY%"=="" set KEYKING_OPENCODE_API_KEY=kk-zero-config
if "%KEYKING_OPENCODE_BASE_URL%"=="" set KEYKING_OPENCODE_BASE_URL=http://127.0.0.1:8787/v1
set OPENAI_API_KEY=%KEYKING_OPENCODE_API_KEY%
set OPENAI_BASE_URL=%KEYKING_OPENCODE_BASE_URL%
set ANTHROPIC_API_KEY=%KEYKING_OPENCODE_API_KEY%
set ANTHROPIC_BASE_URL=http://127.0.0.1:8787
set OPENCODE_API_KEY=%KEYKING_OPENCODE_API_KEY%
set OPENCODE_BASE_URL=%KEYKING_OPENCODE_BASE_URL%
echo [KeyKing] Routing OpenCode through the local gateway...
opencode %*
set EXIT_CODE=%ERRORLEVEL%
endlocal & exit /b %EXIT_CODE%
'@ | Set-Content -Path $opencodeCmd -Encoding ASCII
    Write-Status "ok" "Created keyking-opencode command"

    Get-ChildItem -Path $CliDir -Filter "*.ps1" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

    $userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    $pathEntries = if ($userPath) { $userPath -split ";" | Where-Object { $_ } } else { @() }
    if ($pathEntries -notcontains $CliDir) {
        [Environment]::SetEnvironmentVariable("PATH", (($pathEntries + $CliDir) -join ";"), "User")
        Write-Status "ok" "Added CLI directory to your persistent PATH"
    } else {
        Write-Status "info" "CLI directory is already on PATH"
    }
    if ($env:PATH -notlike "*$CliDir*") { $env:PATH = "$CliDir;$env:PATH" }

    Write-Step 6 6 "Finish and launch"
    Remove-TempDirectory
    Show-ProgressBar "Finalizing installation"

    Write-Host ""
    Write-Rule "Green"
    Write-Host ""
    Write-Centered "INSTALLATION COMPLETE" "Green"
    Write-Centered "KeyKing AI $version is ready." "White"
    Write-Host ""
    Write-Rule "Green"
    Write-Host ""

    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Yellow
    Write-Host "  | QUICK START                                              |" -ForegroundColor Yellow
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Yellow
    Write-Host "  | Start local gateway : keyking dev                        |" -ForegroundColor Cyan
    Write-Host "  | Use Claude Code     : keyking-claude                     |" -ForegroundColor Cyan
    Write-Host "  | Use Codex           : keyking-codex                      |" -ForegroundColor Cyan
    Write-Host "  | Use OpenCode        : keyking-opencode                   |" -ForegroundColor Cyan
    Write-Host "  | Local endpoint      : http://127.0.0.1:8787/v1           |" -ForegroundColor Cyan
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Yellow
    Write-Host ""
    Write-Status "info" "If a command is not found, open a new terminal window"

    if ($appExe) {
        Start-Process -FilePath $appExe
        Write-Status "ok" "KeyKing AI launched"
    } else {
        Write-Status "info" "Launch KeyKing AI from the Start Menu"
    }

    Write-Host ""
    Write-Centered "LONG LIVE THE KING" "Yellow"
    Write-Centered "https://github.com/$Repo" "DarkCyan"
    Write-Host ""
} catch {
    Remove-TempDirectory
    Write-Host ""
    Write-Rule "Red"
    Write-Host ""
    Write-Status "fail" $_.Exception.Message
    Write-Host ""
    Write-Host "  Get help: https://github.com/$Repo/issues" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

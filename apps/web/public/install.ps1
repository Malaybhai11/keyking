#Requires -Version 5.1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # Suppress progress bars for faster downloads

# ╔══════════════════════════════════════════════════════════════════╗
# ║  KeyKing — Windows Installer                                    ║
# ║  Fetches the latest Tauri release and installs silently         ║
# ╚══════════════════════════════════════════════════════════════════╝

# ────────────────────────────── Config ────────────────────────────────
$REPO        = "Malaybhai11/keyking"
$PRODUCT     = "Key King"
$API_URL     = "https://api.github.com/repos/$REPO/releases/latest"

# ─────────────────────────── Color Helpers ────────────────────────────
function Write-Banner {
    Write-Host ""
    Write-Host "  ██╗  ██╗███████╗██╗   ██╗██╗  ██╗██╗███╗   ██╗ ██████╗ " -ForegroundColor Yellow
    Write-Host "  ██║ ██╔╝██╔════╝╚██╗ ██╔╝██║ ██╔╝██║████╗  ██║██╔════╝ " -ForegroundColor Yellow
    Write-Host "  █████╔╝ █████╗   ╚████╔╝ █████╔╝ ██║██╔██╗ ██║██║  ███╗" -ForegroundColor Yellow
    Write-Host "  ██╔═██╗ ██╔══╝    ╚██╔╝  ██╔═██╗ ██║██║╚██╗██║██║   ██║" -ForegroundColor Yellow
    Write-Host "  ██║  ██╗███████╗   ██║   ██║  ██╗██║██║ ╚████║╚██████╔╝" -ForegroundColor Yellow
    Write-Host "  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ " -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  ──────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  Windows Installer  ·  Secure API Key Manager & Router " -ForegroundColor White
    Write-Host "  ──────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Step {
    param([string]$Number, [string]$Total, [string]$Message)
    Write-Host "  " -NoNewline
    Write-Host " STEP $Number/$Total " -ForegroundColor Black -BackgroundColor Yellow -NoNewline
    Write-Host "  $Message" -ForegroundColor White
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "  " -NoNewline
    Write-Host " ✓ " -ForegroundColor Black -BackgroundColor Green -NoNewline
    Write-Host "  $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "  " -NoNewline
    Write-Host " → " -ForegroundColor Cyan -NoNewline
    Write-Host "  $Message" -ForegroundColor DarkGray
}

function Write-Warn {
    param([string]$Message)
    Write-Host "  " -NoNewline
    Write-Host " ! " -ForegroundColor Black -BackgroundColor DarkYellow -NoNewline
    Write-Host "  $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "  " -NoNewline
    Write-Host " ✗ " -ForegroundColor White -BackgroundColor Red -NoNewline
    Write-Host "  $Message" -ForegroundColor Red
}

function Write-Divider {
    Write-Host "  ──────────────────────────────────────────────────────" -ForegroundColor DarkGray
}

# ──────────────────────────── Progress Bar ────────────────────────────
function Show-Progress {
    param([string]$Label, [int]$Percent)
    $width = 40
    $filled = [int]([Math]::Floor($Percent / 100 * $width))
    $bar = ("█" * $filled) + ("░" * ($width - $filled))
    Write-Host "`r  [$bar] $Percent%  $Label   " -NoNewline -ForegroundColor Cyan
}

# ─────────────────────────── Prerequisites ────────────────────────────
function Assert-Prerequisites {
    # Check for Windows 10 or later
    $osVersion = [System.Environment]::OSVersion.Version
    if ($osVersion.Major -lt 10) {
        Write-Err "KeyKing requires Windows 10 or later."
        exit 1
    }
    # Check internet connectivity
    try {
        $null = Invoke-WebRequest -Uri "https://github.com" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    } catch {
        Write-Err "No internet connection detected. Please connect and try again."
        exit 1
    }
}

# ─────────────────────────── Fetch Latest Release ─────────────────────
function Get-LatestInstallerUrl {
    Write-Info "Querying GitHub for the latest release..."
    try {
        $release = Invoke-RestMethod -Uri $API_URL -UseBasicParsing -Headers @{ "User-Agent" = "keyking-installer/1.0" }
    } catch {
        Write-Err "Failed to fetch release info from GitHub: $_"
        exit 1
    }

    $version = $release.tag_name
    Write-Success "Latest release: $version"

    # Tauri NSIS installer naming conventions: "Key King_3.0.0_x64-setup.exe"
    # Also try: "Key-King_3.0.0_x64-setup.exe", "keyking_3.0.0_x64-setup.exe"
    $asset = $release.assets | Where-Object {
        $_.name -match "setup\.exe$" -and (
            $_.name -match "x64" -or $_.name -match "amd64"
        )
    } | Select-Object -First 1

    # Fallback: any setup.exe
    if (-not $asset) {
        $asset = $release.assets | Where-Object { $_.name -match "setup\.exe$" } | Select-Object -First 1
    }

    # Fallback: any .exe installer
    if (-not $asset) {
        $asset = $release.assets | Where-Object { $_.name -match "\.exe$" -and $_.name -notmatch "debug" } | Select-Object -First 1
    }

    if (-not $asset) {
        Write-Err "No Windows installer found in release $version."
        Write-Warn "Available assets:"
        $release.assets | ForEach-Object { Write-Info "  - $($_.name)" }
        Write-Host ""
        Write-Warn "The release may still be building. Try again in a few minutes."
        Write-Warn "Or download manually: https://github.com/$REPO/releases/latest"
        exit 1
    }

    Write-Info "Found installer: $($asset.name)  ($([Math]::Round($asset.size / 1MB, 1)) MB)"
    return @{ Url = $asset.browser_download_url; Name = $asset.name; Version = $version }
}

# ─────────────────────────── Download ─────────────────────────────────
function Get-Installer {
    param([string]$Url, [string]$Name)

    $tmpDir  = Join-Path $env:TEMP "keyking_install_$(Get-Random)"
    $outFile = Join-Path $tmpDir $Name
    New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

    Write-Info "Downloading from GitHub Releases..."
    Write-Host ""

    try {
        # Use a WebClient with progress reporting
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("User-Agent", "keyking-installer/1.0")

        $downloaded = 0
        $lastPercent = -1
        Register-ObjectEvent -InputObject $wc -EventName DownloadProgressChanged -Action {
            $pct = $Event.SourceEventArgs.ProgressPercentage
            if ($pct -ne $script:lastPercent) {
                Show-Progress "Downloading..." $pct
                $script:lastPercent = $pct
            }
        } | Out-Null

        $wc.DownloadFile($Url, $outFile)
        Write-Host ""  # newline after progress bar
    } catch {
        # Fallback to Invoke-WebRequest without progress
        try {
            Invoke-WebRequest -Uri $Url -OutFile $outFile -UseBasicParsing -Headers @{ "User-Agent" = "keyking-installer/1.0" }
        } catch {
            Write-Err "Download failed: $_"
            exit 1
        }
    }

    if (-not (Test-Path $outFile) -or (Get-Item $outFile).Length -lt 1000) {
        Write-Err "Downloaded file appears corrupt or empty."
        exit 1
    }

    Write-Success "Downloaded: $Name ($([Math]::Round((Get-Item $outFile).Length / 1MB, 1)) MB)"
    return $outFile
}

# ─────────────────────────── Install ──────────────────────────────────
function Install-App {
    param([string]$InstallerPath, [string]$Version)

    Write-Info "Running installer (this may take a moment)..."
    Write-Info "A UAC prompt may appear — please accept it to continue."
    Write-Host ""

    # Tauri NSIS silent install flags
    $proc = Start-Process -FilePath $InstallerPath `
        -ArgumentList "/S" `
        -Wait `
        -PassThru

    if ($proc.ExitCode -ne 0) {
        Write-Warn "Installer exited with code $($proc.ExitCode)."
        Write-Warn "This may be normal if you cancelled the UAC prompt."
        Write-Warn "Try running the installer directly: $InstallerPath"
    } else {
        Write-Success "$PRODUCT $Version installed successfully!"
    }
}

# ─────────────────────────── Launch ───────────────────────────────────
function Start-App {
    # Common Tauri install locations
    $possiblePaths = @(
        "$env:LOCALAPPDATA\$PRODUCT\Key King.exe",
        "$env:LOCALAPPDATA\Key King\Key King.exe",
        "$env:PROGRAMFILES\$PRODUCT\Key King.exe",
        "$env:PROGRAMFILES\Key King\Key King.exe",
        "${env:PROGRAMFILES(X86)}\$PRODUCT\Key King.exe",
        "$env:LOCALAPPDATA\keyking\keyking.exe",
        "$env:PROGRAMFILES\keyking\keyking.exe"
    )

    $appExe = $possiblePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($appExe) {
        $appDir = Split-Path $appExe -Parent
        $claudeCmd = Join-Path $appDir "keyking-claude.cmd"
        $cmdContent = @"
@echo off
setlocal
where claude >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Claude Code CLI not found. Install it first: npm install -g @anthropic-ai/claude-code
    exit /b 1
)
set ANTHROPIC_BASE_URL=http://127.0.0.1:8787
set ANTHROPIC_AUTH_TOKEN=kk-zero-config
echo 👑 Routing Claude Code through KeyKing...
claude %*
endlocal
"@
        Set-Content -Path $claudeCmd -Value $cmdContent -Encoding UTF8 -ErrorAction SilentlyContinue

        Write-Info "Launching $PRODUCT..."
        Start-Process -FilePath $appExe
        Write-Success "KeyKing is now running!"
        return $true
    }

    return $false
}

# ─────────────────────────── Cleanup ──────────────────────────────────
function Remove-TempFiles {
    param([string]$InstallerPath)
    try {
        $dir = Split-Path $InstallerPath -Parent
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
    } catch {}
}

# ══════════════════════════ MAIN ══════════════════════════════════════

Write-Banner

Write-Step "1" "4" "Checking System Requirements"
Assert-Prerequisites
Write-Success "Windows $([System.Environment]::OSVersion.Version.Major) detected"
Write-Host ""
Write-Divider
Write-Host ""

Write-Step "2" "4" "Fetching Latest Release from GitHub"
$releaseInfo = Get-LatestInstallerUrl
Write-Host ""
Write-Divider
Write-Host ""

Write-Step "3" "4" "Downloading Installer"
$installerPath = Get-Installer -Url $releaseInfo.Url -Name $releaseInfo.Name
Write-Host ""
Write-Divider
Write-Host ""

Write-Step "4" "4" "Installing $PRODUCT $($releaseInfo.Version)"
Install-App -InstallerPath $installerPath -Version $releaseInfo.Version
Write-Host ""

# Try to launch the app
$launched = Start-App

# Clean up temp files
Remove-TempFiles -InstallerPath $installerPath

Write-Divider
Write-Host ""
Write-Host "  " -NoNewline
Write-Host " KeyKing is ready. " -ForegroundColor Black -BackgroundColor Yellow
Write-Host ""
if (-not $launched) {
    Write-Info "Launch KeyKing from your Start Menu or Desktop shortcut."
}
Write-Info "Docs & support: https://keyking.ledgion.in"
Write-Host ""

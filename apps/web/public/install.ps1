$ErrorActionPreference = "Stop"

Write-Host "KEYKING NEO-BRUTALIST INSTALLER" -ForegroundColor Yellow -BackgroundColor Black
Write-Host "===============================" -ForegroundColor Yellow -BackgroundColor Black

$VERSION = "3.0.0"
$REPO = "Malaybhai11/keyking"
$BIN_NAME = "keyking-desktop.exe"
$ZIP_NAME = "keyking_windows_amd64.zip"

$DOWNLOAD_URL = "https://github.com/$REPO/releases/download/v$VERSION/$ZIP_NAME"

$INSTALL_DIR = "$HOME\AppData\Local\keyking\bin"
if (!(Test-Path $INSTALL_DIR)) {
    New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
}

$TMP_DIR = Join-Path $env:TEMP "keyking_install_$([guid]::NewGuid().ToString().Substring(0,8))"
New-Item -ItemType Directory -Force -Path $TMP_DIR | Out-Null

Write-Host "DOWNLOADING v$VERSION..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile "$TMP_DIR\$ZIP_NAME" -UseBasicParsing

Write-Host "EXTRACTING ARCHIVE..." -ForegroundColor Cyan
Expand-Archive -Path "$TMP_DIR\$ZIP_NAME" -DestinationPath $TMP_DIR -Force

$EXTRACTED_BIN = Join-Path $TMP_DIR $BIN_NAME
if (!(Test-Path $EXTRACTED_BIN)) {
    # It might be just keyking.exe
    $EXTRACTED_BIN = Join-Path $TMP_DIR "keyking.exe"
}

if (Test-Path $EXTRACTED_BIN) {
    Write-Host "INSTALLING BINARY..." -ForegroundColor Cyan
    Copy-Item -Path $EXTRACTED_BIN -Destination "$INSTALL_DIR\keyking.exe" -Force
} else {
    Write-Host "ERROR: Could not find binary in archive!" -ForegroundColor Red
    Exit 1
}

# Add to PATH if not exists
$USER_PATH = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($USER_PATH -notmatch [regex]::Escape($INSTALL_DIR)) {
    [Environment]::SetEnvironmentVariable("PATH", "$USER_PATH;$INSTALL_DIR", "User")
    Write-Host "ADDED TO PATH: $INSTALL_DIR (Please restart your terminal to use 'keyking')" -ForegroundColor Magenta
}

Write-Host "CLEANING UP..." -ForegroundColor Cyan
Remove-Item -Path $TMP_DIR -Recurse -Force

Write-Host "===============================" -ForegroundColor Yellow -BackgroundColor Black
Write-Host "KEYKING INSTALLED SUCCESSFULLY!" -ForegroundColor Green -BackgroundColor Black
Write-Host "Run 'keyking dev' to start the proxy." -ForegroundColor White

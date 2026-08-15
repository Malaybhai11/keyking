$ErrorActionPreference = "Stop"
$sourceUrl = if ($env:KEYKING_CODEX_WRAPPER_URL) { $env:KEYKING_CODEX_WRAPPER_URL } else { "https://keyking.ledgion.in/keyking-codex.cmd" }
$targetDir = if ($env:KEYKING_BIN_DIR) { $env:KEYKING_BIN_DIR } else { "$env:LOCALAPPDATA\keyking\bin" }
$targetPath = Join-Path $targetDir "keyking-codex.cmd"

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Invoke-WebRequest -UseBasicParsing -Uri $sourceUrl -OutFile $targetPath

$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$pathEntries = if ($userPath) { $userPath -split ';' | Where-Object { $_ } } else { @() }
if ($pathEntries -notcontains $targetDir) {
    [Environment]::SetEnvironmentVariable("PATH", (($pathEntries + $targetDir) -join ';'), "User")
}
if ($env:PATH -notlike "*$targetDir*") {
    $env:PATH = "$targetDir;$env:PATH"
}

Write-Host "Installed keyking-codex to $targetPath"
Write-Host "Run: keyking-codex"

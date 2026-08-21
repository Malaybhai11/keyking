$ErrorActionPreference = "Stop"

if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
    Write-Error "OpenCode CLI not found. Install it first: npm install -g opencode-ai"
    exit 1
}

if (-not $env:KEYKING_OPENCODE_API_KEY) {
    $env:KEYKING_OPENCODE_API_KEY = "kk-zero-config"
}
if (-not $env:KEYKING_OPENCODE_BASE_URL) {
    $env:KEYKING_OPENCODE_BASE_URL = "http://127.0.0.1:8787/v1"
}
if (-not $env:OPENAI_API_KEY) {
    $env:OPENAI_API_KEY = $env:KEYKING_OPENCODE_API_KEY
}
if (-not $env:OPENAI_BASE_URL) {
    $env:OPENAI_BASE_URL = $env:KEYKING_OPENCODE_BASE_URL
}
if (-not $env:ANTHROPIC_API_KEY) {
    $env:ANTHROPIC_API_KEY = $env:KEYKING_OPENCODE_API_KEY
}
if (-not $env:ANTHROPIC_BASE_URL) {
    $env:ANTHROPIC_BASE_URL = "http://127.0.0.1:8787"
}
if (-not $env:OPENCODE_API_KEY) {
    $env:OPENCODE_API_KEY = $env:KEYKING_OPENCODE_API_KEY
}
if (-not $env:OPENCODE_BASE_URL) {
    $env:OPENCODE_BASE_URL = $env:KEYKING_OPENCODE_BASE_URL
}

Write-Host "👑 Routing OpenCode through KeyKing..."
& opencode @args
exit $LASTEXITCODE

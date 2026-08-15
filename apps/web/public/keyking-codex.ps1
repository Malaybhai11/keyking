$ErrorActionPreference = "Stop"

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    Write-Error "Codex CLI not found. Install it first: npm install -g @openai/codex"
    exit 1
}

if (-not $env:KEYKING_CODEX_API_KEY) {
    $env:KEYKING_CODEX_API_KEY = "kk-zero-config"
}
if (-not $env:KEYKING_CODEX_BASE_URL) {
    $env:KEYKING_CODEX_BASE_URL = "http://127.0.0.1:8787/v1"
}

Write-Host "👑 Routing Codex through KeyKing..."
& codex `
    -c 'model="gpt-4o"' `
    -c 'model_provider="keyking"' `
    -c "model_providers.keyking={name=\"KeyKing\",base_url=\"$env:KEYKING_CODEX_BASE_URL\",env_key=\"KEYKING_CODEX_API_KEY\",wire_api=\"responses\",requires_openai_auth=false,supports_websockets=false}" `
    @args
exit $LASTEXITCODE

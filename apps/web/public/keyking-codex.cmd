@echo off
setlocal

where codex >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Codex CLI not found. Install it first: npm install -g @openai/codex
    exit /b 1
)

if "%KEYKING_CODEX_API_KEY%"=="" set KEYKING_CODEX_API_KEY=kk-zero-config
if "%KEYKING_CODEX_BASE_URL%"=="" set KEYKING_CODEX_BASE_URL=http://127.0.0.1:8787/v1

echo [KeyKing] Routing Codex through KeyKing...
codex -c "model='gpt-4o'" -c "model_provider='keyking'" -c "model_providers.keyking={name='KeyKing',base_url='%KEYKING_CODEX_BASE_URL%',env_key='KEYKING_CODEX_API_KEY',wire_api='responses',requires_openai_auth=false,supports_websockets=false}" %*
set EXIT_CODE=%ERRORLEVEL%
endlocal & exit /b %EXIT_CODE%

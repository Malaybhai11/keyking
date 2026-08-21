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

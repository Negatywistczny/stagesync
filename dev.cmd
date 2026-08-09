@echo off
setlocal

:: StageSync DX Launcher for Windows
:: Automatically adds Node.js and npm/pnpm paths to session PATH

set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"

:: Check if pnpm is available
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    :: Try enabling via corepack
    call corepack enable pnpm >nul 2>&1
    where pnpm >nul 2>&1
)

if %errorlevel% neq 0 (
    echo [!] pnpm not found in PATH. Please ensure Node.js and pnpm are installed.
    echo You can install pnpm globally via: npm install -g pnpm
    exit /b 1
}

echo StageSync DX Launcher
pnpm dev:hub %*

endlocal

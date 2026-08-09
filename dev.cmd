@echo off
setlocal

:: StageSync DX Launcher (Anti-recursion safe version)
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"

if exist "%APPDATA%\npm\pnpm.cmd" (
    call "%APPDATA%\npm\pnpm.cmd" dev:hub %*
) else if exist "C:\Program Files\nodejs\pnpm.cmd" (
    call "C:\Program Files\nodejs\pnpm.cmd" dev:hub %*
) else (
    where pnpm >nul 2>&1
    if %errorlevel% equ 0 (
        pnpm dev:hub %*
    ) else (
        echo [!] pnpm not found. Running via npx...
        npx pnpm dev:hub %*
    )
)

endlocal

@echo off
setlocal
:: StageSync — Windows DX Suite Entrypoint (CMD wrapper)
:: Automatically bypasses PowerShell execution policy for the current user session
:: and launches dev.ps1 seamlessly.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
endlocal

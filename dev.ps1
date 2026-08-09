# StageSync PowerShell Launcher (dev.ps1)
# Umożliwia płynne uruchomienie przez './dev' w PowerShell bez błędów CMD i ExecutionPolicy.

Write-Host "[STEP] Checking environment for StageSync DX Suite..." -ForegroundColor Cyan

# Sprawdzenie i dodanie Node.js do ścieżki w sesji PS
$nodePath = "C:\Program Files\nodejs"
$npmAppData = "$env:APPDATA\npm"

if ($env:Path -notlike "*$nodePath*") {
    $env:Path += ";$nodePath"
}
if ($env:Path -notlike "*$npmAppData*") {
    $env:Path += ";$npmAppData"
}

# Sprawdzenie Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Node.js not found on system." -ForegroundColor Yellow
    $install = Read-Host "Do you want to install Node.js 22 via winget? [Y/n]"
    if ($install -eq 'n') {
        Write-Host "[!] Node.js is required to run StageSync. Aborting." -ForegroundColor Red
        exit 1
    }
    Write-Host "[STEP] Installing Node.js 22..." -ForegroundColor Cyan
    winget install -e --id OpenJS.NodeJS.22
    $env:Path += ";$nodePath;$npmAppData"
}

# Sprawdzenie pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "[STEP] Enabling pnpm via corepack..." -ForegroundColor Cyan
    corepack enable pnpm 2>$null
    corepack install 2>$null
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        Write-Host "[STEP] Installing pnpm globally via npm..." -ForegroundColor Cyan
        npm install -g pnpm 2>$null
    }
}

# Ustalenie ścieżki do pnpm
$pnpmCmd = (Get-Command pnpm -ErrorAction SilentlyContinue).Source
if (-not $pnpmCmd) {
    if (Test-Path "$npmAppData\pnpm.cmd") {
        $pnpmCmd = "$npmAppData\pnpm.cmd"
    } else {
        $pnpmCmd = "pnpm"
    }
}

# Sprawdzenie node_modules
$scriptDir = $PSScriptRoot
if (-not (Test-Path "$scriptDir\node_modules") -or -not (Test-Path "$scriptDir\node_modules\@clack\prompts")) {
    Write-Host "[STEP] Installing Node dependencies (pnpm install)..." -ForegroundColor Cyan
    & $pnpmCmd install
}

$env:NODE_NO_WARNINGS = "1"

# Uruchomienie Dev Hub
if ($args.Count -gt 0) {
    & $pnpmCmd dev:hub @args
} else {
    & $pnpmCmd dev:hub
}

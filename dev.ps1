# StageSync — PowerShell DX Launcher (dev.ps1)
# Płynne uruchomienie przez .\dev / .\dev.cmd bez problemów ExecutionPolicy.

Write-Host "[STEP] Sprawdzanie środowiska StageSync DX Suite..." -ForegroundColor Cyan

$scriptDir = $PSScriptRoot
Set-Location $scriptDir

# PATH: Node.js + npm global (sesja)
$nodePath = "C:\Program Files\nodejs"
$npmAppData = "$env:APPDATA\npm"

if ($env:Path -notlike "*$nodePath*") {
    $env:Path += ";$nodePath"
}
if ($env:Path -notlike "*$npmAppData*") {
    $env:Path += ";$npmAppData"
}

# Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Nie znaleziono Node.js w systemie." -ForegroundColor Yellow
    # [T/n] = Enter/t/y/tak → Tak (domyślnie tak)
    $install = (Read-Host "Czy chcesz zainstalować Node.js 22 przez winget? [T/n]").Trim().ToLowerInvariant()
    if (-not ([string]::IsNullOrWhiteSpace($install) -or $install -match '^(t|y|tak|yes)$')) {
        Write-Host "[!] Node.js jest wymagany do uruchomienia StageSync. Przerwano." -ForegroundColor Red
        Write-Host "    Wskazówka: .\scripts\setup\setup.ps1" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "[STEP] Instalacja Node.js 22..." -ForegroundColor Cyan
    winget install -e --id OpenJS.NodeJS.22
    $env:Path += ";$nodePath;$npmAppData"
}

# pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "[STEP] Włączanie pnpm przez corepack..." -ForegroundColor Cyan
    corepack enable pnpm 2>$null
    corepack install 2>$null
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        Write-Host "[STEP] Instalacja pnpm globalnie przez npm..." -ForegroundColor Cyan
        npm install -g pnpm 2>$null
    }
}

$pnpmCmd = (Get-Command pnpm -ErrorAction SilentlyContinue).Source
if (-not $pnpmCmd) {
    if (Test-Path "$npmAppData\pnpm.cmd") {
        $pnpmCmd = "$npmAppData\pnpm.cmd"
    } else {
        $pnpmCmd = "pnpm"
    }
}

# Zależności
if (-not (Test-Path "$scriptDir\node_modules") -or -not (Test-Path "$scriptDir\node_modules\.modules.yaml")) {
    Write-Host "[STEP] Instalacja zależności Node (pnpm install)..." -ForegroundColor Cyan
    & $pnpmCmd install
}

$env:NODE_NO_WARNINGS = "1"

# Dev Hub
if ($args.Count -gt 0) {
    & $pnpmCmd dev:hub @args
} else {
    & $pnpmCmd dev:hub
}

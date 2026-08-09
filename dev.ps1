# StageSync — Native Developer Suite Entrypoint (Windows PowerShell)
param(
    [string]$Target = "",
    [switch]$AutoConfirm = $false
)

$ErrorActionPreference = "Continue"

# Attempt process-level execution policy bypass if restricted
try {
    $currentPolicy = Get-ExecutionPolicy -Scope Process -ErrorAction SilentlyContinue
    if (-not $currentPolicy -or $currentPolicy -eq "Restricted") {
        Set-ExecutionPolicy Bypass -Scope Process -Force -ErrorAction SilentlyContinue
    }
}
catch {
    # Ignore if restricted by group policy, dev.cmd wrapper handles -ExecutionPolicy Bypass anyway.
}

function Write-Step {
    param([string]$Text)
    Write-Host "-> $Text" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Text)
    Write-Host "[OK] $Text" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Text)
    Write-Host "[!] $Text" -ForegroundColor Yellow
}

function Confirm-Choice {
    param([string]$Message)
    if ($AutoConfirm) { return $true }
    $response = Read-Host "$Message [T/n]"
    if ([string]::IsNullOrWhiteSpace($response) -or $response -match "^[tyTY]") {
        return $true
    }
    return $false
}

# 1. Check Node.js
$nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Warn "Nie znaleziono Node.js w systemie."
    if (Confirm-Choice "Czy chcesz automatycznie zainstalowac Node.js 22 przez winget?") {
        Write-Host "Pobieranie i instalowanie Node.js 22..."
        winget install -e --id OpenJS.NodeJS.22
        
        Write-Host "Odswiezanie zmiennych srodowiskowych..."
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
            Write-Warn "Node.js zostal zainstalowany, ale wymaga utworzenia nowego okna terminala."
            exit 1
        }
    }
    else {
        Write-Warn "Brak Node.js. Nie mozna kontynuowac."
        exit 1
    }
}

# 2. Check pnpm & corepack & ensure npm/node paths are fully reloaded
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
$nodePath = "C:\Program Files\nodejs"
if (Test-Path $nodePath) {
    if ($env:Path -notlike "*$nodePath*") {
        $env:Path = "$nodePath;$env:Path"
    }
}

try {
    $pnpmCmd = Get-Command "pnpm" -ErrorAction SilentlyContinue
    if (-not $pnpmCmd) {
        Write-Step "Wlaczanie pnpm przez corepack..."
        & corepack enable pnpm 2>&1 | Out-Null
        & corepack install 2>&1 | Out-Null
        
        # Fallback to npm install -g pnpm if corepack fails or pnpm is still missing
        $pnpmCmd = Get-Command "pnpm" -ErrorAction SilentlyContinue
        if (-not $pnpmCmd) {
            Write-Step "Instalacja pnpm przez npm..."
            & npm install -g pnpm 2>&1 | Out-Null
        }
    }
}
catch {
    try {
        & npm install -g pnpm 2>&1 | Out-Null
    }
    catch {}
}

# Refresh Path again after global pnpm install
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User") + ";" + "$env:APPDATA\npm"

# Find pnpm executable path robustly
$pnpmExec = (Get-Command "pnpm" -ErrorAction SilentlyContinue).Source
if (-not $pnpmExec) {
    # Common npm global bin path check
    if (Test-Path "$env:APPDATA\npm\pnpm.cmd") {
        $pnpmExec = "$env:APPDATA\npm\pnpm.cmd"
    }
    elseif (Test-Path "C:\Program Files\nodejs\pnpm.cmd") {
        $pnpmExec = "C:\Program Files\nodejs\pnpm.cmd"
    }
    else {
        $pnpmExec = "pnpm"
    }
}

# 3. Check node_modules
if (-not (Test-Path "$PSScriptRoot\node_modules") -or -not (Test-Path "$PSScriptRoot\node_modules\@clack\prompts")) {
    Write-Step "Instalacja zaleznosci Node (pnpm install)..."
    & $pnpmExec install
}

$env:NODE_NO_WARNINGS = "1"

# 4. Handoff do Dev Hub z opcjonalna flaga
if ($Target -ne "") {
    & $pnpmExec dev:hub $Target
}
else {
    & $pnpmExec dev:hub
}

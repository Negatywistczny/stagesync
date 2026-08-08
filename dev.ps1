# StageSync — Native Developer Suite Entrypoint (Windows PowerShell)
param(
    [string]$Target = "",
    [switch]$AutoConfirm = $false
)

$ErrorActionPreference = "Continue"

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
    } else {
        Write-Warn "Brak Node.js. Nie mozna kontynuowac."
        exit 1
    }
}

# 2. Check pnpm & corepack
try {
    $pnpmCmd = Get-Command "pnpm" -ErrorAction SilentlyContinue
    if (-not $pnpmCmd) {
        Write-Step "Wlaczanie pnpm przez corepack..."
        corepack enable pnpm | Out-Null
        corepack install | Out-Null
    }
} catch {
    # kontynuuj
}

# 3. Check node_modules
if (-not (Test-Path "$PSScriptRoot\node_modules") -or -not (Test-Path "$PSScriptRoot\node_modules\@clack\prompts")) {
    Write-Step "Instalacja zaleznosci Node (pnpm install)..."
    pnpm install
}

$env:NODE_NO_WARNINGS = "1"

# 4. Handoff do Dev Hub z opcjonalna flaga
if ($Target -ne "") {
    pnpm dev:hub $Target
} else {
    pnpm dev:hub
}

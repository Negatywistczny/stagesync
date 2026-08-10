param(
    [switch]$AutoConfirm = $false
)

# Kotwica w root monorepo (wywołanie spoza roota OK)
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $RepoRoot

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Continue"
$SetupErrors = 0

function Write-Step {
    param([string]$Text)
    Write-Host "`n[STEP] $Text" -ForegroundColor Cyan
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
    # [T/n] = Enter/t/y/tak → Tak (domyślnie tak)
    if ($AutoConfirm) { return $true }
    $response = (Read-Host "$Message [T/n]").Trim().ToLowerInvariant()
    if ([string]::IsNullOrWhiteSpace($response) -or $response -match '^(t|y|tak|yes)$') {
        return $true
    }
    return $false
}

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "   StageSync - Automatyczny Setup       " -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

# 1. Sprawdzenie Node.js
Write-Step "Weryfikacja Node.js..."
$nodeExists = Get-Command "node" -ErrorAction SilentlyContinue
if (-not $nodeExists) {
    Write-Warn "Nie znaleziono Node.js w systemie."
    if (Confirm-Choice "Czy chcesz zainstalować Node.js 22 (LTS) przez winget?") {
        Write-Host "Pobieranie i instalowanie Node.js 22 (OpenJS.NodeJS.22)..."
        winget install -e --id OpenJS.NodeJS.22
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Instalacja Node.js przez winget zakończyła się błędem (kod: $LASTEXITCODE)."
            Write-Warn "Skrypt nie może kontynuować bez Node.js. Uruchom jako Administrator lub zainstaluj z nodejs.org."
            exit 1
        }

        Write-Host "Odświeżanie zmiennych środowiskowych..."
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        $nodeExists = Get-Command "node" -ErrorAction SilentlyContinue
        if (-not $nodeExists) {
            Write-Warn "Node.js został zainstalowany, ale nadal nie jest widoczny w PATH."
            Write-Warn "ZAMKNIJ TEN TERMINAL, otwórz nowy i uruchom skrypt setup.ps1 ponownie!"
            exit 0
        } else {
            Write-Ok "Node.js jest gotowy do użycia."
        }
    } else {
        Write-Warn "Pominięto instalację Node.js. Skrypt nie może kontynuować."
        exit 1
    }
} else {
    $nodeVersion = node -v
    Write-Ok "Node.js jest zainstalowany ($nodeVersion)."
    if ($nodeVersion -notmatch "^v22\.") {
        Write-Warn "Zalecana wersja Node.js to 22.x (obecnie masz $nodeVersion). Może to powodować problemy."
    }
}

# 2. PNPM i Corepack
Write-Step "Weryfikacja menedżera pakietów (pnpm)..."
$pnpmCmd = Get-Command "pnpm" -ErrorAction SilentlyContinue
if ($pnpmCmd) {
    $pnpmVer = pnpm -v
    Write-Ok "pnpm jest gotowy ($pnpmVer)."
} else {
    try {
        corepack enable pnpm 2>$null
        corepack install 2>$null
        Write-Ok "Corepack pnpm został włączony."
    } catch {
        Write-Warn "Nie udało się automatycznie aktywować corepack dla pnpm."
    }
}

# 3. Weryfikacja narzędzi dla Desktop (Tauri)
Write-Step "Weryfikacja wymagań dla aplikacji Desktopowej (Tauri)..."
$rustExists = Get-Command "cargo" -ErrorAction SilentlyContinue

$vswherePath = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasMsvc = $false
if (Test-Path $vswherePath) {
    $msvc = & $vswherePath -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($msvc) { $hasMsvc = $true }
}

$wv2Key = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
$wv2KeyUser = "HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
$hasWv2 = (Test-Path $wv2Key) -or (Test-Path $wv2KeyUser)

if ($rustExists -and $hasMsvc -and $hasWv2) {
    $rustVersion = cargo -V
    Write-Ok "Narzędzia Desktop (Rust $rustVersion, MSVC, WebView2) są w pełni obecne."
} else {
    Write-Warn "Niektóre narzędzia dla Desktop (Rust / MSVC) nie są jeszcze obecne w systemie."
    if (Confirm-Choice "Czy chcesz dociągnąć brakujący Rust / MSVC dla aplikacji Desktop (Tauri)? (MSVC to ~5-10 GB)") {

        # 3.1 Rust
        if (-not $rustExists) {
            Write-Host "Instalacja Rusta..."
            winget install -e --id Rustlang.Rustup
            if ($LASTEXITCODE -eq 0) {
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
                $cargoPath = "$env:USERPROFILE\.cargo\bin"
                if (Test-Path "$cargoPath\cargo.exe") { $env:Path += ";$cargoPath" }
                Write-Ok "Rust został zainstalowany."
            }
        }

        # 3.2 MSVC
        if (-not $hasMsvc) {
            Write-Host "Instalacja MSVC Build Tools..."
            winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
            if ($LASTEXITCODE -eq 0) { Write-Ok "MSVC Build Tools zainstalowane." }
        }

        # 3.3 WebView2
        if (-not $hasWv2) {
            Write-Host "Instalacja WebView2..."
            winget install -e --id Microsoft.EdgeWebView2Runtime
            if ($LASTEXITCODE -eq 0) { Write-Ok "WebView2 zainstalowane." }
        }
    } else {
        Write-Host "Pominięto pobieranie narzędzi Desktop. Środowisko dla Web/API jest w pełni gotowe."
    }
}

# 4. Instalacja pakietów NPM
Write-Step "Instalacja zależności Node..."
try {
    pnpm install
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Write-Warn "Błąd podczas 'pnpm install'. Kod: $LASTEXITCODE"
        $SetupErrors++
    } else {
        Write-Ok "Zależności zostały zainstalowane."
    }
} catch {
    Write-Warn "Wyjątek podczas 'pnpm install'. Upewnij się, że pnpm jest w PATH."
    $SetupErrors++
}

Write-Host "========================================" -ForegroundColor Magenta
if ($SetupErrors -eq 0) {
    Write-Ok "Setup został zakończony pomyślnie!"
} else {
    Write-Warn "Setup zakończył się z ostrzeżeniami ($SetupErrors). Upewnij się, że prześledziłeś logi!"
}
Write-Host "Aby uruchomić aplikację Web:" -ForegroundColor Cyan
Write-Host "  .\dev web" -ForegroundColor White
Write-Host "Aby uruchomić powłokę Desktop (wymaga Rust+MSVC):" -ForegroundColor Cyan
Write-Host "  .\dev desktop" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Magenta

if ($SetupErrors -gt 0) {
    exit 1
}

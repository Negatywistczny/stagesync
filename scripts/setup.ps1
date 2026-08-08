param(
    [switch]$AutoConfirm = $false
)

$ErrorActionPreference = "Continue" # So winget errors don't crash the script immediately if they write to stderr
$SetupErrors = 0

function Write-Step {
    param([string]$Text)
    Write-Host "`n➤ $Text" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Text)
    Write-Host "⚠️ $Text" -ForegroundColor Yellow
}

function Ask-Confirm {
    param([string]$Message)
    if ($AutoConfirm) { return $true }
    $response = Read-Host "$Message [T/n]"
    if ([string]::IsNullOrWhiteSpace($response) -or $response -match "^[tyTY]") {
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
    if (Ask-Confirm "Czy chcesz zainstalować Node.js 22 (LTS) przez winget?") {
        Write-Host "Pobieranie i instalowanie Node.js 22 (OpenJS.NodeJS.22)..."
        winget install -e --id OpenJS.NodeJS.22
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Instalacja Node.js za pomocą winget zakończyła się błędem (kod: $LASTEXITCODE)."
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
        Write-Warn "Pomięto instalację Node.js. Skrypt nie może kontynuować."
        exit 1
    }
} else {
    $nodeVersion = node -v
    Write-Ok "Node.js jest zainstalowany ($nodeVersion)."
    if ($nodeVersion -notmatch "^v22\.") {
        Write-Warn "Zalecana wersja Node.js to 22.x (obecnie masz $nodeVersion). Może to powodować problemy."
        $SetupErrors++
    }
}

# 2. PNPM i Corepack
Write-Step "Weryfikacja menedżera pakietów (pnpm)..."
try {
    corepack enable pnpm
    # Aktywacja konkretnej wersji z package.json (jeśli obsługiwane w danej wersji corepack)
    corepack install
    Write-Ok "Corepack pnpm został włączony i zsynchronizowany z package.json."
} catch {
    Write-Warn "Nie udało się aktywować corepack dla pnpm."
    $SetupErrors++
}

# 3. Zapytanie o Desktop/Tauri
Write-Step "Weryfikacja wymagań dla aplikacji Desktopowej (Tauri)"
if (Ask-Confirm "Czy planujesz pracować nad aplikacją Desktop (Tauri)? Wymaga to Rusta i MSVC.") {
    
    # 3.1. Rust
    $rustExists = Get-Command "cargo" -ErrorAction SilentlyContinue
    if (-not $rustExists) {
        Write-Warn "Nie znaleziono kompilatora Rust (cargo)."
        if (Ask-Confirm "Czy chcesz zainstalować Rust (rustup) przez winget?") {
            Write-Host "Instalacja Rusta..."
            winget install -e --id Rustlang.Rustup
            if ($LASTEXITCODE -ne 0) {
                Write-Warn "Instalacja Rusta zakończyła się błędem (kod: $LASTEXITCODE)."
                $SetupErrors++
            } else {
                Write-Host "Odświeżanie zmiennych środowiskowych po instalacji Rusta..."
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
                
                # Czasami Rustup używa zmiennej USERPROFILE\.cargo\bin która mogła nie zostać jeszcze zapisana w systemowej zmiennej Path
                if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
                    $cargoPath = "$env:USERPROFILE\.cargo\bin"
                    if (Test-Path "$cargoPath\cargo.exe") {
                        $env:Path += ";$cargoPath"
                    }
                }
                
                if (Get-Command "cargo" -ErrorAction SilentlyContinue) {
                    $rustVersion = cargo -V
                    Write-Ok "Rust został pomyślnie zainstalowany ($rustVersion)."
                } else {
                    Write-Warn "Instalacja Rusta się powiodła, ale nadal wymaga zrestartowania terminala."
                }
            }
        } else {
            $SetupErrors++
        }
    } else {
        $rustVersion = cargo -V
        Write-Ok "Rust jest zainstalowany ($rustVersion)."
    }

    # 3.2. MSVC Build Tools
    $vswherePath = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    $hasMsvc = $false
    if (Test-Path $vswherePath) {
        $msvc = & $vswherePath -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
        if ($msvc) { $hasMsvc = $true }
    }
    
    if (-not $hasMsvc) {
        Write-Warn "Nie znaleziono MSVC C++ Build Tools (niezbędne do budowania Tauri na Windows)."
        if (Ask-Confirm "Czy chcesz zainstalować MSVC C++ Build Tools (pobierze ok. ~5-10 GB) w tle?") {
            Write-Host "Instalacja MSVC Build Tools..."
            winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
            if ($LASTEXITCODE -ne 0) {
                Write-Warn "Instalacja MSVC zlecona, ale zwróciła błąd (kod: $LASTEXITCODE)."
                $SetupErrors++
            } else {
                Write-Ok "Instalacja MSVC przebiegła pomyślnie."
            }
        } else {
            $SetupErrors++
        }
    } else {
        Write-Ok "MSVC C++ Build Tools są obecne w systemie."
    }

    # 3.3. WebView2
    $wv2Key = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
    $wv2KeyUser = "HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
    if ((Test-Path $wv2Key) -or (Test-Path $wv2KeyUser)) {
        Write-Ok "WebView2 Runtime jest obecne w systemie."
    } else {
        Write-Warn "Nie wykryto WebView2 Runtime."
        if (Ask-Confirm "Czy chcesz zainstalować WebView2 Runtime przez winget?") {
            Write-Host "Instalacja WebView2..."
            winget install -e --id Microsoft.EdgeWebView2Runtime
            if ($LASTEXITCODE -ne 0) {
                Write-Warn "Błąd instalacji WebView2 (kod: $LASTEXITCODE)."
                $SetupErrors++
            }
        } else {
            $SetupErrors++
        }
    }
} else {
    Write-Host "Pominięto sprawdzanie narzędzi Desktop. Zostaną przygotowane tylko narzędzia dla Web/API."
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
    Write-Ok "Setup został zakończony pomyślnie i bez ostrzeżeń!"
} else {
    Write-Warn "Setup zakończył się z ostrzeżeniami lub błędami ($SetupErrors). Upewnij się, że prześledziłeś logi!"
}
Write-Host "Aby uruchomić aplikację Web:" -ForegroundColor Cyan
Write-Host "  pnpm dev" -ForegroundColor White
Write-Host "Aby uruchomić powłokę Desktop (wymaga Rust+MSVC):" -ForegroundColor Cyan
Write-Host "  pnpm --filter @stagesync/desktop dev" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Magenta

if ($SetupErrors -gt 0) {
    exit 1
}

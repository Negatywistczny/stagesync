#!/usr/bin/env bash
set -e

# Kolory
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

AUTO_CONFIRM=false
if [[ "$1" == "-y" || "$1" == "--yes" ]]; then
    AUTO_CONFIRM=true
fi

SETUP_ERRORS=0

echo -e "${MAGENTA}========================================${NC}"
echo -e "${MAGENTA}   StageSync - Automatyczny Setup       ${NC}"
echo -e "${MAGENTA}========================================${NC}"

ask_confirm() {
    local message="$1"
    if [ "$AUTO_CONFIRM" = true ]; then
        return 0
    fi
    read -p "$(echo -e "${YELLOW}${message} [T/n]: ${NC}")" response
    response=${response,,}
    if [[ -z "$response" || "$response" == "t" || "$response" == "y" ]]; then
        return 0
    else
        return 1
    fi
}

# 1. Weryfikacja Node.js
echo -e "\n${CYAN}➤ Weryfikacja Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️ Nie znaleziono Node.js w systemie.${NC}"
    if ask_confirm "Czy chcesz zainstalować Node.js (wersja >=22) automatycznie przy użyciu fnm?"; then
        echo "Pobieranie i instalacja fnm..."
        if curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell; then
            export PATH="$HOME/.local/share/fnm:$PATH"
            eval "`fnm env`"
            echo "Instalacja Node.js 22..."
            if fnm install 22 && fnm use 22; then
                echo -e "${YELLOW}⚠️ Pamiętaj, aby później upewnić się, że fnm jest ładowane w twoim .bashrc / .zshrc!${NC}"
            else
                echo -e "${RED}Błąd podczas instalacji Node.js przez fnm.${NC}"
                SETUP_ERRORS=$((SETUP_ERRORS + 1))
            fi
        else
            echo -e "${RED}Błąd podczas pobierania fnm.${NC}"
            SETUP_ERRORS=$((SETUP_ERRORS + 1))
        fi
    else
        echo -e "${RED}Przerwano. Skrypt wymaga Node.js do dalszego działania.${NC}"
        exit 1
    fi
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js jest zainstalowany ($NODE_VERSION).${NC}"
    if [[ ! "$NODE_VERSION" =~ ^v22\. ]]; then
        echo -e "${YELLOW}⚠️ Zalecana wersja Node.js to 22.x (obecnie masz $NODE_VERSION). Może to powodować problemy.${NC}"
    fi
fi

# 2. Weryfikacja pnpm
echo -e "\n${CYAN}➤ Weryfikacja menedżera pakietów (pnpm)...${NC}"
if command -v pnpm &> /dev/null; (corepack enable pnpm && corepack install) &>/dev/null; then
    PNPM_VER=$(pnpm -v 2>/dev/null || echo "")
    echo -e "${GREEN}✅ pnpm jest gotowy ($PNPM_VER).${NC}"
else
    echo -e "${YELLOW}⚠️ Próba włączenia corepack pnpm...${NC}"
    if corepack enable pnpm && corepack install; then
        echo -e "${GREEN}✅ Corepack pnpm został włączony.${NC}"
    else
        echo -e "${YELLOW}⚠️ Upewnij się, że pnpm jest zainstalowany w systemie.${NC}"
    fi
fi

# 3. Weryfikacja narzedzi dla Desktop (Tauri)
echo -e "\n${CYAN}➤ Weryfikacja wymagań dla aplikacji Desktopowej (Tauri)...${NC}"
HAS_RUST=false
if command -v cargo &> /dev/null; then
    HAS_RUST=true
fi

HAS_SYS_DEPS=false
if [[ "$OSTYPE" == "darwin"* ]]; then
    if xcode-select -p &> /dev/null; then
        HAS_SYS_DEPS=true
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if dpkg -s libwebkit2gtk-4.1-dev &> /dev/null || dpkg -s libwebkit2gtk-4.0-dev &> /dev/null; then
        HAS_SYS_DEPS=true
    fi
fi

if [ "$HAS_RUST" = true ] && [ "$HAS_SYS_DEPS" = true ]; then
    RUST_VER=$(cargo -V)
    echo -e "${GREEN}✅ Narzędzia Desktop (Rust $RUST_VER, biblioteki systemowe) są w pełni obecne.${NC}"
else
    echo -e "${YELLOW}⚠️ Niektóre narzędzia dla Desktop (Rust / biblioteki systemowe) nie są obecne w systemie.${NC}"
    if ask_confirm "Czy chcesz zainstalować brakujący Rust / narzędzia kompilacji dla Desktop (Tauri)?"; then
        if [ "$HAS_RUST" = false ]; then
            echo "Instalacja Rusta..."
            if curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y; then
                if [ -f "$HOME/.cargo/env" ]; then
                    source "$HOME/.cargo/env"
                fi
                echo -e "${GREEN}✅ Rust został pomyślnie zainstalowany.${NC}"
            else
                echo -e "${RED}Błąd instalacji Rusta.${NC}"
                SETUP_ERRORS=$((SETUP_ERRORS + 1))
            fi
        fi

        if [[ "$OSTYPE" == "linux-gnu"* ]] && [ "$HAS_SYS_DEPS" = false ]; then
            if command -v apt-get &> /dev/null; then
                echo "Instalacja zależności WebKit2GTK przez apt-get (sudo)..."
                sudo apt-get update || true
                sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev || true
            fi
        elif [[ "$OSTYPE" == "darwin"* ]] && [ "$HAS_SYS_DEPS" = false ]; then
            xcode-select --install || true
        fi
    else
        echo "Pominięto pobieranie narzędzi Desktop. Środowisko dla Web/API jest w pełni gotowe."
    fi
fi

# 4. Instalacja pakietów NPM
echo -e "\n${CYAN}➤ Instalacja zależności Node...${NC}"
if pnpm install; then
    echo -e "${GREEN}✅ Zależności zostały zainstalowane.${NC}"
else
    echo -e "${YELLOW}⚠️ Błąd podczas 'pnpm install'.${NC}"
    SETUP_ERRORS=$((SETUP_ERRORS + 1))
fi

echo -e "\n${MAGENTA}========================================${NC}"
if [ $SETUP_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Setup został zakończony pomyślnie!${NC}"
else
    echo -e "${YELLOW}⚠️ Setup zakończył się z ostrzeżeniami ($SETUP_ERRORS). Upewnij się, że prześledziłeś logi!${NC}"
fi
echo -e "${CYAN}Aby uruchomić aplikację Web:${NC}"
echo -e "  ./dev web"
echo -e "${CYAN}Aby uruchomić powłokę Desktop (wymaga Rust):${NC}"
echo -e "  ./dev desktop"
echo -e "${MAGENTA}========================================${NC}"

if [ $SETUP_ERRORS -gt 0 ]; then
    exit 1
fi

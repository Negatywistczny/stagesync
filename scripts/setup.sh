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
    response=${response,,} # tolower
    if [[ -z "$response" || "$response" == "t" || "$response" == "y" ]]; then
        return 0
    else
        return 1
    fi
}

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
        SETUP_ERRORS=$((SETUP_ERRORS + 1))
    fi
fi

echo -e "\n${CYAN}➤ Weryfikacja menedżera pakietów (pnpm)...${NC}"
if corepack enable pnpm && corepack install; then
    echo -e "${GREEN}✅ Corepack pnpm został włączony i zsynchronizowany z package.json.${NC}"
else
    echo -e "${YELLOW}⚠️ Nie udało się aktywować corepack. Upewnij się, że używasz Node.js >= 16.9.${NC}"
    SETUP_ERRORS=$((SETUP_ERRORS + 1))
fi

echo -e "\n${CYAN}➤ Weryfikacja wymagań dla aplikacji Desktopowej (Tauri)${NC}"
if ask_confirm "Czy planujesz pracować nad aplikacją Desktop (Tauri)? Wymaga to Rusta i bibliotek systemowych."; then
    if ! command -v cargo &> /dev/null; then
        echo -e "${YELLOW}⚠️ Nie znaleziono kompilatora Rust (cargo).${NC}"
        if ask_confirm "Czy chcesz zainstalować Rust (rustup)?"; then
            echo "Instalacja Rusta..."
            if curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y; then
                echo -e "${CYAN}Odświeżanie zmiennych środowiskowych (PATH) po instalacji Rusta...${NC}"
                if [ -f "$HOME/.cargo/env" ]; then
                    source "$HOME/.cargo/env"
                fi
                if command -v cargo &> /dev/null; then
                    RUST_VERSION=$(cargo -V)
                    echo -e "${GREEN}✅ Rust został pomyślnie zainstalowany ($RUST_VERSION).${NC}"
                else
                    echo -e "${YELLOW}⚠️ Instalacja Rusta powiodła się, ale z jakiegoś powodu nie mogliśmy przeładować PATH. Wymagany restart terminala.${NC}"
                fi
            else
                echo -e "${RED}Błąd instalacji Rusta.${NC}"
                SETUP_ERRORS=$((SETUP_ERRORS + 1))
            fi
        else
            SETUP_ERRORS=$((SETUP_ERRORS + 1))
        fi
    else
        RUST_VERSION=$(cargo -V)
        echo -e "${GREEN}✅ Rust jest zainstalowany ($RUST_VERSION).${NC}"
    fi

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            echo -e "${YELLOW}⚠️ Tauri na Linuksie wymaga zależności systemowych (WebKit2GTK, build-essential itp.).${NC}"
            if ask_confirm "Czy chcesz zainstalować je teraz przez apt-get (wymaga sudo)?"; then
                sudo apt-get update || true
                if ! sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev; then
                    echo -e "${RED}Błąd podczas instalowania zależności przez apt-get.${NC}"
                    SETUP_ERRORS=$((SETUP_ERRORS + 1))
                fi
            else
                SETUP_ERRORS=$((SETUP_ERRORS + 1))
            fi
        else
            echo -e "${YELLOW}⚠️ Zależności (WebKit2GTK, build-essential) muszą być zainstalowane (nie wykryto apt-get). Zobacz: https://v2.tauri.app/start/prerequisites/${NC}"
            SETUP_ERRORS=$((SETUP_ERRORS + 1))
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if ! xcode-select -p &> /dev/null; then
            echo -e "${YELLOW}⚠️ Brak zainstalowanych Xcode Command Line Tools.${NC}"
            if ask_confirm "Czy chcesz zainstalować Xcode Command Line Tools?"; then
                xcode-select --install || true
                echo -e "${YELLOW}⚠️ Instalator Xcode Command Line Tools został uruchomiony. Może on działać asynchronicznie w tle (GUI). Upewnij się, że instalacja się zakończy, zanim zbudujesz aplikację Desktop!${NC}"
            else
                SETUP_ERRORS=$((SETUP_ERRORS + 1))
            fi
        else
            echo -e "${GREEN}✅ Xcode Command Line Tools zainstalowane.${NC}"
        fi
    fi
else
    echo "Pominięto sprawdzanie narzędzi Desktop."
fi

echo -e "\n${CYAN}➤ Instalacja zależności Node...${NC}"
if pnpm install; then
    echo -e "${GREEN}✅ Zależności zostały zainstalowane.${NC}"
else
    echo -e "${YELLOW}⚠️ Błąd podczas 'pnpm install'.${NC}"
    SETUP_ERRORS=$((SETUP_ERRORS + 1))
fi

echo -e "\n${MAGENTA}========================================${NC}"
if [ $SETUP_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Setup został zakończony pomyślnie i bez ostrzeżeń!${NC}"
else
    echo -e "${YELLOW}⚠️ Setup zakończył się z ostrzeżeniami lub błędami ($SETUP_ERRORS). Upewnij się, że prześledziłeś logi!${NC}"
fi
echo -e "${CYAN}Aby uruchomić aplikację Web:${NC}"
echo -e "  pnpm dev"
echo -e "${CYAN}Aby uruchomić powłokę Desktop (wymaga Rust):${NC}"
echo -e "  pnpm --filter @stagesync/desktop dev"
echo -e "${MAGENTA}========================================${NC}"

if [ $SETUP_ERRORS -gt 0 ]; then
    exit 1
fi

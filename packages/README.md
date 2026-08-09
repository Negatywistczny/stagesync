# 🎨 packages/ — Pakiety Współdzielone i Biblioteki Monorepo

Katalog `packages/` grupuje pakiety i moduły deweloperskie, które są współdzielone pomiędzy wieloma aplikacjami w monorepo (np. pomiędzy serwerem, interfejsem webowym a aplikacjami mobilnymi). Pomaga to zachować spójność typów, logiki domenowej oraz systemu wizualnego (Design System).

## 📁 Zawartość drugiego rzędu (Kategorie)

Każdy z poniższych podkatalogów posiada własną konfigurację deweloperską ([`package.json`](../package.json), konfiguracje kompilatora TypeScript i narzędzi testowych):

1. **[`@stagesync/shared`](shared/README.md) (`packages/shared/`)**
   - **Rola:** Czysta logika biznesowa, helpery czasu muzycznego, schematy walidacyjne Zod.
   - **Główna zasada:** Brak jakichkolwiek zależności od przeglądarkowego DOM czy systemu plików Node.js (`no DOM/FS`).

2. **[`@stagesync/ui`](ui/README.md) (`packages/ui/`)**
   - **Rola:** Scentralizowany Design System i zestaw komponentów interfejsu użytkownika.
   - **Główna zasada:** Komponenty bez logiki biznesowej, stylizowane wyłącznie przy użyciu **CSS Modules** oraz zmiennych CSS (tokenów `--ss-*`).

3. **[`eslint-config`](./eslint-config/README.md) (`packages/eslint-config/`)**
   - **Rola:** Współdzielona konfiguracja linterów (ESLint/Prettier) dla całego projektu, wymuszająca spójność stylu pisania kodu.

4. **[`typescript-config`](./typescript-config/) (`packages/typescript-config/`)**
   - **Rola:** Bazowe pliki konfiguracyjne TypeScript ([`base.json`](./typescript-config/base.json)) dla różnych środowisk (aplikacje webowe, biblioteki, środowisko Node.js).

5. **[`android-keystore`](./android-keystore/README.md) (`packages/android-keystore/`)**
   - **Rola:** Stały klucz sideload ([`sideload.keystore`](./android-keystore/sideload.keystore)) dla APK Console / Performer (Releases + lokalny `assembleDebug` / `assembleRelease`).
   - **Główna zasada:** Wspólny certyfikat debug/release sideload — nie klucz Google Play.

## ⚙️ Wykorzystanie w monorepo

Dzięki pnpm workspaces pakiety z tego katalogu są linkowane lokalnie i mogą być importowane w aplikacjach (`apps/`) bez konieczności publikowania ich w rejestrze npm:

```json
"dependencies": {
  "@stagesync/shared": "workspace:*",
  "@stagesync/ui": "workspace:*"
}
```

Taka architektura wspiera zasadę **Single Source of Truth (SSOT)** i gwarantuje, że zmiany w modelach danych lub komponentach UI natychmiast trafiają do wszystkich platform docelowych.

> [📦 StageSync](../README.md)

# 🎨 packages/ — Pakiety Współdzielone i Biblioteki Monorepo

Katalog `packages/` grupuje pakiety i moduły deweloperskie, które są współdzielone pomiędzy wieloma aplikacjami w monorepo (np. pomiędzy serwerem, interfejsem webowym a aplikacjami mobilnymi). Pomaga to zachować spójność typów, logiki domenowej oraz systemu wizualnego (Design System).

## 📁 Pakiety

1. **[`@stagesync/shared`](shared/README.md)** — Czysta logika domenowa, solver czasu muzycznego (ticks/PPQ) i schematy walidacyjne Zod (wymóg `no DOM/FS`).
2. **[`@stagesync/ui`](ui/README.md)** — Scentralizowany Design System i komponenty prezentacyjne stylizowane przy użyciu CSS Modules i tokenów `--ss-*`.
3. **[`eslint-config`](./eslint-config/README.md)** — Współdzielona konfiguracja linterów (ESLint/Prettier) wymuszająca spójność stylu kodowania.
4. **[`typescript-config`](./typescript-config/README.md)** — Bazowe pliki konfiguracyjne TypeScript (`base.json`, `node-library.json`, `react-library.json`).
5. **[`android-keystore`](./android-keystore/README.md)** — Stały certyfikat podpisujący sideload APK Console / Performer dla wydań GitHub Releases.
6. **[`plugins`](./plugins/README.md)** — Wtyczki zewnętrzne integrujące StageSync z zewnętrznym oprogramowaniem muzycznym (np. MuseScore).

## ⚙️ Wykorzystanie w monorepo

Dzięki pnpm workspaces pakiety z tego katalogu są linkowane lokalnie i mogą być importowane w aplikacjach (`apps/`) bez konieczności publikowania ich w rejestrze npm:

```json
"dependencies": {
  "@stagesync/shared": "workspace:*",
  "@stagesync/ui": "workspace:*"
}
```

Taka architektura wspiera zasadę **Single Source of Truth (SSOT)** i gwarantuje, że zmiany w modelach danych lub komponentach UI natychmiast trafiają do wszystkich platform docelowych.

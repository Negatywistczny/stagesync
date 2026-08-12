> [📦 StageSync](../README.md)

# 🛠️ scripts/ — Skrypty Automatyzacji i Narzędzia DX

Katalog `scripts/` grupuje narzędzia deweloperskie, procedury wydań SemVer, skrypty pre-flight, moduły walidacji jakości i pociągi integracyjne monorepo StageSync.

> 📘 **Szukasz instrukcji uruchomienia projektu i pracy deweloperskiej?**  
> Przejdź do dedykowanego przewodnika: **[StageSync DX Guide](../docs/guides/DX.md)**.

## 📁 Moduły i skrypty

1. **[`hub/`](./hub/dev-hub.ts)** — Główny plik wejściowy DX Suite (`dev-hub.ts`) oraz submoduły terminalowe TUI (diagnostyka `doctor`, detekcja sieci LAN `network`, bramki CI `gate`, narzędzia terminalowe `utils`).
2. **[`release/`](./release/cut-release.mjs)** — Procedura wydań SemVer (`cut-release.mjs`), synchronizacja wersji monorepo (`sync-version.mjs`) oraz generatory notatek wydań GitHub.
3. **[`setup/`](./setup/setup.sh)** — Skrypty pre-flight i automatyczne instalatory środowiska dla systemów Windows (`setup.ps1`) oraz Linux/macOS (`setup.sh`).
4. **[`quality/`](./quality/generate-repo-map.mjs)** — Narzędzia walidacji jakości kodu i dokumentacji: generator mapy repozytorium (`generate-repo-map.mjs`), weryfikator linków (`check-docs-links.mjs`) i linter tokenów CSS (`lint-ss-css.mjs`).
5. **[`merge-train/`](./merge-train/run-merge-train.sh)** — Automatyzacja pociągów integracyjnych PR-ów (`merge-train.sh`, `integrate-pr.sh`, `run-merge-train.sh`, `run-train-batch.sh`).

## ⚙️ Główne komendy i wykorzystanie

Skrypty są zintegrowane z głównym [`package.json`](../package.json) oraz launcherami deweloperskimi korzenia:

- `./dev` (lub `pnpm dev:hub`) — uruchamia interaktywny Dev Hub TUI sterujący wszystkimi procesami projektu.
- `pnpm cut-release <patch|minor|major>` — wykonuje pełną procedurę wydania wersji SemVer wraz z aktualizacją changeloga.
- `pnpm sync-version` — synchronizuje wersję z głównego [`package.json`](../package.json) do wszystkich aplikacji i konfiguracji.
- `pnpm generate:map` — odświeża automatyczną mapę repozytorium w [`docs/REPO_MAP.md`](../docs/REPO_MAP.md).
- `pnpm lint:ss-css` — weryfikuje poprawne użycie tokenów Design Systemu (`--ss-*`).
- `node scripts/quality/check-docs-links.mjs` — sprawdza poprawność wszystkich relatywnych odnośników w dokumentacji Markdown.

## 🔗 Powiązane dokumenty

- Przewodnik deweloperski: **[docs/guides/DX.md](../docs/guides/DX.md)**
- Architektura monorepo: **[docs/architecture/ARCHITECTURE.md](../docs/architecture/ARCHITECTURE.md)**
- Standardy i testy: **[docs/standards/README.md](../docs/standards/README.md)**
- Mapa kodu źródłowego: **[docs/REPO_MAP.md](../docs/REPO_MAP.md)**

> [📦 StageSync](../../../README.md) / [apps](../../README.md) / [web](../README.md)

# 🧪 apps/web/e2e — Testy End-to-End (Playwright)

Zestaw scenariuszy testowych end-to-end dla aplikacji webowej (Admin / Timeline / Client) realizowany w przeglądarce przy użyciu **Playwright**.

## 📁 Testy i specyfikacje

- **Forma drag / resize (P0):** [`forma-drag.spec.ts`](./forma-drag.spec.ts)
  - Przepływ: utworzenie seed projektu via `/api/projects` → otwarcie `/timeline/:id` → asercja toru Formy oraz klipów Intro/Countdown → przeciągnięcie klipu i zmiana rozmiaru ramką → weryfikacja pozycji ticków w inspektorze.

## ⚙️ Uruchamianie lokalne

Z korzenia repozytorium (wymaga zbudowania pakietu `@stagesync/shared` dla serwera):

```bash
pnpm --filter @stagesync/shared build
pnpm --filter @stagesync/web test:e2e
```

Pierwsze uruchomienie (lub po aktualizacji Playwright):

```bash
pnpm --filter @stagesync/web exec playwright install chromium
```

Testy wykorzystują odizolowany katalog `STAGESYNC_DATA_DIR` w katalogu tymczasowym systemu. Vite (port `:3000`) automatycznie przekierowuje żądania `/api` do serwera (port `:4000`).

## 🔧 Integracja CI/CD

Zadanie `playwright-smoke` w workflow `.github/workflows/ci.yml`:

- Uruchamiane przy push do `main`, `workflow_dispatch` oraz na PR dotykających kodu web (`apps/web/src/**`, `apps/web/e2e/**`).
- Cache'uje przeglądarkę Playwright Chromium w `~/.cache/ms-playwright`.
- Polecenie wykonawcze: `pnpm --filter @stagesync/web test:e2e`.

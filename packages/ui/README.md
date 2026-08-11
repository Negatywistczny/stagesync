> [📦 StageSync](../../README.md) / [packages](../README.md)

# 🎨 @stagesync/ui — Scentralizowany Design System i Komponenty

Pakiet `@stagesync/ui` to biblioteka graficzna oraz zbiór reużywalnych komponentów UI, stanowiący podstawę wizualną wszystkich widoków webowych w monorepo.

## 📁 Struktura projektu

- **`src/`** — Pliki komponentów React, arkusze stylów CSS Modules oraz pliki definicji tokenów systemowych.
- **[`vitest.setup.ts`](./vitest.setup.ts)** — Konfiguracja środowiska testowego.

## 🎨 Standardy

1. **Brak logiki biznesowej:** Wszystkie komponenty zawarte w tym pakiecie są komponentami prezentacyjnymi (tzw. "głupimi komponentami"). Nie mogą one zawierać specyficznych dla domen referencji ani logiki synchronizacji czasu.
2. **Kategoryczny zakaz Tailwind CSS oraz inline-styles:** Stylizacja opiera się wyłącznie o **CSS Modules** (`*.module.css`). Inline-styles są dozwolone wyłącznie do dynamicznego pozycjonowania (np. playhead w %).
3. **Tokeny `--ss-*` (Strict Spacing):** Wszystkie marginesy, paddingi, kolory i typografia są przypisywane ze zmiennych globalnych zdefiniowanych w [`tokens.css`](../../apps/desktop/launcher/vendor/tokens.css). Standardem jest siatka przestrzenna **4pt/8pt**.
4. **Zamknięte stany kontrolek:** Interfejsy przycisków i kontrolek posiadają dokładnie zdefiniowane stany interakcji: domyślny, hover, focus (zabezpieczony przed ucinaniem ramki focusa poprzez `outline-offset`), active, disabled, loading oraz selected.

## ⚙️ Budowanie i testowanie

- `pnpm test` — uruchamia testy wizualne i integracyjne komponentów z użyciem **Vitest**.
- `pnpm build` — kompiluje zestaw komponentów i stylów do dystrybucji produkcyjnej.

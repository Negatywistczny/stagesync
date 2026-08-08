# 📐 @stagesync/shared — Logika Domenowa i Czysty Czas

Pakiet `@stagesync/shared` (lokalizowany w `packages/shared/`) to fundamentalna biblioteka monorepo grupująca czyste funkcje matematyczne, helpery czasu muzycznego, algorytmy synchronizacji oraz schematy walidacyjne danych wejściowych.

## 🚀 Główne założenia i reguły

1. **Czysty Czas (SSOT):** Wspiera obliczenia na liczbach całkowitych ticks oraz stałej wartości PPQ (*Pulses Per Quarter Note*). Czas BBT (Bars, Beats, Ticks) jest traktowany wyłącznie jako nakładka prezentacyjna (widok), co eliminuje błędy zaokrągleń zmiennoprzecinkowych.
2. **Fail Fast (TypeScript & Zod):** Wszystkie dane wejściowe na krawędziach systemu (odczyt z pliku projektu, komunikacja REST API oraz wiadomości WebSocket) są natychmiastowo walidowane przez schematy **Zod** (np. schemat projektu w formacie v3).
3. **Brak zależności od środowiska (no DOM/FS):** Pakiet musi pozostać całkowicie czysty. Zabrania się stosowania w nim obiektów przeglądarkowych typu `window` czy bibliotek operacji na plikach (jak `fs` z Node.js), co pozwala na bezpieczne importowanie go zarówno w backendzie, jak i w aplikacjach webowych i natywnych aplikacjach mobilnych.

## 📁 Struktura projektu

- **`src/`** — Kod źródłowy biblioteki:
  - Definicje typów, interfejsy transportu czasu, schematy walidacyjne Zod dla projektów, setlist i konfiguracji.
  - Funkcje pomocnicze do przeliczania czasu muzycznego (ticks ↔ milisekundy ↔ BBT).

## ⚙️ Testy i budowanie

Praca z pakietem z poziomu jego katalogu:

- `pnpm test` — uruchamia szybkie testy jednostkowe przy użyciu **Vitest**, gwarantujące poprawne działanie algorytmów czasu muzycznego.
- `pnpm build` — kompiluje bibliotekę i generuje definicje typów (`d.ts`).

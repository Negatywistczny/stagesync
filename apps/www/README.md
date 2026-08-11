> [📦 StageSync](../../README.md) / [apps](../README.md)

# 🌐 apps/www — Publiczna Strona Internetowa i Aktualności

Aplikacja `apps/www` to oficjalny portal informacyjny projektu StageSync, zrealizowany jako statyczna strona przy użyciu technologii **Vite + HTML/TypeScript**.

## 📁 Struktura projektu

- **`src/`** — Kod źródłowy portalu i komponentów informacyjnych.
- **`public/`** — Grafiki, multimedia i ikony powiązane ze stroną marketingową.
- **`aktualnosci/`** — Sekcja blogowa, ogłoszenia o nowych wydaniach oraz aktualizacje statusu rozwoju systemu StageSync (linie wersji).

## 🚀 Główne funkcjonalności

1. **Prezentacja produktu:** Opis możliwości transportu SSOT, cyfrowych partytur OSMD, automatyzacji MIDI oraz integracji z tabletami (Performer / Console).
2. **Dokumentacja dla użytkownika:** Szybkie odnośniki do instrukcji instalacji i plików instalacyjnych `.msi`, `.dmg` czy `.apk`.
3. **Komunikacja:** Publikacja aktualności i planu rozwoju (Roadmap) w przyjaznej, czytelnej dla muzyków i realizatorów formie.

## ⚙️ Budowanie i testowanie

- `pnpm dev` — uruchamia lokalny serwer deweloperski portalu.
- `pnpm build` — kompiluje produkcyjną, zoptymalizowaną wersję statyczną strony gotową do wdrożenia na serwerze WWW lub CDN.

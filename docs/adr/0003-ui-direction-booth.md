# ADR 0003 — Kierunek wizualny UI (Booth)

- **Status:** Zaakceptowany
- **Data:** 2026-07-19

## Kontekst

Przy wprowadzaniu prawdziwych shelli UI w v5 (Admin / Client / Timeline w `apps/web` lub osobnych entry) potrzebny jest ustalony kierunek wizualny, żeby nie wracać do organicznego UI 4.x ani nie wymyślać layoutu od zera. W legacy powstał harness **UI Lab** z sześcioma propozycjami (A–F).

## Decyzja

Docelowy wygląd i układ paneli **wzorujemy na propozycji A — Booth** (`a-booth`):

- **DNA:** ink / teal („booth steel”)
- **Admin:** left rail sekcji, lista utworów, panel szczegółów, Live Desk
- **Client:** welcome → wybór roli → stage-first HUD, drawer ustawień
- **Timeline:** tool strip, tracki + clipy, inspector, overlay help

**Źródło (legacy, tylko mock — bez API/MIDI):**

- Repo: [STAGESYNC-APP-LEGACY](https://github.com/Negatywistczny/STAGESYNC-APP-LEGACY)
- Ścieżka: `tests/harnesses/ui-lab/proposals/a-booth/`
- Gallery / opis lab: `tests/harnesses/ui-lab/README.md`
- Screenshoty: `tests/harnesses/ui-lab/proposals/a-booth/shots/`

Booth to **kierunek layoutu i klimatu**, nie pixel-perfect kopiowanie CSS labu. Tokeny v5 (`--ss-*` w `@stagesync/ui`) i konstytucja (7 stanów Button, bez HEX) nadal obowiązują; Booth mapujemy na te tokeny przy implementacji.

## Konsekwencje

- Przy pierwszym większym UI (nie showcase Button) odnieść się do tego ADR i otworzyć mocki Booth z LEGACY.
- Inne propozycje lab (Signal, Folio, Rack, Canon, Orbit) **nie** są kierunkiem produktu — najwyżej inspiracja szczegółów.
- Nie kopiujemy całego `ui-lab` do v5, dopóki nie potrzeba żywego harnessu w tym repo (ew. później `tests/harnesses/`).

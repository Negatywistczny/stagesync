# ADR 0003 — Kierunek wizualny UI

- **Status:** Zaakceptowany (zaktualizowany)
- **Data:** 2026-07-19
- **Aktualizacja:** 2026-07-19 — domyślna paleta **black / amber** (jak v4); layout nowy; inventarz = parity v4

## Kontekst

Przy shellach v5 potrzebny jest spójny klimat wizualny i jasna reguła: redesign layoutu ≠ ucinanie kontrolek. Eksperyment Booth (ink/teal) nie jest domyślną marką produktu.

## Decyzja

1. **Paleta domyślna = black / amber** — tokeny `--ss-*` jak w v4 (`#000` / zinc surfaces / `#fbbf24`). Motywy light / high-contrast później przez `data-theme`.
2. **Layout paneli = nowy** — świadomie zaprojektowany w v5 (nie 1:1 HTML 4.x, nie left-rail labu). Opis: implementacja shelli + [ui-shell-inventory.md](../ui-shell-inventory.md).
3. **Inventarz kontrolek = parity v4** — jeśli użytkownik mógł kliknąć X w 4.x, w shellu v5 musi być kontrolka; `disabled` / overlay bez API OK. Usunięcie tylko jako **świadoma delta** (np. git-apply → [ADR 0004](./0004-updates-docker.md)).
4. **Model na Timeline:** 1 akord = 1 clip; **Countdown** widoczny na Formie; **Audio 0…N**.
5. **Style shelli:** tylko `*.module.css` + `--ss-*`.
6. Checklisty: [docs/ui-shell-inventory.md](../ui-shell-inventory.md).

## Konsekwencje

- Przy review UI: najpierw inventarz, potem estetyka layoutu.
- `TransportProvider` (WS + soft-clock rAF) poza redesignem chrome.
- Alternatywne skiny (np. Booth) tylko jako przyszły motyw, nie jako `:root` domyślny.

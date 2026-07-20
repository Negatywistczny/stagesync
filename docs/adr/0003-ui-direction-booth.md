# ADR 0003 — Kierunek wizualny UI

- **Status:** Zaakceptowany (zaktualizowany)
- **Data:** 2026-07-19
- **Aktualizacja:** 2026-07-20 — parity = zachowanie ([ADR 0011](./0011-ui-parity-behavior.md));
  inventarz wtórny; zakaz clone chrome v4

## Kontekst

Przy shellach v5 potrzebny jest spójny klimat wizualny. Eksperyment Booth (ink/teal)
nie jest domyślną marką produktu. Wczesna reguła „inventarz = parity v4” doprowadziła
do odhaczania kontrolek i klonowania paska narzędzi zamiast przywracania gestów —
to **błąd procesu**; korekta w [ADR 0011](./0011-ui-parity-behavior.md).

## Decyzja

1. **Paleta domyślna = black / amber** — tokeny `--ss-*` (`#000` / zinc / `#fbbf24`
   tylko w `tokens.css`). Motywy light / high-contrast przez `data-theme`.
2. **Layout paneli = nowy** — zaprojektowany w v5 (nie 1:1 HTML 4.x). Gęstość i
   rytm mają **konkurować z v4 w użyciu**, nie w klonie markup.
3. **Parity funkcji = zachowanie v4** — gesty Timeline / treść Client / sensowna
   IA Admin. Szczegóły i zakazy: [ADR 0011](./0011-ui-parity-behavior.md).
4. **Inventarz** ([ui-shell-inventory.md](../ui-shell-inventory.md)) = checklista
   **wtórna** (po smoke), nie sterownik review. `disabled` bez planu zachowania = dług.
5. **Model na Timeline:** 1 akord = 1 clip; **Countdown** widoczny; **Audio 0…N**
   (playback → β2).
6. **Style shelli:** tylko `*.module.css` + `--ss-*` + `@stagesync/ui`.
   **Zakaz** kopiowania chrome / gotowców z legacy.

## Konsekwencje

- Review UI: **gest / workflow → tokeny / gęstość → inventarz** (nie odwrotnie).
- `TransportProvider` poza redesignem chrome.
- Alternatywne skiny (Booth) tylko jako przyszły motyw `data-theme`.

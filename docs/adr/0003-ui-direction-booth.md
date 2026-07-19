# ADR 0003 — Kierunek wizualny UI (Booth)

- **Status:** Zaakceptowany (zaktualizowany)
- **Data:** 2026-07-19
- **Aktualizacja:** 2026-07-19 — Booth = skin; **layout nowy**; **inventarz kontrolek = parity v4**

## Kontekst

Przy shellach v5 (Admin / Client / Timeline) potrzebny jest klimat wizualny bez powrotu do organicznego amber 4.x. Lab Booth (`a-booth`) jest referencją **koloru / klimatu**, nie mapą paneli.

Błędy wcześniejszych szkiców: (1) kalka layoutu labu; (2) „placeholdery” przez **usuwanie** kontrolek v4 (np. wand, Pomoc). Redesign layoutu ≠ ucinanie powierzchni funkcji.

## Decyzja

1. **Booth = DNA wizualne** — ink / teal na tokenach `--ss-*`. Lab nie dyktuje IA paneli.
2. **Layout paneli = nowy** — świadomie zaprojektowany w v5 (nie 1:1 HTML 4.x, nie left-rail labu). Opis regionów: implementacja shelli + [ui-shell-inventory.md](../ui-shell-inventory.md).
3. **Inventarz kontrolek = parity v4** — jeśli użytkownik mógł kliknąć X w 4.x, w shellu v5 musi być kontrolka (ikona + etykieta/`aria-label`); `disabled` / overlay bez API OK. Usunięcie tylko jako **świadoma delta** (np. git-apply → [ADR 0004](./0004-updates-docker.md)).
4. **Model na Timeline:** 1 akord = 1 clip; **Countdown** widoczny na Formie; **Audio 0…N**.
5. **Style shelli:** tylko `*.module.css` + `--ss-*`.
6. Checklisty: [docs/ui-shell-inventory.md](../ui-shell-inventory.md).

## Konsekwencje

- Przy review UI: najpierw inventarz (czy jest wand / Pomoc / …), potem estetyka layoutu.
- `TransportProvider` (WS + soft-clock rAF) poza redesignem chrome.
- Motywy później: te same `--ss-*` pod `data-theme`.

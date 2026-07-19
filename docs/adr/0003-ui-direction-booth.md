# ADR 0003 — Kierunek wizualny UI (Booth)

- **Status:** Zaakceptowany (zaktualizowany)
- **Data:** 2026-07-19
- **Aktualizacja:** 2026-07-19 — Booth = skin/tokeny; IA = parity v4 (+ Audio 0…N)

## Kontekst

Przy wprowadzaniu shelli UI w v5 (Admin / Client / Timeline) potrzebny jest ustalony **kierunek wizualny**, żeby nie wracać do organicznego amber/zinc 4.x ani nie wymyślać klimatu od zera. W legacy powstał harness **UI Lab** z propozycją A — Booth (`a-booth`).

Pierwszy szkic shelli skopiował **układ paneli** z labu (left rail, Live Desk labowy, mock tracki). To było błędne względem intencji produktu: Booth ma być **skórką**, a informacja / funkcje — jak w v4 (z uwzględnieniem nowości v5).

## Decyzja

1. **Booth = DNA wizualne** — ink / teal („booth steel”), mapowane wyłącznie na tokeny `--ss-*` w `@stagesync/ui`. Lab (`a-booth`) to referencja **klimatu**, nie mapa IA.
2. **IA shelli = parity funkcji v4** — jeśli informacja lub akcja była w Admin / Client / Timeline 4.x, ma mieć region w v5, chyba że świadomie usunięta (np. git-apply → [ADR 0004](./0004-updates-docker.md)).
3. **Nowości v5 w IA od razu:** ścieżki **Audio 0…N** w Timeline (jak DAW; brak audio = OK); storage `projects/<id>/` (assety przy projekcie).
4. **Layout Admina** może być przebudowany względem 4.x (nie kopiować collapsible 1:1 ani labu) — byle pokrywał checklistę funkcji.
5. **Style shelli:** tylko `*.module.css` + `--ss-*`; bez globalnych reguł layoutu (`div` / `section` / `h1` poza resetem w `index.css`).
6. Lab (Signal, Folio, Rack, Canon, Orbit) **nie** jest kierunkiem produktu.

**Źródło klimatu (legacy, tylko mock):**

- Repo: [STAGESYNC-APP-LEGACY](https://github.com/Negatywistczny/STAGESYNC-APP-LEGACY)
- Ścieżka: `tests/harnesses/ui-lab/proposals/a-booth/`

## Konsekwencje

- Implementacja shelli odnosi się do **dokumentacji v4** (regiony funkcji) + tokenów Booth — nie do HTML labu jako szablonu layoutu.
- `TransportProvider` / soft-clock (WS + rAF) żyje ponad routerem i **nie** jest przedmiotem redesignu IA.
- Motywy light/dark później nadpisują te same `--ss-*` (`data-theme`); shelle bez HEX.

# inspiracje/

Zewnętrzne / eksperymentalne audyty i notatki (Gemini Deep Search, Claude, GPT itd.) — **hipotezy**, nie SSOT produktu.

| Typ | Plik | Git | Rola |
|-----|------|-----|------|
| Surowy raport | `*.md` (bez `.triage`) | tak | Dump z narzędzia (zachowaj provenance) |
| Triage PO/eng | `*.triage.md` | tak | Ocena + **status dokumentu** + priorytet weryfikacji |

## Status dokumentu (kanoniczny — tylko te wartości)

Jedno pole w triage: `**Status:** \`…\`` — **wyłącznie** token z tabeli (bez synonimów).

| Status | Znaczenie | Kiedy ustawić | Wolno → TODO / issue? |
|--------|-----------|---------------|------------------------|
| `open` | Triage jest; hipotezy **nie** rozstrzygnięte w repo | Domyślnie dla nowego audytu silnika / referencji | **Nie** (najpierw repro) |
| `in-progress` | Trwa weryfikacja (testy / grepy / PO smoke) | Eng wziął raport na stół | Nie, dopóki brak `confirmed` |
| `partial` | Część ID: `confirmed` / `rejected` / `limit`; reszta otwarta | Po pierwszej fali testów | Tylko wiersze `confirmed` |
| `closed` | Wszystkie **priorytetowe** ID rozstrzygnięte | Backlog z raportu domknięty lub świadomie odłożony | Tak — przez wcześniejsze `confirmed` |
| `archive` | Provenance / historia; **nie** backlog implementacji | Bootstrap, eseje wchłonięte w ADR/konstytucję | **Nie** |
| `superseded` | Zastąpiony nowszym dumpem albo `reports/report-*.md` | Po syntezie kanonicznej | Nie (patrz następca) |

### Zakazane / legacy (nie używać)

| Stary token | Zamiana |
|-------------|---------|
| `unverified` | → `open` |
| `historical-bootstrap` | → `archive` |
| `done`, `verified`, `green` | → rozbij na status dokumentu + statusy wierszy |

### Status wiersza hipotezy (w tabeli priorytetów)

Opcjonalna kolumna **Stan** (lub aktualizacja Impact):

| Stan | Znaczenie |
|------|-----------|
| `hypothesis` | Z dumpu; brak repro (domyślne przy `open`) |
| `confirmed` | Repro lub czerwony test w monorepo |
| `rejected` | Obalone (zielony test / błędna lektura kodu) |
| `limit` | Świadomy limit produktu (ADR / TODO 5.2+), nie bug |
| `fixed` | Potwierdzone + naprawione + test (link commit/PR) |

Przepływ wiersza: `hypothesis` → (`confirmed` → `fixed`) | `rejected` | `limit`.

Przepływ dokumentu:

```text
open → in-progress → partial → closed
                 ↘ archive (tylko jeśli okazało się czystą historią)
open/partial/closed → superseded (gdy powstanie reports/report-…)
```

## Kategorie katalogów

| Katalog | Po co | Typowy status dokumentu |
|---------|--------|-------------------------|
| [`audyty-silnik/`](./audyty-silnik/) | Audyty kodu: audio, WebAudio, mixer, transport, MIDI, setlista/race, Client sync, Desktop/Tauri | `open` → … |
| [`referencje-daw/`](./referencje-daw/) | Spec zachowań DAW / show-tools / Client charts vs ADR | `open` → … |
| [`spec-5.2+/`](./spec-5.2+/) | Specyfikacje wprowadzenia feature linii **5.2+** (motywy/auth, mobile, sampler, Safety Net, MIDI PC, mixer HW) — hipotezy / design, nie claim Done | `open` → … |
| [`www/`](./www/) | Audyt / strategia witryny marketingowej `apps/www` | `closed` |
| [`testy-pokrycie/`](./testy-pokrycie/) | Plany uzupełnienia testów Vitest (luki coverage, mocki, priorytety P0–P2) — **nie** zastępują audytów bugów w `audyty-silnik/` | `partial` |

## Zasady

1. **Nie** linkuj inspiracji z CHANGELOG / claimów „Done”.
2. Do `TODO.md` / issue tylko hipotezy ze stanem **`confirmed`** (nie cały dump).
3. Workflow: dump → triage (`open` lub `archive`) → weryfikacja → `partial`/`closed` → opcjonalnie `reports/report-<temat>.md` (`superseded`).
4. Nazwy plików: ASCII (`Sciezek` nie `Ścieżek`).
5. Ocena w `*.triage.md`, nie w środku dumpa.
6. Nowe pliki od razu do kategorii; status z tabeli kanonicznej.
7. Indeks poniżej: kolumna Status = **dokładnie** token dokumentu.

### Szablon nagłówka triage

```markdown
# Triage: <tytuł>

**Źródło:** [<dump>.md](./<dump>.md)
**Status:** `open`
**Obszar:** …
**Data triage:** RRRR-MM-DD
```

## Indeks

### audyty-silnik/

| Raport | Źródło | Triage | Status |
|--------|--------|--------|--------|
| [Audyt-Architektury-StageSync-v5.md](./audyty-silnik/Audyt-Architektury-StageSync-v5.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-Architektury-StageSync-v5.triage.md) | `closed` |
| [Audyt-Edytora-Sciezek-Audio.md](./audyty-silnik/Audyt-Edytora-Sciezek-Audio.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-Edytora-Sciezek-Audio.triage.md) | `closed` |
| [Audyt-Lifecycle-StageSync-v5-Desktop.md](./audyty-silnik/Audyt-Lifecycle-StageSync-v5-Desktop.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-Lifecycle-StageSync-v5-Desktop.triage.md) | `partial` |
| [Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md](./audyty-silnik/Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md) | `closed` |
| [Audyt-Routingu-Miksera-StageSync.md](./audyty-silnik/Audyt-Routingu-Miksera-StageSync.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-Routingu-Miksera-StageSync.triage.md) | `closed` |
| [Audyt-Silnika-Odtwarzania-Audio-WebAudio.md](./audyty-silnik/Audyt-Silnika-Odtwarzania-Audio-WebAudio.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md) | `closed` |
| [Audyt-StageSync-v5-Race-Conditions.md](./audyty-silnik/Audyt-StageSync-v5-Race-Conditions.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-StageSync-v5-Race-Conditions.triage.md) | `partial` |
| [Audyt-Synchronizacji-Transport-SSOT.md](./audyty-silnik/Audyt-Synchronizacji-Transport-SSOT.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-Synchronizacji-Transport-SSOT.triage.md) | `partial` |

### referencje-daw/

| Raport | Źródło | Triage | Status |
|--------|--------|--------|--------|
| [Logika-Edycji-Klipow-Logic-Pro.md](./referencje-daw/Logika-Edycji-Klipow-Logic-Pro.md) | Deep Search / Logic Pro | [triage](./referencje-daw/Logika-Edycji-Klipow-Logic-Pro.triage.md) | `archive` |
| [Referencja-Zachowan-Live-MIDI.md](./referencje-daw/Referencja-Zachowan-Live-MIDI.md) | Gemini Deep Search | [triage](./referencje-daw/Referencja-Zachowan-Live-MIDI.triage.md) | `partial` |
| [Specyfikacja-Referencji-Zachowan-Wyswietlania.md](./referencje-daw/Specyfikacja-Referencji-Zachowan-Wyswietlania.md) | Gemini Deep Search | [triage](./referencje-daw/Specyfikacja-Referencji-Zachowan-Wyswietlania.triage.md) | `partial` |
| [UXLogika-Show-Tools-Referencja-Zachowan.md](./referencje-daw/UXLogika-Show-Tools-Referencja-Zachowan.md) | Gemini Deep Search | [triage](./referencje-daw/UXLogika-Show-Tools-Referencja-Zachowan.triage.md) | `partial` |

### spec-5.2+/

Specyfikacje intro feature linii **5.2** (Pocket Stage) i residual **5.2+** — companion do [TODO 5.2+](../../TODO.md) / [ROADMAP § 5.2.0 / Po 5.2.0](../../ROADMAP.md). **Nie** SSOT; **nie** CHANGELOG. MVP PIN / Safety Net manual / Sampler / bus→bus / Performer·Console / MIDI PC — **wydane w `5.2.0`**; residual w triage + TODO. MIDI/mixer: cross-link do istniejących audytów / referencji DAW (nie drugi backlog bugów).

| Raport | Źródło | Triage | Status |
|--------|--------|--------|--------|
| [Specyfikacja-Motywow-i-Autentykacji-DAW.md](./spec-5.2+/Specyfikacja-Motywow-i-Autentykacji-DAW.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Specyfikacja-Motywow-i-Autentykacji-DAW.triage.md) | `partial` |
| [MotywyAuth-Bezpieczenstwo-UX-Decyzje.md](./spec-5.2+/MotywyAuth-Bezpieczenstwo-UX-Decyzje.md) | Gemini / AI Exporter | [triage](./spec-5.2+/MotywyAuth-Bezpieczenstwo-UX-Decyzje.triage.md) | `partial` |
| [Specyfikacja-Klienta-Mobile-StageSync-v5.2+.md](./spec-5.2+/Specyfikacja-Klienta-Mobile-StageSync-v5.2+.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Specyfikacja-Klienta-Mobile-StageSync-v5.2+.triage.md) | `partial` |
| [Krytyka-strategii-Mobile-for-Live.md](./spec-5.2+/Krytyka-strategii-Mobile-for-Live.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Krytyka-strategii-Mobile-for-Live.triage.md) | `partial` |
| [Specyfikacja-StageSync-Cues-Sampler.md](./spec-5.2+/Specyfikacja-StageSync-Cues-Sampler.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Specyfikacja-StageSync-Cues-Sampler.triage.md) | `closed` |
| [Ocena-decyzji-Sampler-Cue.md](./spec-5.2+/Ocena-decyzji-Sampler-Cue.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Ocena-decyzji-Sampler-Cue.triage.md) | `partial` |
| [Safety-Net-dla-StageSync-v5.2.md](./spec-5.2+/Safety-Net-dla-StageSync-v5.2.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Safety-Net-dla-StageSync-v5.2.triage.md) | `partial` |
| [Ocena-Safety-Net-StageSync-437.md](./spec-5.2+/Ocena-Safety-Net-StageSync-437.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Ocena-Safety-Net-StageSync-437.triage.md) | `partial` |
| [Ocena-Decyzji-Produktowych-StageSync.md](./spec-5.2+/Ocena-Decyzji-Produktowych-StageSync.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Ocena-Decyzji-Produktowych-StageSync.triage.md) | `partial` |
| [Ocena-Decyzji-Produktowych-StageSync-v1.md](./spec-5.2+/Ocena-Decyzji-Produktowych-StageSync-v1.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Ocena-Decyzji-Produktowych-StageSync-v1.triage.md) | `open` |
| [Recenzja-Decyzji-Live-FOH-Audio.md](./spec-5.2+/Recenzja-Decyzji-Live-FOH-Audio.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Recenzja-Decyzji-Live-FOH-Audio.triage.md) | `partial` |
| [Ocena-Strategii-Produktu-StageSync-v5.md](./spec-5.2+/Ocena-Strategii-Produktu-StageSync-v5.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Ocena-Strategii-Produktu-StageSync-v5.triage.md) | `open` |
| [StageSync-v5.2+-MIDI-PC-Referencja.md](./spec-5.2+/StageSync-v5.2+-MIDI-PC-Referencja.md) | Gemini / AI Exporter | [triage](./spec-5.2+/StageSync-v5.2+-MIDI-PC-Referencja.triage.md) | `closed` |
| [Specyfikacja-StageSync-dla-miksera-DAW.md](./spec-5.2+/Specyfikacja-StageSync-dla-miksera-DAW.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Specyfikacja-StageSync-dla-miksera-DAW.triage.md) | `partial` |
| [Architektura-Ingestii-Danych-Muzycznych-StageSync.md](./spec-5.2+/Architektura-Ingestii-Danych-Muzycznych-StageSync.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Architektura-Ingestii-Danych-Muzycznych-StageSync.triage.md) | `open` |
| [Dynamic-Tempo-Mapping-Technical-Blueprint.md](./spec-5.2+/Dynamic-Tempo-Mapping-Technical-Blueprint.md) | Gemini / AI Exporter | [triage](./spec-5.2+/Dynamic-Tempo-Mapping-Technical-Blueprint.triage.md) | `partial` |
| [Implementacja-Smart-Tempo-w-Antigravity.md](./spec-5.2+/Implementacja-Smart-Tempo-w-Antigravity.md) | Gemini / Antigravity / AI Exporter | [triage](./spec-5.2+/Implementacja-Smart-Tempo-w-Antigravity.triage.md) | `partial` |

### www/

Witryna marketingowa **`apps/www`** (SEO, download hub, copy Pocket Stage). Nie SSOT produktu scenicznego; nie CHANGELOG.

| Raport | Źródło | Triage | Status |
|--------|--------|--------|--------|
| [Audyt-i-propozycje-dla-StageSync.md](./www/Audyt-i-propozycje-dla-StageSync.md) | Gemini / AI Exporter | [triage](./www/Audyt-i-propozycje-dla-StageSync.triage.md) | `closed` |

### testy-pokrycie/

Plany testów (Gemini Deep Search, 2026-07-27). Epic coverage (2026-07-27): **4× `closed`**, **7× `partial`** — patrz coverage w `*.triage.md`.

| Raport | Moduł | Triage | Status |
|--------|-------|--------|--------|
| [Analiza-Walidacji-Zod-Schema.md](./testy-pokrycie/Analiza-Walidacji-Zod-Schema.md) | `packages/shared` `schema.ts` | [triage](./testy-pokrycie/Analiza-Walidacji-Zod-Schema.triage.md) | `closed` |
| [Analiza-Testow-System-Routes.md](./testy-pokrycie/Analiza-Testow-System-Routes.md) | `apps/server` `routes/system.ts` | [triage](./testy-pokrycie/Analiza-Testow-System-Routes.triage.md) | `closed` |
| [Testy-WebSocket-Server.md](./testy-pokrycie/Testy-WebSocket-Server.md) | `apps/server` `transport/ws.ts` | [triage](./testy-pokrycie/Testy-WebSocket-Server.triage.md) | `partial` |
| [Analiza-Testow-API-Assets.md](./testy-pokrycie/Analiza-Testow-API-Assets.md) | `apps/server` `routes/assets.ts` | [triage](./testy-pokrycie/Analiza-Testow-API-Assets.triage.md) | `partial` |
| [Analiza-Testow-MIDI-Host.md](./testy-pokrycie/Analiza-Testow-MIDI-Host.md) | `apps/server` `midi/host.ts` | [triage](./testy-pokrycie/Analiza-Testow-MIDI-Host.triage.md) | `partial` |
| [Testy-UG-Fetch.md](./testy-pokrycie/Testy-UG-Fetch.md) | `apps/server` `ug/ug-fetch.ts` | [triage](./testy-pokrycie/Testy-UG-Fetch.triage.md) | `partial` |
| [Testowanie-Vitest-AudioPlayback.md](./testy-pokrycie/Testowanie-Vitest-AudioPlayback.md) | `apps/web` `audioPlayback.ts` | [triage](./testy-pokrycie/Testowanie-Vitest-AudioPlayback.triage.md) | `partial` |
| [Analiza-Pokrycia-Audio-Lane-Edit.md](./testy-pokrycie/Analiza-Pokrycia-Audio-Lane-Edit.md) | `apps/web` `audioLaneEdit.ts` | [triage](./testy-pokrycie/Analiza-Pokrycia-Audio-Lane-Edit.triage.md) | `partial` |
| [Testy-Desktop-File-Menu.md](./testy-pokrycie/Testy-Desktop-File-Menu.md) | `apps/web` `desktopFileMenu.ts` | [triage](./testy-pokrycie/Testy-Desktop-File-Menu.triage.md) | `closed` |
| [Analiza-Importu-ChordProUG.md](./testy-pokrycie/Analiza-Importu-ChordProUG.md) | `packages/shared` `ug-import.ts` | [triage](./testy-pokrycie/Analiza-Importu-ChordProUG.triage.md) | `partial` |
| [Analiza-Luki-Testow-Wand.md](./testy-pokrycie/Analiza-Luki-Testow-Wand.md) | `packages/shared` `wand.ts` | [triage](./testy-pokrycie/Analiza-Luki-Testow-Wand.triage.md) | `closed` |

**Residual (partial):** `assets.ts` stream po `headersSent`, `routes/import.ts` UG errors, `audioPlayback` helper matrix, opcjonalne macierze MIDI/ug-import/audio lane.

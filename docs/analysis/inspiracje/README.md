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
| [`historia-bootstrap/`](./historia-bootstrap/) | Dlaczego V5 / konstytucja / monorepo | `archive` |
| [`audyty-silnik/`](./audyty-silnik/) | Audyty kodu: audio, WebAudio, mixer, transport, MIDI | `open` → … |
| [`referencje-daw/`](./referencje-daw/) | Spec zachowań DAW vs ADR | `open` → … |
| [`ui/`](./ui/) | Gęstość / kontrast vs `ui-density` / `@stagesync/ui` | `open` → … |

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

### historia-bootstrap/

Wszystkie dumpy poniżej = **`archive`** (provenance bootstrapa v5). Nie TODO / nie CHANGELOG.
Konflikt z ADR / konstytucją / CONTRIBUTING → **wygrywa SSOT repo**.

| Raport | Źródło | Triage | Status |
|--------|--------|--------|--------|
| [Architektura-Oprogramowania-i-Ortogonalnosc.md](./historia-bootstrap/Architektura-Oprogramowania-i-Ortogonalnosc.md) | Deep Search / esej | [triage](./historia-bootstrap/Architektura-Oprogramowania-i-Ortogonalnosc.triage.md) | `archive` |
| [Claude-Struktura-Repo.md](./historia-bootstrap/Claude-Struktura-Repo.md) | Claude | [triage](./historia-bootstrap/Claude-Struktura-Repo.triage.md) | `archive` |
| [Gemini-Diagnoza-V4-Fundamenty-V5.md](./historia-bootstrap/Gemini-Diagnoza-V4-Fundamenty-V5.md) | Gemini | [triage](./historia-bootstrap/Gemini-Diagnoza-V4-Fundamenty-V5.triage.md) | `archive` |
| [Gemini-Plan-Wdrozenia-Monorepo-V5.md](./historia-bootstrap/Gemini-Plan-Wdrozenia-Monorepo-V5.md) | Gemini | [triage](./historia-bootstrap/Gemini-Plan-Wdrozenia-Monorepo-V5.triage.md) | `archive` |
| [GPT-Konstytucja-Projektu.md](./historia-bootstrap/GPT-Konstytucja-Projektu.md) | GPT | [triage](./historia-bootstrap/GPT-Konstytucja-Projektu.triage.md) | `archive` |
| [GPT-Project-Standard.md](./historia-bootstrap/GPT-Project-Standard.md) | GPT | [triage](./historia-bootstrap/GPT-Project-Standard.triage.md) | `archive` |
| [Struktura-Projektu-Aplikacji-Webowej.md](./historia-bootstrap/Struktura-Projektu-Aplikacji-Webowej.md) | Deep Search / esej | [triage](./historia-bootstrap/Struktura-Projektu-Aplikacji-Webowej.triage.md) | `archive` |

### audyty-silnik/

| Raport | Źródło | Triage | Status |
|--------|--------|--------|--------|
| [Audyt-Edytora-Sciezek-Audio.md](./audyty-silnik/Audyt-Edytora-Sciezek-Audio.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-Edytora-Sciezek-Audio.triage.md) | `closed` |
| [Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md](./audyty-silnik/Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md) | `partial` |
| [Audyt-Routingu-Miksera-StageSync.md](./audyty-silnik/Audyt-Routingu-Miksera-StageSync.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-Routingu-Miksera-StageSync.triage.md) | `partial` |
| [Audyt-Silnika-Odtwarzania-Audio-WebAudio.md](./audyty-silnik/Audyt-Silnika-Odtwarzania-Audio-WebAudio.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md) | `open` |
| [Audyt-Synchronizacji-Transport-SSOT.md](./audyty-silnik/Audyt-Synchronizacji-Transport-SSOT.md) | Gemini Deep Search | [triage](./audyty-silnik/Audyt-Synchronizacji-Transport-SSOT.triage.md) | `open` |

### referencje-daw/

| Raport | Źródło | Triage | Status |
|--------|--------|--------|--------|
| [Logika-Edycji-Klipow-Logic-Pro.md](./referencje-daw/Logika-Edycji-Klipow-Logic-Pro.md) | Deep Search / Logic Pro | [triage](./referencje-daw/Logika-Edycji-Klipow-Logic-Pro.triage.md) | `archive` |

### ui/

| Raport | Źródło | Triage | Status |
|--------|--------|--------|--------|
| [Reguly-UI-dla-Cursor-V5.md](./ui/Reguly-UI-dla-Cursor-V5.md) | Deep Search / UI | [triage](./ui/Reguly-UI-dla-Cursor-V5.triage.md) | `archive` |

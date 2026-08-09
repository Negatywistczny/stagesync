# ADR 0019 — Dual Engine: Studio vs Live (6.0+)

- **Status:** Zaakceptowany
- **Data:** 2026-08-09
- **Etap:** kierunek `6.0+` (nie scope linii 5.x); Dual Engine = must major **6.0**
- **Uzupełnia:** [ADR 0017](./0017-live-show-control-contracts.md) (PIN §8), [ADR 0018](./0018-future-audio-architecture.md) (audio / Plugin Host / Freeze), [ADR 0010](./0010-desktop-shell-tauri.md) (shell / sidecary)
- **Nie narusza:** [ADR 0002](./0002-timebase-ssot.md), [ADR 0005](./0005-domain-axioms.md) (Granica 0)

## Kontekst

Linia **5.x** = Playback & Show Control bez trybu Studio/Live. ROADMAP i dump strategiczny zapowiadały **Dual Engine** w **6.0** (pancerna Scena vs produkcyjne Studio), ale żaden ADR nie definiował kontraktu trybów, gate’ów przejścia ani relacji do Zero-Crash / VST.

Ten ADR jest **SSOT trybów Studio vs Live**. Audio, Plugin Host i „prosta edycja” = [ADR 0018](./0018-future-audio-architecture.md). Narracja źródłowa (nie SSOT): [analiza-produktowo-wdrozeniowa-stagesync-roadmap.md](../analysis/inspiracje/specyfikacje/analiza-produktowo-wdrozeniowa-stagesync-roadmap.md).

## Decyzja

### 0. Zakres obowiązywania

| Linia    | Obowiązywanie                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------- |
| **5.x**  | Dual Engine **OUT** — brak trybu Studio/Live, brak Plugin Host, brak Freeze gate.                    |
| **6.0+** | Ten ADR = SSOT Dual Engine. Implementacja dopiero po `report-scope-6.0` + akceptacji PO przed kodem. |

### 1. Dwa tryby (twarde)

Dokładnie dwa tryby wykonawcze:

| Tryb       | Rola                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Studio** | Produkcja / edycja: Timeline, Mixer, rejestracja + proste edit ([ADR 0018](./0018-future-audio-architecture.md) §5), opcjonalny Plugin Host |
| **Live**   | Pancerna scena: odtwarzanie i sterowanie widowiskiem; bez edycji warstw; bez aktywnego Plugin Host                                          |

**Stan trybu = SSOT serwera** (projekt / sesja). Lokalny flip UI bez komendy serwera = **zakazany**.

### 2. Studio

1. Pełna edycja Timeline / Mixer (w granicach ADR 0008 + „prosta edycja” 0018 §5).
2. **Plugin Host** (sandboxowany sidecar — [ADR 0018](./0018-future-audio-architecture.md) §1) **może** ładować VST/AU/CLAP.
3. Dynamiczna alokacja buforów przy imporcie / renderze — dozwolona.
4. Multi-window / odpinanie widoków = **Later** (nie must tego ADR w cutcie 6.0; backlog ROADMAP 5.6+).

### 3. Live

1. Edycja warstw Timeline **zablokowana** (brak move/trim/pencil/record arm na warstwach projektu).
2. **Aktywny Plugin Host wyłączony** — brak hot-load / realtime DSP wtyczek.
3. Odtwarzanie wyłącznie assetów projektu (w tym **zamrożonych WAV** z Freeze) + istniejący WebAudio playback + MIDI do **zewnętrznych** standalone ([ADR 0018](./0018-future-audio-architecture.md) filar 4).
4. Preferencja pre-alokacji / braku dynamicznego ładowania obcego kodu DSP w czasie show.
5. UI operatorski z **PIN** zgodnie z [ADR 0017](./0017-live-show-control-contracts.md) §8 (TTL / Panic bez zmian kontraktu PIN).

### 4. Przejścia między trybami

#### Studio → Live (twardy gate)

Wejście w Live jest **blokowane**, dopóki walidator serwera nie potwierdzi:

1. Wszystkie ścieżki z aktywnymi wtyczkami mają **aktualny Freeze** (render offline → WAV w assets projektu).
2. Brak krytycznych braków assetów wymaganych do odtworzenia setlisty.

Niezamrożone VST / brakujące pliki = **odmowa przejścia** + raport pre-flight (szczegóły UI = scope report 6.0; pokrewne: Setlist Pre-flight w ROADMAP Later).

Po udanym przejściu: Plugin Host **zatrzymany / niezaładowany**; odtwarzanie = zamrożone / natywne assety.

#### Live → Studio

1. Jawna akcja operatora; w typowym flow **PIN** (reuse ADR 0017 §8) przed odblokowaniem edycji.
2. Po wyjściu z Live wolno ponownie uruchomić / załadować Plugin Host.

### 5. Lock Lane

- **Toggle kłódki warstwy** = ochrona przed przypadkową edycją **w Studio**.
- W **Live** edycja warstw i tak jest wyłączona — Lock Lane nie zastępuje trybu Live.

### 6. Explicitly OUT

- Dual Engine / Plugin Host / Freeze gate w linii **5.x**
- Ładowanie VST/AU/CLAP **in-process** (Node, Tauri Rust, WebView) — [ADR 0018](./0018-future-audio-architecture.md) §1
- **Aktywny** Plugin Host w trybie **Live**
- Obietnice Zero-Glitch HA / seamless recovery poza izolacją procesu Plugin Host
- Atrapy przełącznika Studio/Live w UI przed runtime gate ([ADR 0011](./0011-ui-parity-behavior.md))

### 7. Residual (implementacja — nie domykać „na zapas”)

1. Schema pola trybu (projekt vs sesja operatorska) + migrator.
2. IPC Plugin Host ↔ serwer / desktop shell vs thin-shell [ADR 0010](./0010-desktop-shell-tauri.md) — szczegóły w scope 6.0.
3. UX pre-flight (lista niezamrożonych ścieżek, force-freeze, progress renderu).
4. Zachowanie transportu przy przełączeniu trybu (czy wymuszać PAUSE — decyzja w scope report).

## Konsekwencje

- [ROADMAP](../ROADMAP.md) / [TODO](../TODO.md): 6.0 = **Live Suite + Dual Engine**; język VST = sidecar + Freeze, nie in-process.
- [ADR 0018](./0018-future-audio-architecture.md): Zero-Crash + Plugin Host + Freeze zlinkowane do tego ADR.
- [ADR 0017](./0017-live-show-control-contracts.md): PIN Live reuse §8; Dual Engine nie zmienia TTL/Panic.
- [ARCHITECTURE](../ARCHITECTURE.md): wskaźnik Dual Engine → ten ADR.
- CHANGELOG: **brak** wpisu za sam ADR (docs deweloperskie).

## Powiązane

- [ADR 0010](./0010-desktop-shell-tauri.md), [0011](./0011-ui-parity-behavior.md), [0017](./0017-live-show-control-contracts.md), [0018](./0018-future-audio-architecture.md)
- Triage: [analiza-produktowo-wdrozeniowa-stagesync-roadmap.triage.md](../analysis/inspiracje/specyfikacje/analiza-produktowo-wdrozeniowa-stagesync-roadmap.triage.md) (RM-08 / RM-09)
- Raport align: [report-adr-dual-engine-vst-align.md](../analysis/reports/current/report-adr-dual-engine-vst-align.md)

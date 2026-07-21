# Scope 5.0.0 — Stabilne wydanie + polish UI / Timeline / audio / Faza D

**Wersja docelowa:** `5.0.0` (tag / bump **tylko na prośbę**; nazwa hero linii 5.0 przy cutcie)  
**Podstawa:** [ROADMAP.md](../../ROADMAP.md) · [TODO.md](../../TODO.md) · [ADR 0002](../../adr/0002-timebase-ssot.md) · [ADR 0005](../../adr/0005-domain-axioms.md) · [ADR 0007](../../adr/0007-snap-grid.md) · [ADR 0008](../../adr/0008-timeline-clip-editing.md) · [ADR 0010](../../adr/0010-desktop-shell-tauri.md) · [ADR 0011](../../adr/0011-ui-parity-behavior.md) · [report-beta-gate.md](./report-beta-gate.md) · [report-scope-beta2.md](./report-scope-beta2.md)  
**Bramka wejścia:** `v5.0.0-beta.2` wydane (2026-07-21); P8 green; start kodu na jawną prośbę (overnight audit 2026-07-21→22)  
**Okno implementacji:** do **10:00** (UTC+2) 2026-07-22 — małe PR-y, **bez merge do `main`**, CI green; G1–G10 = soft-gate (bez HW)

## Cel

Domknąć **stabilne 5.0.0** jako linię produktową (nie kolejny beta feature dump):

1. **Polish UI** na żywych kontrolkach (typografia `--ss-*`, proporcje, copy PL, gęstość) — bez clone chrome v4 ([ADR 0011](../../adr/0011-ui-parity-behavior.md)).
2. **Timeline P1:** zoom H/V z ikonami; Pomoc z pełną treścią; **snap picker** beat/subdivision ([ADR 0007](../../adr/0007-snap-grid.md) faza 2).
3. **Audio polish:** fade, crossfade, loop-region (ewent. overlap) ([ADR 0008](../../adr/0008-timeline-clip-editing.md)).
4. **Desktop OS menu — Faza D:** pełna Edycja; zoom w Widok; rozbudowa Pomoc ([ROADMAP](../../ROADMAP.md)).
5. **`docs/api` domknięte** + CI + smoke E2E (automatyzowalne).
6. **G1–G10:** checklista soft-gate dla operatora rano — **nie** claim green bez HW.

## Kontrakt IN / OUT

| IN 5.0.0 | OUT 5.0.0 |
|----------|-----------|
| Polish UI żywych kontrolek (A) | Motywy / auth / multi-user → **5.1+** |
| Zoom UI H/V + ikony; Help pełny; snap picker (B) | Clone chrome / inventarz-first ([ADR 0011](../../adr/0011-ui-parity-behavior.md)) |
| Fade / crossfade / loop-region; ewent. overlap (C) | Flex Time / stretch / pencil audio / MIDI w Tauri |
| Menu OS Faza D (D) | Android shell / store auto-update |
| `docs/api` + CI + smoke E2E (E) | git-apply (nigdy) |
| Soft-gate G1–G10 (docs checklist; HW = operator) | Fałszywy green G1–G10 w CI |
| Tag `5.0.0` + nazwa hero | Tag/bump **bez** prośby użytkownika |

## IN (must) — A: Polish UI

Źródło: [TODO](../../TODO.md) · [ui-density](../../../.cursor/rules/ui-density.mdc) · [ADR 0011](../../adr/0011-ui-parity-behavior.md).

| # | Wycinek | Uwagi |
|---|---------|--------|
| A1 | Audyt żywych kontrolek Timeline / Admin / Client | Transport, status zoom, dock, inspector, Admin Live Desk |
| A2 | Typografia / spacing wyłącznie `--ss-*` | Brak ad-hoc `font-size` px / HEX w shellach |
| A3 | Copy PL + proporcje / gęstość | Parity = zachowanie, nie ikony |
| A4 | Bez nowych wariantów `Button` | Zamknięty zbiór 7 stanów |

**Powierzchnie (orientacja):** `TimelineShell.tsx` (+ module CSS), Admin (`SetView` / `StageView` / Host), Client shells, `packages/ui` tokeny.

## IN (must) — B: Timeline zoom / Help / snap picker

Źródło: [ADR 0007](../../adr/0007-snap-grid.md) faza 2 · ROADMAP § Alpha 4 odłożone · `TimelineShell` (stan `zoomH`/`zoomV`/`zoomUi` już istnieje — suwaki tekstowe H/V/UI).

| # | Wycinek | Uwagi |
|---|---------|--------|
| B1 | Zoom H/V (+ UI) z **ikonami** przy suwakach / +/- | Reuse `apps/web/src/shells/icons.tsx`; bez narzędzia lupy (OUT α8) |
| B2 | Snap picker UI: `off` / `bar` / `beat` / `subdivision` | Sesja Timeline (+ opcjonalnie localStorage); default `bar`; Cmd/Ctrl = chwilowy off (już α7) |
| B3 | Pomoc Timeline — pełna treść | Rozszerzyć `TimelineHelp.tsx` (audio β2, MIDI host, snap picker, Faza D skróty); bez emoji chrome |
| B4 | Wiring snap mode → `quantizeTicks` / edycja | Stan React; nie zapis w `project.json` (ADR 0007) |

## IN (must) — C: Audio polish (fade / crossfade / loop-region)

Źródło: [ADR 0008](../../adr/0008-timeline-clip-editing.md) §1, §4, §6, §9 · schema `AudioClipSchema` (dziś: trim/gain/mute, **bez** fade).

| # | Wycinek | Uwagi |
|---|---------|--------|
| C1 | Schema: `fadeInMs` / `fadeOutMs` (ew. crossfade pair) | Zod na krawędzi; fail-fast; bump formatu wg ADR 0009 jeśli potrzeba |
| C2 | Playback: envelope fade przy WebAudio scheduler | Pozycja z ticków serwera (`ticksToMs`); bez zegara muzycznego klienta |
| C3 | UI: Smart zones górne narożniki = fade handles | Pointer/Smart; bez pencil audio |
| C4 | Crossfade przy styku / overlap mode (opcjonalnie) | Jeśli czas: minimalny overlap + X-fade; inaczej defer z notatką w handoff |
| C5 | Loop-region audio (clip loop) vs transport cycle | Rozróżnić: transport loop (już jest) vs **loop-region klipu**; must = clip loop-region per ADR |
| C6 | Testy shared + smoke playback | Czyste funkcje; bez `Date.now()` w konwersji domenowej |

## IN (must) — D: Desktop OS menu Faza D

Źródło: [ROADMAP](../../ROADMAP.md) § Desktop OS menu · `apps/desktop/src-tauri/src/lib.rs` (A+B+C done; **brak** submenu Edycja; Widok bez zoom; Pomoc = docs/issues).

| # | Wycinek | Uwagi |
|---|---------|--------|
| D1 | **Edycja:** Undo / Redo / Cut / Copy / Paste / Delete | Mostek `stagesync:desktop-menu` → istniejące commandy Timeline; **bez** disabled „na zapas”; gdy brak stacka — disable tylko realnie |
| D2 | **Widok:** Zoom in / out / reset (H lub UI) | Event → handlery zoom w Timeline (już `zoomHorizontalBySteps` / UI) |
| D3 | **Pomoc:** skróty / overlay pomocy / rozbudowa | Otwórz Timeline Help; ewentualnie PDF setlisty / archiwum jeśli API gotowe — inaczej OUT z checklistą |
| D4 | Zero MIDI / clock w Rust | Shell tylko mostkuje; SSOT = `apps/server` |

## IN (must) — E: docs/api + CI + smoke E2E

Źródło: [docs/api/README.md](../../api/README.md) (nieaktualne: v2, brak MIDI / setlist / assets / desktop paths).

| # | Wycinek | Uwagi |
|---|---------|--------|
| E1 | Domknięcie `docs/api` do stanu β2+ | REST + WS: projects v3+, transport Countdown, MIDI, setlist, assets, OCC `details` |
| E2 | CI: utrzymać green `lint-types-test-build` (+ compose / tauri-check) | Fix regresji w PR-ach A–D |
| E3 | Smoke E2E (automatyzowalne) | Minimalny smoke: health + transport play/stop **lub** Playwright Forma drag jeśli infra gotowa; nie blokować tagu brakiem pełnego browser matrix |

## Soft-gate — G1–G10 (operator; poza oknem HW)

**Brak dostępu do HW w overnight.** Nie zaznaczamy green.

| ID | Status w tym oknie | Akcja overnight |
|----|--------------------|-----------------|
| G1–G10 | ⬜ residual operatorski po β2 | Checklista + sekwencja w [report-beta-gate.md](./report-beta-gate.md); link z TODO; **bez** fałszywego `[x]` |
| G6 kod | prerequisites CI/Release done (darwin+windows `latest.json`) | Bez claim relaunch green |
| Przed tagiem `5.0.0` | Must green na instalatorach β2 (lub artefaktach 5.0.0 RC) | Operator rano |

Zob. sekcja „Sekwencja weryfikacji” w [report-beta-gate.md](./report-beta-gate.md) — baseline `v5.0.0-beta.2`.

## OUT (świadome)

| Temat | Etap |
|-------|------|
| Motywy / auth / multi-user | **5.1+** |
| Android / store auto-update | Poza 5.0.0 |
| MIDI I/O w procesie Tauri | **Nigdy** ([ADR 0010](../../adr/0010-desktop-shell-tauri.md)) |
| Flex Time / pencil audio / stretch poza plik | OUT |
| Clone chrome v4 | **Zakaz** ([ADR 0011](../../adr/0011-ui-parity-behavior.md)) |
| git-apply | Nigdy ([ADR 0004](../../adr/0004-updates-docker.md)) |
| Tag/bump `5.0.0` bez prośby | Zakaz overnight |
| Merge PR → `main` przez agenta | Zakaz — user rano |

## Should (jeśli czas po must A–E)

| Temat | Uwagi |
|-------|--------|
| Doprecyzowanie ADR 0002 (tempo/metrum pre-roll) | Docs-only jeśli otwarte |
| E2E Forma drag + transport (carry z β1) | Po E3 bazowym |
| Admin panel toggle UX | Drobne |
| AD-01…03 Transpozycja / Lead / Edycja zdalna | Pull-forward tylko jeśli pull |

## Weryfikacja vs ADR / ROADMAP (zero sprzeczności)

| Aksjomat | Status w tym scope |
|----------|-------------------|
| SSOT czasu = serwer; klient wygładza między tickami ([ADR 0002](../../adr/0002-timebase-ssot.md)) | ✓ C2, D4 |
| Kanon = integer ticks + PPQ; ms na krawędzi audio | ✓ C* |
| Snap faza 2 = UI picker; default `bar`; nie w `project.json` ([ADR 0007](../../adr/0007-snap-grid.md)) | ✓ B2, B4 |
| Fade/crossfade/loop-region = 5.0.0; no pencil audio ([ADR 0008](../../adr/0008-timeline-clip-editing.md)) | ✓ C* |
| MIDI / clock nie w Tauri ([ADR 0010](../../adr/0010-desktop-shell-tauri.md)) | ✓ D4, OUT |
| Faza D = 5.0.0 ([ROADMAP](../../ROADMAP.md)) | ✓ D* |
| Parity = zachowanie, nie clone ([ADR 0011](../../adr/0011-ui-parity-behavior.md)) | ✓ A*, B1 |
| G1–G10 = operator HW; CI nie zastępuje | ✓ soft-gate |

## Architektura (domyślna)

```mermaid
flowchart LR
  SharedSnap[shared_quantizeTicks] --> SnapUI[Timeline_snap_picker]
  ZoomState[zoomH_zoomV_zoomUi] --> ZoomIcons[status_zoom_icons]
  ZoomState --> MenuView[Tauri_Widok_zoom]
  AudioSchema[AudioClip_fadeMs] --> Scheduler[WebAudio_ticksToMs]
  Transport[Server_transport] --> Scheduler
  MenuEdit[Tauri_Edycja] -->|desktop_menu_events| TimelineCmds[Undo_Redo_Clipboard]
  HelpUI[TimelineHelp] --> MenuHelp[Tauri_Pomoc]
  DocsApi[docs_api] --> CI[CI_lint_test_build_smoke]
```

## Plan PR (małe; 1 temat = 1 PR; kolejność A→B→C→D→E)

| PR | Branch (propozycja) | Temat | Acceptance (smoke) |
|----|---------------------|-------|-------------------|
| **0** | `docs/scope-5.0.0` → `main` (docs OK) | Ten raport + soft-gate note + link w TODO | Plik w `docs/analysis/reports/`; TODO linkuje |
| **A1** | `feat/ui-polish-live-controls` | Polish UI żywych kontrolek (slice Timeline + transport/status) | Brak regresji layoutu; tokeny `--ss-*`; visual smoke |
| **B1** | `feat/timeline-zoom-icons` | Zoom H/V/UI z ikonami | Suwaki + ikony; skróty zoom działają |
| **B2** | `feat/timeline-snap-picker` | Snap picker ADR 0007 faza 2 | Picker zmienia tryb; pencil/drag używa trybu; Cmd-off OK |
| **B3** | `feat/timeline-help-full` | Pełna treść Pomocy | Overlay pokrywa audio/MIDI/snap/zoom |
| **C1** | `feat/audio-fade-schema-playback` | Schema fade + playback envelope | Vitest shared; play z fadeIn/Out |
| **C2** | `feat/audio-fade-ui-loop` | Fade handles UI + loop-region clip (+ overlap jeśli czas) | Gest Smart; persist draft |
| **D1** | `feat/desktop-menu-phase-d` | Menu Edycja + zoom Widok + Pomoc | Eventy → UI; cargo check |
| **E1** | `docs/api-closeout-5.0.0` | Domknięcie `docs/api` | README zgodny z serwerem |
| **E2** | `test/smoke-e2e-5.0.0` | Smoke E2E / CI hook | Job lub skrypt green w CI |

**Zasady PR:** bez merge przez agenta; push `-u`; CI do green follow-up commitami; nie force-push; nie tagować `5.0.0`.

### Soft-gate docs (PR 0 lub osobny chore)

- Aktualizacja [report-beta-gate.md](./report-beta-gate.md): sekcja „Przed 5.0.0 / soft-gate overnight” — G1–G10 nadal ⬜; lista artefaktów β2; zakaz claim green.
- TODO: odhaczyć „Scope report…” po merge PR 0; G1–G10 zostaje otwarte.

## Kryteria zamknięcia etapu (przy tagu — tylko na prośbę)

1. Must A–E merged + CI green na `main`.
2. G1–G10 green **operator** na HW (lub świadomy waiver w report-beta-gate).
3. Bump `5.0.0` + CHANGELOG + **nazwa hero** linii 5.0 + tag `v5.0.0`.
4. TODO → sekcja `5.1` (procedura w TODO.md).

## Handoff morning (2026-07-22 ~ overnight close)

**Agent:** bez merge do `main`; bez tagu `5.0.0`; G1–G10 **nie** green.

### PR-y (kolejność review A→E)

| # | Temat | URL | Uwagi |
|---|--------|-----|--------|
| — | Scope + soft-gate G1–G10 | na `main` (`6926d11`) | `report-scope-5.0.0.md` |
| [#53](https://github.com/Negatywistyczny/stagesync/pull/53) | A1 polish live controls | https://github.com/Negatywistyczny/stagesync/pull/53 | base `main` |
| [#54](https://github.com/Negatywistyczny/stagesync/pull/54) | B1 zoom icons | https://github.com/Negatywistyczny/stagesync/pull/54 | zawiera też #53 (stack) |
| [#55](https://github.com/Negatywistyczny/stagesync/pull/55) | B2 snap picker | https://github.com/Negatywistyczny/stagesync/pull/55 | |
| [#56](https://github.com/Negatywistyczny/stagesync/pull/56) | B3 help full | https://github.com/Negatywistyczny/stagesync/pull/56 | |
| [#57](https://github.com/Negatywistyczny/stagesync/pull/57) | C1 fade schema+playback | https://github.com/Negatywistyczny/stagesync/pull/57 | |
| [#58](https://github.com/Negatywistyczny/stagesync/pull/58) | C2 fade/loop inspector | https://github.com/Negatywistyczny/stagesync/pull/58 | zawiera też #57 (stack) |
| [#59](https://github.com/Negatywistyczny/stagesync/pull/59) | D menu Faza D | https://github.com/Negatywistyczny/stagesync/pull/59 | |
| [#60](https://github.com/Negatywistyczny/stagesync/pull/60) | E docs/api + smoke e2e | https://github.com/Negatywistyczny/stagesync/pull/60 | E1+E2 w jednym PR |

Sprawdź CI: `gh pr checks <n>` przed merge.

### Ukończone vs odłożone

| Done | Deferred |
|------|----------|
| A polish transport/status + client label tokens | Pełny audit Admin Live Desk density |
| B zoom icons; snap picker; help full | — |
| C fadeIn/Out + loop schema/playback + inspector | Crossfade / overlap mode (C4); Smart fade handles on canvas |
| D Edycja + zoom Widok + Pomoc shortcuts | PDF setlisty / archiwum projektu (ROADMAP Faza D extras) |
| E `docs/api` + smoke e2e in `pnpm test` | Playwright Forma drag browser matrix |
| Soft-gate G1–G10 docs | **Operator HW** G1–G10 |

### Blokery / kolejność merge

1. Merge #53 przed lub razem z #54 (stack).
2. Merge #57 przed lub razem z #58 (stack).
3. #55/#56/#59/#60 niezależne od siebie względem A/C (możliwe konflikty w `TimelineShell` / Help — rebase rano jeśli trzeba).
4. G1–G10: [report-beta-gate.md](./report-beta-gate.md) soft-gate — **nie** claim green bez HW.

## Wave 2 backlog (po must A–E; overnight cont. 2026-07-21→22)

Ranked by operator impact × feasibility (small PRs; no merge; no tag; no G1 HW claim).

| Rank | Temat | Branch / PR | Why |
|------|--------|-------------|-----|
| 1 | **Smart fade handles** na canvas audio (górne narożniki) | `feat/audio-fade-handles` (stack #58) | ADR 0008 §6; inspector alone is weak UX |
| 2 | **Crossfade at abut** (no full overlap mode) | `feat/audio-crossfade-abut` (stack fade) | Completes C must residual without X-Fade drag mode |
| 3 | **ADR 0002** tempo/metrum @ pre-roll clarification | `docs/adr-0002-preroll-tempo` | TODO Should; docs-only |
| 4 | **Smoke: Forma edit + transport** (in-process, not Playwright) | `test/smoke-forma-transport` | TODO Should carry; extends #60 |
| 5 | Admin density / songs↔inspector UX polish | `feat/admin-ux-density` | TODO Should; avoid v4 chrome |
| 6 | ClientShell residual ad-hoc typography | `feat/client-token-hygiene` | Constitution tokens |
| 7 | AD-01…03 pull-forward | — | Skip unless clearly small; prefer post-stable |
| — | Playwright browser matrix | — | Defer — infra cost > overnight value |
| — | Overlap drag mode / Flex Time | — | OUT |

### Parallel PRs from other agents (do not duplicate)

| # | Temat | CI (at wave-2 start) |
|---|--------|----------------------|
| [#50](https://github.com/Negatywistyczny/stagesync/pull/50)–[#52](https://github.com/Negatywistyczny/stagesync/pull/52) | fullscreen / docs links / docs hygiene | green |
| [#61](https://github.com/Negatywistyczny/stagesync/pull/61) | ruler split loop/playhead lanes | green |
| [#62](https://github.com/Negatywistyczny/stagesync/pull/62) | Cmd/Ctrl+C native Edit menu | green |
| [#63](https://github.com/Negatywistyczny/stagesync/pull/63) | visual Timeline help | pending — review vs ADR 0011 (no legacy CSS clone) |

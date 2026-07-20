# Audyt porównawczy StageSync v4 ↔ v5 (Część A)

**Data:** 2026-07-20  
**Repo v5:** `stagesync` · **Referencja v4:** `STAGESYNC-APP-LEGACY`  
**Polityka:** [ADR 0011](../../adr/0011-ui-parity-behavior.md) — parity = **zachowanie**, nie inventarz / clone chrome  
**SSOT luk:** [report-v4-v5-gap-audit.md](./report-v4-v5-gap-audit.md) — katalog TE/KB/AD/CL (P0/P1)  
**Aneks UI-diff:** [report-v4-v5-ui-diff-inventory.md](./report-v4-v5-ui-diff-inventory.md)  
**Bramka β:** [report-parity-blocker-alpha8.md](./report-parity-blocker-alpha8.md) — **P8 green 2026-07-21**; ten raport historyczny **nie** uprawnia sam do tagu `5.0.0-beta.*` (β1 na prośbę)

---

## 1. Executive Summary

| Metryka | Wartość |
|---------|---------|
| **Szacunek behawioru (bez jawnego OUT)** | **~35–45%** operacyjnie do green PO (zrewidowane); TE-P0/CD **code** w α8 freeze — nie window-dress inventarzem |
| **Gotowość β** | **P8 green** — wejście β1 **na prośbę** (Docker/Tauri); bez samowolnego `5.0.0-beta.*` |
| **Największe ryzyka sceniczne** | Live Desk korekt (**β2**); residual P1 Timeline / Help / wand |
| **Chrome / DS** | Delty tokenów `--ss-*` OK; **zakaz** disabled stubów inventarz-first (Admin footer Tr./Lead/Edycja **usunięte**) |

**Werdykt:** v5 jest **rebuildem** (ADR 0011), nie portem HTML. α8 = **code freeze**; α9 must (migrator + CL-P0 + **P8**) = **green 2026-07-21**. Inventarz `[x]` ≠ green.

### Zasady klasyfikacji matrycy

| Etykieta | Znaczenie |
|----------|-----------|
| **Delta** | Świadoma różnica v5 (DS / IA / SSOT) — zachować lub uzgodnić z PO; nie „bug sam z siebie” |
| **Adaptacja** | Port behawioru v4 w nowym UI — cel parity; luka = `port-behavior` / `bug` w aneksie |
| **OUT** | Świadomie poza zakresem (β1/β2 / nigdy) — nie liczy się do bramki parity |

---

## 2. Matryca pokrycia architektury

### 2.1 Timeline

| Obszar | v4 (fakt) | v5 (fakt) | Klasa | Uwagi |
|--------|-----------|-----------|-------|-------|
| Timebase storage | float `absBeat` + song maps | integer **ticks** + PPQ ([ADR 0002](../../adr/0002-timebase-ssot.md)) | **Delta** | Kanon v5; BBT tylko widok |
| Transport SSOT | serwer + lokalny preview clock | serwer WS/REST; playhead UI między tickami | **Adaptacja** | Follow/seek — smoke T-loc |
| Snap edycji Forma | `snapAbsToBarStart` | `snapEditTicks` / `quantizeTicks` @ `bar` ([ADR 0007](../../adr/0007-snap-grid.md)) | **Adaptacja** | Kod blisko; wymaga PO smoke |
| Snap locator / seek | `quantizeAbsBeat` (siatka beatu) | `snapEditTicks` @ **`beat`** (+ Cmd/Ctrl off) | **Adaptacja** | **fixed** aneks TL-R-03 — PO smoke |
| Snap loop region | `quantizeAbsBeat` na bounds | `snapLoopRange` → mode **`beat`** | **Adaptacja** | **fixed** aneks TL-R-04 — PO smoke |
| Mapy T/M/K | `song-maps.js` pełny workflow | insert/edit/drag + beat snap; eraser chroni seed @ 0 | **Adaptacja** | parity-blocker T-maps |
| Grid ruler | barlines + beat ticks @ `pxb≥56` | `RULER_BEAT_TICKS_MIN_PX = 56` | **Adaptacja** | Zgodne |
| Zoom H/V/UI | UI scale **mnoży** H + lane (`effectivePxPerBar`) | `effectiveZoomH/V = zoom × uiScale`; `--tl-zoom-ui` chrome | **Adaptacja** | **fixed** TL-Z-*; PO smoke |
| Locator vs playhead | accent (żółty) vs `ss-active` (cyjan) | locator `primary` / playheadMidi `info` | **Adaptacja** | **fixed** TL-R-06/07/08 — MIDI overlay → β2 |
| Smart Tool | brak w tool strip | osobne narzędzie `smart` | **Delta** | extra-v5; keep-v5-ds |
| Zoom tool drag | prostokąt / pinch | **usunięte** z strip; suwaki H/V/UI + Ctrl/Meta+wheel | **OUT** | out-forever |
| Audio lanes | widoczne w 4.x | UI ukryte; schema refs | **OUT** | → β2 |
| Header song center | grid center ≤1100 swap | `.songCluster` `justify-self: center` + 1100px | **Adaptacja** | Zgodne layoutowo |
| BBT/transport cluster | `toolbar__center` wyśrodkowany | flex przy tools (lewa) | **Adaptacja** ⚠ | Aneks TL-T-*; feel v4 |

### 2.2 Admin

| Obszar | v4 | v5 | Klasa | Uwagi |
|--------|----|----|-------|-------|
| IA | jedna strona: Live Desk + lista utworów + setlista w `details` | zakładki Utwory / Set / Scena / Pliki / Host | **Delta** | ADR 0011: mniejsze powierzchnie |
| Set + wybór utworów | „Dodaj zaznaczone z listy” (lista globalna) | `SetView` — pick na tej samej zakładce | **Adaptacja** | A1 code; smoke PO |
| Status Teraz / Dalej | Live Desk metrics + „Następny utwór” | pasek Teraz/Dalej + transport | **Adaptacja** | |
| Transpozycja / sync-lead / edycja zdalna | działające kontrolki Live Desk | **brak UI** (footer stuby usunięte 2026-07-20); API ABSENT → β2 | **OUT** / deferred | gap-audit AD-01…03; nie atrapa w chrome |
| Host Restart / Shutdown | 2× confirm w headerze | Host tab — Restart wired | **Adaptacja** | |
| Host MIDI I/O | pełny stack 4.x | stub „β…” | **OUT** | kanon: **β2** (patrz §5) |
| Zaktualizuj / git-apply | historycznie w UI | disabled + ADR 0004 | **OUT** | never |
| Pliki / import audio | ścieżki serwera | ProjectFilesPanel + schema assets | **Adaptacja** | playback OUT β2 |

### 2.3 Client

| Obszar | v4 | v5 | Klasa | Uwagi |
|--------|----|----|-------|-------|
| Welcome role tiles | emoji + kolorowe hover per rola | emoji + DS `--ss-*` (bez tęczy statusu) | **Delta** | ADR 0011 minimalizm ról |
| Treść ról | karaoke / grid / drums / score wired | pane’y z projektem + transport | **Adaptacja** | C1 — PO smoke |
| Header | conn + song + section | `ClientHeader` + BBT | **Delta** / Adaptacja | treść > chrome |
| Score OSMD | pełniejszy sync 4.x | stub / częściowy | **OUT** / deferred | ROADMAP β2+ / 5.0 |
| Settings drawers | wiele switchy per widok | `RoleSettingsFields` + global | **Adaptacja** | aneks CL-* |

### 2.4 Storage / schema

| Obszar | v4 | v5 | Klasa | Uwagi |
|--------|----|----|-------|-------|
| Projekt na dysku | `database.json` monolit | `data/projects/<id>/` ([ADR 0001](../../adr/0001-storage-layout.md)) | **Delta** | |
| Format projektu | legacy song shape | `formatVersion` **5** kanoniczny (`ProjectSchemaV5`) | **Delta** | ADR 0009 opisał **v3** (assets) — patrz §5 |
| Setlista | w bazie / admin | `data/library/setlist.json` | **Delta** | ADR 0009 |
| Migrator 4.x → v5 | — | α9 MVP | **OUT** α8 | nie zastępuje PO smoke |

---

## 3. Ryzyka sceniczne (regresje vs v4)

| # | Ryzyko | Sev | Źródło | Mitigacja |
|---|--------|-----|--------|-----------|
| S1 | Locator/seek kwantyzuje do **taktu**, nie beatu → operator nie trafia w beat przy scrub | **P0** | było: snap bar | **fixed** `@ beat` + Cmd-off — PO smoke |
| S2 | Loop region snap do **baru** zamiast beatu → cykl „nie tam gdzie zaznaczono” | **P0** | było: `snapLoopRange` bar | **fixed** `@ beat` — PO smoke |
| S3 | Locator i playhead **ten sam** `primary` → utrata dwóch sygnałów operacyjnych | **P1** | CSS | **fixed** locator `primary` / playhead `info` |
| S4 | Transport/loop/follow niezaliczone w smoke (T-loc) | **P0** | parity-blocker | PO smoke ścieżka T-loc |
| S5 | BBT/transport nie w centrum toolbara → wolniejszy odczyt pozycji na scenie | **P2** | layout toolbar | **fixed** `.toolbarCenter` — PO smoke |
| S6 | Client rola bez treści przy żywym transportcie | **P0** | ADR 0011 C1 | Smoke karaoke/grid/Forma |
| S7 | Zoom UI nie mnoży H (v4 tak) → „ten sam % UI” ≠ ten sam framing | **P2** | v4 `effectivePxPerBar` | **fixed** `effectiveZoomH/V` — PO smoke |

---

## 4. Rekomendacje

### 4.1 Engineering (kolejność)

1. ~~Seek / locator snap → beat~~ / ~~Loop snap → beat~~ / ~~wskaźniki~~ / ~~toolbar center~~ / ~~zoom UI×H/V~~ / ~~TE-P0 / CD~~ — **α8 code freeze**.
2. **α9:** CL-01/04/05 + migrator fixtures.
3. Aktualizować inventarz **po** geście PO; nie odhaczać samymi kontrolkami.

### 4.2 Product / PO

1. Lista smoke = checklista w [parity-blocker](./report-parity-blocker-alpha8.md) (T-loc / zoom / chrome / meta) — **α9 P8**.
2. **Zakaz** claim „parity done” / bump β do green smoke + CL-P0 + CI.
3. MIDI / audio / AD-01…03: kanon **β2**.

---

## 5. Sprzeczności dokumentacji (do naprawy w tym deliverable)

| Temat | Konflikt | Kanon po audycie |
|-------|----------|------------------|
| **MIDI etap** | Było: `TODO` / blocker / inventarz → β1 vs ROADMAP/ADR 0008 → β2 | **Naprawione:** kanon **MIDI I/O = β2** |
| **Schema ADR 0009** | ADR tytuł/decyzja: `formatVersion: 3`; kod: kanon `formatVersion: 5` | **Nota w ADR 0009:** v3 = assets/setlist; kanon runtime = v5 |
| **Inventarz ≠ smoke** | Historyczne `[x]` „wired” vs ADR 0011 | Done = PO smoke; inventarz wtórny |
| **ADR 0007 status** | Status „Proponowany” przy wdrożonych fazach 0–3 | **→ Zaakceptowany** (picker UI → 5.0.0) |
| **α8 vs β** | „Parity stage” vs open P8 | **α8 = code freeze**; **P8 green 2026-07-21** → β1 na prośbę |

---

## 6. Powiązania

- **SSOT luk:** [report-v4-v5-gap-audit.md](./report-v4-v5-gap-audit.md)
- Aneks wierszowy: [report-v4-v5-ui-diff-inventory.md](./report-v4-v5-ui-diff-inventory.md)
- Bramka: [report-parity-blocker-alpha8.md](./report-parity-blocker-alpha8.md)
- Freeze: [report-alpha8-code-freeze.md](./report-alpha8-code-freeze.md)
- Kontrakt UI: [ADR 0011](../../adr/0011-ui-parity-behavior.md)
- Roadmapa / TODO: [ROADMAP.md](../../ROADMAP.md), [TODO.md](../../TODO.md)

**Status parity:** **P8 green (2026-07-21)** — α9 must domknięte. Tag `5.0.0-beta.*` tylko na prośbę.

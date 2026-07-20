# Parity blocker — przed β (rebuild wg ADR 0011)

**Data:** 2026-07-20 (rewizja — **α8 code freeze**; residual → α9)  
**Polityka:** [ADR 0011](../../adr/0011-ui-parity-behavior.md) — parity = **zachowanie**, nie inventarz.  
**Freeze α8:** [report-alpha8-code-freeze.md](./report-alpha8-code-freeze.md) — engineering zamknięty; **nie** β-ready.  
**SSOT luk:** [report-v4-v5-gap-audit.md](./report-v4-v5-gap-audit.md) — P0 TE/AD/CL poniżej.  
**Referencja:** `STAGESYNC-APP-LEGACY` (`timeline.js`, `timeline.css`, `song-maps.js`, `timeline-touch.js`).  
**Werdykt:** **NIE** gotowe do β. „Wired” / code freeze ≠ usable bez PO. Aktywny etap: **α9**.

**Pełny audyt + UI-diff:** [report-v4-v5-parity-audit.md](./report-v4-v5-parity-audit.md) ·
[report-v4-v5-ui-diff-inventory.md](./report-v4-v5-ui-diff-inventory.md)
(P0 aneksu **fixed** w kodzie: **TL-R-03/04** snap beat, **TL-R-06/07/08** wskaźniki;
P1: **TL-T-05**, **TL-Z-01…03**, **TL-M-04/07/08** — czeka PO smoke).

### P0 — status po α8 freeze

| ID | Temat | Status | Etap |
|----|-------|--------|------|
| **TE-01 / 03–06** | Marquee + multi-select + multi-drag | **code** — czeka PO smoke | α8 freeze → α9 P8 |
| **TE-08 / KB-20** | Clipboard ⌘C/X/V/D | **code** — czeka PO smoke | α8 freeze → α9 P8 |
| **TE-19 / 22** | Countdown canvas length + shift treści | **code** — czeka PO smoke | α8 freeze → α9 P8 |
| **CL-01 / 04 / 05** | Karaoke beat; grid cycle; Forma bar progress | **open** (brak w kodzie) | **α9 must** |
| **AD-01…03** | Transpozycja / Lead / Edycja — API + Live Desk | **deferred** (footer stuby usunięte; brak atrapy) | **β2** — nie bloker α9 |

**T-gest** = code awaiting PO smoke. Nie claim β.

## Audyt Timeline (v4 → v5) — fakty

| Temat | v4 | v5 dziś | Sev |
|-------|----|---------|-----|
| **Grid taktów** | Barlines zawsze (`iterBarBoundaries` + meterMap); na ruler **beat ticks** gdy `pxb ≥ 56` | `iterBarBoundariesTicks` + meterMap; ruler beat ticks @ ≥56; lane = barlines only | **P0** → smoke |
| **Snap Forma** | `snapAbsToBarStart` (miary taktu) | `snapEditTicks` bar = musical barlines (`iterBarBoundariesTicks` + meterMap); Cmd/Ctrl = off | **P0** → smoke |
| **Drag / overwrite** | Move/resize + finalize cover-delete; pencil overwrite | Path wired: Forma bar + content beat snap; pencil `insertSpanOverwrite`; edge hit 12px | **P0** → smoke |
| **Mapy T/M/K** | SongMaps pełny workflow | Insert/edit/drag + beat snap; eraser chroni seed @ 0 | **P0** → smoke |
| **Zoom H** | `pxPerBar` + anchored scroll | `effectiveZoomH = zoomH × uiScale` | **P0** → smoke |
| **Zoom V** | `--tl-lane-height` | `--tl-row-h` = `zoomV × uiScale` | **P0** → smoke |
| **Zoom UI** | `--tl-ui-scale` mnoży H + lane | `--tl-zoom-ui` chrome + mnoży effective H/V | **P0** → smoke |
| **Suwaki niebieskie** | `accent-color: --ss-accent` (amber) | `accent-color: var(--ss-color-primary)` na range | **P1** OK |
| **Zoom tool** | Drag H (+ pinch touch) | **usunięte** z strip; suwaki H/V/UI + Ctrl/Meta+wheel | **OUT** |
| **Help** | `min(72rem)`, max ~56rem, accent chrome | `.helpOverlayPanel` ~72rem / 56rem; bez min-width konfliktu | **P1** OK |
| **Metadane** | ⓘ → inspector sheet (title w pickerze) | ⓘ → year + editable meter/key @ 0 | **P1** → smoke |
| **Header layout** | Grid: brand \| **center song** \| actions; ≤1100 controls pod | CSS grid + `@media (max-width: 1100px)` | **P1** OK |
| **Toolbar center** | tools \| **center transport+BBT+meta** \| right | `.toolbarCenter` grid | **P1** → smoke |
| **Playhead / loop kolory** | Amber locator / cyan MIDI | Locator `primary`; playheadMidi `info` (overlay MIDI → β2) | **P1** → smoke |
| **Locator / loop snap** | `quantizeAbsBeat` | `snapEditTicks` / `snapLoopRange` @ **beat** (+ Cmd off) | **P0** → smoke |
| **Mobile / tablet** | `data-tl-tier`; mobile RO; tablet nudge | `timelineTouchTier` + `data-tl-tier`; mobile RO; tablet ◀▶ nudge | **P2** OK |

## Bramka (wejście β — wszystkie muszą być green)

| # | Kryterium | Status |
|---|-----------|--------|
| **T-grid** | meterMap barlines + ruler beat ticks @ ≥56 px/bar | **code** — czeka PO smoke (α9) |
| **T-zoom** | H + V + UI naprawdę skalują (UI×H/V); accent amber | **code** — czeka PO smoke (α9) |
| **T-gest** | Forma/content move/resize/pencil + snap — **oraz** multi-select/marquee (TE-01…06) + clipboard | **code** — czeka PO smoke (α9) |
| **T-maps** | Tempo/Metrum/Tonacja SongMaps depth | **code** — czeka PO smoke (α9) |
| **T-loc** | Locator/loop snap @ **beat**; follow; transport; wskaźniki primary/info | **code** — czeka PO smoke (α9) |
| **T-chrome** | Header + toolbar center + help size; bez cyan-as-brand | **code** — czeka PO smoke (α9) |
| **C1** | Client treść ról | **blocked** na CL-01/04/05 (α9 must) |
| **A1** | Admin Set + song pick w jednym flow | **code** — czeka PO smoke (α9) |
| **P8** | Sign-off PO | **open** — blokuje β |
| **Migrator** | α9 MVP | **code** (scope M1–M8) — fixtures/smoke w α9 |

## Świadome OUT

| Temat | Uwagi |
|-------|--------|
| git-apply | ADR 0004 — nigdy |
| Audio playback | → β2 |
| Host MIDI | → **β2** (ROADMAP / ADR 0008; nie β1) |
| AD-01…03 Live Desk korekt | → **β2** (API ABSENT; nie atrapa) |
| Docker / Tauri | → β1 |
| Clone chrome v4 | zakaz ADR 0011 |
| Pinch / fit zoom | Should po P0 |

## Smoke checklist (T-loc / chrome / meta)

- [ ] Scrub locator → kwantyzacja do **beatu**; Cmd/Ctrl = off
- [ ] Loop region na linijce → bounds @ beat
- [ ] Play: yellow locator follows; **brak** linii playhead gdy pause; CSS playhead = `info`, locator = `primary`
- [ ] Toolbar: BBT / transport / Tempo·Metrum·Tonacja **wyśrodkowane**
- [ ] Zoom UI zmienia framing H+V (nie tylko chrome fonts)
- [ ] Meta ⓘ: year + editable metrum + tonic/mode @ 0 → Zapisz → reload

## Następne kroki (α9)

1. ~~Canvas readable / gesty / chrome feel (kod UI-diff P0/P1).~~
2. ~~Admin footer inventarz stubs (Tr./Lead/Edycja/MIDI btn) — removed.~~
3. ~~**α8 TE-P0:** marquee + multi-select + multi-drag + clipboard~~ **code** (freeze).
4. **PO smoke** T-gest + T-loc + T-zoom + T-chrome + meta — checklista powyżej.
5. **CL-01/04/05** Client treść → potem C1 smoke.
6. Migrator fixtures / Admin import regress.
7. β1 host **dopiero** po P8 + CL + migrator.

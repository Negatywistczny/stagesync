# Parity blocker — przed β (rebuild wg ADR 0011)

**Data:** 2026-07-21 (rewizja — **P8 green**)  
**Polityka:** [ADR 0011](../../adr/0011-ui-parity-behavior.md) — parity = **zachowanie**, nie inventarz.  
**Freeze α8:** [report-alpha8-code-freeze.md](./report-alpha8-code-freeze.md) — engineering zamknięty.  
**SSOT luk:** [report-v4-v5-gap-audit.md](./report-v4-v5-gap-audit.md) — P0 TE/AD/CL poniżej.  
**Referencja:** `STAGESYNC-APP-LEGACY` (`timeline.js`, `timeline.css`, `song-maps.js`, `timeline-touch.js`).  
**Werdykt:** **P8 green (2026-07-21)** — wejście β1 **na prośbę** (Docker/Tauri). Bez samowolnego tagu `5.0.0-beta.*`. Etap α9 must = **wydany** (`v5.0.0-alpha.9`).

**Pełny audyt + UI-diff:** [report-v4-v5-parity-audit.md](./report-v4-v5-parity-audit.md) ·
[report-v4-v5-ui-diff-inventory.md](./report-v4-v5-ui-diff-inventory.md)
(P0 aneksu **fixed** w kodzie: **TL-R-03/04** snap beat, **TL-R-06/07/08** wskaźniki;
P1: **TL-T-05**, **TL-Z-01…03**, **TL-M-04/07/08** — **PO verified**).

### P0 — status po α8 freeze + P8

| ID | Temat | Status | Etap |
|----|-------|--------|------|
| **TE-01 / 03–06** | Marquee + multi-select + multi-drag | **PO verified** | α9 P8 |
| **TE-08 / KB-20** | Clipboard ⌘C/X/V/D | **PO verified** | α9 P8 |
| **TE-19 / 22** | Countdown canvas length + shift treści | **PO verified** | α9 P8 |
| **CL-01 / 04 / 05** | Karaoke beat; grid cycle; Forma bar progress | **PO verified** (C1) | **α9** |
| **AD-01…03** | Transpozycja / Lead / Edycja — API + Live Desk | **deferred** (footer stuby usunięte; brak atrapy) | **β2** — nie bloker α9 |

**CL-P0** + **C1** + **P8** = green. Playbook: [report-po-smoke-p8.md](./report-po-smoke-p8.md).

## Audyt Timeline (v4 → v5) — fakty

| Temat | v4 | v5 dziś | Sev |
|-------|----|---------|-----|
| **Grid taktów** | Barlines zawsze (`iterBarBoundaries` + meterMap); na ruler **beat ticks** gdy `pxb ≥ 56` | `iterBarBoundariesTicks` + meterMap; ruler + lane beat @ ≥56; **pre-roll CD** bar/beat | **P0** PO ✓ |
| **Snap Forma** | `snapAbsToBarStart` (miary taktu) | `snapEditTicks` bar = musical barlines (`iterBarBoundariesTicks` + meterMap); Cmd/Ctrl = off | **P0** PO ✓ |
| **Drag / overwrite** | Move/resize + finalize cover-delete; pencil overwrite | Path wired: Forma bar + content beat snap; pencil `insertSpanOverwrite`; edge hit 12px | **P0** PO ✓ |
| **Mapy T/M/K** | SongMaps pełny workflow | Insert/edit/drag + beat snap; eraser chroni seed @ 0 | **P0** PO ✓ |
| **Zoom H** | `pxPerBar` + anchored scroll | `effectiveZoomH = zoomH × uiScale` | **P0** PO ✓ |
| **Zoom V** | `--tl-lane-height` | `--tl-row-h` = `zoomV × uiScale` | **P0** PO ✓ |
| **Zoom UI** | `--tl-ui-scale` mnoży H + lane | `--tl-zoom-ui` chrome + mnoży effective H/V | **P0** PO ✓ |
| **Suwaki niebieskie** | `accent-color: --ss-accent` (amber) | `accent-color: var(--ss-color-primary)` na range | **P1** OK |
| **Zoom tool** | Drag H (+ pinch touch) | **usunięte** z strip; suwaki H/V/UI + Ctrl/Meta+wheel | **OUT** |
| **Help** | `min(72rem)`, max ~56rem, accent chrome | `.helpOverlayPanel` ~72rem / 56rem; polish + skróty v4 → Should | **P1** Should |
| **Metadane** | ⓘ → inspector sheet (title w pickerze) | ⓘ → year + editable meter/key @ 0 | **P1** PO ✓ |
| **Header layout** | Grid: brand \| **center song** \| actions; ≤1100 controls pod | CSS grid + `@media (max-width: 1100px)` | **P1** OK |
| **Toolbar center** | tools \| **center transport+BBT+meta** \| right | `.toolbarCenter` grid | **P1** PO ✓ |
| **Playhead / loop kolory** | Amber locator / cyan MIDI | Locator `primary`; playheadMidi `info` (overlay MIDI → β2) | **P1** PO ✓ |
| **Locator / loop snap** | `quantizeAbsBeat` | `snapEditTicks` / `snapLoopRange` @ **beat** (+ Cmd off); loop snap **na podglądzie** | **P0** PO ✓ |
| **Mobile / tablet** | `data-tl-tier`; mobile RO; tablet nudge | `timelineTouchTier` + `data-tl-tier`; mobile RO; tablet ◀▶ nudge | **P2** OK |

## Bramka (wejście β — wszystkie muszą być green)

| # | Kryterium | Status |
|---|-----------|--------|
| **T-grid** | meterMap barlines + ruler beat ticks @ ≥56 px/bar | **PO verified** |
| **T-zoom** | H + V + UI naprawdę skalują (UI×H/V); accent amber | **PO verified** |
| **T-gest** | Forma/content move/resize/pencil + snap — **oraz** multi-select/marquee (TE-01…06) + clipboard | **PO verified** |
| **T-maps** | Tempo/Metrum/Tonacja SongMaps depth | **PO verified** |
| **T-loc** | Locator/loop snap @ **beat**; follow; transport; wskaźniki primary/info | **PO verified** |
| **T-chrome** | Header + toolbar center + help size; bez cyan-as-brand | **PO verified** |
| **C1** | Client treść ról | **PO verified** |
| **A1** | Admin Set + song pick w jednym flow | **PO verified** |
| **P8** | Sign-off PO | **green 2026-07-21** — [playbook](./report-po-smoke-p8.md) |
| **Migrator** | α9 MVP | **code** (M1–M9) |

## Świadome OUT

| Temat | Uwagi |
|-------|--------|
| git-apply | ADR 0004 — nigdy |
| Audio playback | → β2 |
| Host MIDI | → **β2** (ROADMAP / ADR 0008; nie β1) |
| AD-01…03 Live Desk korekt | → **β2** (API ABSENT; nie atrapa) |
| Docker / Tauri | → β1 (na prośbę po P8) |
| Clone chrome v4 | zakaz ADR 0011 |
| Pinch / fit zoom | Should po P0 |
| Różdżka (wand) UI | ukryta do naprawy (smoke 2026-07-21) |

## Smoke checklist (T-loc / chrome / meta)

- [x] Scrub locator → kwantyzacja do **beatu**; Cmd/Ctrl = off
- [x] Loop region na linijce → bounds @ beat
- [x] Play: yellow locator follows; **brak** linii playhead gdy pause; CSS playhead = `info`, locator = `primary`
- [x] Toolbar: BBT / transport / Tempo·Metrum·Tonacja **wyśrodkowane**
- [x] Zoom UI zmienia framing H+V (nie tylko chrome fonts)
- [x] Meta ⓘ: year + editable metrum + tonic/mode @ 0 → Zapisz → reload

## Następne kroki

1. ~~PO smoke P8~~ **green 2026-07-21**.
2. Tag / bump `5.0.0-alpha.9` — na prośbę.
3. β1 host (Docker + Tauri) — **na prośbę**.
4. Should: Help + skróty v4; przywrócenie Różdżki po fix.

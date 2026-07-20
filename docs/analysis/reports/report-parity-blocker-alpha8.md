# Parity blocker — przed β (rebuild wg ADR 0011)

**Data:** 2026-07-20 (rewizja — audyt v4↔v5 Timeline: grid / zoom / gesty / chrome)  
**Polityka:** [ADR 0011](../../adr/0011-ui-parity-behavior.md) — parity = **zachowanie**, nie inventarz.  
**Referencja:** `STAGESYNC-APP-LEGACY` (`timeline.js`, `timeline.css`, `song-maps.js`, `timeline-touch.js`).  
**Werdykt:** **NIE** gotowe. „Wired” ≠ usable. PO nie musi wymieniać każdej luk — poniżej audyt.

## Audyt Timeline (v4 → v5) — fakty

| Temat | v4 | v5 dziś | Sev |
|-------|----|---------|-----|
| **Grid taktów** | Barlines zawsze (`iterBarBoundaries` + meterMap); na ruler **beat ticks** gdy `pxb ≥ 56` | `iterBarBoundariesTicks` + meterMap; ruler beat ticks @ ≥56; lane = barlines only | **P0** → smoke |
| **Snap Forma** | `snapAbsToBarStart` (miary taktu) | `snapEditTicks` bar = musical barlines (`iterBarBoundariesTicks` + meterMap); Cmd/Ctrl = off | **P0** → smoke |
| **Drag / overwrite** | Move/resize + finalize cover-delete; pencil overwrite | Path wired: Forma bar + content beat snap; pencil `insertSpanOverwrite`; edge hit 12px | **P0** → smoke |
| **Mapy T/M/K** | SongMaps pełny workflow | Insert/edit/drag + beat snap; eraser chroni seed @ 0 | **P0** → smoke |
| **Zoom H** | `pxPerBar` + anchored scroll | Działa (jedyny realny) | OK częściowo |
| **Zoom V** | `--tl-lane-height` | `--tl-row-h` napędza `.trackRow` / dock / lane | **P0** → smoke |
| **Zoom UI** | `--tl-ui-scale` mnoży H + lane | `--tl-zoom-ui` (unitless) na ruler / dock / clip chrome | **P0** → smoke |
| **Suwaki niebieskie** | `accent-color: --ss-accent` (amber) | `accent-color: var(--ss-color-primary)` na range | **P1** OK |
| **Zoom tool** | Drag H (+ pinch touch) | `disabled` + Help bez kłamstwa; suwaki H/V/UI | **P1** OK |
| **Help** | `min(72rem)`, max ~56rem, accent chrome | `.helpOverlayPanel` ~72rem / 56rem; bez min-width konfliktu | **P1** OK |
| **Metadane** | ⓘ → inspector sheet (title w pickerze) | ⓘ → inspector; close clears `songMetaOpen` | **P1** OK |
| **Header layout** | Grid: brand \| **center song** \| actions; ≤1100 controls pod | CSS grid + `@media (max-width: 1100px)` | **P1** OK |
| **Playhead / loop kolory** | Amber / spójne | Playhead `primary`; locator już primary | **P1** OK |
| **Mobile / tablet** | `data-tl-tier`; mobile RO; tablet nudge | `timelineTouchTier` + `data-tl-tier`; mobile RO; tablet ◀▶ nudge | **P2** OK |

## Bramka (wszystkie open do smoke)

| # | Kryterium | Status |
|---|-----------|--------|
| **T-grid** | meterMap barlines + ruler beat ticks @ ≥56 px/bar | **code** — czeka PO smoke |
| **T-zoom** | H + V + UI naprawdę skalują; accent amber | **code** — czeka PO smoke |
| **T-gest** | Forma/content move/resize/pencil + snap bar/beat — PO smoke | **code** — czeka PO smoke |
| **T-maps** | Tempo/Metrum/Tonacja SongMaps depth | **code** — czeka PO smoke |
| **T-loc** | Locator / loop / follow / transport | **open** |
| **T-chrome** | Header center + help size + bez cyan drift | **code** — czeka PO smoke |
| **C1** | Client treść ról | **code** — czeka PO smoke |
| **A1** | Admin Set + song pick w jednym flow | **code** — czeka PO smoke |
| **P8** | Sign-off PO | **open** — blokuje β |

## Świadome OUT

| Temat | Uwagi |
|-------|--------|
| git-apply | ADR 0004 — nigdy |
| Audio playback | → β2 |
| Host MIDI | → β1 |
| Docker / Tauri | → β1 |
| Clone chrome v4 | zakaz ADR 0011 |
| Pinch / fit zoom | Should po P0 |

## Następne kroki (kolejność implementacji)

1. **Canvas readable:** grid meterMap + beat ticks; Zoom V/UI wired; `accent-color: primary`.
2. **Gesty:** Forma snap do taktów + smoke; content overwrite; maps.
3. **Chrome feel:** header center (nie clone markup); help sizing jak proporcje v4; playhead amber.
4. Client treść → Admin IA.
5. Tablet/mobile tiers (port logiki z `timeline-touch.js`, nie HTML 1:1).

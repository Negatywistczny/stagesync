# Triage: Reguły UI dla Cursor V5 (gęstość / touch / APCA)

**Źródło:** [Reguly-UI-dla-Cursor-V5.md](./Reguly-UI-dla-Cursor-V5.md)  
**Status:** `archive`
**Obszar:** Design system / gęstość / a11y kontrast  
**Data triage:** 2026-07-24 (zamknięte smoke UI-01/07)

## Werdykt przydatności

**Provenance — wchłonięte.** Dump był wejściem do [ui-density.mdc](../../../../.cursor/rules/ui-density.mdc) + `--ss-*`. Po smoke: brak backlogu implementacji. Nie wklejać do `.cursorrules`; nie zmieniać palety / skali typografii wg dumpu.

## Rozstrzygnięte

| ID | Temat | Stan | Dowód |
|----|--------|------|--------|
| — | 4/8pt, anti-dead-space, HEX ban, anti-halation, touch 36/44, sticky-hover | `fixed` | ui-density + tokens |
| UI-01 | MCP 72/120px z dumpu | `rejected` | `--mixer-strip-w: calc(84px * zoom)` w `ChannelStripControls.module.css` |
| UI-07 | Toolbar dokładnie 48px | `fixed` | Timeline L1: `min-height: var(--ss-space-12)`; reguła w ui-density |
| UI-02 | Panic ≥ 64px MIL-STD | `limit` | 36/44 świadomie |
| UI-03 | Perfect Fourth px scale | `rejected` | `docs/ui/typography.md` |
| UI-04 | Ink/teal/grandMA rainbow | `rejected` | ADR 0011 / `docs/ui/colors.md` |
| UI-05 | Opacity 0.87 Material | `limit` | solid `--ss-color-text*` |
| UI-06 | `grid-auto-flow: dense` globalnie | `rejected` | Nie egzekwować globalnie; opcjonalnie lokalnie przy kartach |

## Następny krok

Brak — dokument archiwalny. Delty produktowe tylko przez PO + zmianę tokenów/`--mixer-strip-w`, nie przez ten dump.

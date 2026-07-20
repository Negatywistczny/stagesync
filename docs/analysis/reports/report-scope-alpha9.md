# Scope alpha.9 — Migrator + dokończenie rebuild

**Wersja docelowa:** `5.0.0-alpha.9` (kod MVP migratora już w drzewie; bump/tag na prośbę)  
**Podstawa:** [ROADMAP.md](../../ROADMAP.md) · [TODO.md](../../TODO.md) · [ADR 0002](../../adr/0002-timebase-ssot.md) · [ADR 0005](../../adr/0005-domain-axioms.md) · [α8 freeze](./report-alpha8-code-freeze.md)  
**Fixture:** [docs/examples/legacy/database.sample.json](../../examples/legacy/database.sample.json)

## Cel

1. Użytkownik z `database.json` (4.x) może **zaimportować utwory** do układu v5 bez dual-write i bez cichej naprawy.
2. Domknięcie residual z α8 freeze: **PO smoke** + Client **CL-01/04/05**.

## IN (must) — Migrator

| # | Wycinek | Done |
|---|---------|------|
| M1 | Scope report (ten plik) | ✓ |
| M2 | Pure `migrateLegacySong` / `migrateLegacyDatabase` w `@stagesync/shared` | ✓ |
| M3 | Axis shift + `absBeatToTicks` (`Math.round(startAbs * PPQ)`) | ✓ |
| M4 | Mapowanie: Forma (+ note), tempo/meter/key maps, Tekst, Akordy, Cue, scoreBarMap, metadata | ✓ |
| M5 | Zod fail-fast na wyjściu (`ProjectSchema`) | ✓ |
| M6 | Vitest happy + broken path | ✓ |
| M7 | CLI `--dry-run` / `--apply` + shadow `.bak` | ✓ |
| M8 | Docs użytkownika [MIGRATION.md](../../MIGRATION.md) | ✓ |
| M9 | Fixtures / smoke na typowej bazie 4.x + regresja Admin import | ✓ |

## IN (must) — Residual parity (z α8 freeze)

| # | Wycinek | Done |
|---|---------|------|
| R1 | PO smoke T-gest / T-loc / T-zoom / T-maps / T-chrome / A1 | ☐ |
| R2 | **CL-01** Karaoke beat / bar highlight | ✓ |
| R3 | **CL-04** Grid full cycle / multi-bar | ✓ |
| R4 | **CL-05** Forma / drums bar progress | ✓ |
| R5 | **P8** Sign-off PO (blokuje β) | ☐ |

## OUT (świadome)

| Temat | Uwagi |
|-------|--------|
| MusicXML / cover file copy | Tylko refs w JSON jeśli kiedyś; pliki ręcznie |
| Audio tracks / playback | β2 |
| AD-01…03 Live Desk korekt | β2 |
| Dual-write do `database.json` | Nigdy |
| Pełny round-trip v5→4.x | OUT |
| UI wizard w Admin | CLI + import pack wystarczy; pełny wizard optional |

## Reguła osi (kontrakt)

```
shiftQuarters = startAbs pierwszej sekcji nie-Countdown
startTicks = round((startAbs - shiftQuarters) * PPQ)
```

Countdown → `kind: countdown`, `startTicks ≤ 0`.

## Bramka względem β1

[parity-blocker](./report-parity-blocker-alpha8.md) (P8 + CL-P0 + CI) **oraz** migrator MVP (M1–M9) muszą być green przed tagiem `5.0.0-beta.*`.  
α8 code freeze **nie** uprawnia do β.

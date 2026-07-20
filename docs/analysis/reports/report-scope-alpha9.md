# Scope alpha.9 — Migrator legacy 4.x → v5

**Wersja docelowa:** `5.0.0-alpha.9` (kod może wejść przed tagiem; **β1** wymaga tego MVP + green parity)  
**Podstawa:** [ROADMAP.md](../../ROADMAP.md) · [TODO.md](../../TODO.md) · [ADR 0002](../../adr/0002-timebase-ssot.md) · [ADR 0005](../../adr/0005-domain-axioms.md)  
**Fixture:** [docs/examples/legacy/database.sample.json](../../examples/legacy/database.sample.json)

## Cel

Użytkownik z `database.json` (4.x) może **zaimportować utwory** do układu v5 (`data/projects/<id>/project.json` + library/setlist) bez dual-write i bez cichej naprawy.

## IN (must)

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

## OUT (świadome)

| Temat | Uwagi |
|-------|--------|
| MusicXML / cover file copy | Tylko refs w JSON jeśli kiedyś; pliki ręcznie |
| Audio tracks / playback | β2 |
| Dual-write do `database.json` | Nigdy |
| Pełny round-trip v5→4.x | OUT |
| UI wizard w Admin | CLI wystarczy na α9; Admin UI optional później |

## Reguła osi (kontrakt)

```
shiftQuarters = startAbs pierwszej sekcji nie-Countdown
startTicks = round((startAbs - shiftQuarters) * PPQ)
```

Countdown → `kind: countdown`, `startTicks ≤ 0`.

## Bramka względem β1

Parity UI ([report-parity-blocker-alpha8.md](./report-parity-blocker-alpha8.md)) **oraz** ten migrator MVP muszą być green przed tagiem `5.0.0-beta.*`. Sign-off PO nadal wymagany dla Timeline smoke.

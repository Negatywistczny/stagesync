# Scope 5.4 — Syllables (fundament timed lyrics + Ingest)

**Wersja:** `5.4.x` — **Syllables**  
**Podstawa:** [ROADMAP.md../../../../ROADMAP.md) · [TODO.md../../../../TODO.md) · [ADR 0002../../../../architecture/adr/0002-timebase-ssot.md) · [ADR 0005../../../../architecture/adr/0005-domain-axioms.md) · [ADR 0011../../../../architecture/adr/0011-ui-parity-behavior.md) · [ADR 0018../../../../architecture/adr/0018-future-audio-architecture.md) §4 · triage [Architektura ingestii](../../inspiracje/specyfikacje/Architektura-Ingestii-Danych-Muzycznych-StageSync.triage.md)  
**Bramka wejścia:** linia **5.3** Colors & Channels wydana (`v5.3.0`+); residual ops / G1–G10 nie blokują startu schemy  
**Status (2026-08-05):** **wydane `v5.4.5`** — Smart Tempo 5.5 MIR engine (Multi-Window Section Mapping, Sub-frame Parabolic Peak Interpolation, Downbeat Kick Lock, >99.5% reduction in cumulative phase drift) + Schema V6 + UltraStar Ingest.

## Cel

Jeden hero **Syllables**: timed lyrics (sylaby w tickach) + **widoczny** import UltraStar → Karaoke — bez powierzchni imprezowej (`/karaoke` TV) i bez nowego silnika audio.

1. **Bump `formatVersion`** + migrator V5→V6 w storage / API / Zod (**done na `main`**).
2. **Lyrics AST w tickach** — kanon pozycji = integer ticks + PPQ ([ADR 0002../../../../architecture/adr/0002-timebase-ssot.md)); ms tylko na krawędzi parsera.
3. **Opcjonalne role** wokalu w schemacie (`vocal_1` / `vocal_2` / `backing` / `all`) — UI Client filter może być minimalny.
4. **Opcjonalna melodia** (pitch MIDI) jako domena danych — pełny render Client = Later jeśli nie must cutu.
5. Client Karaoke / Grid: **highlight po sylabach** gdy dane są (zachowanie, nie nowe okno TV) (**done na `main`**).
6. **Ingest (must cutu):** Pure parser UltraStar → ticks → `tekst` (+ melody); Text-Anchor Bridging dopiero ze golden fixtures; UG/ChordPro zostaje.

## Kontrakt IN / OUT

| IN 5.4                                                                               | OUT 5.4                                                                                                                      |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `formatVersion` bump + migrator bez milczącej utraty `tekst` / `akordy` / audio      | Osobny `StageSyncSongAST` jako drugi SSOT w storage                                                                          |
| Sylaby / word blocks: `startTicks` + `lengthTicks` (+ tekst)                         | Czas w ms jako kanon storage                                                                                                 |
| Opcjonalne `role` na liniach / blokach                                               | Widok publiczny `/karaoke` (TV) — **6.1**                                                                                    |
| Opcjonalna ścieżka melodii w schemacie                                               | Guest `/request` / Jukebox queue — **6.1**                                                                                   |
| Provenance opcjonalnie (`isAutoPlaced` / `isUserOverridden`) — gdy PO chce re-import | Cloud AI / zewnętrzne API ingestii                                                                                           |
| Client: highlight timed lyrics na istniejącym `/client` Karaoke                      | InputStrip / Audio Suite / automation / recording ([ADR 0018../../../../architecture/adr/0018-future-audio-architecture.md)) |
| UltraStar → ticks → `tekst` (+ melody); bridging US+UG gdy fixtures                  | Atrapy UI „na zapas” ([ADR 0011../../../../architecture/adr/0011-ui-parity-behavior.md) §1a)                                 |
| Testy shared Zod + migrator golden (+ ścieżka importu przy cutcie)                   | Osobny hero / tag tylko za schema V6                                                                                         |

## IN (must) — orientacja

| #   | Wycinek                                                                          | Notatka                                                       |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| C1  | Zod: rozszerzenie `tekst` (lub równoważny Lyrics AST) o bloki sylabowe w tickach | **na `main`**                                                 |
| C2  | Migrator: V5 linie → V6 (np. jeden block = cała linia)                           | Fail-fast Zod na krawędzi; bez cichej naprawy — **na `main`** |
| C3  | Role wokalu w schemacie (opcjonalne pola)                                        | Render filter Client = Should / minimal                       |
| C4  | Melody track / clips (opcjonalne)                                                | Bez wymogu UI edycji w 5.4                                    |
| C5  | Client Karaoke/Grid: sync highlight do bloków gdy obecne                         | **na `main`**; H-01 throttle = residual osobny                |
| C6  | Testy `packages/shared` + ścieżka PUT projektu                                   | Parity runtime Admin/Timeline gdy inspector pokazuje tekst    |
| I1  | Pure parser UltraStar → ticks → `tekst` (+ melody)                               | **Must cutu** — widoczny Ingest; bez cloud AI                 |
| I2  | Text-Anchor Bridging (US+UG)                                                     | Dopiero ze golden fixtures                                    |
| I3  | UG/ChordPro zostaje                                                              | MusicXML/MIDI jako siatka taktowa = Later                     |

## OUT (świadome)

- `/karaoke` zero-chrome, Idle/QR, Up Next — **6.1** ([#824](https://github.com/kacperczeczot/stagesync/issues/824); dawne „7.0”)
- Pitch & FX — **5.5**
- Live Input, Suite, automation lanes, MIDI Patch Matrix, recording — **6.0 Live Suite**
- Cloud AI / zewnętrzne API ingestii
- Heurystyki szerokości znaków / spacji monospaced (zakaz utrzymany)
- Osobny cut „Content Model 5.4.0” tylko za schema — **nie** (PO 2026-08-02)

## Zależności i następny etap

```
5.4 Syllables (schema + Ingest)  →  5.5 Pitch & FX  →  6.0 Live Suite  →  6.1 Karaoke & Jukebox
```

Cut **5.4.0** dopiero gdy operator widzi UltraStar → Karaoke. Po cutcie: scope **5.5 Pitch & FX**. Schema V6 na `main` = fundament, nie osobny hero.

## Ryzyka

1. Zbyt bogaty AST przed Ingestem — trzymaj MVP: bloki timed + role optional; melody optional.
2. Pomyłka ms vs ticks przy kopiowaniu z dumpu Gemini — **REVISE** w triage (ING-04).
3. Re-import overwrite bez provenance — decyzja PO przed C4 flags.
4. Wdrażanie parsera „przy okazji” bez golden fixtures — bridging dopiero z corpus.

## Powiązane

- [ROADMAP../../../../ROADMAP.md) · [TODO../../../../TODO.md) · [ADR 0018../../../../architecture/adr/0018-future-audio-architecture.md)
- Epik Karaoke: [#824](https://github.com/kacperczeczot/stagesync/issues/824) (**6.1**, nie 7.0)
- Triage ingestii: [Architektura-Ingestii-Danych-Muzycznych-StageSync.triage.md](../../inspiracje/specyfikacje/Architektura-Ingestii-Danych-Muzycznych-StageSync.triage.md)

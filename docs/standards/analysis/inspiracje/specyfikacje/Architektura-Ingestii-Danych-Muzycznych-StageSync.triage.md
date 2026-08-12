# Triage: Architektura ingestii danych muzycznych (Parallel Track AST)

**Źródło:** [Architektura-Ingestii-Danych-Muzycznych-StageSync.md](./Architektura-Ingestii-Danych-Muzycznych-StageSync.md) (Gemini / AI Exporter)  
**Status:** `open`  
**Obszar:** Import offline — UltraStar · ChordPro/UG · MusicXML/MIDI jako siatka · mapowanie do Timeline (Forma / Tekst / Akordy / Cue / melodia)  
**Data triage:** 2026-07-31  
**Kąt:** spec wprowadzenia feature **5.2+ / później** — nie SSOT; nie claim Done  
**Companion:** [ADR 0002../../../../architecture/adr/0002-timebase-ssot.md) · `packages/shared` [`ug-import.ts`](../../../../../packages/shared/src/import/ug/ug-import.ts) / [`schema.ts`](../../../../../packages/shared/src/project/schema.ts)

## Werdykt przydatności

**Wysoka jako mapa domeny ingestii — niska jako gotowy kontrakt TypeScript.** Dump dobrze rozdziela 5 warstw (forma / tekst+rytm / melodia / akordy / cue) i **zakazuje** heurystyk szerokości znaków oraz cloud API — to jest zgodne z kierunkiem produktu (offline/LAN, determinizm).

**Hard conflict z SSOT repo:** kanoniczna pozycja w StageSync to **integer ticks + PPQ** (ADR 0002), nie `startTimeMs` / `durationMs` w storage. Proponowany `StageSyncSongAST` to **osobny IR** — wolno go trzymać tylko jako wynik parserów na krawędzi, potem mapować do `Project` (`forma` / `tekst` / `akordy` / `cue` / ewentualnie nowa ścieżka melodii). Nie wdrażać AST z ms jako drugiego SSOT czasu.

**Już częściowo on-tree:** ChordPro-lite / Plain CRD → Forma + Tekst + Akordy (`importUgText`, UG fetch). UltraStar lexer → ticks + melody. **Text-Anchor Bridging (US+UG)** — [`text-anchor-bridge.ts`](../../../../../packages/shared/src/text-anchor-bridge/text-anchor-bridge.ts) + wizard Import US+UG. **Brak w produkcie:** MusicXML/MIDI jako autorytet siatki taktowej; flagi `isAutoPlaced` / `isUserOverridden` w schemacie.

## Macierz hipotez

| ID     | Temat                                                                                     | Priorytet | Stan                   | Notatka                                                                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------- | --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ING-01 | Zakaz heurystyk szerokości znaków / spacji monospaced                                     | P0        | `confirmed` (kierunek) | Zgodne z duchem `ug-import` (onsets / bars, nie px). Utrzymać przy każdym nowym parserze.                                                                    |
| ING-02 | Offline / LAN; bez cloud AI / zewnętrznych API ingestii                                   | P0        | `confirmed` (kierunek) | Zgodne z hostem lokalnym; UG fetch to opcjonalny fetch HTML, nie model AI.                                                                                   |
| ING-03 | 5 warstw: form / lyrics / melody / chords / cue                                           | P0        | `hypothesis`           | Mapowanie do istniejącego `Project`: forma≈form, tekst≈lyrics, akordy≈chords, cue≈cue; **melody = nowa domena** (UltraStar pitch).                           |
| ING-04 | Storage / IR w **ms** (`startTimeMs`, …)                                                  | P0        | `limit` / **REVISE**   | ADR 0002: ticks. Przeliczać ms↔ticks na krawędzi parsera; nie persistować ms jako kanonu.                                                                    |
| ING-05 | Osobny `StageSyncSongAST` jako format projektu                                            | P1        | `limit` / **REVISE**   | Nie zastępować Zod `ProjectSchemaV5`. AST = transient IR importu → `apply*ToProject`.                                                                        |
| ING-06 | UltraStar (`.txt` / USDX): `#GAP`, `#BPM`×4, pitch+60, `: * R G F - E`, duety `#P1`/`#P2` | P1        | `hypothesis`           | Brak w monorepo. Wymaga decyzji PO + nowy pure parser w `packages/shared`.                                                                                   |
| ING-07 | Text-Anchor Bridging (Needleman–Wunsch słowo→sylaba UltraStar)                            | P1        | `hypothesis`           | Sensowne dopiero gdy UltraStar + UG są w produkcie. Koszt / floaky alignment — prototype + golden fixtures.                                                  |
| ING-08 | Synco-pull quantization (`isAnticipationSynco`)                                           | P2        | `hypothesis`           | Muzykologicznie ciekawe; nie blokuje MVP importu. Flagi poza obecnym schematem akordu.                                                                       |
| ING-09 | Default Grid Placement (sekcje beztekstowe Solo/…)                                        | P1        | `hypothesis`           | Częściowy overlap z dzisiejszym rozkładem akordów w `ug-import` (brak kotwicy czasowej). Nie dublować bez porównania z dyskiem.                              |
| ING-10 | `isAutoPlaced` / `isUserOverridden` na akordach                                           | P2        | `hypothesis`           | Brak w schemacie; przyda się przy re-import — decyzja PO + migracja Zod.                                                                                     |
| ING-11 | MusicXML / MIDI / ABC jako SSOT siatki taktowej                                           | P2        | `hypothesis`           | MusicXML już jako `asset.kind: musicxml` (score); **nie** napędza metrum/Formy przy imporcie akordów. MIDI PPQ blisko ticks — potencjalny most, osobny epic. |
| ING-12 | Claim runtime &lt; 15 ms na utwór (Node/Tauri/browser)                                    | P2        | `hypothesis`           | Nie weryfikować w triage; dopiero po parserze + bench.                                                                                                       |

## Co już jest na dysku (nie wdrażać drugi raz)

| Warstwa dumpu                                  | Stan w v5                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| ChordPro / Plain CRD → sekcje + akordy + tekst | `importUgText` / `applyUgImportToProject` / UG HTTP                      |
| Cue jako instrukcje sceniczne                  | `cue.clips` + sampler (osobny epic); nie pełny parser `{c:…}` z ChordPro |
| MusicXML                                       | Upload asset + rola score; nie Parallel AST                              |
| Melodia wokalna (pitch)                        | Brak ścieżki produktowej                                                 |
| UltraStar                                      | Brak                                                                     |

## Sprzeczności / ryzyka

1. **Czas ms vs ticks** — największy błąd kopiuj-wklej z dumpu do kodu.
2. **UltraStar `#BPM` ×4** — łatwo pomylić z metronomowym BPM projektu; parser musi dokumentować i testować offset.
3. **Łączony import US+UG** bez golden corpus = flaky product; nie shipować Text-Anchor bez fixtures.
4. **Nie wrzucać do TODO** całych ING-06…12 dopóki wiersz nie jest `confirmed` (repro / PO).

## Następny krok eng / PO

1. **PO:** czy UltraStar / melodia wokalna wchodzi w linię 5.2+ / 5.3+, czy później?
2. **Eng (gdy PO otworzy):** spike pure `ultrastar-parse` → ticks + mapowanie do `tekst` (+ opcjonalna melodia); **bez** nowego AST w storage.
3. **Nie** otwierać Text-Anchor / synco-pull / MusicXML-as-grid bez decyzji PO i bez ING-06.
4. Przy ewaluacji ChordPro-only: porównać Default Grid z obecnym `ug-import` (ING-09) — uniknąć drugiej ścieżki tego samego zachowania.

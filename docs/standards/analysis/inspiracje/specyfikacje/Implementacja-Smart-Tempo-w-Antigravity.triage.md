# Triage: Implementacja Smart Tempo w Antigravity

**Źródło:** [Implementacja-Smart-Tempo-w-Antigravity.md](./Implementacja-Smart-Tempo-w-Antigravity.md) (Gemini / Antigravity / AI Exporter, ~2026-08)  
**Status:** `partial`  
**Obszar:** Smart Tempo Adapt · ODF sub-bas · ACF · Viterbi · sparsyfikacja · benchmark drift  
**Data triage:** 2026-08-05  
**Kąt:** blueprint implementacyjny Antigravity vs kod **5.4.2** — nie SSOT; nie claim Done / green PO  
**Companion:** [Dynamic-Tempo-Mapping-Technical-Blueprint.triage.md](./Dynamic-Tempo-Mapping-Technical-Blueprint.triage.md) · [ADR 0015../../../../architecture/adr/0015-daw-reference-and-product-decisions.md) § Smart Tempo · [ADR 0002../../../../architecture/adr/0002-timebase-ssot.md) · [ADR 0008../../../../architecture/adr/0008-timeline-clip-editing.md) / [ADR 0017../../../../architecture/adr/0017-live-show-control-contracts.md) (Flex OUT 5.x) · [`packages/shared/src/smart-tempo.ts`](../../../../../packages/shared/src/smart-tempo/smart-tempo.ts) · `apps/web/src/lib/audioTempoAnalysis.ts` · `apps/web/src/lib/smartTempoBenchmark.test.ts` · [ROADMAP 5.4.2../../../../ROADMAP.md) · [TODO../../../../TODO.md)

## Werdykt przydatności

**Wysoka jako dokumentacja potoku już w dużej mierze na dysku** (Adapt-only, PCM 1.0× free-run, ticks/PPQ, sub-bas ODF, ACF + prior Gaussa, Viterbi-like path, sparsyfikacja downbeat, Drift Gate, `audioStartOffsetMs`/`trimInMs`, metryka `errorMs` + bariera t₀ ≤ 15 ms). Dobrze utrwala kontrakt produktowy: **Audio = SSOT wall-clock; mapa podąża — bez Flex / Keep-stretch**.

**Niższa jako backlog nowych feature:** dump opisuje stan zbliżony do cutu `v5.4.2` + szkic TS dla agenta; nie otwierać drugiego TODO „wdrożyć Smart Tempo”. Residual = **jakość mapy** (żywy perkusista → dryf sekundowy w bench) oraz **Later** (WASM/Essentia, stem sep, pełny Ellis DBN) — już w DTM triage.

**Hard reject / defer (overfitting):** wyniki bench dla konkretnych utworów (_Winner_, _Billie Jean_, …) oraz sugestie strojenia pod Winner BPM **nie** wchodzą do produktu SSOT. Seed BPM / prior = ogólny mid-tempo (na dysku center ~120, σ szerokie); testy: soft-diagnose w paśmie Logic, **bez** hardcodu BPM utworu ([`smart-tempo.test.ts`](../../../../../packages/shared/src/smart-tempo/smart-tempo.test.ts)).

## Macierz hipotez

| ID     | Temat                                                                          | Priorytet | Stan                                 | Notatka                                                                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------ | --------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AST-01 | Tylko **Adapt**; Keep / Flex Time OUT; PCM 1.0× free-run                       | P0        | `confirmed` / shipped 5.4.2          | = ADR 0015 Smart Tempo; Flex OUT ADR 0017. Zgodne z DTM-01/02/04.                                                                                                                         |
| AST-02 | Oś = **ticks** (PPQ 480); passive events na mapie                              | P0        | `confirmed`                          | ADR 0002; Zod `tempoMap`.                                                                                                                                                                 |
| AST-03 | Sub-bas LPF ~250 Hz + flux `3·low + 1·wide`                                    | P0        | `confirmed` / on-tree                | `analyzeFromMono` async path w [`audioTempoAnalysis.ts`](../../../../../apps/web/src/lib/audio/audioTempoAnalysis.ts).                                                                    |
| AST-04 | ACF 60–200 BPM + prior Gaussa (floor 0.45) vs octave error                     | P0        | `confirmed` / REVISE params          | Na dysku: `musicalPriorBpm` center **120**, σ **18** (dump: 121 / 15) — świadomie ogólny, nie song-band.                                                                                  |
| AST-05 | `estimateBpmFromBarHarmonics` (harmonika taktowa / kick)                       | P1        | `confirmed` / on-tree                | Używane przy low-end lock gdy brak seed.                                                                                                                                                  |
| AST-06 | Two-pass Viterbi + mediana IBI + EMA lokalnego okresu                          | P1        | `partial`                            | Dump: uproszczony nearest-onset „Viterbi”. Dysk: prawdziwszy DP (`buildBeatGridViterbi` + median IBI / period clamp). Brak pełnego Ellis DBN z kosztem $F(\Delta t,\tau_p)$ jak w DTM-06. |
| AST-07 | Interpolacja paraboliczna szczytów ACF/ODF                                     | P1        | `confirmed` / partial                | Obecna przy lag ACF; nie każdy onset.                                                                                                                                                     |
| AST-08 | Structural anchoring / $t_0$ → tick 0 + `trimInMs`                             | P0        | `confirmed`                          | `audioStartOffsetMs` + clip trim; override użytkownika chroniony.                                                                                                                         |
| AST-09 | Sparsyfikacja: downbeat-only, okno 4 beaty, Drift Gate, maxStep 5, quiet clamp | P0        | `confirmed`                          | `SMART_TEMPO_SPARSE_*` + `sparsifyTempoNodesFromBeatGrid` (quietTooLong + clamp maxStep).                                                                                                 |
| AST-10 | Metryka **Timestamp Drift** `errorMs(k)` + bariera t₀ ≤ 15 ms                  | P0        | `confirmed` / tooling                | `smartTempoBenchmark.test.ts`, [`record-benchmark.ts`](../../../../../apps/web/scripts/benchmark/record-benchmark.ts), generate dataset — nie claim green PO.                             |
| AST-11 | Bench 4 utworów (Survive / Winner / Billie / Teen Spirit) jako SSOT jakości    | P0        | `limit` / **reject as product SSOT** | Dataset OK do regresji lokalnej; **zakaz** wpinania Winner BPM / per-song hacks do silnika. Dryf żywej sekcji = residual jakości (Later), nie „brak Smart Tempo”.                         |
| AST-12 | Blueprint TS (`extractSubBass…`, `runTwoPassViterbi…`) jako kanon API          | P2        | `rejected` as SSOT                   | Szkic agenta; kanon = istniejące moduły shared/web. Nie drugi silnik.                                                                                                                     |
| AST-13 | WASM Essentia.js / STFT off-main-thread                                        | P2        | `hypothesis` / Later                 | = DTM-07; po bench vs obecny TS.                                                                                                                                                          |
| AST-14 | Stem separation ML przed ODF                                                   | P2        | `hypothesis` / Later 6.x+            | Pokrewne STEM w ADR 0018 — nie 5.5 must.                                                                                                                                                  |
| AST-15 | Pełny model bayesowski Ellis DBN (sekcje zwrotka/refren)                       | P2        | `hypothesis` / Later                 | = DTM-06 upgrade; nie otwierać TODO bez repro jakości.                                                                                                                                    |

## Co już jest na dysku (nie wdrażać drugi raz)

| Temat dumpu                          | Stan w v5                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Adapt-only Smart Tempo 5.4.2         | Wydane (`v5.4.2`); ADR 0015                                                            |
| Sub-bas dual-band flux               | [`audioTempoAnalysis.ts`](../../../../../apps/web/src/lib/audio/audioTempoAnalysis.ts) |
| ACF + musical prior + bar harmonics  | on-tree                                                                                |
| Beat path Viterbi-like + snap/scale  | `buildBeatGridViterbi` / `buildBeatGridAsync`                                          |
| Sparsyfikacja + Drift Gate + maxStep | [`smart-tempo.ts`](../../../../../packages/shared/src/smart-tempo/smart-tempo.ts)      |
| Beat 1 / trimInMs                    | Import + Beat Mapper                                                                   |
| Benchmark errorMs / ≤15 ms t₀        | testy + skrypty launch                                                                 |
| Keep / Flex stretch                  | **OUT 5.x**                                                                            |
| Essentia WASM / stem ML / full DBN   | **Brak** (Later)                                                                       |
| Per-song Winner BPM w SSOT           | **Zakaz**                                                                              |

## Sprzeczności / ryzyka

1. **Dump brzmi jak „do zbudowania”** — większość potoku **już jest**; czytaj jako provenance + checklista vs dysk, nie greenfield.
2. **„Viterbi” w dumpie ≠ pełny DP** — szkic `executeViterbiPass` jest słabszy niż kod na dysku; nie cofać implementacji do dumpu.
3. **Tabela bench ze średnim dryfem setek–tysięcy ms** przy „100 % na t₀” — nie mylić z green PO całej mapy; residual żywej sekcji rytmicznej zostaje w triage/Later.
4. **Gauss 121 BPM w dumpie** — nie utwardzać jako song-band; dysk celowo ~120 / szerokie σ.
5. **Nie** przenosić residual / bench / „bez stretch” do CHANGELOG ani docs operatorskich.

## TODO / ROADMAP

- **Nie** dodawać nowych `[ ]` „zaimplementuj Smart Tempo / Viterbi / sub-bas” — cut wydany; hipotezy AST-13–15 = `hypothesis` (reguła inspiracje: TODO tylko `confirmed`).
- Residual mostka Import US+UG — istniejący punkt w [TODO../../../../TODO.md) (higiena, nie drugi silnik tempa).
- Jakość mapy (żywy perkusista) / MIR upgrade — śledzić tu + [DTM triage](./Dynamic-Tempo-Mapping-Technical-Blueprint.triage.md); ewentualny Later po repro, nie Must 5.5.

## Następny krok eng / PO

1. Traktować dump jako **lustrzane provenance** cutu 5.4.2 + słownik stałych (`SMART_TEMPO_SPARSE_*`, bariera 15 ms).
2. **Nie** hardcodować BPM / węzłów pod Winner (ani inne utwory z tabeli).
3. Gdy PO chce lepszy lock na żywym groove: najpierw bench regresji vs Logic RTF **bez** song hacks → ewentualnie DTM-06/AST-15; potem dopiero Essentia (AST-13).
4. DTM companion: ten plik = warstwa implementacyjna; DTM = słownik MIR / Keep-Adapt-Auto.

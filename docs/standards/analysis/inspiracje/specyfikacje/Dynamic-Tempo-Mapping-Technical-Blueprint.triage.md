# Triage: Dynamic Tempo Mapping — blueprint MIR / Smart Tempo / Flex

**Źródło:** [Dynamic-Tempo-Mapping-Technical-Blueprint.md](./Dynamic-Tempo-Mapping-Technical-Blueprint.md) (Gemini / AI Exporter, 2026-08-03)  
**Status:** `partial`  
**Obszar:** Beat tracking · mapa tempa · Smart Tempo vs Flex · WASM/MIR w przeglądarce  
**Data triage:** 2026-08-03  
**Ostatnia aktualizacja:** 2026-08-03 (mapowanie na kod 5.4.2 + lukę free-run playback)  
**Kąt:** referencja algorytmiczna + UX Logic dla **5.4.2 Smart Tempo** — nie SSOT; nie claim Done  
**Companion:** [Implementacja-Smart-Tempo-w-Antigravity.triage.md](./Implementacja-Smart-Tempo-w-Antigravity.triage.md) (blueprint vs dysk 5.4.2) · [ADR 0015../../../../architecture/adr/0015-daw-reference-and-product-decisions.md) § Smart Tempo · [ADR 0002../../../../architecture/adr/0002-timebase-ssot.md) · [ADR 0008../../../../architecture/adr/0008-timeline-clip-editing.md) / [ADR 0017../../../../architecture/adr/0017-live-show-control-contracts.md) (Flex OUT 5.x) · [`packages/shared/src/smart-tempo.ts`](../../../../../packages/shared/src/smart-tempo/smart-tempo.ts) · `apps/web/src/lib/audioTempoAnalysis.ts` · `apps/web/src/lib/audioPlayback.ts` · [ROADMAP 5.4.2../../../../ROADMAP.md) · [TODO../../../../TODO.md)

## Werdykt przydatności

**Wysoka** jako słownik MIR (ODF → okresowość → Viterbi/DBN / „beat inertia”) i rozróżnienie Logic **Keep / Adapt / Auto** oraz Flex Time vs Smart Tempo. Dump dobrze ocenia wykonalność WWW (Essentia.js ≫ BeatNet ≫ „Beat This!”).

**Hard product conflict:** dump traktuje **Keep = agresywne time-stretch audio do sztywnej siatki** oraz Flex (Slicing / Phase Vocoder) jako integralną część architektury. W StageSync **5.x Flex / warp = permanent OUT** (ADR 0008 / 0017). Kanoniczny Smart Tempo **5.4.2** = mapa tempa **podąża za nagraniem** — to jest **Adapt**, nie Keep-with-stretch.

**Hard SSOT conflict:** proponowany `ITempoMap` z `timeSeconds` / `sampleIndex` jako węzłami mapy. Kanon pozycji StageSync = **ticks**; ms/sample tylko na krawędzi audio. Na dysku: `TempoNode.wallMs` + tick anchors ([`smart-tempo.ts`](../../../../../packages/shared/src/smart-tempo/smart-tempo.ts)); Zod `tempoMap` = ticks + BPM.

**Kontrakt Adapt (z dumpu → StageSync):** przy mapie podążającej za nagraniem **wall-clock pliku = ground truth**. Playhead i UI (Forma/tekst) idą po TempoMap; WebAudio odtwarza PCM **1.0× bez warp**. Jeśli mapa źle opisuje rubato, MP3 i wskaźnik **dryfują w trakcie play**, a **seek/stop twardo re-seekuje** offset (`SEEK_JUMP_TICKS` w [`audioPlayback.ts`](../../../../../apps/web/src/lib/audio/audioPlayback.ts)) — wygląda jak „nagle znowu synchro”. To nie Flex; to wymóg jakości mapy + ewentualnie osobna decyzja o korekcji playbacku (nie z tego dumpu jako Keep-stretch).

## Macierz hipotez

| ID     | Temat                                                                                   | Priorytet | Stan                        | Notatka                                                                                                                                                                                                                                                      |
| ------ | --------------------------------------------------------------------------------------- | --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DTM-01 | Tryb **Adapt**: globalna mapa śledzi rubato nagrania                                    | P0        | `confirmed` / shipped 5.4.2 | = Smart Tempo (ADR 0015). Import + Beat Mapper + `runAudioDrivenSmartTempo`. Jakość vs Logic na żywym groove = Later · [AST](./Implementacja-Smart-Tempo-w-Antigravity.triage.md).                                                                           |
| DTM-02 | Tryb **Keep**: stretch audio do sztywnej siatki                                         | P0        | `limit` / **OUT 5.x**       | Flex Time — ADR 0017. Nie otwierać w 5.4.2.                                                                                                                                                                                                                  |
| DTM-03 | Tryb **Auto** (Keep vs Adapt)                                                           | P2        | `hypothesis`                | Bez Keep-stretch: Auto = „buduj mapę vs flat BPM”.                                                                                                                                                                                                           |
| DTM-04 | Flex Time (Slicing / Phase Vocoder)                                                     | P0        | `limit` / **OUT 5.x**       | Referencja konkurencji; nie backlog 5.x.                                                                                                                                                                                                                     |
| DTM-05 | Storage `timeSeconds` / `sampleIndex` jako kanon                                        | P0        | `limit` / **REVISE**        | ADR 0002: ticks. Mapuj `ITempoNode` → `TempoEvent` / `TempoNode`.                                                                                                                                                                                            |
| DTM-06 | Pipeline ODF (multi-band / complex-domain) + ACF + **Viterbi / Ellis α** (beat inertia) | P1        | `partial`                   | Sub-bas dual-band + ACF + DP-ish `buildBeatGridViterbi` + sparsify/Drift Gate — on-tree (5.4.2; [AST triage](./Implementacja-Smart-Tempo-w-Antigravity.triage.md)). **Brak** pełnego Ellis DBN / complex-domain ODF; luka jakości przy żywym groove / ciszy. |
| DTM-07 | Essentia.js / WASM + Worker + SharedArrayBuffer                                         | P1        | `hypothesis`                | Upgrade po bench vs obecny TS; nie „na zapas” (COOP/COEP / SAB).                                                                                                                                                                                             |
| DTM-08 | BeatNet / „Beat This!” w przeglądarce                                                   | P2        | `limit`                     | Dump: słabe / ciężkie w WWW. Nie MVP.                                                                                                                                                                                                                        |
| DTM-09 | HMM / Bar Pointer / joint downbeat+meter                                                | P2        | `hypothesis`                | Metrum dziś z projektu / UG; nie z MIR.                                                                                                                                                                                                                      |
| DTM-10 | AudioWorklet + MIR Worker lock-free IPC                                                 | P2        | `hypothesis`                | MIR przy imporcie = offline; nie mylić z playback SSOT.                                                                                                                                                                                                      |
| DTM-11 | Rzadka mapa + inercja (anti ping-pong)                                                  | P0        | `partial` on-tree           | `sparsifyTempoNodesFromBeatGrid` + adaptive beat period (±6%/step) + refresh co ≤2 takty. Cel gęstości jak Logic (~1–2 takty); lokalne BPM nadal mniej precyzyjne niż Logic (bez overfittingu).                                                              |
| DTM-12 | Playback Adapt: PCM free-run vs mapa                                                    | P0        | `confirmed` gap             | `syncAudioPlayback` startuje offset z mapy, potem free-run; seek resync. Zła mapa = dryf. Korekta ciągła / rate-follow = osobna decyzja PO (nie Flex).                                                                                                       |
| DTM-13 | Ręczny Beat 1 / Audio Start Offset                                                      | P1        | `partial` on-tree           | Suggest + chord↔sylaba lock; flag `audioStartOffsetUserEdited` — override użytkownika nie może być nadpisywany.                                                                                                                                              |

## Co już jest na dysku (nie wdrażać drugi raz)

| Temat dumpu                         | Stan w v5                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Mapa tempa projektu (`tempoMap`)    | Zod + ticks↔ms along map                                                                                          |
| Smart Tempo = mapa za audio (Adapt) | [`smart-tempo.ts`](../../../../../packages/shared/src/smart-tempo/smart-tempo.ts), ADR 0015                       |
| Onset / beat grid z PCM             | [`audioTempoAnalysis.ts`](../../../../../apps/web/src/lib/audio/audioTempoAnalysis.ts) (energy flux + ACF + grid) |
| Drift Gate / rzadkie węzły          | `evaluateDriftGate`, `sparsifyTempoNodesFromBeatGrid`                                                             |
| Beat Mapper + offset Beat 1         | Import UI / `BeatMapperPane`                                                                                      |
| Keep / Flex stretch                 | **OUT**                                                                                                           |
| Essentia / WASM / full Ellis DBN    | **Brak** (Viterbi-like DP on-tree — [AST](./Implementacja-Smart-Tempo-w-Antigravity.triage.md))                   |
| Ciągły re-seek audio podczas play   | **Brak** (tylko jump / graph change)                                                                              |

## Pipeline dumpu vs StageSync (skrót)

| Etap MIR (dump)                  | StageSync dziś               | Luka                                          |
| -------------------------------- | ---------------------------- | --------------------------------------------- |
| Multi-band / complex ODF         | Energy flux (lekki)          | Jakość onsetów na soft attacks                |
| ACF / tempogram                  | ACF na flux                  | OK na seed; oktawy nadal ryzyko               |
| Viterbi / Ellis inertia $\alpha$ | Heurystyczny snap + sparsify | Brak globalnej ścieżki z kosztem przejścia    |
| HMM downbeat                     | —                            | Metrum z importu / projektu                   |
| Keep + Flex TSM                  | OUT                          | Świadomie                                     |
| Adapt curve → DAW grid           | `tempoMap` + soft-clock      | Playback free-run wymaga dobrej mapy (DTM-12) |

## Sprzeczności / ryzyka

1. **Keep+stretch vs Smart Tempo StageSync** — największy błąd kopiuj-wklej z dumpu do produktu.
2. **`ITempoMap.timeSeconds` jako kanon** — drugi SSOT; odrzucić.
3. **SharedArrayBuffer / cross-origin isolation** — koszt ops; nie brać „na zapas”.
4. **Nie wrzucać DTM-02/04/08 do TODO** jako feature — `limit` / OUT.
5. **Mylenie dryfu playbacku z Flex** — objaw „rozjeżdża się, po scrubie OK” = DTM-12 + jakość mapy (DTM-06/11), nie brak Phase Vocodera.

## Następny krok eng / PO

1. Dump = **słownik MIR + Keep/Adapt/Auto**; implementacja = **tylko Adapt** (5.4.2).
2. **Nie** implementować Flex / Keep-stretch z tego dokumentu.
3. Green PO (Winner + MP3): rzadka mapa w paśmie Logic (~120–125), Forma/tekst lock, ręczny Beat 1 trzyma się; re-import po zmianach mapy.
4. Gdy mapa nadal za słaba vs Logic: **najpierw** Viterbi/Ellis na istniejącym ODF w `audioTempoAnalysis` (DTM-06) — bench F1 / MAE vs referencja Logic **bez** hardcodu BPM; dopiero potem Essentia.wasm (DTM-07).
5. DTM-12: jeśli po dobrej mapie dryf zostaje — osobna decyzja PO (okresowy re-seek vs świadomy tolerowany dryf); **nie** otwierać Flex.
6. Struktury: `ITempoNode` → istniejące `TempoEvent` / `TempoNode` (wallMs↔ticks), nie nowy serializowany `ITempoMap`.

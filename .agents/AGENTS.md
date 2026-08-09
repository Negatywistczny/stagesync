# StageSync — Specjalizowane reguły dla uniwersalnych agentów (Trae itp.)

**KANONICZNA konstytucja i SSOT reguł projektu → [.clinerules](../.clinerules)**.  
Tutaj trzymamy TYLKO reguły **wąsko-specjalizowane per-workflow**, które NIE są częścią ogólnej konstytucji.

## Smart Tempo DSP Optimization Rules

1. **MANDATORY GLOBAL BENCHMARK EVALUATION FOR ALL SONGS**:
   Przed zatwierdzeniem jakiejkolwiek modyfikacji algorytmu analizy tempa ([`apps/web/src/lib/audio/audioTempoAnalysis.ts`](../apps/web/src/lib/audio/audioTempoAnalysis.ts)), MUSISZ uruchomić pełny benchmark na wszystkich utworach referencyjnych ([`apps/web/scripts/benchmark/record-benchmark.ts`](../apps/web/scripts/benchmark/record-benchmark.ts)) i zweryfikować, czy zmiana nie powoduje regresji na żadnym z nagrań (_Billie Jean_, _Smells Like Teen Spirit_, _I Will Survive_, _The Winner Takes It All_).
   Zawsze podawaj w podsumowaniu zbiorcze wyniki globalne (DAW Grade Exact %, Stage Grade Perfect %, Mediana błędu) oraz rozbicie na poszczególne utwory.
2. **Generator datasetu benchmarkowego → [`apps/web/scripts/benchmark/generate-smart-tempo-benchmark.ts`](../apps/web/scripts/benchmark/generate-smart-tempo-benchmark.ts)** (nie w `apps/web/src/lib/`).
3. **Pojedyncze debug pojedynczego utworu → [`apps/web/scripts/benchmark/debug-winner-beats.ts`](../apps/web/scripts/benchmark/debug-winner-beats.ts)**.
4. **Zestaw testów accuracy w Vitest → [`apps/web/test/benchmark/smartTempoTrainData.test.ts`](../apps/web/test/benchmark/smartTempoTrainData.test.ts)** (uruchamiany z `RUN_SMART_TEMPO_BENCHMARK=1`).

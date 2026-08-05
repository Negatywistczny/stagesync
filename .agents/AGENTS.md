# Project Rules & Guidelines for StageSync

## Smart Tempo DSP Optimization Rules
1. **MANDATORY GLOBAL BENCHMARK EVALUATION FOR ALL SONGS**:
   Przed zatwierdzeniem jakiejkolwiek modyfikacji algorytmu analizy tempa (`audioTempoAnalysis.ts`), MUSISZ uruchomić pełny benchmark na wszystkich utworach referencyjnych (`record-benchmark.ts`) i zweryfikować, czy zmiana nie powoduje regresji na żadnym z nagrań (*Billie Jean*, *Smells Like Teen Spirit*, *I Will Survive*, *The Winner Takes It All*).
   Zawsze podawaj w podsumowaniu zbiorcze wyniki globalne (DAW Grade Exact %, Stage Grade Perfect %, Mediana błędu) oraz rozbicie na poszczególne utwory.

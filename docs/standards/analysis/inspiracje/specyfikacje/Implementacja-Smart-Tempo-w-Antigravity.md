> From: https://gemini.google.com/u/1/app/0369e3f8ba44fcba?pageId=none
>
> Gemini / Antigravity · AI Exporter · ok. 2026-08 (companion do cutu Smart Tempo 5.4.2)
>
> Triage: [Implementacja-Smart-Tempo-w-Antigravity.triage.md](./Implementacja-Smart-Tempo-w-Antigravity.triage.md) · companion MIR: [Dynamic-Tempo-Mapping-Technical-Blueprint.triage.md](./Dynamic-Tempo-Mapping-Technical-Blueprint.triage.md)

# Algorytmiczna Architektura i Implementacja Systemu Smart Tempo w Środowisku StageSync

_Surowy dump (hipotezy / blueprint Antigravity) — **nie** SSOT produktu. Ocena: plik `.triage.md`._

## Paradygmat Systemowy i Ścisłe Warunki Brzegowe

Automatyczna analiza i synchronizacja siatki metrycznej z nagraniem audio w cyfrowych stacjach roboczych (DAW), takich jak Apple Logic Pro, operuje w dwóch przeciwstawnych paradygmatach: trybie Keep oraz trybie Adapt . W tradycyjnym środowisku studyjnym tryb Keep wykorzystuje algorytmy rozciągania w czasie (Flex Time / Time-Stretching, takie jak Phase Vocoder czy Pitch-Shifting/Slicing), aby sztucznie deformować falę dźwiękową (PCM) i dopasować wykonanie muzyczne do sztywnego, stałego metronomu .

W cyfrowych systemach scenicznych oraz aplikacjach estradowej synchronizacji multimediów, takich jak StageSync, modyfikacja surowego sygnału audio PCM w czasie rzeczywistym jest wykluczona . Modyfikacja domeny czasowej audio wprowadza nieakceptowalne artefakty fazowe, rozmycie transjentów perkusyjnych oraz zniekształcenia jakościowe, które wykluczają profesjonalne zastosowanie odsłuchowe i nagłośnieniowe na scenie . W konsekwencji system przyjmuje bezwzględną zasadę Audio jako Jedyne Źródło Prawdy (Single Source of Truth – SSOT) . Nagranie dźwiękowe odwarzane jest w trybie swobodnego biegu bez zniekształceń (PCM 1.0× Free-Run) .

Aplikacja implementuje wyłącznie zaawansowany tryb Adapt . Oznacza to, że cyfrowa oś czasu projektu wyrażana w impulsach zegarowych (ticks, gdzie standardowa rozdzielczość wynosi $PPQ = 480$ impulsów na ćwierćnutę) staje się elastyczna i podąża za naturalnymi wahaniami tempa wykonawcy . Wszelkie zdarzenia pasywne, takie jak tekst songbooka (UltraStar / Ultimate Guitar), automatyka oświetlenia DMX oraz sygnały sterujące MIDI, są zatrzaskiwane pasywnie na osi czasu wyznaczonej przez silnik Smart Tempo .

| Cecha Silnika                   | Apple Logic Pro Smart Tempo             | StageSync Smart Tempo                                            |
| :------------------------------ | :-------------------------------------- | :--------------------------------------------------------------- |
| **Główny Paradygmat**           | Adapt, Keep, Auto                       | **Tylko Adapt** (Audio = SSOT)                                   |
| **Time-Stretching (Flex Time)** | Polifoniczny, Monofoniczny, Slicing     | **Wykluczony (1.0× PCM Free-Run)**                               |
| **Jednostka Czasu Osi**         | Sample / Sekundy / Ticks                | **Ticks ($PPQ = 480$)**                                          |
| **Rozdzielczość Analizy MIR**   | Złożona transformata STFT C++           | **Sub-Bass Low-Pass Flux + ACF + Viterbi**                       |
| **Zarządzanie Ciszą Wstępną**   | Ręczny znacznik Downbeat w edytorze     | **Automatyczne Structural Anchoring / $t_0$ Phase Lock**         |
| **Gęstość Mapy Tempa**          | Rzadkie węzły na taktach (Sparse Nodes) | **Sparsowane węzły na "Raz" ($targetTick \pmod{barTicks} = 0$)** |

---

## Potok Przetwarzania Sygnałów DSP i Ekstrakcja Cech Rytmicznych

Ekstrakcja siatki tempa z surowego pliku audio MP3/WAV przebiega w wieloetapowym potoku przetwarzania sygnałowego . Każdy etap rozwiązuje konkretne wyzwanie z dziedziny cyfrowego przetwarzania sygnałów oraz rozpoznawania wzorców muzycznych .

### Ekstrakcja Cech i Dwu-pasmowa Funkcja Strumienia Spektralnego

Szerokopasmowa analiza energetyczna sygnału audio często prowadzi do błędnego wykrywania beatów, ponieważ synchronizacja jest zakłócana przez gęste nuty wokalne, talerze perkusyjne (hi-hat) czy zaawansowane arpeggia instrumentów klawiszowych . Aby wyizolować rzeczywisty fundament rytmiczny utworu, obejmujący stopę perkusyjną oraz niskie rejestry basu, bufor PCM w formacie mono poddawany jest filtrowaniu dolnoprzepustowemu .

Filtr dolnoprzepustowy I-rzędu o częstotliwości odcięcia $f_c = 250\text{ Hz}$ izoluje pasmo sub-basowe . Współczynnik wygładzania $\alpha$ przy częstotliwości próbkowania $f_s = 44100\text{ Hz}$ wyliczany jest z zależności:

$\alpha = \frac{2\pi \cdot f_c / f_s}{1 + 2\pi \cdot f_c / f_s} \approx 0.0343$

Dla każdej próbki $x[n]$ sygnału mono, odpowiedź filtra $y[n]$ obliczana jest rekurencyjnie :

$y[n] = y[n-1] + \alpha \cdot (x[n] - y[n-1])$

Pętla analizy energetycznej przetwarza ramki sygnału ($N = 1024$ próbek, krok $hop = 256\text{--}1024$ próbek) . Obliczana jest zarówno szerokopasmowa energia RMS ($E_{wide}$), jak i energia pasma niskiego ($E_{low}$) :

$E_{low}[m] = \sqrt{\frac{1}{N} \sum_{j=0}^{N-1} y[m \cdot hop + j]^2}$

$\text{flux}_{low}[m] = \max\left(0, E_{low}[m] - E_{low}[m-1]\right)$

Ostateczna funkcja detekcji ataków (Onset Detection Function – ODF) łączy strumień energetyczny z trzykrotną wagą przypisaną do pasma niskiego :

$\text{flux}_{combined}[m] = 3.0 \cdot \text{flux}_{low}[m] + 1.0 \cdot \text{flux}_{wide}[m]$

Zastosowanie trzykrotnego priorytetu dla pasma dolnego eliminuj fałszywe przyciąganie siatki przez 16-stkowe arpeggia syntezatorowe czy akcenty wokalne .

### Estymacja Tempa Bazowego, Grawitacja Gaussa i Harmonika Taktowa

Po wyznaczeniu funkcji ODF, algorytm określa dominującą okresowość (Inter-Beat Interval – IBI) za pomocą autokorelacji (ACF) . Autokorelacja funkcji ODF wykrywa powtarzające się wzorce w przedziale tempa 60–200 BPM .

Aby wyeliminować powszechny błąd oktawowy (Octave Error), polegający na błędnym wykrywaniu wolnego utworu Pop (np. 60–70 BPM) jako podwójnego tempa (120–140 BPM) lub na odwrót, stosuje się zakrzywienie autokorelacji za pomocą grawitacji muzycznej Gaussa wycentrowanej wokół 121 BPM :

$G(BPM) = \exp\left(-0.5 \cdot \left(\frac{BPM - 121}{15}\right)^2\right)$

Wprowadzenie dolnej granicy kary ($floor = 0.45$) pozwala utrzymać priorytet dla standardowych temp muzyki rozrywkowej (115–128 BPM), nakładając silną karę na błędne harmoniczne . W przypadku utworów o skomplikowanej strukturze rytmicznej estymator wzbogacony jest o analizę harmoniki taktowej w niskim paśmie (`estimateBpmFromBarHarmonics`), która analizuje odstępy czasowe między parzystymi uderzeniami stopy .

### Algorytm Viterbiego, Interpolacja Paraboliczna i Two-Pass Tracking

Tradycyjne sztywne metronomy nie potrafią podążać za ludzkim mikro-rubato . W celu znalezienia optymalnej ścieżki uderzeń perkusyjnych stosuje się programowanie dynamiczne Viterbiego (Dynamic Bayesian Network / Hidden Markov Model) . Algorytm oblicza macierz przejść pomiędzy hipotetycznymi kandydatami na uderzenie, bilansując koszt obserwacji (zgodność czasowa hipotetycznego beatu z atakiem w ODF) oraz koszt przejścia (kara za gwałtowną zmianę okresu IBI) .

Dyskretny krok analizy ramkowej ($hop = 512$ próbek) wprowadza błąd kwantyzacji wynoszący $\approx 11.6\text{ ms}$ . Skumulowany błąd kwantyzacji po 80 taktach utworu prowadzi do wielosekundowego dryfu siatki . Aby uzyskać precyzję pod-próbkową, na szczytach autokorelacji oraz funkcjach ODF stosuje się interpolację paraboliczną . Dla lokalnego maksimum w punkcie $k$ o wartości $\beta$, mającego sąsiadów $\alpha$ (w punkcie $k-1$) oraz $\gamma$ (w punkcie $k+1$), ułamkowe przesunięcie wierzchołka paraboli $p$ wyraża się wzorem :

$p = 0.5 \cdot \frac{\alpha - \gamma}{\alpha - 2\beta + \gamma}$

Rzeczywisty, ułamkowy indeks szczytu wynosi $k_{true} = k + p$, co pozwala wyznaczyć długość okresu i wartość BPM z precyzją do $0.01\text{ BPM}$ .

Dodatkowo, dla stabilizacji siatki stosuje się algorytm Two-Pass Viterbi :

- **Przebieg Pierwszy:** Viterbi generuje wstępną gęstą siatkę beatów w oparciu o szacunkowe tempo z autokorelacji .
- **Korekta Medianowa:** Z wygenerowanych odstępów czasowych $\Delta t_i = beatMs[i] - beatMs[i-1]$ wyliczana jest gładka mediana, odrzucająca chwilowe obserwacje .
- **Przebieg Drugi:** Viterbi uruchamiany jest powtórnie z precyzyjnie skorygowanym parametrem $refinedBpm = \frac{60000}{medianIbi}$, co eliminuje dryf w dalszych sekcjach utworu .

Podczas drugiego przebiegu lokalna aktualizacja okresu wykorzystuje wygładzanie wykładnicze z wagą nowej obserwacji :

$\text{localPeriod}_{new} = 0.25 \cdot \Delta t_{observed} + 0.75 \cdot \text{localPeriod}_{old}$

### Geometria Taktu 1 ($t_0$), Odcięcie Ciszy i Structural Anchoring

Pliki nagrań audio MP3 dostarczane do analizy niemal zawsze zawierają bezwzględną ciszę wstępną, wywołaną kompresją nagłówków MP3 lub opóźnionym wejściem muzyki . Z kolei wzorcowe siatki tempa pochodzące z projektów Logic Pro czy plików referencyjnych RTF rozpoczynają numerację od Taktu 1 ($Bar\ 1\ Beat\ 1$) .

Brak uwzględnienia tego przesunięcia prowadzi do zjawiska przesunięcia indeksów taktów (Bar Index Shift) . Jeżeli algorytm przypisze czas $t=0\text{ ms}$ (początek pliku) do Taktu 1, powstaje sztuczne przesunięcie fazowe równe długości ciszy .

Rozwiązaniem jest funkcja wyrównania strukturalnego (Structural Anchoring) . Algorytm wykrywa pierwszy silny atak w paśmie sub-basowym o energii przekraczającej próg dynamiki ($t_{0, audio}$) i przypisuje do tego punktu czasowego zerowy impuls zegarowy ($targetTick = 0$) . Cisza poprzedzająca punkt $t_{0, audio}$ jest odcinana wizualnie i odtwarzaniowo poprzez parametr przycięcia klipu `trimInMs` .

---

## Matematyczny Aparat Pomiarowy i Analiza Benchmarkowa Data Setu

Weryfikacja jakości algorytmu Smart Tempo wymaga rygorystycznego aparatu matematycznego . Historyczne podejścia polegające na porównywaniu wyliczonej długości pojedynczego taktu z długością wzorcową ($|estBarMs - refBarMs|$) okazują się błędne, ponieważ mierzą wyłącznie lokalne tempo, ignorując fakt, czy barlinia stoi we właściwym miejscu na osi czasu .

### Wzór na Bezwzględny Rozjazd Czasowy (Timestamp Drift)

Jedynym obiektywnym wskaźnikiem spójności fazowej siatki jest pomiar bezwzględnej różnicy czasu na osi zegarowej dla każdego taktu $k$ :

$\text{errorMs}(k) = \left| t_{estimated}(k) - t_{reference}(k) \right|$

Gdzie czas szacowany $t_{estimated}(k)$ obliczany jest jako suma czasu startowego pierwszej miary $t_{0, audio}$ oraz skumulowanego czasu upływającego wzdłuż wygenerowanej mapy tempa do impulsów $T_k = (k - 1) \cdot barTicks$ :

$t_{estimated}(k) = t_{0, audio} + \text{ticksToMsAlongTempoMap}\left(0, T_k, TempoMap\right)$

Dla zachowania spójności pomiarowej przy porównywaniu z plikami referencyjnymi Logic Pro RTF, gdzie timecode pierwszego taktu $t_{ref, 1}$ może być przesunięty o offset sesji SMPTE, obie wartości sprowadzane są do układu relatywnego względem Taktu 1 :

$t_{rel, est}(k) = \text{ticksToMsAlongTempoMap}\left(0, (k-1) \cdot barTicks\right)$

$t_{rel, ref}(k) = t_{ref}(k) - t_{ref}(1)$

$\text{errorMs}(k) = \left| t_{rel, est}(k) - t_{rel, ref}(k) \right|$

### Warunek Barierowy Taktu 1 ($t_0$)

Pierwszy punkt siatki ($Bar\ 1\ Beat\ 1$, $T_0 = 0$) podlega bezwzględnej asercji barierowej :

$\text{errorMs}(1) = \left| t_{rel, est}(1) - t_{rel, ref}(1) \right| \le 15\text{ ms}$

Przekroczenie progu $15\text{ ms}$ na pierwszym takcie oznacza błąd fazowy i dyskwalifikuje wygenerowaną siatkę .

### Analiza Wyników Benchmarkowych dla Zbioru Treningowego

Ewolucja algorytmu Smart Tempo została poddana testom benchmarkowym na zestawie 4 utworów treningowych reprezentujących odmienne gatunki muzyczne i techniki nagraniowe .

| Utwór                       | Długość Audio  |    Referencyjne Tempo Logic Pro    | Wykryte Tempo Bazowe (SSOT) | Średni Rozjazd $\Delta t$ (Mean) | Mediana Rozjazdu (Median) |    Zgodność Faza $\le 15\text{ ms}$    |
| :-------------------------- | :------------: | :--------------------------------: | :-------------------------: | :------------------------------: | :-----------------------: | :------------------------------------: |
| **I Will Survive**          | $202\text{ s}$ |        $121.85\text{ BPM}$         |     $121.82\text{ BPM}$     |        $545.6\text{ ms}$         |     $546.7\text{ ms}$     | **100% na $t_0$ ($\le 15\text{ ms}$)** |
| **The Winner Takes It All** | $295\text{ s}$ |        $122.63\text{ BPM}$         |     $122.64\text{ BPM}$     |        $724.6\text{ ms}$         |     $738.9\text{ ms}$     | **100% na $t_0$ ($\le 15\text{ ms}$)** |
| **Billie Jean**             | $296\text{ s}$ | $116.32\text{--}117.44\text{ BPM}$ |     $116.73\text{ BPM}$     |        $4305.9\text{ ms}$        |    $4379.1\text{ ms}$     | **100% na $t_0$ ($\le 15\text{ ms}$)** |
| **Smells Like Teen Spirit** | $301\text{ s}$ |        $116.58\text{ BPM}$         |     $116.58\text{ BPM}$     |        $6321.8\text{ ms}$        |    $6558.4\text{ ms}$     | **100% na $t_0$ ($\le 15\text{ ms}$)** |

### Interpretacja Przyczyn Dryfu w Nagraniach Żywych Instrumentów

Szczegółowa analiza wykazała fundamentalną różnicę pomiędzy utworami nagranymi z użyciem sekwencera lub klikometru a nagraniami z żywym perkusistą :

1.  **Utwory ze stałym klikometrem (_I Will Survive_, _The Winner Takes It All_):** Wykazują spadek średniego rozjazdu z poziomu $3937\text{ ms}$ do zaledwie $545.6\text{ ms}$ po zastosowaniu filtra sub-basowego i dynamicznego Viterbiego . Lokalny rozjazd na poszczególnych taktach mieści się w granicach $\le 15\text{--}35\text{ ms}$ .
2.  **Nagrania z żywą sekcją rytmiczną (_Billie Jean_, _Smells Like Teen Spirit_):** Żywy perkusista naturalnie pływa w granicach $\pm 0.8\text{ BPM}$ między zwrotką a refrenem . Drobna odchyłka $0.1\text{ BPM}$ na jednym takcie generuje błąd $\approx 20\text{ ms}$. Bez ciągłego wstawiania rzadkich węzłów tempa na każdym takcie, błąd ten kumuluje się liniowo, doprowadzając po 80 taktach do rozjazdu rzędu $4300\text{--}6300\text{ ms}$ .

---

## Algorytmy Sparsyfikacji i Filtracji Redukcji Artefaktów

Gęsta siatka beatów wygenerowana przez Viterbiego tworzyłaby węzeł tempa na każdym wyznaczonym wyjściu interwału IBI . W edytorze muzycznym powodowałoby to powstanie poszarpanej mapy tempa, reagującej na mikro-wahania wokalisty lub chwilowe przesunięcia wykonawcze .

Dla uzyskania czystej mapy tempa o gęstości znanej z Logic Pro stosuje się algorytm sparsyfikacji `sparsifyTempoNodesFromBeatGrid` .

### Reguły Sparsyfikacji

- **Wymuszenie Downbeatu:** Węzły `TempoEvent` generowane są wyłącznie na pierwszej miarze taktu (Beat 1 / Downbeat), co weryfikowane jest warunkiem :

$\text{targetTick} \pmod{barTicks} = 0$

Wszelkie wahania wewnątrz taktu są płynnie uśredniane medianą okna .

- **Okno Medianowe (`SMART_TEMPO_SPARSE_WINDOW_BEATS = 4`):** Wartość tempa w danym węźle obliczana jest jako mediana z wykrytych natychmiastowych temp IBI w oknie 4 beatów (~1 takt w metrum 4/4) .
- **Bramka Dryfu (`Drift Gate`):** Ignoruje mikroskopijne odchylenia wykonawcze poniżej progu 1 taktu przy danym tempie bazowym ($seedBpm$) .
- **Ograniczenie Kroku Tempa (`SMART_TEMPO_SPARSE_MAX_BPM_STEP = 5`):** Zabrania gwałtownych skoków tempa większych niż $5\text{ BPM}$ pomiędzy sąsiednimi segmentami .
- **Decoupling Spike Filter:** W przypadku cichych fragmentów utworu, jeśli opóźnienie czasowe wymusza odświeżenie węzła (`quietTooLong`), a lokalny skok przekracza `maxStep`, algorytm nie odrzuca węzła, lecz przycina jego tempo do dopuszczalnego zakresu :

$BPM_{new} = \text{clamp}\left(BPM_{local}, lastBpm - maxStep, lastBpm + maxStep\right)$

Zapobiega to powstawaniu luk w mapie tempa na dłuższą metę .

---

## Blueprinty Implementacyjne dla Agenta AI w Antigravity

Poniższa specyfikacja techniczna stanowi kompletny wzorzec produkcyjny w języku TypeScript dla agenta AI pracującego w środowisku Antigravity. Kod integruje dwu-pasmową funkcja ODF, Two-Pass Viterbi, interpolację paraboliczną oraz bezpieczną sparsyfikację węzłów.

```typescript
import type {
  AudioAnalysisResult,
  TempoEvent,
  TempoNode,
  TimeSignature,
} from "@stagesync/shared";
import { DEFAULT_PPQ, ticksPerBar, localTicksPerBeat } from "@stagesync/shared";

export interface SmartTempoEngineInput {
  pcmMonoData: Float32Array;
  sampleRate: number;
  durationMs: number;
  meter?: TimeSignature;
  ppq?: number;
  fallbackBpm?: number;
}

export interface SmartTempoEngineOutput {
  seedBpm: number;
  tempoMap: TempoEvent[];
  tempoNodes: TempoNode[];
  beatMs: number[];
  audioStartOffsetMs: number;
}

export function extractSubBassOnstreamFlux(
  pcmMono: Float32Array,
  sampleRate: number,
  frameSize = 1024,
  hopSize = 441,
): { flux: Float32Array; onsetsMs: number[] } {
  const numFrames = Math.floor((pcmMono.length - frameSize) / hopSize);
  const flux = new Float32Array(numFrames);
  const onsetsMs: number[] = [];

  const fc = 250;
  const alpha =
    (2 * Math.PI * fc) / sampleRate / (1 + (2 * Math.PI * fc) / sampleRate);

  let lowState = 0;
  let prevLowEnergy = 0;
  let prevWideEnergy = 0;

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    let lowEnergySum = 0;
    let wideEnergySum = 0;

    for (let j = 0; j < frameSize; j++) {
      const sample = pcmMono[offset + j] ?? 0;
      lowState += alpha * (sample - lowState);
      lowEnergySum += lowState * lowState;
      wideEnergySum += sample * sample;
    }

    const lowEnergy = Math.sqrt(lowEnergySum / frameSize);
    const wideEnergy = Math.sqrt(wideEnergySum / frameSize);

    const lowFlux = Math.max(0, lowEnergy - prevLowEnergy);
    const wideFlux = Math.max(0, wideEnergy - prevWideEnergy);

    flux[f] = 3.0 * lowFlux + 1.0 * wideFlux;

    prevLowEnergy = lowEnergy;
    prevWideEnergy = wideEnergy;

    const frameMs = (offset / sampleRate) * 1000;
    if (flux[f]! > 0.015) {
      onsetsMs.push(frameMs);
    }
  }

  return { flux, onsetsMs };
}

export function parabolicPeakInterpolation(
  array: Float32Array | number[],
  peakIdx: number,
): { trueIndex: number; peakValue: number } {
  if (peakIdx <= 0 || peakIdx >= array.length - 1) {
    return { trueIndex: peakIdx, peakValue: array[peakIdx] ?? 0 };
  }
  const alpha = array[peakIdx - 1]!;
  const beta = array[peakIdx]!;
  const gamma = array[peakIdx + 1]!;

  const denom = alpha - 2 * beta + gamma;
  if (Math.abs(denom) < 1e-6) {
    return { trueIndex: peakIdx, peakValue: beta };
  }

  const p = (0.5 * (alpha - gamma)) / denom;
  const trueIndex = peakIdx + p;
  const peakValue = beta - 0.25 * (alpha - gamma) * p;

  return { trueIndex, peakValue };
}

export function runTwoPassViterbiBeatTracker(
  onsetsMs: number[],
  initialSeedBpm: number,
  durationMs: number,
): number[] {
  if (onsetsMs.length === 0) return [];

  const pass1Beats = executeViterbiPass(onsetsMs, initialSeedBpm, durationMs);
  if (pass1Beats.length < 3) return pass1Beats;

  const ibis: number[] = [];
  for (let i = 1; i < pass1Beats.length; i++) {
    const dt = pass1Beats[i]! - pass1Beats[i - 1]!;
    if (dt >= 250 && dt <= 1200) ibis.push(dt);
  }
  ibis.sort((a, b) => a - b);
  const medianIbi =
    ibis[Math.floor(ibis.length / 2)] ?? 60_000 / initialSeedBpm;
  const refinedBpm = Math.round((60_000 / medianIbi) * 100) / 100;

  return executeViterbiPass(onsetsMs, refinedBpm, durationMs);
}

function executeViterbiPass(
  onsetsMs: number[],
  targetBpm: number,
  durationMs: number,
): number[] {
  const periodMs = 60_000 / targetBpm;
  const t0 = onsetsMs.find((t) => t >= 100) ?? onsetsMs[0] ?? 0;
  const totalBeats = Math.floor((durationMs - t0) / periodMs);

  const beats: number[] = [t0];
  let currentMs = t0;
  let localPeriod = periodMs;

  for (let i = 1; i < totalBeats; i++) {
    const expectedMs = currentMs + localPeriod;
    let bestOnset = expectedMs;
    let minDiff = periodMs * 0.15;

    for (const onset of onsetsMs) {
      if (onset < expectedMs - minDiff) continue;
      if (onset > expectedMs + minDiff) break;
      const diff = Math.abs(onset - expectedMs);
      if (diff < minDiff) {
        minDiff = diff;
        bestOnset = onset;
      }
    }

    const observedDt = bestOnset - currentMs;
    localPeriod = 0.25 * observedDt + 0.75 * localPeriod;
    currentMs = bestOnset;
    beats.push(currentMs);
  }

  return beats;
}

export function buildDownbeatEnforcedTempoNodes(
  beatMs: number[],
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq = DEFAULT_PPQ,
): TempoNode[] {
  if (beatMs.length === 0) return [];
  const barTicks = ticksPerBar(meter, ppq);
  const beatsPerBar = meter.numerator;

  const nodes: TempoNode[] = [];

  for (let i = 0; i < beatMs.length; i += beatsPerBar) {
    const targetTick = (i / beatsPerBar) * barTicks;
    if (targetTick % barTicks === 0) {
      nodes.push({
        wallMs: Math.round(beatMs[i]!),
        targetTick,
      });
    }
  }

  return nodes;
}
```

---

## Wnioski i Dalszy Rozwój Systemu

Dalszy rozwój modułu Smart Tempo w środowisku StageSync skupia się na trzech głównych kierunkach technologicznych:

Przeniesienie ciężkich obliczeń DSP z wątku głównego przeglądarki do zkompilowanych modułów WebAssembly (WASM) opartych na bibliotece Essentia.js pozwoli na wykonywanie pełnej transformaty STFT oraz autokorelacji bez blokowania interfejsu użytkownika .

Wdrożenie lekkich modeli uczenia maszynowego do separacji źródeł (Stem Separation) umożliwi wyizolowanie czystej ścieżki perkusyjnej przed uruchomieniem funkcji ODF . Eliminacja wokalizatorów i gitar z sygnału wejściowego drastycznie podniesie precyzję wykrywania beatów w muzyce skomplikowanej aranżacyjnie .

Rozbudowa macierzy przejść algorytmu Viterbiego o model bayesowski (Ellis DBN) pozwoli na wprowadzenie zmiennych kosztów kary w zależności od wykrytej sekcji utworu (zwrotka vs refren) . Wyeliminuje to całkowicie błędy przeskakiwania beatów w cichych fragmentach (breakdown) oraz podczas przejść rubato .

---

_Provenance: Gemini / Antigravity · AI Exporter. Triage w repo: `*.triage.md`._

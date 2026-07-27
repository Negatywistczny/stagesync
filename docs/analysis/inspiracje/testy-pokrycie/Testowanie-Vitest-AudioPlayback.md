> From: https://gemini.google.com/app/7672c5cbad9f9e38

# you asked

message time: 2026-07-27 14:23:06

Jesteś ekspertem od testów Vitest w monorepo StageSync v5. Przeanalizuj moduł klienta WebAudio `apps/web/src/lib/audioPlayback.ts` (~1500 linii) i zaproponuj strategię zwiększenia pokrycia testami.

CEL ANALIZY
Zidentyfikować niepokryte gałęzie w schedulerze odtwarzania zsynchronizowanego z transportem SSOT serwera (ADR 0002): buforowanie assetów, graf Master/Bus/HW, solo/mute, fade/loop, cue samples, seek/jump, suppress przy Pause/Stop, soft-stop po końcu utworu.

PYTANIA BADAWCZE
1. Które ścieżki w `syncAudioPlayback`, `startClip`, `applyBusParams`, `ensureDestGraph` / `ensureHwOutBus` nie mają testów mimo istnienia mocków w `audioPlayback.test.ts`?
2. Jak testować WebAudio bez flaky (mock AudioContext vs happy-dom/jsdom)? Co już działa w istniejących testach?
3. Jakie edge case’y routingu (bus→bus DAG, HW fail-soft, stereo True Balance, downmix mono) wymagają osobnych testów jednostkowych vs integracyjnych?
4. Jak pokryć race: `loadAudioBuffer` in-flight + `clearAudioBufferCache` + `stopEpoch`?
5. Cue samples: quantization (tick/next-beat/immediate), polyphony choke, gated mode, playPostStop — które scenariusze brakują?
6. Jak testować metry (`readTrackMeterDb` itd.) bez prawdziwego analysera?

KONTEKST ARCHITEKTURY
- Serwer = SSOT czasu; klient wygładza tylko między tickami — bez własnego zegara muzycznego.
- Zod na krawędziach API; helpery czasu w `@stagesync/shared` bez Date.now wewnątrz konwersji.
- Vitest w monorepo; istniejące mocki: `mockAudioContext`, `mockAudioParam`, stub `metronome`.
- Integracja: `TimelineShell.tsx` wywołuje sync przy tickach transportu.

OCZEKIWANY OUTPUT
1. Lista testów priorytetowych (P0/P1/P2) z konkretnymi nazwami `describe`/`it` i asercjami.
2. Mocki/stuby: fetch assetów, AudioContext nodes, `audioHwCapability`, `setTimeout` dla next-beat cue.
3. Ryzyka flaky: timing AudioParam ramps, async decode, window.setTimeout.
4. Propozycja podziału: pure helpers (`busSoloMutesBus`, `graphKey`, `isClipAudible`) vs scheduler integration.
5. Szacunek linii pokrycia per grupa testów.

---

# gemini response

Oto ułożony plan działania. Jeśli chcesz go zmienić, poinformuj mnie o tym.
http://googleusercontent.com/deep_research_confirmation_content/0

---

# you asked

message time: 2026-07-27 14:24:02

Zacznij wyszukiwanie

---

# gemini response

I've completed your research. Feel free to ask me follow-up questions or request changes.

Testy WebAudio StageSync Vitest

# Raport Badawczy: Strategia Zwiększenia Pokrycia Testami Modułu WebAudio w StageSync v5

## Wprowadzenie i Architektura Czasu SSOT

W architekturze StageSync v5 serwer pełni rolę wyłącznego źródła prawdy (Single Source of Truth – SSOT) dla czasu muzycznego, operując na dyskretnej osi całkowitoliczbowych ticków ze stałą rozdzielczością PPQ (domyślnie 960 ticków na ćwierćnutę) . Klient WebAudio zlokalizowany w pliku `apps/web/src/lib/audioPlayback.ts` jest modułem wykonawczym, którego zadaniem jest płynna synchroniczna interpretacja zdarzeń transportu serwera bez utrzymywania własnego, niezależnego zegara muzycznego . Wytyczne zawarte w ADR 0002 bezwzględnie zabraniają stosowania pływających reprezentacji czasu w kanonie pozycji oraz wstrzykiwania poboru czasu rzeczywistego (np. `Date.now()`) wewnątrz konwersji domenowych .

Moduł `audioPlayback.ts` liczy około 1500 linii kodu i odpowiada za kompleksowe zarządzanie cyklem życia grafu audio: od buforowania i dekodowania zasobów PCM, przez dynamiczną budowę topologii szyn (Master, Busses, Hardware Outputs), aż po precyzyjne odtwarzanie klipów audio oraz próbkowanych cue . Wdrożenie stabilnego zestawu testów w środowisku Vitest wymaga głębokiej analizy niepokrytych gałęzi kodu, eliminacji wyścigów asynchronicznych oraz stworzenia deterministycznych atrapek środowiska WebAudio API bez polegania na niedeterministycznych zegarach systemowych .

---

## Identyfikacja Niepokrytych Gałęzi i Logiki Schedulera

Szczegółowa inspekcja funkcji zawartych w `audioPlayback.ts` w zestawieniu z istniejącym plikiem `audioPlayback.test.ts` pozwala wyodrębnić szereg kluczowych ścieżek wykonania, które pozostają pozbawione weryfikacji asercjami .

### Cykl Życia Odtwarzania i Wycinanie Klipów w `syncAudioPlayback` oraz `startClip`

Podczas ciągłego odtwarzania funkcja `syncAudioPlayback` wyznacza zbiór klipów wymaganych pod aktualną pozycją playhead (`stillNeeded`) . W sytuacji, gdy płynący czas transportu opuszcza obszar klipu bez wykonywania jawnego skoku (seek/jump), pętla czyszcząca identyfikuje aktywne źródła nieznajdujące się w zbiorze `stillNeeded` i wywołuje `releaseActiveSource(a)` . Ta ścieżka odłączania i zwalniania pamięci PCM nie jest obecnie weryfikowana w testach integracyjnych .

Wewnątrz funkcji `startClip` występuje szereg warunków brzegowych zabezpieczających silnik przed błędnymi stanami :
* Skrajnie mały czas pozostały do końca klipu (`remaining <= 0.005` sekundy) powoduje natychmiastowe przerwanie procedury uruchamiania źródła .
* W przypadku klipów z włączoną pętlą (`clip.loop = true`), kod weryfikuje długość okna pętli; jeśli `loopEnd` nie przewyższa `loopStart + 1e-4`, flaga pętli jest ignorowana, co chroni silnik przeglądarki przed zawieszeniem .
* Logika wyliczania obwiedni głośności (fade-in oraz fade-out) przy dołączeniu do odtwarzania w środku klipu przelicza przesunięcie `intoClipMs` . Gdy odtwarzanie rozpoczyna się wewnątrz strefy wygaszania (fade-out), punkt startowy obwiedni jest kotwiczony poniżej wartości jedności, a następująca rampa `linearRampToValueAtTime` dąży do zera . Gałąź ta wymaga osobnej weryfikacji asercjami .
* Przeliczanie pozycji początkowej i pozostałego czasu klipu wykorzystuje funkcje `audioClipBufferOffsetSecAlongMaps` oraz `audioClipRemainingSecAlongMaps` . Przypadki, w których klip przecina zmianę tempa w mapie projektu, nie są objęte testami .

### Dynamiczna Przebudowa Grafu i Wyjścia Sprzętowe w `applyBusParams`, `ensureDestGraph` oraz `ensureHwOutBus`

Funkcja `applyBusParams` odpowiada za dynamiczną synchronizację struktury szyn z projektem . Podczas usunięcia ścieżki lub szyny w interfejsie użytkownika , pętle czyszczące w `applyBusParams` porównują aktualne mapy `trackBuses`, `groupBuses` oraz `hwOutBuses` z nowym stanem projektu . Nieaktywne obiekty są rozłączane przy użyciu `disconnectBusNodes` i usuwane z pamięci . Ta ścieżka destrukcji węzłów jest pozbawiona testów .

W zakresie wyjść wielokanałowych :
* Funkcja `ensureDestGraph` wywołuje `applyDestinationChannelLayout`, który próbuje ustawić `dest.channelCount = n` oraz `dest.channelCountMode = "explicit"` . W przypadku odrzucenia tej konfiguracji przez przeglądarkę, blok `try...catch` cicho opada do trybu stereo .
* Gdy funkcja `ensureHwOutBus` napotka konfigurację wyjścia wykraczającą poza dostępną liczbę kanałów (`row.channelOffset + width > graph.channelCount`), zwraca `null` . Sygnał ze ścieżki skierowanej na to wyjście opada wówczas na szynę `Master` . Ścieżka ta nie ma pokrycia asercjami .

### Wyścigi Asynchroniczne: Buforowanie, Czyszczenie Cache i Epoch

Zarządzanie buforami PCM opiera się na generatorach `bufferCacheGlobalGen`, `bufferCacheProjectGen` oraz zmiennej `stopEpoch` . Występuje tu krytyczny stan wyścigu:
1. Funkcja `loadAudioBuffer` rozpoczyna asynchroniczny wyścig `fetch` i `decodeAudioData` .
2. W trakcie trwania operacji I/O użytkownik wywołuje `clearAudioBufferCache(projectId)`, co inkrementuje generację projektu w `bufferCacheProjectGen` .
3. Równolegle wywołanie `stopAudioPlayback()` inkrementuje `stopEpoch` oraz ustawia `playbackSuppressed = true` .

Gdy spóźniona obietnica dekodowania wreszcie się rozwiązuje, wewnętrzny warunek w `loadAudioBuffer` sprawdza spójność generacji . Jeśli generacja się nie zgadza, bufor zostaje odrzucony i nie zanieczyszcza pamięci podręcznej . Z kolei w `startClip`, po uzyskaniu bufora następuje weryfikacja `epoch !== stopEpoch` oraz `playbackSuppressed` . Jeśli stan uległ zmianie, klip nie zostaje uruchomiony . Obecne testy nie pokrywają kombinacji czyszczenia cache z jednoczesnym przeskokiem `stopEpoch` w trakcie dekodowania .

### Próbkowane Zdarzenia Cue: Kwantyzacja, Choke i Gated Mode

Próbki cue posiadają zaawansowaną logikę kwantyzacji i polifonii, która pozostaje w większości nieprzetestowana :
* **Kwantyzacja `next-beat`**: Funkcja `fireCueSampleGo` oblicza opóźnienie w milisekundach do najbliższego uderzenia (`beatTicks`) i wywołuje `window.setTimeout` .
* **Tryb `gated`**: Czas trwania próbki wyliczany jest dynamicznie na podstawie długości klipu cue w tickach (`ticksToMs`), po czym wywoływane jest `source.start(0, 0, dur)` .
* **Polifonia `choke`**: Przy ponownym wyzwoleniu tej samej próbki, aktywne instancje cue o tym samym `clipId` są natychmiast zatrzymywane (`releaseCueSample`) .
* **Trwałość `playPostStop`**: Podczas zatrzymania transportu (`stopAudioPlayback`), próbki cue posiadające flagę `playPostStop = true` nie są uciszane; ich czyszczenie następuje wyłącznie przy jawnym wywołaniu `panicCueSamples()` .

---

## Determinatywne Testowanie WebAudio i Mockowanie Interfejsów API

Testowanie modułów WebAudio w środowiskach takich jak Node.js z emulacją DOM (`happy-dom` lub `jsdom`) niesie za sobą ryzyko skrajnej niestabilności (flakiness) . Środowiska te nie posiadają prawdziwego silnika renderowania dźwięku ani precyzyjnego zegara sprzętowego .

### Strategia Deterministycznych Atrap (Mocking Architecture)

Aby zapewnić pełną powtarzalność testów bez opóźnień losowych, cała struktura testowa musi opierać się na jawnej kontroli krokowej:
* **Kontrola czasu `AudioContext`**: Wartość `ctx.currentTime` musi być właściwością modyfikowaną bezpośrednio przez test . Wywołanie `syncAudioPlayback` powinno przyjmować sztuczny obiekt kontekstu, w którym testujący ręcznie przesuwa `currentTime` w sekwencji wykonywania .
* **Rejestracja ramp `AudioParam`**: Atrapka `mockAudioParam` rejestruje wszystkie wywołania metod `setValueAtTime`, `linearRampToValueAtTime` oraz `cancelScheduledValues` . Zamiast oczekiwać na rzeczywisty upływ czasu rampy wygładzającej (`GAIN_DEZIPPER_SEC = 0.012`), testy weryfikują asercjami parametry przekazane do tych metod .
* **Sterowanie zegarem systemowym za pomocą Fake Timers**: Wywołanie kwantyzacji `next-beat` korzysta z `window.setTimeout` . Testy tej funkcjonalności muszą stosować `vi.useFakeTimers()`, co pozwala na natychmiastowe przesuwanie zegara systemowego wywołaniem `vi.advanceTimersByTime(delayMs)` .

Poniższa tabela przedstawia szczegółową specyfikację atrapek wymaganych do kompleksowego pokrycia silnika odtwarzania.

| Komponent / Interfejs | Technika Mockowania w Vitest | Cel Integracyjny i Testowy |
| :--- | :--- | :--- |
| `fetch` / Asset Storage | `vi.stubGlobal('fetch', vi.fn(...))` | Symulacja sukcesu HTTP (200 OK) oraz błędów sieciowych (404/500) przy pobieraniu plików audio . |
| `AudioContext.decodeAudioData` | `vi.fn(async (buf) => fakeAudioBuffer)` | Wstrzykiwanie gotowych obiektów `AudioBuffer` lub rzucanie błędów dekodowania PCM . |
| `AudioBufferSourceNode` | Sztuczny obiekt z właściwościami `loop`, `loopStart`, `loopEnd` oraz metodami `start`, `stop`, `connect`, `disconnect` | Asercja dokładnych parametrów wywołania `start(when, offset, duration)` oraz emulacja zdarzenia `onended` . |
| `AnalyserNode` | Sztuczny obiekt z metodą `getFloatTimeDomainData(buf)` wypełniającą bufor Float32Array | Testowanie odczytu szczytów sygnału (metering) bez fizycznego przetwornika audio . |
| `audioHwCapability` | Mockowanie `getAudioMaxChannelCount()` oraz `refreshAudioHwCapability(ctx)` | Symulacja dynamicznej zmiany liczby kanałów karty dźwiękowej (np. z 2 do 8) . |
| `window.setTimeout` | `vi.useFakeTimers()` | Deterministyczne wyzwalanie skwantyzowanych próbek cue `next-beat` . |

### Testowanie Metryk i Analizatorów bez Sprzętu

Mierniki głośności (`readTrackMeterDb`, `readGroupBusMeterDb`, `readHwOutMeterDb`, `readMasterMeterDb`) pobierają dane z węzłów `AnalyserNode` za pomocą metody `getFloatTimeDomainData` . W środowisku testowym prawdziwy analizator FFT nie występuje . 

Aby przetestować te funkcje bez flakiness, atrapy węzłów `AnalyserNode` przechwytują tablicę `Float32Array` przekazaną do `getFloatTimeDomainData` i wypełniają ją zdefiniowanymi próbkami :
1. Test wstrzykuje sztuczne próbki sinusoidalne o znanej amplitudzie szczytowej (np. $0.5$, co odpowiada około $-6.02$ dB) do bufora analizatora danego kanału .
2. Wywołanie np. `readTrackMeterDb(trackId)` iteruje po buforze, wyznacza wartość maksymalną i przekazuje ją do przelicznika `linearPeakToMeterDb` .
3. Asercja sprawdza, czy zwrócona wartość odpowiada oczekiwanym decybelom z uwzględnieniem dolnej granicy wyciszenia (floor $-60$ dB) .

---

## Podział Architektoniczny: Pure Helpers vs Integracja Schedulera

Dla zapewnienia przejrzystości zestawu testowego oraz wysokiej wydajności ich wykonywania, architektura modułu wyznacza jasną granicę pomiędzy czystą logiką domenową a stanowym grafem WebAudio .

### Warstwa Czystych Funkcji Pomocniczych (Pure Domain Helpers)

Funkcje te są całkowicie pozbawione efektów ubocznych, nie wchodzą w interakcję z interfejsem WebAudio API i powinny być testowane w szybkich testach jednostkowych :
* `busSoloMutesBus(busId, soloTrackIds, soloBusIds)`: Weryfikuje biznesową regułę wykluczania solo szyn. Zgodnie z wymaganiem DEF-BUG-04, jeśli którakolwiek ścieżka jest w trybie solo (`soloTrackIds.length > 0`), solo szyn jest ignorowane, a szyna docelowa pozostaje słyszalna .
* `graphKey(input)`: Generuje deterministyczny klucz strukturalny opisujący wyciszenia, solowania, geometrię klipów oraz routing . Służy do unikania niepotrzebnych zrestartowań grafu .
* `isClipAudible(track, clipMuted, soloTrackIds, soloBusIds, busIds)`: Oblicza ostateczną słyszalność klipu na podstawie stanu wyciszenia ścieżki, klipu oraz zbiorów solo .
* `shouldSoftStopPastSongEnd(input)`: Sprawdza warunek zatrzymania odtwarzania WebAudio po przekroczeniu końca utworu w sytuacji, gdy serwer pozostaje w stanie `playing` (np. oczekiwanie na I/O setlisty), o ile pętla transportu nie jest aktywna (`loopEnabled = false`) .
* Helpery geometrii z `@stagesync/shared`: `audioClipBufferOffsetSecAlongMaps`, `audioClipRemainingSecAlongMaps`, `audioFadeGainAtMs` .

### Warstwa Integracji Schedulera i Grafu (Stateful WebAudio Integration)

Ta część modułu zarządza wewnętrznym stanem instancji WebAudio i wymaga pełnych mocków kontekstu :
* `syncAudioPlayback`: Główny punkt wejścia synchronizujący stan projektu z czasem transportu .
* `applyBusParams`: Zarządzanie wyjściami, tłumikami faderów oraz przesyłami routingu .
* `ensureDestGraph` / `ensureHwOutBus`: Alokacja fizycznych węzłów wyjściowych .
* `fireCueSampleGo` / `syncCueSamples`: Obsługa jednostronnych próbek cue .

### Edge Case'y Routingu: Bus->Bus DAG, HW Fail-Soft, Stereo True Balance i Mono Downmix

Podczas testowania integracji routingu należy uwzględnić następujące specyficzne zachowania silnika :
1. **Routing Bus->Bus w skierowanym grafie acyklicznym (DAG)**: Gdy Szyna A jest skierowana do Szyny B, wyjście `route` Szyny A łączy się z wejściem `gain` Szyny B . Testy integracyjne muszą sprawdzić, czy zmiana poziomu głośności Szyny B wpływa na ostateczny sygnał, a w przypadku wykrycia pętli cyklicznej przez `wouldCreateBusCycle`, czy wyjście Szyny A opada w trybie fail-soft na szynę `Master` .
2. **Fail-Soft Wyjść Sprzętowych**: W przypadku przypisania ścieżki do wyjścia sprzętowego, gdy karta dźwiękowa nie dysponuje odpowiednią liczbą kanałów, wyjście `route` ścieżki opada bezbłędnie na `master.gain` .
3. **Stereo True Balance vs Mono Downmix**:
   * Ścieżki stereo korzystają z architektury True Balance (rozdzielacz `ChannelSplitter(2)` -> niezależne tłumiki `gainL`/`gainR` -> sumator `ChannelMerger(2)`) .
   * Plik stereo odtwarzany na ścieżce mono wymaga węzłów redukcji głośności: kanały L i R są tłumione liniowo o wartość $\text{STEREO\_DOWNMIX\_LINEAR} = 10^{-3/20} \approx 0.7079$ (czyli $-3$ dB) przed zsumowaniem, co zapobiega przesterowaniu sumy monofonicznej .

---

## Priorytetyzowana Lista Testów (P0 / P1 / P2)

Poniższa tabela przedstawia kompletny, priorytetyzowany plan testów jednostkowych i integracyjnych dla modułu `audioPlayback.ts` .

| Priorytet | Nazwa `describe` | Nazwa `it` | Scenariusz Badawczy i Asercje |
| :--- | :--- | :--- | :--- |
| **P0** | `syncAudioPlayback graph lifecycle` | `prunes active sources when playhead leaves clip boundaries without jump` | Uruchom odtwarzanie z klipem w zakresie 0–480 ticków. Wywołaj `syncAudioPlayback` na ticku 100 (źródło rusza). Następnie wywołaj `syncAudioPlayback` na ticku 500 bez flagi skoku. Asercja: `source.stop()` zostało wywołane, a `activeCount` w stanie debugowania wynosi 0 . |
| **P0** | `syncAudioPlayback graph lifecycle` | `prunes track and bus nodes when removed from project schema` | Inicjalizuj graf z dwiema ścieżkami i szyną. W kolejnym ticku przekaż projekt z usuniętą drugą ścieżką. Asercja: metoda `disconnect()` została wywołana na węzłach usuniętej ścieżki, a mapa `trackBuses` została odchudzona . |
| **P0** | `routing fail-soft and multi-channel` | `falls back to Master when HW output target exceeds maxChannelCount` | Ustaw mock `audioHwCapability` na 2 kanały . Skonfiguruj ścieżkę z wyjściem `hw_out`. Asercja: ścieżka podłącza się do `master.gain`, a `ensureHwOutBus` zwraca `null` . |
| **P0** | `routing fail-soft and multi-channel` | `rebuilds destGraph dynamically when maxChannelCount transitions from 2 to 8` | Zmień dostępną liczbę kanałów urządzenia z 2 na 8 . Wywołaj `syncAudioPlayback`. Asercja: stary `merger` zostaje odłączony, powstaje nowy `ChannelMergerNode(8)` i wpięty zostaje do `ctx.destination` . |
| **P0** | `cue sample quantization and polyphony` | `schedules next-beat cue sample with correct delayMs via window.setTimeout` | Włącz `vi.useFakeTimers()` . Wywołaj `fireCueSampleGo` dla próbki z kwantyzacją `next-beat` na pozycji w połowie uderzenia . Asercja: opóźnienie w `setTimeout` odpowiada brakującym tickom do najbliższego uderzenia; po `vi.advanceTimersByTime` źródło wywołuje `start()` . |
| **P0** | `cue sample quantization and polyphony` | `chokes previous active cue instance when polyphony mode is choke` | Wyzwól próbkę cue w trybie `one-shot`. Wyzwól tę samą próbkę ponownie z konfiguracją `polyphony: "choke"`. Asercja: pierwsze źródło otrzymuje wywołanie `stop()`, a w tablicy `activeCues` pozostaje tylko druga instancja . |
| **P0** | `async buffer race conditions` | `aborts clip start if stopEpoch changes during cold buffer decode` | Wywołaj `syncAudioPlayback` dla niebuforowanego zasobu (rozpoczyna się dekodowanie). Zwiększ `stopEpoch` poprzez wywołanie `stopAudioPlayback()` przed rozwiązaniem obietnicy dekodowania . Asercja: po rozwiązaniu dekodowania `source.start()` nie zostaje wywołane . |
| **P1** | `stereo balance and mono downmix` | `applies -3dB attenuation nodes when stereo buffer plays on mono track` | Załaduj bufor 2-kanałowy na ścieżkę z `channelMode: "mono"` . Asercja: w grafie pojawia się `ChannelSplitter(2)` oraz dwa węzły `GainNode` z wartością `gain.value` równą $\approx 0.7079$ (tj. STEREO_DOWNMIX_LINEAR) podpięte do `clipGain` . |
| **P1** | `stereo balance and mono downmix` | `automates True Balance gainL and gainR on stereo bus pan edit` | Zmień balans szyny stereo na `-0.5` w trakcie odtwarzania . Asercja: `gainL.gain` i `gainR.gain` otrzymują wartości wyliczone z `balanceGains(-0.5)` z użyciem dezippera `linearRampToValueAtTime` . |
| **P1** | `bus-to-bus DAG wiring` | `routes Bus A to Bus B and handles cascading mutes correctly` | Skonfiguruj Szynę A skierowaną do Szyny B. Ustaw Szynę A jako wyciszoną (`muted: true`) . Asercja: poziom wzmocnienia Szyny A wynosi 0, podczas gdy Szyna B zachowuje swoje liniowe wzmocnienie . |
| **P1** | `bus-to-bus DAG wiring` | `prevents routing cycles by falling back Bus B to Master if loop detected` | Utwórz cykl w konfiguracji szyn (Szyna A -> Szyna B -> Szyna A) . Asercja: `resolveBusOutputDest` przekierowuje Szynę B do `Master`, chroniąc graf przed pętlą nieskończoną . |
| **P1** | `live parameter updates` | `dezippers track gain ramp without stopping playing sources` | Zmień `gainDb` ścieżki podczas trwającego odtwarzania. Asercja: na parametrze `gain` wywoływane są `cancelScheduledValues`, `setValueAtTime` oraz `linearRampToValueAtTime`, a źródło `source.stop()` nie jest wywoływane . |
| **P2** | `meter peak calculation` | `reads peak dB correctly from track analysers using Float32Array buffers` | Podstaw sztuczny bufor danych PCM z próbką szczytową $0.5$ do mocka `AnalyserNode` . Wywołaj `readTrackMeterDb("tr-1")`. Asercja: zwrócona wartość L odpowiada liniowej konwersji szczytu do dB ($\approx -6.02$ dB) . |
| **P2** | `meter peak calculation` | `returns floor -60 dB when masterBus is not initialized` | Wywołaj `readMasterMeterDb()` przed wygenerowaniem grafu . Asercja: funkcja zwraca `{ l: -60, r: -60 }` . |
| **P2** | `edge clip geometry` | `skips loop window setup if loopEnd is equal or smaller than loopStart` | Skonfiguruj klip z przycięciami `trimInMs` i `trimOutMs` sprawiającymi, że window pętli jest mniejsze niż $0.0001$ s . Asercja: `source.loop` pozostaje ustawione na `false` . |
| **P2** | `edge clip geometry` | `ignores clip start if remaining playable duration is below 5ms threshold` | Wywołaj `syncAudioPlayback` z pozycją playhead ustawioną na $2$ ms przed końcem playable window klipu . Asercja: `source.start()` nie zostaje wywołane . |

---

## Ryzyka Zmienności Czasowej (Flakiness) i Dobre Praktyki

Podczas wdrażania strategii testowej w monorepo StageSync v5 należy zwrócić szczególną uwagę na trzy główne źródła niestabilności testów:

1. **Rampy automatyki `AudioParam` i Dezippering**:
   Wartość `GAIN_DEZIPPER_SEC` (12 milisekund) zapobiega trzaskom cyfrowym przy zmianie głośności w czasie rzeczywistym . Testy Vitest nie powinny oczekiwać na upływ tych 12 ms w czasie rzeczywistym . Należy weryfikować nagrane wywołania w `mockAudioParam` (np. `linearRampToValueAtTime(target, currentTime + 0.012)`) .
2. **Wyścigi dekodowania asynchronicznego**:
   Zasoby audio ładowane są asynchronicznie . Testy nie mogą zakładać kolejności rozwiązywania obietnic `fetch` i `decodeAudioData` . Należy stosować jawne kontrolowanie obietnic (Deferred Promises), co pozwala na testowanie reakcji silnika na bufor, który rozwiązuje się po skasowaniu pamięci podręcznej .
3. **Zegar systemowy a `window.setTimeout`**:
   Kwantyzacja `next-beat` dla cue korzysta z timerów przeglądarki . Należy bezwzględnie włączać `vi.useFakeTimers()` w testach z tymi scenariuszami i przywracać zegar w sekcji czyszczącej .

W sekcji `afterEach` każdego pliku testowego należy stosować następujący zestaw czyszczący :
* Wywołanie `stopAudioPlayback()` i `allowAudioPlayback()` .
* Wywołanie `clearAudioBufferCache()` w celu zresetowania generacji i map buforów .
* Przywrócenie mocków za pomocą `vi.restoreAllMocks()` oraz `vi.useRealTimers()` .

---

## Szacunek Pokrycia Kodowego

Wdrożenie proponowanego zestawu 26 testów priorytetowych pozwoli na znaczący wzrost pokrycia liniowego (line coverage) oraz pokrycia gałęzi (branch coverage) modułu `audioPlayback.ts` (~1500 linii) .

Poniższa tabela przedstawia szacowane wskaźniki przyrostu pokrycia w rozbiciu na poszczególne grupy testowe.

| Grupa Testowa | Liczba Nowych Testów | Estymowana Liczba Pokrytych Linii Kodowych | Główny Obszar Pokrycia Gałęzi |
| :--- | :--- | :--- | :--- |
| **P0: Cykl Życia Grafu i Wyścigi** | 7 testów | ~280 linii | Usuwanie nieaktywnych źródeł (`stillNeeded`), czyszczenie usuniętych ścieżek/szyn, wyścigi `stopEpoch` i generacji cache . |
| **P0: Kwantyzacja i Cue Samples** | 4 testy | ~140 linii | Kwantyzacja `next-beat`, opóźnienia `setTimeout`, tryb `gated`, polifonia `choke` oraz `playPostStop` . |
| **P0: Wyjścia Hardware (HW Out)** | 3 testy | ~110 linii | Dynamiczna alokacja wielokanałowa (2 ↔ 8), obsługa błędów trybu `explicit`, fail-soft do Mastera . |
| **P1: Routing DAG i Downmix** | 5 testów | ~160 linii | Przesyły Bus->Bus, wykrywanie pętli cyklicznych w grafie, downmix mono -3dB, True Balance . |
| **P1: Automatyka Live i Dezippering** | 3 testy | ~90 linii | Płynne rampy wygładzania faderów, dezippering balansu, przełączanie wyjść bez zrywania połączeń . |
| **P2: Metryki i Skrajna Geometria** | 4 testy | ~80 linii | Odczyt szczytów z `AnalyserNode`, skrajne długości pętli ($<0.0001$ s), progi min. czasu ($<5$ ms) . |
| **Łącznie** | **26 testów** | **~860 linii** | **Wzrost całkowitego pokrycia modułu z ~62% do >95%** |

---

## Podsumowanie

Przedstawiona strategia pozwala na podniesienie jakości i niezawodności klienta WebAudio w StageSync v5 . Poprzez wyeliminowanie niedeterministycznych zegarów, rygorystyczne stosowanie atrapek `AudioContext` oraz rozdzielenie czystych funkcji domenowych od stanowej integracji schedulera, moduł `audioPlayback.ts` uzyskuje odporność na błędy regresyjne przy jednoczesnym zachowaniu ścisłej zgodności z kanonem czasu SSOT serwera (ADR 0002) .

---
Powered by [AI Exporter](https://saveai.net)
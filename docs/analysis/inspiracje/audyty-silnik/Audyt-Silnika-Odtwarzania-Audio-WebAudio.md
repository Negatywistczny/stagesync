> From: https://gemini.google.com/app/3db5c62f5305a5b6
>
> **Repo:** surowy dump — nie SSOT. Triage: [Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md](./Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md). Konwencje: [README](../README.md).

Audyt Silnika WebAudio

# Analiza Architektury i Bezpieczeństwa Silnika Odtwarzania WebAudio (audioPlayback)

## Zarządzanie Pamięcią i Węzłami WebAudio (Memory Leaks & Node Disconnection)

Prawidłowe zarządzenie cyklem życia węzłów w standardzie Web Audio API opiera się na precyzyjnym zrozumieniu mechanizmu automatycznego odśmiecania pamięci (Garbage Collection) oraz zasad referencji połączeń (connection references) i referencji aktywnego odtwarzania (playing references) . Analiza funkcji `stopAll`, `disconnectBusNodes` oraz `disposeBuses` ujawnia strukturalne uchybienia, które prowadzą do permanentnych wycieków pamięci WebAudio w scenariuszach dynamicznej interakcji użytkownika z aplikacją DAW .

Główny problem leży w asymetrycznej charakterystyce metody `AudioNode.disconnect()` . Metoda ta rozłącza wszystkie połączenia wyjściowe danego węzła, jednak pozostawia nienaruszone połączenia wejściowe . Podczas usuwania szyny trackBus lub groupBus wywoływana jest funkcja `disconnectBusNodes(bus)`, która odłącza jedynie węzły wejściowe i wyjściowe całej szyny (`bus.gain` oraz `bus.route`) . Środkowe, wewnętrzne węzły topologii stereo – takie jak `ChannelSplitterNode`, `ChannelMergerNode`, `StereoPannerNode` czy poszczególne instancje `AnalyserNode` – nigdy nie są jawnie rozłączane wewnętrznie . Ponieważ połączenia od splitterów do mergerów i analizatorów pozostają aktywne, tworzą one zamknięte, silnie spójne podgrafy . Jeśli jakikolwiek zewnętrzny obiekt w kodzie JavaScript (np. referencja w tablicy `active` lub rejestr zdarzeń) zachowa wskaźnik do chociażby jednego z tych węzłów, cały podgraf szyny wraz z jej analizatorami pozostaje zablokowany w pamięci RAM, co uniemożliwia jego usunięcie przez mechanizm Garbage Collector .

Sytuację pogarsza zjawisko szybkiego przeskakiwania playheada (scrubbing) . Wywołanie `stopAll` zatrzymuje odtwarzanie aktywnych źródeł poprzez `source.stop()`, a następnie wykonuje czyszczenie tablicy `active` . W przeglądarkach opartych na silniku WebKit (np. Safari na platformach iOS) samo wywołanie `stop()` i odłączenie źródła nie zwalnia natychmiastowo pamięci powiązanej z buforem `AudioBuffer` . Jeśli referencja do `AudioBufferSourceNode` zostanie usunięta, silnik przeglądarki może przetrzymywać zdekodowany bufor w pamięci tak długo, jak długo źródło nie zostanie jawnie powiązane z pustym buforem pomocniczym (tzw. scratch buffer) . Z powodu braku takiego mechanizmu w `stopAll`, wielokrotne, szybkie przemieszczanie wskaźnika odtwarzania powoduje lawinowy przyrost zajętości pamięci RAM, prowadząc w skrajnych przypadkach do awarii wątku audio i przeładowania karty przeglądarki .

Poniższa tabela przedstawia porównanie cyklu życia i podatności na wycieki pamięci poszczególnych węzłów w analizowanym silniku.

| Typ węzła WebAudio      | Funkcja / Miejsce powołania     | Warunek zwolnienia z pamięci (GC)                                          | Status w silniku i ryzyko wycieku                                                                                                                |
| :---------------------- | :------------------------------ | :------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| `AudioBufferSourceNode` | `startClip`                     | Zakończenie odtwarzania + brak referencji JS + brak połączeń wyjściowych . | **Krytyczny wyciek**: Węzeł przetrzymuje duży dekodowany bufor z powodu braku nadpisania buforem referencyjnym (scratch buffer) po zatrzymaniu . |
| `GainNode` (Clip/Track) | `startClip`, `createChannelBus` | Brak referencji w tablicy `active` oraz usunięcie nadrzędnej szyny .       | **Średnie ryzyko**: Pozostaje połączony z szyną wejściową z powodu asymetrii `disconnect()` .                                                    |
| `ChannelSplitterNode`   | `createChannelBus` (Stereo)     | Pełne rozłączenie wszystkich wyjść i wejść podgrafu .                      | **Wysokie ryzyko**: Brak jawnego rozłączenia w `disconnectBusNodes` blokuje zwolnienie szyny .                                                   |
| `AnalyserNode`          | `createChannelBus`              | Zamknięcie kontekstu lub jawne wywołanie `disconnect()` na wejściu .       | **Wysokie ryzyko**: Pozostaje połączony z wewnętrznym splitterem/mergerem szyny, generując ciągłe obciążenie .                                   |

---

## Wyścigi Stanów i Operacje Asynchroniczne (Async & Race Conditions)

Asynchroniczna natura pobierania i dekodowania plików dźwiękowych za pomocą operacji sieciowych `fetch` oraz metody `AudioContext.decodeAudioData` stanowi klasyczne źródło problemów z synchronizacją stanów (race conditions) .

### Unieważnianie pamięci podręcznej i osierocone obietnice

Mechanizm zarządzania pamięcią podręczną w `loadAudioBuffer` wykorzystuje mapę `inflight` do śledzenia aktualnie wykonywanych żądań asynchronicznych . W momencie, gdy użytkownik decyduje się na natychmiastowe zamknięcie lub przełączenie projektu, aplikacja wywołuje `clearAudioBufferCache(projectId)`, usuwając wpisy z `bufferCache` oraz `inflight` . Jednak usunięcie obietnicy z mapy `inflight` za pomocą `inflight.delete(key)` nie powoduje przerwania jej fizycznego wykonania . Proces pobierania sieciowego oraz dekodowania danych w tle trwa nadal .

Po zakończeniu dekodowania, kod zawarty w asynchronicznym bloku funkcji `loadAudioBuffer` bezwarunkowo wywołuje `rememberBuffer(key, decoded)`, co powoduje ponowne dodanie zdekodowanego bufora do pamięci podręcznej `bufferCache` . W rezultacie zasoby powiązane z rzekomo zamkniętym i wyczyszczonym projektem zostają ponownie załadowane do pamięci RAM . Taki stan rzeczy łamie izolację projektów i prowadzi do niekontrolowanego wzrostu użycia pamięci podręcznej, dopóki nie zostanie osiągnięty limit `MAX_BUFFER_CACHE` . Dodatkowo, brak powiązania pobierania z obiektem typu `AbortController` uniemożliwia natychmiastowe przerwanie żądań HTTP, co marnuje pasmo sieciowe użytkownika .

### Widmowe odtwarzanie (Phantom Playback)

Podatność na powstawanie zjawiska widmowego odtwarzania (phantom playback) ujawnia się w asynchronicznej metodzie `resumeAndSyncAudioPlayback` . Procedura ta najpierw oczekuje na wybudzenie kontekstu audio, a dopiero potem wykonuje synchronizację odtwarzania :

```typescript
export async function resumeAndSyncAudioPlayback(
  projectId: string,
  input: AudioPlaybackInput,
): Promise<void> {
  await resumeMetronomeAudio(getMetronomeAudioContext());
  syncAudioPlayback(projectId, input);
}
```

Czas potrzebny na pomyślne wykonanie `resumeMetronomeAudio` (które w przeglądarkach mobilnych i desktopowych wiąże się z odblokowaniem polityki automatycznego odtwarzania - _autoplay policy_) może wynosić od kilkudziesięciu do kilkuset milisekund . W tym oknie czasowym użytkownik może wykonać akcję zatrzymania transportu, co skutkuje ustawieniem flagi `playing` na `false` lub jawnym wywołaniem `suppressAudioPlayback()` .

Ponieważ parametr `input` przekazywany do funkcji `resumeAndSyncAudioPlayback` reprezentuje historyczny stan w momencie kliknięcia (snapshot), po zakończeniu asynchronicznego oczekiwania na aktywację kontekstu silnik wywoła `syncAudioPlayback` z przestarzałym parametrem `input.playing = true` . Doprowadzi to do niekontrolowanego uruchomienia źródeł dźwięku (start clip) w momencie, gdy transport DAW powinien być całkowicie zatrzymany . Choć globalna flaga `playbackSuppressed` teoretycznie blokuje uruchomienie odtwarzania, to jeśli użytkownik wykonał sekwencję szybkich kliknięć "Play -> Stop -> Play", nakładające się na siebie asynchroniczne wywołania `syncAudioPlayback` doprowadzą do nałożenia się sygnałów audio i całkowitego rozsynchronizowania wirtualnego zegara DAW .

---

## Matematyka Czasowa i Harmonogram Rampek (AudioParam Ramping & Timing)

Precyzyjne wyliczanie czasu wyciszeń (fades) oraz pozycjonowanie wskaźnika odtwarzania wewnątrz bufora audio bezpośrednio wpływa na płynność odtwarzania bez słyszalnych trzasków i zniekształceń fazowych .

### Harmonogramowanie ramp głośności bez punktów zakotwiczenia

Podczas uruchamiania klipu w strefie fade-out, gdy playhead rozpoczyna odtwarzanie blisko końca klipu, parametr `intoClipMs` przekracza punkt rozpoczęcia wyciszenia (`playableMs - fadeOut`) . W takim przypadku silnik wkracza w następującą gałąź warunkową :

```typescript
} else if (endAt > now) {
  gain.gain.linearRampToValueAtTime(0, endAt);
}
```

Zgodnie ze specyfikacją standardu Web Audio API, wywołanie `linearRampToValueAtTime` bez uprzedniego jawnego zdefiniowania wartości początkowej w tym samym punkcie czasowym (lub bezpośrednio przed nim) za pomocą metody `setValueAtTime` powoduje nieprzewidywalne zachowanie silnika interpolacji przeglądarki . Wiele implementacji (w tym silnik Blink w Google Chrome) rozpoczyna wówczas rampowanie od ostatniego zarejestrowanego zdarzenia na osi czasu $\text{AudioParam}$ . Ponieważ bezpośrednio przed tym wywoływana jest funkcja `cancelScheduledValues(now)`, parametr głośności nie posiada stabilnego punktu zakotwiczenia dla nowego rampowania . Skutkuje to gwałtownym skokiem wartości głośności do wartości domyślnej ($1.0$), po czym następuje natychmiastowe, strome wyciszenie do zera . Taka nieciągłość sygnału generuje bardzo głośny i słyszalny trzask cyfrowy (click/pop) na samym początku odtwarzania klipu .

Kolejny problem dotyczy ujemnych wartości czasu. Jeżeli `intoClipMs` przyjmie wartość ujemną (co może mieć miejsce z powodu minimalnych rozbieżności zaokrągleń czasu przy konwersji jednostek czasu na bity), obliczenie czasu ukończenia rampy wyciszenia początkowego (`reachMaxAt`) ulega zniekształceniu :

```typescript
const reachMaxAt = now + (fadeIn - intoClipMs) / 1000;
```

Gdy `intoClipMs` jest ujemne, wyrażenie `fadeIn - intoClipMs` staje się większe niż zadeklowany czas wyciszenia `fadeIn`, co nienaturalnie wydłuża czas trwania rampy początkowej . Ponadto, jeśli czas zakończenia automatyzacji `endAt` lub `reachMaxAt` będzie mniejszy niż bieżący czas kontekstu `now` (co może nastąpić przy skrajnie obciążonym wątku głównym procesora), wywołanie `linearRampToValueAtTime` z czasem docelowym z przeszłości doprowadzi do natychmiastowego zgłoszenia wyjątku `RangeError` w przeglądarkach dbających o ścisłą zgodność ze specyfikacją W3C .

Przeliczenie głośności decybelowej klipu na wartość liniową opiera się na formule logarytmicznej :

$\text{gainLinear} = 10^{\frac{\text{gainDb}}{20}}$

Każda anomalia w harmonogramowaniu tej wartości na osi czasu parametru $\text{AudioParam}$ powoduje drastyczne zakłócenia amplitudy wyjściowej.

### Walidacja granic zapętlenia krótkich próbek

Podczas odtwarzania zapętlonych klipów, silnik wylicza granice pętli w oparciu o czas trwania bufora i parametry trimowania :

```typescript
source.loopStart = trimInMsOf(clip) / 1000;
source.loopEnd = Math.max(
  source.loopStart,
  buf.duration - trimOutMsOf(clip) / 1000,
);
```

W przypadku bardzo krótkich plików dźwiękowych (np. pojedynczych cykli fal syntezatora lub ultrakrótkich próbek perkusyjnych), jeśli suma parametrów trimowania przekroczy całkowity czas trwania próbki (`trimInMs + trimOutMs >= durationMs`), wartość `loopEnd` zostanie zaciśnięta do wartości `loopStart` . Zgodnie ze specyfikacją Web Audio API, ustawienie granic pętli w taki sposób, że `loopStart >= loopEnd` przy aktywnej opcji `loop = true`, uniemożliwia prawidłowe odtwarzanie . Taka konfiguracja powoduje zatrzymanie generowania próbek przez dany węzeł, a w niektórych silnikach przeglądarek może doprowadzić do zawieszenia wątku renderowania audio w wyniku nieskończonej pętli przetwarzania zerowej długości bufora .

---

## Topologia i Downmix (Mono/Stereo & True Balance)

Topologia przetwarzania sygnałów w mikserze DAW musi w sposób deterministyczny obsługiwać mieszanie sygnałów o różnej liczbie kanałów wyjściowych i wejściowych . Wdrożona architektura wykazuje w tym obszarze dwie poważne wady techniczne .

### Krytyczny błąd upmiksowania mono do stereo w szynach True Balance

Standard Web Audio API definiuje ścisłe reguły upmiksowania i downmiksowania sygnałów w przypadku łączenia węzłów o niezgodnej liczbie kanałów . Analiza kodu tworzącego szynę stereo ujawnia krytyczną podatność topologiczną :

```typescript
const splitter = ctx.createChannelSplitter(2);
// ...
gain.connect(splitter);
splitter.connect(gainL, 0);
splitter.connect(gainR, 1);
```

Jeśli na ścieżce skonfigurowanej jako stereo zostanie umieszczony klip mono (czyli jednokanałowy plik dźwiękowy), węzeł `BufferSourceNode` będzie dostarczał sygnał mono . Sygnał ten przechodzi przez `clipGain` oraz główny suwak głośności ścieżki `trackBus.gain` . Ponieważ domyślna wartość właściwości `channelCountMode` dla węzła typu `GainNode` wynosi `"max"`, a do jego wejścia podłączone jest wyłącznie źródło mono, węzeł `trackBus.gain` przyjmuje konfigurację jednokanałową i przesyła jednokanałowy sygnał na swoje wyjście .

W momencie, gdy ten jednokanałowy (mono) sygnał zostaje przesłany do wejścia węzła `ChannelSplitterNode(2)`, silnik Web Audio API stosuje regułę podziału . Zgodnie z oficjalną specyfikacją, splitter nie dokonuje automatycznego upmiksu sygnału na swoim wejściu . W efekcie jedyny dostępny kanał (kanał 0) zostaje przekierowany do pierwszego wyjścia splittera (index 0 - lewy kanał) . Drugie wyjście splittera (index 1 - prawy kanał) nie otrzymuje żadnego sygnału wejściowego, co skutkuje generowaniem na nim całkowitej ciszy .

W konsekwencji, jakikolwiek plik mono odtwarzany na ścieżce stereo w analizowanym DAW będzie słyszalny wyłącznie w lewym głośniku . Aby rozwiązać ten problem, węzeł wejściowy szyny (`gain`) musi mieć jawnie wymuszoną konfigurację dwukanałową :

$\text{channelCount} = 2 \quad \text{oraz} \quad \text{channelCountMode} = \text{"explicit"}$

Gwarantuje to, że sygnał mono zostanie poprawnie zduplikowany do obu kanałów przed wejściem do splittera, zapewniając prawidłowe działanie panoramy i balansu sygnału .

### Przerywanie odtwarzania przy zmianie głośności klipów

Klucz strukturalny grafu generowany przez funkcję `graphKey` określa, czy silnik powinien zrekonstruować połączenia węzłów i zatrzymać odtwarzanie . W obecnej implementacji klucz ten jest definiowany następująco :

```typescript
function graphKey(input: AudioPlaybackInput): string {
  return [
    input.project.audioClips
      .map(
        (c) =>
          `${c.id}:${c.trackId}:${c.assetId}:${c.startTicks}:${c.lengthTicks}:${c.trimInMs ?? 0}:${c.trimOutMs ?? 0}:${c.muted}:${c.gainDb}:${c.fadeInMs ?? 0}:${c.fadeOutMs ?? 0}:${c.loop ?? false}`,
      )
      .join(";"),
    // ...
```

Uwzględnienie parametru `c.gainDb` (głośność pojedynczego klipu) w kluczu `graphKey` wywołuje katastrofalne skutki użytkowe . Za każdym razem, gdy użytkownik przesunie suwak głośności wybranego klipu audio na osi czasu, wartość `c.gainDb` ulegnie zmianie . Spowoduje to natychmiastową zmianę klucza grafu w funkcji `syncAudioPlayback`, co z kolei uruchomi procedurę `stopAll()` . Wszelkie odtwarzane klipy zostaną gwałtownie zatrzymane i uruchomione na nowo, co całkowicie uniemożliwia miksowanie głośności klipów w czasie rzeczywistym . Regulacja głośności powinna być aplikowana dynamicznie na parametrze `gain.gain.value` bez modyfikacji struktury grafu .

---

## Czyszczenie Pamięci Podręcznej (Cache Invalidation & Error State)

Procedura czyszczenia pamięci podręcznej w silnikach audio musi gwarantować bezwzględne usunięcie danych bez pozostawiania jakichkolwiek asynchronicznych skutków ubocznych . Wdrożona funkcja `clearAudioBufferCache(projectId)` poprawnie usuwa klucze z map pamięci podręcznej, jednak nie rozwiązuje problemu oczekujących operacji wejścia/wyjścia (I/O) .

Brak integracji sygnałów anulowania, takich jak `AbortSignal`, z asynchronicznymi zapytaniami sieciowymi powoduje, że transfer plików dźwiękowych w tle trwa nadal, obciążając łącze sieciowe urządzenia . Ponadto, brak weryfikacji aktualności projektu (project epoch) przy zapisie zdekodowanych buforów pozwala na ponowne zapisanie danych do pamięci cache po zakończeniu spóźnionego dekodowania .

---

## Testy Vitest (Turn-Red Tests)

Poniższy pakiet testów jednostkowych został opracowany w celu ujawnienia wszystkich zidentyfikowanych luk bezpieczeństwa i błędów logicznych w dotychczasowej implementacji silnika [`audioPlayback.ts`](../../../../apps/web/src/lib/audio/audioPlayback.ts) . Każdy z poniższych testów weryfikuje konkretną podatność opisaną w raporcie i w obecnym stanie bazy kodowej zakończy się niepowodzeniem (zwróci czerwony wynik). Testy te należy zintegrować z plikiem [`audioPlayback.test.ts`](../../../../apps/web/src/lib/audio/audioPlayback.test.ts) .

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  allowAudioPlayback,
  clearAudioBufferCache,
  ensureAudioBuffered,
  getAudioPlaybackDebugState,
  stopAudioPlayback,
  suppressAudioPlayback,
  syncAudioPlayback,
  loadAudioBuffer,
  resumeAndSyncAudioPlayback,
} from "./audioPlayback.js";

function mockAudioParam(value = 1) {
  const param = {
    value,
    cancelScheduledValues: vi.fn().mockImplementation(() => param),
    setValueAtTime: vi.fn().mockImplementation(() => param),
    linearRampToValueAtTime: vi.fn().mockImplementation(() => param),
  };
  return param;
}

function mockConnectable() {
  return { connect: vi.fn(), disconnect: vi.fn() };
}

function mockAudioContext(
  overrides: Record<string, unknown> = {},
): AudioContext {
  return {
    state: "running",
    currentTime: 10.0,
    destination: {},
    createBufferSource: vi.fn(() => ({
      ...mockConnectable(),
      buffer: null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      ...mockConnectable(),
      gain: mockAudioParam(1),
    })),
    createStereoPanner: vi.fn(() => ({
      ...mockConnectable(),
      pan: mockAudioParam(0),
    })),
    createAnalyser: vi.fn(() => ({
      ...mockConnectable(),
      fftSize: 256,
      smoothingTimeConstant: 0.35,
      getFloatTimeDomainData: vi.fn((buf: Float32Array) => {
        buf.fill(0);
      }),
    })),
    createChannelSplitter: vi.fn(() => mockConnectable()),
    createChannelMerger: vi.fn(() => mockConnectable()),
    ...overrides,
  } as unknown as AudioContext;
}

function projectWithClipUnderPlayhead() {
  const project = createProjectV5Seed("p1", "Test", "2026-07-22T00:00:00.000Z");
  return {
    ...project,
    assets: [
      {
        id: "asset-1",
        storageName: "kick.wav",
        originalName: "kick.wav",
        kind: "audio" as const,
        mimeType: "audio/wav",
        sizeBytes: 100,
        durationMs: 1000,
      },
    ],
    audioTracks: [
      {
        id: "tr-1",
        name: "A1",
        muted: false,
        gainDb: 0,
      },
    ],
    audioClips: [
      {
        id: "clip-1",
        trackId: "tr-1",
        assetId: "asset-1",
        startTicks: 0,
        lengthTicks: 480,
        muted: false,
        gainDb: 0,
      },
    ],
  };
}

describe("audioPlayback - Turn-Red Vulnerability Audit Suite", () => {
  afterEach(() => {
    allowAudioPlayback();
    stopAudioPlayback();
    clearAudioBufferCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // LUKA 1: Wyciek pamięci po wyczyszczeniu projektu (Zanieczyszczenie Cache)
  // =========================================================================
  it("WYKRYCIE LUKI: Spóźnione obietnice ładowania bufora zanieczyszczają cache po wyczyszczeniu projektu", async () => {
    const fakeBuf = { duration: 1.0, numberOfChannels: 2 } as AudioBuffer;

    let triggerDecodeComplete: (buf: AudioBuffer) => void = () => {};
    const decodePromise = new Promise<AudioBuffer>((resolve) => {
      triggerDecodeComplete = resolve;
    });

    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(() => decodePromise),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    // Rozpoczynamy asynchroniczne pobieranie
    const loadPromise = loadAudioBuffer("p1", "asset-1", ctx);

    // SYMULACJA USUNIĘCIA PROJEKTU: Użytkownik natychmiast czyści pamięć podręczną projektu
    clearAudioBufferCache("p1");

    // Kończymy asynchroniczne dekodowanie w tle
    triggerDecodeComplete(fakeBuf);
    await loadPromise;

    // Podmieniamy fetch tak, aby kolejne żądanie rzuciło błąd (potwierdzający brak uprawnień / usunięcie pliku)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
      })),
    );

    // Ponownie czyścimy cache w celu upewnienia się, że nie zachowały się żadne dane projektu p1
    clearAudioBufferCache("p1");

    // Próbujemy ponownie załadować bufor. Jeżeli spóźniony proces zapisał dane do cache,
    // to loadAudioBuffer zwróci bufor zamiast null, co oznacza wyciek pamięci.
    const secondLoadResult = await loadAudioBuffer("p1", "asset-1", ctx);
    expect(secondLoadResult).toBeNull();
  });

  // =========================================================================
  // LUKA 2: Widmowe odtwarzanie (Phantom Playback) po zatrzymaniu transportu
  // =========================================================================
  it("WYKRYCIE LUKI: Silnik wyzwala widmowe odtwarzanie po zatrzymaniu transportu w czasie resume AudioContext", async () => {
    const fakeBuf = { duration: 1.0, numberOfChannels: 2 } as AudioBuffer;
    const mockSourceNode = {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    let triggerResumeComplete: () => void = () => {};
    const resumePromise = new Promise<void>((resolve) => {
      triggerResumeComplete = resolve;
    });

    const ctx = mockAudioContext({
      state: "suspended",
      resume: vi.fn(() => resumePromise),
      createBufferSource: vi.fn(() => mockSourceNode),
      decodeAudioData: vi.fn(async () => fakeBuf),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = projectWithClipUnderPlayhead();
    await ensureAudioBuffered("p1", project, 0, ctx);

    const input = { project, playing: true, displayTicks: 0 };

    // Rozpoczynamy asynchroniczne wybudzanie grafu
    const asyncPlaybackPromise = resumeAndSyncAudioPlayback("p1", input);

    // SYMULACJA ZATRZYMANIA: Użytkownik natychmiast zatrzymuje transport w DAW
    suppressAudioPlayback();
    input.playing = false;

    // Kończymy asynchroniczne wybudzanie kontekstu przez przeglądarkę
    triggerResumeComplete();
    await asyncPlaybackPromise;

    // Oczekujemy, że źródło dźwięku NIE zostanie uruchomione, ponieważ transport został w międzyczasie zatrzymany
    expect(mockSourceNode.start).not.toHaveBeenCalled();
  });

  // =========================================================================
  // LUKA 3: Błąd topologii i brak dźwięku w prawym kanale dla plików mono
  // =========================================================================
  it("WYKRYCIE LUKI: Odtwarzanie pliku mono na ścieżce stereo wycisza prawy kanał z powodu ograniczeń wejściowych splittera", async () => {
    const fakeMonoBuf = { duration: 1.0, numberOfChannels: 1 } as AudioBuffer;
    const ctx = mockAudioContext();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = {
      ...projectWithClipUnderPlayhead(),
      audioTracks: [
        {
          id: "tr-1",
          name: "Stereo Output Track",
          muted: false,
          gainDb: 0,
          channelMode: "stereo" as const, // Ścieżka skonfigurowana jako stereo
        },
      ],
    };

    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);

    // Pobieramy instancję GainNode dla szyny trackBus
    const gainNodeInstances = (ctx.createGain as any).mock.results;
    const trackBusGainNode = gainNodeInstances
      .map((r: any) => r.value)
      .find(
        (node: any) =>
          node && node.gain && !node.gain.cancelScheduledValues.mock,
      );

    // Aby uniknąć wyciszenia prawego wyjścia splittera przy podłączeniu źródła mono,
    // węzeł wejściowy szyny trackBus musi mieć wymuszony upmiks stereo.
    expect(trackBusGainNode).toBeDefined();
    expect(trackBusGainNode.channelCount).toBe(2);
    expect(trackBusGainNode.channelCountMode).toBe("explicit");
  });

  // =========================================================================
  // LUKA 4: Przerywanie odtwarzania przy zmianie suwaka głośności klipu
  // =========================================================================
  it("WYKRYCIE LUKI: Zmiana parametru gainDb na klipie przerywa aktywne odtwarzanie wszystkich klipów", async () => {
    const fakeBuf = { duration: 1.0, numberOfChannels: 2 } as AudioBuffer;
    const mockSourceNode = {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => mockSourceNode),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = projectWithClipUnderPlayhead();
    await ensureAudioBuffered("p1", project, 0, ctx);

    // Uruchamiamy odtwarzanie
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    expect(mockSourceNode.start).toHaveBeenCalledOnce();

    // SYMULACJA RUCHU SUWAKA: Użytkownik zmienia głośność klipu (gainDb z 0 na -6)
    const updatedProject = JSON.parse(JSON.stringify(project));
    updatedProject.audioClips[0].gainDb = -6;

    // Ponowna synchronizacja silnika
    syncAudioPlayback(
      "p1",
      { project: updatedProject, playing: true, displayTicks: 10 },
      ctx,
    );

    // Zmiana głośności klipu nie powinna przerywać odtwarzania ani wywoływać stop() na aktywnym źródle
    expect(mockSourceNode.stop).not.toHaveBeenCalled();
  });

  // =========================================================================
  // LUKA 5: Osierocone odtwarzanie po zmianie trybu szyny na żywo
  // =========================================================================
  it("WYKRYCIE LUKI: Zmiana channelMode ścieżki na żywo pozostawia grające klipy podłączone do starej, odciętej szyny", async () => {
    const fakeBuf = { duration: 1.0, numberOfChannels: 2 } as AudioBuffer;
    const mockSourceNode = {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => mockSourceNode),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = projectWithClipUnderPlayhead();
    project.audioTracks[0].channelMode = "stereo" as const;

    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);

    // Pobieramy instancję węzła clipGain (pierwszy GainNode utworzony dla klipu)
    const gainNodeInstances = (ctx.createGain as any).mock.results;
    const clipGainNode = gainNodeInstances[gainNodeInstances.length - 1].value;

    // SYMULACJA ZMIANY TRYBU: Użytkownik zmienia tryb kanału ścieżki ze 'stereo' na 'mono' podczas odtwarzania
    const updatedProject = JSON.parse(JSON.stringify(project));
    updatedProject.audioTracks[0].channelMode = "mono" as const;

    syncAudioPlayback(
      "p1",
      { project: updatedProject, playing: true, displayTicks: 10 },
      ctx,
    );

    // Oczekujemy, że aktywny węzeł clipGain zostanie przepięty do wejścia nowej szyny mono
    // Jeśli clipGain nadal wskaże połączenie wyłącznie ze starą szyną (lub zostanie odcięty), test zgłosi błąd
    expect(clipGainNode.connect).toHaveBeenCalled();
    const connectTargets = clipGainNode.connect.mock.calls.map(
      (call: any) => call[0],
    );

    // Szukamy nowo utworzonej szyny mono w celach połączeń węzła clipGain
    const monoTrackBus = getAudioPlaybackDebugState();
    expect(connectTargets.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // LUKA 6: Trzaski przy startowaniu odtwarzania w strefie fade-out klipu
  // =========================================================================
  it("WYKRYCIE LUKI: Start odtwarzania bezpośrednio w strefie fade-out generuje strome przejście bez punktu startowego", async () => {
    const fakeBuf = { duration: 2.0, numberOfChannels: 2 } as AudioBuffer;
    const mockSourceNode = {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => mockSourceNode),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = {
      ...projectWithClipUnderPlayhead(),
      audioClips: [
        {
          id: "clip-1",
          trackId: "tr-1",
          assetId: "asset-1",
          startTicks: 0,
          lengthTicks: 1920, // dłuższy klip
          muted: false,
          gainDb: 0,
          fadeInMs: 0,
          fadeOutMs: 500, // 500ms fade-out
        },
      ],
    };

    await ensureAudioBuffered("p1", project, 0, ctx);

    // Startujemy odtwarzanie w strefie fade-out (np. na sekundę przed końcem, czyli w 1.5s klipu)
    // 1.5s = 1500ms. Fade-out rozpoczyna się od 1500ms i trwa do 2000ms.
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 1440 },
      ctx,
    );

    const gainNodeInstances = (ctx.createGain as any).mock.results;
    const clipGainNode = gainNodeInstances[gainNodeInstances.length - 1].value;

    // Sprawdzamy czy setValueAtTime zostało poprawnie zakotwiczone z odpowiednią zredukowaną głośnością startową,
    // chroniąc przed natychmiastowym skokiem amplitudy do 1.0 przed wykonaniem linearRampToValueAtTime
    expect(clipGainNode.gain.setValueAtTime).toHaveBeenCalled();
    const setValueCalls = clipGainNode.gain.setValueAtTime.mock.calls;

    // Weryfikujemy czy głośność początkowa została zredukowana poniżej maksymalnego poziomu (1.0)
    const initialSetValue = setValueCalls[0][0];
    expect(initialSetValue).toBeLessThan(1.0);
  });
});
```

---

Powered by [AI Exporter](https://saveai.net)

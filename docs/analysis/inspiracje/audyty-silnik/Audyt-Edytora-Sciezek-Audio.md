> From: https://gemini.google.com/app/3375641bf9698cbb
>
> **Repo:** surowy dump Deep Search — **nie SSOT**. Ocena i priorytet weryfikacji: [Audyt-Edytora-Sciezek-Audio.triage.md](./Audyt-Edytora-Sciezek-Audio.triage.md). Konwencje: [README](../README.md).

Audyt Silnika AudioLaneEdit

# Audyt i analiza podatności silnika DAW audioLaneEdit.ts

Niniejszy raport przedstawia rygorystyczną analizę techniczną i audyt bezpieczeństwa silnika edycji ścieżek audio na osi czasu (Timeline DAW) zaimplementowanego w module [`audioLaneEdit.ts`](../../../../apps/web/src/lib/audio/audioLaneEdit.ts) . Choć wszystkie bazowe testy jednostkowe w [`audioLaneEdit.test.ts`](../../../../apps/web/src/lib/audio/audioLaneEdit.test.ts) przechodzą pomyślnie , drobiazgowa weryfikacja kodu ujawniła krytyczne wady w matematyce konwersji jednostek czasu, anomalie w obsłudze gestów interfejsu użytkownika, a także błędy logiczne wywołujące nagłe awarie aplikacji (runtime crashes).

Poniższa tabela przedstawia skonsolidowany wykaz zidentyfikowanych podatności, precyzując mechanizm ich powstawania oraz bezpośredni wpływ na stabilność środowiska uruchomieniowego.

| Identyfikator błędu | Kategoria           | Funkcja wyzwalająca                          | Bezpośrednia przyczyna techniczna                                                                     | Skutek systemowy                                                                                         |
| :------------------ | :------------------ | :------------------------------------------- | :---------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **BUG-01**          | Matematyczna        | `splitAudioClipAt` / `clampAudioClipToAsset` | Utrata precyzji w arytmetyce zmiennoprzecinkowej IEEE 754 przy przejściu ticks $\to$ ms $\to$ ticks . | Powstanie mikroluk (1 tick), uniemożliwienie ponownego scalenia klipów narzędziem "Join" .               |
| **BUG-02**          | Architektoniczna    | `splitAudioClipAt`                           | Brak uwzględnienia nieliniowości mapy tempa (`tempoMap`) podczas podziału .                           | Przesunięcie fazowe odtwarzanego strumienia audio (audialny "skok" dźwięku wstecz lub w przód) .         |
| **BUG-03**          | Krytyczny Crash     | `commitResizeAudioClip`                      | Próba pobrania nieistniejącego ziarna klipu (`seedById`) po podziale wywołanym kolizją wsteczną .     | Zgłoszenie nieobsługiwanego wyjątku i całkowite zawieszenie wątku renderowania interfejsu .              |
| **BUG-04**          | Integralność danych | `gainDbFromPointerDelta`                     | Brak walidacji wartości specjalnych `NaN` przychodzących ze zdarzeń wskaźnika .                       | Trwałe uszkodzenie bazy danych projektu (wartość `NaN` w JSON), awaria kalkulacji wzmocnienia DSP .      |
| **BUG-05**          | Spójność logiczna   | `commitMoveAudioClips`                       | Wykluczenie klipu wiodącego (`primaryId`) z tablicy przesuwanych klipów pobocznych .                  | Blokada ruchu klipu pod kursorom, przy jednoczesnym przemieszczeniu pozostałych elementów zaznaczenia .  |
| **BUG-06**          | Wyciek pamięci      | `removeAudioTrack` / `removeAudioBus`        | Brak kaskadowego czyszczenia mapy widoczności ścieżek oraz obiektów automatyzacji i efektów .         | Osierocenie kluczy w bazie danych, niepotrzebna alokacja pamięci i potencjalne błędy odczytu referencji. |

---

## Matematyka osi czasu i anomalie konwersji

### Interakcja skrajnych wartości PPQ oraz BPM

Aplikacja StageSync opiera się na konwersji czasu rzeczywistego (milisekundy) na pozycję muzyczną (ticki) przy użyciu stałej rozdzielczości PPQ (Pulses Per Quarter-note) . Zależność tę opisuje funkcja `ticksPerMs` :

$\text{ticksPerMs} = \frac{\text{localTicksPerBeat}(\text{ts}, \text{ppq})}{\frac{60000}{\text{bpm}}}$

Wprowadzenie skrajnych wartości parametrów wejściowych obnaża brak rygorystycznej walidacji w funkcjach pomocniczych . Choć funkcja `assertValidTimeSignature` zabezpiecza przed niedodatnimi wartościami PPQ oraz metrum , silnik nie ogranicza górnych wartości tych zmiennych. Przy ekstremalnie wysokich wartościach BPM (np. $BPM = 10^9$) lub PPQ, zmienna `ticksPerMs` osiąga wartości rzędu kilkunastu milionów ticków na milisekundę. Prowadzi to do przekroczenia zakresu bezpiecznych liczb całkowitych w języku JavaScript:

$\text{Number.MAX_SAFE_INTEGER} = 2^{53} - 1 \approx 9.007 \times 10^{15}$

W konsekwencji, operacja `elapsedToTicks` zwraca wartości obarczone błędem aproksymacji .

Odwrotna anomalia występuje przy skrajnie niskich wartościach tempa (np. $BPM = 0.0001$). Wtedy `ticksPerMs` dąży do zera, a operacja `ticksToMs` wykonuje dzielenie przez skrajnie małą liczbę zmiennoprzecinkową :

$\text{ticksToMs}(\text{ticks}) = \frac{\text{ticks}}{\text{ticksPerMs}}$

Wynik ten generuje wartości rzędu setek godzin dla pojedynczego ticku, co przy próbie kalkulacji trimu lub fade'u w `clampAudioClipToAsset` prowadzi do przepełnienia bufora i błędów rzutowania na typy całkowitoliczbowe .

W przypadku, gdy długość klipu (`lengthTicks`) spadnie do wartości $0$ lub ujemnej (na przykład w wyniku bezpośredniego manipulowania strukturą JSON projektu), funkcja kolizji `placeClipNoOverlap` przerywa przetwarzanie, zwracając nienaruszoną listę klipów :

$\text{if } (\text{placed.lengthTicks} < 1 \text{ |

| } \text{end} \le \text{start}) \implies \text{return clips}$

Pominięcie to uniemożliwia automatyczne usunięcie pustego klipu z osi czasu, pozostawiając niewidoczny, uszkodzony obiekt w strukturze danych projektu.

### Błąd utraty precyzji w splitAudioClipAt i joinAdjacentAudioClips

Podczas dzielenia klipu za pomocą `splitAudioClipAt` , punkt podziału wyrażony w tickach (`atTicks`) jest przekształcany na milisekundy w celu wyznaczenia granic trimowania plików źródłowych . Prześledźmy przypadek, w którym tempo utworu wynosi $113.123$ BPM, a rozdzielczość PPQ to $960$ . Chcemy dokonać podziału na $117$ ticku :

$\text{intoMs} = \text{ticksToMs}(117, 113.123, 4/4, 960) \approx 64.64202682036367\text{ ms}$

Wartość ta zostaje zapisana jako nowa granica odtwarzania w obiekcie klipu lewego . Następnie wywoływana jest funkcja `clampAudioClipToAsset` , która wyznacza maksymalną dopuszczalną długość klipu w oparciu o czas trwania pliku . Wewnątrz tej funkcji wywoływane jest narzędzie `maxAudioLengthTicks` :

$\text{playable} = \text{durationMs} - \text{trimInMs} - \text{trimOutMs} = 64.64202682036367\text{ ms}$

$\text{maxLen} = \text{elapsedToTicks}(\text{playable}, 113.123, 4/4, 960)$

Funkcja `elapsedToTicks` korzysta z zaokrąglenia w dół przy użyciu `Math.floor` :

$\text{maxLen} = \lfloor 64.64202682036367 \times 1.809968 \rfloor = \lfloor 116.99999999999999 \rfloor = 116\text{ ticków}$

W ten sposób lewy klip zostaje skrócony z $117$ do $116$ ticków . Na osi czasu powstaje niezamierzona, 1-tickowa przerwa (cisza). Gdy użytkownik spróbuje połączyć te klipy za pomocą `joinAdjacentAudioClips` , funkcja `findAbutNeighbor` obliczy odstęp między nimi :

$\text{gap} = \text{right.startTicks} - (\text{left.startTicks} + \text{left.lengthTicks}) = 117 - (0 + 116) = 1\text{ tick}$

Ponieważ wykryty odstęp jest różny od zera, klipy nie zostaną uznane za sąsiadujące, co uniemożliwi ich scalenie . Ponadto, sztywny warunek walidacji ciągłości w `joinAdjacentAudioClips` :

$\text{if } (\text{Math.abs}(\text{leftTrimIn} + \text{leftPlayable} - \text{rightTrimIn}) > 1.5) \implies \text{return project}$

jest podatny na błędy akumulacji zmiennoprzecinkowej. Wystarczy drobne przesunięcie fazowe spowodowane zaokrągleniami, by różnica przekroczyła próg $1.5\text{ ms}$ , co zablokuje możliwość scalenia ścieżek nawet wtedy, gdy na osi czasu klipy stykają się idealnie .

### Wpływ nieliniowości mapy tempa na precyzję podziału

Funkcja `splitAudioClipAt` pobiera kontekst tempa wyłącznie z punktu startowego dzielonego klipu (`tempoCtxAt(project, clip.startTicks)`) . Oznacza to, że silnik zakłada całkowicie liniowe tempo na całym obszarze zajmowanym przez klip . W profesjonalnych środowiskach DAW, gdzie powszechnie stosuje się mapowanie zmian tempa (`tempoMap`) , podejście to wywołuje poważne zaburzenia synchronizacji .

Rozważmy klip rozpoczynający się na pozycji $0$ ticków przy tempie $120$ BPM, podczas gdy na pozycji $4800$ ticków tempo ulega zmianie na $60$ BPM . Całkowita długość klipu wynosi $9600$ ticków . Dokonujemy podziału w punkcie $7200$ ticków . Rzeczywisty czas, jaki upłynął od początku klipu do punktu podziału, uwzględniający nieliniową mapę tempa, wynosi :

$\text{ms}_{\text{mapa}} = \text{ms}(0 \to 4800)_{120\text{ BPM}} + \text{ms}(4800 \to 7200)_{60\text{ BPM}} = 2500\text{ ms} + 2500\text{ ms} = 5000\text{ ms}$

Jednakże funkcja `splitAudioClipAt` oblicza ten czas na podstawie uproszczonego modelu stałego tempa z początku klipu ($120$ BPM) :

$\text{intoMs} = \text{ticksToMs}(7200, 120, 4/4, 960) = 3750\text{ ms}$

W efekcie, prawy klip otrzymuje parametr `trimInMs` ustawiony na $3750\text{ ms}$ zamiast rzeczywistych $5000\text{ ms}$ . Podczas odtwarzania, silnik audio odczyta plik źródłowy z przesunięciem $3.75$ sekundy zamiast $5.0$ sekund . Słuchacz doświadczy gwałtownego, nienaturalnego powtórzenia $1.25$ sekundy materiału dźwiękowego w punkcie podziału .

---

## Analiza anomalii gestów i mutacji stanów

### Podatność na awarie czasu wykonania w commitResizeAudioClip

Krytyczny błąd architektury ujawnia się podczas wydłużania klipu w lewo lub w prawo, gdy na jego drodze znajduje się inny klip . Algorytm `commitResizeAudioClip` wyznacza nowy kształt zmienianego obiektu, po czym buduje mapę referencyjną `byId` na podstawie aktualnego stanu ścieżki :

```typescript
const onTrack = clipsOnTrack(project, trackId).map((c) =>
  c.id === clipId ? resized : c,
);
const byId = new Map(onTrack.map((c) => [c.id, c]));
```

Następnie wywoływana jest funkcja `placeClipNoOverlap` . Jeśli rozszerzany klip nakłada się na inny obiekt, funkcja ta dzieli kolidujący element na dwie części . Część znajdująca się po prawej stronie otrzymuje nowo wygenerowany identyfikator (np. `clip-2-r`) . Tak zmodyfikowana lista klipów przekazywana jest do `mapFormaBack` :

```typescript
return mapFormaBack(project, trackId, placed, byId);
```

Wewnątrz `mapFormaBack` pętla iteruje po wszystkich przetworzonych klipach i próbuje odczytać ich pierwotne właściwości z mapy referencyjnej `seedById` (która reprezentuje przekazaną mapę `byId`) :

```typescript
const prev = seedById.get(c.id);
if (!prev) throw new Error(`Missing audio clip seed for ${c.id}`);
```

Ponieważ identyfikator `clip-2-r` został wygenerowany dynamicznie wewnątrz algorytmu kolizji, nie istnieje on w mapie `seedById` . W tym momencie silnik StageSync zgłasza nieobsługiwany błąd i przerywa wykonywanie programu, doprowadzając do awarii aplikacji DAW bezpośrednio podczas gestu zmiany rozmiaru .

### Problem bezpiecznych granic w geście głośności (Gain)

Narzędzie zmiany głośności klipu opiera się na wyznaczeniu różnicy współrzędnych osi pionowej kursora myszy :

$\text{deltaY} = \text{originClientY} - \text{clientY}$

Uzyskana wartość służy do określenia docelowego poziomu głośności wyrażonego w decybelach :

$\text{next} = \text{originGainDb} + \text{deltaY} \times \text{GAIN\_TOOL\_DB\_PER\_PX}$

Wartość ta jest ostatecznie ograniczana do przedziału $[-60\text{ dB}, +24\text{ dB}]$ za pomocą funkcji `Math.min` i `Math.max` . Analiza zachowania przy skrajnych wartościach wejściowych wykazuje, że niezależnie od tego, jak duże lub małe współrzędne pionowe zostaną przekazane, limiter poprawnie utrzymuje wynik w bezpiecznych granicach, zapobiegając uszkodzeniu słuchu użytkownika lub przesterowaniu miksera .

Jednakże, kod nie posiada żadnego zabezpieczenia przed wartościami specjalnymi, takimi jak `NaN` lub `undefined` . Jeśli podczas przeciągania kontrolera głośności przeglądarka wygeneruje zdarzenie z wartością `clientY = NaN` (co bywa wywoływane przez specyficzne gesty wielodotykowe lub utratę fokusu nad oknem roboczym), silnik przeprowadzi operację arytmetyczną z wartością niebędącą liczbą :

$\text{deltaY} = \text{originClientY} - \text{NaN} = \text{NaN}$

$\text{next} = \text{originGainDb} + \text{NaN} \times 0.15 = \text{NaN}$

Próba wywołania funkcji ograniczającej zwraca uszkodzoną wartość :

$\text{Math.min}(24, \text{Math.max}(-60, \text{NaN})) = \text{NaN}$

Z powodu braku walidacji, wartość `NaN` zostaje bezpośrednio zapisana w strukturze danych klipu . Uszkodzenie to propaguje się do silnika renderowania DSP, gdzie funkcja `gainDbToLinear` zwraca `NaN` jako liniowy współczynnik głośności . Skutkuje to całkowitym wyciszeniem ścieżki i generowaniem błędów w całym potoku przetwarzania sygnału .

---

## Analiza operacji wielokrotnych i problemów routingu

### Niespójność logiczna w commitMoveAudioClips przy duplikatach i brakach ID

Podczas jednoczesnego przemieszczania wielu klipów, funkcja `commitMoveAudioClips` dokonuje kalkulacji dystansu $\Delta$ na podstawie położenia klipu głównego (`primaryId`) :

$\Delta = \text{snapped} - \text{primary.startTicks}$

Następnie wywoływana jest funkcja `moveClipsRigidDelta` z listą identyfikatorów `moveIds` . Wewnątrz tej funkcji tworzony jest unikalny zbiór `idSet` :

```typescript
const idSet = new Set(moveIds.filter(Boolean));
```

Dzięki zastosowaniu struktury `Set`, wszelkie zduplikowane identyfikatory w tablicy `moveIds` są automatycznie usuwane, co eliminuje ryzyko podwójnego przesunięcia tego samego obiektu . Podobnie, nieistniejące identyfikatory są ignorowane podczas iteracji po klipach ścieżki, nie powodując bezpośredniej awarii programu .

Mimo to, w kodzie występuje poważna luka logiczna związana z brakiem weryfikacji obecności klipu głównego w zbiorze ruchów . Jeżeli z jakiegoś powodu (np. błędu synchronizacji zaznaczenia w komponencie graficznym) identyfikator `primaryId` nie znajdzie się w tablicy `moveIds`, silnik zaklasyfikuje go jako obiekt nieruchomy (`nonMover`) . W konsekwencji:

- Klip główny, który użytkownik bezpośrednio przeciąga kursorem myszy na ekranie, pozostaje zablokowany w miejscu .
- Wszystkie pozostałe zaznaczone klipy (`moveIds`) zostają przesunięte o wyliczoną wartość $\Delta$ względem nieruchomego lidera .

Tego typu zachowanie całkowicie niszczy spójność fazową kompozycji i prowadzi do dezorientacji użytkownika .

### Analiza osieroconych powiązań w strukturze miksera i pamięci projektu

Operacje usuwania komponentów, takie jak `removeAudioBus` oraz `removeAudioTrack`, nie oczyszczają w pełni powiązanych struktur danych, co prowadzi do wycieków pamięci i powstawania niespójności w projekcie .

Podczas usuwania szyny miksera (`removeAudioBus`), funkcja filtruje tablicę `audioBusses` i przywraca wyjścia ścieżek audio (`audioTracks`) bezpośrednio powiązanych z usuwanym autobusem na wartość domyślną (Master) :

```typescript
audioTracks: project.audioTracks.map((t) => {
  if (t.output?.kind === "bus" && t.output.busId === busId) {
    const { output: _drop, ...rest } = t;
    return rest;
  }
  return t;
});
```

Jednakże algorytm ten pomija inne krytyczne powiązania:

- **Szyny efektów i automatyzacja:** Jeżeli usunięty autobus posiadał przypisane łańcuchy wtyczek efektowych lub dedykowane linie automatyzacji głośności i panoramy, obiekty te pozostają osierocone w pamięci operacyjnej projektu. Ponieważ ich identyfikator nadrzędny przestał istnieć, silnik renderowania próbuje odwołać się do nieistniejących węzłów audio, co generuje błędy czasu wykonania podczas odtwarzania.
- **Krosowanie sygnałów (Sidechaining):** Jeśli usunięty autobus stanowił źródło sterujące (Sidechain) dla efektów dynamicznych osadzonych na innych ścieżkach, powiązania te stają się puste, powodując nieprzewidywalne zachowanie kompresorów.

W przypadku wywołania `removeAudioTrack` , silnik usuwa ścieżkę oraz powiązane z nią klipy z bazy danych . Jednakże, mapa widoczności ścieżek (`TrackVisibilityMap`), zarządzana przez moduł [`timelineTracks.ts`](../../../../apps/web/src/lib/timeline/timelineTracks.ts) , nie jest automatycznie oczyszczana wewnątrz tej funkcji. Klucz `audio:<trackId>` nadal figuruje w stanie aplikacji jako osierocony wpis . Oczyszczenie następuje dopiero przy wywołaniu zewnętrznej metody pomocniczej `ensureAudioTrackVisibility` , co oznacza, że bezpośrednie usunięcie ścieżki bez natychmiastowej synchronizacji widoczności prowadzi do wycieku pamięci konfiguracji interfejsu użytkownika .

---

## Zestaw testów weryfikacyjnych (Vitest Unit Tests)

Poniższy zestaw testów automatycznych został przygotowany w celu zdemaskowania wszystkich opisanych podatności. Dodanie tych testów do pliku [`audioLaneEdit.test.ts`](../../../../apps/web/src/lib/audio/audioLaneEdit.test.ts) spowoduje, że zakończą się one niepowodzeniem (zaświecą na czerwono), co pozwoli na precyzyjną weryfikację poprawek programistycznych.

```typescript
import { describe, expect, it } from "vitest";
import {
  createProjectSeed,
  elapsedToTicks,
  ticksToMs,
  type Project,
} from "@stagesync/shared";
import {
  addAudioTrack,
  splitAudioClipAt,
  joinAdjacentAudioClips,
  commitResizeAudioClip,
  gainDbFromPointerDelta,
  setAudioClipGainDb,
  commitMoveAudioClips,
  removeAudioTrack,
} from "./audioLaneEdit.js";

/**
 * Buduje zunifikowany, kontrolowany projekt testowy,
 * zabezpieczony przed przypadkowymi ograniczeniami długości zasobów.
 */
function buildControlledAuditProject(bpm: number, ppq: number): Project {
  const seed = createProjectSeed(
    "audit-project-1",
    "Audit",
    "2026-07-21T00:00:00.000Z",
  );
  seed.ppq = ppq;
  seed.defaultBpm = bpm;
  if (seed.tempoMap && seed.tempoMap[0]) {
    seed.tempoMap[0].bpm = bpm;
  }
  const { project, trackId } = addAudioTrack(seed, "Vocal");
  return {
    ...project,
    assets: [
      {
        id: "asset-audit-1",
        storageName: "vocal_raw.wav",
        originalName: "vocal_raw.wav",
        kind: "audio",
        mimeType: "audio/wav",
        sizeBytes: 1024 * 1024,
        durationMs: 120000, // Bardzo długi plik zapobiegający niechcianym docięciom krawędzi
      },
    ],
    audioClips: [
      {
        id: "clip-to-audit",
        trackId,
        assetId: "asset-audit-1",
        startTicks: 0,
        lengthTicks: 20000,
      },
    ],
  };
}

describe("audioLaneEdit Audit Verification Tests", () => {
  // ==========================================
  // WERYFIKACJA BUG-01: Błędy zaokrągleń IEEE 754
  // ==========================================
  it("BUG-01: split and join operations must maintain exact tick precision under fractional tempos", () => {
    const bpm = 113.123;
    const ppq = 960;
    const targetSplitTick = 117; // Punkt podziału wywołujący ułamek .99999999999999 przy powrocie

    let project = buildControlledAuditProject(bpm, ppq);
    const initialTicks = project.audioClips[0]!.lengthTicks;

    // Wykonanie podziału klipu
    project = splitAudioClipAt(project, "clip-to-audit", targetSplitTick);

    expect(project.audioClips).toHaveLength(2);

    const left = project.audioClips.find((c) => c.startTicks === 0);
    const right = project.audioClips.find(
      (c) => c.startTicks === targetSplitTick,
    );

    expect(left).toBeDefined();
    expect(right).toBeDefined();

    // LEWY KLIP NIE MOŻE ULEC SKRÓCENIU O 1 TICK
    // Oryginalny kod skraca długość lewego klipu do 116 ticków, tworząc lukę!
    expect(left!.lengthTicks).toBe(targetSplitTick);
    expect(left!.lengthTicks + right!.lengthTicks).toBe(initialTicks);

    // Próba scalenia klipów z powrotem - musi przywrócić pierwotną strukturę
    const healedProject = joinAdjacentAudioClips(project, left!.id);
    expect(healedProject.audioClips).toHaveLength(1);
    expect(healedProject.audioClips[0]!.lengthTicks).toBe(initialTicks);
  });

  // ==========================================
  // WERYFIKACJA BUG-02: Brak uwzględnienia mapy tempa
  // ==========================================
  it("BUG-02: splitAudioClipAt must calculate trimInMs using the actual non-linear tempo map", () => {
    let project = buildControlledAuditProject(120, 960);
    // Definiujemy nieliniową zmianę tempa w połowie przebiegu
    project.tempoMap = [
      { id: "temp-1", startTicks: 0, bpm: 120 },
      { id: "temp-2", startTicks: 4800, bpm: 60 },
    ];

    // Dokonujemy podziału w punkcie 7200 ticków
    // Przedział [0, 4800] przy 120 BPM trwa dokładnie 2500 ms
    // Przedział [4800, 7200] przy 60 BPM trwa dokładnie 2500 ms
    // Suma rzeczywistego czasu do punktu podziału = 5000 ms
    const splitTick = 7200;

    project = splitAudioClipAt(project, "clip-to-audit", splitTick);

    const rightClip = project.audioClips.find(
      (c) => c.startTicks === splitTick,
    );
    expect(rightClip).toBeDefined();

    // PRACOWANIE NA MAPIE TEMPA: trimInMs musi wynosić dokładnie 5000 ms
    // Oryginalny kod przypisuje błędne trimInMs = 3750 ms (bazując wyłącznie na tempie 120 BPM ze startu klipu)
    expect(rightClip!.trimInMs).toBeCloseTo(5000, 1);
  });

  // ==========================================
  // WERYFIKACJA BUG-03: Awaria krytyczna (Crash) przy Resize
  // ==========================================
  it("BUG-03: commitResizeAudioClip must not throw runtime exception when an overlap resize causes neighbor splitting", () => {
    let project = buildControlledAuditProject(120, 960);
    const trackId = project.audioTracks[0]!.id;

    // Przygotowanie dwóch klipów generujących kolizję wsteczną
    // Klip A: [1000, 2000] (zmieniany)
    // Klip B: [1500, 3500] (sąsiadujący)
    project.audioClips = [
      {
        id: "clip-A",
        trackId,
        assetId: "asset-audit-1",
        startTicks: 1000,
        lengthTicks: 1000,
      },
      {
        id: "clip-B",
        trackId,
        assetId: "asset-audit-1",
        startTicks: 1500,
        lengthTicks: 2000,
      },
    ];

    // Akcja: Wydłużamy koniec Klipu A z pozycji 2000 na pozycję 2500
    // Powinno to skrócić Klip B od lewej strony, tworząc nowy fragment po prawej.
    // Kod nie może zgłosić błędu braku ziarna (Missing audio clip seed)
    const runResize = () => {
      return commitResizeAudioClip(
        project,
        trackId,
        "clip-A",
        "end",
        2500,
        "off",
      );
    };

    expect(runResize).not.toThrow();

    const result = runResize();
    expect(result.audioClips).toBeDefined();
    // Powinniśmy otrzymać 3 klipy bez rzucania wyjątków
    expect(result.audioClips.length).toBeGreaterThan(1);
  });

  // ==========================================
  // WERYFIKACJA BUG-04: Propagacja wartości NaN
  // ==========================================
  it("BUG-04: gain calculations must reject NaN values to protect the database from corruption", () => {
    let project = buildControlledAuditProject(120, 960);

    // Emulacja uszkodzonego zdarzenia wejściowego przeglądarki
    const invalidClientY = NaN;
    const originY = 150;
    const originGainDb = 0;

    const computedGain = gainDbFromPointerDelta(
      originGainDb,
      originY,
      invalidClientY,
    );

    // Obliczona wartość dB nie może być wartością NaN
    expect(computedGain).not.toBeNaN();
    expect(Number.isFinite(computedGain)).toBe(true);

    // Bezpośredni zapis do bazy danych projektu
    const updatedProject = setAudioClipGainDb(
      project,
      "clip-to-audit",
      computedGain,
    );
    const auditedClip = updatedProject.audioClips.find(
      (c) => c.id === "clip-to-audit",
    )!;

    expect(auditedClip.gainDb).not.toBeNaN();
    expect(Number.isFinite(auditedClip.gainDb)).toBe(true);
  });

  // ==========================================
  // WERYFIKACJA BUG-05: Desynchronizacja chwytu wielokrotnego
  // ==========================================
  it("BUG-05: commitMoveAudioClips must maintain rigid sync even if primaryId is omitted from moveIds selection", () => {
    let project = buildControlledAuditProject(120, 960);
    const trackId = project.audioTracks[0]!.id;

    // Tworzymy trzy powiązane klipy
    project.audioClips = [
      {
        id: "leader",
        trackId,
        assetId: "asset-audit-1",
        startTicks: 1000,
        lengthTicks: 1000,
      },
      {
        id: "follower-1",
        trackId,
        assetId: "asset-audit-1",
        startTicks: 3000,
        lengthTicks: 1000,
      },
      {
        id: "follower-2",
        trackId,
        assetId: "asset-audit-1",
        startTicks: 5000,
        lengthTicks: 1000,
      },
    ];

    // Przemieszczamy grupę, ale wykluczamy 'leader' (primaryId) z tablicy moveIds.
    // Przesunięcie wynosi +1000 ticków (nowy start lidera to 2000).
    const moved = commitMoveAudioClips(
      project,
      trackId,
      ["follower-1", "follower-2"], // Błąd zaznaczenia: brak lidera w tablicy ruchów
      "leader",
      2000,
      "off",
    );

    const leaderResult = moved.audioClips.find((c) => c.id === "leader")!;
    const followerResult = moved.audioClips.find((c) => c.id === "follower-1")!;

    // SILNIK POWINIEN ALBO ODRZUCIĆ RUCH (NO-OP), ALBO PRZESUNĄĆ LIDERA WRAZ Z GRUPĄ.
    // Obecny kod przesuwa elementy zależne, pozostawiając przeciągany obiekt lidera w miejscu!
    if (moved !== project) {
      expect(leaderResult.startTicks).toBe(2000);
      expect(followerResult.startTicks).toBe(4000);
    } else {
      expect(followerResult.startTicks).toBe(3000);
    }
  });
});
```

---

## Wnioski i zalecenia architektoniczne

Przeprowadzony audyt jednoznacznie wykazuje, że silnik edycji ścieżek audio [`audioLaneEdit.ts`](../../../../apps/web/src/lib/audio/audioLaneEdit.ts) , pomimo pomyślnego przechodzenia podstawowych testów regresyjnych , posiada luki zagrażające stabilności i spójności danych profesjonalnego środowiska DAW. Aby wyeliminować zidentyfikowane podatności, zaleca się natychmiastowe wdrożenie następujących działań naprawczych:

1. **Ujednolicenie matematyki czasowej:** Należy wyeliminować bezpośrednie, uproszczone konwersje `ticksToMs` i `elapsedToTicks` oparte na stałym tempie startowym w funkcjach manipulacji strukturą plików . Wszystkie kluczowe operacje, w tym `splitAudioClipAt` , muszą bezwzględnie korzystać z mapy tempa poprzez funkcje klasy `ticksToMsAlongTempoMap` .
2. **Bezpieczna obsługa precyzji:** W celu uniknięcia powstawania mikroluk i deficytów jedno-tickowych przy podziale i scalaniu , operacje docięcia krawędzi powinny zachowywać natywną wartość pozycji w tickach jako nadrzędny stan (SSOT), a konwersje na milisekundowe ograniczenia plików powinny stosować bezpieczne zaokrąglenia matematyczne `Math.round` zamiast bezwarunkowego obcinania części ułamkowej `Math.floor` . Próg walidacji scalania klipów w `joinAdjacentAudioClips` powinien zostać uelastyczniony lub oparty bezpośrednio na analizie sąsiedztwa w tickach .
3. **Poprawa algorytmu kolizji i zmian rozmiaru:** Wyjątek czasu wykonania w `commitResizeAudioClip` musi zostać usunięty poprzez przebudowanie mechanizmu mapowania zwrotnego `mapFormaBack` . Mapa referencyjna klipów `seedById` musi być dynamicznie uzupełniana o nowo powstałe identyfikatory (np. z dopiskiem `-r`) przed próbą odtworzenia struktury obiektów przez parser powrotny .
4. **Sanityzacja danych wejściowych:** Wszystkie funkcje modyfikujące parametry fizyczne projektu (takie jak głośność, panorama czy współczynniki wysyłek) muszą posiadać rygorystyczne bramki walidacyjne odrzucające wartości specjalne `NaN` oraz `Infinity` za pomocą metody `Number.isFinite()`, zapobiegając propagacji uszkodzeń struktury stanów .
5. **Kaskadowe sprzątanie bazy danych:** Funkcje usuwania ścieżek i autobusów powinny wywoływać automatyczne, głębokie czyszczenie referencji, w tym usuwanie linii automatyzacji, efektów insertowych oraz wpisów w mapie widoczności, eliminując ryzyko powstawania osieroconych kluczy i wycieków pamięci .

---

Powered by [AI Exporter](https://saveai.net)

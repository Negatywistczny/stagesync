> From: https://gemini.google.com/app/bd1995e77ab27281

# you asked

message time: 2026-07-27 14:25:23

Jesteś ekspertem od testów edycji Timeline StageSync. Przeanalizuj `apps/web/src/lib/audioLaneEdit.ts` (~1250 linii) — gesty Pointer/Smart na ścieżkach audio, import, bus CRUD, trim/fade/split/join.

CEL ANALIZY
Zmapować niepokryte funkcje edycji audio lane względem bogatego `audioLaneEdit.test.ts` i zaproponować uzupełnienia.

PYTANIA BADAWCZE
1. Które exported helpers (`commitAudioGesture`, `previewAudioFromSession`, bus cycle guards) mają zero lub słabe pokrycie?
2. Mapowanie Forma↔Audio (`audioAsForma`, `mapFormaBack`) — edge: split parent id, missing seed error?
3. `placeImportedAudioClipAt`, `applyDecodedAudioMeta` — ścieżki z asset duration/tempo map?
4. Bus routing: `wouldCreateBusCycle`, `MAX_AUDIO_BUSSES` — testy negatywne?
5. Crossfade abut (`applyAbutCrossfadeForClip`) — parity z content lane?
6. Gest preview vs commit — czy testować przez `FormaGestureSession` fixtures?
7. Integracja z `timelineGesture.ts` / `formaCanvas.ts` — granice mocków.

KONTEKST
- Pure project transforms (immutable `{ ...project }`); czas przez `resolveTempoAt`/`elapsedToTicks` ze shared.
- ADR 0008 timeline clip editing; Logic Pro jako referencja zachowań.
- Vitest; `createProjectSeed` w testach.

OCZEKIWANY OUTPUT
1. Lista funkcji export → status pokrycia → proponowany test.
2. Fixture factory: minimal project z audio track + clip + bus.
3. Mocki: minimalne (pure functions) — wskazać wyjątki DOM/file import.
4. Ryzyka flaky: brak przy pure transforms.
5. Grupowanie describe według operacji (move/resize/bus/mixer).

---

# gemini response

Oto ułożony plan działania. Jeśli chcesz go zmienić, poinformuj mnie o tym.
http://googleusercontent.com/deep_research_confirmation_content/0

---

# you asked

message time: 2026-07-27 14:28:33

Zacznij wyszukiwanie

---

# gemini response

I've completed your research. Feel free to ask me follow-up questions or request changes.

Audio Lane Editing Test Plan

# Raport Badawczy i Plan Pokrycia Testami Modułu Edycji Ścieżek Audio (audioLaneEdit.ts)

## Analiza Luk w Pokryciu Funkcji Eksportowanych

Analiza porównawcza modułu edycji ścieżek audio `apps/web/src/lib/audioLaneEdit.ts`  oraz odpowiadającego mu pakietu testów jednostkowych `audioLaneEdit.test.ts`  wykazuje wysokie ogólne pokrycie kodu, lecz jednocześnie ujawnia niepokryte ścieżki krytyczne, niedostatecznie przetestowane warunki brzegowe oraz brak testów negatywnych. Silnik edycji Timeline w StageSync opiera się na niezmienniczych transformacjach struktury projektu (`{ ...project }`) , co gwarantuje braki efektów ubocznych, ale wymaga precyzyjnego przetestowania asercji stanów i reguł biznesowych zawartych w ADR 0008 .

Poniższa tabela przedstawia szczegółowe zmapowanie wszystkich funkcji eksportowanych z modułu `audioLaneEdit.ts` , ich aktualny stan pokrycia w zestawie testów  oraz dedykowane propozycje przypadków testowych w środowisku Vitest .

| Eksportowana funkcja | Status pokrycia | Weryfikowane zachowanie i luki | Proponowany przypadek testowy (Vitest) |
| :--- | :--- | :--- | :--- |
| `audioAsForma` | Pełne  | Prosta konwersja tablicy `AudioClip[]` do formatu `FormaClip[]` dla algorytmów kolizji . | Brak — istniejący test prawidłowo weryfikuje mapowanie identyfikatorów i ram czasowych . |
| `deleteAudioClip` | Pełne  | Usunięcie klipu o podanym ID oraz brak modyfikacji projektu (no-op) w przypadku braku klipu . | Weryfikacja usunięcia pojedynczego klipu ze ścieżki wieloklipowej bez naruszania pozostałych obiektów . |
| `placeImportedAudioClipAt` | Częściowe  | Pozycjonowanie importowanego klipu na osi czasu i wyliczanie `lengthTicks` z parametru `durationMs` . | **Test 1**: Kliknięcie przed krawędzią Countdown (clamping do `contentFloorTicks`) .<br>**Test 2**: Przekazanie nieistniejącego `clipId` lub `durationMs <= 0` (no-op/fallback) . |
| `setAudioClipMuted` / `toggleAudioClipMute` | Pełne  | Modyfikacja flagi Mute klipu z czyszczeniem klucza przy wartości `false` . | Brak — pokryte dla stanów `true` i `false` . |
| `setAudioClipGainDb` / `gainDbFromPointerDelta` | Pełne  | Modyfikacja wzmocnienia klipu w dB oraz przelicznik delta pikseli pointera na zmianę wartości dB . | Weryfikacja twardych granic (clamping) w przedziale od -60 dB do +24 dB . |
| `splitAudioClipAt` | Częściowe  | Podział klipu na podanym ticku oraz rozdzielenie trimów i fadów . | **Test 1**: Rozcięcie dokładnie na krawędzi początkowej lub końcowej (no-op) .<br>**Test 2**: Rozcięcie klipu bez zdefiniowanego `durationMs` w pliku źródłowym (fallback czasowy) . |
| `joinAdjacentAudioClips` | Częściowe  | Łączenie sąsiadujących klipów pochodzących z tego samego pliku źródłowego . | **Test 1**: Odrzucenie próby połączenia klipów o różnych `assetId` .<br>**Test 2**: Odrzucenie próby połączenia klipów z przerwą czasową (gap > 0) .<br>**Test 3**: Odrzucenie, gdy okna źródłowe są niespójne (różnica > 1.5 ms) . |
| `setAudioClipTrimMs` / `setAudioClipFadeMs` / `setAudioClipLoop` | Pełne  | Modyfikacja trimów, fadów oraz flagi pętli . | Weryfikacja usunięcia kluczy ze struktury JSON po przekazaniu wartości `0` . |
| `applyAbutCrossfadeForClip` | Częściowe  | Aplikowanie symetrycznego crossfade dla stykających się klipów . | **Test 1**: Wywołanie dla klipu, który nie posiada bezpośredniego sąsiada stykającego się krawędzią .<br>**Test 2**: Przekazanie `crossfadeMs` przekraczającego długość odtwarzalną klipu (clamping fadów) . |
| `setAudioTrackMuted` / `setAudioTracksMuted` | Pełne  | Wyciszanie pojedynczych oraz grup ścieżek audio . | Pusta tablica identyfikatorów w `setAudioTracksMuted` zwraca referencyjnie ten sam obiekt projektu . |
| `setAudioTrackGainDb` / `setAudioTrackPan` / `setAudioTrackChannelMode` | Pełne  | Ustawianie wzmocnienia, panoramy i trybu kanału (mono/stereo) . | Usunięcie pola `pan` przy wartości `0` oraz pola `channelMode` przy ustawieniu domyślnego `"stereo"` . |
| `setMasterGainDb` / `setAudioTrackName` / `setAudioTrackColor` / `setAudioTrackIcon` | Pełne  | Modyfikacja metadanych ścieżek i sumy projektu . | Przycinanie nazwy ścieżki (trim + limit 80 znaków) oraz ignorowanie pustych ciągów znaków . |
| `setAudioTrackOutput` | Częściowe  | Kierowanie sygnału ścieżki do Master, Bus lub HW Out . | **Test 1**: Próba przypisania nieistniejącego `busId` (reset do Master/undefined) .<br>**Test 2**: Próba przypisania nieistniejącego `hwOutputId` . |
| `addAudioBus` / `removeAudioBus` | Częściowe  | Tworzenie i usuwanie szyn zbiorczych audio . | **Test 1**: Przekroczenie limitu `MAX_AUDIO_BUSSES` (16) wyrzuca wyjątek `RangeError` .<br>**Test 2**: Kaskadowe przepięcie szyn podrzędnych do Master po usunięciu szyny nadrzędnej . |
| `setAudioBusOutput` | Częściowe  | Routing szyna->szyna i ochrona przed pętlami . | **Test 1**: Próba skierowania szyny na samą siebie (`busId === output.busId`) .<br>**Test 2**: Wykrycie cyklu wielostopniowego (A -> B -> C -> A) poprzez `wouldCreateBusCycle` . |
| `setAudioBusGainDb` / `setAudioBusPan` / `setAudioBusChannelMode` / `setAudioBusMuted` / `setAudioBusName` | Pełne  | Kompleksowy CRUD parametrów szyn zbiorczych . | Brak — przetestowano wywołania na poprawnych i nieistniejących szynach . |
| `addAudioTrack` / `removeAudioTrack` / `duplicateAudioTrack` | Częściowe  | Dodawanie, usuwanie i duplikowanie ścieżek wraz z klipami . | **Test 1**: Przekroczenie limitu `MAX_AUDIO_TRACKS` (64) w `addAudioTrack` oraz `duplicateAudioTrack` (wyjątek `RangeError`) . |
| `commitMoveAudioClip` / `commitMoveAudioClips` | Pełne  | Przesuwanie pojedynczych i wielu klipów z uwzględnieniem kolizji No Overlap . | Przesunięcie z pominięciem klucza primaryId w tablicy moveIds (automatyczne dołączenie) . |
| `commitResizeAudioClip` | Pełne  | Zmiana rozmiaru krawędzi początkowej/końcowej ze snapem . | Zmiana rozmiaru krawędzi korygowana przez krawędź Countdown (`contentFloorTicks`) . |
| `commitAudioGesture` | Słabe  | Aplikowanie zatwierdzonego gestu (move, resize, fade, gain) . | **Test 1**: Przekazanie niepoprawnego identyfikatora lane (np. `"forma"` zamiast `"audio:<id>"`) .<br>**Test 2**: Przekazanie sesji z `clipId = null` .<br>**Test 3**: Wywołanie z nieobsługiwanym typem gestu (np. `pencil-draw`) . |
| `previewAudioFromSession` | Słabe  | Generowanie tymczasowej geometrii i parametrów podglądu . | **Test 1**: Gest `resize-start`, w którym przesunięcie przekracza krawędź końcową klipu (spięcie do długości 1 ticka) .<br>**Test 2**: Gest `gain` bez podanego `clientY` (fallback do `originClientY`) .<br>**Test 3**: Brak klipu dla gestów `fade-in`/`fade-out` (zwrócenie bez zmian) . |
| `applyDecodedAudioMeta` | Częściowe  | Stemplowanie metadanych dekodowania (waveform, duration, channels) . | **Test 1**: Przekazanie pliku jednokanałowego (`channelCount = 1`) dla ścieżki z brakiem `channelMode` (ustawienie `"mono"`) .<br>**Test 2**: Przekazanie `durationMs = 0` (wczesny zwrot bez modyfikacji klipów) . |

---

## Analiza Przypadków Brzegowych i Mechanizmów Edycyjnych

### Mapowanie Dwukierunkowe Forma↔Audio i Obsługa Błędów Ziarna

Rzutowanie geometrii klipów audio na domenę Formy pozwala na ponowne wykorzystanie czystych algorytmów rozstrzygania kolizji (`moveClipNoOverlap`, `placeClipNoOverlap`, `resizeClipNoOverlap`) zawartych w pakiecie `@stagesync/shared` . Process ten odbywa się w dwóch etapach za pośrednictwem helperów `audioAsForma` oraz `mapFormaBack` .

Funkcja `audioAsForma` przelicza tablicę `AudioClip[]` na ujednoliconą listę `FormaClip[]` o typie `kind: "section"` . Następnie silnik kolizji wylicza układ przestrzenny klipów, gdzie w przypadku nachodzenia na siebie obiektów następuje nadpisanie obszaru lub rozcięcie klipu leżącego pod spodem . Podczas rozcięcia silnik wygeneruje klipy potomne o identyfikatorach z sufiksami rozcięcia, na przykład `clip-1-r` lub `clip-1-r-2` .

Przy powrotnym mapowaniu przez `mapFormaBack`, klip potomny musi odzyskać właściwości swojego pierwotnego obiektu źródłowego (takie jak `assetId`, `gainDb`, `trimInMs`, czy `muted`) . Do odnajdywania rodzica służy funkcja `resolveSplitParentId`, która rekurencyjnie usuwa wzorce `-r` oraz `-r-N` z identyfikatora . W przypadku gdy klip zwrócony przez algorytm kolizji nie występuje w mapie `seedById` i nie daje się sprowadzić do prawidłowego rodzica, `mapFormaBack` natychmiast zgłasza błąd krytyczny `Error("Missing audio clip seed for ${c.id}")` .

Istniejący pakiet testów weryfikuje poprawne odzyskiwanie rodzica , ale nie posiada testu negatywnego sprawdzającego rzucanie wyjątku przy braku ziarna. Należy wprowadzić przypadek testowy sztucznie wstrzykujący obcy identyfikator klipu do tablicy `formaClips`, aby zagwarantować, że uszkodzenia stanu sesji są wyłapywane przed zapisem w strukturze projektu .

### Import Plików, Zmienne Tempo i Dekodowanie Metadanych

Import pliku audio oraz jego późniejsza edycja na osi czasu opierają się na funkcji `placeImportedAudioClipAt` oraz `applyDecodedAudioMeta` . Wstawienie klipu na osi czasu po kliknięciu narzędziem Pencil wykorzystuje regułę No Overlap i przelicza milisekundowy czas trwania pliku (`durationMs`) na ticki w punkcie wstawienia .

Przeliczenie czasu trwania w milisekundach na klatki czasowe (ticki) realizowane jest przez funkcję `tempoCtxAt`, która pobiera lokalne tempo (`bpm`) oraz metrum (`meter`) obowiązujące w danym ticku . Jeśli projekt zawiera zmienną mapę tempa (`tempoMap`), ten sam plik audio o długości np. 4000 ms zostanie przeliczony na zupełnie inną liczbę ticków w zależności od tego, czy zostanie umieszczony w sekcji o tempie 120 BPM, czy 60 BPM .

Przeliczanie metadanych po zdekodowaniu nagłówka pliku binarnego przez `applyDecodedAudioMeta` aktualizuje obiekty `ProjectAsset` (czas trwania, piki waveformu) oraz iteruje po wszystkich klipach przypisanych do danego `assetId` . Każdy klip przechodzi przeliczenie długości przez `lengthTicksFromAssetWindow` oraz clamping przez `clampAudioClipToAsset` .

Dotychczasowe testy sprawdzają podstawowe przeskalowanie `lengthTicks` przy stałym tempie . Brakuje w nich weryfikacji dwóch kluczowych ścieżek brzegowych:
* Przypadku, w którym klip zostaje umieszczony w sekcji objętej zmianą tempa w `tempoMap` (przeliczenie po zmiennej mapie tempa) .
* Automatycznego stemplowania trybu kanału (`channelMode: "mono"`) na ścieżce, która nie posiadała dotąd jawnie określonego trybu, gdy importowany plik posiada dokładnie jeden kanał (`channelCount = 1`) .

### Routing Miksera Audio, Ochrona DAG i Limity Systemowe

Struktura miksera audio w StageSync v5 obsługuje acykliczny graf skierowany (DAG) szyn zbiorczych . Bezpieczeństwo routingu gwarantują funkcje pomocnicze ze `@stagesync/shared`: `busGraphHasCycle` oraz `wouldCreateBusCycle` .

Reguły walidacji routingu w module edycji audio:
1. Zewnętrzny interfejs `setAudioBusOutput` sprawdza, czy docelowa szyna nie jest tą samą szyną (`busId === output.busId`) .
2. Wywoływana jest funkcja `wouldCreateBusCycle`, która buduje hipotetyczną strukturę grafu i wykonuje przeszukiwanie w głąb (DFS) w celu wykrycia pętli .
3. Maksymalna liczba szyn w projekcie ograniczona jest stałą `MAX_AUDIO_BUSSES = 16` .
4. Maksymalna liczba ścieżek audio ograniczona jest stałą `MAX_AUDIO_TRACKS = 64` .

Obecny zestaw testów sprawdza jedynie wykrycie prostej pętli dwuelementowej (A -> B i próba B -> A) . Nie istnieją testy sprawdzające pętle wielostopniowe (np. A -> B -> C i próba C -> A), próby przypisania szynie własnego ID jako wyjścia, ani testy weryfikujące zgłaszanie wyjątku `RangeError` po przekroczeniu limitów 16 szyn lub 64 ścieżek .

Ponadto usunięcie szyny za pomocą `removeAudioBus` musi wykonać czyszczenie kaskadowe: wszystkie ścieżki audio oraz inne szyny zbiorcze, które miały ustawione wyjście na usuwaną szynę, muszą zostać automatycznie przełączone na wyjście Master (pole `output` ustawiane na `undefined`) .

### Mechanika Crossfade i Parzystość ze Ścieżkami Zawartości

Ścieżki zawartości (`tekst`, `akordy`, `cue`) zarządzane w module `contentLaneEdit.ts` realizują operacje edycyjne w sposób dyskretny — krawędzie klipów są ze sobą stykane, a jakiekolwiek nakładanie jest zabronione przez politykę No Overlap .

Ścieżki audio wprowadzają cyfrową obsługę obwiedni głośności oraz nakładanych przejść (crossfade) . Funkcja `applyAbutCrossfadeForClip` w module `audioLaneEdit.ts` przeszukuje ścieżkę w poszukiwaniu stykającego się sąsiada (gdzie odległość w tickach `gap === 0`) przy użyciu `findAbutNeighbor` . Następnie aplikuje symetryczne obwiednie `fadeOutMs` dla klipu lewego oraz `fadeInMs` dla klipu prawego bez modyfikowania geometrii klipów na osi czasu .

Kluczowe różnice i wymagania parzystości pomiędzy ścieżkami zawartości a ścieżkami audio:
* Na ścieżkach zawartości połączenie klipów (`joinAdjacentContentClips`) scala dwa klipy w jeden obiekt o sumarycznej długości .
* Na ścieżkach audio nakładanie przejścia (`applyAbutCrossfadeForClip`) zachowuje dwa osobne klipy i zmienia wyłącznie parametry cyfrowej obwiedni .
* Połączenie klipów audio (`joinAdjacentAudioClips`) jest dozwolone wyłącznie wtedy, gdy klipy dzielą ten sam `assetId` oraz ich okna źródłowe pliku są idealnie spójne (różnica `leftTrimIn + leftPlayable` oraz `rightTrimIn` nie przekracza 1.5 ms) .

W zestawie testów brakuje weryfikacji zachowania `applyAbutCrossfadeForClip` w sytuacji, gdy żądany czas przejścia `crossfadeMs` przekracza całkowity odtwarzalny czas trwania jednego z klipów . W takim przypadku funkcja `clampAudioFades` musi proporcjonalnie skrócić wartości fadów, aby nie przekroczyły one długości okna `playableMs` .

### Architektura Gestyki: Podgląd (Preview) vs Zatwierdzanie (Commit)

Zgodnie z zapisami ADR 0008, żaden gest edycyjny nie może bezpośrednio modyfikować stanu projektu podczas trwania ruchu wskaźnika (`pointermove`) . Proces edycji jest rozdzielony na FSM podglądu transakcyjnego oraz fazę zatwierdzenia :

1. Wskaźnik myszy generuje obiekt sesji `FormaGestureSession` podczas zdarzenia `pointerdown` .
2. Podczas `pointermove` wywoływana jest czysta funkcja `previewAudioFromSession`, która zwraca tymczasowy obiekt `FormaGesturePreview` (zawierający wyliczone na żywo wartości `startTicks`, `lengthTicks`, `fadeInMs`, `fadeOutMs` lub `gainDb`) .
3. Podczas `pointerup` wywoływana jest funkcja `commitAudioGesture`, która przyjmuje stan sesji oraz wygenerowany podgląd, wykonując ostateczną modyfikację obiektu `Project` .

Testowanie tych dwóch funkcji w `audioLaneEdit.test.ts` jest obecnie słabe i wybiórcze . Aby zapewnić pełne pokrycie interakcji użytkownika bez konieczności montowania komponentów React czy emulacji zdarzeń DOM, należy zbudować kompleksowe testy jednostkowe oparte na fabrykach obiektów `FormaGestureSession` .

---

## Architektura Testów i Fixture Factory

### Wzorzec Fabryki Danych Testowych (Fixture Factory)

W celu wyeliminowania powtarzalnego kodu inicjalizacyjnego w pliku testowym, należy wprowadzić czystą fabrykę tworzącą minimalny, poprawny schematycznie projekt ze ścieżką audio, klipem, zasobem oraz szyną zbiorczą, a także pomocniczy kreator sesji gestów.

```typescript
import {
  createProjectSeed,
  elapsedToTicks,
  type Project,
  type AudioClip,
  type ProjectAsset,
} from "@stagesync/shared";
import { addAudioTrack, addAudioBus } from "./audioLaneEdit.js";
import { audioLaneId } from "./timelineTracks.js";
import type { FormaGestureSession } from "./timelineGesture.js";

export function createMinimalAudioFixture(): {
  project: Project;
  trackId: string;
  clipId: string;
  assetId: string;
  busId: string;
  laneId: ReturnType<typeof audioLaneId>;
} {
  let project = createProjectSeed("test-p1", "Audio Test", "2026-07-21T00:00:00.000Z");

  const trackAdded = addAudioTrack(project, "Track 1");
  project = trackAdded.project;
  const trackId = trackAdded.trackId;

  const busAdded = addAudioBus(project, "Bus 1");
  project = busAdded.project;
  const busId = busAdded.busId;

  const assetId = "asset-test-1";
  const durationMs = 4000;
  const lengthTicks = elapsedToTicks(durationMs, project.defaultBpm, project.defaultMeter, project.ppq);

  const asset: ProjectAsset = {
    id: assetId,
    storageName: `${assetId}.wav`,
    originalName: "test.wav",
    kind: "audio",
    mimeType: "audio/wav",
    sizeBytes: 1024,
    durationMs,
  };

  const clipId = "clip-test-1";
  const clip: AudioClip = {
    id: clipId,
    trackId,
    assetId,
    startTicks: 0,
    lengthTicks,
  };

  project = {
    ...project,
    assets: [asset],
    audioClips: [clip],
  };

  return {
    project,
    trackId,
    clipId,
    assetId,
    busId,
    laneId: audioLaneId(trackId),
  };
}

export function createGestureSessionFixture(
  overrides: Partial<FormaGestureSession> & Pick<FormaGestureSession, "kind">
): FormaGestureSession {
  return {
    clipId: "clip-test-1",
    pointerId: 1,
    originTicks: 0,
    originClipStart: 0,
    originClipLength: 3840,
    lane: "audio:test-track",
    ...overrides,
  };
}
```

---

## Granice Mockowania i Analiza Ryzyka Flakiness

### Izolacja i Granice Mocków

Wszystkie funkcje zawarte w module `audioLaneEdit.ts` są czystymi transformacjami matematycznymi operującymi na strukturze danych `Project` . Zgodnie z najlepszymi praktykami testowania oprogramowania domowego, **należy całkowicie zaniechać mockowania funkcji wewnętrznych** oraz modułów pomocniczych z pakietu `@stagesync/shared` .

Wyjątki wymagające izolacji środowiskowej:

1. **Elementy DOM i Zdarzenia Przeglądarki**: Funkcje przeliczające współrzędne pikselowe na ticki (np. `canvasPxFromPointer` czy `ticksFromPointer` w `formaCanvas.ts`) przyjmują obiekty `HTMLElement` i wywołują `getBoundingClientRect()` . Purytyczne transformacje w `audioLaneEdit.ts` nie przyjmują obiektów DOM, lecz gotowe wartości numeryczne (`rawTicks`, `clientY`), dzięki czemu nie wymagają mockowania środowiska DOM .
2. **Dekodowanie Plików i Web Audio API**: Testy funkcji `applyDecodedAudioMeta` oraz `placeImportedAudioClipAt` nie powinny ładować rzeczywistych plików `.wav` ani tworzyć instancji `AudioContext` . Przekazywane parametry metadanych (JSON z wartościami `durationMs`, `waveformPeaks`, `channelCount`) w zupełności wystarczają do pełnej weryfikacji logiki edycyjnej .
3. **Generowanie UUID**: Moduł wykorzystuje natywną funkcję `crypto.randomUUID()` do tworzenia identyfikatorów ścieżek, szyn i klipów . Środowisko Vitest w Node.js dostarcza pełne wsparcie dla obiektu `crypto`, więc jego mockowanie nie jest wymagane, chyba że wymagane jest deterministyczne sprawdzanie wygenerowanych ciągów znaków .

### Analiza Ryzyka Testów Niestabilnych (Flakiness)

Ponieważ transformacje projektowe w StageSync są synchroniczne i niezmiennicze (`{ ...project }`), ryzyko niestabilności testów (flakiness) wywołane asynchronicznością, opóźnieniami sieciowymi czy wyścigami wątków wynosi **0%** .

Jedynym potencjalnym źródłem błędów w testach są **niedokładności zaokrągleń zmiennoprzecinkowych** występujące podczas przeliczania jednostek czasu pomiędzy milisekundami a tickami :
* Przy niestandardowych wartościach BPM (np. `117.5` BPM) przeliczanie `ticksToMsAlongTempoMap` oraz `elapsedToTicks` może generować drobne odchylenia ułamkowe .
* W asercjach testowych należy unikać rygorystycznego porównywania liczbowego `.toBe()` dla wartości milisekundowych, zastępując je metodą `.toBeCloseTo()` z odpowiednią precyzją, natomiast wartości w tickach należy zaokrąglać za pomocą `Math.floor()` lub `Math.round()` .

---

## Rekomendowana Architektura Zestawu Testów

W celu zachowania czytelności i spójności z istniejącym plikiem `audioLaneEdit.test.ts`, proponowane nowe testy należy pogrupować w bloki `describe` podzielone według domen operacyjnych .

```typescript
describe("audioLaneEdit — rozszerzenie pokrycia", () => {
  describe("Mapowanie Forma↔Audio i obsługa błędów ziarna", () => {
    it("mapFormaBack zgłasza wyjątek gdy brak ziarna w seedById i brakuje rodzica splitu", () => {
      // Weryfikacja rzucania Error("Missing audio clip seed for ...")
    });

    it("resolveSplitParentId prawidłowo rozwiązuje wielostopniowe sufiksy rozcięcia (-r-2)", () => {
      // Weryfikacja odzyskiwania metadanych dla głęboko podzielonych klipów
    });
  });

  describe("Import plików, zmiana tempa i metadane dekodowania", () => {
    it("placeImportedAudioClipAt ucina pozycję do contentFloorTicks gdy kliknięto na Countdown", () => {
      // Weryfikacja ochrony sekcji Countdown przy imporcie
    });

    it("placeImportedAudioClipAt przelicza lengthTicks uwzględniając aktywne tempo z tempoMap", () => {
      // Weryfikacja zmiennej mapy tempa przy wstawianiu klipu
    });

    it("applyDecodedAudioMeta ustawia channelMode mono dla ścieżki przy imporcie pliku 1-kanałowego", () => {
      // Weryfikacja auto-stemplowania trybu mono na ścieżce bez ustalonego mode
    });

    it("applyDecodedAudioMeta zwraca niezmieniony projekt gdy durationMs wynosi 0", () => {
      // Weryfikacja wczesnego powrotu dla niepoprawnych metadanych
    });
  });

  describe("Routing miksera, ochrona DAG i limity systemowe", () => {
    it("setAudioBusOutput blokuje próbę przypisania szynie własnego ID (self-route)", () => {
      // Weryfikacja braku modyfikacji przy busId === output.busId
    });

    it("setAudioBusOutput wykrywa i blokuje pętlę wielostopniową (A -> B -> C -> A)", () => {
      // Weryfikacja byłobyTworzonePętli (wouldCreateBusCycle) dla grafu 3-elementowego
    });

    it("addAudioBus wyrzuca RangeError po przekroczeniu limitu MAX_AUDIO_BUSSES (16)", () => {
      // Weryfikacja twardego limitu liczby szyn
    });

    it("addAudioTrack oraz duplicateAudioTrack wyrzucają RangeError przy > 64 ścieżkach", () => {
      // Weryfikacja twardego limitu liczby ścieżek
    });

    it("setAudioTrackOutput resetuje wyjście do Master po podaniu nieistniejącego busId lub hwOutputId", () => {
      // Weryfikacja odporności na nieistniejące identyfikatory routingu
    });
  });

  describe("Crossfade i spójność łączenia klipów (Join & Abut Crossfade)", () => {
    it("applyAbutCrossfadeForClip ogranicza długość fadu gdy przekracza czas playableMs", () => {
      // Weryfikacja wywołania clampAudioFades przy zbyt krótkim klipie
    });

    it("joinAdjacentAudioClips odrzuca próbę połączenia klipów z różnych plików źródłowych", () => {
      // Weryfikacja sprawdzania zgodności assetId przy scalaniu
    });

    it("joinAdjacentAudioClips odrzuca próbę połączenia klipów o niespójnych okienkach źródłowych", () => {
      // Weryfikacja warunku abs(leftTrimIn + leftPlayable - rightTrimIn) > 1.5ms
    });
  });

  describe("FSM Gestyki: Podgląd (Preview) oraz Zatwierdzanie (Commit)", () => {
    it("commitAudioGesture zwraca niezmieniony projekt dla nieobsługiwanego lane (np. 'forma')", () => {
      // Weryfikacja strażnika isAudioLaneId
    });

    it("commitAudioGesture zwraca niezmieniony projekt dla sesji z clipId = null", () => {
      // Weryfikacja ochrony przed pustym identyfikatorem klipu
    });

    it("previewAudioFromSession spina lengthTicks do 1 gdy resize-start przekracza krawędź końcową", () => {
      // Weryfikacja zapobiegania ujemnym długościom klipów podczas przeciągania
    });

    it("previewAudioFromSession używa originClientY jako fallback gdy clientY jest nieokreślone w gestii gain", () => {
      // Weryfikacja ciągłości przeliczania dB dla narzędzia Gain
    });
  });
});
```

Przedstawiony plan uzupełnienia testów usuwa powstawanie niedokładności w krawędziowych scenariuszach edycji, w pełni zabezpiecza architekturę routingu miksera audio oraz gwarantuje stuprocentową zgodność implementacji z założeniami opisanymi w ADR 0008 .

---
Powered by [AI Exporter](https://saveai.net)
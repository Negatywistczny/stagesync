> From: https://gemini.google.com/app/d187839d0e8677e6

Specyfikacja Routingu StageSync v5.2

# Specyfikacja Architektoniczna Subsystemu Miksowania StageSync v5.2+: Fizyczne Wyjścia Hardware (Out 3–4) oraz Routing Szyna–Szyna (Bus-to-Bus)

Ewolucja systemu StageSync z linii v5.1 do v5.2+ wyznacza przejście od uproszczonego modelu sumowania sygnałów do w pełni profesjonalnego silnika miksowania koncertowego i teatralnego . Architektura v5.1 ogranicza docelowe miejsce wysyłki ścieżek audio wyłącznie do szyny głównej Master lub do pojedynczej szyny grupy, podczas gdy same szyny grupy posiadają zamkniętą unię pozwalającą na kierowanie sygnału wyłącznie do sumy Master . Ponadto w obszarze interfejsu przeglądarkowego silnik opiera się na pojedynczej instancji `AudioContext` z obsługą wyboru urządzenia wyjściowego poprzez API `setSinkId` .

Rozbudowa systemu w wersji v5.2+ wprowadza dwie kluczowe funkcjonalności: obsługę wielokanałowych fizycznych wyjść sprzętowych (Out 3–4, Out 5–6 i kolejne) oraz zagnieżdżony routing szyn grupy w relacji szyna-do-szyny (bus-to-bus) . Wdrożenie to musi rygorystycznie przestrzegać założeń architektury monorepo, w której serwer pełni funkcję Single Source of Truth (SSOT) i wykonuje walidację schematów Zod bez uruchamiania silnika audio . Sam silnik odtwarzania i miksowania działa w pełni w kliencie webowym w oparciu o WebAudio API . Wszystkie modyfikacje są podporządkowane zasadzie ADR 0011, która bezwzględnie zakazuje tworzenia atrap interfejsu użytkownika (stubs / fake UI) oraz dodawania nieobsługiwanych opcji wyjściowych w obszarze UI przed ich pełnym zaimplementowaniem w modelu danych i runtime .

## Sekcja A: Macierz Zachowań Referencyjnych (Reference Behavior Matrix)

Projektowanie cyfrowego miksera estradowego przeznaczonego do obsługi wydarzeń na żywo wymaga odtworzenia sprawdzonych wzorców rynkowych z profesjonalnych stacji DAW oraz sekwencerów spektaklowych . Inżynierowie dźwięku FOH (Front of House) oraz realizatorzy odsłuchów osobistych (IEM) polegają na przewidywalnych mechanizmach krosowania, kaskadowego wyciszania oraz izolacji sygnałów.

W oprogramowaniu Ableton Live routing wyjść wyizolowanych opiera się na sekcji `External Audio Out`, pozwalającej na skierowanie dowolnego kanału lub szyny powrotnej (Return Track) do fizycznych wyjść mono lub par stereo udostępnianych przez sterownik ASIO/CoreAudio lub zagregowane urządzenie systemowe (Aggregate Device) . Apple Logic Pro oraz Apple MainStage realizują tę funkcję poprzez dedykowane paski wyjściowe (`Output Channel Strips`), w których wyjścia fizyczne traktowane są jako pełnoprawne tory audio z osobną regulacją wzmocnienia, własną sekcją wyciszania (Mute), solowania (Solo) oraz precyzyjnymi miernikami wskaźników poziomu . Z kolei Figure 53 QLab wykorzystuje tabelę krosowniczą (Audio Patch Matrix), w której wyjścia z poszczególnych cues są mapowane na wyjścia dyskretne z możliwością nadawania własnych etykiet opisowych .

System StageSync v5.2+ adaptuje te wzorce, definiując precyzyjne reguły zachowania dla wyjść wyizolowanych oraz zagnieżdżonych szyn grupy.

| ID Wymagania  | Obszar Subsystemu           | Zachowanie Referencyjne (Oczekiwanie Operatora FOH)                                                                                                              | Zasada Implementacyjna StageSync v5.2+                                                                                                                 |
| :------------ | :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MX-OUT-01** | Routing Wyjść Fizycznych    | Możliwość skierowania dowolnej ścieżki audio lub szyny grupy bezpośrednio do wybranej pary stereo (np. Out 3-4) lub fizycznego wyjścia mono (np. Out 3) .        | Wyjście fizyczne reprezentowane jest w grafie jako węzeł wyjściowy (`HardwareOutputNode`) z wyznaczonym indeksem kanałowym oraz trybem `channelMode` . |
| **MX-OUT-02** | Etykietowanie Portów HW     | Operator może nadawać własne nazwy wyjściom fizycznym (np. "Out 3-4: IEM Bębnowy", "Out 5: Bass DI") dla ułatwienia identyfikacji na scenie.                     | Słownik `audioHardwareOutputs` w modelu projektu przechowuje mapowanie logiki na porty interfejsu z opcjonalnym polem `name`.                          |
| **MX-OUT-03** | Mierniki Poziomu HW Out     | Wyjścia fizyczne posiadają własne mierniki szczytowe (Peak) i wskaźniki przesterowania (Clipping) mierzone pre- oraz post-fader .                                | Analizatory `AnalyserNode` są wpinane synchronicznie przed tłumikiem wyjściowym danej szyny HW oraz bezpośrednio przed wejściem zbiorczym .            |
| **MX-OUT-04** | Solo i Mute Wyjść HW        | Wyciszenie (Mute) wyjścia HW odcina sygnał na fizycznym przetworniku C/A. Aktywacja Solo na wyjściu HW wycisza pozostałe wyjścia sprzętowe na sumie odsłuchowej. | Stan Mute steruje węzłem `GainNode` przypisanym do danej magistrali wyjściowej. Solo wyjścia HW izolujeodsłuch wybranego toru wyjściowego .            |
| **MX-BUS-01** | Hierarchia Bus-to-Bus       | Szyna grupy może wysyłać sygnał do innej szyny grupy (np. `Guitars Bus` -> `Music Stem Bus` -> `Master`) z zachowaniem sumowania wzmocnienia .                   | Model danych zezwala na ustawienie `bus.output` wskazującego na inny `busId`, a runtime buduje wielopoziomowy graf kaskadowy .                         |
| **MX-BUS-02** | Acykliczność Grafu          | Blokada utworzenia pętli sprzężenia zwrotnego (np. `Bus A` -> `Bus B` -> `Bus A`) na poziomie UI, schematu Zod oraz silnika audio .                              | Twarde odrzucenie zapisu pętli przez schemat Zod (`fail-fast`) oraz bezpieczne przełączenie awaryjne do `Master` w WebAudio (`fail-soft`) .            |
| **MX-BUS-03** | Kaskada Solo (Solo Cascade) | Włączenie Solo na ścieżce kierowanej do szyny nadrzędnej aktywuje tor audio bez wyciszania szyn pośrednich na drodze do wyjścia .                                | Utrzymanie reguły _track solo wins_ (DEF-BUG-04) z automatyczną propagacją przepustowości sygnału przez szyny nadrzędne w górę drzewa DAG .            |

---

## Sekcja B: Propozycja Modelu Danych StageSync (Data Model Specification)

Dotychczasowy model danych w StageSync v5.1 opisuje docelowe miejsce miksowania ścieżek (`MixerOutputDestSchema`) jako zamkniętą unię dyskryminowaną składającą się z wariantu `master` oraz wariantu `bus` z podaniem `busId` . Z kolei docelowe miejsce wysyłki z szyny grupy (`BusOutputDestSchema`) jest ograniczone do wariantu `master` .

W celu wdrożenia obsługi wielokanałowych wyjść sprzętowych oraz zagnieżdżonego routingu szyn zaprezentowano i przeanalizowano trzy warianty rozszerzenia schematu Zod w monorepo `@stagesync/shared` .

### Analiza Wariantów Modelu Danych

#### Wariant 1: Bezpośrednie Indeksowanie Kanałów w Unii Wyjść (Flat HW Offset Union)

Wariancie tym dyskryminowana unia wyjść zostaje bezpośrednio rozszerzona o wariant wyjścia sprzętowego zawierający fizyczny offset kanału na karcie dźwiękowej:

```typescript
export const MixerOutputTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("master") }),
  z.object({ kind: z.literal("bus"), busId: z.string().min(1).max(64) }),
  z.object({
    kind: z.literal("hw_out"),
    channelOffset: z.number().int().min(0).max(62),
    channelMode: ChannelModeSchema,
  }),
]);
```

Podejście to cechuje się prostotą strukturalną, lecz posiada poważną wadę architektoniczną. Przypisanie ścieżki bezpośrednio do fizycznego indeksu kanału (np. offset 2 dla wyjścia 3-4) ściśle wiąże projekt z konkretną konfiguracją sprzętową danej maszyny. Przeniesienie projektu na inny komputer z innym interfejsem audio powoduje utratę kontekstu semantycznego wyjść.

#### Wariant 2: Tabela Krosownicza Wyjść Logicznych (Logical Hardware Patch Table)

Wariant drugi wprowadza jawną encję wyjścia wyizolowanego (`AudioHardwareOutput`) przechowywaną w dedykowanej tablicy w nagłówku dokumentu projektu. Ścieżki oraz szyny odwołują się do wyjść sprzętowych poprzez unikalny identyfikator logiki (`hwOutputId`):

```typescript
export const AudioHardwareOutputSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  channelOffset: z.number().int().min(0).max(62),
  channelMode: ChannelModeSchema,
  gainDb: z.number().finite().min(-60).max(24).optional(),
  muted: z.boolean().optional(),
});

export const MixerOutputTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("master") }),
  z.object({ kind: z.literal("bus"), busId: z.string().min(1).max(64) }),
  z.object({
    kind: z.literal("hw_out"),
    hwOutputId: z.string().min(1).max(64),
  }),
]);
```

Rozwiązanie to zapewnia całkowitą abstrakcję warstwy sprzętowej od struktury miksu. Zmiana interfejsu audio na nowej scenie wymaga jedynie przemapowania indeksów kanałowych w tabeli `audioHardwareOutputs`, bez konieczności modyfikowania ustawień poszczególnych ścieżek w projekcie. Jest to wzorzec w pełni zgodny z architekturą systemów QLab oraz Logic Pro .

#### Wariant 3: Ujednolicony Model Wyjść Zagnieżdżonych (Unified Target Routing)

Wariant trzeci ujednolica definicję celu wysyłki zarówno dla ścieżek audio (`audioTracks`), jak i dla szyn grupy (`audioBusses`), znosząc podział na `MixerOutputDest` oraz `BusOutputDest` . Szyny grupy uzyskują możliwość kierowania sygnału do innych szyn lub do wyjść sprzętowych, a cały schemat routingu staje się spójnym grafem skierowanym.

### Rekomendacja Architektoniczna i Definicja Schematu v5.2+

Rekomenduje się przyjęcie syntezy **Wariantu 2 i Wariantu 3**. Poniższy kod definiuje oficjalne typy oraz schematy Zod rekomendowane dla StageSync v5.2+:

```typescript
import { z } from "zod";
import { ChannelModeSchema } from "./mixer-routing.js";

/** Definicja wyjścia sprzętowego (np. Out 3-4) w tabeli krosowniczej projektu. */
export const AudioHardwareOutputSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  channelOffset: z.number().int().min(0).max(62),
  channelMode: ChannelModeSchema,
  gainDb: z.number().finite().min(-60).max(24).optional(),
  muted: z.boolean().optional(),
});

export type AudioHardwareOutput = z.infer<typeof AudioHardwareOutputSchema>;

/** Ujednolicony cel wysyłki sygnału dla ścieżek audio oraz szyn grupy. */
export const MixerOutputTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("master") }),
  z.object({ kind: z.literal("bus"), busId: z.string().min(1).max(64) }),
  z.object({
    kind: z.literal("hw_out"),
    hwOutputId: z.string().min(1).max(64),
  }),
]);

export type MixerOutputTarget = z.infer<typeof MixerOutputTargetSchema>;

/** Zaktualizowany schemat szyny grupy obsługujący routing do innych szyn oraz wyjść HW. */
export const AudioBusSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  muted: z.boolean().optional(),
  gainDb: z.number().finite().min(-60).max(24).optional(),
  pan: z.number().finite().min(-1).max(1).optional(),
  channelMode: ChannelModeSchema.optional(),
  output: MixerOutputTargetSchema.optional(),
});

export type AudioBus = z.infer<typeof AudioBusSchema>;
```

Poniższa tabela porównuje stan encji schematu Zod w wersji v5.1 ze stanem docelowym w v5.2+.

| Encja Schematu          | Stan w StageSync v5.1                    | Docelowy Stan w StageSync v5.2+                                             | Typ w Zod                                    |
| :---------------------- | :--------------------------------------- | :-------------------------------------------------------------------------- | :------------------------------------------- |
| `MixerOutputDestSchema` | Discriminated union: `master` \| `bus` . | Zastąpiony przez `MixerOutputTargetSchema` (`master` \| `bus` \| `hw_out`). | `z.discriminatedUnion("kind", ...)`          |
| `BusOutputDestSchema`   | Closed union: tylko `master` .           | Usunięty. Szyny korzystają z `MixerOutputTargetSchema`.                     | `z.discriminatedUnion("kind", ...)`          |
| `audioHardwareOutputs`  | Brak w dokumencie projektu .             | Nowa opcjonalna tablica w `ProjectSchema` (max 32 wyjścia).                 | `z.array(AudioHardwareOutputSchema).max(32)` |
| `AudioBusSchema`        | `output` typu `BusOutputDestSchema` .    | `output` typu `MixerOutputTargetSchema`.                                    | `z.object({...})`                            |

### Strategia Migracji Projektów v5 Bez Dual-Write Legacy

Zgodnie z zasadami ADR 0011 architektura StageSync odrzuca koncepcję utrzymywania kodu wstecznego (dual-write legacy) i nadmiarowych pól w strukturach JSON . Proces migracji dokumentów z formatu v5 do v5.2+ realizowany jest synchronicznie na krawędzi odczytu (Migration on Parse):

1. Przetwarzanie wstępne (`z.preprocess`) wykrywa dokumenty bez pola `audioHardwareOutputs` oraz traktuje nieobecne pola `output` w obiektach `audioTracks` i `audioBusses` jako brak wartości .
2. Funkcja rozstrzygająca mapuje brakujące wartości `output` na jednoznaczny obiekt `{ kind: "master" }` .
3. Podczas zapisu na serwerze SSOT dokument zostaje utwalony w nowym, znormalizowanym formacie v5.2+. Stare struktury nie są przetrzymywane w bazie danych ani przesyłane przez magistralę WebSocket.

---

## Sekcja C: Topologia WebAudio i Ograniczenia Przeglądarek (WebAudio Graph Topology)

Miksowanie i renderowanie sygnałów audio w systemie StageSync odbywa się wyłącznie w przeglądarce internetowej klienta z wykorzystaniem WebAudio API . Serwer aplikacji nie posiada własnego silnika audio i odpowiada jedynie za synchronizację stanu transportu i routingu .

### Realia i Ograniczenia Środowiska Przeglądarkowego

Wdrożenie fizycznych wyjść wielokanałowych w środowisku przeglądarkowym napotyka twarde ograniczenia specyfikacji W3C oraz implementacji silników Chromium i WebKit .

Współczesne przeglądarki umożliwiają przypisanie instancji `AudioContext` do konkretnego fizycznego urządzenia audio za pomocą metody `setSinkId(deviceId)` . Jednakże przeglądarka tworzy tylko jeden potok wyjściowy dla danej instancji kontekstu . W celu wyprowadzenia wielu niezależnych sygnałów stereo/mono do różnych fizycznych gniazd karty dźwiękowej (np. wyjścia 1-2 dla Master, wyjścia 3-4 dla odsłuchu IEM) konieczne jest przełączenie węzła docelowego `context.destination` w tryb dyskretnej wielokanałowości :

1. Odczytanie maksymalnej liczby kanałów oferowanej przez sterownik urządzenia za pomocą `context.destination.maxChannelCount` .
2. Ustawienie wymuszonego trybu kanałów: `context.destination.channelCount = totalChannels` (gdzie `totalChannels` odpowiada liczbie wyjść na karcie, np. 8 lub 16) .
3. Ustawienie trybu zliczania kanałów: `context.destination.channelCountMode = "explicit"` .
4. Ustawienie dyskretnej interpretacji kanałów: `context.destination.channelInterpretation = "discrete"` .

Kluczowym problemem w praktyce koncertowej jest zachowanie systemów operacyjnych macOS oraz Windows. Przeglądarka Chrome bardzo często raportuje `destination.maxChannelCount = 2` dla karty 8-kanałowej, dopóki użytkownik nie skonfiguruje w systemie operacyjnym wielokanałowego układu głośników (np. ustawienie konfiguracji Quadraphonic, 5.1 lub 7.1 w programie _Konfigurator Audio MIDI_ na systemie macOS) . StageSync v5.2+ musi wykrywać tę rozbieżność w module [`audioOutputPrefs.ts`](../../../../../apps/web/src/lib/audio/audioOutputPrefs.ts) i wyświetlać jasne ostrzeżenie operatorskie zamiast cichego kierowania sygnałów w próżnię .

Równocześnie architektura StageSync odrzuca koncepcję tworzenia osobnych instancji `AudioContext` dla każdego wyjścia fizycznego należącego do osobnych urządzeń audio. Próba równoległego uruchomienia dwóch kontekstów audio powiązanych z różnymi kartami dźwiękowymi prowadzi do powstawania pływającego desynchronizmu zegarów sprzętowych (clock drift), co w warunkach scenicznych wywołuje trzaski, mikro-szybkie przesunięcia fazowe oraz dryfowanie podkładów audio . Multi-device jest realizowany wyłącznie na poziomie agregacji sterowników w systemie operacyjnym (np. macOS Aggregate Device) .

### Architektura Grafu WebAudio dla Out 3–4 i Bus-to-Bus

Aby zagwarantować bezprzerwowy przesył audio oraz stabilność fazową, silnik [`audioPlayback.ts`](../../../../../apps/web/src/lib/audio/audioPlayback.ts) buduje jednolitą, wielopoziomową topologię grafu WebAudio .

Sygnał ze ścieżki audio przechodzi przez dedykowany węzeł `TrackBus` (mono lub stereo z obsługą True Balance), po czym jego węzeł wyjściowy (`track.route`) zostaje połączony z wejściem wybranej szyny grupy (`bus.input`), bezpośrednio z magistralą Master lub z wybranym wyjściem sprzętowym `HardwareOutputBus` . Szyna grupy przetwarza wzmocnienie i panoramę, po czym jej wyjście (`bus.route`) łączy się z inną szyną grupy, z Masterem lub z wyjściem HW .

Wszystkie magistrale wyjściowe (Master Stereo Out, HW Out 3-4, HW Out 5-6) wprowadzają swoje sygnały do jednego, zbiorczego węzła `ChannelMergerNode` utworzonego z rozmiarem równym `context.destination.channelCount` . Węzeł `ChannelMergerNode` działa w trybie dyskretnym i jest bezpośrednio połączony z `context.destination` .

Poniższa tabela przedstawia mapowanie fizycznych styków węzła `ChannelMergerNode` dla 8-kanałowego interfejsu audio w systemie StageSync v5.2+.

| Indeks Wejścia ChannelMerger | Indeks Kanału Fizycznego | Tryb Pracy | Magistrala Logiczna StageSync | Fizyczne Gniazdo Interfejsu |
| :--------------------------: | :----------------------: | :--------: | :---------------------------: | :-------------------------: |
|             `0`              |        Channel 1         |    Left    |       Master Stereo Out       |      Output 1 (Main L)      |
|             `1`              |        Channel 2         |   Right    |       Master Stereo Out       |      Output 2 (Main R)      |
|             `2`              |        Channel 3         |    Left    |   HW Out 3-4 (`hw-iem-vox`)   |   Output 3 (IEM Vocal L)    |
|             `3`              |        Channel 4         |   Right    |   HW Out 3-4 (`hw-iem-vox`)   |   Output 4 (IEM Vocal R)    |
|             `4`              |        Channel 5         |    Mono    | HW Out 5 (`hw-click-direct`)  | Output 5 (Click Track Out)  |
|             `5`              |        Channel 6         |    Mono    |    HW Out 6 (`hw-bass-di`)    | Output 6 (Bass Sub Direct)  |
|             `6`              |        Channel 7         |    Left    |  HW Out 7-8 (Rezerwa / Aux)   |          Output 7           |
|             `7`              |        Channel 8         |   Right    |  HW Out 7-8 (Rezerwa / Aux)   |          Output 8           |

---

## Sekcja D: Reguły Zapobiegania Cyklom w Routing Szyn (Anti-Cycle Rules)

Udostępnienie możliwości kierowania sygnału z szyny do innej szyny (bus-to-bus) wprowadza do miksera ryzyko utworzenia dodatniego sprzężenia pętli audio (cyklu w grafie) . W silniku WebAudio utworzenie cyklu pomiędzy węzłami `GainNode` bez obecności węzła opóźniającego `DelayNode` skutkuje wyrzuceniem błędu lub natychmiastowym przesterowaniem cyfrowym i zawieszeniem wątku audio .

### Algorytm Weryfikacji Acykliczności Grafu (DAG Validation)

Graf routingu miksera w StageSync musi w każdej chwili stanowić Skierowany Graf Acykliczny (DAG - Directed Acyclic Graph) . Węzłami w grafie są szyny grupy `audioBusses`, a krawędziami skierowanymi - relacje wysyłki `bus.output` .

Weryfikacja acykliczności realizowana jest za pomocą algorytmu Przeszukiwania W Głąb (DFS - Depth-First Search) z wykorzystaniem mechanizmu trzech kolorów (Biały - nieodwiedzony, Szary - w trakcie przetwarzania w bieżącym stosie, Czarny - w pełni przetworzony):

1. Zbuduj listę sąsiedztwa na podstawie tablicy `audioBusses` zawartej w projekcie .
2. Dla każdego węzła $B_i \in \text{audioBusses}$, jeśli $B_i.\text{output}.\text{kind} === \text{"bus"}$, utwórz krawędź skierowaną $B_i \to B_j$, gdzie $B_j = B_i.\text{output}.\text{busId}$.
3. Inicjalizuj wszystkie węzły kolorem Białym.
4. Dla każdego węzła Białego uruchom rekurencyjną funkcję DFS:
   - Oznacz bieżący węzeł jako Szary.
   - Dla każdego sąsiada (szyny docelowej):
     - Jeśli sąsiad jest Szary, wykryto cykl (powrót do węzła w obecnej ścieżce).
     - Jeśli sąsiad jest Biały, kontynuuj rekurencję.
   - Oznacz bieżący węzeł jako Czarny.
5. Jeśli wykryto chociaż jeden cykl, graf jest nieprawidłowy.

### Walidacja Twarda na Krawędzi Zod (`Fail-Fast`)

Serwer SSOT oraz klient WebAudio dokonują twardej walidacji ładunku projektu przy użyciu metody `superRefine` zaimplementowanej w `ProjectSchema` w `@stagesync/shared` . Walidacja ta działa w trybie `fail-fast` - jakakolwiek próba zapisania lub przesłania projektu zawierającego cykl skutkuje odrzuceniem dokumentu na poziomie parsera Zod .

Poniższa tabela precyzuje warunki walidacji oraz generowane błędy na krawędzi schematu Zod.

| Badana Relacja                          | Scenariusz Błędu                                                                    | Działanie Walidatora Zod            | Generowany Kod i Ścieżka Błędu                                                                        |
| :-------------------------------------- | :---------------------------------------------------------------------------------- | :---------------------------------- | :---------------------------------------------------------------------------------------------------- |
| Szyna -> Szyna (Samoodwołanie)          | `bus.output.busId` jest równy `bus.id` danej szyny (pętla długości 1).              | Odrzucenie schematu (`fail-fast`) . | `path: ["audioBusses", i, "output", "busId"]`<br>message: _"Self-referencing bus output cycle"_       |
| Szyna -> Szyna (Kaskada)                | Wykrycie cyklu wielowęzłowego za pomocą DFS (np. Bus A -> Bus B -> Bus C -> Bus A). | Odrzucenie schematu (`fail-fast`) . | `path: ["audioBusses"]`<br>message: _"Cyclic bus routing detected: Bus A -> Bus B -> Bus C -> Bus A"_ |
| Szyna / Ścieżka -> Nieistniejący Bus    | Odwołanie do `busId`, którego nie ma w tablicy `audioBusses` .                      | Odrzucenie schematu (`fail-fast`) . | `path: ["audioTracks", i, "output", "busId"]`<br>message: _"Target busId not found: missing-id"_      |
| Szyna / Ścieżka -> Nieistniejący HW Out | Odwołanie do `hwOutputId`, którego nie ma w `audioHardwareOutputs`.                 | Odrzucenie schematu (`fail-fast`) . | `path: ["audioBusses", i, "output", "hwOutputId"]`<br>message: _"Target hwOutputId not found"_        |

### Przełączenie Awaryjne w Runtime WebAudio (`Fail-Soft`)

W wyjątkowych sytuacjach wyścigu stanów w czasie rzeczywistym (np. przy dynamicznym odebraniu niepełnego pakietu synchronizacji przez magistralę WebSocket), silnik WebAudio ([`audioPlayback.ts`](../../../../../apps/web/src/lib/audio/audioPlayback.ts)) nie może dopuścić do zawieszenia wątku odtwarzania ani przerwania pracy urządzenia na scenie .

Zastosowano następującą procedurę ochronną w silniku audio:

1. Przed dokonaniem fizycznej zmiany połączeń w grafie WebAudio (`applyBusParams`), silnik uruchamia szybki weryfikator acykliczności na bieżącym stanie pamięci klienta .
2. W przypadku wykrycia, że nowo proponowana zmiana utworzyłaby cykl w grafie WebAudio, silnik wstrzymuje przepięcie wyjścia felernej szyny.
3. Wyjście felernej szyny zostaje automatycznie przełączone na bezpieczne wyjście zastępcze `{ kind: "master" }` (`fail-soft fallback`) .
4. Silnik rejestruje zdarzenie ostrzegawcze w rejestrze błędów i emituje powiadomienie operatorskie w interfejsie użytkownika bez przerywania strumienia audio .

---

## Sekcja E: Procedura Acceptance & Smoke Operatorski (Operator Verification Protocol)

Procedura weryfikacji funkcjonalności miksera w StageSync v5.2+ wymaga przeprowadzenia serii testów stanowiskowych na fizycznym sprzęcie audio.

### Scenariusze Testowe (Smoke Test Protocols)

#### Scenariusz 1: Krosowanie Ścieżki na Wyjście Fizyczne Out 3–4 (HW Multi-Out)

1. Podłącz wielokanałowy interfejs audio (min. 4 wyjścia) do komputera testowego.
2. W ustawieniach dźwięku systemu operacyjnego upewnij się, że urządzenie jest zmapowane jako wielokanałowe .
3. Otwórz StageSync i przejdź do panelu _Ustawienia Miksera_. Weryfikuj, czy wskaźnik `destination.maxChannelCount` raportuje wartość równą co najmniej 4 .
4. Utwórz nowe wyjście sprzętowe `Out 3-4` i nadaj mu nazwę _"IEM Vocal"_.
5. Przejdź do ścieżki wokalnej (`Track 1`) i zmień jej cel wysyłki (`OutputSelector`) z `Master` na `Out 3-4: IEM Vocal` .
6. Uruchom odtwarzanie transportu (Play) .
7. **Oczekiwany Rezultat**: Sygnał ze ścieżki `Track 1` jest słyszalny wyłącznie na fizycznych gniazdach 3 i 4 interfejsu audio. Na sumie Master (fizyczne gniazda 1 i 2) sygnał tej ścieżki jest całkowicie nieobecny . Mierniki poziomu na pasku `Out 3-4` w interfejsie użytkownika wskazują aktywny sygnał szczytowy .

#### Scenariusz 2: Hierarchiczna Kaskada Szyn (Guitars -> Music Stem -> Master)

1. Utwórz szynę `Bus 1` i nazwij ją _"Guitars"_.
2. Utwórz szynę `Bus 2` i nazwij ją _"Music Stem"_.
3. Przypisz wyjścia ścieżek `Gtr L` oraz `Gtr R` do szyny `Bus 1` (_Guitars_).
4. Przypisz wyjście szyny `Bus 1` (_Guitars_) do szyny `Bus 2` (_Music Stem_). Szyna `Bus 2` pozostaje skierowana do `Master`.
5. Uruchom odtwarzanie transportu.
6. Zwiń tłumik głośności na szynie `Bus 2` (_Music Stem_) do -$\infty$ dB.
7. **Oczekiwany Rezultat**: Obydwie gitary zostają całkowicie wyciszone na sumie Master. Przestawianie tłumika na szynie `Bus 1` (_Guitars_) płynnie reguluje poziom obu gitar wewnątrz szyny `Bus 2` bez powodowania trzasków cyfrowych (dziania dezippera) .

#### Scenariusz 3: Dynamiczne Filtrowanie Opcji i Blokada Pętli w UI

1. W projekcie posiadającym szynę `Bus 1` oraz szynę `Bus 2`, ustaw wyjście szyny `Bus 1` na `Bus 2`.
2. Otwórz selektor wyjścia (`OutputSelector`) na pasku szyny `Bus 2` .
3. **Oczekiwany Rezultat**: Szyna `Bus 1` jest automatycznie wykluczona i nieaktywna na rozwijanej liście opcji wyjściowych dla szyny `Bus 2` (filtracja anty-cykliczna w UI) . Podjęcie próby przesłania ładunku JSON z zapisaną pętlą przez konsolę API kończy się błędnym kodem odpowiedzi HTTP `400 Bad Request` wydanym przez walidator Zod na serwerze .

### Lista NIE-ROBIĆ (Anti-Patterns / Behavioral Restrictions)

Wdrożenie subsystemu miksowania w v5.2+ podlega rygorystycznym obostrzeniom architektonicznym wynikającym z ADR 0011 :

- **ZAKAZ STUBÓW I ATRAP UI (ADR 0011)**: Bezsprzecznie zabrania się renderowania nieaktywnych kontrolek z napisami typu _"Out 3-4 (wkrótce)"_ lub wyłączonych opcji w menu rozwijanym `OutputSelector`, dopóki silnik WebAudio i podłączony interfejs sprzętowy nie obsługują danej funkcji w pełni .
- **ZAKAZ FEJKOWEGO MULTI-DEVICE**: Zabrania się tworzenia osobnych instancji `AudioContext` dla osobnych fizycznych kart dźwiękowych w celu udawania obsługi wielu urządzeń wyjściowych jednocześnie .
- **ZAKAZ DUAL-WRITE I ZASZŁOŚCI W MODELU**: Zabrania się przetrzymywania starych pól struktury routingu obok nowych w plikach JSON projektów .
- **ZAKAZ TWARDEGO RE-CONNECTU PRZY MANIPULACJI SUWAKAMI**: Zmiana poziomu głośności, wyciszenia lub panoramy nie może wyzwalać procedury rozłączania i ponownego łączenia węzłów w grafie WebAudio (`disconnect` / `connect`). Wszelkie zmiany parametrów muszą zachodzić płynnie z użyciem ramps czasowych (`linearRampToValueAtTime`) .

---

## Sekcja F: Mapowanie na Istniejący Kod i Luki Architektoniczne (Code Mapping & Gap Analysis)

Realizacja specyfikacji v5.2+ wymaga przebudowy i rozszerzenia konkretnych modułów w monorepo StageSync. Poniższa tabela zestawiamy istniejące API z zakresem prac programistycznych.

| Ścieżka Pliku w Monorepo                                                                            | Istniejące API / Stan Gotowy                                                                                                                            | Identyfikacja Luk (Gaps) do Wdrożenia w v5.2+                                                                                                                                                                                                                                                                                   |
| :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`packages/shared/src/mixer-routing.ts`](../../../../../packages/shared/src/mixer/mixer-routing.ts) | Schematy `ChannelModeSchema` , `MixerOutputDestSchema` , `BusOutputDestSchema` , funkcje pomocnicze `resolveTrackOutputDest` i `resolveBusOutputDest` . | 1. Usunięcie ograniczonego `BusOutputDestSchema` .<br>2. Zaimplementowanie schematu `AudioHardwareOutputSchema` oraz ujednoliconego `MixerOutputTargetSchema`.<br>3. Rozbudowa funkcji `resolveTrackOutputDest` i `resolveBusOutputDest` o obsługę celów `hw_out` .                                                             |
| [`packages/shared/src/schema.ts`](../../../../../packages/shared/src/project/schema.ts)             | `ProjectSchemaV5` z regułami `superRefine` sprawdzającymi istnienie `busId` dla ścieżek audio .                                                         | 1. Dodanie opcjonalnej tablicy `audioHardwareOutputs` do schematu projektu .<br>2. Wdrożenie algorytmu DFS do detekcji cykli szyn w `superRefine` .<br>3. Dodanie walidacji spójności referencyjnej dla identyfikatorów `hwOutputId`.                                                                                           |
| `apps/web/src/lib/audioPlayback.ts`                                                                 | Obsługa węzłów `TrackBus` , `GroupBusNode` , `MasterBus` , wygładzanie faderów `setParamDezippered` , miksowanie True Balance .                         | 1. Przebudowa `ensureMasterBus` na rzecz zbiorczego węzła dyskretnego `ChannelMergerNode` połączonego z `context.destination` .<br>2. Wdrożenie zarządcy węzłów wyjść sprzętowych `HardwareOutputBus`.<br>3. Rozbudowa funkcji `applyBusParams` o kaskadowe łączenie szyn oraz wsparcie przełączenia awaryjnego (`fail-soft`) . |
| `apps/web/src/lib/audioOutputPrefs.ts`                                                              | Stosowanie `setSinkId` w `applyAudioOutputSink` , pobieranie urządzeń w `listAudioOutputDevices` .                                                      | 1. Dodanie odczytu i weryfikacji parametru `context.destination.maxChannelCount` .<br>2. Wdrożenie funkcji wykrywania ograniczeń kanałowych narzucanych przez system operacyjny .                                                                                                                                               |
| `apps/web/src/components/mixer/OutputSelector.tsx`                                                  | Komponent selektora wyjścia , funkcje `serializeOutputDest` oraz `parseOutputDest` .                                                                    | 1. Obsługa prefiksu `hw:<id>` w funkcjach serializacji i parsowania .<br>2. Dynamiczne wykluczanie opcji powodujących cykle na podstawie grafu projektu .                                                                                                                                                                       |
| `apps/web/src/components/mixer/MixerSurface.tsx`                                                    | Zbudowana powierzchnia miksera ze strefami Audio, Busy, Click, Master .                                                                                 | 1. Utworzenie nowej strefy wizualnej dla wyjść sprzętowych (Hardware Output Strips) pomiędzy strefą Busów a Masterem .<br>2. Przekazywanie opcji wyjść HW pobranych ze słownika projektu do selektorów `OutputSelector` .                                                                                                       |

---

Powered by [AI Exporter](https://saveai.net)

> From: https://gemini.google.com/app/7a9f91c024f1de9e

# you asked

message time: 2026-07-27 14:24:21

Jesteś ekspertem od walidacji Zod w StageSync. Przeanalizuj `packages/shared/src/schema.ts` (~1100 linii) — SSOT kształtów Library/Project/Setlist/MIDI/transport messages.

CEL ANALIZY
Zidentyfikować schematy i superRefine bez testów negatywnych / edge case’ów; zaproponować systematyczne uzupełnienie `schema.test.ts`.

PYTANIA BADAWCZE
1. Które schematy wersji Project (V1–V5) i upgrade path mają luki w testach?
2. `refineMeterForPpq`, `busGraphHasCycle`, Setlist preprocess — jakie invalid inputs nie są testowane?
3. Audio/Mixer: `AudioClipSchema`, `CueSampleConfigSchema`, `MixerOutputDestSchema` — brakujące granice (max arrays, cross-field rules)?
4. API bodies: `PutProjectBodySchema`, `BatchMidiPcBodySchema`, `StageMessageBodySchema` — które pola optional/required wymagają testów?
5. Czy testy powinny używać `createProjectV5Seed` vs minimalnych raw objectów?
6. Jak grupować testy żeby uniknąć duplikacji przy 50+ schematach?

KONTEKST
- Zod fail-fast na krawędziach HTTP/plik/IPC.
- Zależności: `time.ts`, `mixer-routing.ts`, `track-appearance.ts`, `theme-default.ts`.
- Vitest w packages/shared; brak DOM/Node w samym schema.

OCZEKIWANY OUTPUT
1. Tabela: schema/export → brakujące testy (valid/invalid) z przykładowym payloadem.
2. Priorytety P0 (security/corruption) vs P2 (kosmetyka).
3. Wzorce: `expect(() => Schema.parse(x)).toThrow()` + message match.
4. Mocki: niepotrzebne (pure Zod) — wskazać wyjątki.
5. Ryzyka: flaky brak; uwaga na duże fixture projectów.

---

# gemini response

Oto ułożony plan. Jeśli chcesz wprowadzić zmiany, zanim przejdę do wyszukiwania, poinformuj mnie o tym.
http://googleusercontent.com/deep_research_confirmation_content/0

---

# you asked

message time: 2026-07-27 14:24:40

Zacznij wyszukiwanie

---

# gemini response

I've completed your research. Feel free to ask me follow-up questions or request changes.

Analiza Walidacji Zod StageSync

# Systematyczna walidacja schematów Zod w StageSync: Analiza luk testowych i plan rozbudowy schema.test.ts

Podsystem walidacji danych w aplikacji StageSync opiera się na bibliotece Zod i stanowi pojedyncze źródło prawdy (SSOT – Single Source of Truth) dla struktur danych przesyłanych przez HTTP API, interfejsy IPC oraz gniazda WebSocket, a także zapisywanych w plikach projektów i biblioteki . Prawidłowe działanie reguł walidacyjnych zapobiega propagacji uszkodzonych stanów do silnika odtwarzania audio, cyklu zegara MIDI oraz interfejsu użytkownika .

Plik `packages/shared/src/schema.ts` definiuje ponad 50 schematów oraz złożonych reguł rafinacji (`superRefine`), które determinują poprawność strukturalną i semantyczną całego systemu . Mimo obecności zestawu testów w `packages/shared/src/schema.test.ts`, znaczna część schematów, wartości granicznych oraz warunków brzegowych w logice cyklicznej i relacyjnej nie posiada negatywnych testów jednostkowych . Niniejszy raport przedstawia szczegółową inwentaryzację luk walidacyjnych, hierarchię priorytetów bezpieczeństwa oraz ustrukturyzowaną strategię rozbudowy pakietu testowego Vitest.

---

## Architektura walidacji i stan pokrycia w StageSync

Walidacja w StageSync realizuje koncepcję *fail-fast* na zewnętrznych krawędziach systemu . Wszystkie przychodzące obiekty JSON przed przekazaniem do logiki aplikacyjnej są parsowane przez odpowiadające im schematy Zod . Schematy te nie tylko weryfikują typy proste i opcjonalność pól, ale również wymuszają ścisłe reguły domenowe za pomocą transformacji `z.preprocess()` oraz dodatkowych weryfikacji kontekstowych `superRefine()` .

Zaawansowane reguły rafinacji obejmują między innymi sprawdzanie spójności metrum i liczby impulsów na ćwierćnutę (PPQ) w logice czasowej , wykrywanie cykli w skierowanym grafie połączeń szyn miksera audio (`busGraphHasCycle`) , weryfikację relacji między klipami CUE a zasobami audio w projekcie , wymuszanie wykluczania identyfikatorów programu MIDI w szablonach projektów  oraz automatyczną koercję struktury setlisty pomiędzy formatem kanonicznym a formatem dziedziczonym .

Dotychczasowy zestaw testów w `schema.test.ts` skupiał się głównie na weryfikacji ścieżek pozytywnych (happy paths) oraz wybranych asercjach negatywnych dla nagłówków API i podstawowych struktur komunikatów . Wiele kluczowych mechanizmów wyłapywania błędów pozostało nieprzetestowanych pod kątem danych wejściowych przekraczających limity lub naruszających spójność grafu .

---

## Analiza luk testowych w wymiarach badawczych

### Ewolucja dokumentów Project (V1–V5) i ścieżki migracji

Struktura dokumentu projektu w StageSync ewoluowała od prostej formy V1 do wielowarstwowej struktury V5 obsługującej tory audio, automatykę, ścieżki tekstu, akordów, znaki CUE oraz konfigurowalny routing szyn i wyjść sprzętowych .

Schemat `ProjectSchemaV1` nie posiada bezpośrednich testów weryfikujących zachowanie przy braku wymaganych pól lub nieprawidłowym formacie znacznika czasu ISO w `updatedAt` . W przypadku `ProjectSchemaV2`, chociaż istnieje test poprawności generowanego ziarna , brakuje testów odrzucających ujemne wartości pozycji `startTicks` dla klipów formy niebędących odliczaniem (pre-roll) oraz testowania niedozwolonych kombinacji metrum w `meterMap` .

Dla `ProjectSchemaV3` oraz `ProjectSchemaV4` testy weryfikują ścieżkę podnoszenia wersji z wersji niższych . Jednakże pomijają one weryfikację rygorystycznych ograniczeń rozmiarów tablic (`assets` max 256, `audioTracks` max 64, `audioClips` max 512) , jak również ograniczeń długości tekstów w `TekstClipSchema` (max 2000 znaków) oraz poprawności unikatowych ról wykonawców w `CueClipSchema` .

Największy obszar nietestowanych reguł znajduje się w `ProjectSchemaV5` . Choć schemat weryfikuje podstawowy przypadek zakazu użycia `midiProgramId` w szablonach oraz nieistniejące identyfikatory zasobów dla znaku CUE , brakuje w nim testów negatywnych dla wywołań funkcji `superRefine()` . W szczególności dotyczy to wykrywania bezpośrednich i pośrednich cykli w szynach audio, zapętlenia szyny do samej siebie, przypisania wyjścia toru audio do nieistniejącego wyjścia sprzętowego `hwOutputId` lub szyny `busId`, a także sytuacji, w której znak CUE odwołuje się do pliku niebędącego zasobem audio (np. do pliku MusicXML lub okładki) .

Ścieżki migracji projektów (`upgradeProjectV2ToV3`, `upgradeProjectV3ToV4`, `upgradeProjectV4ToV5`) są przetestowane wyłącznie pod kątem przekształcania poprawnie uformowanych ziaren danych . Brakuje testowania migracji obiektów niekompletnych lub zawierających pola z wartościami brzegowymi, co w środowisku produkcyjnym może prowadzić do cichego podstawienia nieprawidłowych struktur domenowych .

### Funkcje rafinacji, grafy audio i podsystem Setlist

Funkcja `refineMeterForPpq` weryfikuje, czy zadana kombinacja licznika i mianownika metrum przy podstawowej rozdzielczości `DEFAULT_PPQ = 960` generuje całkowitą liczbę impulsów na takt (`ticksPerBar`) . Obecny test sprawdza ułamkowe metrum 5/7 . Brak jest testów dla mianowników niebędących potęgami dwójki powodujących błędy zaokrągleń ułamkowych (np. 7/11) oraz dla zerowych lub ujemnych wartości liczników i mianowników .

Funkcja `busGraphHasCycle` chroni silnik audio przed pętlami nieskończonymi w grafie połączeń . Logika ta weryfikuje skierowane krawędzie zdefiniowane w obiekcie projektu . Żaden z istniejących testów w `schema.test.ts` nie uruchamia weryfikacji cykli w kontekście parsowania całego dokumentu projektu przez `ProjectSchemaV5` lub `PutProjectBodySchema` . Niezbędne jest przetestowanie cyklu własnego ($A \rightarrow A$), cyklu dwuelementowego ($A \rightarrow B \rightarrow A$) oraz cyklu wieloelementowego ($A \rightarrow B \rightarrow C \rightarrow A$) .

Schemat `SetlistSchema` wykorzystuje `z.preprocess()` z funkcją `coerceSetlistInput` do automatycznego dostosowywania obiektów wejściowych . Istniejące testy sprawdzają konwersję z `projectIds` na `items` oraz zachowanie w przypadku obecności obu pól . Brakuje testów dla nieprawidłowych danych wejściowych, takich jak przekazanie wartości niebędących obiektami (`null`, liczby, ciągi znaków) czy obiektów z tablicami zawierającymi elementy o nieznanym polu `type`, braku pola `type` lub wartościach numerycznych w miejscu UUID .

### Podsystem Audio/Mixer i granice fizyczne

Struktura miksera audio definiuje rygorystyczne ograniczenia liczbowe oraz relacyjne . Przekroczenie granic w tych schematach może prowadzić do nieprzewidzianych stanów w WebAudio API lub awarii wątku przetwarzania .

Schemat `AudioClipSchema` waliduje atrybuty klipów dźwiękowych . Brakuje w nim testów negatywnych dla wartości wzmocnienia `gainDb` spoza zakresu $[-60, 24]$ dB, panoramy `pan` spoza zakresu $[-1, 1]$, ujemnych wartości czasów narastania i wygaszania (`fadeInMs`, `fadeOutMs`) oraz ujemnych czasów docięcia (`trimInMs`, `trimOutMs`) .

Schemat `CueSampleConfigSchema` definiuje konfigurację samplera dla znaków CUE . Testy weryfikują wyłącznie wyłapywanie braku szyny lub zasobu w projekcie . Nie przetestowano granic pól `gainDb` i `pan` oraz poprawności wartości wyliczeniowych dla `polyphony` (`retrigger` | `choke`) i `quantization` (`tick` | `next-beat` | `immediate`) .

Schematy `MixerOutputDestSchema` oraz `BusOutputDestSchema` wykorzystują dyskryminowaną unię po polu `kind` (`master` | `bus` | `hw_out`) . Brak w nich testów odrzucenia nieznanego rodzaju wyjścia lub braku wymaganych pól `busId` albo `hwOutputId` przy wybranej dyskryminancie .

Wszystkie wyznaczone w specyfikacji V5 maksymalne rozmiary tablic (`audioTracks`: 64, `audioClips`: 512, `audioBusses`: 16, `audioHardwareOutputs`: 32, `assets`: 256, `forma.clips`: 256, `tempoMap`: 256, `meterMap`: 256, `keyMap`: 256) nie posiadają testów przekroczenia limitu o jeden element .

### Endpointy API i komunikaty transportowe

Schematy Zod odpowiadają za fail-fast na punktach końcowych REST API i szynie WebSocket . W tym obszarze zidentyfikowano następujące braki testowe:

* **PutProjectBodySchema**: Korzysta z `.strict()` oraz tych samych reguł `superRefine` co V5 . Brak testów sprawdzających odrzucenie ładunku w przypadku przekazania dodatkowego, nadmiarowego pola na poziomie głównym oraz przy braku pola `updatedAt` służącego do optymistycznej kontroli współbieżności (OCC) .
* **BatchMidiPcBodySchema**: Posiada test dla `midiProgramId > 127` . Brak testów dla wartości ujemnych (`midiProgramId < 0`), braku pola `id` oraz przekroczenia maksymalnego rozmiaru tablicy `assignments` (1024 elementy) .
* **StageMessageBodySchema**: Posiada testy czasu życia `ttlMs` . Brak testu sprawdzającego odrzucenie tekstu dłuższego niż 200 znaków oraz tablicy `roles` zawierającej więcej niż 4 elementy .
* **RestoreBackupBodySchema**: Obsługuje odtwarzanie kopii zapasowej na podstawie ścieżki pliku lub tablicy ścieżek z wymaganiem `confirm: true` . Schemat ten nie posiada żadnych testów jednostkowych .
* **PutServerSettingsBodySchema**: Wymaga walidacji długości klucza (max 64 znaki) oraz typu i długości wartości (max 500 znaków), co nie zostało przetestowane .
* **PutMidiHostConfigBodySchema**: Brak testów odrzucenia kanałów MIDI spoza cyfrowego zakresu protokołu $0..15$ (np. $16$ lub $-1$) dla `inputChannel` i `outputChannel` .

---

## Inwentaryzacja luk testowych, ładunków i priorytetów

Poniższa tabela przedstawia zestawienie wyidentyfikowanych luk testowych, przykładowe dane wejściowe wywołujące błąd walidacji oraz przydzielony poziom priorytetu naprawczego.

| Schemat / Eksport | Opis Luki Walidacyjnej | Typ Testu | Przykładowy Payload / Stan Wejściowy | Priorytet |
| :--- | :--- | :--- | :--- | :--- |
| `ProjectSchemaV5` | Brak testu wyrywania cyklu w skierowanym grafie szyn ($A \rightarrow B \rightarrow A$) . | Invalid | `{ ...seed, audioBusses: [{ id: "b1", output: { kind: "bus", busId: "b2" } }, { id: "b2", output: { kind: "bus", busId: "b1" } }] }`  | **P0** |
| `ProjectSchemaV5` | Brak blokady odwołania CUE sample do pliku niebędącego audio (np. obraz okładki) . | Invalid | `{ ...seed, assets: [{ id: "a1", kind: "cover", ... }], cue: { clips: [{ sample: { assetId: "a1" }, ... }] } }`  | **P0** |
| `ProjectSchemaV5` | Brak weryfikacji odwołania toru audio do nieistniejącego wyjścia sprzętowego `hwOutputId` . | Invalid | `{ ...seed, audioTracks: [{ id: "t1", name: "T1", output: { kind: "hw_out", hwOutputId: "missing-hw" } }] }`  | **P0** |
| `RestoreBackupBodySchema` | Brak walidacji wymogu `confirm: true` oraz braku ścieżek w unii przywracania . | Invalid | `{ path: "/backups/bak1.zip", confirm: false }` lub `{ paths: [] }`  | **P0** |
| `ProjectSchemaV5` | Przekroczenie maksymalnego rozmiaru tablicy torów audio (max 64) . | Invalid | `{ ...seed, audioTracks: Array(65).fill(validTrack) }`  | **P1** |
| `ProjectSchemaV5` | Przekroczenie maksymalnego rozmiaru tablicy klipów audio (max 512) . | Invalid | `{ ...seed, audioClips: Array(513).fill(validClip) }`  | **P1** |
| `AudioClipSchema` | Wartości wzmocnienia `gainDb` lub panoramy `pan` spoza dopuszczalnego zakresu . | Invalid | `{ id: "c1", trackId: "t1", assetId: "a1", startTicks: 0, lengthTicks: 960, gainDb: 30 }`  | **P1** |
| `MeterEventSchema` | Nieprawidłowe metrum generujące ułamkowe impulsy zegara (`ticksPerBar`) . | Invalid | `{ id: "m1", startTicks: 0, numerator: 7, denominator: 11 }`  | **P1** |
| `SetlistSchema` | Przekazanie nieprawidłowej struktury elementu w preprocessingu setlisty . | Invalid | `{ version: 1, enabled: true, items: [{ type: "unknown" }], autoAdvance: { enabled: false } }`  | **P1** |
| `PutMidiHostConfigBodySchema` | Kanały MIDI wykraczające poza zakres $0..15$ . | Invalid | `{ inputChannel: 16 }` lub `{ outputChannel: -2 }`  | **P1** |
| `PutServerSettingsBodySchema` | Zbyt długi klucz zmiennej środowiskowej (>64 znaki) lub wartość (>500 znaków) . | Invalid | `{ values: { ["X".repeat(65)]: "value" } }`  | **P1** |
| `StageMessageBodySchema` | Komunikat tekstowy na scenę przekraczający limit 200 znaków . | Invalid | `{ text: "A".repeat(201) }`  | **P2** |
| `FormaClipSchema` | Zbyt długa nazwa sekcji formy (>120 znaków) lub notatka (>500 znaków) . | Invalid | `{ id: "f1", name: "N".repeat(121), startTicks: 0, lengthTicks: 960 }`  | **P2** |
| `UpdateStatusSchema` | Przekazanie nieznanego trybu aktualizacji w odpowiedzi statusu systemu . | Invalid | `{ current: "1.0", latest: "1.1", updateAvailable: true, updateMode: "invalid_mode" }`  | **P2** |
| `LibraryProjectEntrySchema` | Etykieta klucza muzycznego `keyLabel` przekraczająca 16 znaków . | Invalid | `{ id: "p1", name: "P1", keyLabel: "C_MAJOR_VERY_LONG_LABEL" }`  | **P2** |

---

## Hierarchia priorytetów i klasyfikacja zagrożeń

Uzupełnianie pakietu testów powinno odbywać się według ścisłej klasyfikacji opartej na analizie ryzyka awarii podczas koncertu na żywo oraz ryzyka uszkodzenia bazy danych.

Klasa priorytetu **P0 (Security, Corruption & Critical Runtime)** obejmuje błędy walidacji, których przeoczenie prowadzi do zwarcia logiki aplikacyjnej, zawieszenia wątku audio lub nieodwracalnej utraty danych . Należą do niej cykle w grafie szyn miksera, które w przypadku braku wyłapania na krawędzi API powodują nieskończoną rekurencję podczas wyliczania routingu w silniku odtwarzania . Do tej klasy zalicza się również brak weryfikacji typu zasobu w samplerze CUE (próba załadowania pliku graficznego jako bufora dźwiękowego w trakcie występu) oraz operacje niepotwierdzonego nadpisania danych systemowych (`RestoreBackupBodySchema`) .

Klasa priorytetu **P1 (Functional Integrity & Boundary Violations)** dotyczy naruszeń spójności domenowej oraz przekroczeń limitów zasobów . Brak testów dla ograniczeń rozmiarów tablic może prowadzić do przeciążenia pamięci operacyjnej przeglądarki . Nieprawidłowości w zakresach wzmocnienia audio, panoramy czy definicjach metrum powodują niepoprawne wyliczenia w przeliczniku BBT oraz zniekształcenia sygnału cyfrowego .

Klasa priorytetu **P2 (Cosmetic & UI Formatting)** obejmuje walidację pól tekstowych i metadanych pomocniczych, takich jak zbyt długie notatki w sekcjach formy, etykiety klucza czy opcjonalne komunikaty statusu aktualizacji . Błędy w tym obszarze wpływają na estetykę interfejsu użytkownika, lecz nie zagrażają stabilności silnika operacyjnego StageSync .

---

## Strategia i wzorce implementacyjne w Vitest

### Organizacja i grupowanie zestawu testów

Aby zapobiec duplikacji kodu oraz utrzymać przejrzystość przy ponad 50 schematach, testy w `schema.test.ts` należy pogrupować w siedem dedykowanych bloków `describe` odpowiadających domenom funkcjonalnym:

1. `describe("Primitives & Time Schemas")` – testy dla `BpmSchema`, `DefaultMeterSchema`, `MeterEventSchema`, `ProjectIdSchema` .
2. `describe("Project Schema Evolution & Upgrades")` – testy dla `ProjectSchemaV1` do `V5` oraz funkcji podnoszenia wersji `upgradeProjectVxToVy` .
3. `describe("Timeline Lanes & Clips")` – testy dla `FormaClipSchema`, `AudioClipSchema`, `TekstClipSchema`, `AkordClipSchema`, `CueClipSchema` .
4. `describe("Audio & Mixer Routing Graph")` – testy dla `AudioBusSchema`, `AudioHardwareOutputSchema`, relacji routingu i wykrywania cykli .
5. `describe("Setlist & Library Catalog")` – testy dla `LibrarySchema`, `SetlistSchema`, `PutSetlistBodySchema` oraz preprocesora .
6. `describe("API Endpoints & Messages")` – testy dla `PutProjectBodySchema`, `StageMessageBodySchema`, `BatchMidiPcBodySchema`, `RestoreBackupBodySchema` .
7. `describe("System & Infrastructure Metadata")` – testy dla `HealthResponseSchema`, `UiManifestSchema`, `UpdateStatusSchema` .

### Wzorce asercji i weryfikacja komunikatów błędów

Wszystkie testy negatywne muszą weryfikować nie tylko fakt zgłoszenia błędu przez metodę `.parse()`, ale również obecność oczekiwanego fragmentu tekstu w komunikacie błędu Zod (`ZodIssue`) . Sprawdzanie samego zgłoszenia wyjątku jest niewystarczające, ponieważ test może zaliczyć błąd wywołany brakiem innego wymaganego pola w obiekcie .

Standardowy wzorzec asercji w środowisku Vitest przedstawia poniższy kod:

```typescript
import { describe, expect, it } from "vitest";
import { ProjectSchemaV5 } from "./schema.js";
import { createProjectV5Seed } from "./project-seed.js";

describe("Audio & Mixer Routing Graph (Negative Edge Cases)", () => {
  it("rejects project when audio busses form a direct cycle (A -> B -> A)", () => {
    const seed = createProjectV5Seed("p-1", "Test", "2026-07-19T12:00:00.000Z");
    const payloadWithCycle = {
      ...seed,
      audioBusses: [
        {
          id: "bus-a",
          name: "Bus A",
          output: { kind: "bus" as const, busId: "bus-b" },
        },
        {
          id: "bus-b",
          name: "Bus B",
          output: { kind: "bus" as const, busId: "bus-a" },
        },
      ],
    };

    expect(() => ProjectSchemaV5.parse(payloadWithCycle)).toThrow(
      /Bus routing graph must be acyclic/i,
    );
  });

  it("rejects cue clip sample referencing a non-audio asset", () => {
    const seed = createProjectV5Seed("p-1", "Test", "2026-07-19T12:00:00.000Z");
    const payloadWithCoverSample = {
      ...seed,
      assets: [
        {
          id: "asset-cover-1",
          storageName: "cover.jpg",
          originalName: "cover.jpg",
          kind: "cover" as const,
          mimeType: "image/jpeg",
          sizeBytes: 50000,
        },
      ],
      cue: {
        clips: [
          {
            id: "cue-1",
            startTicks: 0,
            lengthTicks: 960,
            label: "Intro Hit",
            sample: {
              assetId: "asset-cover-1",
            },
          },
        ],
      },
    };

    expect(() => ProjectSchemaV5.parse(payloadWithCoverSample)).toThrow(
      /Cue sample assetId must reference an audio asset/i,
    );
  });
});
```

### Strategia budowania obiektów testowych: Ziarno vs Surowy JSON

Wybór sposobu przygotowania danych wejściowych w testach powinien zależeć od zakresu walidowanego schematu :

Wykorzystanie fabryki `createProjectV5Seed` jest zalecane wyłącznie przy testowaniu pełnych schematów dokumentów (`ProjectSchemaV5`, `PutProjectBodySchema`) oraz ich złożonych reguł `superRefine` . Generuje ona kompletny, poprawny strukturalnie obiekt zawierający ponad kilkanaście wymaganych pól podrzędnych . Modyfikacja pojedynczych właściwości za pomocą operatora spread (`...seed`) pozwala na precyzyjne izolowanie testowanej reguły bez konieczności ręcznego redefiniowania nagłówków i struktur pomocniczych .

Tworzenie minimalnych, surowych obiektów JSON (raw objects) należy stosować przy testowaniu wyizolowanych schematów podrzędnych (np. `AudioClipSchema`, `StageMessageBodySchema`, `FormaClipSchema`, `MidiHostConfigSchema`) . Przekazywanie małych obiektów bezpośrednio do metody `Schema.parse()` skraca czas wykonywania zestawu testów, zmniejsza alokację pamięci i eliminuje wrażliwość testu na ewentualne zmiany w domyślnej strukturze fabryki ziarna projektów .

### Środowisko wykonawcze i bezkontekstowość testów

Wszystkie schematy Zod zdefiniowane w `schema.ts` stanowią czyste funkcje weryfikacyjne . Ich uruchomienie w środowisku Vitest wewnątrz `packages/shared` odbywa się bez udziału drzewa DOM oraz modułów Node.js . W związku z tym w pakiecie testowym nie stosuje się żadnych atrap (mocków) sieciowych, bazodanowych ani zegarowych . Wyjątkiem od tej zasady jest weryfikacja funkcji pomocniczych, takich jak `normalizeKeyTonic`, gdzie test sprawdził domyślny fallback w ładowaniu modułu, co zostało zrealizowane bez użycia zewnętrznych bibliotek pozorujących .

---

## Analiza ryzyk i optymalizacja zestawu testów

Wyeliminowanie luk testowych wiąże się z dwoma głównymi wyzwaniami w obszarze utrzymania kodu :

Pierwszym ryzykiem jest wzrost czasu wykonywania testów i zużycia pamięci operacyjnej na skutek nadmiernego powielania obiektów generowanych przez `createProjectV5Seed` . Dodanie kilkudziesięciu nowych przypadków testowych, z których każdy tworzy pełną strukturę projektu V5, może wydłużyć czas wykonania pętli CI/CD . Rozwiązaniem jest rygorystyczne przestrzeganie zasady używania ziaren wyłącznie w testach rafinacji całego dokumentu, natomiast w pozostałych przypadkach stosowanie minimalnych struktur surowych .

Drugim aspektem jest ryzyko niestabilności testów (flakiness) . Ze względu na bezstanowy character parserów Zod, testy walidacyjne są całkowicie deterministyczne i wolne od niestabilności czasowej . Jedynym potencjalnym źródłem błędów może być niepożądana mutacja wspólnego obiektu ziarna w przypadku braku tworzenia głębokiej kopii lub niestosowania czystej struktury spread . Przestrzeganie zasady immutable data wewnątrz każdego bloku `it` całkowicie eliminuje to ryzyko .

---

## Wnioski i rekomendacje wdrożeniowe

Przeprowadzona analiza wykazuje obecność istotnych luk w pokryciu testami negatywnymi podsystemu walidacji StageSync . W celu zagwarantowania pełnej niezawodności oprogramowania na krawędziach HTTP/IPC/Plik zaleca się podjęcie następujących działań:

1. Wdrożenie w pierwszej kolejności testów dla priorytetu **P0**, obejmujących blokadę cykli w szynach audio, weryfikację spójności typów zasobów w samplerze CUE, odwołania do wyjść sprzętowych oraz ścisłą walidację potwierdzenia w schemacie przywracania kopii zapasowej .
2. Uzupełnienie testów z klasy **P1**, w tym weryfikacji przekroczenia maksymalnych rozmiarów tablic (`assets`, `audioTracks`, `audioClips`, `audioBusses`) oraz zakresów parametrów audio i kanałów MIDI .
3. Ustrukturyzowanie pliku `schema.test.ts` według siedmiu zaproponowanych bloków domenowych z wyraźnym rozdzieleniem testów ziaren projektowych od minimalnych obiektów surowych .
4. Włączenie wdrożonych testów do ciągłej integracji z nakazem weryfikacji komunikatów błędów za pomocą dopasowań wzorców tekstowych w `toThrow()` .

---
Powered by [AI Exporter](https://saveai.net)
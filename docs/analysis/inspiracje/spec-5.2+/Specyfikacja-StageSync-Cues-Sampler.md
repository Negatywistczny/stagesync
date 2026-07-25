> From: https://gemini.google.com/app/b371f8456ce5e760

Specyfikacja Cues Sampler StageSync

# Referencja i Specyfikacja Techniczna „Cues Sampler” w StageSync v5.2+ (GitHub #430)

## Architektura Domenowa i Uzgodnienie Modelu Danych

System StageSync w wersji 5.1 zapewnia spójny model odtwarzania wielościeżkowego oparty na ścieżkach Timeline Audio Tracks, powiązany bezpośrednio z autorytatywnym zegarem serwera (Server SSOT Tick Clock) . Dotychczasowa implementacja klipów na ścieżce Cues (`CueClip`) służyła wyłącznie celom komunikacyjnym oraz organizacyjnym – generując banery i ostrzeżenia tekstowe na ekranach scenicznych muzyków (`stage-cue-banner`), bez możliwości odtwarzania zasobów dźwiękowych .

Wprowadzenie modułu Cues Sampler w linii v5.2+ (GitHub #430) rozszerza możliwości systemu o precyzyjne odpalanie próbkowo-efektowych sygnałów audio, takich jak efekty one-shot, jingle, zliczenia akustyczne czy podkłady lektorskie . Wyzwalanie to odbywa się bezpośrednio z osi czasu Cues lub poprzez ręczne impulsy operatorskie FOH .

### Analiza Wzorców Branżowych i Decyzja Modelowa

Projektując architekturę Cues Samplera, przeanalizowano wdrożenia w czterech wiodących środowiskach scenicznych i DAW:

1. **QLab (Audio Cue)**: Pływające zdarzenia audio powiązane z czasem zegarowym (wall-clock) lub pętlami, oferujące wsparcie dla odtwarzania ciągłego, matryc poziomów wyjściowych oraz bezpośrednich wyzwalaczy ręcznych .
2. **Ableton Live (Clip Launch)**: Kwantyzowane wyzwalanie klipów w trybach Trigger (one-shot), Gated (odtwarzanie ograniczone czasem trwania bramki) oraz Toggle, z synchronizacją do najbliższej miary taktu lub siatki .
3. **MainStage (Sample Trigger / Alias)**: Wyzwalanie zasobów próbek przypisanych do sekcji patcha, z przekierowaniem sygnału na pomocnicze szyny wyjściowe .
4. **Playback / GO Button**: Wyzwalacze FOH oferujące tryby pracy niezależne od głównego transportu (fire-and-forget) oraz tryby synchronizowane z zegarem utworu .

#### Rozstrzygnięcie Architektoniczne: Rozszerzenie `CueClip` vs Osobny Model Samplera

Przeanalizowano dwie ścieżki rozwoju struktury danych: utworzenie osobnej linii i schematu `SamplerClip` na osi czasu lub rozszerzenie dotychczasowej struktury `CueClipSchema` o opcjonalny obiekt konfiguracji próbki `sample?: CueSampleConfig` .

Przyjmuje się rozszerzenie istniejącego modelu `CueClip` .

Decyzja ta wynika bezpośrednio z realiów pracy estradowej. W praktyce wykonawczej komunikat tekstowy widoczny na ekranie muzyka (np. baner "Wejście Wokal") oraz powiązany z nim akustyczny sygnał wyzwalający lub efekt występują dokładnie w tym samym punkcie czasowym (`startTicks`) . Rozdzielenie banera i sampla na dwa osobne obiekty tworzyłoby ryzyko rozsynchronizowania podczas przesuwania klipów na Timeline . Ponadto integracja wewnątrz `CueClip` zapobiega powstawaniu nadmiernej liczby linii na osi czasu, ograniczając tłok wizualny w edytorze . Rozwiązanie to wyklucza potrzebę stosowania architektury podwójnego zapisu (dual-write) oraz zachowuje pełną wsteczną kompatybilność – klipy pozbawione sekcji `sample` funkcjonują dokładnie tak jak dotychczas .

### Rygor Pipeline'u Assetów i Zarządzanie Pamięcią

Cues Sampler wykorzystuje ten sam kanoniczny pipeline zasobów co ścieżki wielośladowe Timeline (`ProjectAssetSchema`) . Każda próbka audio wykorzystywana przez sampler musi zostać wcześniej zarejestrowana w tablicy `project.assets` z rodzajem `kind: "audio"` .

Zarządzanie pamięcią podręczną i dekodowaniem podlega ścisłym limitom eksploatacyjnym:

* **Pula Pamięci Dekodowanej**: Sampler korzysta z globalnego bufora `bufferCache` w module `audioPlayback.ts`, posiadającego sztywny limit do 32 najczęściej używanych zdekodowanych obiektów `AudioBuffer` .
* **Pre-buffering (Proaktywne Dekodowanie)**: Operacja `ensureAudioBuffered()` przed uruchomieniem odtwarzania skanuje nie tylko ścieżki audio, ale również klipy `CueClip` zawierające konfigurację samplera, co eliminuję opóźnienia cold-start podczas odpalania próbek .
* **Limity Pamięciowe**: Pojedynczy plik audio nie może przekraczać 100 MB . Łączny przydział pamięci RAM dla buforów zdekodowanych w kontekście WebAudio samplera nie może przekraczać 256 MB na projekt.

---

## A) Macierz Zachowań Referencyjnych (MVP 5.2 vs Later)

Poniższe zestawienie definiuje odwzorowanie wzorców rynkowych na architekturę StageSync, ustalając podział funkcjonalny pomiędzy wersję MVP 5.2 a późniejsze wydania.

| ID | Funkcja / Zachowanie Wzorcowe | Wzorzec Branżowy | Specyfikacja StageSync MVP 5.2 | Zakres (MVP vs Later) |
|---|---|---|---|---|
| **CSMP-REF-01** | Wyzwalanie One-Shot | Ableton (Trigger), QLab (Audio Cue) | Pełne odtworzenie pliku audio od początku po osiągnięciu `startTicks`. Długość klipu nie ucina odtwarzania . | **MVP 5.2** |
| **CSMP-REF-02** | Wyzwalanie Gated | Ableton (Gated) | Odtwarzanie próbki rozpoczyna się na `startTicks` i ulega wymuszonemu wyciszeniu po upływie `lengthTicks` . | **MVP 5.2** |
| **CSMP-REF-03** | Synchronizacja do Ticka SSOT | Playback / Ableton | Start odtwarzania następuje precyzyjnie na ticku `startTicks` osi czasu serwera . | **MVP 5.2** |
| **CSMP-REF-04** | Kwantyzacja do Beatu | Ableton (1 Beat Quantize) | Ręczny impuls GO oczekuje na najbliższą miarę taktu (beat tick) wyznaczoną z `meterMap` przed wyzwoleniem . | **MVP 5.2** |
| **CSMP-REF-05** | Wyzwalanie Bezpośrednie (Immediate) | QLab (HotKey GO) | Ręczny impuls GO odpala próbkę natychmiast po odebraniu zdarzenia interfejsu, z pominięciem siatki czasowej . | **MVP 5.2** |
| **CSMP-REF-06** | Kontynuacja po Stopie (Fire-and-Forget) | QLab (Continue Cue) | Flaga `playPostStop: true` zezwala na dokończenie odtwarzania próbki po zatrzymaniu głównego transportu . | **MVP 5.2** |
| **CSMP-REF-07** | Natychmiastowe Wyciszenie (PANIC) | QLab (Panic / Hard Stop) | Komenda PANIC bezwarunkowo wycisza i rozłącza wszystkie grające próbki, w tym obiekty fire-and-forget . | **MVP 5.2** |
| **CSMP-REF-08** | Routing do Master / Bus | MainStage / DAW Mixer | Przekierowanie sygnału samplera na sumę Master lub wskazaną grupę `audioBusses` w mikserze . | **MVP 5.2** |
| **CSMP-REF-09** | Wyzwalanie Wielogłosowe (Polyphonic) | Samplery sprzętowe | Nakładanie na siebie kolejnych instancji tej samej próbki przy wielokrotnym wyzwoleniu. | **Later (v5.3+)** |
| **CSMP-REF-10** | Odtwarzanie w Pętli (Looping) | QLab (Infinite Loop) | Zapętlenie próbki wewnątrz przedziału `lengthTicks` klipu. | **Later (v5.3+)** |
| **CSMP-REF-11** | Transpozycja (Pitch Shift) | Ableton / MainStage | Zmiana wysokości dźwięku samplera w półtonach bez wpływu na czas trwania. | **Later (v5.3+)** |
| **CSMP-REF-12** | Bezpośrednie Wyjścia Fizyczne HW 3–4 | DAW Multi-Out | Kierowanie sygnału na fizyczne porty karty dźwiękowej z pominięciem miksera programu. | **Later (v5.3+)**  |

---

## B) Specyfikacja Modelu Danych (Zod) i Migracja Projektu

Model danych zostaje rozszerzony w sposób deklaratywny poprzez wprowadzenie pomocniczego schematu `CueSampleConfigSchema` oraz zaktualizowanie `CueClipSchema`. Dokument projektu przechodzi do wersji formatu `formatVersion: 6`.

### Struktura Konfiguracji Samplera (`CueSampleConfigSchema`)

Konfiguracja próbki jest definiowana jako opcjonalne pole wewnątrz klipu Cue. Poniższa tabela opisuje poszczególne pola schematu.

| Pole | Typ i Ograniczenia Zod | Wymagane | Opis i Wartości Domyślne |
|---|---|---|---|
| `assetId` | `z.string().min(1)` | Tak | Identyfikator zasobu z tablicy `project.assets` (wymagany `kind: "audio"`) . |
| `mode` | `z.enum(["one-shot", "gated"])` | Nie | Tryb odtwarzania: `"one-shot"` (całość pliku) lub `"gated"` (przycięte do `lengthTicks`). Domyślnie `"one-shot"`. |
| `quantization` | `z.enum(["tick", "next-beat", "immediate"])` | Nie | Tryb czasowy wyzwalania. Domyślnie `"tick"`. |
| `gainDb` | `z.number().finite().min(-60).max(24)` | Nie | Wzmocnienie próbki w decybelach w zakresie od -60 do +24 dB. Domyślnie `0`. |
| `pan` | `z.number().finite().min(-1).max(1)` | Nie | Panorama stereo w zakresie -1 (Left) do +1 (Right). Ominięcie oznacza środek (0). |
| `output` | `MixerOutputDestSchema` | Nie | Cel routingu: Master lub szyna grupy (`{ kind: "bus", busId: string }`) . Ominięcie oznacza Master. |
| `playPostStop` | `z.boolean()` | Nie | Jeśli `true`, próbka kontynuuje odtwarzanie po zatrzymaniu transportu. Domyślnie `false`. |
| `polyphony` | `z.enum(["retrigger", "choke"])` | Nie | Reakcja na ponowne wyzwolenie: `"retrigger"` (restart od początku) lub `"choke"` (wyciszenie). Domyślnie `"retrigger"`. |

### Zaktualizowana Struktura Klipu Cue (`CueClipSchema`)

Struktura `CueClipSchema` przyjmuje opcjonalny obiekt `sample`:

* `id`: `z.string().min(1)` 
* `startTicks`: `z.number().int()` 
* `lengthTicks`: `z.number().int().positive()` 
* `label`: `z.string().min(1).max(200)` 
* `roles`: `z.array(CueClipRoleSchema).max(4).optional()` 
* `priority`: `z.enum(["normal", "alert"]).optional()` 
* `sample`: `CueSampleConfigSchema.optional()`

### Migracja Dokumentu Projektu (V5 do V6)

Migracja struktury projektu z wersji formatu V5 (`ProjectSchemaV5`) do V6 (`ProjectSchemaV6`) przebiega w sposób automatyczny i bezstratny . Transformator migracyjny wykonuje następujące operacje:

1. Podbicie pola `formatVersion` z wartości `5` na `6` w korzeniu dokumentu projektu.
2. Iteracja po tablicy `project.cue.clips` – istniejące obiekty klipów zachowują wszystkie dotychczasowe wartości (`id`, `startTicks`, `lengthTicks`, `label`, `roles`, `priority`), a ich pole `sample` przyjmuje wartość `undefined` .
3. Walidacja spójności routingu – w przypadku gdy migrowany projekt zawierałby nieistniejące odnośniki szyn wyjściowych w obszarze samplera, cel wyjścia jest bezpiecznie sprowadzany do sumy Master (`{ kind: "master" }`) .
4. Odświeżenie znacznika czasu edycji `updatedAt` do bieżącego ciągu ISO.

---

## C) Relacja do Transportu SSOT i Silnika WebAudio

Wszelkie decyzje o odtwarzaniu w StageSync bazują na autorytatywnym zegarze serwera przeliczanym na liczby całkowite ticków przy stałej rozdzielczości PPQ .

### Cykl Życia Odtwarzania Samplera

Proces odtwarzania próbki w kliencie wewnątrz funkcji `syncAudioPlayback()` przebiega według ściśle określonej sekwencji wykonawczej :

1. **Skanowanie Osi Czasu**: Podczas biegu transportu silnik odczytuje pozycję `displayTicks` i weryfikuje obecność klipów `CueClip` posiadających skonfigurowaną sekcję `sample` .
2. **Kwalifikacja Wyzwolenia**:
   * Dla kwantyzacji `tick`: Odtwarzanie jest szeregowane w grafie WebAudio dokładnie na czas odpowiadający `startTicks` .
   * Dla kwantyzacji `next-beat`: Silnik wyznacza najbliższy przyszły tick miary taktu na podstawie `meterMap` i odracza start węzła do tego punktu .
   * Dla kwantyzacji `immediate`: Wyzwolenie następuje bezkwantowo w oknie czasowym bieżącej ramki renderowania WebAudio .
3. **Inicjalizacja Węzłów Audio**: Tworzony jest obiekt `AudioBufferSourceNode` połączony z węzłem regulacji poziomu `levelGain` oraz węzłem panoramy `panNode`, po czym sygnał jest kierowany do właściwego celu wyjściowego w mikserze .
4. **Obsługa Reakcji na Zatrzymanie Transportu (Stop / Pause)**:
   * W przypadku standardowym (`playPostStop: false`), komenda zatrzymania transportu wywołuje natychmiastowe zatrzymanie i odłączenie wszystkich aktywnych węzłów samplera .
   * W przypadku włączonej opcji fire-and-forget (`playPostStop: true`), zatrzymanie głównego transportu nie przerywa biegu źródła `AudioBufferSourceNode`. Próbka gra do naturalnego końca pliku .
5. **Procedura Awaryjna PANIC**: Wywołanie komendy PANIC z konsoli FOH lub podwójne wciśnięcie przycisku Stop wyzwala bezwarunkowe wyciszenie całego grafu audio. Wyszukiwane są wszystkie aktywne źródła (w tym obiekty `playPostStop`), po czym aplikowana jest szybka, 5-milisekundowa rampa wyciszająca eliminująca trzaski, a węzły zostają rozłączone .
6. **Obsługa Przeskoku (Seek / Scrubbing)**: Przesunięcie wskaźnika odczytu w środek trwania klipu Cues nie wywołuje ponownego odtworzenia samplera one-shot, co zapobiega nakładaniu się niepożądanych efektów dźwiękowych przy nawigacji po Timeline .

### Integracja z Grafem Miksera

Sygnał wyjściowy samplera włączany jest w istniejącą topologię audio miksera :

* **Ścieżka Sygnałowa**: `AudioBufferSourceNode` -> `levelGain` (dB próbki) -> `panNode` (balans/panorama) -> `Target Route` (`MasterBus` lub `GroupBus`) .
* **Spójność z Mikserem 5.1**: Sygnał samplera może być kierowany wyłącznie do celów dozwolonych w `MixerOutputDestSchema` (Suma Master lub zarejestrowane szyny `audioBusses`) . Tworzenie fikcyjnych adresów fizycznych HW Out 3–4 jest zablokowane .
* **Izolacja Odsłuchu Metronomu**: Ścieżka metronomu realizowana jest przez bezpośredni, niezależny tor audio . Sampler nie ma bezpośredniego dostępu do toru metronomu, chyba że zostanie skierowany na dedykowaną szynę grupy pomocniczej przeznaczonej do odsłuchu .

---

## D) Specyfikacja Interfejsu Użytkownika (UI) i Dostępności (a11y)

Zgodnie z zapisami ADR 0011, interfejs StageSync utrzymuje ścisły podział na rolę edycyjną (Admin / Host) oraz rolę konsumpcyjną (Client Scene View) . Wprowadzenie atrapy kontrolek lub nieaktywnych elementów "na zapas" jest kategorycznie zabronione .

### Timeline Inspector (Admin / Host Editor)

Gdy na ścieżce Cues zaznaczony zostanie klip `CueClip`, w panelu Inspectora (`TimelineShell.tsx`) aktywuje się dedykowana sekcja konfiguracji samplera .

Sekcja konfiguracyjna Inspectora zawiera następujące grupy pól:

* **Zasób Audio (Asset Selector)**: Lista rozwijana zawierająca wyłącznie pliki zarejestrowane w `project.assets` z rodzajem `kind: "audio"` .
* **Tryb Odtwarzania (Mode)**: Przełącznik segmentowy umożliwiający wybór pomiędzy trybem "One-Shot" (pełne odtworzenie) oraz "Gated" (odtwarzanie przycięte czasem trwania klipu).
* **Kwantyzacja (Timing)**: Wybór synchronizacji startu próbki: "Tick SSOT" (dokładnie na ticku klipu), "Najbliższy Beat" (synchronizacja do miary taktu) oraz "Immediate" (natychmiast po wyzwoleniu) .
* **Wzmocnienie i Panorama**: Dedykowane suwaki operujące na wartościach `gainDb` (-60…+24 dB) oraz `pan` (-1…+1) wyliczane z płynną dezipperacją parametrów WebAudio .
* **Routing Wyjściowy**: Lista wyboru celu audio obejmująca sumę Master oraz aktywne szyny grup z tablicy `audioBusses` .
* **Opcje Zachowania**: Przełącznik boolean dla opcji "Graj po zatrzymaniu (Post-Stop)" .
* **Przycisk Testowy**: Kontrolka odsłuchu umożliwiająca natychmiastowe sprawdzenie próbki z poziomu Inspectora.

### Przycisk Operatorski FOH (Manual GO Pad)

Dla realizatora FOH na panelu sterowania udostępniony zostaje dedykowany przycisk wyzwalacza ręcznego (GO Pad):

* **Sposób Działania**: Umożliwia natychmiastowe odtworzenie próbki przypisanej do zaznaczonego lub najbliższego klipu Cues na osi czasu .
* **Sygnalizacja Wizualna**: W momencie emisji dźwięku przycisk świeci światłem ciągłym z wykorzystaniem tokenu akcentu interakcji (`var(--ss-primary)`), bez wprowadzania dodatkowych barw statusowych .
* **Skróty Klawiszowe**: Dedykowana kombinacja klawiszy (np. `Shift + Space`) umożliwiająca wyzwolenie bez użycia myszy.

### Rola Kliencka (Client Role Views)

Aplikacje klienckie pracujące w widokach wykonawczych (Karaoke, Grid, Score, Drums) wyłącznie konsumują stan utworu :

* Ekrany klienckie wyświetlają banery tekstowe i ostrzeżenia zgodnie z logiką `stage-cue-banner` .
* Klient nie posiada możliwości edycji parametrów samplera ani zmiany routingu .
* Jeśli urządzenie klienckie jest skonfigurowane jako lokalny węzeł audio, odtwarza ono sygnał próbki lokalnie w oparciu o odebrane ticki synchronizacyjne SSOT .

### Dostępność (a11y)

* **Etykiety i Powiązania Formularzy**: Wszystkie elementy kontrolne w Inspectorze posiadają jawne etykiety HTML `<label>` oraz atrybuty `aria-label`.
* **Dynamiczne Komunikaty Dostępności (Live Regions)**: Wyzwolenie samplera generuje komunikat w obszarze dynamicznym `aria-live="polite"` (np. "Odtwarzanie próbki: Efekt 1"), co zapewnia informację zwrotną dla operatorów korzystających z czytników ekranu.
* **Pełna Nawigacja Klawiaturowa**: Wszystkie parametry samplera można regulować z poziomu klawiatury (klawisze Tab, Enter, Klawisze Strzałek dla suwaków wzmocnienia z krokiem 1 dB).
* **Kontrast Wizualny**: Kontrolki wykorzystują wyłącznie systemowe tokeny stylów `@stagesync/ui`, gwarantując minimalny współczynnik kontrastu 4.5:1 dla tekstu oraz wyraźne obramowania stanu skupienia (focus rings) .

---

## E) Kryteria Akceptacji, Zakazy ("NIE-ROBIĆ") oraz Mapowanie Plików

### Kryteria Akceptacji (Acceptance Criteria)

Poniższa tabela zbiera wymogi weryfikacyjne dla modułu Cues Sampler.

| ID | Kategoria | Warunek Akceptacji (Pass Criteria) |
|---|---|---|
| **CSMP-01** | Schemat i Zod | Schemat `CueClipSchema` poprawnie waliduje opcjonalną sekcję `sample`. Istniejące projekty V5 przechodzą migrację do V6 z wartością `sample: undefined` . |
| **CSMP-02** | Odtwarzanie One-Shot | Przejście playheadu przez `startTicks` klipu z poprawnym zasobem audio powoduje odtworzenie całej próbki w silniku WebAudio . |
| **CSMP-03** | Odtwarzanie Gated | W trybie `gated` próbka ulega wyciszeniu po osiągnięciu `startTicks + lengthTicks` lub przy zatrzymaniu transportu . |
| **CSMP-04** | Działanie Post-Stop | Próbka z włączoną flagą `playPostStop: true` kontynuuje odtwarzanie po wciśnięciu STOP aż do końca pliku . |
| **CSMP-05** | Wyłączenie PANIC | Komenda PANIC natychmiastowo wycisza i rozłącza wszystkie odtwarzane próbki samplera, w tym obiekty `playPostStop` . |
| **CSMP-06** | Spójność Routingu | Sygnał samplera trafia wyłącznie na dozwolone wyjścia (`master` lub wybrany `audioBus`). Wybór nieistniejącej szyny jest blokowany . |
| **CSMP-07** | Pre-buffering | Funkcja `ensureAudioBuffered()` wstępnie dekoduje i buforuje próbki samplera przed rozpoczęciem odtwarzania utworu . |
| **CSMP-08** | Interfejs Inspectora | Inspector w edytorze Admin umożliwia pełną konfigurację próbki, zmiane wzmocnienia, panoramy i wyjścia . |
| **CSMP-09** | Ochrona Klienta | Widoki klienckie (Client Shells) nie udostępniają opcji edycji ani modyfikacji parametrów samplera . |
| **CSMP-10** | Dostępność (a11y) | Kontrolki samplera są w pełni obsługiwane z klawiatury, posiadają etykiety ARIA i generują komunikaty w rejonach `aria-live` . |

### Zakazy i Wykluczenia ("NIE-ROBIĆ")

* **ZAKAZ wprowadzania nieaktywnych kontrolek Out 3–4**: W interfejsie użytkownika nie wolno umieszczać zablokowanych lub szarych kontrolek sugerujących fizyczne wyjścia HW Out 3–4. Routing musi opierać się wyłącznie na aktualnych możliwościach Miksera 5.1 .
* **ZAKAZ stosowania architektury podwójnego zapisu (Dual-Write)**: Zapis i odczyt danych samplera odbywa się bezpośrednio w nowym formacie V6. Zabrania się tworzenia osobnych, rówoległych plików konfiguracyjnych .
* **ZAKAZ edycji po stronie Klienta**: Aplikacje klienckie wyłącznie konsumują dane transportu. Wprowadzanie możliwości edycji samplera z widoków scenicznych jest zabronione .
* **ZAKAZ tworzenia osobnego pipeline'u plików**: Sampler musi korzystać z kanonicznego repozytorium `ProjectAssetSchema` i wspólnej pamięci podręcznej buforów WebAudio .
* **ZAKAZ używania atrap UI (No Stubs)**: Nie wolno umieszczać w edytorze przycisków z informacją "Funkcja dostępna wkrótce" lub nieaktywnych pól nieposiadających podpiętej logiki w silniku .

### Mapowanie na Pliki Kodowe Repozytorium

Poniższa tabela wskazuje pliki źródłowe w strukturze StageSync odpowiedzialne za realizację poszczególnych modułów samplera.

| Moduł / Plik Repozytorium | Rola w Architekturze Cues Sampler |
|---|---|
| `packages/shared/src/schema.ts` | Rozszerzenie schematów Zod: dodanie `CueSampleConfigSchema`, aktualizacja `CueClipSchema` oraz definicja `ProjectSchemaV6` . |
| `packages/shared/src/legacy-migrate.ts` | Implementacja funkcji migracyjnej przeliczającej dokumenty z formatu V5 do V6 . |
| `apps/web/src/lib/audioPlayback.ts` | Rozbudowa silnika WebAudio: logika `syncAudioPlayback()`, obsługa `playPostStop`, funkcja `PANIC` oraz pre-buffering samplera . |
| `apps/web/src/lib/cueEdit.ts` | Helpery edycyjne dla ścieżki Cues: modyfikacja parametrów samplera w szkicu projektu . |
| `apps/web/src/components/TimelineShell.tsx` | Rozbudowa UI Inspectora o sekcję konfiguracji samplera oraz przycisk wyzwalacza operatorskiego GO . |
| `packages/shared/src/stage-cue-banner.ts` | Utrzymanie spójności wyświetlania banerów tekstowych na scenie podczas odtwarzania próbek . |
| `apps/server/src/stage-hub.ts` | Rozsyłanie komunikatów o wyzwoleniu samplera do podłączonych węzłów przez WebSocket . |

---
Powered by [AI Exporter](https://saveai.net)
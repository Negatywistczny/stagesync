> From: https://gemini.google.com/app/a4e1f8ba30830dd1

Specyfikacja StageSync MIDI PC

# System Przełączania Patchy i Program Change w StageSync v5: Referencja Zachowań Scenicznych, Audyt Subsystemu i Specyfikacja Wdrożeniowa

## Analiza Komparatywna Wzorców Branżowych

Projektowanie niezawodnego subsystemu dystrybucji komunikatów MIDI Program Change (PC) w środowisku koncertowym wymaga przeanalizowania mechanizmów stosowanych przez wiodące cyfrowe stacje robocze (DAW) oraz dedykowane procesory show-control. Analiza systemów Apple MainStage, Ableton Live oraz Gig Performer pozwala zidentyfikować optymalne wzorce architektoniczne i wyeliminować antywzorce generujące ryzyko przerwania lub desynchronizacji spektaklu.

### Apple MainStage

Apple MainStage realizuje architekturę hierarchiczną złożoną z trzech poziomów: Koncert (Concert), Zestaw (Set) oraz Patch . Koncert reprezentuje całościową przestrzeń pamięciową i konfigurację połączeń I/O, Zestaw stanowi logiczne grupowanie utworów, natomiast Patch odpowiada konkretnemu brzmieniu lub sekcji utworu .

Wskazywanie i przełączanie patchy w MainStage odbywa się na dwa główne sposoby. Po pierwsze, poprzez przychodzące komunikaty MIDI Program Change dedykowane do wywoływania patchy w ramach listy Koncertu . MainStage domyślnie przechwytuje nadane komunikaty PC i mapuje je bezpośrednio na pozycję patcha na liście . W przypadku odebrania komunikatu PC niezamapowanego na żaden patch (tzw. _unused Program Change_), system może opcjonalnie przepuścić ten komunikat do torów kanałowych (Channel Strips) w celu przełączenia presetu wewnątrz wtyczki (np. w banku instrumentów Kontakt) .

Po drugie, wyjście MIDI Program Change po stronie wysyłania realizowane jest za pośrednictwem torów typu _External Instrument Channel Strip_ . Po wybraniu danego patcha MainStage automatycznie emituje skonfigurowane w inspektorze komunikaty PC oraz Bank Select (CC 0 / CC 32) na wyznaczony port wyjściowy i kanał MIDI, co wymusza zmianę brzmienia w zewnętrznych syntezatorach lub procesorach efektów .

Kluczowym mechanizmem ochronnym w MainStage jest funkcja Defer Patch Change . Zapobiega ona obcinaniu wybrzmiewających nut (głosów polyphony) lub nagłym skokom stanu wybrzmiewania (reverb/delay trail) podczas zmiany patcha . Przełączenie zasobów procesora i zmiana routingu są odraczane do momentu całkowitego zwolnienia wszystkich klawiszy (wyślij zdarzenie Note-Off) lub osiągnięcia wyznaczonej granicy taktu w odtwarzaczu sekwencji .

### Ableton Live

Ableton Live realizuje zmianę wywołań programowych w oparciu o architekturę zorientowaną na sceny i klipy w widoku Session View lub zdarzenia na ścieżce w widoku Arrangement View. Zmiana presetu urządzeń zewnętrznych powiązana jest bezpośrednio ze stanem klipu MIDI. Właściwości klipu MIDI zawierają dedykowane pola konfiguracji komunikatów wyjściowych: Bank (CC 0), Sub-Bank (CC 32) oraz Program Change (PC 1–128).

Emisja komunikatu PC następuje w momencie wyzwolenia klipu (_Clip Launch_) lub uruchomienia całej sceny (_Scene Launch_). Zdarzenie wysłania komunikatu ze ścieżki następuje bezwzględnie w punkcie kwantyzacji startu klipu (np. na najbliższą ćwierćnutę lub raz w takcie). W odróżnieniu od MainStage, Ableton Live nie posiada natywnego globalnego rejestru przypisania "1 utwór = 1 identyfikator PC" w bazie danych. Przełączanie odbywa się poprzez wysłanie zdarzenia z konkretnej ścieżki MIDI wyjściowej wysyłającej dane na zewnętrzny port fizyczny lub wirtualny.

W przypadku braku skonfigurowanych wartości Bank/Program w klipie, Ableton Live nie emituje żadnych komunikatów maskujących, pozostawiając podłączony sprzęt w dotychczasowym stanie. Brak zintegrowanej bazy danych sygnatur PC powoduje, że zarządzanie dużą biblioteką utworów wymaga ręcznego układania klipów wyzwalających na osi czasu lub w siatce Session View.

### Gig Performer oraz Systemy Show-Control (Yamaha / MOTU)

Systemy dedykowane stricte do sterowania scenicznego, takie jak Gig Performer oraz sprzętowe sterowniki show-control (MOTU Digital Performer / Yamaha MIDI Show Control), stosują rygorystyczny model powiązania _Song / Setlist Binding_. W modelach tych jednostką nadrzędną jest Utwór (Song), do którego przypisany jest unikalny, jednoznaczny numer Program Change oraz opcjonalne wartości Bank Select.

Przełączenie utworu w sterowniku nadrzędnym wywołuje natychmiastową kaskadę zdarzeń wysyłanych do wszystkich zarejestrowanych urządzeń podrzędnych (Multi-Device Targeting). Zmiana struktury setlisty (reorder) w żaden sposób nie wpływa na unikalne ID przypisane do utworu w globalnej bibliotece (SSOT), chyba że operator jawnie wywoła procedurę przemapowania (_Batch Renumbering_).

| Cecha Systemu                         | Apple MainStage                               | Ableton Live                | Gig Performer / Show-Control                            | Target StageSync v5                         |
| :------------------------------------ | :-------------------------------------------- | :-------------------------- | :------------------------------------------------------ | :------------------------------------------ |
| **Model Architektury**                | Concert $\rightarrow$ Set $\rightarrow$ Patch | Session / Arrangement Clips | Global Library $\rightarrow$ Setlist $\rightarrow$ Song | Global Library $\rightarrow$ Project (SSOT) |
| **Wyzwalanie PC OUT**                 | Wybór Patcha w UI / MIDI IN                   | Launch Klipu / Sceny        | Wybór Utworu / Partu                                    | Zmiana aktywnego projektu                   |
| **Mechanizm Defer / Tail**            | Defer Patch Change (dla Note-Off)             | Kwantyzacja Launchu Klipu   | Seamless Switch / Smooth Tail                           | Stop na Home (Brak audio tailing)           |
| **Obsługa Multi-Device**              | Multi External Instrument Strips              | Wiele ścieżek MIDI OUT      | Zaawansowana macierz urządzeń                           | Pojedyncza magistrala MIDI Host             |
| **Przekazywanie Nieobsługiwanych PC** | Pass-through do wtyczek                       | Brak (odrzucenie)           | Filtrowanie rekonfigurowalne                            | Ignorowanie braku dopasowania               |
| **Zarządzanie Numeracją**             | Ręczne lub Reset po kolei                     | Brak natywnego rejestru     | Auto-index lub Batch Renumber                           | Batch PC w Adminie + Schemat V5             |

---

## Architektura Domenowa StageSync v5 — Model Bindingu i Zgodność z SSOT

StageSync v5 nie jest budowany jako bezpośrednia kopia aplikacji MainStage. Jego celem jest realizacja stabilnego, deterministycznego podzbioru funkcjonalności określanego jako "Utwór $\rightarrow$ Program Change" . Zgodnie z zasadami określonymi w Granicy 0 (ADR 0002 oraz ADR 0005), wyłącznym, autorytatywnym źródłem prawdy (Single Source of Truth – SSOT) dla stanu aplikacji, aktywnego projektu oraz pozycji transportu jest proces serwera (`apps/server`) .

### Aksjomaty Granicy 0 a Subsystem MIDI

Subsystem MIDI jest ściśle podporządkowany niezmiennikom domeny :

- **Dyskretna Oś Czasu:** Pozycja transportu reprezentowana jest wyłącznie jako całkowitoliczbowa wartość ticków (`positionTicks` typu `integer`) przy stałej rozdzielczości `PPQ = 960` . Konwersje na ramki MIDI Clock (24 PPQN) oraz Song Position Pointer (SPP) zachodzą wyłączniel na krawędzi modułu transportu i I/O .
- **Punkt Odniesienia Formy (Takt 1):** Takt 1.1.000 odpowiada wartości `0 ticks` . Strefa odliczania (Countdown / Pre-roll) przybiera wartości ujemne ($\le 0$ ticks) . Zgodnie z wytycznymi ADR 0002, dla wartości ujemnych interfejsy MIDI OUT nie emitują ujemnych wartości SPP; wszelkie pozycje ujemne są mapowane na krawędzi I/O do wartości `0` .
- **Izolacja Plikowa:** Projekty przechowywane są w wyizolowanych katalogach `data/projects/<id>/` . Zmiana projektu wymaga asynchronicznej operacji dyskowej I/O realizowanej przez warstwę storage .

### Model Bindingu Utwór $\rightarrow$ Program Change

W StageSync v5 relacja pomiędzy utworem a identyfikatorem Program Change jest zaimplementowana w schemacie projektu (`ProjectSchemaV5`) oraz w rezerwacji indeksu biblioteki (`LibrarySchema`) . Każdy unikalny, wykonywalny utwór posiada pole `midiProgramId` w zakresie liczb całkowitych od 0 do 127 .

W strukturze bazy danych serwera (SSOT) globalna biblioteka przechowuje bezpośrednie powiązanie `Project.id` $\rightarrow$ `midiProgramId`. Każdy wpis projektu wskazuje na unikalny numer PC przeznaczony do jednokanałowego routingu wyjściowego. W przypadku wykrycia wpisu oznaczonego jako szablon (`isTemplate: true`), wartość `midiProgramId` jest automatycznie czyszczona (`undefined`), co całkowicie wyklucza szablon z dystrybucji komunikatów wyjściowych.

Szczegółowa charakterystyka przyjętego modelu bindingu obejmuje następujące zasady:

- **Pojedynczy Kanał Wyjściowy (Single PC Binding):** W obecnej fazie architektonicznej powiązanie dotyczy wyemitowania pojedynczej wartości Program Change (0–127) na skonfigurowanym wyjściowym kanale MIDI . Rozszerzenia o komunikaty Bank Select (CC 0 / CC 32) oraz profilowanie wielourządzeniowe (Multi-Device Routing) zostały sklasyfikowane jako rozwój w późniejszych wersjach.
- **Wykluczenie Szablonów (Template Scrubbing):** Projekty oznaczone jako wzorce (`isTemplate: true`) są bezwzględnie pozbawiane numeru `midiProgramId` . Podczas operacji importu lub tworzenia projektu z szablonu, parser schematu automatycznie czyści pole `midiProgramId` dla szablonu, aby nie powodować kolizji w bazowym rejestrze biblioteki .
- **Unikalność w BAZIE (SSOT Enforcement):** Serwer odpowiada za walidację przypisań numerycznych . Dwie pozycje w bibliotece nie powinny dzielić tego samego numeru PC, chociaż w przypadku konfliktu ręcznego wyszukiwanie zwraca pierwszą pasującą pozycję niewspółdzielącą statusu szablonu .

---

## Sekwencje Czasowe i Wyzwalanie Komunikatów (Execution Triggers)

Jednym z najważniejszych aspektów pracy w warunkach koncertowych jest precyzyjne określenie momentu, w którym komunikat Program Change trafia na fizyczną magistralę MIDI OUT. Wysłanie zbyt wczesne lub zbyt późne może doprowadzić do przełączenia efektu w trakcie trwania wybrzmiewającego utworu lub ucięcia pierwszego uderzenia (transjentu) audio nowej piosenki.

### Mechanizm Dystrybucji: On Project Load vs On Play vs On GO

W StageSync v5 wyzwalanie komunikatów PC OUT powiązane jest bezpośrednio ze zmianą aktywnego projektu w silniku transportu (`transport.onChange`) .

Proces rozpoczyna się w momencie nadejścia żądania przełączenia projektu z interfejsu klienta lub wejścia MIDI IN. Warstwa storage na serwerze inicjuje asynchroniczne wczytanie pliku JSON utworu z dysku. Po pomyślnym zaktualizowaniu aktywnego projektu w silniku transportu, wyzwalane jest natychmiastowe zdarzenie zmiany stanu, które natychmiast wysyła komunikat Program Change OUT na fizyczny port MIDI OUT. Zewnętrzny procesor efektów lub syntezator odbiera ramkę i rozpoczyna przeładowanie presetu (wymagające od 20 ms do 100 ms latencji sprzętowej). Silnik odtwarzacza audio pozostaje w tym czasie w stanie wstrzymania na pozycji początkowej (Tick 0) i oczekuje na komendę GO/Play, co gwarantuje pełną gotowość urządzeń wykonawczych przed rozpoczęciem strumieniowania audio.

Wszystkie scenariusze przełączania programów podlegają rygorystycznym regułom czasowym rozbieżnym w zależności od stanu odtwarzacza.

#### Załadowanie Utworu (Song Load / Project Switch)

W momencie gdy serwer dokonuje aktywacji nowego projektu (poprzez interfejs Admina, załadowanie z setlisty lub odebranie wejściowego komunikatu PC IN), silnik transportu zatrzymuje odtwarzanie i ustawia pozycję na `transportHomeTicks` (tick 0 lub start Countdown) .

Wymusza to natychmiastową asynchroniczną emisję wyjściowego komunikatu PC OUT do zewnętrznych urządzeń . Wycofanie silnika odtwarzacza do stanu wstrzymania (Stop/Home) daje podłączonym syntezatorom i procesorom efektów czas niezbędny do przeładowania próbek i konfiguracji pamięci operacyjnej przed wyzwoleniem odtwarzania .

#### Przejście do Odtwarzania (Play / GO Command)

W momencie naciśnięcia przycisku Play / GO, komunikat PC OUT **nie jest** ponownie emitowany, jeśli projekt nie uległ zmianie . Wyeliminowanie powtórnej emisji przy starcie audio zapobiega mikro-zawieszeniom procesorów DSP w zewnętrznych urządzeniach odbiorczych w momencie rozpoczynania streamingu ścieżek audio .

#### Tabela Sekwencji Czasowej: Zmiana Projektu i Start Transportu

W poniższej tabeli przedstawiono szczegółowy przebieg zdarzeń w czasie rzeczywistym ($t$) dla operacji przełączenia utworu z PC #12 na PC #13 i następującego po nim wyzwolenia odtwarzania z wliczonym czasem pre-roll.

| Czas ($t$)           | Źródło Zdarzenia              | Stan Silnika Transportu                 | Wysłany Komunikat MIDI               | Stan Urządzeń Odbiorczych (FX/Synth)   |
| :------------------- | :---------------------------- | :-------------------------------------- | :----------------------------------- | :------------------------------------- |
| $t = 0\text{ ms}$    | Komenda `loadProject(p2)`     | `playing: false`, `positionTicks: 0`    | Brak                                 | Aktywny Preset z utworu P1 (PC #12)    |
| $t = 2\text{ ms}$    | Transport Event `onChange`    | `activeProjectId: p2`                   | **MIDI OUT: PC #13** (Chan 1)        | Inicjalizacja zmiany presetu w DSP     |
| $t = 15\text{ ms}$   | Wynik I/O Storage             | Projekt P2 załadowany w RAM             | Brak                                 | Przetwarzanie ładowania próbek w FX    |
| $t = 50\text{ ms}$   | Bezczynność (Pre-Play)        | `playing: false`, `positionTicks: 0`    | Brak                                 | Ready (Preset PC #13 w pełni aktywny)  |
| $t = 1000\text{ ms}$ | Wyzwolenie Komendy `play()`   | `playing: true`, `positionTicks: -1920` | **MIDI Clock Start** + **SPP 0**     | Synchroniczny start wewnętrznych LFO   |
| $t = 2000\text{ ms}$ | Przejście Pre-roll do Taktu 1 | `playing: true`, `positionTicks: 0`     | **MIDI Clock Tick** (skalowanie PPQ) | Odtwarzanie właściwego materiału audio |

### Wyścig Stanów i Mechanizmy Kolejkowania (Debounce/Throttle)

W pierwotnej implementacji modułów [`program-change.ts`](../../../../../apps/server/src/midi/program-change.ts) oraz [`program-change-out.ts`](../../../../../apps/server/src/midi/program-change-out.ts) sterowanie przepływem opierało się na prostej fladze boolean `inFlight` . Audyt wykazał krytyczną podatność tej architektury na gwałtowne serie komunikatów .

Jeśli użytkownik wciśnie nożny sterownik MIDI dwukrotnie w odstępie np. 5 ms (zmiana z PC #3 na PC #4), pierwszy komunikat ustawia flagę `inFlight = true` i rozpoczyna asynchroniczne czytanie z dysku . Drugi komunikat trafia na podniesioną flagę i zostaje odrzucony bez powiadomienia . W konsekwencji na serwerze ładuje się projekt dla PC #3, mimo że intencją artysty było wywołanie PC #4 .

Do rozwiązania tego problemu służy opóźniający bufor z kolejkowaniem (_Debounce with Latest Retention_). Gdy ciąg przychodzących ramek PC IN (np. PC #3, PC #4, PC #5) napływa w krótkich odstępach czasu (np. 5 ms), każda nowa ramka resetuje timer okna opóźniającego ($T_{\text{debounce}} = 50\text{ ms}$). Dopiero po bezczynności trwającej pełne 50 ms system przekazuje do wykonania wyłącznie ostatnią zarejestrowaną wartość (PC #5), która inicjuje pojedynczy odczyt z dysku i aktualizację stanu. Zamiast natychmiastowego wyzwalania operacji I/O, przychodzący komunikat PC nadpisuje bufor oczekujący, przesuwając okno wykonania o stały interwał, co wyeliminowało zjawisko wyścigów i przeciążeń dyskowych .

---

## Odporność i Bezpieczeństwo Show (FOH Edge Cases & Failover)

Scena koncertowa stawia bezwzględne wymagania dotyczące niezawodności operacyjnej. Awaria któregokolwiek ze składników infrastruktury MIDI nie może doprowadzić do przerwania odtwarzania audio głównego systemu nagłośnieniowego FOH (Front of House).

### Katalog Scenariuszy Awaryjnych (FOH Edge Cases)

W poniższym rejestrze zgromadzono i unormowano kluczowe przypadki brzegowe zidentyfikowane podczas audytu subsystemu MIDI w StageSync v5. Każdemu scenariuszowi przypisano unikalny identyfikator formatu `PC-XX`.

#### PC-01: Podwójne Wyzwolenie Komunikatu (Double-Fire Protection)

- **Opis:** Sterownik nożny lub zewnętrzny sekwencer emituje powtórzony komunikat PC o tej samej wartości w krótkim interwale czasowym ($< 100\text{ ms}$).
- **Przyczyna:** Drganie styków przełącznika (hardware bounce) lub błędne zdarzenie w pętli routingowej sieci MIDI.
- **Mechanizm Ochrony StageSync:** Handler `createMidiProgramChangeHandler` sprawdza czy `transport.getActiveProjectId()` jest równe identyfikatorowi projektu przypisanemu do wywołanego numeru `program` . Jeśli projekt jest już aktywny, wywołanie jest ignorowane na poziomie pamięci RAM bez inicjowania I/O dyskowego i bez restartu transportu .

#### PC-02: Projekt bez Przypisanego Numeru PC (Song Without PC)

- **Opis:** Wyzwolenie przejścia do utworu, który posiada wartość `midiProgramId: null` lub `undefined` .
- **Przyczyna:** Utwór utworzony ręcznie bez uzupełnienia pola PC, lub utworzony z szablonu .
- **Mechanizm Ochrony StageSync:** Klasa `wireMidiProgramChangeOut` dokonuje weryfikacji warunkowej `if (project.midiProgramId == null) return;` . Magistrala wyjściowa nie emituje żadnej ramki, nie nadpisuje stanu ostatniego znanego presetu w procesorach zewnętrznych i nie zgłasza błędu w pętli transportu .

#### PC-03: Odłączenie Fizycznego Interfejsu MIDI (Offline Device / USB Disconnect)

- **Opis:** Urządzenie USB MIDI OUT zostaje odłączone fizycznie od serwera podczas trwania utworu lub w momencie zmiany projektu.
- **Mechanizm Ochrony StageSync:** Niskopoziomowe wywołanie zapisu I/O musi zostać otoczone blokiem ochronnym `safeSend` . W przypadku przechwycenia błędu zapisu do uchwytu portu, moduł rejestruje opis usterki w polu `status.lastError`, deaktywuje flagę `clockOutActive` i kontynuuje odtwarzanie ścieżek audio bez wywołania awarii procesu Node.js .

#### PC-04: Wyścig Zmiany Projektu względem Komendy Play (Order vs Audio Start)

- **Opis:** Otrzymanie komendy `play()` w trakcie trwania operacji asynchronicznego ładowania projektu z dysku (`inFlight = true`) .
- **Mechanizm Ochrony StageSync:** Silnik transportu wyzwala odtwarzanie wyłącznie dla w pełni załadowanego i zarejestrowanego w strukturze RAM projektu . Dopóki obietnica `stores.getProject()` nie zostanie rozwiązana, komenda `play()` odnosi się do dotychczasowego projektu lub zostaje wstrzymana do momentu osiągnięcia spójności struktury .

#### PC-05: Wymuszony Tryb Omni na Wejściu (Omni Channel Spill)

- **Opis:** Odbiór komunikatów PC IN nadawanych na kanałach 2–16 w środowisku ze wspólną magistralą MIDI.
- **Mechanizm Ochrony StageSync:** Moduł odbiorczy `MidiHost` musi weryfikować numer kanału zawarty w ramce nagłówkowej zdarzenia i odrzucać komunikaty niezgodne ze skonfigurowanym kanałem wejściowym `config.inputChannel` .

#### PC-06: Odebranie Komunikatu SPP Przekraczającego Długość Utworu

- **Opis:** Zewnętrzny sekwencer nadaje komunikat Song Position Pointer wskazujący na takt 999 w projekcie o długości 4 taktów.
- **Mechanizm Ochrony StageSync:** Przeliczenie pozycji `sppToTicks` podlega przycięciu (clamp) do maksymalnej wartości `endTicks` aktywnego projektu w silniku transportu, zapobiegając ustawieniu wskaźnika odtwarzania w nieokreślonym stanie domenowym .

#### PC-07: Przepełnienie Bufora Wejściowego (MIDI Flood / Rate Limit)

- **Opis:** Napływ ponad 100 komunikatów PC/SPP na sekundę wywołany pętlą sprzężenia na porcie wirtualnym.
- **Mechanizm Ochrony StageSync:** RateMeter w `MidiHost` zlicza częstotliwość ramek na sekundę (`pcPerSec`, `sppPerSec`) . Po przekroczeniu progu bezpieczeństwa (np. 50 msg/s) wyzwalane jest chwilowe odcięcie przetwarzania (rate-limit drop) chroniące pętlę zdarzeń Node.js.

#### PC-08: Zmiana Projektu w Stanie Odtwarzania (Mid-Play Project Switch)

- **Opis:** Odebranie komunikatu PC IN podczas gdy transport znajduje się w stanie `playing: true`.
- **Mechanizm Ochrony StageSync:** Handler przełączenia projektu bezwzględnie zatrzymuje transport (`transport.stop()`), sprowadza wskaźnik do pozycji home, a następnie ładuje nowy projekt . Zabronione jest przełączanie projektu "w locie" bez zatrzymania strumienia audio .

### Analiza Audytowych Hipotez Technicznych (RSK-MIDI)

W poniższej tabeli zestawiono zestawienie hipotez ryzyka zidentyfikowanych w audycie kodu źródłowego (`apps/server/src/midi/`) wraz z ich weryfikacją w odniesieniu do Granicy 0 .

| ID Audytu       | Opis Hipotezy                               | Kod / Miejsce                                                                        | Weryfikacja Techniczna i Stan                                                      | Plan Działań Naprawczych                                                          |
| :-------------- | :------------------------------------------ | :----------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **RSK-MIDI-01** | Odrzucanie PC IN przez `inFlight = true`    | [`program-change.ts`](../../../../../apps/server/src/midi/program-change.ts)         | **Potwierdzone.** Brak kolejkowania powoduje gubienie komend przy szybkiej serii . | Wdrożenie bufora opóźniającego z zatrzymaniem ostatniego wyniku (Debounce 50ms) . |
| **RSK-MIDI-02** | Wyścig flagi `inFlight` przy PC OUT         | [`program-change-out.ts`](../../../../../apps/server/src/midi/program-change-out.ts) | **Potwierdzone.** Szybka zmiana projektu może pominąć wysłanie PC OUT .            | Synchronizacja sekwencji zdarzeń z kolejką mikro-zadań transportu .               |
| **RSK-MIDI-03** | Jitter i dryf zegara z `setInterval`        | [`host.ts`](../../../../../apps/server/src/midi/host.ts) (`clockTimer`)              | **Potwierdzone.** `setInterval` narusza zasadę SSOT czasowego (ADR 0002) .         | Usunięcie timera; generowanie ramek `clock` z przyrostu ticków w `onTransport` .  |
| **RSK-MIDI-04** | Wymuszony tryb Omni na wejściu PC           | [`host.ts`](../../../../../apps/server/src/midi/host.ts) (`onInputMessage`)          | **Potwierdzone.** Odbiornik ignoruje numer kanału z ramek wejściowych .            | Dodanie pola `inputChannel` do konfiguracji i filtracja w `onInputMessage` .      |
| **RSK-MIDI-05** | Hardkodowany kanał 0 w `sendProgramChange`  | [`program-change-out.ts`](../../../../../apps/server/src/midi/program-change-out.ts) | **Potwierdzone.** Emisja zachodzi zawsze na Kanale 1 (index 0) .                   | Rozszerzenie konfiguracyjne o `outputChannel` w strukturze `MidiHostConfig` .     |
| **RSK-MIDI-06** | Awarie I/O zrywają proces serwera           | [`host.ts`](../../../../../apps/server/src/midi/host.ts) (`backend.send`)            | **Potwierdzone.** Odłączenie USB generuje nieprzechwycony wyjątek natywny .        | Otoczenie wywołań nadawczych funkcją pomocniczą `safeSend` z obsługą błędów .     |
| **RSK-MIDI-10** | Powielanie subskrypcji `transport.onChange` | [`host.ts`](../../../../../apps/server/src/midi/host.ts) (`applyPorts`)              | **Potwierdzone.** Ponowne wywołanie `setConfig` nie czyściło starych listenerów .  | Rejestracja pojedynczego, odnawialnego dławika subskrypcji w cyklu życia hosta .  |

---

## Zarządzanie Numeracją i Operacje Zbiorcze

W codziennej pracy ze skomplikowanymi listami utworów (setlistami) ręczne edytowanie numeru Program Change dla każdego utworu osobno jest procesem podatnym na błędy. StageSync v5 udostępnia dedykowany mechanizm zbiorczego redefiniowania numeracji (Admin Batch PC) zaimplementowany w warstwie serwera oraz interfejsie użytkownika .

### Izolacja Wzorców (Templates) i Konwencje Nazewnictwa

W procesie sortowania i przypisywania numerów PC kluczowe znaczenie ma separacja utworów wykonywalnych od szablonów . Wszystkie utwory wykonywalne (`isTemplate: false`) są rejestrowane w tabeli numeracji i otrzymują unikalny indeks z zakresu 0–127 . Wszelkie wzorce i szablony (`isTemplate: true`) są jawnie filtrowane i posiadają wartość `midiProgramId: undefined`, co uniemożliwia ich przypadkowe wywołanie za pośrednictwem zewnętrznego sterownika MIDI .

Zgodnie z wymaganiami schematu `ProjectSchemaV5`:

- **Szablony (`isTemplate: true`):** Bezpowrotnie tracą atrybut `midiProgramId` . Router biblioteki ([`library.ts`](../../../../../apps/server/src/routes/library.ts)) podczas operacji importu pakietu automatycznie wyczyszcza wartości numeryczne dla wszystkich pozycji stanowiących wzorce .
- **Utwory Wykonywalne:** Otrzymują wartości numeryczne z przedziału $[0, 127]$ . W przypadku próby przypisania wartości spoza zakreślonego przedziału, Zod Schema odrzuca żądanie na poziomie walidacji HTTP .

### Algorytm Batch Renumbering i Endpoint API

Operacja zbiorczego przemapowania numerów Program Change realizowana jest przez punkt końcowy `POST /api/library/batch-midi-pc` . Transakcja rozpoczyna się w panelu wywołaniem modala `BatchPcModal`. Interfejs wysyła żądanie HTTP z tablicą nowych przypisań. Router [`library.ts`](../../../../../apps/server/src/routes/library.ts) dokonuje walidacji struktury za pomocą parsera Zod (`BatchMidiPcBodySchema`). Po pomyślnej weryfikacji warstwa storage wykonuje metodę `batchMidiProgramIds`, która iteruje po plikach w bazie danych, ignoruje wpisy wzorcowe i zapisuje zaktualizowane wartości numeryczne. W odpowiedzi serwer zwraca zaktualizowaną strukturę biblioteki, co odświeża stan widoku u wszystkich podłączonych klientów.

Interfejs użytkownika w panelu Admina ([`AdminShell.tsx`](../../../../../apps/web/src/shells/admin/AdminShell.tsx)) udostępnia automatyczne przeliczenie sekwencyjne (_Renumber from Start_) . Użytkownik określa numer początkowy $PC_{\text{start}}$ (np. 0), po czym algorytm przypisuje kolejnym utworom z listy wartości $PC_{i} = PC_{\text{start}} + i$, z zachowaniem twardego ograniczenia górnego $\min(127, PC_{i})$ .

---

## Macierz Referencyjna Zachowań i Zakres Wdrożenia StageSync v5

W poniższej tabeli zgromadzono pełne zestawienie zachowań wzorcowych (zidentyfikowanych w systemach MainStage, Ableton Live, Gig Performer) oraz określono ich status wdrożeniowy w systemie StageSync v5 pod kątem spełnienia kryteriów wersji produkcyjnej.

Oznaczenia statusów:

- **`IN`**: Funkcjonalność wdrożona lub wymagana w bieżącym wydaniu (v5.0.0).
- **`LATER`**: Planowane rozszerzenie architektoniczne (wersje v5.x / Beta).
- **`OUT`**: Odrzucone jako niezgodne z aksjomatami Granicy 0 lub ADR 0008 .

| ID Zachowania | Opis Funkcjonalności Wzorcowej                                  | Źródło Referencyjne          | Realizacja w StageSync v5                                                                                                 | Status    |
| :------------ | :-------------------------------------------------------------- | :--------------------------- | :------------------------------------------------------------------------------------------------------------------------ | :-------- |
| **REF-PC-01** | Wyemitowanie wyjściowego PC przy zmianie projektu               | MainStage / Gig Performer    | Subskrypcja `transport.onChange` w [`program-change-out.ts`](../../../../../apps/server/src/midi/program-change-out.ts) . | **IN**    |
| **REF-PC-02** | Wywołanie ładowania projektu pod wpływem wejściowego PC         | MainStage / Live             | Handler `createMidiProgramChangeHandler` .                                                                                | **IN**    |
| **REF-PC-03** | Debounce i kolejkowanie przychodzących ramek PC IN              | Wzorce FOH / Show-Control    | Wdrożenie bufora opóźniającego 50ms z zatrzymaniem ostatniego stanu .                                                     | **IN**    |
| **REF-PC-04** | Zbiorcza renumeracja Program Change (Batch PC)                  | Gig Performer / Show-Control | Modal `BatchPcModal` oraz endpoint `POST /batch-midi-pc` .                                                                | **IN**    |
| **REF-PC-05** | Wykluczenie szablonów z numeracji PC                            | StageSync Domain Rules       | Czyśczenie `midiProgramId` dla `isTemplate: true` w [`library.ts`](../../../../../apps/server/src/routes/library.ts) .    | **IN**    |
| **REF-PC-06** | Reagowanie na przyciski MUTE ALL / Panic                        | MainStage / Hardware Mixers  | Funkcja `panic()` wysyłająca CC 120, 121, 123 po 16 kanałach .                                                            | **IN**    |
| **REF-PC-07** | Ochrona przed awariami I/O (USB unplug recovery)                | Native Hardware Failover     | Wdrożenie otoczki `safeSend` przechwytującej wyjątki zapisu do portu .                                                    | **IN**    |
| **REF-PC-08** | Generowanie MIDI Clock na podstawie ticków transportu           | ADR 0002 Timebase SSOT       | Emisja ramek zegara w oparciu o przyrost ticków silnika w `onTransport` .                                                 | **IN**    |
| **REF-PC-09** | Wyszukiwanie kanałowe dla komunikatów wejściowych PC            | MainStage Concert MIDI       | Filtracja kanału `inputChannel` w interfejsie `MidiHost` .                                                                | **IN**    |
| **REF-PC-10** | Dystrybucja komunikatów Bank Select (CC 0 / CC 32)              | MainStage / Ableton Live     | Rozszerzenie schematu projektu o pola `midiBankMsb` / `midiBankLsb`.                                                      | **LATER** |
| **REF-PC-11** | Routing do wielu fizycznych urządzeń wyjściowych (Multi-Device) | MainStage External Inst      | Macierz mapowania portów wyjściowych per urządzenie podrzędne.                                                            | **LATER** |
| **REF-PC-12** | Odraczanie zmiany patcha do Note-Off (Defer Patch Change)       | MainStage Defer              | N/A — StageSync zatrzymuje transport na Home przy zmianie projektu .                                                      | **OUT**   |
| **REF-PC-13** | Przepuszczanie nieobsługiwanych PC do wtyczek (Pass-through)    | MainStage Channel Strip      | Brak wtyczek VST/AU w procesie serwera StageSync.                                                                         | **OUT**   |
| **REF-PC-14** | Nagrywanie sekwencji MIDI IN na ścieżce Timeline                | Standardowy DAW / Ableton    | Jawnie wykluczone z zakresu architektury v5 (ADR 0008) .                                                                  | **OUT**   |
| **REF-PC-15** | Obrazowanie i edycja folderów ujęć (Take Folders)               | Logic Pro / MainStage        | Jawnie wykluczone z zakresu architektury v5 (ADR 0008) .                                                                  | **OUT**   |
| **REF-PC-16** | Niezależne wyjścia miksera Mixer Out 3–4 dla audio              | Pro Tools / Live             | Brak stubów i routingu dla dodatkowych sumatorów audio.                                                                   | **OUT**   |

---

## Rekomendacje Architektoniczne dla StageSync v5

W celu zapewnienia bezawaryjnej pracy systemu StageSync v5 w warunkach koncertowych oraz pełnego dostosowania subsystemu MIDI do niezmienników Granicy 0, wyznacza się następujące priorytety wdrożeniowe:

1. **Eliminacja Niezależnego Timera Zegara MIDI:**
   Należy bezwzględnie usunąć funkcję `setInterval` z modułu [`host.ts`](../../../../../apps/server/src/midi/host.ts) . Generowanie ramek `clock` musi odbywać się w sposób całkowicie pasywny, napędzany przyrostem ticków silnika transportu SSOT przekazywanym w zdarzeniu `onTransport` . Wyliczenie liczby ramek do wyemitowania zachodzi według wzoru:
   $\Delta \text{Clocks} = \left\lfloor \frac{\text{positionTicks}_{\text{aktualny}}}{40} \right\rfloor - \left\lfloor \frac{\text{positionTicks}_{\text{poprzedni}}}{40} \right\rfloor$
   Dzięki temu wyjściowy sygnał MIDI Clock pozostaje w 100% zsynchronizowany z pozycją odtwarzacza audio bez jakiegokolwiek dryfu czasowego czy jittera .

2. **Refaktoryzacja Handlera Program Change IN z Buforem Debounce:**
   W pliku [`program-change.ts`](../../../../../apps/server/src/midi/program-change.ts) należy zastąpić prostą flagę `inFlight` buforem opóźniającym ze stałą czasową $50\text{ ms}$ . Otrzymanie nowego komunikatu PC IN podczas odliczania opóźnienia kasuje poprzedni timer i rejestruje najnowszy numer programu, gwarantując, że serwer wykona tylko jedną operację I/O i załaduje właściwy utwór .

3. **Wdrożenie Bezpiecznego Interfejsu Zapisu `safeSend`:**
   Wszystkie operacje zapisu do natywnego backendu MIDI w klasie `MidiHost` muszą być realizowane przez otoczkę przechwytującą wyjątki I/O . Błędy wynikające z nagłego odłączenia kabla USB na scenie muszą być izolowane, zapisywane w stanie serwera (`lastError`) i nie mogą prowadzić do załamania procesu Node.js .

4. **Doprecyzowanie Filtracji Kanałowej i Konfiguracji:**
   Należy rozszerzyć schemat `MidiHostConfig` o pola `inputChannel` oraz `outputChannel` (z zakresem 0–15) . Odbiornik `onInputMessage` w klasie `MidiHost` musi odrzucać ramki nadawane na kanałach niezgodnych z konfiguracją, eliminując ryzyko przypadkowej zmiany utworu przez komunikaty przeznaczone dla innych syntezatorów pracujących w tej samej sieci .

---

Powered by [AI Exporter](https://saveai.net)

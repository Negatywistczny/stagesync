> From: https://gemini.google.com/app/86459c30f7d44226
>
> **Repo:** surowy dump — nie SSOT. Triage: [Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md](./Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md). Konwencje: [README](../README.md).

Audyt MIDI w StageSync v5

# Raport z Audytu Technicznego Subsystemu MIDI w StageSync v5

## Architektura Subsystemu MIDI i Zgodność z Zasadą SSOT

Subsystem MIDI w architekturze StageSync v5 odpowiada za dwukierunkową integrację silnika odtwarzania z fizycznymi i wirtualnymi urządzeniami zewnętrznymi, w tym realizację wywołań Program Change (PC) na wejściu i wyjściu, generowanie wyjściowego sygnału synchronicznego MIDI Clock oraz Song Position Pointer (SPP), a także obsługę zewnętrznych zdarzeń transportowych . Zgodnie z pryncypiami architektonicznymi ADR 0002, wyłącznym autorytatywnym źródłem prawdy (Single Source of Truth – SSOT) dla pozycji transportu, tempa oraz struktury metrycznej jest silnik odtwarzania działający w procesie serwera (`apps/server`) . Klient interfejsu użytkownika (`apps/web`) oraz magistrala MIDI stanowią wyłącznie konsumentów lub transponderów stanu i nie mogą pełnić roli autonomicznego zegara muzycznego .

Domenowa oś czasu w StageSync v5 opiera się na dyskretnej skali całkowitoliczbowych impulsów (ticks) przy stałej rozdzielczości PPQ (Pulses Per Quarter Note) równej 960 . Moduł pomocniczy `@stagesync/shared` realizuje konwersje matematyczne pomiędzy układem domenowym a standardowymi komunikatami MIDI w sposób całkowicie pozbawiony operacji wejścia/wyjścia oraz odwołań do zegarów systemowych . Przeliczenie rozdzielczości opiera się na stałej 24 PPQN (Pulses Per Quarter Note) dla wyjściowego sygnału MIDI Clock . Pojedynczy impuls MIDI Clock odpowiada dokładnie 40 tickom domenowym ($960 / 24 = 40$) . Komunikaty Song Position Pointer (SPP) reprezentują pozycję w jednostkach nut szesnastkowych, co oznacza, że jeden krok SPP odpowiada 6 impulsom MIDI Clock, czyli 240 tickom domenowym ($960 / 4 = 240$) .

| Parametr Osi Czasu              | Liczba Ticków Domenowych (PPQ = 960) | Odpowiednik w MIDI Clock | Odpowiednik w SPP (16-stki) |
| :------------------------------ | :----------------------------------- | :----------------------- | :-------------------------- |
| **Start Utworu (Takt 1.1.000)** | 0 ticks                              | Clock 0                  | SPP 0                       |
| **1/16 Nuty**                   | 240 ticks                            | Clock 6                  | SPP 1                       |
| **1/8 Nuty**                    | 480 ticks                            | Clock 12                 | SPP 2                       |
| **3/16 Nuty**                   | 720 ticks                            | Clock 18                 | SPP 3                       |
| **Ćwierćnuta (1/4 Nuta)**       | 960 ticks                            | Clock 24                 | SPP 4                       |

Pozycje w strefie pre-roll, w tym odliczanie Countdown przyjmujące wartości ujemne ($\le 0$), są sprowadzane przez algorytmy konwersji do wartości 0, ponieważ specyfikacja MIDI nie definiuje ujemnych wskaźników pozycji SPP . Zewnętrzny sygnał wejściowy MIDI Clock IN nie steruje bezpośrednio pętlą wykonawczą silnika transportu; służy jedynie do pomiaru częstotliwości w module `RateMeter` oraz wyznaczania granic uderzeń (Beat to WS) na potrzeby diagnostyki systemowej . Zdarzenia przełączenia stanu (Start, Continue, Stop, SPP) pochodzące z portu wejściowego MIDI modyfikują stan silnika poprzez wywołanie asynchronicznych metod `seek`, `play` oraz `pause`, zachowując pełną kontrolę serwera nad cyklem życia odtwarzania .

## Tabela Identyfikacji i Ocena Ryzyk (Risk Matrix)

| RISK-ID         | IN/OUT/clock | Mechanizm                                                                                                                          | Skutek na show                                                                                        | Pewność       | Sugerowany test brzegowy                                                                                |
| :-------------- | :----------- | :--------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- | :------------ | :------------------------------------------------------------------------------------------------------ |
| **RSK-MIDI-01** | IN           | Odrzucanie komunikatów wejściowych PC przez flagę `inFlight = true` podczas asynchronicznego odczytu biblioteki bez kolejkowania . | Brak reakcji na przełączenie utworu na sterowniku nożnym; zespół gra przy niewłaściwym projekcie .    | Wysoka (100%) | Wysłanie sekwencji 5 komunikatów PC w odstępie 2 ms podczas sztucznie opóźnionego odczytu z dysku .     |
| **RSK-MIDI-02** | OUT          | Wyścig flagi `inFlight` w `wireMidiProgramChangeOut` przy szybkiej serii zmian projektów .                                         | Brak wysłania PC do zewnętrznych procesorów efektów i syntezatorów po zmianie projektu .              | Wysoka (100%) | Wywołanie `transport.loadProject()` dwa razy z rzędu w odstępie 1 ms i kontrola magistrali wyjściowej . |
| **RSK-MIDI-03** | Clock        | Generowanie wyjściowego sygnału MIDI Clock za pomocą funkcji `setInterval` z pętli zdarzeń Node.js .                               | Jitter i dryf czasowy zewnętrznych sekwencerów oraz efektów delay względem ścieżek audio .            | Wysoka (100%) | Obciążenie procesora serwera i pomiar odchylenia interwałów czasowych ramek `clock` oscyloskopem MIDI . |
| **RSK-MIDI-04** | IN           | Odrzucanie numeru kanału MIDI w `onInputMessage` (wymuszony tryb Omni dla Program Change IN) .                                     | Przypadkowa zmiana utworu w StageSync wywołana komunikatami PC przeznaczonymi dla innego sprzętu .    | Wysoka (100%) | Wysyłanie komunikatów PC na kanałach 2–16 przy konfiguracji systemu na kanał 1 .                        |
| **RSK-MIDI-05** | OUT          | Hardkodowany kanał 0 (Kanał 1 MIDI) w metodzie `sendProgramChange` wywoływanej po zmianie projektu .                               | Brak przełączenia presetów w urządzeniach odbiorczych skonfigurowanych na kanały 2–16 .               | Wysoka (100%) | Weryfikacja nagłówka ramki `program` emitowanej po załadowaniu projektu z określonym `midiProgramId` .  |
| **RSK-MIDI-06** | Clock / OUT  | Brak przechwytywania wyjątku w wywołaniu `backend.send()` wewnątrz pętli zegarowej po odłączeniu USB .                             | Całkowity awaryjny spadek (crash) procesu serwera StageSync w trakcie trwania koncertu .              | Wysoka (100%) | Fizyczne lub programowe odłączenie portu wyjściowego USB w trakcie nadawania sygnału zegarowego .       |
| **RSK-MIDI-07** | IN           | Brak mechanizmu filtrowania częstotliwości (debounce / rate-limiting) dla komunikatów wejściowych PC i SPP .                       | Przeciążenie pętli zdarzeń Node.js oraz operacji dyskowych I/O, skutkujące zamrożeniem interfejsu .   | Wysoka (100%) | Przesłanie pętli 1000 komunikatów SPP i PC w ciągu 100 ms na port wejściowy .                           |
| **RSK-MIDI-08** | IN           | Wywoływanie `transport.seek()` na podstawie SPP bez weryfikacji zakresu długości aktywnego projektu .                              | Przesunięcie wskaźnika odtwarzania poza dozwolony obszar projektu i nieprawidłowy stan silnika .      | Średnia       | Wysłanie komunikatu SPP o wartości 16383 do projektu o długości 4 taktów i wywołanie `start` .          |
| **RSK-MIDI-09** | IN/OUT       | Rozbieżność w obsłudze błędów I/O między bezobsługowym backendem `mock` a natywnym `easymidi` .                                    | Testy integracyjne przechodzą pomyślnie, podczas gdy środowisko produkcyjne wyrzuca wyjątki natywne . | Wysoka (100%) | Uruchomienie suite testowego z zastąpieniem backendu `mock` natywnym backendem generującym błędy I/O .  |
| **RSK-MIDI-10** | Clock / IN   | Powielanie podpięć zdarzeń transportu `transport.onChange` przy ponownym wywoływaniu `setConfig` .                                 | Zwielokrotnienie liczby wysyłanych ramek MIDI Clock i zakleszczenie bufora nadawczego .               | Wysoka (100%) | Wielokrotne wywołanie `setConfig` podczas odtwarzania i zliczenie wyemitowanych komunikatów `start` .   |

## Analiza Mechanizmów Awarionogennych

### Przepływ Sterowania Program Change IN/OUT i Wyścigi Stanów

Realizacja przełączania projektów pod wpływem wejściowych komunikatów Program Change w module `createMidiProgramChangeHandler` opiera się na asynchronicznym odczycie struktury biblioteki z dysku oraz weryfikacji pola `midiProgramId` . Analiza przepływu sterowania wykazuje krytyczną podatność na wyścigi stanów (race conditions) wynikającą z zastosowania prostej flagi `inFlight` . W momencie odebrania komunikatu PC, system sprawdza stan flagi; jeśli operacja odczytu poprzedniego projektu trwa, nowy komunikat jest natychmiast i bezpowrotnie porzucany .

Sytuacja taka zachodzi, gdy muzyk na scenie wciśnie przycisk przełączenia utworu dwukrotnie w krótkim odstępie czasu (np. zmiana z PC #3 na PC #4 w ciągu 10 ms) . Pierwszy komunikat inicjuje operację I/O i ustawia stan `inFlight = true` . Drugi komunikat trafia na aktywną flagę, w efekcie czego system ignoruje intencję artysty i pozostaje przy projekcie przypisanym do PC #3 . Analogiczny problem występuje po stronie wyjściowej w funkcji `wireMidiProgramChangeOut`, gdzie flaga `inFlight` blokuje wysyłanie komunikatów PC OUT do zewnętrznych procesorów efektów przy szybkiej zmianie projektów w silniku odtwarzania .

Dodatkowo w module [`host.ts`](../../../../apps/server/src/midi/host.ts) występuje błąd filtracji kanałów MIDI . Mimo że natywny backend [`native-backend.ts`](../../../../apps/server/src/midi/native-backend.ts) poprawnie parsuje nagłówek ramki i wyciąga numer kanału (w zakresie 0–15), odbiornik zdarzeń `onInputMessage` w `MidiHost` odrzuca tę informację i przekazuje do handlera wyłącznie sam numer programu . W konsekwencji subsystem MIDI funkcjonuje w wymuszonym trybie Omni, reagując na komunikaty PC nadawane na dowolnym z 16 kanałów MIDI . Dowolne urządzenie wpięte do wspólnej magistrali, wysyłające komunikat zmiana programu przeznaczony dla innego syntezatora, wywoła niepożądaną zmianę aktywnego projektu w StageSync .

### Dynamika Zegara, Dryf Czasowy i Egzekwowanie Zasady SSOT

Generowanie wyjściowego sygnału synchronicznego MIDI Clock w StageSync v5 zostało zaimplementowane w klasie `MidiHost` z wykorzystaniem standardowego timera `setInterval` ze środowiska Node.js . Takie podejście architektoniczne tworzy bezpośrednią sprzeczność z wytycznymi ADR 0002 dotyczącymi spójności osi czasu (Timebase SSOT) .

Ze względu na specyfikę architektury pętli zdarzeń (Event Loop) w Node.js, timer `setInterval` nie gwarantuje stałego interwału wykonania . W warunkach obciążenia procesora operacjami renderowania interfejsu lub odczytu plików audio, jitter timera sięga od kilku do kilkunastu milisekund . Przy tempie 120 BPM nominalny interwał pomiędzy impulsami MIDI Clock wynosi $20,833\text{ ms}$ . Odchylenia w wykonaniu funkcji timera powodują słyszalne pływanie tempa (tempo flutter) w zewnętrznych urządzeniach podrzędnych .

Co więcej, timer `setInterval` działa w sposób całkowicie odsepreowany od dyskretnego licznika ticków silnika transportu . Jeżeli silnik odtwarzania dokona korekty pozycji lub wstrzymania bufora, zegar wyjściowy MIDI nadal emituje impulsy w stałym rytmie timera systemowego, doprowadzając do nieodwracalnej utraty synchronizacji fazowej . Dodatkowo obliczanie interwału w `midiClockIntervalMs` zwraca wartości zmiennoprzecinkowe, które przy przekazaniu do `setInterval` są zaokrąglane do pełnych milisekund, co wprowadza stały, skumulowany błąd częstotliwości .

W przypadku sygnałów wejściowych, komunikaty `start`, `continue` oraz `spp` wywołują bezpośrednie operacje na silniku transportu za pośrednictwem metod `transport.seek()` oraz `transport.play()` . Odbiornik komunikatów przelicza wartość SPP na ticki domenowe bez weryfikacji granicy długości załadowanego projektu . Przyjęcie wartości SPP wykraczającej poza zakres zarejestrowanych taktowizji powoduje ustawienie wskaźnika odtwarzania w nieokreślonym stanie, co narusza zasadę spójności transportu .

### Cykl Życia Zasobów, Odporność na Awarię Sprzętu i Różnice Backendów

Natywny backend MIDI ([`native-backend.ts`](../../../../apps/server/src/midi/native-backend.ts)) wykorzystuje moduł `@julusian/midi` (`easymidi`), stanowiący nakładkę na natywną bibliotekę C++ RtMidi . Analiza kodu wykazała brak obsługi błędów wyjścia wewnątrz pętli zegarowej . W momencie gdy urządzenie MIDI OUT zostanie fizycznie odłączone od magistrali USB podczas trwania koncertu, wywołanie `backend.send({ type: "clock" })` wewnątrz `setInterval` zgłasza błąd I/O na poziomie natywnym . Ponieważ wywołanie to nie jest otoczone blokiem przechwytującym wyjątki, nieobsłużony błąd asynchroniczny powoduje natychmiastowe załamanie i zamknięcie całego procesu Node.js serwera .

Testowy backend `mock` ([`backend.ts`](../../../../apps/server/src/midi/backend.ts)) wykazuje pod tym względem fundamentalną rozbieżność zachowania . Metody `send` w środowisku testowym nie wykonują żadnych operacji I/O i nie zgłaszają błędów w przypadku niepoprawnych stanów portów . Tworzy to fałszywe poczucie stabilności w testach jednostkowych, maskując krytyczne błędy wykonawcze środowiska produkcyjnego .

Dodatkowo przy ponownej konfiguracji połączeń za pomocą `setConfig`, metoda `applyPorts` zamyka i otwiera porty na nowo, jednak subskrypcja zdarzeń transportu `transport.onChange(onTransport)` zarejestrowana w konstruktorze `createMidiHost` pozostaje aktywna . W przypadku utraty referencji lub wielokrotnego powoływania instancji pomocniczych, stara subskrypcja nie zostaje usunięta, co prowadzi do zwielokrotnienia wywołań zdarzeń nadawczych i zablokowania bufora wyjściowego magistrali MIDI .

## Strategie Naprawcze i Rekomendacje Architektoniczne

W celu usunięcia zidentyfikowanych ryzyk oraz bezwzględnego zagwarantowania spójności z zasadą SSOT serwera, należy wprowadzić następujące modyfikacje w strukturze kodu:

Zamiast porzucania komunikatów wejściowych przy aktywnej fladze `inFlight`, moduł obsługi Program Change IN musi zostać wyposażony w bufor opóźniający (debounce) z kolejkowaniem najnowszego stanu . Zamiast natychmiastowego wyzwalania odczytu z dysku, przychodzący komunikat PC nadpisuje wartość oczekującą w buforze o krótkim oknie czasowym (np. 50 ms). Po upływie tego czasu system wykonuje tylko jedną, ostateczną operację ładowania projektu z bazy danych, elimując wyścigi stanów oraz przeciążenie dyskowe I/O .

W celu wyeliminowania dryfu czasowego oraz niestabilności interwałów, należy całkowicie usunąć timer `setInterval` z wyjściowej obsługi zegara MIDI . Wysyłanie ramek `clock` musi zostać włączone bezpośrednio w pętlę zdarzeń `onTransport` silnika odtwarzania . Wyliczenie liczby wyemitowanych ramek zegarowych następuje na podstawie przyrostu pozycji domenowej:

$\Delta \text{Clocks} = \left\lfloor \frac{\text{positionTicks}_{\text{aktualny}}}{40} \right\rfloor - \left\lfloor \frac{\text{positionTicks}_{\text{poprzedni}}}{40} \right\rfloor$

Gdy $\Delta \text{Clocks} > 0$, system emituje na port wyjściowy dokładnie wyliczoną liczbę ramek `clock` . Zapewnia to bezwzględną, 100% spójność wyjściowego zegara MIDI z pozycją silnika transportu SSOT bez względu na obciążenie procesora .

Należy rozszerzyć schemat konfiguracyjny `MidiHostConfig` o jawne definicje kanałów wejściowych i wyjściowych . W klasie `MidiHost` należy wdrożyć weryfikację kanału przed przekazaniem komunikatu do handlera `onProgramChange`, dopuszczając do przetwarzania wyłącznie ramki zgodne z wybranym kanałem lub jawnie skonfigurowanym trybem Omni .

Wszystkie interakcje z backendem nadawczym w `MidiHost` muszą odbywać się za pośrednictwem bezpiecznej metody pomocniczej `safeSend`, która przechwytuje ewentualne wyjątki natywne, zapisuje opis awarii w polu `lastError` statusu oraz w sposób kontrolowany zatrzymuje nadawanie sygnału zegarowego bez zburzenia procesu serwera .

## Specyfikacja Zestawu Testów Brzegowych

### Test 1: Kolejkowanie i Debounce Komunikatów Program Change IN

Test weryfikuje odporność systemu na gwałtowną serię komunikatów PC IN . Do handlera przekazywana jest sekwencja komunikatów PC #1, PC #2 oraz PC #3 wysłanych w odstępach 5 ms w trakcie symulowanego opóźnienia I/O wynoszącego 100 ms . Test sprawdza, czy po zakończeniu operacji asynchronicznych silnik transportu załadował wyłącznie projekt przypisany do PC #3 oraz czy nie doszło do niepotrzebnych wielokrotnych odczytów bazy danych .

### Test 2: Odporność na Fizyczne Disconnect Urządzenia Wyjściowego

Test sprawdza zachowanie procesu serwera w przypadku utraty połączenia z interfejsem USB podczas nadawania zegara . Podczas aktywnego odtwarzania i generowania wyjściowego sygnału MIDI Clock, na poziomie backendu wyzwalany jest natywny błąd zapisu do portu . Test weryfikuje, czy proces serwera kontynuuje działanie, flaga `clockOutActive` przyjmuje wartość `false`, a stan błędu zostaje odnotowany w strukturze statusu serwera .

### Test 3: Weryfikacja Filtracji Kanałów MIDI dla Program Change IN

Test weryfikuje poprawność ignorowania komunikatów nakierowanych na inne kanały MIDI . Przy konfiguracji wejściowej ustawionej na Kanał 1 (indeks 0), do systemu przesyłana jest ramka Program Change nadana na Kanale 5 . Test potwierdza, że funkcja ładowania projektów nie została wywołana, a stan aktywnego utworu pozostał nienaruszonony .

### Test 4: Przeliczanie Wartości Brzegowych SPP i Pre-roll

Test weryfikuje matematyczną poprawność konwersji pozycji w skrajnych punktach osi czasu . Sprawdzane jest przeliczanie ujemnych wartości ticków (odliczanie pre-roll), dla których funkcja `ticksToSpp` musi zwrócić dokładnie wartość 0 . Następnie test przekazuje maksymalną dopuszczalną wartość SPP (16383) i weryfikuje czy konwersja `sppToTicks` nie wywołuje przekroczenia zakreślonych granic typów danych .

## Wnioski i Rekomendacje Wdrożeniowe

Subsystem MIDI w StageSync v5 posiada właściwie zdefiniowany fundament architektoniczny zgodny z normą ADR 0002, wyznaczający serwer jako jedyne źródło prawdy dla pozycji i czasu odtwarzania . Wdrożenie produkcyjne wymaga jednak pilnej likwidacji luki odpornościowej w obsłudze zdarzeń I/O oraz zmiany mechanizmu wyjściowego zegara MIDI Clock z niezależnego timera `setInterval` na model napędzany przyrostem ticków silnika transportu SSOT . Wdrożenie zalecanych poprawek oraz zestawu testów brzegowych zabezpieczy system przed awariami na scenie i zagwarantuje bezkompromisową stabilność czasową wymaganą w profesjonalnych zastosowaniach koncertowych.

> From: https://gemini.google.com/app/5230369d06d7744e

Specyfikacja Safety Net StageSync

# Specyfikacja Techniczna Safety Net (Master/Slave Failover) dla StageSync v5.2+ (#437)

## Kontekst Architektoniczny i Założenia Niezawodnościowe

Architektura StageSync v5 opiera się na zasadzie jednego autorytatywnego serwera będącego Jedynym Źródłem Prawdy (SSOT — *Single Source of Truth*) dla zegara muzycznego, stanu transportu, konfiguracji MIDI oraz struktury projektu . Warstwa kliencka w aplikacji desktopowej stanowi cienką powłokę interfejsu (thin-shell w technologii Tauri), która uruchamia lokalny proces pomocniczy Node.js (sidecar) lub łączy się bezpośrednio przez sieć z serwerem zdalnym wybranym w Launcherze .

Wymagania dotyczące niezawodności w środowisku koncertowym (*live-show*) wykluczają stosowanie uproszczonych koncepcji znanych ze środowisk chmurowych. Rzeczywiste rygory estrady — gdzie błąd oznacza nagłe zatrzymanie odtwarzania ścieżek, podwójne wyzwolenie komunikatów *Program Change* na syntezatorach lub rozsynchronizowanie światła i wideo — wymagają bezwzględnej deterministyki. Zgodnie z decyzjami architektonicznymi i wynikami audytów cyklu życia (issue #437), mechanizm rezerwowy *Safety Net* został świadomie odłożony do linii v5.2+ . System wyklucza składanie fałszywych obietnic pełnej, przezroczystej wysokiej dostępności (*Zero-Glitch Seamless HA*), zabrania tworzenia atrap interfejsu (*UI stubs*) oraz uniemożliwia realizację pętli audio/MIDI bezpośrednio w procesie okna natywnego Rust/Tauri .

Wzorując się na sprawdzonych rozwiązaniach z branży nadawczej oraz tradycyjnych systemach odtwarzania redundantnego (takich jak konfiguracyjne pakiety podwójnych maszyn QLab, redundantne systemy odtwarzaczy wycieczkowych czy koncepcje *Hot Spare* w konsoletach cyfrowych i programach DAW), niniejszy dokument definiuje oficjalną specyfikację techniczną systemu *Safety Net* dla StageSync v5.2+.

---

## A) Definicja Ról i Autorytetu (Master vs Spare/Slave)

Prawidłowa funkcja układu nadmiarowego wymaga rygorystycznego podziału odpowiedzialności pomiędzy instancją aktywną a instancją rezerwową. Niejednoznaczność w zakresie tego, który węzeł zarządza zegarem, prowadzi bezpośrednio do katastrofalnych usterek na scenie.

**SN-01: Rola Master (Active SSOT)**  
Węzeł pełniący rolę *Master* stanowi jedyny autorytatywny punkt wykonawczy w sieci estradowej . Instancja ta przechowuje wyłączną blokadę zapisu na plikach projektu w katalogu roboczym `~/Documents/StageSync` , uruchamia silnik transportu `TransportEngine` , generuje stempel czasowy dla klientów WebSocket oraz inicjuje wychodzące ruchy MIDI (w tym sygnał *MIDI Clock* oraz komunikaty *Program Change*) . Serwer *Master* rozgłasza swoją obecność w sieci LAN przy użyciu usługi mDNS (`_stagesync._tcp`) z flagą statusu `role=master` .

**SN-02: Rola Spare/Slave (Hot Standby / Read-Only Mirror)**  
Węzeł w trybie *Spare* działa jako pasywny lustrzany podgląd stanu (*Read-Only Mirror*). Serwer ten posiada wczytany ten sam projekt oraz setlistę, lecz jego wewnętrzny silnik transportu pozostaje całkowicie zablokowany w stanie pasywnym (`PASSIVE_MIRROR`) . Pasywna instancja odbiera strumień zdarzeń z serwera *Master* za pośrednictwem połączenia WebSocket, utrzymując lokalną pamięć podręczną w gotowości do natychmiastowego przejęcia zadań.

**SN-03: Stan Zegara i Transportu na Węźle Spare**  
Węzeł *Spare* nie odtwarza lokalnie własnego zegara transportu w sposób równoległy. Wykonywanie niezależnego odliczania ticków na dwóch maszynach prowadzi do dryfu fazowego i rozsynchronizowania w przypadku awarii sieci. Stan silnika transportu na węźle *Spare* jest podążającym wskaźnikiem pozycji reprezentowanym wyłącznie na potrzeby lokalnego interfejsu użytkownika. Interfejsy sprzętowe MIDI I/O na serwerze *Spare* są programowo odłączone w warstwie sterownika `MidiHost` .

| Cechy Systemowe | Węzeł Master (Active SSOT) | Węzeł Spare/Slave (Hot Standby) |
| :--- | :--- | :--- |
| **Uprawnienia Danych (FS)** | Pełny odczyt i zapis (`~/Documents/StageSync`)  | Tylko do odczytu / Odbiór repliki pasywnej |
| **Silnik Transportu** | Aktywny, autorytatywny zegar `TransportEngine`  | Zablokowany (odbiera powiadomienia WS) |
| **Wyjścia MIDI (Clock / PC)** | Aktywne porty sprzętowe I/O  | Wyłączone na poziomie sterownika `MidiHost`  |
| **Rozgłaszanie mDNS** | Rekord `_stagesync._tcp` (`role=master`)  | Rekord `_stagesync._tcp` (`role=spare`)  |
| **Obsługa Klientów (Client/Stage)** | Zezwala na pełną interakcję i sterowanie  | Przekierowuje zapisy HTTP/WS do Mastera |

---

## B) Macierz Detekcji Awarii i Triggerów Failover

Detekcja awarii w środowisku live musi unikać decyzji niejednoznacznych. Zbyt krótki czas detekcji wywołuje fałszywe przełączenia (np. przy chwilowym obciążeniu sieci Wi-Fi), natomiast czas zbyt długi powoduje słyszalną pauzę na scenie.

**SN-04: Triggery Przełączenia Awaryjnego**  
System Safety Net rozpoznaje trzy rozłączne kaskady zdarzeń kwalifikujące sytuację jako awarię wymagającą procedury rezerwowej:
1. **Śmierć Procesu Hosta Master (*Host Death*):** Nagłe zakończenie procesu sidecar, awaria zasilania komputera głównego lub zdarzenie wywołane przez system operacyjny (`kill -9`, wyjątek kernel panic) .
2. **Utrata Łączności Sieciowej (*WS Connection Loss*):** Zrywanie gniazda WebSocket połączone z niepowodzeniem prób ponownego nawiązania połączenia według algorytmu wykładniczego .
3. **Inicjatywa Operatorska (*Manual Takeover*):** Świadome wciśnięcie przycisku "Przejmij autorytet" przez realizatora w okienku Launchera aplikacji desktopowej .

**SN-05: Progi Czasowe i Limity Detekcji**  
Konfiguracja limitów czasowych została dopasowana do architektonicznych stymulatorów pętli sieciowej StageSync v5 :
* **Pętla Heartbeat (Serwer ↔ Klient):** Sygnał impulsowy wysyłany co 1000 ms.
* **Przekroczenie Progu Heartbeat (*Heartbeat Timeout*):** Brak odpowiedzi przez 3000 ms klasyfikuje połączenie jako zerwane.
* **Szybka Sonda Zdrowia (*Health Probe Timeout*):** Twardy timeout zapytania HTTP `GET /api/health` wynosi dokładnie 3000 ms .
* **Próbnik Ostatnio Używanych Hostów (*Recent Host Probe*):** Pasywne sprawdzanie obecności w tle z ograniczeniem do 1500 ms .
* **Pętla Rekonstrukcji WebSocket (*WS Reconnect Backoff*):** Początek od 1000 ms z rosnącym wskaźnikiem potęgowym i szumem (*jitter*) ±200 ms, zatrzymujący się na maksymalnej wartości 10 000 ms .

| Typ Awarii | Mechanizm Detekcji | Próg Czasowy | Działanie Aplikacji / Launchera | Nowy Stan Systemu |
| :--- | :--- | :--- | :--- | :--- |
| **Crash sidecara Mastera** | Awaria procesu, zamknięcie gniazda IPC w Rust  | Natychmiastowy (< 100 ms) | Launcher wychwytuje `Terminated`, przechodzi do widoku błędu  | Wymaga ręcznej akcji lub promocji Spare |
| **Zanik zasilania Mastera** | Brak pakietów Ping WS + niepowodzenie `GET /api/health`  | 3000 ms (Heartbeat) + 3000 ms (Probe)  | Wyświetlenie banera "Utracono połączenie", powrót do Launchera  | Oferowanie przycisku "Promuj ten host do Master" |
| **Odłączenie kabla LAN** | Błąd warstwy fizycznej (Socket Closed / Unreachable)  | < 500 ms (OS TCP Event) | Przejście gniazda w tryb ponawiania backoff (1s→2s→4s)  | Zablokowanie edycji w UI do czasu przywrócenia |
| **Ręczne Przejęcie (Manual)** | Zdarzenie użytkownika: kliknięcie w interfejsie Launchera  | Immediate (0 ms) | Wysłanie komendy wywłaszczenia `POST /api/system/promote` | Węzeł Spare staje się autorytatywnym Masterem |

**SN-06: Procedura Przełączenia Awaryjnego (Failover Execution Workflow)**  
Gdy węzeł *Spare* wykryje awarię serwera *Master* lub operator wyzwoli procedurę przejęcia, wykonywana jest sekwencyjna pętla bezpiecznego awansu:
1. **Zablokowanie Odbioru WS:** Przerwanie podążania za zdalnym zegarem Mastera.
2. **Przełączenie Poziomu Danych:** Otwarcie lokalnego katalogu roboczego `~/Documents/StageSync` w trybie do zapisu .
3. **Aktywacja Silnika Transportu:** Inicjalizacja lokalnego instancjonowania `TransportEngine` na zarejestrowanym stanie (ostatni zapamiętany tick / pozycja utworu) .
4. **Odbezpieczenie Sterowników MIDI:** Aktywacja portów wyjściowych MIDI w module `MidiHost` .
5. **Zmiana Tożsamości mDNS:** Aktualizacja wpisu w usłudze mDNS z `role=spare` na `role=master` .

---

## C) Zakres Synchronizacji i Stanu (Data Synchronization Matrix)

Wyznaczenie granicy pomiędzy stanem synchronizowanym a stanem lokalnym jest warunkiem bezawaryjnego przełączenia. Próba synchronizacji parametrów niskopoziomowych (np. buforów audio) generuje niestabilność, podczas gdy brak synchronizacji konfiguracji MIDI uniemożliwia kontynuację show.

**SN-07: Obiekty Podlegające Synchronizacji**  
Węzeł *Spare* musi posiadać identyczną strukturę danych do węzła *Master*. Synchronizacja odbywa się poprzez ciągły nasłuch zmian na gnieździe WebSocket lub współdzielony zasób dyskowy:
* **Pliki Projektu (`*.json`):** Definicje utworów, sekcji, markerów, metrum i tempa umieszczone w folderze roboczym `~/Documents/StageSync` .
* **Kolejność Setlisty (`setlist.json`):** Aktualny układ utworów oraz flagi automatycznego przechodzenia między utworami (*auto-advance*) .
* **Konfiguracja Routingu MIDI (`midi.json`):** Mapowania portów wyjściowych, mapy komunikatów *Program Change* oraz filtry kanałów .
* **Pamięć Live Desk (`live-desk.json`):** Stan tymczasowych suwaków oraz nadpisań w scenariuszu technicznym .

**SN-08: Wykluczenia ze Synchronizacji (Lokalny Stan Węzła)**  
Zsynchronizowanie poniższych zasobów jest zabronione ze względu na możliwość wystąpienia pętli sprzężeń lub unieważnienia uchwytów systemowych:
* **Kontekst Audio (`AudioContext` / WebAudio State):** Węzeł *Spare* tworzy własny, niezależny silnik audio zmodyfikowany pod kątem lokalnej karty dźwiękowej komputera zapasowego.
* **Identyfikatory Połączeń Klientów i Presence:** Tabele `ClientPresence` rejestrujące adresy IP i unikalne gniazda dołączonych przeglądarek .
* **Bufor Logów Procesu (`LogBuffer`):** Dzienniki zdarzeń serwera są unikalne dla danej instancji i środowiska uruchomieniowego .
* **Ścieżki i Pomiary Urządzeń Podłączonych:** Konkretne uchwyty portów USB-MIDI / kart audio wybrane w danej maszynie.

| Obiekt Danych | Kategoria | Mechanizm Replikacji | Wpływ na Przełączenie Failover |
| :--- | :--- | :--- | :--- |
| **Plik Projektu (`.json`)** | Synchronizowany | Zapis na dysk Master + Emisja WS → Zapis na dysk Spare | Kluczowy: Spare posiada gotowy projekt do odtworzenia |
| **Kolejność Setlisty** | Synchronizowany | Event `publishSetlistHubFromStores` za pośrednictwem WS  | Kluczowy: Zapewnia właściwy utwór po awansie |
| **Konfiguracja MIDI Host** | Synchronizowany | Zapis w `midiConfigFile`  | Wysoki: Wymaga obecności tych samych interfejsów MIDI |
| **Baza Live Desk** | Synchronizowany | Replikacja zmian stanu `LiveDeskStore`  | Średni: Zachowuje stan wyciszeń i ustawień realizatora |
| **WebAudio AudioContext** | LOKALNY (Wykluczony) | Brak (Inicjalizacja lokalna w przeglądarce / shellu) | Brak: Każdy komputer przetwarza dźwięk niezależnie |
| **Tabela Obecności Presence** | LOKALNY (Wykluczony) | Przeliczana dynamicznie przez `createClientPresence`  | Brak: Klienci przełączają się i re-rejestrują po awarii |

---

## D) Analiza Ryzyk Live-Show i Mitygacje

Topologia sieciowa redundantnego zestawu estradowego opiera się na wspólnym segmencie LAN z rozgłaszaniem mDNS, łączącym aktywny węzeł Master, węzeł pasywny Spare oraz ewentualne końcówki klienckie. Izolacja sprzętowo-logiczna w takim środowisku wymaga rygorystycznego zarządzania uprawnieniami zapisu oraz sterownikami I/O, aby zapobiec kolizjom w warstwie transmisji cyfrowej.

**SN-09: Ryzyko Split-Brain (Podwójny Autorytet)**  
Najgroźniejszym stanem systemu jest sytuacja, w której w wyniku niestabilności sieci LAN zarówno serwer główny, jak i zapasowy uznają się za jedyny autorytatywny węzeł *Master*. W konsekwencji oba systemy zaczynają modyfikować pliki i wysyłać sygnały sterujące.
* **Mitygacja:** Wdrożenie fizycznej/logicznej blokady dzierżawy (*Lease Token*). Węzeł *Spare* pod żadnym pozorem nie przejmuje roli *Master* w sposób automatyczny, jeśli wykrywa w sieci aktywne pakiety mDNS od węzła *Master*. Wywłaszczenie roli wymaga jawnego sygnału lub unieważnienia cyfrowego tokena dzierżawy w pliku `master.lock`.

**SN-10: Podwójny Sygnał MIDI Clock oraz Program Change OUT**  
W przypadku braku wyizolowania portów wyjściowych, dwa komputery podłączone do tej samej magistrali MIDI (np. przez scalacz MIDI lub dwa interfejsy USB podpięte do syntezatorów) będą nadawać jednocześnie dublujące się komunikaty. Powoduje to nakładanie się zegarów BPM, jitter oraz ciągłe przełączanie brzmień na instrumentach.
* **Mitygacja:** Moduł `createMidiHost` w `apps/server` posiada twardy warunek sprawdzający flagę `isMaster` przed wysłaniem jakiegokolwiek bajtu do fizycznego sterownika . Na węźle *Spare* funkcja wyjściowa `wireMidiProgramChangeOut` działa w trybie "no-op" (zniechęcenie wykonania) .

**SN-11: Dwa Węzły Master w Sieci LAN (Konflikt Konfiguracyjny)**  
Sytuacja, w której operator uruchamia lokalny host na nowym komputerze, gdy w sieci działa już inny serwer StageSync pełniący rolę głównego zegara .
* **Mitygacja:** Podczas skanowania mDNS Launcher wykrywa obecność innego hosta rozgłaszającego `role=master` . Próba uruchomienia lokalnego hosta wyświetla ostrzeżenie w interfejsie użytkownika z prośbą o wybór: uruchomienie w trybie podglądu (*Spare Mirror*) lub wymuszenie przejęcia autorytetu po uprzednim odłączeniu poprzedniego hosta .

| Identyfikator Ryzyka | Opis Sytuacji Awaryjnej | Krytyczność | Mitygacja Logiczno-Sprzętowa |
| :--- | :--- | :--- | :--- |
| **RSK-NET-01** | **Split-Brain:** Przekroczenie timeoutu sieciowego przy nadal działającym Masterze | KRYTYCZNA | Wymóg obecności tokena dzierżawy (*Lease Token*); zakaz automatycznej promocji bez braku odpowiedzi na poziomie L2/L7 |
| **RSK-MIDI-01** | **Podwójny MIDI Clock:** Dwa serwery wysyłają bajty komendy `0xF8` do syntezatorów | KRYTYCZNA | Zablokowanie otwierania portów MIDI na poziomie `createMidiHost` w węźle *Spare*  |
| **RSK-DATA-01** | **Nadpisanie Projektu:** Węzeł *Spare* wysyła stary stan projektu do zaktualizowanego Mastera | WYSKA | Dysk na węźle *Spare* działa w trybie wyłącznie do odczytu (*Read-Only*) do momentu promocji |
| **RSK-DESK-01** | **Brak Dostępności Portu 4000:** Port zapasowego hosta jest zajęty przez obcy proces | WYSKA | Zastosowanie mechanizmu czytelnych błędów Launchera i czyszczenia osieroconych procesów  |

---

## E) Strategia Wdrożenia: MVP 5.2 vs Fazy Późniejsze

Zgodnie z polityką unikania niedokończonych funkcjonalności (*UI stubs*) i zachowania pełnej spójności operacyjnej, mechanizm Safety Net został podzielony na etap MVP w linii 5.2 oraz zaawansowane rozszerzenia w kolejnych wersjach minor .

**SN-12: Zakres MVP dla Wydania StageSync v5.2**  
Pierwsza iteracja funkcjonalności skupia się na niezawodności operacyjnej i eliminacji błędów ludzkich, bez wprowadzania niepotrzebnej złożoności automatycznego głosowania:
* **Ręczna Promocja Węzła (*Manual Promote*):** Dedykowany przycisk w Launcherze aplikacji desktopowej pozwalający operatorowi na przełączenie hosta z trybu *Spare* do *Master* .
* **Udostępniony Katalog Danych (*Shared Data Directory*):** Obsługa trybu, w którym lokalny sidecar węzła *Spare* korzysta ze wspólnego udziału sieciowego (np. NFS/SMB lub zsynchronizowanego folderu lokalnego) w trybie tylko do odczytu .
* **Jawne Blokady MIDI:** Gwarancja, że serwer połączenia zdalnego nie otwiera portów MIDI I/O .
* **Wizualizacja Statusu w Launcherze:** Wyświetlanie diody stanu obecności innych hostów w sieci LAN oraz ich aktualnej roli (*Master* / *Spare*) .

**SN-13: Rozszerzenia Planowane w Wersjach Późniejszych (v5.3+)**  
* **Automatyczna Elekcja (Auto-Election / Consensus Protocol):** Lekka pętla decyzyjna (oparta na algorytmie typu Raft-lite) dokonująca automatycznego wyboru nowego Mastera przy utracie sygnału po potwierdzeniu przez kworum klientów.
* **Integracja ze Przełącznikami Sprzętowymi (Hardware Audio/MIDI Switchers):** Sterowanie zewnętrznymi przekaźnikami przeskokowymi (np. przez protokół OSC lub przekaźnik GPIO) w celu fizycznego przełączenia torów audio i kabli MIDI na scenie.
* **Aktywna Replikacja P2P:** Bezpośrednia synchronizacja delta-zmian projektu pomiędzy instancjami serwerów z pominięciem udziałów sieciowych OS.

| Funkcjonalność Safety Net | Zakres MVP v5.2 | Zakres Fazy Późniejszej (v5.3+) |
| :--- | :--- | :--- |
| **Inicjalizacja Przełączenia** | Jawna akcja operatora ("Przejmij")  | Automatyczna po utracie kworum (Auto-Election) |
| **Synchronizacja Plików** | Odczyt ze współdzielonego folderu / WS pull  | Aktywny silnik replikacji różnicowej P2P |
| **Zarządzanie Portami MIDI** | Programowe wyłączenie portów w `MidiHost`  | Integracja z zewnętrznym matrycowym przełącznikiem HW |
| **Interfejs Launchera** | Ostrzeżenia o wersjach + Przycisk przejęcia  | Graficzna mapa topologii węzłów sieciowych LAN |
| **Wymagania Infrastruktury** | Zwykła sieć LAN + Dwa komputery z aplikacją | Dedykowane łącze Heartbeat / Redundantny LAN |

---

## F) Kryteria Akceptacji Operatorskiej i Lista Zasad "NIE-ROBIĆ"

Sprawdzianem poprawności architektonicznej systemu jest jego zachowanie w situacjach skrajnych podczas obsługi koncertu. Niniejszy rozdział mapuje wymagania Safety Net na istniejące mechanizmy cyklu życia (*Lifecycle*) oraz formułuje bezwzględne zakazy projektowe.

**SN-14: Integracja z Cyklem Życia Aplikacji (Desktop Shell & Lifecycle Mapping)**  
Implementacja Safety Net musi w pełni respektować zasady cyklu życia zidentyfikowane w audycie Lifecycle :
* **Reakcja na Nagłe Zamknięcie (`HW-LIF-05`):** Gdy sidecar Mastera ulegnie awarii, natywna powłoka Tauri musi przechwycić zdarzenie `Terminated`, zapobiec wystąpieniu białego ekranu i powrócić do ekranu Launchera z pełnym opisem błędu i logiem .
* **Obsługa Portu 4000 (`HW-LIF-02` / `HW-LIF-03`):** Gdy węzeł promowany do roli *Master* próbuje podnieść lokalny serwer HTTP, funkcja `reclaim_ui_port_orphan` musi zweryfikować, czy port 4000 nie jest zajęty przez obcy proces lub starą instancję .
* **Autoryzacja Dstępu Zdalnego (`HW-LIF-11`):** Próby wysłania zapytania promocyjnego `POST /api/system/promote` z obcego adresu IP bez odpowiedniego tokena nagłówka (`x-stagesync-host-token`) muszą być odrzucane z kodem błędu HTTP `403 Forbidden` .
* **Debounce Rejestracji mDNS (`HW-LIF-12`):** Szybkie zmiany stanu transportu (np. Play/Pause) nie mogą powodować ciągłego ponownego rozgłaszania rekordu mDNS (wymagany bufor czasowy min. 400 ms) .

**SN-15: Bezkompromisowa Lista Zasad "NIE-ROBIĆ" (DO NOT DO)**  
Podczas wdrożenia issue #437 kategorycznie zabrania się stosowania następujących praktyk:
1. **ZAKAZ traktowania rozwiązania "Docker-as-HA" jako jedynej odpowiedzi systemowej:** Konteneryzacja nie rozwiązuje problemu autorytetu czasowego na scenie ani dublowania komunikatów na fizycznych portach MIDI.
2. **ZAKAZ równoległego generowania zegara transportu na węźle Spare:** Niezależne pętle odliczania czasu na dwóch komputerach bez synchronizacji fazowej zawsze prowadzą do rozjechania ścieżek.
3. **ZAKAZ otwierania portów MIDI I/O z poziomu procesu natywnego Tauri/Rust:** Dostęp do sterowników urządzeń MIDI musi odbywać się wyłącznie za pośrednictwem serwera Node.js (`apps/server`) .
4. **ZAKAZ wdrażania atrap interfejsu (*UI Stubs*):** Przycisk przełączenia awaryjnego nie może pojawić się w widoku Admina, dopóki pod spodem nie istnieje kompletny mechanizm odłączania portów i przekazywania blokad .
5. **ZAKAZ samoczynnego wyzwalania odtwarzania po failoverze:** Awaryjne przejęcie roli *Master* musi wprowadzić silnik transportu w stan PAUSE na aktualnej pozycji. Przejście w tryb PLAY wymaga celowej akcji realizatora.
6. **ZAKAZ synchronizacji lokalnego stanu przeglądarki (`AudioContext` / miksery audio):** Próba narzucenia konfiguracji kart wyjściowych z komputera A na komputer B powoduje błędy inicjalizacji warstwy dźwiękowej.

| Identyfikator BRAMKI | Opis Testu Operatorskiego | Oczekiwany Rezultat | Stan Weryfikacji |
| :--- | :--- | :--- | :--- |
| **ACC-SN-01** | Odłączenie zasilania od komputera Master podczas odtwarzania | Węzeł Spare wyświetla baner ostrzegawczy; przycisk "Przejmij" staje się aktywny  | Wymaga wdrożenia 5.2 |
| **ACC-SN-02** | Ręczne kliknięcie "Przejmij" na węźle Spare w trakcie pauzy | Węzeł Spare zmienia rolę na Master, otwiera lokalny plik projektu w trybie do zapisu  | Wymaga wdrożenia 5.2 |
| **ACC-SN-03** | Weryfikacja magistrali MIDI po podłączeniu węzła Spare | Węzeł Spare NIE wysyła komend *Program Change* ani *MIDI Clock* do czasu promocji  | Obowiązkowe dla 5.2 |
| **ACC-SN-04** | Próba wykonania `POST /api/system/promote` z obcej sieci bez tokena | Serwer zwraca status HTTP `403 Forbidden`  | Zgodne z `HW-LIF-11`  |
| **ACC-SN-05** | Symulacja zapętlenia pętli sieciowej Wi-Fi/LAN | Algorytm reconnectu stosuje jitter i nie blokuje interfejsu użytkownika  | Zgodne z `wsReconnect`  |

---

## Wnioski Architektoniczne i Rekomendacje

Przedstawiona specyfikacja systemu *Safety Net* dla StageSync v5.2+ godzi wymogi niezawodności estrady z architekturą pojedynczego źródła prawdy (SSOT) . Zamiast tworzyć skomplikowane i podatne na awarie mechanizmy rozproszonej synchronizacji w czasie rzeczywistym, system stawia na **deterministyczny stan pasywny z kontrolowanym, ręcznym przejęciem autorytetu**. 

Takie podejście eliminuje ryzyko podwójnego nadawania sygnałów sterujących MIDI , zabezpiecza spójność plików projektu na dysku  oraz wpisuje się w dojrzały wzorzec natywnego shella Tauri i Launchera . Realizacja MVP w linii 5.2 stanowi fundament do bezpiecznej rozbudowy o kolejne stopnie automatyzacji w przyszłych wydaniach systemu .

---
Powered by [AI Exporter](https://saveai.net)
> From: https://gemini.google.com/app/c5f0dccc37b12010

Ocena Safety Net StageSync

# Ocena Architektury Safety Net StageSync (#437) w Środowisku Live Production

## Kontekst Architektoniczny i Rygory Niezawodnościowe w Środowisku Live

Architektura estradowych systemów odtwarzania ścieżek dźwiękowych, sygnałów sterujących i materiałów wideo rządzi się zasadami odmiennymi od klasycznego oprogramowania chmurowego . W środowisku produktywnym na żywo nie istnieje pojęcie retrospective retry, a jakakolwiek niekontrolowana przerwa w strumieniu audio lub zduplikowanie komunikatu sterującego prowadzi do natychmiastowej degradacji widowiska . Projekt StageSync v5 opiera się na koncepcji pojedynczego autorytatywnego serwera będącego Jedynym Źródłem Prawdy (SSOT — *Single Source of Truth*) dla zegara transportu, struktury setlisty oraz komunikatów wyjściowych MIDI . Wprowadzenie mechanizmu nadmiarowości określanego jako Safety Net (#437) wymagało zdefiniowania granic odpowiedzialności między instancją aktywną a instancją rezerwową, przy jednoczesnym uniknięciu składania fałszywych obietnic w zakresie bezprzerwowej, w pełni automatycznej wysokiej dostępności (ang. *Zero-Glitch Seamless HA*) .

Rzeczywistość sceniczna narzuca bezwzględny determinizm operacyjny . Aplikacje wykorzystywane na scenie muszą charakteryzować się przewidywalnością w sytuacjach skrajnych, takich jak zanik zasilania maszyny głównej, uszkodzenie okablowania sieciowego czy awaria procesu pomocniczego . Rozważając zasadność i spójność pięciu kluczowych decyzji podjętych w ramach zgłoszenia #437, należy zestawić je zarówno z fizycznymi ograniczeniami warstwy sprzętowej, jak i ze sprawdzonymi standardami branżowymi reprezentowanymi przez systemy QLab, redundantne zestawy Ableton Live oparte na interfejsach przełączających oraz redundantne konfiguracje MainStage .

---

## Krytyczna Ocena Pięciu Decyzji Architektonicznych Safety Net (#437)

### Decyzja 1: Nazewnictwo Master/Spare (zamiast Master/Slave)
* **Werdykt:** **KEEP** (Utrzymać)
* **Analiza i Uzasadnienie:** Wybór pojęć *Master* oraz *Spare* stanowi trafną decyzję nie tylko na poziomie terminologicznym, ale przede wszystkim w wymiarze semantyki architektonicznej . W klasycznych układach typu Master/Slave węzeł podrzędny wykonuje polecenia wydawane bezpośrednio przez węzeł nadrzędny, często nie posiadając pełnej autonomii ani własnego stanu operacyjnego. W przypadku systemu estradowego węzeł rezerwowy nie jest poddanym procesem wykonywawczym, lecz autonomiczną, w pełni zainicjalizowaną instancją *Hot Standby*, która posiada wczytany ten sam projekt i prowadzi bierny podgląd stanu . Słowo *Spare* precyzyjnie definiuje rolę maszyny pasywnej, gotowej do natychmiastowego przejęcia autorytetu po wykonaniu jawnego kroku promocyjnego . Terminology ta jest spójna ze standardami stosowanymi w realizacjach teatralnych i touringowych, gdzie maszyny zapasowe określa się mianem *Backup* lub *Spare*, unikając mylącego pojęcia *Slave* .

### Decyzja 2: MVP Oparte Wyłącznie na Ręcznej Promocji (Manual Promote); Auto-Election Przełożone na Przyszłość
* **Werdykt:** **KEEP** (Utrzymać)
* **Analiza i Uzasadnienie:** Ograniczenie zakresu MVP do ręcznego wyzwolenia promocji (*Manual Promote*) przez operatora jest fundamentalnym założeniem gwarantującym bezpieczeństwo pokazu . Wdrożenie automatycznego konsensusu lub elekcji (*auto-election*) w warstwie oprogramowania połączonego wyłącznie zwykłą siecią Ethernet/Wi-Fi nieuchronnie prowadzi do ryzyka fałszywych przełączeń na skutek chwilowego wzrostu opóźnień (jitter) lub gubienia pakietów HTTP/WS . W środowisku estradowym samoczynne przełączenie roli przez aplikację bez fizycznej weryfikacji przyczyny awarii może spowodować wystąpienie stanu *Split-Brain*, w którym dwie maszyny próbują równolegle przejąć rolę zegara nadrzędnego . Doświadczenia z systemów reżyserskich pokazują, że deterministyczna decyzja człowieka wciśnięcia przycisku przejęcia jest preferowanym wzorcem niezawodnościowym, uniemożliwiającym powstawanie niekontrolowanych pętli decyzyjnych w trakcie koncertu .

### Decyzja 3: Blokada MIDI OUT oraz Zegara Muzycznego na Instancji Spare (Anti Dual-Send)
* **Werdykt:** **KEEP** (Utrzymać — Wymóg Krytyczny)
* **Analiza i Uzasadnienie:** Wyłączenie generatora *MIDI Clock* oraz fizycznych portów wyjściowych MIDI na instancji *Spare* stanowi bezwzględny warunek techniczny uniemożliwiający destrukcję sygnałów sterujących . Gdyby dwie maszyny podłączone do wspólnej magistrali MIDI (np. poprzez scalacz MIDI lub podwójny interfejs USB) nadawały równolegle komunikaty tempa `0xF8` lub komendy przełączania brzmień *Program Change*, odbiorniki końcowe (syntezatory, procesory efektów, konsolety) doznałyby zakleszczenia, gwałtownych skoków parametru BPM oraz błędnego wyzwalania scenariuszy . Zaimplementowana w module `MidiHost` blokada wyjść dla roli pasywnej zapewnia, że instancja *Spare* pozostaje cyfrowo niema w warstwie wyjściowej aż do momentu oficjalnego przejęcia roli *Master* .

### Decyzja 4: Brak Deklaracji Docker=HA oraz Brak Zielonych Bramek G-Gates bez Testów HW
* **Werdykt:** **KEEP** (Utrzymać)
* **Analiza i Uzasadnienie:** Decyzja ta dowodzi dojrzałości architektonicznej i odporności na pokusę składania bez pokrycia obietnic marketingowych . Konteneryzacja w technologii Docker zapewnia izolację zależności oraz powtarzalność wdrożenia, lecz w żaden sposób nie rozwiązuje problemu ciągłości strumienia dźwiękowego czy fizycznego przełączenia magistrali sygnałowych . Czas potrzebny na restart kontenera po awarii jest rzędu kilku sekund, co na scenie oznacza wysoce zauważalną i niedopuszczalną ciszę . Powstrzymanie się od oznaczania bramek jakościowych G1–G10 jako zaliczonych bez przeprowadzenia bezpośrednich testów na fizycznych maszynach Windows i macOS chroni projekt przed wprowadzaniem na rynek rozwiązań niesprawdzonych pod realnym obciążeniem sprzętowym .

### Decyzja 5: Wspólny Katalog Danych (Shared Data Dir / Mirror) jako Ścieżka MVP
* **Werdykt:** **REVISE** (Zmienić założenie techniczne)
* **Analiza i Uzasadnienie:** Koncepcja polegania na bezpośrednio montowanym sieciowym katalogu danych (np. przez udziały SMB, NFS czy CIFS) zawiera w sobie poważną wadę niezawodnościową . Sieciowy system plików tworzy bezpośredni pojedynczy punkt awarii (*Single Point of Failure*) w warstwie I/O . W przypadku fizycznego uszkodzenia kabla LAN, awarii przełącznika lub przeciążenia interfejsu sieciowego, proces maszyny *Spare* (a potencjalnie także *Master*) ulegnie zawieszeniu na poziomie operacji plikowych I/O . Wzorzec sprawdzony w praktyce estradowej nakazuje, aby instancja *Spare* pracowała wyłącznie na lokalnym, szybkim dysku SSD, zaś synchronizacja struktury projektu i setlisty odbywała się asynchronicznie poprzez warstwę aplikacji (np. strumień zdarzeń WebSocket lub lokalną replikację różnicową) . Założenie o wspólnym wolumenie dyskowym w MVP należy zmienić na rzecz zasady *Local-First Storage with Async State Mirroring* .

---

## Analiza Porównawcza ze Standardami Branżowymi

Projektując system rezerwowy dla StageSync v5.2, przeanalizowano trzy dominujące w branży estradowej koncepcje nadmiarowości . Każda z nich podchodzi do problemu ciągłości pracy w odmienny sposób, stawiając akcent na inne warstwy stosu technologicznego .

W systemach opartych na oprogramowaniu QLab standardem jest praca dwóch niezależnych komputerów Mac połączonych wspólnym wyzwalaczem MIDI lub OSC (np. za pośrednictwem kontrolera podpiętego do obu maszyn jednocześnie) . Komputer główny oraz komputer zapasowy wykonują te same komendy równolegle . Aby zapobiec podwójnemu nadawaniu komunikatów sterujących DMX czy MIDI, QLab wykorzystuje mechanizm skryptowego wyciszania wyjść (*Override Controls*) na komputerze rezerwowym . Przełączenie sygnału audio realizowane jest na ogół zewnętrznym przełącznikiem sprzętowym (np. Radial SW8) lub ręcznie w konsolecie FOH .

W redundantnych zestawach odtwarzaczy opartych na DAW Ableton Live, dwie maszyny generują strumień audio w sposób ciągły i całkowicie symetryczny . Kluczowym elementem tej architektury jest dedykowany interfejs sprzętowy (np. iConnectivity PlayAudio1U lub PlayAudio12), który stale monitoruje niesłyszalny ton pilota (ang. *LifeSine / Pilot Tone*) generowany przez maszynę główną . W momencie wykrycia zaniku tonu lub awarii komputera A, interfejs sprzętowy bezszumowo i automatycznie przełącza fizyczne wyjścia analogowe/Dante na sygnał z komputera B . Sterowanie MIDI realizowane jest przez sprzętowe matryce wyjściowe .

W przypadku środowiska MainStage stosuje się podejście zbliżone do śledzenia równoległego z ręczną interwencją . Obie instancje mają załadowany ten sam koncert, lecz przełączenie toru odsłuchowego oraz sterowania instrumentami wymaga fizycznej akcji operatora na mikserze lub przełączniku KVM/MIDI . Brak jest w tym przypadku dedykowanej warstwy synchronizacji stanu w czasie rzeczywistym między aplikacjami .

| Cecha / Parametr Architektury | StageSync Safety Net (MVP v5.2) | QLab Dual-Machine Setup | Redundant DAW (Ableton + PlayAUDIO1U) | MainStage Backup Rig |
| :--- | :--- | :--- | :--- | :--- |
| **Model Autorytetu i Rol** | *Hot Standby Read-Only Mirror* (SSOT na Masterze)  | *Parallel Tracking Backup* (Dwie aktywne instancje)  | *Parallel Symmetric Active* (Dwie symetryczne maszyny)  | *Parallel Manual Tracking* (Ręcznie zsynchronizowane)  |
| **Inicjalizacja Failover** | Ręczna promocja w UI Launchera/Admina (*Promote*)  | Ręczne przełączenie skryptem / przyciskiem na mikserze  | Automatyczna w HW (Detekcja braku tonu pilota *LifeSine*)  | Ręczne przełączenie kanałów na mikserze audio  |
| **Zarządzanie Wyjściami MIDI** | Programowy Mute na *Spare* w module `MidiHost`  | Wyłączenie *Override Controls* skryptem na Backupie  | Sprzętowe odłączenie portu w interfejsie MIDI  | Brak automatyki; ręczna izolacja portów  |
| **Replikacja Stanu Pokazu** | Asynchroniczny strumień zdarzeń WebSocket / plik lokalny  | Synchronizacja plików przed pokazem (np. Syncthing)  | Ręczne kopiowanie sesji `.als` przed koncertem  | Ręczne kopiowanie pliku `.layout` przed wystąpieniem  |
| **Ryzyko Stanu Split-Brain** | Wyeliminowane (jawna zmiana roli SSOT)  | Niskie (zależy od dyscypliny skryptów Overrides)  | Wyeliminowane na poziomie wyjść sprzętowych  | Średnie (wymaga rygoru manualnego operatora)  |
| **Wymagania Infrastruktury** | Zwykła sieć LAN + Dwa komputery ze StageSync  | Dwa Maci + Przełącznik audio / Sterownik MIDI  | Dwa komputery + Dedykowany interfejs przełączający  | Dwa Maci + Submikser audio / Przełącznik  |

Z przeprowadzonej analizy porównawczej wynika, że przyjęty w StageSync v5.2 model *Hot Standby* z ręcznym przejęciem autorytetu logicznego i programowym wyciszeniem MIDI dokładnie odpowiada wypróbowanym wzorcom z oprogramowania QLab, gwarantując wysoki poziom bezpieczeństwa bez konieczności inwestowania w kosztowne interfejsy przełączające w pierwszym etapie wdrożenia .

---

## Ocena Uczciwości Produktowej: Uczciwa Architektura czy Marketing

Rozstrzygnięcie, czy nazwanie modułu rezerwowego bez automatycznego przełączania mianem „Safety Net” stanowi uczciwą ofertę produktową, czy jedynie zabieg marketingowy, wymaga przeanalizowania psychologii i praktyki pracy realizatora widowisk na żywo . 

W branży estradowej automatyka, która działa w sposób niedeterministyczny, jest traktowana jako zagrożenie, a nie ułatwienie . Automatyczne przełączenie oprogramowania, które mogłoby zadziałać pomyłkowo w cichym fragmencie utworu na skutek mikro-przerwy w sieci Wi-Fi, stanowi błąd dyskwalifikujący system . Dlatego oferowanie stabilnego, przewidywalnego mechanizmu *Hot Standby Mirror*, który utrzymuje instancję rezerwową w pełnej synchronizacji ze stanem utworu i setlisty, a zarazem daje operatorowi gwarancję, że przejęcie kontroli nastąpi wyłącznie na jego wyrachowane polecenie, jest w pełni uczciwym i profesjonalnym rozwiązaniem .

Nazwa „Safety Net” (Siatka Bezpieczeństwa) idealnie oddaje metaforyczny i techniczny sens tej funkcji . Siatka bezpieczeństwa w cyrku nie zapobiega upadkowi akrobaty, lecz chroni go przed śmiertelnym skutkiem uderzenia w ziemię. Analogicznie, Safety Net w StageSync nie zapobiega awarii komputera głównego, ale zapewnia natychmiastową obecność drugiej maszyny z identycznym stanem projektu, gotowej do podjęcia pracy bez konieczności ręcznego ponownego uruchamiania aplikacji, szukania plików czy podłączania okablowania .

Aby jednak zachować pełną transparentność inżynieryjną i uniknąć zarzutów o wprowadzanie w błąd, zakres funkcji w dokumentacji oraz w interfejsie użytkownika powinien zostać precyzyjnie doprecyzowany . Należy bezwzględnie zrezygnować z używania w materiałach promocyjnych sformułowań sugerujących „automatyczny failover bezprzerwowy” na rzecz pojęć precyzyjnych technicznie, takich jak *Hot Standby Tracking Mirror* oraz *Manual Authority Takeover* . W dokumentacji operatorskiej należy wyraźnie opisać podział ról: StageSync odpowiada za bezkolizyjne przełączenie logiki pokazu i sygnałów MIDI, natomiast ciągłość toru analogowego audio wymaga zastosowania zewnętrznego przełącznika sprzętowego lub przełączenia kanałów na konsolecie FOH .

---

## Rekomendacje Decyzyjne i Pytania do Product Ownera (PO)

W celu jednoznacznego domknięcia wymagań dla issue #437 oraz przygotowania precyzyjnych kryteriów akceptacyjnych dla zespołu programistycznego, formułuje się zestaw kluczowych pytań do Product Ownera wraz z rekomendacjami inżynieryjnymi.

Przede wszystkim należy rozstrzygnąć kwestię stanu silnika transportu tuż po wykonaniu procedury przejęcia autorytetu . Pytanie do PO brzmi: *Czy w momencie kliknięcia przycisku „Przejmij” na instancji Spare, lokalny silnik TransportEngine powinien automatycznie wystartować w trybie PLAY od ostatniego zapamiętanego ticka, czy też przejść w stan PAUSE na tej pozycji, oczekując na celowe wciśnięcie spacji/PLAY przez realizatora?* Rekomendacja inżynieryjna jednoznacznie wskazuje na wymóg przejścia w stan PAUSE . Automatyczny start odtwarzania dźwięku na nowej maszynie bez weryfikacji stanu toru audio przez realizatora może doprowadzić do gwałtownego i niekontrolowanego uderzenia sygnału na nagłośnieniu głównym .

Kolejną kwestią jest weryfikacja architektury synchronizacji danych . Pytanie do PO brzmi: *Czy akceptujemy formalną rezygnację z modelu współdzielonego katalogu sieciowego (Shared Network Drive) w MVP na rzecz zasady odczytu z lokalnego dysku SSD i replikacji stanu delta przez połączenie WebSocket?* Rekomendacja inżynieryjna nakazuje odrzucenie udziałów SMB/NFS, które wprowadzają groźny punkt awarii I/O, na rzecz lokalnej pamięci podręcznej z asynchronią sieciową .

Trzecie pytanie dotyczy komunikacji z urządzeniami klienckimi w sieci LAN podczas przełączenia : *Jak powinny zachować się cienkie aplikacje klienckie (np. Performer, Console, widoki przeglądarkowe) w momencie promocji instancji Spare do roli Master? Czy nowy Master powinien przejąć rozgłaszanie mDNS z rekordem `role=master` i wymusić automatyczne przekierowanie gniazd WebSocket klientów na swój adres IP?* Rekomendacja wskazuje na konieczność płynnego przełączenia połączeń klienckich poprzez mechanizm wywalania starych gniazd i rozgłoszenie nowej tożsamości w mDNS .

Czwarta kwestia dotyczy zabezpieczeń przed nieuprawnionym wywłaszczeniem : *Czy wywołanie punktu końcowego `POST /api/system/promote` ma być bezwzględnie chronione nagłówkiem tokena hosta (`x-stagesync-host-token`) oraz opcjonalnym PIN-em operatora, aby zapobiec przypadkowemu przejęciu roli przez nieautoryzowane urządzenie w sieci Wi-Fi?* Rekomendacja inżynieryjna traktuje to zabezpieczenie jako krytyczny wymóg bezpieczeństwa scenicznego .

| Identyfikator Decyzji | Obszar Architektury | Rekomendowany Werdykt | Działanie Wdrożeniowe i Zmiany w Dokumentacji |
| :--- | :--- | :--- | :--- |
| **CRIT-SN-01** | Nazewnictwo ról systemowych | **KEEP** | Stosować wyłącznie nazwy *Master* oraz *Spare*. Zaktualizować słownik w `DESKTOP.md` . |
| **CRIT-SN-02** | Logika przełączenia (Failover) | **KEEP** | Zachować wyłącznie ręczny przycisk *Promote*. Auto-election przenieść do etapu 5.3+ / Later . |
| **CRIT-SN-03** | Sterowanie sygnałami MIDI | **KEEP** | Utrzymać twardy wyłącznik wyjść MIDI i clocka w `MidiHost` przy braku roli Master . |
| **CRIT-SN-04** | Roszczenia HA i bramki G-gates | **KEEP** | Unikać deklaracji „Docker=HA”. Zaliczenie bramek G1–G10 wymaga testów na fizycznym HW . |
| **CRIT-SN-05** | Model pamięci masowej w MVP | **REVISE** | Odrzucić sieciowy folder danych (SMB/NFS). Wdrożyć odczyt lokalny SSD + replikację WS . |
| **CRIT-SN-06** | Opis produktu w docs | **REVISE** | Zawęzić zakres w docs do *Hot Standby Tracking Mirror*. Jasno opisać wymóg zewnętrznego przełącznika audio . |

---
Powered by [AI Exporter](https://saveai.net)
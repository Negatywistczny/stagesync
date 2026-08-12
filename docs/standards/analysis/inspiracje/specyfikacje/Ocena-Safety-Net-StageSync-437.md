> From: https://gemini.google.com/app/52ea2b52a68258f2

Ocena Safety Net StageSync

# Ocena Niezawodności i Architektura Safety Net w StageSync v5.2 (#437)

## Konkluzja i Werdykt Integralności Produktowej (KEEP / REVISE / REVERT)

Architektura zestawu nadmiarowego Safety Net w StageSync v5.2 opiera się na koncepcji deterministycznego węzła zapasowego typu Hot Standby z ręcznym przekazaniem autorytetu (Manual Promote) oraz bezwzględnym wyciszeniem komunikatów wyjściowych MIDI na instancji pasywnej . W realiach profesjonalnych realizacji estradowych i teatralnych ocena tej architektury sprowadza się do pytania, czy brak automatycznego przełączania awaryjnego (Auto-Election) dyskwalifikuje system jako rozwiązanie klasy Safety Net, czyniąc z niego jedynie zabieg marketingowy .

Ocena niezawodnościowa prowadzi do jednoznacznego werdyktu: **KEEP (Utrzymać architekturę) z jednoczesną dyscypliną dokumentacyjną REVISE (Sprecyzować zakres w dokumentacji)** .

Rozwiązanie Safety Net pozbawione automatycznej elekcji nie jest marketingową atrapą — jest uczciwym, przemysłowo uzasadnionym podejściem do niezawodności w środowisku czasu rzeczywistego . W inżynierii dźwięku i systemach sterowania widowiskiem na żywo automatyczne przełączanie oparte wyłącznie na programowym wykrywaniu braku sygnału w sieci IP niosłoby ze sobą niedopuszczalne ryzyko błędów typu Split-Brain . Chwilowe przeciążenie procesora, pakiet zgubiony w sieci Wi-Fi/LAN lub krótkie opóźnienie wywołane przez twardy proces w systemie operacyjnym mogłyby wyzwolić fałszywą automatyczną promocję . W efekcie dwie maszyny zaczęłyby jednocześnie nadawać sygnały zegara muzycznego (MIDI Clock) oraz komunikaty wyboru brzmień (Program Change), doprowadzając do zdesynchronizowania instrumentów, świateł oraz warstwy audio na scenie .

Tradycyjne systemy redundantne stosowane na światowych trasach koncertowych (oparte na oprogramowaniu QLab, MainStage czy Ableton Live) w przeważającej większości opierają się na równoległym wyzwalaniu dwóch niezależnych maszyn oraz ręcznym lub sprzętowym przełączaniu sygnału wyjściowego . Wprowadzenie w StageSync kontrolowanego przejęcia roli Mastera przez operatora, przy jednoczesnym automatycznym blokowaniu portów wyjściowych MIDI na maszynie Spare, dostarcza wysoki poziom bezpieczeństwa bez wprowadzania niedeterministycznych automatów decyzyjnych .

Rekomenduje się jednak **zawężenie opisu w dokumentacji (REVISE)**, aby uniknąć sformułowań sugerujących bezobsługową, przezroczystą wysoką dostępność (Zero-Glitch Seamless HA) . Dokumentacja dla realizatorów powinna jednoznacznie definiować Safety Net w MVP jako _Operator-Assisted Hot Standby_ (Pasywna Rezerwa z Ręcznym Przejęciem) .

---

## Ocena Poszczególnych Decyzji Architektonicznych (#437)

### Decyzja 1: Nazewnictwo Master / Spare (odrzucenie terminu Slave)

Wybór terminologii Master / Spare w pełni odpowiada współczesnym standardom branży mediatronicznej i nadawczej . W odróżnieniu od klasycznego układu Master / Slave — gdzie instancja podrzędna bezrefleksyjnie wykonuje polecenia instancji nadrzędnej — słowo _Spare_ precyzyjnie oddaje charakter węzła rezerwowego . Instancja Spare w StageSync nie jest bezwolnym wykonawcą, lecz autonomicznym serwerem utrzymującym w pamięci podręcznej pełne odzwierciedlenie stanu projektu, zablokowanym programowo w trybie odczytu (Read-Only Mirror) do momentu awansu . Nazewnictwo to jest spójne z nomenklaturą stosowaną w konsoletach cyfrowych oraz systemach matrycowych (Primary / Secondary lub Main / Spare) .

### Decyzja 2: MVP = Wyłącznie ręczny Promote; Auto-Election odłożone na Fazy Późniejsze

Decyzja o rezygnacji z automatycznej elekcji na etapie MVP stanowi najważniejszy filar stabilności v5.2 . Automatyczny konsensus (np. uproszczony algorytm Raft) uruchomiony w przeglądarce lub procesie sidecara w warunkach scenicznych jest podatny na asymetrię sieciową . Jeśli maszyna Master na 2 sekundy straci łączność z powodu buforowania sterownika karty sieciowej, automatyczna elekcja na maszynie Spare wywoła przejęcie autorytetu . Gdy maszyna Master odzyska płynność, w sieci pojawią się dwa autorytatywne źródła prawdy (SSOT) .

W realizacjach na żywo nieplanowana przerwa w odtwarzaniu wywołana przez fałszywy failover jest groźniejsza niż kontrolowany zatrzymany odtwarzacz, nad którym nadzór sprawuje człowiek . Przekazanie decyzji o promocji w ręce operatora (przycisk „Przejmij” w interfejsie Launcher/Admin) eliminuje niestabilność logiczną . Operator, widząc awarię komputera głównego lub uszkodzenie toru audio, świadomie wciska przycisk przejęcia, aktywując porty wyjściowe i przejmując zarządzanie transportem .

### Decyzja 3: MIDI OUT i Clock wyłączone na węźle Spare (Anti Dual-Send)

Wyłączenie fizycznej emisji MIDI (zarówno komunikatów ze sterownika transportu, jak i zdarzeń z klatek Timeline) na instancji Spare rozwiązuje fundamentalny problem redundancji cyfrowej . W tradycyjnych konfiguracjach estradowych podłączenie dwóch komputerów do tej samej magistrali MIDI (np. poprzez scalacz MIDI Thru) bez sprzętowego przełącznika powodowało nakładanie się bajtów . Dwa źródła wysyłające komendę `0xF8` (MIDI Clock) generują zjawisko tempa dwukrotnie szybszego lub powodują natychmiastowe zablokowanie odbiorników cyfrowych w instrumentach .

Programowe odcięcie wyjść w module `MidiHost` na węźle Spare — przy jednoczesnym pozostawieniu aktywnej analizy zdarzeń wejściowych IN — gwarantuje, że do momentu oficjalnej promocji maszyna zapasowa pozostaje całkowicie przezroczysta dla zewnętrznego sprzętu .

### Decyzja 4: Brak claimu Docker = High Availability oraz utrzymanie otwartych bramek G1–G10

Zachowanie pełnej wstrzemięźliwości w deklaracjach dotyczących konteneryzacji stanowi przejaw dojrzałości inżynieryjnej . Wzorzec kontenera Docker zapewnia powtarzalność i izolację środowiska wykonawczego, jednak w żaden sposób nie rozwiązuje problemów ciągłości toru audio, dostępu do fizycznych portów USB-MIDI czy synchronizacji zegarów w czasie rzeczywistym . Deklarowanie, że sam Docker zapewnia wysokie bezpieczeństwo (HA), byłoby wprowadzaniem użytkowników w błąd .

Równie krytyczne jest nieoznaczanie bramek operatorskich G1–G10 jako zaliczonych („green”) bez przeprowadzonych testów na rzeczywistym sprzęcie estradowym (Hardware/LIVE Smoke) . Zachowanie statusu testów jako otwartych (hipotezy) w dokumentacji triage zabezpiecza projekt przed wydaniem nieprzetestowanego oprogramowania na scenę .

### Decyzja 5: Wspólny katalog danych (Shared Data Dir / Mirror) jako ścieżka MVP

Założenie, że węzeł Spare korzysta z zasobu danych w trybie odczytu (np. zamontowany udział sieciowy, lokalna replika danych lub folder zsynchronizowany w tle), stanowi najprostszą i najbardziej niezawodną metodę zapewnienia spójności . Zapobiega to powstawaniu rozbieżności w strukturze setlisty oraz indeksach utworów . Ponieważ maszyna Spare nie wykonuje operacji zapisu do pliku projektu `.stagesync.json` ani `setlist.json`, nie zachodzi ryzyko uszkodzenia nagłówków plików przy ewentualnym zaniku zasilania na jednym z węzłów .

---

## Analiza Porównawcza: StageSync Safety Net vs Standardy Branżowe

W celu obiektywnej oceny przyjętych założeń, zestawiono architekturę StageSync v5.2 z trzema powszechnie stosowanymi w branży rozrywkowej modelami redundancji: podwójnymi zestawami QLab, dedykowanymi odtwarzaczami sprzętowymi oraz podwójnymi systemami MainStage.

| Cecha / Mechanizm                       | QLab Dual-Machine Setup                                    | MainStage Redundant Rig                                     | Redundant Players (np. Ableton)                         | StageSync v5.2 Safety Net                                 |
| :-------------------------------------- | :--------------------------------------------------------- | :---------------------------------------------------------- | :------------------------------------------------------ | :-------------------------------------------------------- |
| **Architektura Autorytetu**             | Zdublowane niezależne maszyny wyzwalane równolegle         | Zdublowane komputery odbierające sygnał MIDI IN             | Dwie instancje połączone protokołem Ableton Link / MIDI | Zdeterminiowany układ Master (SSOT) / Spare (Mirror)      |
| **Mechanizm Przełączenia Audio**        | Sprzętowy przełącznik (np. Radial SW8, PlayAudio12)        | Sprzętowy przełącznik audio sterowany tonem pilotującym     | Sprzętowy przełącznik audio lub konsoleta mikserska     | Zewnętrzny przełącznik audio lub ręczny tłumik konsolety  |
| **Zarządzanie Magistralą MIDI OUT**     | Brak natywnej blokady; wymaga sprzętowego splitter-boxa    | Wymaga fizycznego odłączenia kabli lub przełącznika MIDI    | Zdublowane komunikaty wysyłane na osobne porty          | **Natywne wyciszenie wyjść MIDI na instancji Spare**      |
| **Inicjalizacja Przełączenia Failover** | Ręczna (operator) lub automatyczna przez przełącznik audio | Automatyczna (zanik tonu sine 1kHz) lub ręczna              | Ręczna przez realizatora na konsolecie lub switchu      | **Ręczna (akcja operatora „Przejmij” w UI)**              |
| **Synchronizacja Pozycji Transportu**   | Wyzwalanie CUE z jednego pilota (np. StreamDeck, OSC)      | Odczyt komunikatów MIDI ze wspólnej klawiatury              | Równoległe odtwarzanie od wspólnego punktu startu       | Pasywne podążanie węzła Spare za zdarzeniami WS z Mastera |
| **Ryzyko Kolizji Split-Brain**          | Niskie (przełącznik fizyczny decyduje o szynie wyjściowej) | Bardzo niskie (detekcja czysto analogowa tonu pilotującego) | Średnie przy automatycznym spięciu zegarów bez switcha  | **Zero (blokada programowa i brak autoelekcji w MVP)**    |

Światowe standardy estradowe dowodzą, że brak automatycznego przełączania w samej warstwie oprogramowania nie jest wadą, lecz zamierzonym wyborem inżynieryjnym . Żaden z wiodących programów estradowych nie posiada wbudowanego automatycznego algorytmu decyzyjnego przejmowania autorytetu w sieci IP bez wsparcia zewnętrznego sprzętu .

W profesjonalnych systemach przełączenie toru audio odbywa się w warstwie fizycznej — poprzez przełącznik matrycowy (np. Radial SW8 przełączający sygnał po zaniku tonu pilotującego 1 kHz) lub dedykowane interfejsy audio z funkcją failover (np. iConnectivity PlayAudio12) . StageSync v5.2 doskonale wpisuje się w ten model: oprogramowanie dba o spójność stanu i bezpieczną magistralę MIDI, natomiast przełączenie sumy audio pozostaje w warstwie sprzętowej realizatora .

Zaletą StageSync w zestawieniu z rynkowymi rozwiązaniami jest eliminated konieczność stosowania zewnętrznych, aktywnych puszek rozdzielających MIDI (np. MIDI Solutions Thru) dzięki natywnemu wyciszeniu komunikatów wyjściowych na spoczynkowym komputerze w module `MidiHost` .

---

## Macierz Synchronizacji Danych i Procedury Awaryjne

W celu zapewnienia pełnej jasności operacyjnej, specyfikacja Safety Net w StageSync v5.2 rozdziela obiekty danych na podlegające synchronizacji oraz obiekty o charakterze wyłącznie lokalnym .

| Obiekt Danych                           | Kategoria       | Mechanizm Replikacji                                  | Rola podczas Przełączenia Awaryjnego                   |
| :-------------------------------------- | :-------------- | :---------------------------------------------------- | :----------------------------------------------------- |
| **Plik Projektu (`*.json`)**            | Synchronizowany | Zapis na dysku Mastera + Odczyt ze wspólnego dir / WS | Kluczowa: Węzeł Spare posiada identyczną osnowę utworu |
| **Kolejność Setlisty (`setlist.json`)** | Synchronizowany | Emisja zdarzenia `publishSetlistHub` przez WebSocket  | Kluczowa: Węzeł Spare wskazuje ten sam utwór i sekcję  |
| **Mapowanie MIDI (`midi.json`)**        | Synchronizowany | Plik konfiguracyjny roboczy w katalogu projektu       | Wysoka: Po awansie maszyna Spare wie, gdzie wysłać PC  |
| **Stan Bazy Live Desk**                 | Synchronizowany | Replikacja zmian stanu w pamięci podręcznej z Mastera | Średnia: Zachowuje tymczasowe nadpisania i wyciszenia  |
| **Kontekst Audio (`AudioContext`)**     | LOKALNY         | Brak (Lokalny silnik audio na danej maszynie)         | Wykluczony: Maszyna Spare inicjalizuje własne karty    |
| **Obecność Klientów (`Presence`)**      | LOKALNY         | Dynamiczne wyliczanie gniazd WebSocket na serwerze    | Wykluczony: Klienci przelogowują się po zmianie IP     |
| **Bufor Logów Procesu**                 | LOKALNY         | Zapis w lokalnym pliku / pamięci sidecara             | Wykluczony: Unikalny dla danej instancji OS            |

Sekwencja awaryjnego przełączenia autorytetu w StageSync v5.2 przebiega w sposób ściśle zdeterminiowany . Początkowo aktywny serwer Master nadaje ciągły sygnał Heartbeat przez WebSocket oraz rozgłasza swoją obecność w usłudze mDNS . Pasywny węzeł Spare nieustannie odbiera te pakiety, utrzymując stan transportu oraz podgląd setlisty w trybie do odczytu przy zablokowanych fizycznych portach MIDI OUT .

W momencie wystąpienia awarii — czy to na skutek uszkodzenia procesu sidecar, awarii zasilania, czy odłączenia przewodu sieciowego — interfejs użytkownika na węźle Spare wykrywa brak impulsu Heartbeat po przekroczeniu progu 3000 ms . Powłoka aplikacji wyświetla natychmiast ostrzegawczy baner informujący o utracie połączenia z Masterem oraz uaktywnia przycisk ręcznej promocji .

Po wciśnięciu przez realizatora przycisku „Przejmij” (Manual Promote), system wykonuje natychmiastową kaskadę przełączenia:

1. Zostaje odepchnięta blokada zapisu w katalogu danych, a pliki projektu przechodzą w tryb do zapisu .
2. Moduł `MidiHost` zdejmuje programowe wyciszenie wyjść i inicjalizuje fizyczne porty MIDI OUT .
3. Silnik transportu przechodzi w stan PAUSE na ostatniej zapamiętanej pozycji, zapobiegając niekontrolowanemu wystrzałowi dźwięku bez decyzji operatora .
4. Usługa mDNS aktualizuje rekord rozgłoszeniowy z `role=spare` na `role=master`, przejmując autorytet w sieci LAN .

| Typ Awarii                                    | Detekcja przez Węzeł Spare                      | Czas Reakcji Systemu                  | Zachowanie Interfejsu i Silnika                           | Akcja Wymagana od Operatora                             |
| :-------------------------------------------- | :---------------------------------------------- | :------------------------------------ | :-------------------------------------------------------- | :------------------------------------------------------ |
| **Crash procesu sidecar na Masterze**         | Natychmiastowe zamknięcie gniazda IPC / WS      | < 100 ms                              | Powłoka Tauri przechwytuje zdarzenie, powrót do Launchera | Ręczne wciśnięcie „Przejmij” na maszynie Spare          |
| **Zanik zasilania / Awaria komputera Master** | Timeout pętli Heartbeat WS oraz zapytania Probe | 3000 ms (Heartbeat) + 3000 ms (Probe) | Pojawienie się banera „Utracono połączenie z Masterem”    | Kliknięcie przycisku „Przejmij autorytet Mastera”       |
| **Fizyczne odłączenie kabla LAN**             | Błąd warstwy TCP / gniazda WebSocket            | < 500 ms (OS Event)                   | Przejście w tryb ponawiania połączenia (Backoff)          | Weryfikacja przewodu lub wymuszenie promocji lokalnej   |
| **Ręczna promocja w trakcie pauzy**           | Wyzwolenie komendy `POST /api/system/promote`   | Natychmiastowo (0 ms)                 | Zmiana roli na Master, otwarcie FS, odblokowanie MIDI     | Przełączenie suwaka audio na konsolecie (jeśli dotyczy) |

---

## Pytania do Product Ownera (PO) i Wytyczne Governance

Przed ostatecznym zamknięciem etapu v5.2 i przekazaniem specyfikacji do zespołu wdrożeniowego, należy uzyskać odpowiedź od Product Ownera na poniższe pytania dotyczące komunikacji i granic produktu (ID: CRIT-SN-01):

### CRIT-SN-01-Q1: Nazewnictwo i Komunikacja Rynkowa (SLA vs Operational Safety)

Czy Product Owner akceptuje wprowadzenie do oficjalnej dokumentacji dla użytkowników ([`DESKTOP.md`../../../../guides/DESKTOP.md), [`INSTALL.md`../../../../guides/INSTALL.md)) precyzyjnego pojęcia **„Manual Hot Standby”** w miejsce samego słowa „Safety Net”? Zapobiegnie to ewentualnym roszczeniom realizatorów, którzy mogliby oczekiwać bezobsługowej, automatycznej przełączalności bez udziału człowieka .

### CRIT-SN-01-Q2: Rekomendacja Sprzętowa dla Toru Audio (Audio Redundancy Strategy)

Czy w oficjalnym podręczniku użytkowania opisany zostanie rekomendowany schemat podłączenia audio ze sprzętowym przełącznikiem (np. Radial SW8 / iConnectivity PlayAudio12) lub prostym wyciszeniem kanałów na mikserze FOH? StageSync v5.2 rozwiązuje problem autorytetu czasu i magistrali MIDI, ale nie przełącza fizycznych kabli sygnałowych audio . Wyraźny diagram w dokumentacji podniesie profesjonalny wizerunek systemu w oczach realizatorów .

### CRIT-SN-01-Q3: Infrastruktura Współdzielenia Danych (Shared Data Dir Guidelines)

Czy w ramach MVP wskazujemy jako jedyną wspieraną ścieżkę lokalne kopiowanie / synchronizację projektów (np. narzędziem Syncthing lub rsync w tle), czy dopuszczamy sieciowe protokoły SMB/NFS na scenie? Protokoły sieciowe SMB/NFS na niestabilnym łączu Wi-Fi mogą powodować zawieszenie operacji I/O w Node.js, co mogłoby zablokować interfejs komputera Spare .

### CRIT-SN-01-Q4: Kryteria Gotowości dla Fazy Auto-Election (v5.3+ Backlog Definition)

Czy Product Owner zatwierdza wpisanie automatycznej elekcji (Auto-Election) do oficjalnego rejestru spraw odłożonych (TODO 5.3+) z twardym zastrzeżeniem, że jej wdrożenie wymagać będzie fizycznego tokenu dzierżawy (Lease Token) oraz dedykowanego kanału sieciowego Heartbeat? Zabezpieczy to architekturę przed próbami pośpiesznego wprowadzania niesprawdzonych automatów decyzyjnych bez pełnej kontroli nad ryzykiem Split-Brain .

---

Powered by [AI Exporter](https://saveai.net)

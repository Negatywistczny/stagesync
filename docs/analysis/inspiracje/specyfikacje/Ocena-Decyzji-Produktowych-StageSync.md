> From: https://gemini.google.com/app/ea4b7f7702ba836a

Ocena Niezawodności Decyzji StageSync

# Raport Niezależnego Reviewera Reliability Live Production: StageSync v5.x

**Identyfikator audytu:** CRIT-RES-01  
**Kontekst operacyjny:** Realizator FOH, infrastruktura komputerowa na scenie (laptop główny oraz zapasowy połączone lokalną siecią LAN), brak dedykowanego etatu SRE na miejscu.  
**Cel:** Ocena poprawności architektonicznych i produktowych decyzji systemu StageSync v5.x pod kątem niezawodności w warunkach koncertowych.

---

## Ocena Decyzji Produktowych i Werdykty Operacyjne

Praca w warunkach wydarzeń na żywo wymaga bezwzględnego priorytetu dla stabilności i determinizmu środowiska wykonawczego. Wszystkie mechanizmy automatyczne, które wprowadzają niepewność co do stanu systemu lub stwarzają ryzyko niekontrolowanego przełączenia w trakcie trwania utworu, stanowią bezpośrednie zagrożenie dla przebiegu koncertu. Poniższe zestawienie podsumowuje ocenę siedmiu kluczowych decyzji produktowych StageSync wraz z werdyktami operacyjnymi oraz identyfikacją dominującego ryzyka scenicznego.

| ID     | Decyzja Produktowa                                                                                     | Werdykt    | Kluczowe Ryzyko Sceniczne                                                                      |
| :----- | :----------------------------------------------------------------------------------------------------- | :--------- | :--------------------------------------------------------------------------------------------- |
| **D1** | **Safety Net (#437):** Architektura Master/Spare; MVP = tylko ręczny „Przejmij”; auto-election = Later | **KEEP**   | Przerwa w odtwarzaniu dźwięku mid-set wymagająca reakcji operatora i ręcznego wznowienia .     |
| **D2** | **MIDI OUT / Clock:** Wyłączone na węźle Spare (blokada anti dual-send)                                | **KEEP**   | Nakładanie się sygnałów MIDI Clock oraz pętla komunikatów Program Change na instrumentach .    |
| **D3** | **Backup Przywróć GUI:** Pełne GUI jako backlog (ADR 0015) przy istniejącym shadowBackup               | **REVISE** | Konieczność ręcznej edycji plików w systemie operacyjnym podczas awarii przed koncertem .      |
| **D4** | **Auto-update:** Permanentny zakaz automatycznych aktualizacji bez akcji operatora                     | **KEEP**   | Niewymuszony restart procesu Node/Tauri lub zużycie pasma I/O i CPU podczas koncertu .         |
| **D5** | **git-apply / Aktualizuj teraz:** Permanentne wykluczenie kompilacji i git pull w runtime              | **KEEP**   | Nieusystematyzowany stan repozytorium oraz uszkodzenie zależności w `node_modules` na scenie . |
| **D6** | **Offline-First UI (#692):** Pobranie zip + jawny dialog „Zastosuj”; zakaz cichego sync mid-set        | **KEEP**   | Samoczynne przeładowanie interfejsu PWA/WebView na tabletach muzyków w trakcie utworu .        |
| **D7** | **Shared Data Dir:** Założenie współdzielonego katalogu sieciowego (NFS/SMB) dla węzła Spare           | **REVERT** | Blokada wątku I/O w Node.js na skutek opóźnień sieciowych lub awarii udziału LAN .             |

---

### Merytoryczne Uzasadnienie Oceniającego

Decyzja o wstrzymaniu automatycznej elekcji na rzecz ręcznego przełączenia autorytetu w ramach Safety Net jest w pełni uzasadniona warunkami estradowymi . W nieskonfigurowanym środowisku sieciowym LAN/Wi-Fi bez infrastruktury klastrowej, automatyczne algorytmy konsensusu ulegają fałszywym aktywacjom pod wpływem chwilowych opóźnień pakietów. Niewymuszone przełączenie ról w trakcie trwania utworu niesie znacznie wyższe ryzyko niż chwilowa, kontrolowana pauza w odtwarzaniu . Model ręcznego przycisku „Przejmij” wpisuje się w praktykę estradową, o ile system po przejęciu automatycznie wchodzi w stan PAUSE, chroniąc przed niekontrolowanym odtworzeniem materiału .

Gwarancja programowego wyłączenia wyjść MIDI na węźle Spare (`isMidiOutAllowed() === false`) stanowi krytyczne zabezpieczenie przed zjawiskiem podwójnego nadawania . Gdyby zapasowy serwer generował równolegle sygnały sterujące do tej samej magistrali MIDI, doszłoby do nakładania się komend zegarowych oraz ciągłego nadpisywania presetów w syntezatorach i procesorach efektów . Całkowita blokada sterowników wyjściowych na poziomie silnika `MidiHost` na maszynie zapasowej skutecznie eliminuje to zagrożenie .

Wdrożenie mechanizmu `shadowBackup`, który automatycznie tworzy kopie zapasowe z rozszerzeniem `.bak` przed każdą modyfikacją pliku, jest dobrym zabezpieczeniem retencji danych . Jednak odłożenie interfejsu graficznego do przywracania tych kopii do backlogu przy jednoczesnym rozwijaniu funkcji mobilnych stanowi błąd w hierarchii priorytetów . W stresowej sytuacji uszkodzenia pliku projektu przed występem, realizator FOH nie powinien być zmuszony do obsługi menedżera plików systemu operacyjnego w celu ręcznej zmiany nazw plików .

Wykluczenie automatycznych aktualizacji w tle gwarantuje całkowite zamrożenie środowiska wykonawczego podczas trwania widowiska . Jakiekolwiek tle procesów aktualizacji stwarza nieakceptowalne ryzyko nagłego zużycia zasobów procesora, pamięci masowej oraz przepustowości sieci, co bezpośrednio przekłada się na gubienie ramek audio . Podobnie, ostateczne odrzucenie mechanizmu `git-apply` z wersji 4.x na rzecz kontenerów Docker lub skompilowanych paczek instalacyjnych eliminuje ryzyko uszkodzenia drzewa kodowego na scenie .

Koncepcja Offline-First UI chroni realizatora i wykonawców przed samoczynnym odświeżaniem się widoków aplikacji . Pobrana paczka interfejsu trafia do lokalnego bufora i oczekuje na jawną decyzję operatora, co wyklucza sytuację, w której ekran z tekstem lub strukturą utworu znika w kluczowym momencie występów .

Krytyczną pomyłką architektoniczną jest natomiast założenie, że węzeł Spare korzysta ze wspólnego katalogu danych za pośrednictwem dysku sieciowego . W warunkach koncertowych sieciowe protokoły plików są podatne na zawieszenia I/O przy utracie chociażby pojedynczych pakietów, co natychmiast blokuje pętlę zdarzeń Node.js . Praktyka systemów redundantnych jednoznacznie nakazuje stosowanie niezależnych, szybkich dysków lokalnych SSD na obu komputerach .

---

## Analiza Krytycznych Pytań Operacyjnych

### Wystarczalność Trybu Manual-Only Failover w Warunkach Awarii Mid-Set

Ręczny mechanizm przełączenia awaryjnego (Manual Failover) nie stanowi technologii przezroczystej wysokiej dostępności typu Zero-Glitch, lecz jest uporządkowaną procedurą odzyskiwania systemu po awarii . W przypadku nagłego padnięcia komputera głównego w trakcie trwania utworu, sygnał audio z Mastera natychmiast zanika. Procedura ręczna wymaga od realizatora FOH zauważenia braku dźwięku, oceny stanu komputera głównego, przełączenia uwagi na ekran zapasowy oraz kliknięcia przycisku „Przejmij” .

Czas potrzebny na wykonanie tej sekwencji w warunkach stresu scenicznego wynosi zazwyczaj od 3 do 10 sekund. W skali profesjonalnego koncertu oznacza to zauważalny incydent w postaci ciszy na scenie, jednak pozwala na kontynuowanie widowiska bez konieczności długotrwałego restartu aplikacji .

Implementacja automatycznego przełączania bez dedykowanej magistrali sprzętowej niesie za sobą nieakceptowalne ryzyko wystąpienia podwójnego autorytetu (Split-Brain) . Jeśli algorytm automatyczny błędnie zinterpretuje chwilowy spadek przepustowości sieci LAN jako awarię Mastera, węzeł Spare samoczynnie podniesie własny zegar i zacznie odtwarzać dźwięk . Zjawisko jednoczesnego odtwarzania ścieżek z dwóch niezsynchronizowanych źródeł jest dla przebiegu koncertu znacznie groźniejsze niż kilkusekundowa przerwa .

Dojrzałe systemy redundantne realizujące automatyczny failover bez przerwy w dźwięku opierają się na ciągłej emisji sygnału kontrolnego (Pilot Tone / LifeSine) do zewnętrznych przełączników sprzętowych, takich jak Radial SW8-USB czy iConnectivity PlayAUDIO12 . Sprzęt ten dokonuje fizycznego przełączenia torów analogowych lub cyfrowych po wykryciu zaniku sygnału pilota . StageSync, działając jako oprogramowanie na uniwersalnych komputerach, postępuje słusznie, ograniczając się w fazie MVP do ręcznego przejęcia . Wymaga to jednak jasnego zakomunikowania użytkownikom, że funkcja ta służy do kontrolowanej zmiany autorytetu, a nie do bezprzerwowego przełączania strumienia audio .

Gwarancją bezpieczeństwa przy ręcznym przejęciu jest zasada, że po aktywacji funkcji promocji na węźle Spare, silnik transportu automatycznie przechodzi w stan PAUSE na pozycji ostatnio odebranego stempla czasowego . Uniemożliwia to niespodziewany, gwałtowny start dźwięku i daje realizatorowi pełną kontrolę nad momentem wznowienia odtwarzania .

---

### Permanentny Zakaz Auto-Update a Tauri Updater

Wprowadzenie w wersji 5.1.3 modułu aktualizacji w powłoce Tauri z ostrzeżeniem o konieczności restartu aplikacji nie unieważnia permanentnego zakazu automatycznych aktualizacji w tle . Podstawową zasadą niezawodności w branży live production jest utrzymywanie środowiska wykonawczego w stanie całkowitej niezmienności od momentu rozpoczęcia prób do zakończenia koncertu .

Nawet przy obecności mechanizmów ostrzegających, samoczynne procesy sprawdzania i pobierania aktualizacji wywołują szereg zagrożeń operacyjnych:

- Tłok w paśmie I/O i CPU wywołany pobieraniem i rozpakowywaniem archiwów w tle prowadzi do zwiększenia opóźnień w przetwornikach audio oraz potencjalnego gubienia próbek dźwiękowych .
- Okna dialogowe aktualizacji mogą przesłonić kluczowe interfejsy sterowania transportem lub spowodować utratę skupienia okna w systemie operacyjnym, blokując skróty klawiszowe .
- Nieplanowana zmiana wersji na jednym z komputerów prowadzi do niezgodności protokołu (`VERSION_MISMATCH`) pomiędzy Masterem a Spare, uniemożliwiając poprawną replikację stanu .

Funkcja aktualizacji w architekturze StageSync powinna być dostępna wyłącznie na ręczne żądanie operatora z poziomu panelu Admina, na przykład w trybie przygotowawczym podczas próby dźwiękowej . Na scenie aplikacja musi działać w trybie całkowitej izolacji od jakichkolwiek samowolnych operacji sieciowych i dyskowych .

---

### Status GUI Przywracania Kopii Zapasowej a shadowBackup

Odkładanie interfejsu graficznego do przywracania kopii zapasowych przy istniejącym w kodzie mechanizmie `shadowBackup` stanowi ewidentną lukę produktową . Mechanizm `shadowBackup` poprawnie wykonuje bezobsługową kopię bezpieczeństwa pliku przed każdą destrukcyjną operacją zapisu, chroniąc spójność danych na poziomie dyskowym .

Jednak brak możliwości odzyskania danych z poziomu interfejsu użytkownika sprowadza to zabezpieczenie do wartości czysto teoretycznej w warunkach koncertowych . W stresowej sytuacji uszkodzenia projektu bezpośrednio przed występem, realizator FOH nie ma czasu ani warunków na przeszukiwanie struktury katalogów systemu operacyjnego i ręczną zmianę rozszerzeń plików .

Podstawowy panel w Admin UI pozwalający na wskazanie pliku `.bak` i jego natychmiastowe wczytanie do silnika powinien być traktowany jako funkcja krytyczna dla bezpieczeństwa operacyjnego, posiadająca wyższy priorytet niż rozwój dodatkowych modułów klienckich .

---

### Semantyczna Porównywalność z Systemami Branżowymi

Przemysłowe systemy odtwarzania redundantnego wypracowały jednoznaczne wzorce w zakresie zarządzania sygnałami i danymi. Poniższa tabela przedstawia porównanie rozwiązań stosowanych w standardach rynkowych z zalecanym kierunkiem rozwoju dla aplikacji StageSync.

| Obszar / Mechanizm            | Standard Branżowy (QLab / Radial SW8 / PlayAUDIO12)                                                                           | Wzorzec dla StageSync (Co SKOPIOWAĆ)                                                        | Zakaz dla StageSync (Czego NIE KOPIOWAĆ)                                                             |
| :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------- |
| **Wyjścia MIDI i Sterowanie** | Wykorzystanie funkcji _Override Controls_ w QLab do blokowania transmisji MIDI/OSC na maszynie zapasowej .                    | Programowa blokada otwierania i nadawania na portach MIDI na serwerze Spare .               | Brak mechanizmu blokady i dopuszczenie do otwarcia tych samych portów wyjściowych na obu maszynach . |
| **Przechowywanie Danych**     | Wycofanie się ze współdzielonych dysków SIECIOWYCH (NAS/NFS) na rzecz niezależnych, lokalnych dysków SSD na obu komputerach . | Przechowywanie całości struktury projektu na dysku lokalnym każdej maszyny .                | Założenie o istnieniu wspólnego katalogu sieciowego (`Shared data dir`) w warunkach LAN FOH .        |
| **Synchronizacja Projektu**   | Tworzenie kopii plików przed koncertem. Brak cichej synchronizacji kodu i mediów w locie podczas trwania show .               | Asynchroniczna replikacja stanu setlisty i projektów w tle przed rozpoczęciem odtwarzania . | Próby automatycznego przeładowywania przestrzeni roboczej lub skryptów w trakcie trwania spektaklu . |
| **Przełączenie Audio**        | Zewnętrzne przełączniki sprzętowe sterowane sygnałem kontrolnym (Pilot Tone) .                                                | Zsynchronizowany stan transportu i automatyczna pauza po ręcznym przejęciu ról .            | Emulacja bezprzerwowego przełączania audio wyłącznie za pomocą warstwy programowej bez wsparcia HW . |

---

## Analiza Ryzyk Scenicznych i Niezawodnościowych

Szczegółowa ocena architektury StageSync v5.x pozwala na wyznaczenie czterech głównych obszarów ryzyka scenicznego wraz z opisem mechanizmów ich mitygacji.

### Ryzyko Niestabilności Danych przy Udziałach Sieciowych (Shared Data Dir)

Założenie, że komputery Master i Spare korzystają ze wspólnego katalogu danych za pośrednictwem protokołów NFS lub SMB, stwarza bezpośrednie zagrożenie dla płynności działania aplikacji . W warunkach estradowych połączenia sieciowe LAN są podatne na Chwilowe spowolnienia. Opóźnienia w dostępie do plików blokują pętlę zdarzeń (Event Loop) w procesie Node.js, co prowadzi do przycięć w odtwarzaniu dźwięku .

Mitygacja tego ryzyka wymaga, aby każdy komputer posiadał własny komplet plików na lokalnym dysku SSD . Synchronizacja pomiędzy Masterem a Spare musi odbywać się asynchronicznie poprzez protokół WebSocket (`publishSetlistHubFromStores`), zapisując odebrane dane do lokalnego katalogu roboczego na komputerze zapasowym .

---

### Ryzyko Wystąpienia Zjawiska Split-Brain i Podwójnej Emisji MIDI

W przypadku przerwania łączności sieciowej pomiędzy komputerami, zapasowy serwer może błędnie zinterpretować brak pakietów jako awarię Mastera i samoczynnie zacząć nadawać sygnały wyjściowe . Powoduje to wysyłanie podwójnych komunikatów Program Change oraz nakładanie się zegarów MIDI Clock na podłączonych instrumentach .

Mitygacja opiera się na twardej blokadzie w kodzie modułu `createMidiHost` . Awans do roli Mastera wymaga jawnego wywołania interfejsu `POST /api/system/promote`, zabezpieczonego tokenem nagłówka hosta (`x-stagesync-host-token`) . Rola Spare bezwzględnie utrzymuje sterowniki wyjściowe MIDI w trybie bezczynnym .

---

### Ryzyko Niekontrolowanego Odświeżenia Interfejsu (WebView UI Reload)

Automatyczne wdrażanie nowej wersji interfejsu graficznego w trakcie odtwarzania utworu wywołuje przeładowanie widoku w aplikacjach mobilnych oraz przeglądarkach na tabletach muzyków (Performer/Console) . Zniknięcie tekstu lub podglądu struktury utworu w trakcie występów stanowi poważną awarię użytkową .

Mitygacja polega na bezwzględnym przestrzeganiu zasad Offline-First UI (#692) . Pobrane paczki interfejsu w postaci archiwów ZIP są zapisywane w lokalnej pamięci podręcznej, ale ich aktywacja i odświeżenie widoku następuje wyłącznie po jawnym kliknięciu przycisku „Zastosuj” przez operatora .

---

### Ryzyko Zawieszenia Portu HTTP po Awarii Procesu (Orphaned Port 4000)

Nieoczekiwane zamknięcie procesu pomocniczego Node.js (np. na skutek awarii zasilania lub błędu systemowego) może pozostawić gniazdo TCP 4000 w stanie zajętości przez sierocą instancję, co uniemożliwia ponowne podniesienie serwera przez powłokę Tauri .

Mitygacja tego problemu realizowana jest przez procedurę `reclaim_ui_port_orphan` w natywnej powłoce aplikacji . Przed podniesieniem nowego procesu powłoka odpytuje endpoint `/api/health`, weryfikuje nagłówek wersji i w przypadku braku poprawnej odpowiedzi natychmiast zwalnia zajęty port .

---

## Rekomendowane Decyzje do Ponownego Q&A z Product Ownerem

W celu zagwarantowania pełnej spójności architektonicznej i operacyjnej wersji StageSync v5.2, rekomenduje się przeprowadzenie ponownego uzgodnienia z Product Ownerem w zakresie trzech poniższych decyzji.

### 1. Formalna Zmiana Modelu Danych dla Węzła Spare

Należy zadać pytanie PO: _Czy wycofujemy formalnie założenie o stosowaniu współdzielonych katalogów sieciowych (NFS/SMB) na rzecz niezależnych dysków lokalnych z asynchroniczną replikacją zmian po gnieździe WebSocket?_

Rekomenduje się całkowite odrzucenie dysków sieciowych w warunkach FOH . Każda maszyna musi być w pełni samowystarczalna pod kątem operacji dyskowych I/O, aby wyeliminować ryzyko zamrażania pętli zdarzeń aplikacji przy zakłóceniach sieciowych .

---

### 2. Podniesienie Priorytetu GUI Przywracania Kopii Zapasowych

Należy zadać pytanie PO: _Czy zgadzasz się na przeniesienie funkcji interfejsu graficznego do przywracania kopii `.bak` z backlogu do podstawowego zakresu wymagań wersji v5.2?_

Rekomenduje się natychmiastowe wdrożenie tego interfejsu . Tworzenie automatycznych kopii zapasowych przez mechanizm `shadowBackup` bez możliwości ich intuicyjnego odzyskania z poziomu panelu Admin UI stanowi istotną lukę w bezpieczeństwie operacyjnym .

---

### 3. Wprowadzenie Zasady Twardego PAUSE po Ręcznym Przejęciu Roli

Należy zadać pytanie PO: _Czy zatwierdzasz regułę, że po kliknięciu „Przejmij” na węźle Spare, silnik transportu nowo promowanego Mastera bezwzględnie wchodzi w stan PAUSE na pozycji ostatnio odebranego stempla czasowego?_

Rekomenduje się zatwierdzenie tej zasady . Samoczynny start odtwarzania audio po przejęciu roli stwarza ryzyko dezorientacji wykonawców na scenie . Wznowienie odtwarzania musi być zawsze świadomą i celową akcją realizatora FOH .

---

## Podsumowanie Architektoniczne

Projekt StageSync v5.x prezentuje dojrzałe podejście do inżynierii niezawodności w środowisku koncertowym . Odrzucenie niestabilnych mechanizmów, takich jak automatyczna kompilacja w runtime czy bezobsługowe aktualizacje w tle, znacząco podnosi bezpieczeństwo pracy na scenie .

Wdrożenie zasady Jednego Źródła Prawdy (SSOT) dla zegara muzycznego oraz programowej blokady wyjść MIDI na maszynie zapasowej skutecznie chroni system przed awariami wynikającymi z konfliktu autorytetów . Wprowadzenie poprawek w zakresie przechowywania danych na lokalnych dyskach SSD oraz wdrożenie interfejsu przywracania kopii zapasowych pozwoli na osiągnięcie pełnej gotowości produkcyjnej w wydaniu v5.2 .

---

Powered by [AI Exporter](https://saveai.net)

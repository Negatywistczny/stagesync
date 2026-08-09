> From: https://gemini.google.com/app/cad99ed9ace74f10

Ocena Strategii StageSync v5

# Ocena Spójności Strategii Produktowej i Tożsamości StageSync v5

ID: CRIT-ID-01-STAGESYNC-V5-EVALUATION

## A) Werdykt Spójności Strategii

Strategia produktowa StageSync v5 wykazuje wysoki poziom dojrzałości w zakresie izolacji ról wykonawczych i operacyjnych na scenie , lecz cierpi na głębokie pęknięcie tożsamościowe wynikające z niepotrzebnego rozciągania domeny z lekkiego silnika koncertowego w stronę złożonego studio DAW oraz przymusowej mobilizacji ciężkiego środowiska serwerowego . Wyznaczenie czysto odczytowej roli dla aplikacji Performer oraz zastąpienie złożonych protokołów OAuth prostym kodem Operator PIN w zamkniętych sieciach LAN stanowią pragmatyczne i w pełni uzasadnione decyzje estradowe . Jednocześnie przyjęcie aplikacji Logic Pro jako nadrzędnej referencji UX przy jednoczesnym forsowaniu pełnego parytetu serwerowego na platformie Android (Console z lokalnym hostem Node.js) tworzy nieuzasadniony narzut inżynieryjny, prowadząc do bezpośrednich sprzeczności architektonicznych i podważając fundament bezwzględnej deterministyki oraz prostoty systemu scenicznego .

---

## B) Tabela Oceny Decyzji Strategicznych 1–7

| ID  | Decyzja Strategiczna                                                            | Status     | Uzasadnienie Strategiczne                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Reguła referencji: Logic Pro jako pierwsza referencja UX/edycji (po SSOT/stubs) | **REVISE** | Logic Pro jest DAW studyjnym zorientowanym na produkcję muzyczną . Przyjmowanie go jako głównej referencji wypacza produkt sceniczny. Referencją edycyjną na Timeline mogą być wybrane gesty z Logic Pro, ale tożsamość architektury musi wynikać z rozwiązań koncertowych .              |
| 2   | Console (Android) = pełny odpowiednik desktopu (lokalny host IN)                | **REVERT** | Wprowadzenie lokalnego serwera Node.js (`libnode`/JNI) na Androida generuje ogromne ryzyko techniczne (zgodność 16 KB page size, brak natywnego serwerowego MIDI, zamykanie procesów w tle przez OS) . Console na tablecie powinna być wyłącznie klientem zdalnym sterującym hostem LAN . |
| 3   | Performer = zawsze Client-only read-only (bez sidecara/edycji)                  | **KEEP**   | Bezwzględna izolacja muzyka od edycji projektu i silnika audio wyklucza ryzyko przypadkowego zdestabilizowania widowiska z poziomu urządzeń scenicznych .                                                                                                                                 |
| 4   | Auth/Motywy: OAuth OUT w 5.2, Operator PIN MVP, scenic lock                     | **KEEP**   | Dostosowanie modelu bezpieczeństwa do wyizolowanych, zamkniętych sieci LAN na koncertach . OAuth introduces niepotrzebne zależności WAN, podczas gdy PIN wystarczająco zabezpiecza destrukcyjne operacje na hoście .                                                                      |
| 5   | Cues Sampler: rozszerzyć CueClip, routing Master\|Bus only                      | **KEEP**   | Uniknięcie mnożenia bytów w modelu danych . Osadzenie wyzwalania próbek w istniejącym klipie Cue z prostym routingiem zapobiega powstawaniu trudnych do opanowania kaskad w mikserze na żywo .                                                                                            |
| 6   | Pakiet `.stagesync.json`, Flex/Takes/recording = „później jak Logic”            | **REVISE** | Sam format pliku JSON jest prawidłowy dla MVP, jednak deklarowanie w wizji rozwoju funkcji typu Flex Time, Take Folders czy nagrywanie MIDI stwarza nierealny zakres prac i odciąga zasoby od funkcji czysto koncertowych .                                                               |
| 7   | Menubar: OUT dla Audio/MIDI/DMX, Tap Tempo, top-level Setlista                  | **KEEP**   | Właściwa decyzja porządkująca interfejs OS. Sterowanie parametrami wykonawczymi powinno odbywać się z poziomu dedykowanego widoku Admina/Live Desk, a nie rozproszonych menu systemowych .                                                                                                |

### Szczegółowa Analiza Rekomendacji

Decyzja o przyjęciu aplikacji Logic Pro jako nadrzędnego wzorca wymaga natychmiastowej rewizji, ponieważ przenoszenie nawyków projektowych ze środowiska aranżacyjnego do systemu kontroli widowiska na żywo rozmywa priorytety wydajnościowe . Podczas gdy w studiu nagraniowym kluczowa jest nieograniczona elastyczność i możliwość wielowarstwowego miksowania, na scenie najważniejsza pozostaje niezawodność, niska latencja oraz czytelność stanów operacyjnych . Wzorowanie się na Logic Pro powinno zostać bezwzględnie ograniczone do geometrii edycji na osi czasu (narzędzia Pointer, Pencil, zasada No Overlap), bez przejmowania studyjnej filozofii routingu audio czy edycji materiału w locie .

Propozycja uczynienia z aplikacji Android Console pełnoprawnego hosta z lokalnym serwerem Node.js wymaga całkowitego cofnięcia (REVERT) . Architektura ta nakłada na zespół inżynieryjny ciężar utrzymywania natywnych mostów JNI, rozwiązywania problemów z alokacją pamięci na R8/NDK oraz obchodzenia ograniczeń systemowych Androida dotyczących braku wsparcia dla serwerowych interfejsów MIDI . W realiach estradowych tablet w reżyserce FOH pełni funkcję bezprzewodowego kontrolera, a nie centralnej jednostki obliczeniowej . Pozostawienie aplikacji Console jako lekkiego interfejsu SPA łączącego się z komputerem głównym po sieci LAN przywraca właściwe proporcje architektoniczne .

Podtrzymanie w mocy decyzji o pasywnej roli aplikacji Performer , wdrożeniu prostego kodu Operator PIN oraz rozszerzeniu klipów `CueClip` stanowi fundament stabilności v5. Izolacja muzyków na scenie od możliwości edycji chroni ciągłość widowiska . Z kolei zintegrowanie odtwarzacza sampli z klipami Cue przy wykluczeniu skomplikowanych kaskad routingowych zapobiega błędom konfiguracyjnym w warunkach stresu koncertowego . Wyczyszczenie menubar z ustawień sprzętowych domyka porządkowanie przestrzeni roboczej, przenosząc pełną kontrolę do spójnego panelu administracyjnego .

---

## C) Największa Sprzeczność w ADR 0015 i ADR 0016

Najbardziej rażąca sprzeczność pomiędzy dokumentami ADR 0015 i ADR 0016 leży w konfrontacji fundamentalnej zasady szczerości interfejsu ("brak funkcji = brak UI / zakaz stubów") z nakazem sztucznego forsowania pełnego parytetu mobilnego na systemie Android .

ADR 0015 definiuje etykę inżynieryjną StageSync: zabrania stosowania atrap, niekompletnych interfejsów oraz przycisków wyłączonych "na zapas" . Zgodnie z tym dokumentem produkt ma być uczciwy wobec operatora — każda kontrolka widoczna w ekranie musi odpowiadać w pełni funkcjonalnemu silnikowi pod spodem . Wprost zakazuje się deklarowania funkcji, które nie mają pokrycia w rzeczywistym wykonaniu sprzętowym .

Z kolei ADR 0016 wymusza, aby aplikacja StageSync Console na systemie Android stanowiła "pełnoprawny odpowiednik desktopu", zawierający wbudowany lokalny serwer Node.js (`libnode` + JNI + `assets/host`) . Jednocześnie ten sam dokument ADR 0016 wprost przyznaje, że na platformie mobilnej:

- Natywna obsługa serwerowych interfejsów MIDI jest niedostępna, a silnik jest zmuszony startować ze sztywnym ograniczeniem `STAGESYNC_MIDI_BACKEND=none` .
- Automatyczne rozgłaszanie usług mDNS przez bibliotekę Node.js jest bezużyteczne pod `node::Start` i wymaga tworzenia zewnętrznych obejść w warstwie Android NSD .
- Domyślne pakiety silnika natrafiają na bariery wykonawcze na nowszych wersjach systemu Android z powodu niezgodności wyrównania stron pamięci (16 KB page size) .

W ten sposób ADR 0016 nakazuje dostarczenie użytkownikowi "pełnego lokalnego hosta" na tablecie, tworząc w rzeczywistości środowisko o okrojonych możliwościach I/O, pozbawione sterowania MIDI i obarczone ryzykiem nagłego wyłączenia przez system operacyjny . Jest to bezpośrednie naruszenie konstytucyjnej zasady ADR 0015, która zabrania oferowania interfejsów dających fałszywe poczucie pełnej funkcjonalności .

---

## D) Pytania Q&A do Product Ownera (Realnie Zmieniające Backlog 5.2)

1. **Czy PO wyraża zgodę na natychmiastowe usunięcie wbudowanego lokalnego serwera Node.js (`libnode`/JNI) z aplikacji StageSync Console na systemie Android i pozostawienie jej wyłącznie jako wydajnego klienta zdalnego (Admin/Timeline SPA) połączonego przez sieć LAN, co pozwoli usunąć z backlogu 5.2 skomplikowane epiki natywne oraz wyeliminować ryzyko niestabilności silnika na scenie?**  
   _(Tak / Nie)_

2. **Czy PO potwierdza, że funkcjonalności właściwe dla studyjnych stacji DAW (Flex Time, Take Folders, nagrywanie MIDI, comping) zostają definitywnie wykreślone ze strategicznego backlogu StageSync na rzecz rozwoju funkcji czysto scenicznych (redundancja Safety Net, automatyzacja cue, wyzwalanie DMX/OSC)?**  
   _(Tak / Nie)_

3. **Czy w przypadku braku wykrycia przez przeglądarkę fizycznej obsługi wielokanałowej karty dźwiękowej (`maxChannelCount` < 4) interfejs konfiguracyjny wyjść fizycznych Out 3–4 ma być całkowicie ukryty w UI, zgodnie z zasadą braku atrap z ADR 0015?**  
   _(Tak / Nie)_

---

## E) Szczegółowa Analiza Problemów Strategicznych i Pytań Produktowych

### 1. Wpływ Reguły „Logic-First” na Tożsamość Produktu Scenicznego

Przyjęcie stacji Logic Pro jako nadrzędnego wzorca projektywnego tworzy bezpośrednie zagrożenie dla tożsamości StageSync jako niezawodnego silnika koncertowego . Występuje tu fundamentalny konflikt pomiędzy wymaganiami oprogramowania studyjnego a specyfiką pracy na żywo.

| Cecha Architektury       | Studio DAW (np. Logic Pro)                             | Silnik Sceniczny (StageSync)                          |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------------------- |
| **Główny Priorytet**     | Elastyczność kreacji, niedestrukcyjna edycja           | Determinizm, zero latencji, absolutna stabilność      |
| **Topologia Miksowania** | Złożone kaskady DAG (Track -> Bus -> Bus -> Master)    | Prosty, płaski routing (Track -> Master / Direct Bus) |
| **Obróbka Czasowa**      | Rozciąganie w czasie w czasie rzeczywistym (Flex Time) | Statycznie przeliczone bufory audio, stałe tempo      |
| **Obsługa Błędów**       | Dopuszczalne chwilowe przeciążenie CPU / buforowanie   | Bezwzględny zakaz przerwania odtwarzania na scenie    |

Kopiowanie rozwiązań z Logic Pro rodzi konkretne koszty inżynieryjne:

- **Narzut routingu bus-to-bus:** Wprowadzenie wielostopniowego przekierowywania sygnałów wymusza implementację ciągłego sprawdzania cykli w grafie połączeń (DFS) . W warunkach koncertowych skomplikowany routing zwiększa ryzyko wyciszenia toru przez pomyłkę realizatora .
- **Złożoność wsparcia Multi-Out:** Dążenie do studyjnego parytetu wielokanałowego natrafia na ograniczenia przeglądarkowego API WebAudio . Próby budowania wirtualnych krosownic w interfejsie bez gwarancji sprzętowej ze strony systemu operacyjnego prowadzą do niestabilności .
- **Iluzja zaawansowanej edycji:** Deklarowanie późniejszego wdrożenia funkcji Flex Time czy rejestracji MIDI rozprasza uwagę zespołu . Silnik koncertowy wymaga dopracowania mechanizmów bezprzerwowego przełączania na serwer zapasowy (Safety Net) oraz precyzyjnego wyzwalania komend, a nie studyjnej obróbki fali dźwiękowej .

Referencja do Logic Pro powinna dotyczyć wyłącznie sprawdzonych gestów edycyjnych na Timeline (obsługa nożyczek, przycinanie brzegów klipów, zaznaczanie obszarów), z kategorycznym wyłączeniem architektury miksowania i zarządzania czasem .

---

### 2. Architektura Console na Androidzie: Pełny Host vs Dedykowany Laptop FOH

Decyzja o przekształceniu aplikacji StageSync Console dla systemu Android w pełny odpowiednik wersji desktopowej z lokalnym serwerem Node.js jest błędna architektonicznie .

| Wymiar Porównawczy         | Dedykowany Laptop / Server FOH                     | Android Console (Lokalny Host)                            |
| -------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| **Środowisko Wykonawcze**  | macOS / Windows / Linux (CoreAudio / ASIO)         | Android NDK / `libnode` (JNI Wrapper)                     |
| **Obsługa Sprzętowa MIDI** | Natywna obsługa wieloportowych interfejsów         | Brak wsparcia serwerowego (`STAGESYNC_MIDI_BACKEND=none`) |
| **Zarządzanie Pamięcią**   | Stała alokacja, brak agresywnego uśpienia procesów | Agresywne zamykanie procesów tła przez OS                 |
| **Rola na Scenie**         | Centralna jednostka przeliczeniowa i wykonawcza    | Mobilny kontroler zdalny w rękach realizatora             |

Forsowanie pełnego hosta na tablecie wiąże się z nieakceptowalnymi ryzykami:

- **Niestabilność procesu tła:** Mimo zastosowania usługa typu Foreground Service, mobilny system operacyjny w sytuacjach niedoboru pamięci RAM może wyrejestrować proces serwerowy `:host`, co na scenie oznacza natychmiastowe przerwanie widowiska .
- **Brak natywnego I/O:** Android nie zapewnia stabilnego środowiska dla serwerowej obsługi portów MIDI czy wielokanałowych kart dźwiękowych o niskiej latencji . Lokalny host na tablecie staje się w ten sposób silnikiem ułomnym, pozbawionym kluczowych możliwości komunikacji ze sprzętem estradowym .
- **Bariera technologiczna 16 KB:** Nowe wymagania systemu Android dotyczące wyrównania stron pamięci w bibliotekach natywnych powodują, że utrzymanie kompilacji `libnode` wymaga ciągłych nakładów pracy inżynieryjnej bez wyraźnej korzyści dla jakości widowiska .

Rola tabletu FOH musi zostać ograniczona do klienta zdalnego, połączonego przewodowo lub przez bezprzewodową sieć LAN ze stabilnym serwerem głównym .

---

### 3. Model Zaufania w Sieci LAN: OAuth OUT vs Operator PIN

Wycofanie architektury OAuth na rzecz prostego kodu Operator PIN w wersji 5.2 jest decyzją w pełni dojrzałą i dostosowaną do realiów estradowych .

Na koncertach infrastruktura sieciowa ma charakter zamknięty i odizolowany od świata zewnętrznego . Wdrażanie w takim środowisku protokołów OAuth 2.0 / JWT niesie za sobą poważne konsekwencje:

- Protokoły te wymagają dostępności zewnętrznych dostawców tożsamości (IdP) lub skomplikowanej logiki lokalnego odświeżania tokenów, co w zamkniętej sieci bez dostępu do Internetu stwarza dodatkowe punkty awarii.
- W przypadku utraty i ponownego nawiązania połączenia Wi-Fi przez tablet, proces ponownej autoryzacji tokenem OAuth może wprowadzić zauważalne opóźnienia, uniemożliwiając natychmiastową reakcję realizatora.

Wdrożenie mechanizmu `STAGESYNC_OPERATOR_PIN` rozwiązuje kluczowe problemy bezpieczeństwa scenicznego :

- Skutecznie blokuje dostęp do destrukcyjnych punktów końcowych API (zapis projektu, zmiana setlisty, kasowanie klipów) osobom niepowołanym podłączonym do sieci wykonawczej .
- Pozwala na błyskawiczne odblokowanie konsoli przez realizatora bez konieczności wpisywania skomplikowanych danych logowania .
- Nie obciąża stosu sieciowego zbędnymi zapytaniami autoryzacyjnymi podczas przesyłania komend transportowych .

Adresowania wymaga jedynie kwestia zabezpieczenia samej warstwy fizycznej transmisji . Przesyłanie kodu PIN w nagłówku HTTP wymaga, aby sieć koncertowa była siecią zamkniętą z szyfrowaniem WPA3 lub aby komunikacja pomiędzy hostem a konsolem była zabezpieczona warstwą TLS.

---

### 4. Abstrakcja Cues Sampler vs Architektura QLab Audio Cue

Decyzja o rozszerzeniu istniejącej struktury `CueClip` o obsługę odtwarzania próbek audio (zamiast tworzenia osobnego typu `SamplerClip`) oraz ograniczeniu routingu do relacji Master|Bus stanowi właściwy krok projektowy .

| Cecha Modelu          | QLab Audio Cue (Matrycowy)                | StageSync CueClip (Liniowy)                    |
| --------------------- | ----------------------------------------- | ---------------------------------------------- |
| **Struktura Danych**  | Niezależny obiekt w sekwencji zdarzeń     | Klip zakotwiczony na osi czasu (integer ticks) |
| **Krosownica Audio**  | Swobodna matryca N x M per Cue            | Routing ograniczony do Master lub Bus          |
| **Sposób Wyzwalania** | Ręczny (krok po kroku) lub asynchroniczny | Zsynchronizowany z czasem i siatką tempa       |
| **Zastosowanie**      | Teatr, słuchowiska, zmienna dramaturgia   | Koncerty, zespoły muzyczne, show z podkładem   |

Stosowanie matrycowej architektury znanej z programu QLab byłoby dla StageSync niepotrzebnym skomplikowaniem domeny. QLab projektowano z myślą o spektaklach teatralnych, gdzie zdarzenia dźwiękowe są wyzwalane asynchronicznie przez operatora. StageSync jest silnikiem zorientowanym na oś czasu i siatkę taktomierza .

Rozszerzenie klipu `CueClip` o możliwość podłączenia próbki audio niesie za sobą konkretne zalety :

- **Spójność interfejsu:** Operator nie musi zarządzać osobną ścieżką dla komunikatów głosowych czy efektów — wszystko znajduje się na dedykowanej linii znacznika .
- **Bezpieczeństwo routingu:** Ograniczenie kierowania sygnału próbki wyłącznie do wyjścia głównego lub zdefiniowanej podgrupy (Bus) eliminuje ryzyko powstawania pętli sprzężeń i upraszcza architekturę miksera .
- **Minimalny narzut obliczeniowy:** Silnik odtwarzania traktuje próbki z klipów Cue jako lekkie bufory odtwarzane wprost do wyznaczonego węzła, bez konieczności dynamicznego przeliczania skomplikowanych grafów WebAudio .

---

Powered by [AI Exporter](https://saveai.net)

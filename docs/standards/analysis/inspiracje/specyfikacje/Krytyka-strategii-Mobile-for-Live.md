> From: https://gemini.google.com/app/7e261ed8bd7b2b5e

Ocena Strategii Mobile StageSync

# Krytyczny raport strategii Mobile-for-Live w StageSync v5.2+: Ocena ADR 0016, sprzeczności z paradygmatem Logic-First i analiza dojrzałości operacyjnej

## Wprowadzenie i architektura strategiczna mobile

Wprowadzenie etapu `5.2+` (Pocket Stage) w architekturze StageSync przyniosło przewartościowanie sposobu, w jaki system obsługuje urządzenia mobilne na scenie oraz na stanowisku realizatora Front of House (FOH) . Dokumenty architektoniczne ADR 0015 oraz ADR 0016 formalizują podział na dwa dedykowane produkty mobilne w monorepo: pasywny terminal sceniczny StageSync Performer (`apps/performer`) oraz zaawansowaną konsolę operatorską StageSync Console (`apps/console`) .

Podstawowym założeniem tej strategii jest odrzucenie powłok hybrydowych typu Capacitor czy Cordova traktowanych jako warstwa automatycznie rozwiązująca dostęp do natywnych interfejsów programistycznych API, na rzecz czystych powłok Kotlin WebView ładujących zoptymalizowane jednostronicowe aplikacje webowe (`apps/web`) . Aplikacje te są dystrybuowane w modelu bezpośredniego pobierania (sideloading) z wykluczeniem sklepu Google Play .

Krytyczna analiza pięciu filarowych decyzji architektonicznych ADR 0016 i triage Mobile wskazuje na zróżnicowany poziom dojrzałości poszczególnych założeń :

1. **Performer:** Dedykowany, pasywny klient read-only (`/client`) pozbawiony lokalnego silnika hosta .
2. **Console:** Pełnoprawny odpowiednik desktopu (Admin + Timeline + Client + lokalny host), zastępujący wcześniejsze założenie cienkiego shella (thin-shell superseded) .
3. **Dystrybucja:** Pliki `.apk` serwowane bezpośrednio z poziomu hosta (`/downloads/stagesync-*.apk`) oraz GitHub Releases z całkowitym pominięciem Google Play .
4. **Offline-First Hybrid:** Lokalne wbudowanie zasobów w APK z jawnym dialogiem „Zastosuj nowy interfejs” przy niezgodności skrótów weryfikacyjnych UI (zakaz cichej synchronizacji mid-set) .
5. **Restrykcje audio/MIDI:** Całkowity zakaz generowania audio, zegara MIDI oraz syntezy na tablecie Performer .

| Decyzja Architektoniczna              | Stan w Projekcie            | Rekomendowany Status | Główne Uzasadnienie                                                                        |
| :------------------------------------ | :-------------------------- | :------------------- | :----------------------------------------------------------------------------------------- |
| **1. Performer Read-Only**            | Wdrożone (`apps/performer`) | **KEEP**             | Izolacja sceniczna, ochrona transportu SSOT przed zakłóceniami .                           |
| **2. Console Full Parity + Host**     | Wdrożone (`apps/console`)   | **REVISE**           | Parytet UI jest właściwy, ale lokalny host na Androidzie stoi w sprzeczności z multi-out . |
| **3. Sideload APK z Hosta**           | Wdrożone (`/downloads`)     | **KEEP**             | Niezależność od WAN/Google Play w zamkniętych sieciach koncertowych .                      |
| **4. Offline-First + Explicit Apply** | Wdrożone (`ui-manifest`)    | **KEEP**             | Ochrona stabilności interfejsu podczas trwania występów .                                  |
| **5. Brak Audio/MIDI na Performerze** | Wdrożone (SSOT Server)      | **KEEP**             | Eliminacja dryfu zegara, znikome obciążenie CPU/baterii na scenie .                        |

---

## Ocena i weryfikacja decyzji architektonicznych ADR 0016

### Decyzja 1: Performer jako Client-only read-only bez lokalnego hosta (KEEP)

Przekształcenie aplikacji StageSync Performer w czysty, pasywny odbiornik danych stanowych stanowi przemyślany krok architektoniczny . Muzyk na scenie wymaga niezawodnego i czytelnego podglądu przypisanej roli (Grid/Akordy, Karaoke/Tekst, Score/Partytura, Drums/Forma) . Zmuszanie tabletu scenicznego do utrzymywania lokalnej logiki transportu lub sidecara prowadziłoby do desynchronizacji stref czasowych oraz zbędnego zużycia energii . Zgodnie ze specyfikacją MOB-01 i MOB-02, jedynym autorytetem czasu muzycznego w systemie jest serwer (Timebase SSOT) . Klient mobilny wygładza pozycję wskaźnika odtwarzania (playhead) wyłącznie poprzez pętlę `requestAnimationFrame` (rAF) na podstawie ramek `transport_tick` przesłanych przez WebSocket .

### Decyzja 2: Console jako pełny odpowiednik desktopu z lokalnym hostem (REVISE)

Decyzja ta wymaga korekty w zakresie definicji granic wykonywalnych lokalnego hosta na systemie Android . O ile wymóg parytetu interfejsu użytkownika — rozumiany jako pełny dostęp do widoków Admin, Timeline oraz Client z poziomu tabletu realizatora — jest kluczowy operacyjnie, o tyle obietnica pełnego parytetu wykonawczego (uruchamianie produkcyjnego silnika odtwarzania audio i sygnałów zegarowych bezpośrednio na tablecie z Androidem) tworzy nierealistyczne założenia wydajnościowe .

Podstawowy problem polega na charakterystyce mobilnego systemu operacyjnego Android, który nie posiada deterministycznego zarządcy wątków czasu rzeczywistego ani podsystemu audio klasy CoreAudio . Deklaracja pełnego parytetu hosta bez uwzględnienia barier sprzętowo-programowych naraża system na ryzyko dławienia termicznego (thermal throttling) oraz usypiania wątków procesów w tle przez mechanizmy oszczędzania energii (Doze Mode) . Status tej decyzji należy zmienić na **REVISE**: StageSync Console na Androidzie w warunkach koncertowych musi działać domyślnie jako Remote Shell (zdalna konsola sterująca dedykowanym hostem sprzętowym w racku), podczas gdy opcja uruchomienia lokalnego hosta na tablecie powinna być traktowana jako awaryjny tryb jednokanłowy o ograniczonym zaufaniu .

### Decyzja 3: Dystrybucja .apk z hosta/Releases bez Google Play (KEEP)

W warunkach koncertowych infrastruktura sieciowa na scenie i w reżyserce działa w trybie pełnej izolacji od zewnętrznego Internetu (Air-Gapped Network) . Poleganie na sklepie Google Play, usługach Google Play Services czy weryfikacji licencji online w trakcie trwania trasy koncertowej stwarza niedopuszczalne ryzyko operacyjne . Dystrybucja plików `.apk` bezpośrednio przez wbudowany serwer HTTP hosta (`/downloads/stagesync-performer.apk` oraz `...-console.apk`) wspierana przez skanowanie kodów QR w panelu Admina tworzy w pełni samowystarczalny ekosystem . Operator może w kilka sekund wdrożyć nowy tablet do systemu bez konieczności konfiguracji zewnętrznych kont użytkownika .

### Decyzja 4: Offline-First z jawnym dialogiem „Zastosuj” (KEEP)

Mechanizm hybrydowy Offline-First rozwiązuje problem niestabilności bezprzewodowych sieci Wi-Fi w obiektach widowiskowych . Wbudowanie statycznych zasobów interfejsu wewnątrz pakietu APK sprawia, że aplikacja startuje natychmiastowo z lokalnego bufora . Kluczowym zabezpieczeniem jest rygorystyczny zakaz cichego przeładowywania drzewa DOM w trakcie trwania koncertu . Gdy host posiada nowszą wersję UI (wykrytą na podstawie skrótu `uiHash` w odpowiedzi `GET /api/health`), powłoka mobilna wyświetla jawny dialog „Zastosuj nowy interfejs” lub „Później” . Zabezpiecza to system przed sytuacją, w której chwilowy spadek jakości sygnału Wi-Fi i ponowne połączenie w trakcie wykonywania utworu przeładowuje interfejs i czyści widok muzyka .

### Decyzja 5: Brak Audio/MIDI na tablecie Performer (KEEP)

Wykluczenie generowania dźwięku i komunikatów zegara MIDI na tabletach wykonawców jest architektonicznie uzasadnione . Próba synchronizacji wielokanałowych strumieni audio lub generowania metronomu bezpośrednio na procesorach tabletów bezprzewodowych prowadziłaby do dryfu fazowego i niestabilności . Pasywny terminal ma wyłącznie renderować wizualne repetytorium dla muzyka, oszczędzając baterię i zasoby obliczeniowe CPU .

---

## Analiza wzorców rynkowych: Performer (OnSong/forScore) vs. Console (GO Remotes)

W branży technologii estradowych wykształciły się dwa odmienne wzorce projektowe dla aplikacji mobilnych. Niezrozumienie granic między tymi wzorcami prowadzi do błędów w założeniach architektonicznych.

Aplikacje klasy Performer, takie jak OnSong, forScore czy MobileSheets, służą do prezentacji materiałów nutowych, tekstów i akordów . Działają one w oparciu o pliki statyczne (np. PDF, ChordPro) lub odbieranie prostych sygnałów zmiany stron via Bluetooth bądź sieć LAN, cechując się znikim obciążeniem procesora i brakiem integracji z niskopoziomowym audio DAW. StageSync Performer wpisuje się w ten model, rozszerzając go o precyzyjną synchronizację wskaźnika odtwarzania z serwerem poprzez ramki WebSocket i pętlę rAF .

Z kolei aplikacje klasy GO Remotes, takie jak Mixing Station, Yamaha StageMix czy Soundcraft ViSi, służą do zdalnej kontroli konsolet mikserskich i procesorów DSP z dowolnego miejsca w obiekcie. Ich kluczową cechą jest pełna separacja silnika od kontrolera: aplikacja na tablecie stanowi wyłącznie bezprzewodową powierzchnię sterującą (Control Surface), podczas gdy całość przetwarzania sygnałów audio, sumowania magistrali oraz generowania zegarów odbywa się w dedykowanej jednostce sprzętowej montowanej w racku. Utrata sygnału Wi-Fi na tablecie realizatora nie przerywa odtwarzania dźwięku ani nie zmienia parametrów miksu.

StageSync Console w założeniach ADR 0016 próbuje połączyć oba światy: pełnić funkcję bezprzewodowej konsoli sterującej (GO Remote) przy jednoczesnym posiadaniu zdolności do stania się pełnoprawnym hostem (silnikiem wykonawczym) .

| Cecha / Wymiar         | OnSong / forScore                   | GO Remotes (np. Mixing Station)            | StageSync Performer           | StageSync Console                     |
| :--------------------- | :---------------------------------- | :----------------------------------------- | :---------------------------- | :------------------------------------ |
| **Główna rola**        | Prompter tekstowo-nutowy            | Zdalna kontrola DSP / Miksera              | Pasywny terminal sceniczny    | Kontroler FOH / Opcjonalny Host       |
| **Generowanie Audio**  | Brak lub lokalny plik backing track | Brak (całość audio w racku)                | **Zakaz** (audio na hoście)   | Zdalne (lub lokalne na urządzeniu)    |
| **Zegar / Transport**  | Własny lub prosty MIDI Sync         | Brak (przetwarzanie w czasie rzeczywistym) | Odbiornik SSOT z serwera      | Master (przy host) / Remote Control   |
| **Model Sieciowy**     | P2P / Wi-Fi Sync                    | Zdalny klient UDP/TCP do IP Miksera        | Klient WS do hosta StageSync  | Klient WS/HTTP / Lokalny loopback     |
| **Wpływ awarii Wi-Fi** | Zmiana stron zatrzymana             | Miks gra dalej, brak kontroli              | Zamrożenie wskaźnika playhead | Miks gra na hoście / Awaria gdy local |

---

## Największa sprzeczność architektoniczna: Mobile Console Host vs. Logic-First i Multi-out

Analiza powiązań pomiędzy ADR 0015 i ADR 0016 ujawnia sprzeczność techniczną i koncepcyjną. ADR 0015 definiuje dwa stałe filary produktu :

1. **Reguła referencji Logic Pro:** W sytuacjach wątpliwości UX i logiki edycji pierwszą referencją mechanik DAW jest Logic Pro .
2. **Multi-out (Out 3–4+):** Oficjalna decyzja o wprowadzeniu wielokanałowego audio (klasyczny DAW multitrack) jako funkcji wpisanej w rdzeń systemu .

Wydajny system odtwarzania ścieżek typu Multi-out — w którym osobne, dyskretne wyjścia fizyczne kierowane są na metrnom (Click), ścieżki podkładowe (Backing Tracks Stereo), bębny czy instrumenty klawiszowe — wymaga spełnienia rygorystycznych warunków determinizmu czasowego.

System Android został zaprojektowany głównie z myślą o konsumpcji multimediów w układzie dwukanałowym. Mimo rozwoju bibliotek niskopoziomowych, obsługa zewnętrznych wielokanałowych interfejsów USB Audio na systemie Android charakteryzuje się niestabilnością sterowników, ograniczeniami buforowania oraz zmienną latencją zależną od obciążenia procesora przez wątki systemowe. Logic Pro opiera swoją niezawodność na architekturze CoreAudio macOS, która gwarantuje bezpośredni dostęp do sprzętu z wysokim priorytetem wątków czasu rzeczywistego (Real-Time Scheduling). Uruchomienie produkcyjnego silnika odtwarzania na Androidzie oznacza, że operacje wejścia/wyjścia audio i dekodowanie plików muszą konkurować z zarządcą zasobów systemu operacyjnego .

Dodatkowo, w przeciwieństwie do stacji roboczych zasilanych ze stałego źródła prądu, podświetlenie ekranu tabletu na maksimum połączone z nagrzewaniem się urządzenia na scenie prowadzi do dławienia termicznego CPU. Dławienie zegara procesora przy aktywnym strumieniowaniu wielu kanałów audio z dysku doprowadzi do gwałtownego zaniku bufora (buffer underrun), objawiającego się trzaskami lub zatrzymaniem odtwarzania w trakcie koncertu.

Z tego powodu forsowanie koncepcji, w której Android Console z lokalnym hostem miałby pełnić funkcję głównego odtwarzacza wielokanałowego na scenie, pozostaje w bezpośredniej sprzeczności z deklaracją wprowadzenia wielokanałowego audio klasy Logic Pro . StageSync Console sprawdza się jako Remote Shell sterujący hostem uruchomionym na komputerze Mac/PC lub w dedykowanym kontenerze Linux w racku, ale nie jako fizyczny węzeł przetwarzający multitrack audio .

---

## Ocena operacyjna: FOH na tablecie (Console) vs. FOH na laptopie

Wybór między tabletem a laptopem na stanowisku FOH nie sprowadza się do wyboru jednego urządzenia, lecz do podziału systemu na warstwę wykonawczą (Processing Engine) i warstwę prezentacji (User Interface).

Stanowisko oparte na laptopie (macOS/Windows) usytuowanym w racku lub na konsolecie FOH oferuje zalety, których tablet nie jest w stanie zapewnić w profesjonalnych warunkach koncertowych. Należą do nich bezpośrednia obsługa magistrali Thunderbolt/USB z interfejsami audio wspierającymi masowe wyjścia wielokanałowe, precyzja edycji osi czasu przy użyciu fizycznej klawiatury i myszy oraz stałe zasilanie połączone z kablową siecią LAN Ethernet .

Z kolei tablet z aplikacją Console jest niezastąpiony, gdy realizator musi opuścić stanowisko i dokonać korekt brzmienia lub odsłuchu z poziomu widowni bądź sceny (Virtual Soundcheck / Live Adjustments). Uzależnienie całego widowiska od stabilności procesora tabletu FOH stwarza niepotrzebne ryzyko . FOH na tablecie (Console) jest właściwą decyzją wyłącznie jako bezprzewodowa końcówka interfejsu (Remote Shell) . Fizyczny host odpowiedzialny za odtwarzanie audio i wysyłanie komunikatów MIDI musi znajdować się na dedykowanym komputerze lub serwerze rackowym .

---

## Pytania i rekomendacje dla Product Ownera (PO)

W celu usunięcia niejasności architektonicznych oraz wyeliminowania ryzyka wdrożeniowego, PO powinien przeanalizować następujące kwestie decyzyjne:

1. **Zakres funkcji Hosta na Androidzie:** Czy akceptujemy oficjalne ograniczenie roli lokalnego hosta na systemie Android (Console) do funkcji trybu awaryjnego lub demonstracyjnego (praca mono/stereo), przy jednoczesnym wyznaczeniu platform macOS/Linux/Windows jako jedynych certyfikowanych środowisk dla odtwarzania wielokanałowego Multi-out (Out 3–4+)?
2. **Standardy łączności na stanowisku FOH:** Czy dla stanowiska Console FOH wprowadzamy oficjalną rekomendację operatorską wymagającą stosowania dedykowanych adapterów USB-to-Ethernet (połączenie kablowe LAN do tabletu) podczas realizacji imprez masowych, chroniąc łączność przed zagłuszeniem pasma Wi-Fi przez publiczność?
3. **Zabezpieczenie przeładowania interfejsu mid-set:** Czy dialog „Zastosuj nowy interfejs” (Offline-First Hybrid UI) ma posiadać blokadę uniemożliwiającą jego zatwierdzenie, gdy stan transportu na hoście wynosi `PLAYING`, chroniąc system przed przypadkowym wywołaniem przeładowania DOM w trakcie utworu?
4. **Strategia iOS dla linii Performer:** W ślad za planowanym etapem 5.3+ dla aplikacji Performer na iOS, czy podtrzymujemy decyzję o zakazie przenoszenia silnika Hosta na platformę Apple iOS (z uwagi na ograniczenia procesów w tle), utrzymując iOS wyłącznie w roli pasywnego klienta?

---

## Wnioski i rekomendacje strategiczne

Strategia Mobile-for-Live w StageSync v5.2+ przedstawia prawidłowy podział ról w ekosystemie scenicznym, pod warunkiem zachowania dyscypliny w definicji granic sprzętowych .

Architektura StageSync Performer jako pasywnego terminala read-only — pozbawionego lokalnego audio i MIDI, opartego na zegarze SSOT z serwera i wygładzaniu rAF — stanowi rozwiązanie w pełni dostosowane do potrzeb muzyków na scenie . W przypadku StageSync Console należy wyraźnie rozdzielić parytet interfejsu użytkownika (Admin/Timeline/Client) od funkcji silnika wykonawczego . Console na Androidzie jest skutecznym narzędziem zdalnej kontroli (Remote Control), ale nie powinien być pozycjonowany jako główny węzeł audio dla konfiguracji wielokanałowych . Priorytetem dla dalszych etapów rozwoju musi pozostać dopracowanie natywnej obsługi wielokanałowej (Out 3–4+) na serwerze desktopowym i kontenerowym, przy zachowaniu sprawdzonego modelu hybrydowego Offline-First dla urządzeń mobilnych .

---

Powered by [AI Exporter](https://saveai.net)

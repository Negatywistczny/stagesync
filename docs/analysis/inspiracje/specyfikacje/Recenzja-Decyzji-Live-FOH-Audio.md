> From: https://gemini.google.com/app/89e3268136945bb9

Ocena Decyzji Routingu FOH

# Ocena Produktowa i Architektoniczna Subsystemu Routingu StageSync v5.2+: Perspektywa Realizatora Live FOH

Ewolucja silnika miksowania w systemie StageSync z wydania v5.1 do linii v5.2+ wyznacza przejście od uproszczonego sumowania sygnałów do wielokanałowego silnika miksowania scenicznego i estradowego . Dotychczasowe ograniczenia architektury v5.1 narzucały sztywny kierunek sygnału: ścieżki audio mogły być przekierowane do sumy Master lub pojedynczej szyny grupy, podczas gdy same szyny grupowe oferowały wyłącznie wysyłkę do sumy Master . Nowa specyfikacja v5.2+ wprowadza obsługę dyskretnych wyjść fizycznych (Out 3–4+) oraz zagnieżdżony routing szyn grupy w relacji szyna-do-szyny (bus-to-bus) .

Praca w warunkach koncertowych na żywo (Front of House) stawia oprogramowaniu uruchamianemu w przeglądarce internetowej unikalne wymagania . Silnik oparty na pojedynczej instancji `AudioContext` z przełączaniem urządzeń za pomocą API `setSinkId` musi zagwarantować bezprzerwową pracę, stabilność zegara audio oraz pełne bezpieczeństwo operacyjne . W tym kontekście serwer aplikacji pełni rolę jedynego źródła prawdy (Single Source of Truth – SSOT) dla stanu projektu i czasu, podczas gdy cały proces renderowania audio odbywa się w kliencie WebAudio . Poniższa analiza stanowi niezależną ocenę produktową i architektoniczną czterech kluczowych decyzji dotyczących routingu w StageSync v5.2+, skonfrontowaną ze standardami rynkowymi cyfrowych stacji roboczych (DAW) i sekwencerów teatralnych, ze szczególnym uwzględnieniem wytycznych ADR 0011 oraz ADR 0015 .

---

## Ocena Decyzji 1: Wprowadzenie Wielokanałowych Wyjść Fizycznych Multi-out (Out 3–4+) [CRIT-OUT-01]

### Werdykt

**REVISE** (Zrewidować kryteria aktywacji w runtime przed oficjalnym wdrożeniem).

Oficjalne wprowadzenie wyjść wielokanałowych (Out 3–4, Out 5–6 i kolejnych) jest niezbędnym krokiem dla oprogramowania dedykowanego do obsługi sceny . Realizator FOH oraz inżynier systemu odsłuchowego (IEM) wymagają dyskretnych torów wyjściowych do wyprowadzenia metronomu, podkładów muzycznych czy niezależnych miksów scenicznych . Jednakże sama decyzja produktowa o wdrożeniu multi-out wymaga doprecyzowania w obszarze detekcji możliwości środowiska uruchomieniowego .

### Dowód i Analiza Porównawcza vs DAW (Logic / Ableton / MainStage / QLab)

Współczesne oprogramowanie muzyczne i teatralne realizuje wyjścia izometryczne w zróżnicowany sposób:

- **Ableton Live**: Zapewnia sekcję _External Audio Out_, umożliwiając przypisanie dowolnego kanału lub szyny powrotnej do dyskretnych portów wyjściowych sterownika ASIO/CoreAudio .
- **Apple Logic Pro**: Wykorzystuje dedykowane paski kanałów wyjściowych (_Output Channel Strips_), traktując wyjścia fizyczne jako tory z pełną regulacją wzmocnienia, wskaźnikami poziomu i sekcją Solo/Mute .
- **Apple MainStage**: Umożliwia przypisywanie wyjść fizycznych bezpośrednio na poziomie pojedynczych torów audio w ramach koncertu .
- **Figure 53 QLab**: Wykorzystuje macierz krosowniczą (_Audio Patch Matrix_), gdzie ścieżki i cues są mapowane na wyjścia dyskretne z możliwością edycji nazw portów .

### Ocena Analogii Studio DAW dla StageSync

Analogia do tradycyjnego studio DAW jest w tym miejscu **BŁĘDNA i NIEBEZPIECZNA**. Klasyczny DAW działa w środowisku, w którym sterownik niskiego poziomu (ASIO/CoreAudio) udostępnia stałą, znaną liczbę fizycznych kanałów wyjściowych karty dźwiękowej . W przypadku StageSync silnik audio jest osadzony w przeglądarce internetowej i korzysta z WebAudio API oraz `setSinkId` .

Słabym punktem przetrzymywania prostej analogii DAW jest fakt, że przeglądarki internetowe (np. Chrome) w systemach macOS oraz Windows bardzo często raportują maksymalną liczbę kanałów urządzenia wyjściowego (`destination.maxChannelCount`) jako 2 (stereo), dopóki operator nie dokona manualnej zmiany konfiguracji głośników w systemie operacyjnym (np. ustawienie układu Quadraphonic, 5.1 lub 7.1 w programie _Konfigurator Audio MIDI_ na macOS) . Przyjęcie założenia z DAW, że porty Out 3–4 są zawsze dostępne po podłączeniu karty wielokanałowej, prowadzi w WebAudio do cichego gubienia sygnału lub błędnego sumowania kanałów . Wdrożenie multi-out w StageSync wymaga wprowadzenia mechanizmu wykrywania ograniczeń systemu operacyjnego i twardego uzależnienia dostępności wyjść w UI od stanu parametru `maxChannelCount >= 4` .

### Pytania Q&A do Product Ownera (PO)

1. Jak system ma zachować się na scenie w sytuacji, gdy podłączony interfejs 8-kanałowy zgłosi w przeglądarce wartość `destination.maxChannelCount = 2` z powodu braku wielokanałowej konfiguracji głośników w systemie operacyjnym ? Czy FOH powinien otrzymać blokujący komunikat diagnostyczny z instrukcją krok po kroku?
2. W przypadku nagłego odłączenia interfejsu wielokanałowego podczas trwania koncertu (np. awaria kabla USB), czy wyjścia wyizolowane Out 3–4 mają ulec całkowitemu wyciszeniu (_fail-safe mute_), czy automatycznemu zsumowaniu do wyjścia głównego Master (co grozi wypuszczeniem metronomu na system FOH) ?
3. Czy wyjścia sprzętowe Out 3–4 mają posiadać własne tłumiki wzmocnienia (Gain/Trim) oraz dedykowaną sekcję Mute/Solo widoczną w mikserze głównym, czy mają stanowić jedynie pasywne punkty krosownicze ?

---

## Ocena Decyzji 2: Rozszerzenie Routingu Szyna–Szyna (Bus-to-Bus) [CRIT-OUT-02]

### Werdykt

**KEEP** (Zachować – funkcja kluczowa do budowania podgrup scenicznych, pod warunkiem bezwzględnej kontroli acykliczności ).

Umożliwienie kierowania sygnału z szyny grupy do innej szyny (kaskadowanie zagnieżdżone) znosi ograniczenie miksera v5.1, w którym szyny mogły być wysyłane wyłącznie do sumy Master . W praktyce koncertowej tworzenie podgrup (np. `Bębny` $\rightarrow$ `Całość Muzyka` $\rightarrow$ `Master`) jest podstawowym mechanizmem organizacji miksu na żywo .

### Dowód i Analiza Porównawcza vs DAW (Logic / Ableton / MainStage / QLab)

Wszystkie wiodące systemy produkcyjne i sceniczne wspierają hierarchiczny routing szyn :

- **Apple Logic Pro**: Oferuje pełne, wielopoziomowe sumowanie w oparciu o szyny pomocnicze (Aux Busses) i podgrupy bez sztucznych ograniczeń głębokości .
- **Ableton Live**: Realizuje zagnieżdżanie poprzez tworzenie grup wewnątrz grup (Nested Group Tracks) .
- **Apple MainStage**: Wykorzystuje szyny zbiorcze do przetwarzania wspólnej dynamiki oraz grup odsłuchowych .
- **Figure 53 QLab**: Umożliwia tworzenie kaskadowych węzłów audio z zachowaniem sumowania wzmocnienia .

### Ocena Analogii Studio DAW dla StageSync

Analogia do studio DAW jest **BŁĘDNA w obszarze obsługi pętli sprzężeń zwrotnych (feedback loops)**. W tradycyjnych stacjach DAW architektura silnika audio pozwala na tworzenie zamkniętych pętli sygnałowych z wykorzystaniem wtyczek opóźniających (Delay) lub posiada skomplikowane algorytmy kompensacji latencji .

W przypadku scenicznego silnika WebAudio utworzenie cyklu w grafie połączeń (np. Bus A $\rightarrow$ Bus B $\rightarrow$ Bus A) bez węzła opóźniającego wywołuje natychmiastowe przesterowanie cyfrowe (0 dBFS digital feedback), nieprzewidywalne przesunięcia fazowe lub natychmiastowe zawieszenie wątku renderowania audio w przeglądarce . StageSync nie może przejąć swobody routingu ze studio DAW. Graf połączeń miksera musi być bezwzględnie weryfikowany jako Skierowany Graf Acykliczny (DAG) . Zapis pętli musi być twardo odrzucany przez parser Zod na serwerze SSOT (`fail-fast`), a silnik audio w kliencie musi posiadać zabezpieczenie przełączające felerne połączenie na Master w przypadku wyścigu stanów (`fail-soft fallback`) .

### Pytania Q&A do Product Ownera (PO)

1. Czy w przypadku aktywacji funkcji Solo na ścieżce skierowanej do szyny zagnieżdżonej (np. `Ścieżka` $\rightarrow$ `Bus 1` $\rightarrow$ `Bus 2` $\rightarrow$ `Master`) utrzymujemy regułę _track solo wins_, z automatycznym przepuszczaniem sygnału przez wszystkie szyny nadrzędne w górę drzewa DAG ?
2. Czy wprowadzamy sztywny limit maksymalnej głębokości zagnieżdżenia szyn (np. maksymalnie 3 poziomy kaskady), aby zapobiec nadmiernemu obciążeniu CPU na słabszych laptopach realizatorskich ?
3. W jaki sposób interfejs użytkownika miksera ma wizualizować hierarchię zagnieżdżenia szyn, aby realizator FOH podczas pracy na żywo jednoznacznie odróżniał szynę podgrupy od szyny wyjściowej ?

---

## Ocena Decyzji 3: Brak Atrap Out w UI do Czasu Realnego Runtime (ADR 0011) [CRIT-OUT-03]

### Werdykt

**KEEP** (Zachować – fundamentalna zasada bezpieczeństwa pracy na scenie ).

Zasada ustanowiona w ADR 0011 zabrania tworzenia atrap interfejsu (stubs/fake UI), nieaktywnych kontrolek z napisami typu "wkrótce" oraz przycisków w stanie `disabled` umieszczanych w interfejsie "na zapas" . Opcje wyjściowe w mikserze mogą się pojawić wyłącznie wtedy, gdy funkcja jest w pełni obsłużona przez model danych oraz środowisko uruchomieniowe WebAudio .

### Dowód i Analiza Porównawcza vs DAW (Logic / Ableton / MainStage / QLab)

Wdrażanie rygorystycznego zarządzania widocznością kontrolek jest standardem w systemach o krytycznym znaczeniu dla spektaklu :

- **Figure 53 QLab**: Jeśli fizyczny port wyjściowy nie jest zmapowany w konfiguracyjnym patchu audio, selektory wyjść w poszczególnych cues nie pozwalają na jego wybór, zapobiegając błędnym przekierowaniom sygnału .
- **Apple MainStage**: Wyświetla na paskach kanałów wyłącznie porty wyjściowe faktycznie zgłoszone przez sterownik połączonego interfejsu.
- **Apple Logic Pro**: Dynamicznie ukrywa opcje routingu wykraczające poza zakres wykrytej karty dźwiękowej.

### Ocena Analogii Studio DAW dla StageSync

Analogia do studio DAW jest w tym obszarze **PRAWIDŁOWA, ALE WYMAGA WYŻSZEGO RYGORU**. W środowisku studyjnym szara, nieaktywna kontrolka (np. "Out 3-4 Disabled") może pełnić rolę przypomnienia dla realizatora o konieczności późniejszego skonfigurowania routingu. Na scenie, w warunkach stresu i ograniczonego czasu reakcji, obecność nieaktywnych lub niecałkowicie zaimplementowanych elementów UI wprowadza realizatora w błąd . Realizator może założyć, że sygnał jest wysyłany na scenę, podczas gdy w rzeczywistości tory wyjściowe są nieaktywne .

W myśl wytycznych ADR 0011 "Brak funkcji = brak UI" . Selektor wyjść `OutputSelector` nie może wyświetlać opcji HW Out 3–4, dopóki wywołanie `hwOutputUiAllowed` nie potwierdzi, że `AudioContext.destination` obsługuje odpowiednią liczbę kanałów dyskretnych .

### Pytania Q&A do Product Ownera (PO)

1. Gdy plik projektu przygotowany na dużej konsole (z zmapowanymi wyjściami Out 3–8) zostanie otwarty na laptopie z interfejsem stereo (2 kanały), czy selektory wyjść w UI mają ukryć nieobsługiwane porty i bezpiecznie pokazywać wysyłkę do Mastera, zachowując oryginalne mapowanie w pliku ?
2. Czy w sekcji preferencji audio należy umieścić jawny wskaźnik diagnostyczny (np. "Wykryto 2 kanały wyjściowe – wyjścia fizyczne Out 3–4 zostały ukryte"), aby zapobiec dezorientacji realizatora ?
3. Czy dopuszczamy jakikolwiek dedykowany tryb "Offline Show Prep", pozwalający na edycję routingu wyjść wyizolowanych bez podłączonego interfejsu wielokanałowego ?

---

## Ocena Decyzji 4: Model „Logical HW Patch Table” jako Kierunek Rozwoju Miksera 5.2+ [CRIT-OUT-04]

### Werdykt

**KEEP** (Zachować – jedyny profesjonalny model separujący strukturę miksu od zmiennego sprzętu scenicznego ).

Kierunek architektoniczny zakłada rozdzielenie identyfikatorów wyjść w ścieżkach i szynach od surowych indeksów kanałów karty dźwiękowej . Zamiast przypisywać ścieżkę bezpośrednio do fizycznego gniazda (np. offset 2 na karcie), ścieżka odwołuje się do nazwanego wyjścia logicznego (`hwOutputId`), które jest odwzorowywane na fizyczny port w zbiorczej tabeli krosowniczej projektu (`audioHardwareOutputs`) .

### Dowód i Analiza Porównawcza vs DAW (Logic / Ableton / MainStage / QLab)

Podejście oparte na tabeli krosowniczej jest sprawdzonym wzorcem w oprogramowaniu teatralnym i koncertowym :

- **Figure 53 QLab**: Klasyczny wzorzec _Audio Patch Matrix_. Każde wyjście jest reprezentowane przez abstrakcyjny port logiczny, który w osobnej tabeli jest mapowany na fizyczne wyjście urządzenia . Przeniesienie projektu na inny interfejs wymaga jedynie przemapowania tabeli, bez modyfikacji poszczególnych cues .
- **Apple MainStage**: Oferuje abstrakcję mapowania wyjść na poziomie konfiguracyjnym koncertu.
- **Ableton Live / Apple Logic Pro**: Tradycyjnie wiążą tory audio bezpośrednio z numerami wyjść fizycznych sterownika (np. Out 3–4), co utrudnia przenoszenie projektów między różnymi stanowiskami pracy.

### Ocena Analogii Studio DAW dla StageSync

Analogia do tradycyjnego studio DAW jest w tym przypadku **BŁĘDNA**. W studio produkcyjnym konfiguracja sprzętowa jest stała, a twarde przypisanie ścieżki do fizycznego wyjścia karcie dźwiękowej nie stanowi problemu. W działalności estradowej StageSync projekt spektaklu jest uruchamiany na różnych komputerach i z różnymi interfejsami audio (np. w sali prób, na małej scenie clubowej z interfejsem 4-kanałowym oraz na dużej scenie festiwalowej z siecią Dante) .

Powiązanie ścieżki bezpośrednio z surowym indeksem kanału wymuszałoby re-routing całego miksu przy każdej zmianie karty dźwiękowej . Model tabeli krosowniczej (`logical HW patch table`) tworzy warstwę abstrakcji: realizator na nowej scenie zmienia jedynie indeksy kanałowe w tabeli krosowniczej, a cały miks zachowuje spójność połączeń .

### Pytania Q&A do Product Ownera (PO)

1. Czy tabela krosownicza `audioHardwareOutputs` ma być zapisywana wewnątrz pliku projektu `.stagesync.json`, czy powinna stanowić lokalną konfigurację stanowiska komputerowego (Host Preferences) ?
2. Czy etykieta nadana w tabeli krosowniczej (np. "Out 3-4: IEM Vocal") ma w pełni zastępować etykietę w selektorze `OutputSelector` na paskach kanałów miksera ?
3. Czy przewidujemy możliwość zapisywania i wczytywania gotowych szablonów patcha sprzętowego (Presets) dla powtarzalnych konfiguracji scenicznych ?

---

## Porównanie Standardów DAW vs Architektura StageSync WebAudio

W poniższej tabeli zestawiono kluczowe cechy i mechanizmy routingu w profesjonalnych aplikacjach DAW oraz sekwencerach estradowych w odniesieniu do architektury StageSync v5.2+.

| Cecha / Mechanizm             | Apple Logic Pro                     | Ableton Live                  | Figure 53 QLab                     | StageSync v5.2+ (WebAudio)                                |
| :---------------------------- | :---------------------------------- | :---------------------------- | :--------------------------------- | :-------------------------------------------------------- |
| **Główne Przeznaczenie**      | Produkcja / Studio                  | Studio / Live Performance     | Teatr / Spektakle Live             | Odtwarzacz Sceniczny / FOH                                |
| **Warstwa Dystrybucji Audio** | CoreAudio Channel Strips            | ASIO / CoreAudio Ext Out      | Audio Patch Matrix                 | Pojedynczy `AudioContext` + Discrete `ChannelMergerNode`  |
| **Model Wyjść HW**            | Indeksy sterownika urządzenia       | Indeksy sterownika urządzenia | Tabela Krosownicza (Logical Patch) | Tabela Krosownicza (`AudioHardwareOutputSchema`)          |
| **Routing Szyn (Bus-to-Bus)** | Dowolne zagnieżdżenie Aux/Subgroups | Zagnieżdżone Group Tracks     | Hierarchiczne Węzły Sumowania      | Weryfikowany graf DAG (fail-fast Zod / fail-soft runtime) |
| **Obsługa Brakujących Wyjść** | Poszarzenie portu w menu            | Poszarzenie portu w menu      | Ukrycie / Ostrzeżenie braku patcha | Zakaz atrap UI (ADR 0011) – warunek `hwOutputUiAllowed`   |
| **Zarządzanie Zegarem Audio** | Sterownik Sprzętowy                 | Sterownik Sprzętowy           | Sterownik Sprzętowy                | SSOT Czasu Serwera + Wygładzanie Klienta                  |

---

## Podsumowanie Architektoniczne

Przeprowadzona ocena jednoznacznie wskazuje, że rozwój silnika miksowania StageSync w kierunku wersji v5.2+ odpowiada realnym potrzebom realizatorów FOH i inżynierów systemu . Kluczem do sukcesu aplikacji jest jednak bezwzględne respektowanie specyfiki środowiska przeglądarkowego .

Ślepe przenoszenie rozwiązań z tradycyjnych stacji roboczych DAW bez uwzględnienia ograniczeń WebAudio API, mechanizmu `setSinkId` oraz zachowania systemów operacyjnych w zakresie raportowania kanałów wyjściowych stanowi zagrożenie dla stabilności spektaklu . Wdrożenie wyjść wielokanałowych musi być rygorystycznie powiązane z weryfikacją parametru `maxChannelCount` oraz przestrzeganiem zasady ADR 0011 zakazującej tworzenia atrap w interfejsie użytkownika . Z kolei przyjęcie modelu tabeli krosowniczej (`logical HW patch table`) oraz ścisła kontrola acykliczności grafu szyn (DAG) gwarantują, że StageSync stanie się dojrzałym, niezawodnym narzędziem koncertowym .

---

Powered by [AI Exporter](https://saveai.net)

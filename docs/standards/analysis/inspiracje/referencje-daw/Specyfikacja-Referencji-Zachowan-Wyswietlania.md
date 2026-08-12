> From: https://gemini.google.com/app/e503b40473faa2c1

Referencja Wyświetlania Chartów StageSync

# Specyfikacja zachowań wyświetlania chartów dla StageSync Client

## Model treści i architektura widoków scenicznych

Przegląd rozwiązań stosowanych w aplikacjach estradowych wskazuje na dwa dominujące paradygmaty: prezentację dokumentów statycznych oraz sekwencyjną projekcję slajdów. Oprogramowanie OnSong opiera się na ciągłych plikach tekstowych w formatach ChordPro lub OnSong oraz dokumentach PDF, gdzie przewijanie zawartości realizowane jest za pomocą automatycznego kalkulatora prędkości w pikselach na sekundę . Z kolei aplikacje MobileSheets i forScore koncentrują się na zdigitalizowanych nutach w formacie PDF, udostępniając mechanizmy ciągłego przewijania pionowego lub czasowego przewracania stron zintegrowanego z metronomem bądź ścieżką audio . Systemy takie jak Planning Center Services czy WorshipTools kładą z kolei nacisk na architekturę slajdową, przeznaczoną do sekwencyjnej projekcji tekstu i akordów.

Projekt StageSync Client odrzuca koncepcję klonowania interfejsu (chrome) oraz naśladowania tradycyjnego arkusza papierowego znanego z oprogramowania OnSong czy forScore . Zamiast operować na statycznych stronach z dołączonym kalkulatorem czasu, system opiera się na jednolitej osi czasu, w której czas utworu reprezentowany jest w miarach taktu oraz jednostkach ticków . Model treści chartu w StageSync Client nie stanowi luźnego bloku tekstowego, lecz ustrukturyzowany zbiór klipów przypisanych do dedykowanych ścieżek osi czasu, takich jak Forma, Akordy oraz Tekst .

Architektura StageSync Client definiuje trzy odrębne widoki wykonawcze, zoptymalizowane pod kątem konkretnych ról scenicznych:

- **Widok Grid (Akordy)**: Dedykowany sekcji rytmicznej i instrumentalistom. Prezentuje zagęszczony cykl progresji akordowej dla aktywnej podsekcji Formy w układzie dwuwierszowej karuzeli fraz, uzupełniony o wielkoformatowy akord główny oraz podgląd nadchodzącej zmiany harmonicznej .
- **Widok Karaoke (Tekst)**: Zoptymalizowany dla wokalistów. Grupuje linie tekstu w widoki kart odpowiadających sekcjom Formy . W przypadku sekcji pozbawionych tekstu wokalnego system automatycznie generuje paski postępu taktowego .
- **Widok Score (Nuty OSMD)**: Dedykowany muzykom korzystającym z tradycyjnej notacji muzycznej w formacie MusicXML. Śledzi pozycję odtwarzania takt po takcie w oparciu o mapę takty-czas .

| Wymiar architektoniczny      | OnSong / forScore                           | Planning Center / WorshipTools               | StageSync Client (Grid / Karaoke / Score)                       |
| :--------------------------- | :------------------------------------------ | :------------------------------------------- | :-------------------------------------------------------------- |
| **Prymarne źródło danych**   | Plik ChordPro, plik PDF, plik graficzny     | Slajdy tekstowe, załączniki chartów          | Dedykowane klipy osi czasu (Forma, Akordy, Tekst, Score)        |
| **Model nawigacji czasowej** | Autoscroll (prędkość px/s) lub Page Turn    | Ręczne lub automatyczne przełączanie slajdów | Czas odtwarzania w tickach powiązany z taktowaniem i tempem     |
| **Prezentacja akordów**      | Chords-over-lyrics, inline lub diagramy     | Chord sheet zintegrowany z tekstem           | Proporcjonalne siatki taktowe (Grid) oraz wskaźniki Hero        |
| **Stylistyka wizualna**      | Klonowanie tradycyjnego arkusza papierowego | Widok prezentacyjny lub slajdowy             | Kontrastowy interfejs sceniczny z paletą black/amber (`--ss-*`) |

## Synchronizacja z osią czasu (Playhead) i mechanizm nadpisania (User Override)

Sterowanie pozycją widoku w StageSync Client opiera się na dwóch stanach operacyjnych: synchronizacji automatycznej (_Live Follow_) oraz stanie manualnego nadpisania (_User Override_).

### Synchronizacja automatyczna (Live Follow)

W trybie synchronizacji automatycznej interfejs reaguje na bieżącą pozycję wskaźnika odtwarzania przekazywaną z silnika transportu . Reakcja interfejsu jest dostosowana do specyfiki wybranego widoku:

- **Widok Karaoke**: System wyznacza aktywną linię wokalną na podstawie okna czasowego klipu . Gdy kursor odtwarzania przesuwa się przez utwór, aktywne jest automatyczne wyśrodkowanie linii tekstu w oknie podglądu z wykorzystaniem łagodnej animacji przewijania . W okresach pauzy wokalnej akcent zostaje przeniesiony na całą kartę sekcji Formy .
- **Widok Grid**: Pozycja wskaźnika odtwarzania jest mapowana na konkretny takt i miarę w ramach aktywnej podsekcji Formy . Komponent karuzeli fraz wyświetla aktywny cykl akordów w wierszu górnym oraz nadchodzącą frazę w wierszu dolnym . Zmiana podsekcji powoduje płynne przesunięcie pionowe wierszy z użyciem transformacji CSS (`translateY`) .
- **Widok Score**: Numer taktu wyliczony z pozycji wskaźnika odtwarzania przelicza się na takt w pliku MusicXML w oparciu o strukturę mapowania takty-nuty . Kursor notacji przesuwa się płynnie między miarami bez konieczności ręcznego przewracania stron .

### Manualny Override i ponowne przechwycenie (Re-sync)

Wykonanie gestu przewijania (dotyk, mysz, kółko) na obszarze widoku Karaoke lub Score natychmiastowo aktywuje stan manualnego nadpisania (_User Override_). W tym stanie automatyczne przewijanie widoku zostaje zawieszone, aby umożliwić muzykowi swobodne przeglądanie dalszych lub wcześniejszych części utworu bez ingerencji wskaźnika odtwarzania. Zmiana sekcji na osi czasu lub manualne wywołanie akcji ponownej synchronizacji przywraca tryb _Live Follow_ i natychmiastowo centruje widok na aktualnym punkcie czasowym.

W widoku Grid nie stosuje się ciągłego przewijania płótna, ponieważ jednostką widoku jest zawsze zwięzła fraza muzyczna stanowiąca podsekcję Formy . Skok do dowolnej sekcji z poziomu widoku nawigacji utworu powoduje natychmiastowe przeliczenie i przebudowanie bufera karuzeli akordów .

## Transpozycja, enharmonia i konwencje notacji (PL vs US): Storage vs Display

Wyświetlanie symboli akordów w StageSync Client opiera się na bezwzględnym rozdzieleniu warstwy przechowywania danych (_Storage Level_) od warstwy prezentacji scenicznej (_Display Level_) .

### Reguły warstwy przechowywania (Storage Level)

Wszystkie klipy akordowe zapisywane w projekcie oraz przetwarzane przez silnik w czasie rzeczywistym muszą spełniać kryteria kanonicznego zapisu ASCII, obsługiwanego przez funkcję `toLiteralStorage` :

- **Wyłączność znaków ASCII**: Niedozwolone jest zapisywanie w pamięci znaków Unicode takich jak `♯`, `♭`, `Δ`, `°`, `ø`, `−` czy `+` .
- **Zachodnia konwencja nutowa**: Podstawowe litery dźwięków przyjmują wyłącznie formy zachodnie (A, B, C, D, E, F, G) . Polskie oznaczenie `H` jest na poziomie zapisu automatycznie konwertowane do zachodniego `B` .
- **Ograniczenie długości**: Maksymalna długość ciągu znaków dla jednego akordu wynosi 64 znaki ASCII .
- **Standaryzacja jakości**: Suffixy jakościowe są sprowadzane do ujednoliconych ciągów literałowych, na przykład `m7(b5)` zamiast `ø7` lub `m7b5`, oraz `maj7` zamiast `Δ7` .

### Reguły warstwy prezentacji (Display Level)

Podczas renderowania akordu w komponencie `ChordName` literał ASCII przetwarzany jest przez funkcję `formatChordParts`, co pozwala na uzyskanie czytelnego i eleganckiego zapisu scenicznego :

- **Podział strukturalny**: Akord rozbijany jest na prymę (linia bazowa), rozszerzenie lub jakość (indeks górny `<sup>`) oraz nutę basową po ukośniku, prezentowaną w zapisie jednolinijkowym bądź w stosie .
- **Konwencja hybrydowa PL (Polish Hybrid)**: Jeśli w ustawieniach klienta włączona jest opcja `hybridPolishB`, pojedyncze zachodnie `B` wyświetlane jest jako polskie `H` . Pojedynczy dźwięk z obniżeniem `Bb` pozostaje zapisany jako `Bb`, co zapobiega powstawaniu błędnych form takich jak `Hb` .
- **Symbole sceniczne**: Jeżeli wyłączona jest opcja `literalQuality`, literałowe nazwy jakości są zastępowane czytelnymi symbolami scenicznymi: `m7(b5)` konwertowane jest do `ø7`, `maj7` do `Δ7`, `dim` do `°`, `aug` do `+`, a `m` do znaku minus `−` .
- **Znaki chromatyczne**: Literałowe znaki `#` oraz `b` są zamieniane na muzyczne glify Unicode `♯` i `♭` zarówno w prymie akordu, jak i w numerach rozszerzeń .

| Literał w pamięci (Storage ASCII) | Konfiguracja prezentacji                 | Wyświetlanie sceniczne (Display Output) | Struktura HTML / Elementy          |
| :-------------------------------- | :--------------------------------------- | :-------------------------------------- | :--------------------------------- |
| `C#maj7/G#`                       | Standard (US), Scenic Symbols            | C♯Δ7/G♯                                 | Root: `C♯`, Sup: `Δ7`, Bass: `/G♯` |
| `B7`                              | Polish Hybrid (`hybridPolishB: true`)    | H7                                      | Root: `H`, Sup: `7`, Bass: brak    |
| `Bbmaj7`                          | Polish Hybrid (`hybridPolishB: true`)    | B♭Δ7                                    | Root: `B♭`, Sup: `Δ7`, Bass: brak  |
| `Am7(b5)`                         | Scenic Symbols (`literalQuality: false`) | A−ø7                                    | Root: `A`, Sup: `ø7`, Bass: brak   |
| `F#m7/C#`                         | Literal Quality (`literalQuality: true`) | F♯m7/C♯                                 | Root: `F♯`, Sup: `m7`, Bass: `/C♯` |

### Reguły transpozycji i wysokości instrumentu

Transpozycja akordów na scenie realizowana jest dynamicznie w czasie rzeczywistym za pomocą funkcji `applyInstrumentPitchToChord`, uwzględniającej trzy niezależne parametry :

- **Tonacja bazowa utworu**: Wyznaczana na podstawie punktu czasowego na osi utworu .
- **Przesunięcie zespołu**: Ogólna transpozycja wykonawcza dla danego utworu lub setlisty.
- **Strojenie instrumentu**: Indywidualne przesunięcie dla instrumentów transponujących (np. B♭, E♭, F) lub wykonawców używających kapodastra.

Aplikacja OnSong przelicza kapodaster w sposób obniżający wyświetlane akordy, aby zachować deklarowaną tonację brzmiącą . W StageSync Client przeliczanie odbywa się w sposób bezpośredni na poziomie parametrów wejściowych rendera, dzięki czemu akordy na siatce zawsze odpowiadają faktycznym pozycjom palców na podstrunnicy lub klawiaturze bez naruszania struktury osi czasu.

## Typografia sceniczna, ergonomia percepcji i czytelność

Projekt typograficzny widoków wykonawczych StageSync Client wynika bezpośrednio z zasad ergonomii scenicznej oraz restrykcyjnego systemu tokenów wizualnych .

### Kontrast i rozpraszanie światła (Anti-halation)

Całość interfejsu klienta opiera się na czerni tła (`--ss-color-bg: #000`), co eliminuje niepożądane łuny świetlne na zaciemnionej scenie i redukuje zmęczenie wzroku . Tekst główny wykorzystuje stopnie bieli o kontrolowanej jasności, co zapobiega powstawaniu efektu halacji, czyli rozmycia krawędzi jasnych liter na czarnym tle . Interakcje oraz aktywne stany wyróżniane są wybraną barwą akcentową (`--ss-color-primary` / amber) .

### Hierarchia wizualna w widokach wykonawczych

- **Sekcja Hero w widoku Grid**: Główny akord sekcji Hero renderowany jest skrajnie dużą czcionką bezszeryfową . Obok głównego akordu znajduje się mniejszy blok podglądu z etykietą "nast.", wskazujący najbliższą zmianę harmoniczną wyliczaną przez funkcję `resolveHeroNextSymbol` .
- **Siatka cyklu (Cycle Grid)**: Kafelki akordowe w siatce posiadają elastyczną szerokość proporcjonalną do czasu trwania akordu w taktach, definiowaną zmienną `--slot-bar-units` oraz właściwością `cycleGridTemplateColumns: Nfr` . Akord trwający 2 takty zajmuje dwukrotnie większą przestrzeń poziomą niż akord trwający 1 takt, co pozwala muzykologicznie odczuć rytm harmoniczny .
- **Skalowanie tekstu w Karaoke**: Rozmiar czcionki bloku wokalnego jest regulowany globalną zmienną CSS (`--ss-client-text-scale`) . Aktywna linia tekstu cechuje się pełną jasnością i większą wagą typograficzną, podczas gdy linie nieaktywne zostają przygaszone, redukując obciążenie poznawcze wokalisty .

## Obsługa sytuacji brzegowych (Edge Cases)

### EC-01: Puste sekcje Formy (Brak akordów lub tekstu)

W sytuacjach, gdy sekcja Formy nie zawiera przypisanych klipów tekstowych (na przykład podczas długiego solówka instrumentalnego lub wstępu), widok Karaoke nie pozostawia pustego obszaru . Wskaźnik `useProgress` przełącza kartę danej sekcji w tryb paska postępu taktowego (`SectionProgressBars`) . Sekcja wyświetla wiersz kafelków reprezentujących poszczególne takty, które są rytmicznie wypełniane w miarę upływu miar . W przypadku całkowitego braku akordów w danym punkcie osi czasu, widok Grid renderuje symbol zastępczy `—` lub komunikat informacyjny .

### EC-02: Dołączenie klienta w trakcie utworu (Late Join Mid-Song)

Gdy urządzenie klienckie łączy się ze sesją w trakcie odtwarzania utworu, układ interfejsu natychmiastowo przejmuje bieżący stan osi czasu bez uruchamiania kaskady animacji przejściowych . Funkcja `commitDisplay` wymusza natychmiastowy render bez animacji karuzeli, co zapobiega opóźnieniom i zakłóceniom wizualnym w odczycie akordu na żywo .

### EC-03: Przedtakty wokalne (Pickup Lines)

Linie tekstu wokalnego, których początek przypada na ostatni takt poprzedzającej sekcji Formy (klasyczny przedtakt wokalny), są przez algorytm `resolveFormaClipForLyric` przypisywane do **następnej** sekcji Formy . Dzięki temu wokalista widzi frazę przedtaktu wyrenderowaną wewnątrz karty sekcji docelowej, do której strukturalnie i wykonawczo należy dana fraza .

### EC-04: Odliczanie wstępne (Countdown)

Klipy o charakterze odliczania generują dynamiczne, syntetyczne cyfry odliczania obsługiwane przez funkcje `mergeAkordyWithCountdownDigits` oraz `mergeTekstWithCountdownDigits` . W widoku Grid oraz Karaoke cyfry te są renderowane jako wielkoformatowe znaki numeryczne ze specjalną klasą stylizującą `heroCountdownNumber`, sygnalizując taktowanie wejściowe bez konieczności wprowadzania sztucznych akordów do struktury utworu .

## Tabela zachowań referencyjnych i specyfikacja funkcji

Poniższa tabela stanowi twardą referencję zachowań scenicznych dla StageSync Client w ujęciu porównawczym do aplikacji rynkowych. Specyfikacja precyzuje status wdrożenia poszczególnych funkcji (`IN`, `LATER`, `OUT`).

| ID        | Zachowanie Referencyjne (OnSong / forScore / PCO)                                              | Odpowiednik StageSync Client (Grid / Karaoke / Score)                                                                     | Status    | Specyfikacja techniczna zachowania                                                                                                               |
| :-------- | :--------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ | :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **CC-01** | Grupowanie tekstu według zwrotek i paski postępu sekcji instrumentalnych (PCO / OnSong)        | Widok Karaoke: sekcje Formy zawierające linie tekstu lub paski postępu taktowego (`SectionProgressBars`) .                | **IN**    | Wykorzystuje `groupKaraokeSections`. Sekcje bez tekstu generują paski takty/miary z animowanym wypełnieniem `beatProgress` .                     |
| **CC-02** | Przewijanie arkusza akordowego (OnSong Autoscroll)                                             | Widok Grid: Dwuwierszowa karuzela fraz dynamicznie przesuwająca wiersze w pionie .                                        | **IN**    | Rezygnacja z płynnego przewijania pionowego na rzecz skoków frazowych. Animacja `translateY` wykonywana w czasie `PHRASE_CAROUSEL_MS` .          |
| **CC-03** | Brak dedykowanego podglądu najbliższej zmiany w OnSong                                         | Widok Grid: Główny akord Hero oraz dedykowany podgląd "nast." .                                                           | **IN**    | Wylicza nadchodzący akord na podstawie `resolveHeroNextSymbol`. Posiada płynną animację przemieszczania symbolu (`runHeroChordTransition`) .     |
| **CC-04** | Zapis akordów w tekście dokumentu i formatowanie Unicode                                       | Ścisły podział: ASCII Literal w Storage (`toLiteralStorage`) vs Scenic Display (`formatChordParts`) .                     | **IN**    | Pamięć: ASCII, zachodnie nuty A-G, max 64 znaki . Render: litera w linii, jakości w `<sup>`, symbole `Δ`, `°`, `ø`, `−`, `+` .                   |
| **CC-05** | Wybór konwencji nutowej (Alpha / German / Polish) w OnSong                                     | Wyświetlanie sceniczne z obsługą hybrydowej konwencji polskiej (`formatHybridPolishB`) .                                  | **IN**    | Przy `hybridPolishB: true` zachodnie `B` wyświetla się jako `H`, natomiast `Bb` pozostaje niezmienione jako `Bb` .                               |
| **CC-06** | Transpozycja utworu i obsługa kapodastra (OnSong Capo Slider)                                  | Silnik transpozycji scenicznej `applyInstrumentPitchToChord` uwzględniający tonację, transpozycję zespołu i instrumentu . | **IN**    | Wylicza pozycję dźwiękową w locie dla każdego klipu bez modyfikacji kanonicznego zapisu w buforze utworu .                                       |
| **CC-07** | Płynne centrowanie aktywnej linii tekstu (forScore / OnSong)                                   | Wyśrodkowanie aktywnej linii tekstu w widoku Karaoke za pomocą funkcji `scrollLineIntoCenter` .                           | **IN**    | Płynne wyliczanie przesunięcia `scrollTop` wewnątrz kontenera z zachowaniem marginesu buforowego .                                               |
| **CC-08** | Sterowanie stronami nutowymi w forScore / MobileSheets (Autoturn / Replay)                     | Integracja widoku Score (OSMD) z osią czasu poprzez przeliczanie `scoreBarFromDisplayTicks` .                             | **IN**    | Automatyczne przestawianie miary w notacji MusicXML na podstawie pozycji wskaźnika odtwarzania bez konieczności ręcznego manewrowania stronami . |
| **CC-09** | Przypisywanie przedtakty do sekcji w oprogramowaniu slajdowym                                  | Algorytm przypisywania przedtaktu wokalnego `resolveFormaClipForLyric` .                                                  | **IN**    | Przesuwa linie tekstu zaczynające się w ostatnim takcie poprzedniej sekcji do karty sekcji docelowej .                                           |
| **CC-10** | Brak dedykowanego visual countdown w arkuszach OnSong                                          | Syntetyczne nakładanie cyfr odliczania (`mergeAkordyWithCountdownDigits`) .                                               | **IN**    | Generuje wiersze cyfr wejściowych w trybie przeliczania takty/miary, wyświetlane w stylistyce `heroCountdownNumber` .                            |
| **CC-11** | Manualne przewijanie zawieszające autoscroll                                                   | Stan _User Override_ zawieszający _Live Follow_ z opcją ponownej synchronizacji po zmianie sekcji.                        | **IN**    | Reaguje na gesty użytkownika i zapobiega gwałtownym skokom płótna podczas ręcznego przeglądania treści.                                          |
| **CC-12** | Transpozycja i parsowanie zewnętrznych plików PDF (OnSong ChordFlow / SongSelect)              | Brak obsługi transpozycji warstwy tekstowej na plikach graficznych PDF.                                                   | **OUT**   | StageSync operuje wyłącznie na jednoznacznych danych strukturalnych osi czasu i notacji MusicXML .                                               |
| **CC-13** | Klonowanie paska narzędzi, przycisków i motywów OnSong                                         | Dedykowane interfejsy ról stworzone przy użyciu systemu `@stagesync/ui` i tokenów CSS (`--ss-*`) .                        | **OUT**   | Kategoryczny zakaz kopiowania interfejsu OnSong. Stosowana jest czysta paleta black/amber .                                                      |
| **CC-14** | Personalizacja motywów kolorystycznych i wbudowany sampler                                     | Rozszerzone motywy wizualne oraz pokładowe odtwarzacze próbników dźwiękowych.                                             | **LATER** | Funkcjonalność wykraczająca poza podstawowy zakres wydania scenicznego (planowana w późniejszych liniach 5.x) .                                  |
| **CC-15** | Automatyzacja przewracania stron na podstawie odsłuchu mikrofonowego (forScore / OnSong Voice) | Domyślne sterowanie pozycją widoku poprzez mikrofonowe rozpoznawanie tempa.                                               | **OUT**   | Pozycja w utworze jest zawsze wyznaczana przez nadrzędny zegar transportu (SSOT) .                                                               |

## Wnioski i wytyczne architektoniczne

Zapewnienie spójności i niezawodności oprogramowania StageSync Client wymaga bezwzględnego przestrzegania rozdzielenia kanonicznego zapisu akordów od ich scenicznego renderowania . Pamięć systemowa musi operować wyłącznie na czystych ciągach ASCII, z kolei warstwa prezentacyjna jest odpowiedzialna za przekształcenia typograficzne, transpozycję oraz dostosowanie konwencji notacyjnej do preferencji muzyka . Interfejs sceniczny musi opierać się na czytelnych, kontrastowych układach ról (Grid, Karaoke, Score), reagujących dynamicznie na nadrzędny zegar transportu i wykluczających zbędne elementy dekoracyjne .

---

Powered by [AI Exporter](https://saveai.net)

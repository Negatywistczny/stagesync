> **Repo:** surowy dump — nie SSOT. Triage: [Logika-Edycji-Klipow-Logic-Pro.triage.md](./Logika-Edycji-Klipow-Logic-Pro.triage.md). Konwencje: [README](../README.md).

# **Specyfikacja Geometrii i Interakcji na Osi Czasu: Standardy Logic Pro dla Systemów DAW**

Projektowanie osi czasu cyfrowej stacji roboczej (DAW) wymaga rygorystycznego zdefiniowania zachowań przestrzennych i czasowych klipów (w nomenklaturze Logic Pro określanych jako regiony). Wyzwania, przed którymi stają zautomatyzowane asystenty kodowania, takie jak Cursor, wynikają z faktu, że ruchy obiektów na osi czasu nie są prostym przesuwaniem elementów interfejsu graficznego (GUI). Reprezentują one złożone operacje na relacyjnych bazach danych i strukturach czasowych.  
Poniższa specyfikacja stanowi kompletny podręcznik techniczny, który szczegółowo opisuje mechanizmy przyciągania, tryby przeciągania, zachowania kontekstowe narzędzi, rozciąganie czasowe oraz obsługę nakładania się regionów audio i MIDI. Dokument ten dostarcza precyzyjnych wzorców algorytmicznych i logicznych niezbędnych do zaimplementowania stabilnego silnika osi czasu wzorowanego na Logic Pro.

## **1\. Matematyka i Zachowanie Siatki Przyciągania (Grid Snapping)**

System przyciągania do siatki reguluje sposób wyrównywania obiektów w czasie muzycznym (takty, części taktowe, dzielniki) lub czasie bezwzględnym (sekundy, próbki). Logic Pro implementuje dwa zasadnicze tryby obliczania pozycji docelowej: przyciąganie bezwzględne (Absolute Snap) oraz przyciąganie względne (Relative Snap).

### **Przyciąganie Bezwzględne (Absolute Snap)**

W trybie bezwzględnym – będącym domyślnym trybem w większości klasycznych scenariuszy edycyjnych – punkt startowy regionu (P\_{\\text{start}}) jest bezpośrednio przyciągany do najbliższego punktu siatki muzycznej (G\_i), wyznaczonego przez aktualną rozdzielczość. Jeśli region posiadał przesunięcie (offset) względem siatki przed rozpoczęciem ruchu, przesunięcie to zostaje bezpowrotnie usunięte.  
Algorytm obliczania pozycji docelowej P\_{\\text{new}} przy przesunięciu o wektor \\Delta x (wyrażony w jednostkach czasu muzycznego, np. _ticks_) opisuje następująca zależność matematyczna:  
P\_{\\text{new}} \= \\text{round}\\left( \\frac{P\_{\\text{start}} \+ \\Delta x}{G\_{\\text{size}}} \\right) \\times G\_{\\text{size}}  
gdzie G\_{\\text{size}} oznacza aktualny rozmiar kroku siatki w tych samych jednostkach.

### **Przyciąganie Względne (Relative Snap)**

Tryb względny zachowuje oryginalny dystans (offset) regionu od najbliższego punktu siatki. Przykładowo, jeśli region znajduje się na pozycji 2.1.1.16 (szesnaście _ticks_ po pierwszym uderzeniu drugiego taktu), przesunięcie go o jeden takt w przód w trybie względnym uplasuje go dokładnie na pozycji 3.1.1.16.  
Wdrożenie tej logiki wymaga zachowania początkowego przesunięcia klipu (O\_{\\text{start}}) względem siatki:  
O\_{\\text{start}} \= P\_{\\text{start}} \\pmod{G\_{\\text{size}}}  
Pozycja docelowa P\_{\\text{new}} przy przesunięciu \\Delta x jest wówczas kalkulowana jako:  
P\_{\\text{new}} \= \\left( \\text{round}\\left( \\frac{P\_{\\text{start}} \+ \\Delta x \- O\_{\\text{start}}}{G\_{\\text{size}}} \\right) \\times G\_{\\text{size}} \\right) \+ O\_{\\text{start}}  
Wprowadzenie trybu względnego eliminuje ryzyko przypadkowego zniszczenia ludzkiego micro-timingu (tzw. _groove_ lub _swing_) podczas reorganizacji aranżacji na osi czasu. Niemniej jednak, deweloperzy DAW muszą wziąć pod uwagę, że tryb ten bywa mylący dla użytkowników oczekujących, iż funkcja "Snap to Grid" zawsze wyrówna obiekt bezpośrednio do linii siatki. Z tego względu konieczne jest zapewnienie szybkiego przełącznika stanów (skrótu klawiszowego) pomiędzy trybami względnym i bezwzględnym.

### **Skalowanie Rozdzielczości i Modyfikatory Klawiszowe**

Podczas przeciągania obiektów na osi czasu, naciśnięcie klawiszy modyfikujących pozwala na dynamiczną zmianę rozdzielczości siatki, co eliminuje potrzebę ciągłego przełączania parametrów w menu głównym. System ten jest ściśle powiązany z aktualnym stopniem powiększenia widoku (zoom).  
| Modyfikator Klawiszowy | Poziom Przybliżenia (Zoom) | Wynikowe Zachowanie Siatki (Snap Resolution) | Relacja Ruchu Myszki do Ruchu Klipu | | :--- | :--- | :--- | :--- | | **Brak (Domyślny)** | Dowolny | Korzysta z wybranego trybu siatki (np. _Bar, Beat, Division, Smart_). | Liniowa 1:1 | | **Control** | Niski (Wąski widok) | Blokada siatki na sztywnej wartości podziału (np. 1/16) zdefiniowanej w metrach transportu. | Liniowa 1:1 | | **Control** | Wysoki (Zbliżenie) | Siatka skaluje się o stały współczynnik (ułamek) względem domyślnej wartości podziału. | Liniowa 1:1 | | **Control \+ Shift** | Niski (Wąski widok) | Siatka przełącza się całkowicie na najmniejsze jednostki muzyczne (_Ticks_). | Nieliniowa (Tłumienie ruchu wskaźnika) | | **Control \+ Shift** | Wysoki (Zbliżenie) | Siatka przechodzi w tryb czasu rzeczywistego z dokładnością do pojedynczej próbki audio (_Samples_). | Nieliniowa (Mocne tłumienie wskaźnika – precyzja pikselowa) |  
Użycie kombinacji Control \+ Shift wymusza na silniku GUI przełamanie liniowej relacji 1:1 między ruchem myszy a ruchem klipu. Aby przesunąć region o jedną próbkę lub jeden _tick_, użytkownik musi pokonać fizycznie znaczną odległość kursorem na ekranie, co gwarantuje najwyższą precyzję edycyjną.

## **2\. Logika i Stany Trybów Przeciągania (Drag Modes)**

Podczas przesuwania, kopiowania lub usuwania regionów, silnik osi czasu musi wiedzieć, jak traktować sąsiadujące obiekty na tej samej ścieżce. Logic Pro definiuje pięć trybów przeciągania zarządzających kolizjami geometrycznymi.

### **Różnica Pomiędzy Trybem a Parametrem „No Overlap”**

Kluczowym elementem architektury DAW, który często bywa błędnie interpretowany przez systemy sztucznej inteligencji, jest rozróżnienie dwóch mechanizmów o nazwie „No Overlap”.

> - **Tryb Przeciągania „No Overlap” (Tracks Area Drag Mode):** Jest to globalne ustawienie edycyjne ścieżek. Zapobiega fizycznemu nakładaniu się bloków na osi czasu poprzez automatyczne docinanie lub dzielenie regionu leżącego pod spodem.
> - **Parametr Regionu „No Overlap” (Region Inspector Parameter):** Jest to lokalny parametr w inspektorze powiązany z wyświetlaniem zapisu nutowego (Score Editor). Służy uproszczeniu notacji muzycznej i nie wpływa na fizyczne położenie ani długość klipów na głównej osi czasu. Parametr ten skraca wyłącznie wizualną reprezentację nut granych przesadnym legato, tak aby nie nachodziły na siebie na pięciolinii.

Poniższa tabela przedstawia zachowanie geometryczne osi czasu dla poszczególnych trybów przeciągania:

| Tryb Przeciągania | Operacja: Nakładanie regionów                                                               | Operacja: Zmiana długości (Resize)                                              | Operacja: Usunięcie klipu (Delete)                                                  |
| :---------------- | :------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------- |
| **Overlap**       | Zachowuje oryginalne granice obu obiektów; klip przeciągany układa się na warstwie wyższej. | Zmiana krawędzi nie wpływa na sąsiednie klipy (może tworzyć ukryte nakładanie). | Usuwa wybrany klip, pozostawiając puste miejsce (gap) na osi czasu.                 |
| **No Overlap**    | Automatycznie skraca lub dzieli klip pod spodem, eliminując ukryte warstwy.                 | Zmiana krawędzi docina sąsiedni klip w punkcie styku, zapobiegając nakładaniu.  | Usuwa klip, pozostawiając puste miejsce; nie przesuwa sąsiednich obiektów.          |
| **X-Fade**        | Tworzy automatyczne przenikanie (crossfade) na obszarze wspólnym obu klipów audio.          | Dynamicznie modyfikuje długość i krzywą przenikania w miarę przesuwania granic. | Usuwa klip wraz z powiązanymi z nim krzywymi przenikania na sąsiednich krawędziach. |
| **Shuffle L**     | Wepchnięcie klipu między inne powoduje, że zamieniają się one miejscami (brak luk).         | Skrócenie lewego brzegu przesuwa poprzedzające regiony w prawo.                 | Wszystkie klipy po prawej stronie przesuwają się w lewo o długość usuniętego klipu. |
| **Shuffle R**     | Wepchnięcie klipu powoduje automatyczną zamianę pozycji i dociągnięcie do prawej.           | Wydłużenie prawego brzegu przesuwa wszystkie kolejne klipy w prawo.             | Wszystkie klipy po lewej stronie przesuwają się w prawo o długość usuniętego klipu. |

### **Scenariusze Brzegowe i Podatności na Błędy Silnika (Edge Cases)**

Deweloper tworzący własne oprogramowanie DAW musi zaimplementować mechanizmy obronne przed klasycznymi błędami, które występowały historycznie nawet w dojrzałych środowiskach:

> - **Błąd Zagubionego Przenikania (Stolen Crossfade Bug):** W trybie _Overlap_, jeśli użytkownik najpierw ręcznie wykona podziały i nałoży krzywe crossfade, a następnie przeciągnie nowy klip na ten obszar, wadliwy silnik może błędnie przypisać istniejące identyfikatory crossfade do lewej krawędzi nowego klipu. Skutkuje to natychmiastowym wyciszeniem ścieżki audio zaraz po zakończeniu odtwarzania nowego klipu. Zapobiega się temu poprzez izolację obiektów crossfade jako unikalnych encji przypisanych do konkretnych par regionów, a nie fizycznych współrzędnych ścieżki.
> - **Problem Powielonych Fades i Odtwarzania Pliku Macierzystego (Ghost Playback):** Przy powielaniu regionów powiązanych relacją przenikania, kopiowane są również referencje do plików audio. Jeśli silnik nie odświeży prawidłowo wskaźników granic (boundaries), może dojść do sytuacji, w której system odtwarza fragmenty pliku wykraczające poza widoczne granice zedytowanego klipu (tzw. odtwarzanie ukrytego audio).
> - **Trunkacja Folderów Take'ów (Take Folders) w No Overlap:** Podczas pracy z wielościeżkowymi podejściami (Take Folders), włączenie trybu _No Overlap_ przy operacjach dzielenia (split) lub powielania może doprowadzić do nieoczekiwanego obcięcia pustych przestrzeni wewnątrz folderu kompozycji (comping). Rozwiązaniem jest wyłączenie działania algorytmu _No Overlap_ wewnątrz kontenerów nadrzędnych typu Take Folder.

## **3\. Architektura Wielonarzędziowa i Inteligentne Strefy Kliknięć (Smart Tool Click Zones)**

Ergonomia pracy w DAW opiera się na eliminacji zbędnych kliknięć. Logic Pro realizuje to poprzez zaawansowany system podziału myszy na trzy przypisywalne narzędzia: pod lewym przyciskiem myszy, pod klawiszem Command oraz pod prawym przyciskiem myszy. Dodatkowo, włączenie stref kliknięć (Click Zones) sprawia, że kursor myszy automatycznie adaptuje się do pozycji wskaźnika nad regionem.

### **Podział Geometryczny Regionu**

Jeśli wysokość graficzna regionu wynosi H pikseli, a jego długość rozciąga się od współrzędnej S do E, podział przestrzeni interakcji wygląda następująco:

> 1. **Górna strefa (y \\in \[0.0H, 0.5H\]):**

- **Lewy i prawy narożnik (x \\in \[S, S \+ 12\\text{ px}\] lub x \\in \[E \- 12\\text{ px}, E\]):** Obszar aktywacji **Fade Tool**. Kursor zmienia się w ikonę łuku przenikania, umożliwiając szybkie rysowanie krzywych głośności. Przytrzymanie klawisza Option w tym miejscu przełącza funkcjonalność w tryb pętli (Loop).
- **Środek (x pomiędzy narożnikami):** Klasyczny wskaźnik wyboru (Pointer Tool) służący do zaznaczania całego obiektu i jego przemieszczania.

> 2. **Dolna strefa (y \\in \[0.5H, 1.0H\]):**

- **Lewy i prawy narożnik dolny:** Obszar aktywacji **Trim Tool**, służący do skracania lub wydłużania fizycznego okna widoczności audio/MIDI.
- **Środek dolnej strefy:** Obszar aktywacji **Marquee Tool** (wskaźnik celownika). Pozwala na precyzyjną selekcję przedziałów czasowych wewnątrz jednego lub wielu regionów jednocześnie.

### **Zaawansowane Operacje Narzędziem Marquee**

Narzędzie Marquee jest fundamentem szybkiej edycji niekonstruktywnej. Silnik DAW powinien wspierać następujące kluczowe zachowania oparte na zaznaczeniu ramkowym:

| Gest / Skrót Klawiszowy z Marquee                    | Opis Zachowania Silnika DAW                                                                                 | Wynik Geometryczny na Osi Czasu                                                                                                |
| :--------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **Zaznaczenie \+ Double-Click**                      | Wykonanie podwójnego kliknięcia w dolnej strefie regionu za pomocą wskaźnika Marquee.                       | Automatyczne przecięcie regionu dokładnie na najbliższej linii siatki przyciągania względem pozycji kliknięcia.                |
| **Zaznaczenie \+ Klawisz 'Delete'**                  | Usunięcie wybranego przedziału czasowego wewnątrz regionu.                                                  | Rozcięcie regionu na krawędziach selekcji i usunięcie środkowego fragmentu.                                                    |
| **Zaznaczenie \+ Klawisz 'M'**                       | Wyciszenie wybranego przedziału czasowego bez wpływu na resztę ścieżki.                                     | Przecięcie regionu na granicach selekcji, wyizolowanie nowego regionu środkowego i nadanie mu flagi _Mute_.                    |
| **Option \+ Przeciągnięcie (Drag)**                  | Skopiowanie zaznaczonego fragmentu Marquee na inną ścieżkę lub w inne miejsce osi czasu.                    | Tworzy nowy region w miejscu docelowym; krawędzie cięcia na regionie źródłowym ulegają automatycznemu scaleniu (heal).         |
| **Zaznaczenie Pustego Obszaru \+ Cmd+C \-\> Cmd+V**  | Skopiowanie selekcji Marquee obejmującej puste miejsce (brak regionów) i wklejenie jej w nowej lokalizacji. | Kopiuje ciszę i precyzyjny offset czasowy, co ułatwia synchronizację ścieżek, które nie zaczynają się na mocną część taktu.    |
| **Strzałki Lewo/Prawo (Tab to Transient)**           | Nawigacja krawędzią zaznaczenia Marquee za pomocą klawiatury.                                               | Granice selekcji Marquee automatycznie przyciągają się do najbliższych wykrytych transientów w pliku audio.                    |
| **Zaznaczenie \+ Przejście do widoku automatyzacji** | Wybór obszaru czasowego przy aktywnej ścieżce automatyzacji parametrów.                                     | Kliknięcie w obszar zaznaczenia narzędziem Pointer automatycznie tworzy cztery punkty węzłowe automatyzacji na jego granicach. |

## **4\. Algorytmy Rozciągania Czasowego (Time Stretching)**

Rozciąganie czasowe (Time Stretching) w nowoczesnym programie DAW musi odbywać się w sposób niedestrukcyjny, pozwalając na szybkie dopasowywanie pętli i regionów do tempa projektu.

### **Rozciąganie Proporcjonalne (Option-Drag)**

Podstawową metodą szybkiego rozciągania jest przytrzymanie klawisza Option (Alt) i przeciągnięcie dolnej krawędzi zmiany rozmiaru (Trim) regionu.

#### **Skalowanie Nieliniowe w MIDI**

Dla klipów MIDI rozciąganie polega na proporcjonalnym przeliczeniu pozycji nut oraz ich długości w domenie cyfrowej. Niech L\_{\\text{old}} \= E\_{\\text{old}} \- S\_{\\text{old}} będzie pierwotną długością klipu, a L\_{\\text{new}} \= E\_{\\text{new}} \- S\_{\\text{old}} nową długością po operacji przeciągania. Współczynnik proporcji czasu R wynosi:  
R \= \\frac{L\_{\\text{new}}}{L\_{\\text{old}}}  
Dla każdej nuty o pozycji początkowej N\_{\\text{start}} oraz długości trwania N\_{\\text{dur}} przypisanych do wnętrza rozciąganego regionu, nowe wartości pozycjonowania N'\_{\\text{start}} i długości N'\_{\\text{dur}} wyrażone są wzorami:  
N'\_{\\text{start}} \= S\_{\\text{old}} \+ (N\_{\\text{start}} \- S\_{\\text{old}}) \\times R N'\_{\\text{dur}} \= N\_{\\text{dur}} \\times R  
W przypadku edycji nut wewnątrz edytora Piano Roll, zaznaczenie grupy nut i użycie skrótu Shift \+ Option podczas przeciągania krawędzi pozwala na przeskalowanie ich wzajemnych relacji czasowych bezpośrednio wewnątrz regionu.

#### **Skalowanie Audio w Czasie Rzeczywistym**

W przypadku regionów audio, silnik DAW musi narzucić na odtwarzany plik algorytm czasu rzeczywistego (np. z biblioteki zintegrowanej z silnikiem, korzystającej z metod takich jak WSOLA lub Phase Vocoder). Po zakończeniu przeciągania krawędzi faza fali dźwiękowej (waveform) na ekranie musi zostać przeliczona i wyrenderowana na nowo, odzwierciedlając zagęszczenie lub rozciągnięcie transjenci.

## **5\. Dynamiczny Silnik Flex Time i Obsługa Transientów**

Technologia Flex Time pozwala na nieliniową edycję mikro-timingu wewnątrz plików audio bez dzielenia ich na setki drobnych kawałków. System ten opiera się na inteligentnej analizie transientów.

### **Typy Markerów i Klasyfikacja Wizualna**

Silnik Flex operuje na czterech typach linii pomocniczych generowanych na fali dźwiękowej:  
\+-----------------------------------------------------------------+  
| | | | | | | |  
| | (szary) | (biały) | (niebi) | (szary) | (biały) | (szary) |  
| | Trans | Manual | Tempo | Trans | Quant | Trans |  
| | | | | | | |  
\+-----------------------------------------------------------------+

> 1. **Transient Markers (Markery Transientów):** Cienkie, jasnoszare linie pionowe wykrywane automatycznie podczas pierwszej analizy pliku przez silnik DAW. Nie wpływają one na czas odtwarzania, dopóki nie zostaną aktywowane.
> 2. **Manual Flex Markers (Ręczne Markery Flex):** Grube białe linie z trójkątnym uchwytem na górze. Są to tzw. sztywne kotwice czasowe (hard anchors) tworzone przez użytkownika.
> 3. **Tempo Flex Markers:** Ciemnoniebieskie linie dopasowujące klipy audio bezpośrednio do zmian na globalnej ścieżce tempa projektu.
> 4. **Quantize Flex Markers:** Powstają automatycznie po wywołaniu operacji kwantyzacji dźwięku z poziomu inspektora regionu.

### **Zasady Generowania Markerów ze względu na Strefę Kliknięcia**

Gdy tryb Flex jest aktywny na ścieżce, kursor nad regionem zmienia zachowanie w zależności od osi Y:

> - **Górna połowa regionu (Single Flex Marker Tool):** Kliknięcie na transient lub w wolne miejsce fali tworzy dokładnie **jeden** ręczny marker Flex. Ruch tego markera rozciąga materiał dźwiękowy od tego punktu aż do najbliższego sąsiedniego markera Flex po lewej i prawej stronie (lub do fizycznych krawędzi regionu).
> - **Dolna połowa regionu (Triple Flex Marker Tool):** Kliknięcie tworzy automatycznie **trzy** markery Flex. Jeden marker główny (do przeciągania) pojawia się pod kursorem, a dwa dodatkowe markery kotwiczące (anchors) są automatycznie umieszczane na sąsiednich transientach po lewej i prawej stronie. Dzięki temu ruch środkowego markera rozciąga dźwięk wyłącznie wewnątrz tych wąskich widełek, nie naruszając timingu pozostałej części frazy muzycznej.

### **Fizyka Przeciągania i Interakcja Międzyścieżkowa**

Podczas implementacji zachowania markerów Flex należy uwzględnić następujące algorytmy interaktywne:

> - **Przekraczanie sąsiednich markerów (Crossing Behavior):** Jeśli użytkownik przeciągnie marker Flex M\_2 na tyle daleko w lewo, że przekroczy on pozycję markera M\_1, marker M\_1 powinien automatycznie "odskoczyć" wstecz do pozycji swojego oryginalnego transientu źródłowego. Pozwala to na elastyczne rozszerzanie zakresu edycji bez blokowania interfejsu.
> - **Re-anchoring (Modyfikator Option):** Przytrzymanie klawisza Option podczas przeciągania markera Flex umożliwia zmianę jego pozycji (przypięcie do innego transientu) bez fizycznego rozciągania samej fali audio pod spodem.
> - **Wielokanałowe Wyrównywanie (Inter-Track Guideline Snapping):** Edytując np. nagranie wokalu dublującego (double-track), użytkownik może przeciągnąć marker Flex pionowo w dół/górę w stronę ścieżki wokalu głównego (lead). Na sąsiednim torze wyświetla się wówczas żółta pionowa linia magnetyczna, która pozwala na idealne przyciągnięcie i wyrównanie fazy transientów obu ścieżek.
> - **Wizualizacja Naprężeń Materiału (Color Coding):** Tło regionu pod falami ulega dynamicznemu zabarwieniu: kolor zielony oznacza kompresję czasu (przyspieszenie), kolor pomarańczowy oznacza ekspansję (zwolnienie), natomiast kolor czerwony sygnalizuje krytyczne rozciągnięcie grożące drastyczną degradacją jakości dźwięku.

## **6\. Obsługa Zdarzeń MIDI w Scenariuszach Nakładania i Nagrywania**

Format MIDI, z racji swojej struktury opartej na komunikatach binarnych, stwarza unikalne wyzwania przy nakładaniu się danych. W przeciwieństwie do ścieżek audio, gdzie nakładanie sygnałów realizowane jest przez proste sumowanie próbek w mikserze, nakładanie identycznych nut MIDI o tym samym kanale i wysokości skutkuje błędami odtwarzania.

### **Problem Odcięcia Komunikatu (Note Off Cutoff)**

Jeśli dwie identyczne nuty (np. C3) nakładają się czasowo na tej samej ścieżce, silnik syntezatora otrzymuje komendy w kolejności chronologicznej:

> 1. t \= 0: Note On (Nuta 1\) \\rightarrow start dźwięku.
> 2. t \= 4: Note On (Nuta 2\) \\rightarrow syntezator może uruchomić drugi głos lub zignorować komunikat.
> 3. t \= 6: Note Off (Nuta 1\) \\rightarrow **syntezator wyłącza całkowicie brzmienie nuty C3**.
> 4. t \= 10: Note Off (Nuta 2\) \\rightarrow ponowne, bezużyteczne wyciszenie.

W rezultacie druga nuta przestaje brzmieć już w punkcie t \= 6\. Aby temu zapobiec, silnik DAW musi posiadać wbudowany automat czyszczący – funkcję Remove Overlaps.  
Podczas edycji Piano Roll lub importu klipów, silnik powinien automatycznie skrócić długość pierwszej nuty tak, aby kończyła się dokładnie 8\\text{ ticks} przed rozpoczęciem kolejnej:  
E'\_1 \= S\_2 \- 8\\text{ ticks}  
Dzięki temu eliminowane jest nakładanie się faz komend Note Off i Note On.

### **Logika Nagrywania Nakładających Się Regionów (Overlapping MIDI Recording)**

DAW musi precyzyjnie reagować na sytuacje, w których użytkownik nagrywa nowe partie MIDI na ścieżce, na której istnieją już inne klipy. Logic Pro definiuje odrębne pakiety zachowań w zależności od stanu trybu zapętlenia (Cycle).

#### **Zachowanie przy wyłączonym zapętleniu (Cycle Off)**

> - **Create Take Folder:** Nowe nagranie oraz stary region są pakowane do specjalnego kontenera wielowarstwowego (Take Folder) umożliwiającego późniejszy comping.
> - **Merge:** Dane MIDI z nowego podejścia są natychmiast scalane z istniejącym regionem w jeden wspólny plik.
> - **Overlap:** Stary region pozostaje nietknięty, a pod spodem lub nad nim powstaje nowy, w pełni nakładający się region MIDI; obie warstwy grają jednocześnie.
> - **Create Track:** System automatycznie generuje nową ścieżkę pomocniczą o tym samym przypisaniu instrumentu i tam plasuje nagrany klip.

#### **Zachowanie w trybie zastępowania (Replace Mode)**

Jeżeli użytkownik aktywuje tryb zastępowania danych (Replace), nagrywanie MIDI zachowuje się jak rejestrator taśmowy. Wybór zachowania w ustawieniach preferencji determinuje wynik na osi czasu:

| Pod-tryb Zastępowania | Zachowanie Silnika wobec Istniejących Regionów                                                                                                                                  | Wynik na Osi Czasu po Zakończeniu Nagrania                                                             |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------- |
| **Region Erase**      | Kasuje całe istniejące regiony leżące w przedziale czasu trwania nagrania (od punktu wciśnięcia _Record_ do _Stop_), bez względu na to, czy użytkownik zagrał jakąkolwiek nutę. | Powstaje czysta przestrzeń, w której znajduje się wyłącznie nowo nagrany region.                       |
| **Region Punch**      | Kasuje istniejące regiony w nagrywanym przedziale czasowym, ale operacja ta aktywowana jest dopiero w momencie odebrania pierwszego komunikatu Note On z klawiatury.            | Zapobiega to usunięciu danych, jeśli użytkownik nagrywał w ciszy (np. czekając na swoje wejście).      |
| **Content Erase**     | Nie usuwa całych regionów, lecz precyzyjnie wycina i usuwa wszystkie komunikaty MIDI (nuty, kontrolery CC) wewnątrz istniejącego klipu w przedziale czasowym nagrywania.        | Granice regionów zewnętrznych pozostają nienaruszone, ale ich zawartość zostaje nadpisana nową partią. |
| **Content Punch**     | Działa analogicznie do Content Erase, lecz wycinanie komunikatów wewnątrz regionu następuje dopiero po odebraniu pierwszej zagranej nuty MIDI.                                  | Zapewnia maksymalne bezpieczeństwo przed przypadkową utratą danych.                                    |

## **7\. Scalanie Regionów (Join Regions)**

Łączenie pociętych fragmentów w jednolitą całość jest jedną z najczęściej wywoływanych operacji na osi czasu. Logika łączenia różni się drastycznie w zależności od typu importowanego materiału.

### **Scalanie Klipów Audio**

Podczas łączenia regionów audio (np. za pomocą komendy Join lub dedykowanego narzędzia Join Tool), system DAW nie może jedynie "zgrupować" obiektów graficznych. Musi wygenerować fizyczny plik na dysku (Digital Mixdown/Bounce):

> - **Sąsiedztwo:** Łączone regiony muszą znajdować się bezpośrednio obok siebie na tej samej ścieżce.
> - **Wypalanie efektów i głośności:** Nowo powstały plik audio uwzględnia wszelkie naniesione na regiony parametry głośności (Region Gain) oraz automatyczne krzywe przenikania (Crossfades). Długości crossfade i typy krzywych (np. Equal Power) są pobierane bezpośrednio z ustawień renderowania projektu.
> - **Spłaszczanie pętli (Flatten Loops):** Jeśli scalany jest region posiadający aktywne pętle (Loops), silnik DAW automatycznie powiela te pętle i zapisuje je jako jeden ciągły, nowy plik audio.
> - **Struktura mono/stereo:** Jeśli łączone są pliki o różnych panoramach lub szerokościach kanałów, nowy plik zostaje zrenderowany z uwzględnieniem parametrów miksera (pan i volume).

### **Scalanie Klipów MIDI**

W przypadku danych MIDI operacja jest znacznie prostsza i nie wymaga renderowania dyskowego. Nuty i komunikaty kontrolerów ze wszystkich zaznaczonych regionów są po prostu kopiowane do jednej, nowo utworzonej bazy danych wewnątrz pojedynczego, długiego regionu MIDI.  
Scalanie MIDI działa bezproblemowo nawet wtedy, gdy regiony leżą na różnych ścieżkach, nakładają się na siebie lub występują między nimi duże przerwy czasowe. Wszystkie parametry nadrzędne (np. transpozycja regionu) zostają zresetowane do wartości neutralnych w nowym klipie.

## **8\. Wytyczne Implementacyjne dla Dewelopera (Cursor DAW System Spec)**

Aby zaimplementować powyższe mechanizmy za pomocą oprogramowania Cursor bez wprowadzania chaosu architektonicznego, należy narzucić modelowi AI sztywne ramy programistyczne oparte na sprawdzonych wzorcach projektowych.

### **Model Danych Klipu (Interval Tree Pattern)**

Tradycyjna tablica obiektów nie radzi sobie z szybkim wyszukiwaniem kolizji czasowych przy tysiącach regionów. Podstawą silnika osi czasu powinno być drzewo przedziałowe (Interval Tree), w którym każdy klip reprezentowany jest jako unikalny węzeł:  
interface DAWRegion {  
id: string;  
trackId: string;  
start: number; // Wyrażone w ticks (czas muzyczny) lub samples (czas rzeczywisty)  
duration: number; // Długość trwania  
end: number; // start \+ duration  
clipOffset: number; // Przesunięcie relatywne dla Relative Snap  
type: 'AUDIO' | 'MIDI';  
audioSource?: {  
fileUri: string;  
trimStart: number; // Punkt rozpoczęcia odtwarzania wewnątrz pliku źródłowego  
};  
midiEvents?: Array\<MIDIEvent\>;  
}

Dzięki strukturze drzewa przedziałowego wyszukanie obiektów nakładających się w trybie No Overlap sprowadza się do zapytania o złożoności obliczeniowej O(\\log n \+ k), co gwarantuje płynność działania interfejsu przy 60\\text{ fps}.

### **Transakcyjność Operacji Geometrycznych**

Jednym z najczęstszych błędów podczas pisania DAW z pomocą AI jest bezpośrednie modyfikowanie bazy danych projektu podczas każdego ruchu myszą. Prowadzi to do desynchronizacji odtwarzacza audio i powstawania artefaktów.  
Wszelkie operacje przeciągania muszą być **transakcyjne**:

> 1. **On Drag Start:** Silnik tworzy płytką kopię struktur danych ścieżki (Snapshot) i przechodzi w stan wizualizacji tymczasowej (Temporary State).
> 2. **On Drag Move:** Zmiany pozycji klipów i docinanie są kalkulowane wyłącznie w pamięci podręcznej i rysowane na warstwie tymczasowej (Overlay) interfejsu graficznego.
> 3. **On Drag End (Mouse Up):** Silnik wykonuje ostateczną walidację kolizji, wywołuje algorytm No Overlap lub X-Fade na oryginalnej bazie danych, zapisuje stan do historii zmian (Undo/Redo History) i dopiero wtedy wysyła sygnał do silnika odtwarzania (Audio Engine Buffer) o konieczności przebudowania kolejki odtwarzania.

### **Maszyna Stanów Interakcji Myszki (Pointer Interaction State Machine)**

Kod odpowiedzialny za obsługę zdarzeń wejściowych myszy powinien być całkowicie odizolowany od logiki rysowania ścieżek. Należy zaimplementować maszynę stanów (FSM), która na podstawie pozycji kursora i wciśniętych modyfikatorów zmienia tryb interakcji:  
\[Mouse Move\]  
|  
\+--------------+--------------+  
| |  
\[y \< 50% Height\] \[y \>= 50% Height\]  
| |  
\+-------+-------+ \+-------+--\[span\_82\](start\_span)\[span\_82\](end\_span)-----+  
| | | |  
\[Near Edge\] \[Centroid\] \[Near Edge\] \[Centroid\]  
| | | |  
\[FADE\_STATE\] \[POINTER\_STATE\] \[TRIM\_STATE\] \[MARQUEE\_STATE\]

Dzięki takiemu podejściu, Cursor bez problemu zrozumie, że każda strefa klipu ma swój unikalny zestaw funkcji i nie będzie mieszać kodu odpowiedzialnego za rozciąganie czasowe Option-drag z kodem zwykłego przesuwania czy rysowania zaznaczenia ramkowego.

#### **Cytowane prace**

1\. Snap items to the grid in Logic Pro for Mac \- Apple Support (GW), https://support.apple.com/en-gw/guide/logicpro/lgcpf7c0f66a/mac 2\. logic is randomly creating fades.........… \- Apple Support Community, https://discussions.apple.com/thread/602299 3\. Shorten overlapping notes in the Piano Roll Editor in Logic Pro for iPad \- Apple Support, https://support.apple.com/guide/logicpro-ipad/shorten-overlaps-lpipb2ca9f41/ipados 4\. Control positioning with drag modes, Logic Pro X Help, https://logicpro.skydocu.com/en/create-a-song-arrangement/work-in-the-tracks-area/control-positioning-with-drag-modes/ 5\. Assign tools, Logic Pro X Help, https://logicpro.skydocu.com/en/logic-pro-basics/work-with-tools-in-logic-pro/assign-tools/ 6\. How To Stretch Midi or Audio Blocks In Logic Pro X \- YouTube, https://www.youtube.com/watch?v=M8dYsJW\_FuI 7\. How to use Logic Pro snap to grid more effectively and easily \#musicproducer \#logicprox \- YouTube, https://www.youtube.com/shorts/Q2ql-slZbT0 8\. Mastering Logic Pro: Absolute & Relative Time (Video 5 \- Snap to Grid) \- YouTube, https://www.youtube.com/watch?v=JiZp9YKelEQ 9\. Logic's snapping is by far my biggest pain. How the can I have it always snap while resizing, moving etc to an actual measure \- say 16th? Zoomed out everything looks perfectly snapped But 2 mins into the tune things get out of time... : r/Logic\_Studio \- Reddit, https://www.reddit.com/r/Logic\_Studio/comments/16al4ml/logics\_snapping\_is\_by\_far\_my\_biggest\_pain\_how\_the/ 10\. Can I save Snap Regions To Absolute Value? \- Logic Pro Help, https://www.logicprohelp.com/forums/topic/112959-can-i-save-snap-regions-to-absolute-value/ 11\. Selecting multiple regions doesn't work as expected \- Logic Pro Help, https://www.logicprohelp.com/forums/topic/60251-selecting-multiple-regions-doesnt-work-as-expected/ 12\. Pointer shortcuts for the Tracks area in Logic Pro for Mac \- Apple Support (OM), https://support.apple.com/en-om/guide/logicpro/lgcpea796663/mac 13\. No Overlap region parameter in Logic Pro \- Apple Support (JO), https://support.apple.com/en-jo/guide/logicpro/lgcp85361cce/10.7/mac/11.0 14\. Having an issue with audio regions & overlap behavior in Logic 12, https://www.logicprohelp.com/forums/topic/163229-having-an-issue-with-audio-regions-overlap-behavior-in-logic-12/ 15\. Track loses sound when you move an Audio Region in Overlap \- Logic Pro Help, https://www.logicprohelp.com/forums/topic/65572-track-loses-sound-when-you-move-an-audio-region-in-overlap/ 16\. having an issue with audio regions & overlap behavior in logic 12 : r/Logic\_Studio \- Reddit, https://www.reddit.com/r/Logic\_Studio/comments/1qt3pec/having\_an\_issue\_with\_audio\_regions\_overlap/ 17\. Setting up Logic in Pro Tools “Smart Tool” mode, https://www.logicproforsmarties.com/setting-up-logic-in-pro-tools-smart-tool-mode/ 18\. Best Practice \- Logic Pro for Smarties, https://www.logicproforsmarties.com/category/best-practice/ 19\. What is the best Logic pro feature/tip that you didn't know at the beginning? : r/Logic\_Studio, https://www.reddit.com/r/Logic\_Studio/comments/1g5r590/what\_is\_the\_best\_logic\_pro\_featuretip\_that\_you/ 20\. Here's A Tutorial On How To Use Logic's Fade Tool : r/Logic\_Studio \- Reddit, https://www.reddit.com/r/Logic\_Studio/comments/ewyzzw/heres\_a\_tutorial\_on\_how\_to\_use\_logics\_fade\_tool/ 21\. Select parts of regions in Logic Pro for Mac \- Apple Support (AZ), https://support.apple.com/en-az/guide/logicpro/lgcpf7c0ae21/mac 22\. Marque Of Distinction \- Sound On Sound, https://www.soundonsound.com/techniques/marque-distinction 23\. 6 Reasons to Use the Logic Marquee Tool, https://whylogicprorules.com/marquee-tool/ 24\. Split Clip at Playhead not working right \- Logic Pro Help, https://www.logicprohelp.com/forums/topic/106338-split-clip-at-playhead-not-working-right/ 25\. How do y'all time-stretch in Logic (audio \+ MIDI)? I'm new to it. : r/Logic\_Studio \- Reddit, https://www.reddit.com/r/Logic\_Studio/comments/1p52933/how\_do\_yall\_timestretch\_in\_logic\_audio\_midi\_im/ 26\. how to slow down audio and midi region? \- Logic Pro Help, https://www.logicprohelp.com/forums/topic/66047-how-to-slow-down-audio-and-midi-region/ 27\. How To Time Stretch Audio In Logic Pro \- YouTube, https://www.youtube.com/watch?v=f933-IqUA3k 28\. Flex Markers \- Logic Studio Training Wiki, https://logicstudiotraining.com/wiki/index.php/Flex\_Markers 29\. Time stretch using flex markers, Logic Pro X Help, https://logicpro.skydocu.com/en/edit-the-timing-and-pitch-of-audio/edit-the-timing-of-audio/time-stretch-using-flex-markers/ 30\. Flex Time: Four Markers and the Seven Tools \- Logic Pro GEM, http://logicprogem.com/Logic-Pro-X-Tutorials/Entries/2014/10/flex-time-four-markers-and-the-seven-tools.html 31\. Logic | Using Flex Time on Vocals, https://www.soundonsound.com/techniques/logic-using-flex-time-vocals 32\. Multitrack Flex Editing \- curious behavior \- Logic Pro Help, https://www.logicprohelp.com/forums/topic/112219-multitrack-flex-editing-curious-behavior/ 33\. Audio Production Basics with Logic Pro X 9781538137239, 9781538137246, 1538137232 \- DOKUMEN.PUB, https://dokumen.pub/audio-production-basics-with-logic-pro-x-9781538137239-9781538137246-1538137232.html 34\. Logic Pro 9 Power\!: The Comprehensive Guide, http://sccweb.scea.wa.edu.au/C3\_Media/workshops/PDF/Logic%20Pro%209%20Power\!%20The%20Comprehensive%20Guide%202010.pdf 35\. Recording settings in Logic Pro for Mac \- Apple Support (BW), https://support.apple.com/en-bw/guide/logicpro/lgcp411dd5c8/mac 36\. Overlapping MIDI recording preferences (again) \- Logic Pro Help, https://www.logicprohelp.com/forums/topic/154281-overlapping-midi-recording-preferences-again/ 37\. Logic Pro X 10.3.0 Update\! | jonatanrosales.com, https://jonatanrosales.com/logic-pro-x-10-3-0-update/ 38\. Join regions in Logic Pro for Mac \- Apple Support, https://support.apple.com/ar-kw/guide/logicpro/lgcpaa45acde/mac 39\. Split and join regions in Logic Pro for iPad \- Apple Support, https://support.apple.com/pl-pl/guide/logicpro-ipad/lpip98d86a3e/ipados

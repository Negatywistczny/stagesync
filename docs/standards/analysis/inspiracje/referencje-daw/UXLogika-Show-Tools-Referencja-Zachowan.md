> From: https://gemini.google.com/app/b160ce95f586b17b

Referencja Zachowań Show Tools

# Specyfikacja referencyjna zachowań sekwencjonowania i transportu FOH dla StageSync

Niniejsze opracowanie stanowi architektoniczną referencję zachowań dla silnika transportu oraz automatyki setlisty w systemie StageSync, przygotowaną z perspektywy analityka logiki oprogramowania estradowego i cyfrowych stacji roboczych dźwięku (DAW). Dokonując syntezy rozwiązań znanych z Ableton Live (mechanizmy Follow Actions na poziomie klipów i scen) , QLab (łańcuchy cue, opóźnienia pre/post-wait, tryby auto-follow oraz continue) oraz MainStage (lokatory i punkty skoku) , wyekstrahowano deterministyczny podzbiór zachowań zoptymalizowany pod kątem bezawaryjnej pracy w warunkach koncertowych na stanowisku realizatora FOH (Front of House). Dokument definiuje formalny pięciostanowy automat stanów transportu, precyzuje semantykę wyznaczania granicy końca utworu w oparciu o jedyną oś czasu serwera (Timebase SSOT oparta na liczbach całkowitych ticków i stałej rozdzielczości PPQ) , analizuje złożone warunki wyścigu (race conditions) podczas interwencji operatora oraz wyznacza twardą granicę funkcjonalną pomiędzy potrzebami zespołu koncertowego a zbędną na estradzie złożonością systemów teatralnych.

## Model stanów i algorytmy transportu

Dla zapewnienia absolutnego determinizmu w warunkach koncertowych, silnik transportu serwera StageSync opiera swoje działanie na ścisłym automacie skończonym. W przeciwieństwie do tradycyjnych stacji DAW przeznaczonych do pracy studyjnej, gdzie przejście od odtwarzania do zatrzymania jest operacją czysto lokalną, system estradowy pracujący w architekturze klient-serwer wymaga jednoznacznego stanu opisującego nie tylko sam odczyt, ale również proces przygotowania, przeładowania i gotowości następnego elementu setlisty . Stan ten jest autorytatywnie generowany na serwerze i synchronicznie rozgałęziany do wszystkich podłączonych pulpitów (ekrany muzyków, widoki stanowiskowe, konsoleta FOH) za pośrednictwem protokołu WebSocket .

Zdefiniowano pięć kanonicznych stanów silnika transportu StageSync:

1. **Idle**: Stan spoczynku transportu. Wskaźnik pozycji `positionTicks` spoczywa na pozycji początkowej projektu `transportHomeTicks` (uwzględniającej pre-roll/countdown $\le 0$) lub na pozycji wskazanej ręcznie przez operatora za pomocą komendy seek . Zegary synchroniczne oraz wyjścia MIDI Clock są zatrzymane .
2. **Playing**: Transport jest aktywny. Serwer przelicza czas i inkrementuje pozycję `positionTicks` w czasie rzeczywistym na podstawie mapy tempa . Klienci otrzymują okresowe ramki stanu przez WebSocket i wykonują wygładzoną interpolację wizualną pomiędzy tickami .
3. **Waiting-for-end**: Stan przejściowy wykrywany wewnątrz fazy `Playing`, gdy bieżąca pozycja transportu przekracza zdefiniowany próg bufora ostrzegawczego przed końcem projektu (`positionTicks >= endTicks - leadTicks`). W tym stanie silnik sygnalizuje pulpitom scenicznym zbliżający się koniec utworu oraz inicjuje w tle asynchroniczną walidację zasobów kolejnego elementu setlisty.
4. **Advancing**: Stan atomowego przełączenia projektu w setliście, wywoływany po przekroczeniu `endTicks`, gdy flaga `autoAdvance.enabled` jest aktywna . Transport wycisza audio i sygnały wyjściowe, zatrzymuje naliczanie ticków bieżącego utworu, przełącza identyfikator aktywnego projektu (`activeProjectId`) na kolejny element setlisty oraz resetuje pozycję do `transportHomeTicks` nowego utworu .
5. **Failed-load**: Stan awaryjny wywoływany w sytuacji, gdy proces asynchronicznego ładowania kolejnego projektu z pamięci masowej zakończy się błędem (uszkodzenie struktury JSON, brak plików próbkowania audio, błąd dekodowania). Transport wymusza twardy stop (`playing = false`), wycisza tor sygnałowy i publikuje komunikat błędu o wysokim priorytecie do interfejsu FOH i na ekrany sceniczne.

cykl życia automatu stanów opiera się na stałym przepływie intencji operacyjnych oraz zdarzeń czasowych. Ze stanu **Idle** przejście do **Playing** następuje poprzez odebranie komendy `PLAY` wyzwolonej z poziomu konsoli FOH lub zewnętrznego sygnału MIDI GO. W trakcie trwania fazy **Playing** inkrementacja ticków prowadzi do oszacowania progu końca utworu, co przełącza system w stan **Waiting-for-end**. Po przekroczeniu praworęcznej krawędzi utworu (`endTicks`), jeśli tryb auto-advance pozostaje włączony, silnik wchodzi w stan **Advancing** w celu załadowania nowego projektu . Udana transakcja ładowania przywraca system do stanu **Idle** na pozycji Home nowego utworu , natomiast błąd odczytu I/O przekierowuje automat do stanu **Failed-load**. Dowolna ręczna komenda `STOP` lub `PAUSE` odebrana z konsolety FOH w stanie **Playing**, **Waiting-for-end** lub **Advancing** natychmiastowo przerywa wykonywanie pętli i wymusza powrót do stanu **Idle**.

### Tabela przejść stanów silnika transportu serwera

| Stan początkowy       | Zdarzenie / Komenda wejściowa                  | Stan docelowy       | Działanie silnika (Server SSOT)                                                                  | Odpowiedź interfejsu klienta (Client Role)                                           |
| --------------------- | ---------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Idle**              | `PLAY` (FOH / MIDI GO)                         | **Playing**         | Rozpoczęcie emisji ticków od `positionTicks`; aktywacja wyjść zegarowych .                       | Uruchomienie autoscrollu Formy, podświetlenie aktywnego taktu i akordu.              |
| **Playing**           | `positionTicks >= endTicks - leadTicks`        | **Waiting-for-end** | Rejestracja zdarzenia bliskiego końca; podgląd metadanych następnego utworu.                     | Ekrany sceniczne (Karaoke/Grid) pokazują odliczanie do końca oraz tytuł następny.    |
| **Waiting-for-end**   | `positionTicks >= endTicks` (auto-advance ON)  | **Advancing**       | Zatrzymanie odtwarzania; przełączenie `activeProjectId`; reset pozycji do `transportHomeTicks` . | Płynna zmiana widoku Formy/Tekstu na nowy utwór; reset wskaźnika playheadu .         |
| **Waiting-for-end**   | `positionTicks >= endTicks` (auto-advance OFF) | **Idle**            | Zatrzymanie transportu na `endTicks` lub powrót do `transportHomeTicks` (Pause-at-end) .         | Wyświetlenie stanu zatrzymania („Pause at End”); oczekiwanie na ręczny impuls GO.    |
| **Advancing**         | Ładowanie zakończone sukcesem                  | **Idle**            | Potwierdzenie gotowości nowego projektu; publikacja nowego `TransportState` przez WS .           | Wyświetlenie nowej mapy utworu w stanie spoczynku (Ready).                           |
| **Advancing**         | Błąd I/O / Uszkodzony plik                     | **Failed-load**     | Przerwanie sekwencji; rejestracja logu błędu; ustawienie flagi błędu w stanie transportu.        | Wyświetlenie czerwonego alertu operatorskiego na konsoli FOH i ekranach scenicznych. |
| **Playing / Waiting** | `STOP` / `PAUSE` (Operator FOH)                | **Idle**            | Zatrzymanie inkrementacji ticków; zerowanie aktywnych nut MIDI; zatrzymanie audio.               | Zatrzymanie ruchu wskaźnika w miejscu lub skok do Home (zależnie od trybu Stop).     |
| **Failed-load**       | `RESET` / `LOAD_PROJECT` (FOH)                 | **Idle**            | Ręczne przeładowanie poprawnego projektu lub zmiana aktywnego elementu setlisty.                 | Przywrócenie spójnego interfejsu operacyjnego po usunięciu błędu.                    |

## Semantyka „koniec utworu” (End-of-Song Semantics)

Wtyczki, sekwencery oraz oprogramowanie do reżyserii spektakli stosują zróżnicowane podejścia do wyznaczania granicy zakończenia struktury muzycznej lub odtwarzanego materiału:

- **Ableton Live**: W widoku Session granica akcji `Follow Action` opiera się na parametrze `Action Time` wyrażonym w taktach, miarach i szesnastkach lub na przełączniku `Linked`, który wiąże czas wyzwolenia bezpośrednio z długością pętli klipu (`Loop Length`) . W widoku Arrangement punkty skoku i przejścia definiowane są przez lokatory na osi czasowej lub bezwzględny koniec ostatniego klipu .
- **QLab / Playback / GO Button**: Koniec cue wynika z czystego czasu trwania pliku audio (`Audio Duration`), wyznaczonego punktu `Out-point` lub upływu timera `Post-wait` powiązanego ze zdarzeniem. Systemy te operują na sekundach i milisekundach bezkwantowego czasu zegarowego (wall-clock).
- **MainStage**: Nawigacja opiera się na markerach sekcji i punktach skoku ustawianych w ścieżkach podkładów (Playback plugin) , gdzie osiągnięcie markera końca wymusza akcję zatrzymania lub przełączenia patcha w kompozycji.

### Definicja końca utworu w StageSync

Dla zachowania pełnej spójności z przyjętym aksjomatem dziedzinowym jedynej osi czasu (Timebase SSOT według ADR 0002) , StageSync kategorycznie odrzuca bezkwantowe odmierzanie czasu zegarowego oraz ciągłą detekcję ciszy sygnału audio na poziomie logiki domenowej . Detekcja ciszy w sygnale audio bywa zawodna w warunkach scenicznych ze względu na obecność szumów tła, wybrzmień pogłosowych (reverb tails) oraz celowych pauz dramatycznych (tacet) wewnątrz aranżacji kompozycji.

Kanonem granicy końca utworu (`endTicks`) w StageSync jest wyliczona wartość dyskretna na osi ticków (`positionTicks`), wyznaczana według następującej hierarchii ważności:

1. **Jawny klip typu Marker Końca / Outro**: Jeśli w warstwie Formy (`forma.clips`) zdefiniowano klip jednoznacznie oznaczony jako znacznik końca utworu lub sekcja Outro z ustawioną flagą wyjścia, jego krawędź początkowa (`startTicks`) stanowi kanoniczny punkt `endTicks` .
2. **Krawędź praworęczna ostatniego klipu Formy**: W przypadku braku jawnego markera końca, `endTicks` jest obliczany automatycznie jako najwyższa wartość prawej krawędzi spośród wszystkich klipów sekcji Formy:  
   $\text{endTicks} = \max_{c \in \text{forma.clips}} (c.\text{startTicks} + c.\text{lengthTicks})$
3. **Kwantyzacja do pełnego taktu**: Obliczona wartość `endTicks` jest zaokrąglana w górę do najbliższej granicy taktu na podstawie aktywnej mapy metrum (`meterMap`), co gwarantuje, że automatyczne przejście utworu nie nastąpi wewnątrz miary taktowej.

Wszystkie pozycje w silniku przetwarzane są wyłącznie jako integer ticks przy stałej rozdzielczości PPQ (np. 960 ticków na ćwierćnutę) . Wyznaczona wartość `endTicks` jest całkowicie niezależna od długości plików audio na dysku – pliki audio stanowią wyłącznie zawartość wykonawczą podłączoną do osi czasu, a nie źródło prawdy dla struktury utworu .

### Porównanie semantyki końca utworu w systemach referencyjnych

| Parametr / Cecha         | Ableton Live (Follow Actions)             | QLab / GO Button                     | MainStage / Locators           | StageSync (Kandydat SSOT)                        |
| ------------------------ | ----------------------------------------- | ------------------------------------ | ------------------------------ | ------------------------------------------------ |
| **Jednostka podstawowa** | Takty : Miary : Szesnastki / Linked Loop  | Sekundy / Milisekundy / Wall-clock   | Takty / Markery czasu          | **Integer ticks + PPQ** (SSOT)                   |
| **Wyznaczenie końca**    | Czas `Action Time` lub koniec pętli klipu | Czas trwania pliku audio / Out-point | Marker końcowy w Playback      | **Prawa krawędź Formy** / Marker końca           |
| **Detekcja ciszy**       | Brak (wymaga zewnętrznych wtyczek)        | Brak (wymaga analizy sygnału)        | Brak                           | **Brak** (wykluczona ze względów bezpieczeństwa) |
| **Pre-roll / Count-in**  | Niezależny takt odliczania                | Timer Pre-wait                       | Takt odliczania w sekwencerze  | **Pozycje $\le 0$** (ujemne ticki)               |
| **Relacja do Audio**     | Próbki audio dopasowywane do tempa (Warp) | Audio steruje czasem odtwarzania     | Audio spięte z czasem projektu | **Audio do osi ticków** (`ticksToMs`)            |

## Edge cases operatorskie i warunki wyścigu (FOH Race Conditions)

W warunkach koncertowych interfejs realizatora FOH oraz automatyka sceniczna nakładają się na siebie. Sytuacje wyścigu (race conditions) występujące na stykach asynchronicznego I/O, komunikacji sieciowej WebSocket oraz wywołań komend transportu stanowią główne źródło potencjalnych awarii podczas występów na żywo . System StageSync przyjmuje **Paradygmat Priorytetu Operatora**: komenda wydana ręcznie przez realizatora FOH bezwzględnie unieważnia i natychmiastowo przerywa dowolny trwający lub zaplanowany proces automatyczny.

### Analiza kluczowych sytuacji wyścigu i algorytmy ich rozwiązywania

#### Sytuacja 1: GO wywołane w trakcie automatycznego przełączania utworu (`Advancing`)

Gdy odtwarzany utwór dojdzie do końca i silnik wejdzie w stan `Advancing` (ładowanie kolejnego projektu z setlisty), operator FOH może impulsywnie nacisnąć przycisk `GO` lub klawisz Spacji, chcąc natychmiast wymusić start kolejnego utworu .

- **Mechanizm wyścigu**: Jeśli komenda `PLAY` zostanie przetworzona przez serwer w momencie, gdy zasoby nowego projektu są w trakcie pobierania z dysku, występuje ryzyko uruchomienia odtwarzania na niekompletnym obiekcie lub wywołania wyjątku nieobsłużonej obietnicy (unhandled promise rejection).
- **Algorytm rozwiązania**: Komenda `PLAY` odebrana w stanie `Advancing` nie wywołuje natychmiastowego startu zegara. Zamiast tego serwer rejestruje flagę intencji odtwarzania (`pendingPlayOnLoad = true`). Z chwilą gdy asynchroniczna transakcja ładowania projektu zakończy się sukcesem i stan przejdzie do `Idle` na pozycji `transportHomeTicks`, silnik sprawdza obecność flagi `pendingPlayOnLoad`. Jeśli flaga jest aktywna, silnik automatycznie przechodzi do stanu `Playing` i zeruje flagę, elimując potrzebę ponownego wciskania przycisku przez operatora .

#### Sytuacja 2: Pauza lub Seek wykonane podczas oczekiwania na załadowanie (`await load`)

Operator FOH wciska `PAUSE` lub przesuwa wskaźnik odczytu (`SEEK`) w momencie, gdy serwer wykonuje asynchroniczne wywołanie I/O ładujące dane nowego projektu .

- **Mechanizm wyścigu**: Dokończenie powolnej operacji dyskowej (`await stores.getProject()`) po chwili może nadpisać nowo wybraną pozycję lub stan pauzy ustawiony ręcznie przez operatora, powodując nieoczekiwany skok playheadu lub samoczynny start audio .
- **Algorytm rozwiązania**: Każda transakcja ładowania projektu generuje na serwerze unikalny identyfikator UUID (`loadToken`). Każda ręczna zmiana stanu transportu (`PAUSE`, `SEEK`, `STOP`) inkrementuje lokalny identyfikator sesji i unieważnia bieżący `loadToken`. Gdy zaległa obietnica (Promise) odczytu dyskowego zostanie rozwiązana, silnik porównuje token transakcji z aktualnym identyfikatorem sesji. W przypadku braku zgodności, wyczytany obiekt projektu jest odrzucany, co zapobiega naruszeniu intencji operatora .

#### Sytuacja 3: Rozbieżność stanu WebSocket vs odczyt HTTP (`getTransport`)

Przejściowe zakłócenia sieci bezprzewodowej na scenie mogą sprawić, że klient wyśle zapytanie HTTP `GET /api/transport`, podczas gdy w tej samej milisekundzie serwer wyemituje przez WebSocket ramkę stanu ze skokiem pozycji .

- **Mechanizm wyścigu**: Odpowiedź HTTP docierająca do klienta z opóźnieniem może cofnąć wyświetlaną pozycję playheadu, powodując widoczne szarpnięcie interfejsu (jitter) .
- **Algorytm rozwiązania**: Każda zmiana stanu transportu na serwerze zawiera monotonicznie rosnący numer wersji (`stateVersion`). Klient akceptuje i aplikuje wyłącznie te aktualizacje (niezależnie czy pochodzą z HTTP, czy z WebSocket), których `stateVersion` jest ściśle wyższy od aktualnie posiadanego.

#### Sytuacja 4: Awaria odczytu projektu w trakcie auto-advance

Kolejny plik projektu w setliście jest uszkodzony lub został usunięty z dysku w trakcie trwania koncertu.

- **Algorytm rozwiązania**: Próba załadowania zakończona błędem przełącza silnik w stan `Failed-load`. Transport zatrzymuje odtwarzanie, wycisza tor audio, a setlista przechodzi w tryb zatrzymania awaryjnego. Zamiast zapętlać próby odczytu, serwer wysyła sygnał ostrzegawczy do FOH, umożliwiając operatorowi ręczne pominięcie uszkodzonego utworu (`SKIP_NEXT`) i przejście do kolejnej pozycji.

### Procedura obsługi wyścigów operacyjnych (FOH Resolution Protocol)

| Krok | Zdarzenie wejściowe | Stan silnika  | Sprawdzenie warunków             | Wynikowa akcja serwera (SSOT)                                                  |
| ---- | ------------------- | ------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| 1    | `PLAY`              | **Advancing** | `loadToken` w toku               | Ustawienie flagi `pendingPlayOnLoad = true`. Oczekiwanie na koniec I/O .       |
| 2    | I/O Success         | **Advancing** | `pendingPlayOnLoad == true`      | Przejście do **Playing** @ `transportHomeTicks` nowo załadowanego utworu .     |
| 3    | `SEEK`              | **Advancing** | `loadToken` w toku               | Inkrementacja `sessionToken`; unieważnienie `loadToken`; przerywa auto-start . |
| 4    | I/O Success         | **Idle**      | `loadToken` unieważniony         | Odrzucenie danych ładowania; zachowanie pozycji wymuszonej przez `SEEK` .      |
| 5    | WS Update           | **Klient UI** | `stateVersion <= currentVersion` | Odrzucenie ramki jako przestarzałej; brak modyfikacji stanu wizualnego .       |

## Świadome OUT oraz zasada „Nie kopiować chrome”

Projekt StageSync wyznacza precyzyjne ramy funkcjonalne oraz zasady projektowania interfejsu użytkownika (IA / UX) . Celem jest stworzenie narzędzia scenicznego o najwyższym stopniu niezawodności, a nie powielanie skomplikowanych środowisk teatralnych (QLab) czy stochastycznych systemów do improwizacji (Ableton Session View) .

### Wyznaczenie granic funkcjonalnych (MUST vs OUT)

Wymagania uznane za absolutnie niezbędne (**MUST**) dla zespołu koncertowego grającego z podkładami:

- **Deterministyczne automatyczne przejście**: Automatyczne załadowanie i ustawienie pozycji na pierwszym takcie/pre-rollu następnego utworu po osiągnięciu końca bieżącego kompozytu (`auto-advance`) .
- **Gwarantowany stop na końcu (Pause-at-end)**: Pełne zatrzymanie odtwarzania i wyciszenie torów sygnałowych po osiągnięciu `endTicks`, gdy tryb auto-advance pozostaje wyłączony .
- **Jednoprzyciskowy ręczny GO**: Natychmiastowe wyzwolenie odtwarzania lub przejście do kolejnego utworu za pomocą jednego klawisza (Spacja) lub zewnętrznego przełącznika nożnego MIDI .
- **Czytelna sygnalizacja stanu**: Wyraziste wskaźniki statusu ("READY", "PLAYING", "WAITING") na wszystkich pulpitach wykonawczych z podglądem tytułu następnego utworu.

Funkcje kategorycznie odrzucone (**OUT**):

- **Stochastyka i prawdopodobieństwo (Chance %)**: Mechanizmy losowego wyboru akcji znane z Ableton Live (Action Chance A/B) są niedopuszczalne w aranżacjach zespołów estradowych, gdzie wymagana jest powtarzalność formy kompozycji.
- **Zagnieżdżone struktury drzewiaste (Nested Cue Groups)**: Wielopoziomowe grupy, pętle wewnątrz pętli oraz złożone zależności znane z QLab wprowadzają niepotrzebną złożoność operacyjną. Setlista StageSync jest jednowymiarową, liniową listą elementów (utwory oraz wyznaczone przerwy) .
- **Sterowanie mediami wizyjnymi (Video / Lighting Cues)**: Odtwarzanie wideo, wyzwalanie komend DMX oraz obsługa wtyczek graficznych pozostają poza zakresem silnika transportu.
- **Czas bezkwantowy i wyzwalacze zegarowe**: Usunięcie odmierzania czasu trwania w sekundach niezależnie od siatki tempa (stale obowiązuje SSOT oparty o ticki i PPQ) .

### Zasada „Nie kopiować chrome”

Zgodnie z ustaleniami architektonicznymi zawartymi w ADR 0011 , interfejs użytkownika StageSync nie może powielać pętli i przycisków znanych z dawnych wersji oprogramowania ani kopiować układu graficznego z komercyjnych programów DAW:

- **Zakaz wprowadzania atrap UI (No Stubs)**: Zabrania się umieszczania w interfejsie nieaktywnych kontrolek, przycisków z informacją `disabled` „na zapas” czy szarych ikon sugerujących funkcje, które nie zostały w pełni zaimplementowane . Brak obsługi danej funkcji w silniku oznacza całkowity brak kontrolki w interfejsie .
- **Czystość języka projektowego**: Kontrolki transportu, paski stanu i listy utworów muszą wykorzystywać wyłącznie autorski system komponentów `@stagesync/ui` z rygorystycznym zachowaniem gęstości scenicznej i jednolitym akcentem interakcji .
- **Workflow zamiast wyglądu**: Celem jest odwzorowanie pewności gestu i szybkości pracy operatora FOH (szybkie przestawianie setlisty, czytelność z dużej odległości), a nie sklonowanie wyglądu paska narzędziowego z innego programu .

## Tabela mapowania zachowań referencyjnych

Poniższa tabela stanowi zbiorczą referencję mapowania zachowań z oprogramowania odniesienia (Ableton Live, QLab, MainStage) na architekturę StageSync. Każdy wiersz posiada unikalny identyfikator (`FA-01` … `FA-15`) przeznaczony do śledzenia w rejestrze prac programistycznych i triage.

| ID        | Zachowanie referencyjne (DAW / Show-Tool)    | Kontekst i mechanika w wzorcu                                                                      | Kandydat StageSync (Set / Auto-advance / Transport)                                                                          | Status (IN / LATER / OUT) | Rygor SSOT / Uwagi UX                                                          |
| --------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| **FA-01** | Follow Action: `Next` (Ableton)              | Po upływie `Action Time` następuje automatyczne uruchomienie klipu/sceny znajdującej się poniżej . | **Setlist Auto-Advance**: Automatyczne załadowanie i przejście do kolejnego projektu z setlisty po `endTicks` .              | **IN**                    | SSOT: Przejście wyzwalane na osi ticków (`positionTicks >= endTicks`) .        |
| **FA-02** | Follow Action: `Stop` (Ableton)              | Zatrzymanie odtwarzania ścieżki po zakończeniu odtwarzania klipu .                                 | **Pause-at-End**: Zatrzymanie transportu na końcu utworu i ustawienie na pozycji Home/End, gdy auto-advance jest wyłączony . | **IN**                    | Zapewnia bezpieczny stop bez przechodzenia do kolejnego utworu .               |
| **FA-03** | Follow Action: `Play Again` (Ableton)        | Ponowne wyzwolenie tego samego klipu od początku .                                                 | **Loop Song / Section**: Zapętlenie odtwarzania bieżącego utworu lub zaznaczonej sekcji Formy.                               | **LATER**                 | Zastosowanie głównie na próbach; na scenie potencjalnie niebezpieczne.         |
| **FA-04** | Follow Action: `Previous` / `First` / `Last` | Skok do poprzedniego, pierwszego lub ostatniego klipu w grupie .                                   | **Nawigacja Setlisty (Prev / Next)**: Ręczne komendy skoku między utworami na setliście z poziomu FOH.                       | **IN**                    | Przełączenie `activeProjectId` bez automatycznego startu odtwarzania .         |
| **FA-05** | Follow Action: `Jump` (Ableton 11+)          | Skok do ściśle określonego numeru indeksu klipu lub sceny .                                        | **Direct Song Select**: Bezpośredni wybór utworu z setlisty po podaniu indeksu lub komendą MIDI Program Change.              | **IN**                    | Zmiana aktywnego projektu z zachowaniem stanu `Idle`.                          |
| **FA-06** | Action Chance A/B (%) (Ableton)              | Stochastyczny stosunek wag prawdopodobieństwa wykonania akcji A vs B .                             | Brak odpowiednika (Odrzucenie niedeterminizmu).                                                                              | **OUT**                   | Kategorycznie usunięte ze względu na wymóg bezwarunkowej powtarzalności formy. |
| **FA-07** | Follow Action Linked / Unlinked              | Powiązanie czasu trwania akcji z długością pętli klipu lub ustawienie sztywne w taktach .          | **Form Boundary Binding**: Wyznaczanie `endTicks` z długości klipów sekcji Formy .                                           | **IN**                    | Eliminacja ręcznego wpisywania długości utworu w sekundach .                   |
| **FA-08** | Scene Follow Actions (Ableton)               | Auto-przejście całych wierszy Session View po czasie sceny .                                       | **Setlist Item Sequence**: Liniowa sekwencja projektów w setliście .                                                         | **IN**                    | Uproszczona modelowo wersja przejścia scenicznego dla poziomych utworów .      |
| **FA-09** | QLab: Auto-continue / Auto-follow            | Automatyczne wykonanie kolejnej cue natychmiast lub po upływie czasu Post-wait.                    | **Auto-Advance Toggle**: Przełącznik włączenia/wyłączenia auto-sekwencjonowania w setliście .                                | **IN**                    | Prosta flaga boolean w stanie setlisty (`autoAdvance.enabled`) .               |
| **FA-10** | QLab: Pre-wait / Post-wait Timers            | Odmierzanie czasowego bufora w sekundach przed lub po wykonaniu cue.                               | **Break Items**: Dedykowane pozycje przerw (np. 5 min pauzy) wewnątrz setlisty .                                             | **IN**                    | Przerwa opisywana czasem w minutach z odliczaniem wizualnym .                  |
| **FA-11** | MainStage: Locators / Marker Jump            | Skok do wstawionego markera w ścieżce podkładu po naciśnięciu przycisku .                          | **Section Jump (Forma)**: Kwantyzowany skok transportu do wskazanej sekcji Formy (Intro, Chorus, Outro).                     | **IN**                    | Skok realizowany na osi ticków z kwantyzacją do najbliższego taktu .           |
| **FA-12** | QLab: Group Cues (Nested)                    | Tworzenie wielopoziomowych drzew i kontenerów dla zadań scenicznych.                               | Brak odpowiednika (Płaska setlista).                                                                                         | **OUT**                   | Setlista w StageSync jest płaską tablicą struktur `Project` oraz `Break` .     |
| **FA-13** | QLab: Video / Surface Control                | Wyzwalanie materiałów wideo, sygnałów Syphon/NDI i przełączanie ekranów.                           | Brak odpowiednika.                                                                                                           | **OUT**                   | Wyłączone z obszaru odpowiedzialności silnika transportu.                      |
| **FA-14** | Manual GO Button (QLab / Playback)           | Jeden wielki przycisk wyzwalający następny krok w sekwencji.                                       | **FOH GO Command**: Klawisz Spacji / Dedykowany komendator WS / Przycisk MIDI GO.                                            | **IN**                    | Deterministyczne wywołanie: Play w stanie Stop, lub Next+Play w stanie End.    |
| **FA-15** | Countdown / Pre-roll Count-in                | Odliczanie wstępne przed właściwym pierwszym taktem utworu.                                        | **Countdown Section ($\le 0$)**: Ujemne ticki transportu dla taktów odliczania .                                             | **IN**                    | Takt 1 = start właściwy utworu; pre-roll żyje w strefie ticków $\le 0$ .       |

## Wnioski i wytyczne architektoniczne

Wdrożenie powyższej specyfikacji zachowań w systemie StageSync wymaga przestrzegania trzech kluczowych pryncypiów inżynieryjnych:

1. **Bezwzględny Rygor Timebase SSOT**: Wszystkie decyzje o przełączeniu utworu (`endTicks`), progach ostrzegawczych (`Waiting-for-end`) oraz kwantyzacji skoków musza być podejmowane przez serwer na osi integer ticks przy stałym PPQ . Klient pełni rolę wyłącznie prezentacyjną i interpolacyjną .
2. **Izolacja Transakcyjna Operacji Asynchronicznych**: Każda zmiana stanu transportu oraz ładowanie projektu musi być zabezpieczona unikalnymi tokenami sesyjnymi (`loadToken`, `stateVersion`), co gwarantuje pełną odporność na opóźnienia I/O oraz zakłócenia sieciowe bez ryzyka naruszenia intencji operatora FOH .
3. **Konsekwencja w Ograniczaniu Złożoności**: Zachowanie spójności produktu wymaga odrzucania funkcji stochastycznych oraz wielopoziomowych struktur drzewiastych na rzecz prostego, liniowego i w 100% przewidywalnego ciągu zdarzeń scenicznych .

---

Powered by [AI Exporter](https://saveai.net)

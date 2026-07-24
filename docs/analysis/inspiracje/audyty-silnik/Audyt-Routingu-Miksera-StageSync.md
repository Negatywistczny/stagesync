> From: https://gemini.google.com/app/664eae2c092d9a5b
>
> **Repo:** surowy dump — nie SSOT. Triage: [Audyt-Routingu-Miksera-StageSync.triage.md](./Audyt-Routingu-Miksera-StageSync.triage.md). Konwencje: [README](../README.md).

Audyt Routingu Miksera StageSync

# Audyt architektury routingu miksera StageSync: Model danych, matematyka i spójność z WebAudio

## Architektura miksera i topologia sygnałowa

Silnik miksowania audio w systemie StageSync opiera się na trójwarstwowej strukturze obejmującej deklaratywny model danych zaimplementowany w pakiecie `@stagesync/shared`, czystą warstwę matematyczną przeliczeń akustycznych oraz wykonawczy graf węzłów WebAudio API realizowany po stronie aplikacji przeglądarkowej w `apps/web` . 

Obecna topologia routingu wspiera dwupoziomową hierarchię miksowania :
* **Ścieżki audio (Audio Tracks):** Modyfikatory mono lub stereo kierujące sygnał bezpośrednio do szyny głównej (Master) bądź do jednej z maksymalnie 16 szyn grupowych (Group Busses) .
* **Szyny grupowe (Audio Busses):** Węzły podgrup sumujące sygnały ze ścieżek, których wyjście jest na stałe zmapowane do szyny Master .
* **Szyna główna (Master Bus):** Końcowy węzeł sumujący, z którego sygnał trafia bezpośrednio do fizycznego wyjścia interfejsu audio systemowego za pośrednictwem `AudioContext.destination` .

Zgodnie z założeniami architektonicznymi opisanymi w ADR 0011, system nie udostępnia w warstwie interfejsu użytkownika atrap wyjść fizycznych (takich jak Out 3–4), chroniąc użytkownika przed obietnicą routingu sprzętowego, który nie został zaimplementowany w warstwie silnika . Przetwarzanie sygnału odbywa się na podstawie reguł konwersji topologicznej (mono/stereo) oraz profilowanych, liniowo-logarytmicznych charakterystyk tłumików .

---

## Niespójności modelu danych i deklaracji grafu (Schema vs Runtime)

Niezawodność silnika audio wymaga spójności między walidacją schematów w pakiecie `@stagesync/shared` a alokacją węzłów WebAudio w `apps/web` . Audyt wykazał istotne rozbieżności pomiędzy deklaratywnym modelem Zod a zachowaniem silnika w czasie wykonywania (`runtime`).

### Rozbieżność domyślnego trybu kanału (`channelMode`)

W modelu `AudioTrackSchema` oraz `AudioBusSchema` pole `channelMode` jest opcjonalne . Funkcja pomocnicza `resolveChannelMode` w warstwie shared interpretuje wartość `undefined` lub `null` jako tryb `"stereo"` . Jednak podczas importu plików audio system wyznacza tryb na podstawie liczby kanałów zdekodowanego bufora `AudioBuffer.numberOfChannels` za pomocą funkcji `channelModeFromChannelCount`, gdzie $\le 1$ kanał wyznacza tryb `"mono"`, a $\ge 2$ tryb `"stereo"` .

Gdy nowa ścieżka zostaje utworzona bez jawnego określenia pola `channelMode` w bazie danych, silnik wykonawczy powołuje do życia strukturę `TrackBusStereo` . W konsekwencji jednokanałowy plik audio (mono) zaimportowany na ścieżkę z domyślnym brakiem wartości `channelMode` jest traktowany przez graf WebAudio jako sygnał stereo oparty na węźle True Balance zamiast mono z węzłem `StereoPannerNode` . Powoduje to nieprawidłowości w panoramowaniu i sumowaniu mocy wyjściowej .

### Weryfikacja docelowa wyjść ścieżek i brak kaskadowania szyn

Schemat `ProjectSchemaV5` zawiera regułę `superRefine`, która weryfikuje, czy identyfikator szyny `output.busId` przypisany do ścieżki istnieje w tablicy `audioBusses` projektu . Funkcja runtime `resolveTrackOutputDest` zabezpiecza silnik przed awarią poprzez sprowadzanie nieprawidłowych lub usuniętych szyn do szyny `MASTER_OUTPUT` . 

W przypadku samych szyn grupowych schemat `BusOutputDestSchema` ogranicza cel wyjściowy wyłącznie do unii `{ kind: "master" }` . Funkcja `resolveBusOutputDest` bezwarunkowo zwraca obiekt `{ kind: "master" }` . Ograniczenie to uniemożliwia tworzenie kaskadowych podgrup (routing Bus $\rightarrow$ Bus), co stanowi świadomy limit produktu zapobiegający powstawaniu pętli sprzężenia zwrotnego w acyklicznym grafie WebAudio .

---

## Analiza matematyczna i błędy topologiczne Downmix / Upmix

Przetwarzanie sygnałów w mikserze StageSync wykorzystuje odmienne prawa panoramowania w zależności od zdeklarowanego trybu kanału . Różnice te prowadzą do nieciągłości poziomu głośności i niepożądanych zniekształceń przy zmianie konfiguracji ścieżki .

### Algorytm True Balance a prawo równomiernej mocy (Equal-Power Panning)

Ścieżki i szyny mono wykorzystują natywny węzeł `StereoPannerNode`, działający w oparciu o prawo równomiernej mocy (Equal-Power Law) . W tym trybie, przy ustawieniu panoramy w pozycji centralnej ($p = 0$), sygnał wyjściowy na każdym z kanałów (L/R) zostaje osłabiony o $-3\text{ dB}$ (mnożnik $1/\sqrt{2} \approx 0{,}7071$), co zapewnia stałą sumaryczną moc akustyczną w przestrzeni odsłuchowej .

Ścieżki i szyny stereo wykorzystują algorytm **True Balance** zaimplementowany w funkcji `balanceGains(bal)` . Algorytm ten tłumi przeciwległy kanał, pozostawiając kanał docelowy na poziomie jednostkowym ($0\text{ dB}$) :

$\text{Dla } b \le 0: \quad g_L = 1, \quad g_R = 1 + b$

$\text{Dla } b \ge 0: \quad g_L = 1 - b, \quad g_R = 1$

gdzie $b \in [-1, 1]$ stanowi pozycję tłumika balansu .

Zależność liniowa algorytmu True Balance powoduje, że gdy gałka balansu znajduje się w skrajnym lewym położeniu ($b = -1$), wzmocnienie kanału lewego wynosi $1{,}0$ ($0\text{ dB}$), a prawego $0{,}0$ ($-\infty\text{ dB}$). Przesuwanie kontrolera w prawo utrzymuje lewy kanał na poziomie jednostkowym aż do punktu centralnego ($b = 0$), podczas gdy kanał prawy rośnie liniowo od $0$ do $1$. Po przekroczeniu centrum lewy kanał opada liniowo do $0$ przy $b = 1$, a prawy pozostaje na stałym poziomie $1$ . 

W pozycji centralnej ($b = 0$) algorytm True Balance zwraca wzmocnienie $g_L = 1{,}0$ ($0\text{ dB}$) oraz $g_R = 1{,}0$ ($0\text{ dB}$) . Z tego powodu, przełączenie trybu ścieżki z `mono` na `stereo` dla tego samego źródła ze wskaźnikiem panoramy w centrum powoduje natychmiastowy skok głośności wyjścia o $+3\text{ dB}$ .

### Błąd wariancyjny sumowania stereo-do-mono (Downmix)

Podczas odtwarzania dwukanałowego bufora stereo na ścieżce skonfigurowanej jako `mono`, funkcja `connectWithOptionalDownmix` rozdziela sygnał wyjściowy za pomocą węzła `ChannelSplitterNode` na dwa niezależne gałęzie wzmocnienia `gL` i `gR` . Każda z nich aplikuje stały współczynnik downmixu $\text{STEREO\_DOWNMIX\_LINEAR} = 1/\sqrt{2} \approx 0{,}7071$ ($-3\text{ dB}$), po czym oba kanały są sumowane w węźle `clipGain` :

$S_{\text{mono}} = \left( L \cdot \frac{1}{\sqrt{2}} \right) + \left( R \cdot \frac{1}{\sqrt{2}} \right)$

W przypadku materiału audio z korelacją fazową kanałów równą $+1$ (sygnał dual-mono zapisany w pliku stereo, gdzie $L = R = A$), napięcia w punkcie sumowania dodają się arytmetycznie :

$S_{\text{mono}} = A \cdot \frac{1}{\sqrt{2}} + A \cdot \frac{1}{\sqrt{2}} = A \cdot \sqrt{2} \approx 1{,}4142 \cdot A \quad (+3{,}01\text{ dB})$

Gdy szczytowa amplituda pliku źródłowego wynosi $0\text{ dBFS}$ ($A = 1{,}0$), wyjście zsumowane w węźle `clipGain` osiąga poziom $+3{,}01\text{ dBFS}$ ($1{,}4142$) . Powoduje to powstawanie przesterowania cyfrowego (clippingu) na wejściu tłumika ścieżki, jeszcze przed przetworzeniem sygnału przez szynę Master .

### Anomalia pomiarowa VU na ścieżkach Mono

W strukturze `TrackBusMono` analizator widma wyznaczający wartości do mierników Peak/VU jest włączony w graf za węzłem panoramika `StereoPannerNode` . Łańcuch połączeń przebiega bezpośrednio od węzła wzmocnienia ścieżki (`GainNode`), przez `StereoPannerNode`, do `AnalyserNode`, a stąd do węzła wyjściowego `route` .

Węzeł `AnalyserNode` przyjmuje sygnał dwukanałowy wygenerowany przez panoramik i wykonuje wewnętrzne sprowadzenie do mono na potrzeby analizy w dziedzinie czasu (`getFloatTimeDomainData`) . W efekcie, gdy użytkownik przesunie tłumik panoramy ścieżki mono w skrajne położenie ($-1$ lub $+1$), miernik peak/VU wskazuje spadek mierzonego poziomu sygnału (o $3\text{--}6\text{ dB}$), mimo że rzeczywista amplituda w wybranym kanale wyjściowym pozostaje niezmieniona .

---

## Logika Solo / Mute i stany martwe w grafie audio

Obsługa stanów Solo oraz Mute w silniku StageSync jest podzielona między modyfikację grafu w funkcji `applyBusParams` a filtrowanie wyzwalania clipów w funkcji `isClipAudible` . Interakcja tych dwóch mechanizmów prowadzi do występowania martwych stanów audio (dead states) .

Funkcja `isClipAudible` ocenia audialność clipu w oparciu o hierarchię warunków. Pierwszeństwo ma sprawdzanie wyciszenia: jeśli clip lub ścieżka posiadają właściwość `muted === true`, clip jest odrzucany . Następnie badana jest tablica `soloTrackIds` – gdy nie jest pusta, odtwarzane są wyłącznie ścieżki w niej zawarte . Gdy tablica ścieżek solo jest pusta, funkcja analizuje tablicę `soloBusIds` i przepuszcza clipy ze ścieżek zroutowanych do wysolowanych szyn . Z kolei funkcja `applyBusParams` steruje wzmocnieniem samych szyn grupowych: jeśli tablica `soloBusIds` zawiera elementy, dowolna szyna niewymieniona na tej liście otrzymuje liniowe wzmocnienie równe $0$ .

Anomalia martwego stanu powstaje w sytuacji, gdy użytkownik aktywuje tryb Solo na Szynie 1, a następnie aktywuje tryb Solo na Ścieżce 1, która jest zroutowana do Szyny 2 . W tym układzie:
1. Funkcja `isClipAudible` wykrywa obecność Ścieżki 1 w `soloTrackIds` i zezwala na wyzwalanie jej clipów .
2. Funkcja `applyBusParams` analizuje `soloBusIds` (zawierające wyłącznie Szynę 1) i wycisza Szynę 2, ustawiając wzmocnienie jej węzła `GainNode` na $0$ .
3. Sygnał generowany przez Ścieżkę 1 trafia do wyciszonego węzła Szyny 2 i nie dociera do szyny Master .

W efekcie interfejs użytkownika sygnalizuje aktywne wysolowanie Ścieżki 1, lecz ze głośników nie dobiega żaden dźwięk .

---

## Wyścigi stanów (Race Conditions) i synchronizacja UI vs Playback Graph

Odtwarzanie audio w przeglądarce musi zachowywać spójność ze stanem transportu SSOT utrzymywanym przez serwer WebSocket . Różnice w czasach wykonania operacji asynchronicznych i renderowania UI prowadzą do błędów synchronizacji grafu .

### Asynchroniczne wyścigowe ładowanie buforów podczas skoku (Seek Jump)

W przypadku wykonania skoku odtwarzacza (seek) lub zmiany pozycji transportu przekraczającej próg `SEEK_JUMP_TICKS` ($480\text{ ticków}$), funkcja `syncAudioPlayback` zatrzymuje działające źródła poprzez `stopAll()` i próbuje utworzyć nowe węzły `BufferSourceNode` .

Jeśli bufor pliku audio nie znajduje się w pamięci podręcznej `bufferCache`, wywoływana jest asynchroniczna funkcja `loadAudioBuffer` . Ponieważ `syncAudioPlayback` jest funkcją synchroniczną, pomija ona niezbuforowany clip i kontynuuje pętlę . Po zakończeniu pobierania i zdekodowania pliku przez przeglądarkę, obietnica (`Promise`) zapisuje bufor w pamięci podręcznej . Brak jest jednak mechanizmu automatycznego re-triggerowania grafu po pomyślnym zdekodowaniu bufora w trakcie trwania odtwarzania . Clip pozostaje niemy do momentu nadejścia kolejnej ramki synchronizacji transportu z serwera, co wywołuje powracające pauzy w dźwięku i gubienie transientów przy dynamicznym seekowaniu .

### Wyścig wyciszania lokalnego i epok zatrzymania (`stopEpoch`)

W celu zabezpieczenia przed opóźnieniem sieciowym (RTT) z serwera po kliknięciu Pause/Stop, interfejs wywołuje funkcję `suppressAudioPlayback()`, która ustawia flagę `playbackSuppressed = true` oraz inkrementuje licznik `stopEpoch` .

Gdy użytkownik wyzwala zatrzymanie transportu, sekwencja operacji przebiega następująco:
* Funkcja `suppressAudioPlayback()` natychmiast czyści aktywne źródła `stopAll()`, zwiększa wartość `stopEpoch` i blokuje planer .
* Gdy wiadomość WebSocket potwierdzająca zatrzymanie dociera z serwera, silnik wywołuje `syncAudioPlayback()` .
* Funkcja wychwytuje lokalną wartość `epochAtStart = stopEpoch` i ze względu na flagę `playbackSuppressed` przerywa wykonywanie, chroniąc przed ponownym uruchomieniem źródeł .

Błąd występuje w sytuacji, gdy tuż po wyciszeniu użytkownik zmieni parametry tłumików w UI. Funkcja `applyBusParams` modyfikuje wartości `GainNode` na istniejących węzłach w czasie rzeczywistym, co przy wysokiej częstotliwości zdarzeń interfejsu może powodować powstawanie cyfrowych trzasków (clicks/pops) na węzłach sumujących .

### Wyścig zatrzasku Peak Hold miernika VU

Przetwarzanie wartości szczytowych w miernikach VU odbywa się poprzez ciągłe wywoływanie `updatePeakHold` . Stan zatrzasku (Peak Hold) przechowuje maksymalne zarejestrowane dBFS oraz flagę przesterowania `clipped` dla wartości $> 0\text{ dBFS}$ .

Ponieważ odczyt z analizatora `readTrackMeterDb` odbywa się w pętli UI (`requestAnimationFrame`), a kasowanie stanu zatrzasku następuje po zdarzeniu interakcji w UI, brak synchronizacji między zegarem procesora DSP a pętlą renderowania React powoduje sytuacje, w których piki przesterowania trwające $1\text{--}2\text{ ms}$ są gubione, jeśli odświeżenie ramki UI nastąpi dokładnie w momencie zerowania stanu .

---

## Tabela defektów i ograniczeń architektonicznych

Poniższe zestawienie klasyfikuje wykryte usterki w kodzie oraz świadome ograniczenia przyjęte w projektach ADR .

| DEFECT-ID | Warstwa | Mechanizm | Wpływ na dźwięk | Reprodukcja | Test | Klasyfikacja |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-BUG-01** | `shared` / `web` | Brak wymuszenia Equal-Power przy domyślnym braku `channelMode`. | Skok głośności wyjścia o $+3\text{ dB}$ po zmianie trybu z mono na stereo na środku panoramy. | 1. Utwórz ścieżkę bez `channelMode`. <br>2. Ustaw `pan = 0`. <br>3. Zmień tryb ścieżki na `mono`. | `test("balanceGains(0) vs StereoPanner level boost")`  | Bug |
| **DEF-BUG-02** | `web (audioPlayback)` | Stały współczynnik downmixu $1/\sqrt{2}$ w `connectWithOptionalDownmix` sumuje sygnały dual-mono do $1{,}4142$. | Cyfrowe przesterowanie (clipping) sygnałów dual-mono wyeksportowanych do plików stereo odtwarzanych na ścieżkach mono. | 1. Wczytaj plik stereo $0\text{ dBFS}$ dual-mono. <br>2. Przypisz plik do ścieżki w trybie `mono`. <br>3. Odtwórz sygnał. | `test("stereo-to-mono downmix peak limits under 0 dBFS")`  | Bug |
| **DEF-BUG-03** | `web (audioPlayback)` | Węzeł `AnalyserNode` w `TrackBusMono` umieszczony za `StereoPannerNode` zamiast przed nim. | Miernik VU wskazuje zaniżony poziom sygnału ($3\text{--}6\text{ dB}$) przy panoramowaniu w skrajne pozycje L/R. | 1. Uruchom odtwarzanie na ścieżce mono. <br>2. Przesuń `pan` z $0$ na $-1$. <br>3. Obserwuj wskazanie miernika peak. | `test("mono track meter invariant under panning shift")`  | Bug |
| **DEF-BUG-04** | `web (audioPlayback)` | Priorytetyzacja `soloTrackIds` nad `soloBusIds` wycisza wyjście szyny w `applyBusParams`. | Martwy stan (cisza) przy wysolowaniu ścieżki przypisanej do szyny nieobjętej aktywną grupą solo szyn. | 1. Wykonaj solo na Szynie 1. <br>2. Wykonaj solo na Ścieżce 1 (zroutowanej do Szyny 2). <br>3. Brak dźwięku. | `test("cross-solo track and bus audio path persistence")`  | Bug |
| **DEF-BUG-05** | `web (audioPlayback)` | Brak automatycznego powiadomienia grafu audio po wygenerowaniu bufora w `loadAudioBuffer`. | Zgubienie pierwszego transientu dźwięku lub brak audio po wykonaniu skoku (seek) na niepobrany plik. | 1. Uruchom odtwarzanie. <br>2. Wykonaj skok do obszaru z niepobranym plikiem WAV. <br>3. Dźwięk nie startuje od razu. | `test("async buffer decode re-triggers playback graph sync")`  | Bug |
| **DEF-ADR-01** | `shared` / `web` | Szyny grupowe `AudioBusSchema` mają unormowany cel wyjścia `BusOutputDestSchema` wyłącznie do `master`. | Brak możliwości przekierowania podgrup na fizyczne wyjścia karty dźwiękowej (np. Out 3–4). | 1. Spróbuj przekazać `{ kind: "bus", busId: "out3" }` w polu output szyny. <br>2. Zod zwraca błąd walidacji. | `test("BusOutputDestSchema strictly limits destination to master")`  | Świadomy limit produktu (ADR 0011) |
| **DEF-ADR-02** | `shared` / `web` | Brak wsparcia dla hierarchicznego routingu szyn (Bus $\rightarrow$ Bus) w warstwie schematów i grafu. | Brak możliwości tworzenia podgrup wyższego stopnia (np. Drum Bus $\rightarrow$ Music Bus $\rightarrow$ Master). | 1. Spróbuj skonfigurować wyjście szyny do innej szyny. <br>2. Opcja nie występuje w schemacie. | `test("resolveBusOutputDest ignores input and returns master")`  | Świadomy limit produktu (ADR 0011) |

---

## Rekomendacje wdrożeniowe i plan naprawczy

W celu wyeliminowania wykrytych podatności akustycznych i architektonicznych zaleca się realizację następujących kroków naprawczych:

Zamiast stałego mnożnika $\text{STEREO\_DOWNMIX\_LINEAR} = 1/\sqrt{2}$, w funkcji `connectWithOptionalDownmix` należy zastosować bezpieczny mnożnik $0{,}5$ ($-6\text{ dB}$) dla sumowania mono lub wdrożyć dynamiczną analizę korelacji fazowej kanałów . Zapobiegnie to przekraczaniu poziomu $0\text{ dBFS}$ na wejściu tłumika ścieżki w przypadku materiałów dual-mono .

W strukturze `TrackBusMono` należy zmienić kolejność podłączenia węzłów, umieszczając `AnalyserNode` przed `StereoPannerNode` . Sygnał z węzła wzmocnienia ścieżki powinien trafiać najpierw do analizatora, a dopiero z niego do panoramika . Zapewni to pełną niezależność wskazań miernika VU od ustawień tłumika panoramy .

W funkcji `applyBusParams` należy zmodyfikować regułę wyliczania wzmocnienia szyn grupowych. Jeśli tablica `soloTrackIds` zawiera ścieżki zroutowane do danej szyny, szyna ta musi zachować wzmocnienie wynikające z jej fadera, niezależnie od tego, czy znajduje się w tablicy `soloBusIds` .

Po pomyślnym zdekodowaniu bufora w `loadAudioBuffer` należy dodać wywołanie zdarzenia zwrotnego (event emission), które wymusi ponowne uruchomienie `syncAudioPlayback` dla aktywnego transportu . Wyeliminuje to problem głuchych pauz po seekowaniu .

Funkcje pomocnicze tworzące nowe ścieżki audio w schemacie projektu powinny bezwzględnie ustawiać pole `channelMode` na podstawie parametrów pliku źródłowego już na etapie zapisu, wykluczając stany nieokreślone (`undefined`) .

---
Powered by [AI Exporter](https://saveai.net)
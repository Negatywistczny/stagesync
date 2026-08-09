> From: https://gemini.google.com/app/b2426baaf913da82

Recenzja Decyzji Miksera StageSync

# Audyt Architektoniczno-Produktowy StageSync: Ocena Decyzji Miksera FOH w Środowisku WebAudio

Niniejszy raport zawiera niezależną ewaluację produktową i architektoniczną decyzji podjętych w dokumentach ADR 0015 oraz triage miksera StageSync linii v5.2+ . Przedmiotem oceny jest weryfikacja, czy wzorce znane z tradycyjnych cyfrowych stacji roboczych audio (DAW) są adekwatne dla systemu scenicznego obsługiwanego z poziomu przeglądarki internetowej .

Ocena uwzględnia twarde ograniczenia środowiska uruchomieniowego: silnik odtwarzania oparty na WebAudio API, pojedynczą instancję `AudioContext`, mechanizm przełączania urządzeń wyjściowych poprzez API `setSinkId`, serwer stanowiący Single Source of Truth (SSOT) dla czasu muzycznego oraz bezwzględny zakaz wprowadzania atrap interfejsu (stubs / fake UI) wynikający z ADR 0011 .

---

## Sekcja A: Macierz Werdyktów i Szczegółowa Ocena Decyzji Produktowych

Ocena decyzji produktowych bazuje na konfrontacji konwencji studyjnych (Logic Pro, Ableton Live) oraz systemów spektaklowych i koncertowych (Apple MainStage, Figure 53 QLab) ze specyfiką architektury **Show Laptop + Przeglądarka** .

| ID Decyzji       | Decyzja Produktowa                                | Werdykt    | Siła Dowodu   | Ryzyko Sceniczne | Odniesienie do Wzorców DAW vs Show Laptop + Przeglądarka                                                                                                                            | Alternatywa (1 Zdanie)                                                                                                |
| :--------------- | :------------------------------------------------ | :--------- | :------------ | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **CRIT-MX-01.1** | Multi-out HW (Out 3–4+) oficjalnie wprowadzić     | **REVISE** | Wysoka        | Krytyczne        | Logic/Live udostępniają wyjścia przez sterownik niskopoziomowy . W przeglądarce brak determinizmu kanałów bez wcześniejszej konfiguracji OS, co grozi cichym zrzutem audio na FOH . | Odłożyć Multi-out HW do etapu 5.3+, warunkując obecność opcji w UI od spełnienia warunku `maxChannelCount >= 4` .     |
| **CRIT-MX-01.2** | Bus→bus jako rozszerzenie Mixer 5.1               | **REVISE** | Średnia       | Wysokie          | Logic pozwala na złożone drzewa szyn . W przeglądarce dynamiczne przeliczanie grafu DAG pod presją czasu podnosi ryzyko pętli i mikro-przerw w dźwięku .                            | Zamrozić routing szyn na poziomie jednopoziomowym (Bus→Master) w v5.2, przesuwając kaskady DAG do backlogu 5.3+ .     |
| **CRIT-MX-01.3** | True Balance (centrum unity, +3 dB mono↔stereo)   | **REVISE** | Wysoka        | Wysokie          | Logic stosuje True Balance dla tracków stereo . Na scenie wzrost energii o +3 dB w centrum stwarza ryzyko przesterowania toru PA lub odsłuchów IEM .                                | Wdrożyć jednolite, potęgowe prawo panoramy (equal-power -3 dB w centrum) dla wszystkich torów audio .                 |
| **CRIT-MX-01.4** | Dual-mono equal-power downmix (+3 dB skorelowane) | **REVISE** | Wysoka        | Wysokie          | W studio downmix kontrolowany jest na miernikach masteringowych. Na scenie zsumowanie skorelowanych sygnałów mono o +3 dB grozi przesterowaniem cyfrowym .                          | Wprowadzić automatyczny tłumik -3 dB na wejściu downmixu mono w celu ochrony szyn wyjściowych przed przesterowaniem . |
| **CRIT-MX-01.5** | Track solo wygrywa nad bus solo                   | **KEEP**   | Bardzo wysoka | Niskie           | Wzorce Logic Pro i mikserów koncertowych są tu w pełni zgodne . Daje to realizatorowi FOH natychmiastową izolację źródła bez powstawania stanu cichego .                            | Utrzymać priorytet „Track solo wins” jako niewzruszoną regułę diagnostyczną na scenie .                               |
| **CRIT-MX-01.6** | Click = proste Mute/Volume Cue                    | **KEEP**   | Wysoka        | Bardzo niskie    | W MainStage i QLab metronom jest odizolowanym torem pomocniczym . Prosty interfejs Cue zapobiega przypadkowemu wyciekowi kliku na PA .                                              | Pozostawić tor Click jako wyizolowaną szynę pomocniczą typu Cue bez opcji bezpośredniego przejścia na Master .        |
| **CRIT-MX-01.7** | Mixer Zoom = tylko skala chrome UI                | **KEEP**   | Wysoka        | Niskie           | Niezależny Zoom H/V z Pro Tools nie sprawdza się na laptopie FOH . Skalowanie geometrii Chrome UI zapewnia stałą gęstość i przewidywalność kontrolek .                              | Zachować wyłącznie skalowalność całego widoku Chrome UI bez rozbijania widoku na niezależne osie H/V .                |
| **CRIT-MX-01.8** | Zakaz atrap Out w UI (ADR 0011) vs Discovery      | **KEEP**   | Bardzo wysoka | Krytyczne        | Atrapy w studio służą do promocji funkcji. Na scenie szara opcja w wyjściach myli operatora i generuje błędy na żywo; ADR 0011 słusznie zakazuje stubów .                           | Bezwzględnie utrzymać zakaz renderowania atrap UI, udostępniając wyjścia HW tylko przy realnym wsparciu silnika .     |

---

### CRIT-MX-01.1: Multi-out HW (Out 3–4+)

Przeglądarkowe środowisko uruchomieniowe nie dysponuje bezpłatnym i bezpośrednim dostępem do krosownicy fizycznych portów audio . Operacja `setSinkId` w WebAudio API pozwala jedynie na wybór urządzania zbiorczego, natomiast dołączenie kolejnych par wyjściowych (Out 3–4, Out 5–6) wymaga, aby silnik operował na dyskretnych kanałach jednostki docelowej (`context.destination.channelCount = N`) . W systemach macOS oraz Windows przeglądarki oparte na silniku Chromium raportują maksymalną liczbę kanałów `maxChannelCount = 2`, o ile w systemowym konfiguracyjnym panelu audio nie zostanie zdefiniowany wielokanałowy układ głośników (np. Quadraphonic lub 5.1) .

Włączenie w modelu produktowym oficjalnej obsługi Multi-out bez uwzględnienia tej bariery stwarza niebezpieczeństwo, w którym realizator dźwięku przypisze ścieżkę do wyjścia Out 3–4, a przeglądarka po cichu zrzuci sygnał lub zaniecha jego odtwarzania . Klasyczny DAW (Logic Pro, Ableton Live) nie posiada tego problemu ze względu na direkte sterowniki ASIO/CoreAudio . Decyzję należy zmienić (REVISE) poprzez przesunięcie pełnego Multi-out do etapu 5.3+ i uwarunkowanie interfejsu od rzeczywistych możliwości urządzenia .

---

### CRIT-MX-01.2: Routing Szyna–Szyna (Bus-to-Bus)

Wprowadzenie zagnieżdżania szyn grupy (np. `Guitars Bus` -> `Music Stem Bus` -> `Master`) przekształca liniową strukturę miksera w Skierowany Graf Acykliczny (DAG) . W tradycyjnym oprogramowaniu studyjnym kompilacja grafu odbywa się w tle z wykorzystaniem silników napisanych w językach C/C++ . W systemie StageSync miksowanie zachodzi w jednowątkowej przestrzeni JavaScript/WebAudio . Modyfikacja połączeń w trakcie trwania spektaklu niesie za sobą dwa poważne ryzyka sceniczne: wyzwolenie błędów przy powstaniu pętli sprzężenia zwrotnego oraz powstawanie mikro-przerw lub trzasków (zipper noise) w momencie przearanżowania węzłów `GainNode` .

Choć model danych oraz walidator Zod w repozytorium wspierają algorytmy detekcji cykli (DFS), to z punktu widzenia niezawodności FOH w wersji v5.2 kaskadowanie szyn stanowi nadmiarową złożoność . Rekomenduje się decyzję REVISE, zamrażającą routing szyn na poziomie jednopoziomowym (`Bus -> Master`), przesuwając złożone drzewa DAG do późniejszych wydań .

---

### CRIT-MX-01.3: True Balance (Centrum Unity, +3 dB Mono↔Stereo)

Model True Balance przyjęty z programu Logic Pro zachowuje skrajne poziomy kanałów L/R w pozycji centralnej na poziomie 0 dB (unity gain) . Przy przestawianiu panoramy ze skrajnego położenia do centrum, całkowita skumulowana energia sygnału wyjściowego rośnie o +3 dB . O ile w środowisku studyjnym realizator kontroluje ten skok na faderze sumy lub zbiórce masteringowej, o tyle w warunkach koncertowych nagły przyrost sygnału o +3 dB na torze wokalnym lub instrumentalnym może doprowadzić do przesterowania cyfrowego wyjścia, lub wywołać niebezpieczny skok poziomu na systemie PA czy w uszach muzyków (IEM) .

Miksery estradowe powszechnie wykorzystują potęgowe prawo panoramy (equal-power -3 dB center), w którym sygnał w pozycji centralnej jest tłumiony na obu kanałach o 3 dB, utrzymując stałą głośność odczuwalną . Decyzja o pozostawieniu True Balance wymaga korekty (REVISE) na rzecz jednolitego prawa panoramy equal-power .

---

### CRIT-MX-01.4: Dual-mono Equal-Power Downmix (+3 dB Skorelowane)

Przy zrzucie dwóch identycznych (w pełni skorelowanych) kanałów stereo do pojedynczego toru mono z wykorzystaniem wzoru equal-power, następuje zsumowanie napięć sygnału, co przekłada się na wzrost poziomu wyjściowego o +3 dB (a w wartościach szczytowych do +6 dB) . W przypadku, gdy ścieżka źródłowa została wysterowana blisko granicy 0 dBFS, operacja downmixu mono bez zapewnienia stałego zapasu dynamiki (headroomu) generuje twarde przesterowanie cyfrowe .

W mikserze scenicznym zrzut do mono jest operacją krytyczną, stosowaną przy wysyłkach na głośniki strefowe, monitory odsłuchowe lub przetworniki sub-niskotonowe . Wymaga to decyzji REVISE, wprowadzającej automatyczne tłumienie skorygowane o -3 dB przy operacjach sumowania kanałów skorelowanych .

---

### CRIT-MX-01.5: Track Solo Wygrywa nad Bus Solo (Track Solo Wins)

Reguła, w myśl której włączenie funkcji Solo na pojedynczej ścieżce audio nadrzędnie przepuszcza jej sygnał do odsłuchu bez konieczności aktywacji Solo na szynach pośrednich, stanowi wzorzec wywodzący się bezpośrednio z profesjonalnych konsolet estradowych oraz programu Logic Pro . Ustrzega ona realizatora FOH przed powstawaniem tzw. „stanu cichego” (dead state), w którym solowany instrument nie generuje dźwięku na wyjściu z powodu wyciszenia szyny grupy .

Ze względu na wysoką użyteczność diagnostyczną na scenie (możliwość natychmiastowej weryfikacji problematycznego śladu podczas trwania koncertu), decyzję tę należy bezwzględnie utrzymać (KEEP) .

---

### CRIT-MX-01.6: Click jako Proste Mute/Volume Cue

Sposób traktowania sygnału metronomu w aplikacjach scenicznych różni się od podejścia stosowanego w produkcyjnych DAW . W programach studyjnych metronom jest częścią ogólnego grafu miksowania z pełnymi wysyłkami aux. W aplikacjach koncertowych (MainStage, QLab) tor metronomu jest ścieżką typu Cue — wyizolowaną ze strumienia głównego, pozbawioną powiązań z szynami grupowymi i skierowaną bezpośrednio do odsłuchu zespołu .

Ograniczenie interfejsu metronomu do prostych kontrolek Mute i Volume ogranicza ryzyko przypadkowego skierowania kliku na nagłośnienie FOH . Decyzję tę należy utrzymać (KEEP) jako spójną z wymogami bezpieczeństwa widowiska .

---

### CRIT-MX-01.7: Mixer Zoom wyłącznie jako Skala Chrome UI

Większość studyjnych stacji DAW oferuje dwuosiowy zoom widoku miksera (niezależne skalowanie szerokości kanałów oraz wysokości faderów i wskaźników) . Na scenie, gdzie realizator operuje na ekranie laptopa lub hybrydowym wyświetlaczu dotykowym, zmienna gęstość kontrolek utrudnia szybką obsługę .

Ograniczenie skalowania miksera wyłącznie do jednolitego przeskalowania całej geometrii interfejsu (chrome scaling) gwarantuje stałe położenie elementów wykonawczych i eliminuje ryzyko pomyłki dotykowej . Decyzję należy utrzymać (KEEP) .

---

### CRIT-MX-01.8: Zakaz Atrap Out w UI (ADR 0011) vs Discovery

Wątpliwość produktowa, czy zakaz umieszczania w interfejsie nieaktywnych kontrolek (stubs / disabled controls) nie ogranicza odkrywalności funkcji (product discovery), wynika z błędnego przeniesienia nawyków z oprogramowania SaaS/Studio do domenowych aplikacji scenicznych . W programie użytkowanym na żywo obecność nieaktywnego przycisku lub wyłączonej opcji `Out 3–4` sugeruje operatorowi dostępność toru, co w sytuacji stresowej prowadzi do błędnych decyzji operacyjnych .

Zgodnie z zapisami konstytucyjnymi ADR 0011: funkcja nieobsługiwana przez dany runtime/sprzęt nie może posiadać żadnej reprezentacji w UI . Wskaźnik discovery nie może być budowany kosztem ryzyka scenicznego. Decyzję należy utrzymać (KEEP) .

---

## Sekcja B: Granice Analogii „Klasycznego DAW” w Środowisku Scenicznym WebAudio

Próba traktowania systemu StageSync jako przeglądarkowego odpowiednika klasycznego DAW prowadzi do błędnych założeń architektonicznych . Analiza ujawnia pięć kluczowych obszarów, w których analogia stacyjna zawodzi w środowisku koncertowym:

### 1. Abstrakcja Sterowników Audio i Środowiska uruchomieniowego

Stacjonarny DAW wchodzi w bezpośrednią interakcję ze sprzętem za pośrednictwem dedykowanych sterowników niskopoziomowych (ASIO, CoreAudio), uzyskując twarde gwarancje dotyczące liczby fizycznych kanałów i opóźnień . StageSync osadzony jest w piaskownicy przeglądarki internetowej . Wybór fizycznego interfejsu odbywa się za pośrednictwem abstrakcji `setSinkId`, a dostępność kanałów wyjściowych jest uzależniona od konfiguracji miksera systemowego OS, nad którym aplikacja nie ma bezpośredniej kontroli .

### 2. Architektura Zegara i Transportu (Sample-Accurate vs Server SSOT)

W klasycznym DAW wyłącznym źródłem czasu (master clock) są próbki przesyłane z przetwornika cyfrowo-analogowego karty dźwiękowej. Pozycja kursora i transport są pochodną zegara audio. W StageSync źródłem prawdy dla czasu muzycznego jest serwer (`apps/server`), przekazujący pozycję w postaci całkowitoliczbowych ticków (PPQ) . Klient WebAudio stanowi jedynie końcówkę wykonawczą, interpolującą pozycję wizualną playheadu pomiędzy pakietami sieciowymi . Silnik miksowania musi działać w reżimie synchronizacji sieciowej, a nie lokalnego zegara sprzętowego .

### 3. Model Reakcji na Błędy (Buffer Underrun vs Fail-Soft)

Gdy tradycyjny DAW napotka przeciążenie procesora lub błąd routingu, natychmiast zatrzymuje odtwarzanie dźwięku i wywoływane jest okno dialogowe (np. _Audio Engine Overload_). W warunkach koncertowych zatrzymanie odtwarzania jest błędem krytycznym. Silnik WebAudio w StageSync musi funkcjonować w modelu `fail-soft`: wykrycie błędu routingu lub pętli w grafie nie może zatrzymać transportu, lecz musi skutkować bezpiecznym, cichym przekierowaniem sygnału do szyny `Master` .

### 4. Przebudowa Grafu Audio na Żywo (Dynamic Graph vs C++ Engine)

Programy studyjne kompilują graf połączeń w sposób statyczny przed uruchomieniem odtwarzania lub wykonują mikro-buforowanie przy zmianie routingu. W mikserze scenicznym zmiana przypisania wyjścia czy wpięcie szyny odbywa się podczas trwania spektaklu. Tworzenie i rozłączanie węzłów WebAudio (`GainNode`, `ChannelMergerNode`) na żywo wymaga stosowania ramps czasowych (dezippering), aby uniknąć trzasków cyfrowych na nagłośnieniu FOH .

### 5. Paradygmat Interfejsu i Bezpieczeństwo Operacyjne

Oprogramowanie studyjne stawia na bogactwo opcji, podpowiedzi i zaawansowane menu kontekstowe. Interfejs miksera scenicznego musi być zoptymalizowany pod kątem natychmiastowej czytelności, obsługi w warunkach słabego oświetlenia oraz eliminacji błędnych kliknięć. Zgodnie z ADR 0011 interfejs nie może zawierać elementów o charakterze deklaratywnym, które nie posiadają pokrycia w działającym kodzie silnika .

---

## Sekcja C: Optymalna Ścieżka Produktowa dla Wydania FOH 5.2 (Minimalne Ryzyko)

Aby ograniczyć ryzyko awarii podczas koncertów przy wydaniu linii v5.2, należy zredefiniować zakres funkcjonalny miksera. Poniższa tabela przedstawia porównanie obecnych ustaleń z rekomendowaną, niskorSetupową ścieżką produktową.

| Obszar Miksera          | Stan Obecny (ADR 0015 / Spec 5.2+)                                      | Rekomendowany Stan Niskoryzykowny (FOH 5.2)                                                               | Korzyść dla Bezpieczeństwa FOH                                                                      |
| :---------------------- | :---------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| **Fizyczne Wyjścia HW** | Oficjalne wprowadzenie Multi-out HW (Out 3–4) do modelu i UI .          | **Multi-out HW odłożone (Later / 5.3+)**. Wyjścia HW ukryte w UI, chyba że `maxChannelCount >= 4` .       | Eliminacja ryzyka cichego zrzutu dźwięku z powodu braku konfiguracji wielokanałowej w systemie OS . |
| **Routing Szyn**        | Rozszerzenie o kaskadowe zagnieżdżenia Bus-to-Bus z weryfikacją DAG .   | **Jednopoziomowa struktura szyn (Bus→Master)**. Kaskady zamrożone do etapu 5.3+ .                         | Brak konieczności dynamicznego przeliczania grafu pod presją czasu; zerowe ryzyko cyklu na scenie . |
| **Prawo Panoramy**      | True Balance (0 dB w centrum) oraz +3 dB skorelowany downmix .          | **Jednolite Equal-Power Pan Law (-3 dB w centrum)** dla wszystkich torów .                                | Ochrona wyjść Master/IEM przed przesterowaniem cyfrowym przy zmianie panoramy lub sumowaniu mono .  |
| **Prezentacja UI**      | Zakaz atrap (ADR 0011) zachowany, lecz z presją na odkrywalność w Q&A . | **Rygorystyczny zakaz atrap (ADR 0011)**. UI wyjść wyizolowanych renderowane wyłącznie na wspieranym HW . | Realizator FOH widzi wyłącznie te opcje routingu, które fizycznie przenoszą sygnał audio .          |

---

## Sekcja D: Rekomendacja dla Product Ownera – Decyzje do Re-Open na Q&A

Rekomenduje się ponowne otwarcie trzech decyzji produktowych podczas najbliższej sesji Q&A z udziałem Product Ownera i Architekta:

### 1. Ponowne otwarcie Decyzji 1: Multi-out HW a Wymagania Środowiskowe OS

- **Kwestia do rozstrzygnięcia:** Przeglądarka internetowa nie ujawni wyjść Out 3–4, dopóki użytkownik ręcznie nie skonfiguruje wielokanałowej mapy głośników w panelu systemowym OS (np. _Audio MIDI Setup_ na macOS) .
- **Rekomendowane pytanie Q&A:** _„Czy zgadzamy się na formalne przesunięcie Multi-out HW do etapu 5.3+ i uzależnienie pojawienia się sekcji wyjść w UI od spełnienia przez przeglądarkę warunku `maxChannelCount >= 4`, akceptując brak promocji tej funkcji na urządzeniach bez właściwej konfiguracji OS?”_

### 2. Ponowne otwarcie Decyzji 3 i 4: Bezpieczeństwo Poziomów Sygnału (Pan Law)

- **Kwestia do rozstrzygnięcia:** Przyjęcie wzorca True Balance z Logic Pro wywołuje skok skumulowanej energii o +3 dB w pozycji centralnej faderu oraz przy zrzucie stereo do mono, co generuje ryzyko przesterowania przetworników na scenie .
- **Rekomendowane pytanie Q&A:** _„Czy wycofujemy się z deklaracji True Balance z ADR 0015 na rzecz estradowego prawa panoramy Equal-Power (-3 dB w centrum), aby zagwarantować stały poziom energii wyjściowej i ochronę aparatury FOH/IEM przed przesterowaniem?”_

### 3. Ponowne otwarcie Decyzji 2: Zakres Złożoności Routingu Szyn w Wydaniu 5.2

- **Kwestia do rozstrzygnięcia:** Wprowadzenie kaskadowania szyn Bus-to-Bus wymusza złożoną walidację acykliczności i podnosi ryzyko niestabilności silnika WebAudio podczas zmian routingu na żywo .
- **Rekomendowane pytanie Q&A:** _„Czy w wydaniu 5.2 zamrażamy routing szyn wyłącznie na poziomie relacji Bus -> Master, pozostawiając architekturę jednopoziomową i przesuwając pełne drzewo DAG do backlogu późniejszych wydań?”_

---

Powered by [AI Exporter](https://saveai.net)

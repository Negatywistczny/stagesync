> From: https://gemini.google.com/app/a2923a5001d20fdc
>
> **Repo:** surowy dump — nie SSOT. Triage: [Audyt-Synchronizacji-Transport-SSOT.triage.md](./Audyt-Synchronizacji-Transport-SSOT.triage.md). Konwencje: [README](../README.md).

Audyt Synchronizacji StageSync v5

# Audyt Techniczny Silnika Synchronizacji StageSync v5: Analiza Spójności Czasowej, Stanów Wyścigu i Zgodności Architektonicznej

Niniejszy raport stanowi audyt silnika synchronizacji czasowej StageSync v5, dedykowanego dla rozwiązań self-hosted DAW oraz systemów kontroli spektakli na żywo . Architektura StageSync v5 przyjmuje serwer jako pojedyncze źródło prawdy (Single Source of Truth – SSOT) dla pozycji transportu, tempa oraz metrum, opierając matematykę dyskretnej osi czasu na całkowitoliczbowych impulsach (ticks) oraz stałej rozdzielczości PPQ (Pulses Per Quarter Note) . Klient nie posiada własnego autonomicznego zegara muzycznego i odpowiada wyłącznie za wygładzanie (interpolację) wyświetlanego playheada pomiędzy ramkami otrzymywanymi z gniazda WebSocket . 

Szczegółowa weryfikacja kodu źródłowego wykazała obecność krytycznych stanów wyścigu (race conditions), zakłóceń interpolacji po stronie interfejsu użytkownika, a także nieprawidłowości w obsłudze asynchronicznego I/O, które bezpośrednio zagrażają stabilności pracy w warunkach koncertowych .

---

## Tabela Wykrytych Błędów i Podatności

Poniższa tabela grupuje usterki wykryte w badanych modułach StageSync v5, określając warstwę ich występowania, mechanizm powstawania, konsekwencje dla spektaklu na żywo oraz poziom pewności analizy .

| BUG-ID | Warstwa | Funkcja / Moduł | Mechanizm usterki | Skutek live-show | Pewność |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-SSV5-01** | Client | [`TransportProvider.tsx`](../../../../apps/web/src/transport/TransportProvider.tsx) (`ws.onopen`) | Pobranie stanu `getTransport()` przez HTTP GET wewnątrz zdarzenia `ws.onopen` wykonuje się asynchronicznie i nadpisuje kotwicę czasową odebraną ułamek sekundy wcześniej ze świeżej, natychmiastowej ramki WebSocket wygenerowanej przez serwer przy połączeniu . | Widoczne cofnięcie lub skok pozycji playhead (visual jump) oraz chwilowe zamrożenie ruchu wygładzania w pętli animacji RAF podczas rekonfiskacji gniazda na scenie . | code-confirmed |
| **BUG-SSV5-02** | Server | [`pause-at-end.ts`](../../../../apps/server/src/transport/pause-at-end.ts) & [`auto-advance.ts`](../../../../apps/server/src/transport/auto-advance.ts) (`onChange`) | Oczekiwanie na dyskowe I/O (`await stores.getProject` / `stores.getSetlist`) zachodzi wewnątrz słuchacza zdarzeń przy uwięzionej fladze `inFlight = true` . W trakcie pobierania danych silnik realizuje równoległe komendy z interfejsu (np. `seek`), które po zakończeniu obietnicy I/O zostają bezwarunkowo nadpisane przez `transport.pause()` lub `transport.loadProject()` . | Bezpośrednie nadpisanie celowych decyzji realizatora FOH (np. cofnięcia utworu na start), skutkujące nieoczekiwanym zatrzymaniem lub przełączeniem piosenki w trakcie występu . | code-confirmed |
| **BUG-SSV5-03** | Client / Server | [`TransportProvider.tsx`](../../../../apps/web/src/transport/TransportProvider.tsx) (`runCommand`) | Wysyłanie komend REST (`play`, `seek`, `stop`) wykonuje natychmiastową lokalną aktualizację `applyAnchor` z czasem `performance.now()`, po czym odebrany chwilę później tick WS wywołuje powtórną aktualizację z tym samym stanem, ale nowym timestampem odbioru . | Mikroskoki w wygładzaniu playheada (jitter) oraz zbędne resetowanie pętli renderującej przy każdym wciśnięciu przycisków transportu . | code-confirmed |
| **BUG-SSV5-04** | Server | [`engine.ts`](../../../../apps/server/src/transport/engine.ts) (`samplePosition`) | Funkcja próbkowania `samplePosition()` modyfikuje wewnętrzny stan silnika (`positionTicks = wrap` oraz `reanchor()`) jako efekt uboczny zwykłego odczytu pozycji w momencie przekroczenia krawędzi pętli loop . | Niespójność wyliczania pozycji przy równoległym odpytywaniu stanu przez różne moduły serwera w okolicach punktu zapętlenia . | code-confirmed |
| **BUG-SSV5-05** | Server / Client | [`pause-at-end.ts`](../../../../apps/server/src/transport/pause-at-end.ts) / [`TransportProvider.tsx`](../../../../apps/web/src/transport/TransportProvider.tsx) | Automatyczne zatrzymanie na końcu utworu wywołuje w silniku jedynie `transport.pause()`, co nie gwarantuje twardego wyciszenia bufora audio klienta na precyzyjnej krawędzi `endTicks` . | Odtworzenie niepożądanego nakładającego się fragmentu dźwięku ("overshoot" / wybrzmiewanie bufora audio) na nagłośnieniu głównym . | code-confirmed |
| **BUG-SSV5-06** | Client | [`TransportProvider.tsx`](../../../../apps/web/src/transport/TransportProvider.tsx) (`useEffect`) | Podwójny wyścig inicjalizacyjny: funkcja `getTransport()` wywoływana jest niezależnie w pętli montowania komponentu oraz wewnątrz handlera `ws.onopen` . | Nadmiarowe obciążenie I/O sieci i ryzyko zastąpienia aktualnego stanu z WebSocketu przestarzałą odpowiedzią HTTP . | code-confirmed |
| **BUG-SSV5-07** | Server / Client | [`transportReducer.ts`](../../../../apps/web/src/transport/transportReducer.ts) (`shouldAcceptServerTick`) | Ciche odrzucanie ramek ticków z czasem ujemnym lub wstecznym (`serverTimeMs < lastServerTimeMs`) bez zgłoszenia błędu krytycznego (fail-fast) i bez powiadomienia interfejsu . | Cicha desynchronizacja widoku klienta od rzeczywistego stanu transportu na serwerze bez wiedzy realizatora . | code-confirmed |
| **BUG-SSV5-08** | Client | [`TransportProvider.tsx`](../../../../apps/web/src/transport/TransportProvider.tsx) (`useEffect`) | Podwójne montowanie w środowisku React 18 StrictMode powoduje tworzenie równoległych gniazd WebSocket i nakładanie się interwałów `helloTimer` przed czyszczeniem . | Powielone subskrypcje zdarzeń, sztuczne zawyżanie obciążenia serwera i błędne pomiary opóźnień sieciowych . | hypothesis |

---

## Analiza Sekwencji Czasowych i Stanów Wyścigu

Wykorzystanie asynchronicznych operacji sieciowych HTTP REST obok magistrali WebSocket o niskim opóźnieniu stwarza warunki do powstawania skomplikowanych nakładań czasowych.

### Wyścig Asynchroniczny I/O w Reakcji na Koniec Utworu (Play → Seek → Stop)

W prawidłowo zaprojektowanym systemie DAW dotarcie playheada do końca utworu powinno deterministycznie wstrzymać odtwarzanie lub przełączyć utwór w setliście . W silniku StageSync v5 proces ten jest jednak obarczony krytycznym stanem wyścigu . W momencie, gdy pozycja `positionTicks` osiąga lub przekracza wartość `endTicks`, słuchacz `onChange` w module [`pause-at-end.ts`](../../../../apps/server/src/transport/pause-at-end.ts) wykrywa ten fakt i ustawia flagę `inFlight = true` . Następnie inicjuje asynchroniczne pobieranie struktury projektu z dyskowego magazynu danych `await stores.getProject(projectId)` . W czasie gdy serwer oczekuje na zakończenie operacji I/O na dysku, odtwarzanie nadal postępuje, a do serwera może wpłynąć żądanie HTTP od realizatora FOH, który ręcznie wciska przycisk `Seek` (np. cofając pozycję na początek utworu `positionTicks = 0`) . Silnik serwera natychmiastowo wykonuje zmianę pozycji, reanchoring oraz rozsyła nowy tick WS o pozycji 0 do wszystkich podłączonych urządzeń . Chwilę później asynchroniczna obietnica I/O w module [`pause-at-end.ts`](../../../../apps/server/src/transport/pause-at-end.ts) kończy się powodzeniem . Kod wstrzymany do tej pory na słowie kluczowym `await` kontynuuje wykonanie i bez weryfikacji, czy pozycja transportu nie uległa w międzyczasie zmianie, bezwarunkowo wywołuje `transport.pause()` oraz `transport.seek(endTicks, project)` . W efekcie intencjonalna akcja realizatora zrealizowana w trakcie trwania I/O zostaje całkowicie skasowana, a transport zostaje przymusowo cofnięty na sam koniec utworu i zapauzowany .

### Rekonfiskacja Połączenia WebSocket i Błąd Przestarzałego Snapshotu (Stale Snapshot)

Problem desynchronizacji wizualnej po wznowieniu łączności sieciowej wynika z niewłaściwej kolejności przetwarzania komunikatów w klienckim providerze transportu . W przypadku krótkotrwałej utraty pakietów na scenie, kliencki komponent `TransportProvider` rejestruje rozłączenie gniazda i przechodzi w stan oczekiwania, wywołując algorytm wyczytywania opóźnień z powracającym wykładniczym backoffem . W momencie, gdy gniazdo ponownie przechodzi w stan otwarty (`ws.onopen`), serwer w module `attachTransportWs` natychmiast wysyła przez nowo otwarty kanał najnowszy stan transportu w postaci ramki `transport_tick` . Ramka ta dociera do klienta w ciągu kilku milisekund, a jej odebranie powoduje wywołanie funkcji `applyAnchor` z aktualnym czasem monotonicznym przeglądarki `performance.now()`, co uruchamia płynną pętlę animacji `requestAnimationFrame` . Równolegle, wewnątrz handlera `ws.onopen`, kod klienta wykonuje asynchroniczne zapytanie HTTP `getTransport()` . Odpowiedź na to zapytanie HTTP nadchodzi do klienta z opóźnieniem rzędu kilkudziesięciu lub kilkuset milisekund . Po jej odebraniu klient ponownie bezwarunkowo wywołuje `applyAnchor(snap.state, performance.now(), snap.serverTimeMs)`, przekazując bieżący czas przeglądarki jako moment odbioru stanu, który w rzeczywistości został wygenerowany na serwerze znacznie wcześniej . Obliczona w ten sposób kotwica czasowa przyjmuje błędny punkt odniesienia, co skutkuje natychmiastowym, widocznym skokiem pozycji playheada w doł na osi czasu oraz chwilowym wstrzymaniem płynnego ruchu na ekranach muzyków .

### Wyścig Synchronizacji Wieloklienckiej (FOH vs Stage Display)

Równoległe korzystanie z systemu przez realizatora FOH oraz wykonawców na scenie ujawnia brak spójności w rozsyłaniu potwierdzeń komend . Rozważmy przypadek, w którym utwór dochodzi do końca, a w systemie włączona jest funkcja automatycznego przechodzenia do kolejnej piosenki z setlisty (`wireSetlistAutoAdvance`) . Moduł serwera wykrywa koniec utworu i rozpoczyna asynchroniczne ładowanie kolejnego projektu `await stores.getProject(next.id)` . W tym samym momencie realizator FOH, widząc koniec utworu na swoim ekranie, wysyła z poziomu Klienta 1 komendę `Pause` przez interfejs REST API . Żądanie REST Dociera do serwera szybciej niż trwa odczyt kolejnego projektu z dysku, w związku z czym silnik przechodzi w stan `playing = false` i natychmiast rozsyła tę zmianę przez WebSocket do wszystkich odbiorców . Klient 1 (FOH) oraz Klient 2 (Stage Display) odbierają ramkę i zatrzymują lokalne wygładzanie playheada . Jednakże po upływie kolejnych kilkudziesięciu milisekund operacja I/O w module [`auto-advance.ts`](../../../../apps/server/src/transport/auto-advance.ts) dobiega końca . Moduł automatycznego odtwarzania, ignorując fakt, że realizator w międzyczasie zatrzymał transport, wykonuje wywołania `transport.loadProject(next.id, nextProject)` oraz `transport.stop(nextProject)` . Serwer emituje nowy tick z nowo załadowanym projektem i pozycją zresetowaną do punktu domowego . W konsekwencji monitor sceniczny (Klient 2) niespodziewanie przełącza opisy i nuty na kolejny utwór, mimo że realizator na konsolecie FOH wyraźnie wstrzymał spektakl .

---

## Ocena Zgodności z Architekturą ADR 0002

Porównanie wdrożonego kodu z zapisami zawartymi w dokumencie [`docs/adr/0002-timebase-ssot.md`](../../../adr/0002-timebase-ssot.md) wykazuje obszary pełnej dyscypliny matematycznej oraz miejsca, w których doszło do istotnego naruszenia założeń architektonicznych .

### Elementy Zgodne z Zapisami ADR 0002

Zgodnie z wymogami ADR 0002, cała matematyka przeliczania czasu domenowego w pakiecie `@stagesync/shared` została zaimplementowana w postaci czystych funkcji, pozbawionych dostępu do I/O, obiektów DOM oraz zewnętrznych zegarów systemowych typu `Date.now()` czy `performance.now()` . Funkcje `elapsedToTicks`, `ticksToMs` oraz `ticksToBbt` operują wyłącznie na przekazanych parametrach . Kanon pozycji w silniku opiera się na całkowitoliczbowej osi `positionTicks` oraz stałej rozdzielczości `DEFAULT_PPQ = 960`, co gwarantuje wyeliminowanie błędów narastającego dryfu zmiennoprzecinkowego, znanego z wersji legacy 4.x . Zmienna float `absBeat` została całkowicie wycofana z definicji typów transportu .

Przeliczanie pozycji w obszarze odliczania (pre-roll / Countdown) odbywa się w pełnej zgodności z regułami arytmetyki euklidesowej . Zastosowanie podłogowego dzielenia całkowitego (`floorDiv`) oraz reszty euklidesowej (`euclidMod`) w module [`time.ts`](../../../../packages/shared/src/time.ts) zapobiega powstawaniu błędów przesunięcia o jeden impuls na granicy zerowego taktu . Wygładzanie pozycji po stronie klienta zachowuje charakter czysto kosmetyczny – funkcja `getDisplayTicks` wylicza pozycję na podstawie kotwicy czasowej i nie nadpisuje autorytatywnego stanu na serwerze . Punkt domowy transportu (`transportHomeTicks`) prawidłowo uwzględnia obecność klipów typu Countdown, zwracając ujemny tick startowy lub pozycję 0 w przypadku ich braku .

### Elementy Łamiące Założenia ADR 0002

Najpoważniejsze naruszenie ustaleń ADR 0002 dotyczy zasady pojedynczego źródła prawdy po stronie serwera . Wytyczne ADR jednoznacznie wskazują, że to serwer jest wyłącznym właścicielem pozycji transportu, a klient konsumuje wyłącznie ticki wysyłane przez magistralę komunikacyjną . Wdrożona w [`TransportProvider.tsx`](../../../../apps/web/src/transport/TransportProvider.tsx) funkcja `runCommand` złamała tę zasadę, wprowadzając lokalną, optymistyczną modyfikację stanu i kotwicy czasowej tuż po wywołaniu żądania REST API, zanim serwer zdążył przetworzyć komendę i wyemitować autorytatywna ramkę . Powoduje to powstawanie współbieżnych, konkurujących ze sobą linii czasowych .

Kolejnym uchybieniem jest brak realizacji zasady natychmiastowego zgłaszania błędów (fail-fast) w przypadku wykrycia niespójności stanu czasu . Zgodnie z ADR 0002, wykrycie jakiejkolwiek anomali czasowej powinno prowadzić do natychmiastowego zatrzymania interpolacji i zaimplementowania przewidywalnej procedury naprawczej . Tymczasem pomocnicza funkcja `shouldAcceptServerTick` w klienckim reducerze cicho odrzuca ramki przybywające z ujemnym opóźnieniem (`serverTimeMs < lastServerTimeMs`), nie generując żadnego wyjątku ani zdarzenia błędu w interfejsie użytkownika . W konsekwencji klient może kontynuować lokalne wygładzanie pozycji w odosobnieniu od serwera, stwarzając złudzenie prawidłowego działania systemu .

Wreszcie, funkcja `samplePosition()` w pliku [`engine.ts`](../../../../apps/server/src/transport/engine.ts) łamie koncepcję bezefektowego odczytu stanu . Podczas zwykłego próbkowania pozycji, w przypadku wykrycia przekroczenia krawędzi pętli, funkcja ta modyfikuje stan wewnętrzny silnika poprzez przypisanie `positionTicks = wrap` oraz wywołanie `reanchor()` . Przekształcenie zapytania odczytującego (getter) w operację zmieniającą stan wewnętrzny (mutator) wprowadza trudne do wykrycia efekty uboczne przy współbieżnym odpytywaniu transportu .

---

## Propozycje Scenariuszy Testowych

W celu wyeliminowania zidentyfikowanych stanów wyścigu oraz zagwarantowania spójności działania silnika StageSync v5, zaleca się wdrożenie dedykowanych zestawów testowych w środowiskach Vitest oraz Playwright E2E.

### Testy Jednostkowe i Integracyjne (Vitest)

#### 1. Test Wyścigu I/O w Modułach Automatyki Transportu ([`engine.test.ts`](../../../../apps/server/src/transport/engine.test.ts))
Test ma na celu weryfikację odporności silnika na spóźnione odpowiedzi z magazynu danych podczas wykonywania ręcznych komend transportu . W warunkach testowych należy zasymulować sztuczne opóźnienie (np. 100 ms) w mocku magazynu `stores.getProject` . Scenariusz uruchamia odtwarzanie utworu i sztucznie przesuwa czas do krawędzi `projectEndTicks` . W momencie, gdy moduł `pause-at-end` wyłapuje zdarzenie i rozpoczyna asynchroniczne pobieranie danych, test natychmiastowo wywołuje ręczną komendę `transport.seek(0)` . Po upływie opóźnienia I/O test weryfikuje, czy ostateczna pozycja w silniku wynosi dokładnie `0`, a nie została nadpisana wartością `endTicks` .

#### 2. Test Determinizmu i Brak Efektów Ubocznych w `samplePosition` ([`engine.test.ts`](../../../../apps/server/src/transport/engine.test.ts))
Scenariusz weryfikuje, czy wielokrotne wywołanie odczytu stanu nie wprowadza niepożądanych zmian w kotwicy czasowej . Test konfiguruje pętlę loop w przedziale od 1000 do 2000 ticków, przesuwa zegar testowy za krawędź pętli i wykonuje sekwencyjnie dziesięć odczytów `transport.getState()` . Asercja sprawdza, czy wszystkie odczyty zwracają identyczną, przeliczoną pozycję oraz czy bezpośrednie próbkowanie nie powoduje wielokrotnego, błędnego przesuwania punktu origin w pętli renderującej .

#### 3. Test Arytmetyki Pre-Roll i Granic Wartości Ujemnych ([`time.test.ts`](../../../../packages/shared/src/time.test.ts))
Test sprawdza poprawność konwersji jednostek czasowych na osi ujemnej przy nietypowych metrach (np. 5/8, 7/8) . Przekazując do funkcji `ticksToBbt` wartości ujemne odpowiadające okresowi odliczania (np. `-1`, `-480`, `-2400`), test weryfikuje, czy uzyskane struktury BBT są poprawne i czy odwrotna konwersja `bbtToTicks` bezbłędnie odtwarza wyjściowe impulsy całkowite bez generowania błędów `RangeError` .

#### 4. Test Odrzucania Niepoprawnych Sekwencji Serwera ([`transportReducer.test.ts`](../../../../apps/web/src/transport/transportReducer.test.ts))
Scenariusz weryfikuje logikę pomocniczą `shouldAcceptServerTick` . Test przekazuje sekwencję znaczników czasu serwera, w której jeden z komunikatów dociera z opóźnieniem (sekwencja timestampów: 1000, 1050, 1020, 1100) . Test sprawdza, czy ramka z czasem 1020 zostaje bezwzględnie odrzucona, a ramka 1100 prawidłowo zaakceptowana .

### Testy Kompleksowe End-to-End (Playwright E2E)

#### 1. Test Rekonfiskacji Połączenia WS z Opóźnieniem Magistrali HTTP
Scenariusz testowy emuluje niestabilne warunki sieciowe na scenie. Test uruchamia odtwarzanie utworu, po czym symuluje zerwanie połączenia WebSocket pomiędzy przeglądarką a serwerem . Następnie test przywraca łączność sieciową, jednocześnie nakładając sztuczne opóźnienie 300 ms na trasie żądań HTTP GET `/ws/transport` . Podczas trwania reconnectu, test rejestruje wartość pozycji `displayTicks` renderowaną na elemencie DOM w pętli animacji . Kryterium zaliczenia testu stanowi całkowity brak skoków wstrzymujących lub cofających pozycję playheada na ekranie po wznowieniu odbioru ramek .

#### 2. Test Wyścigu Wieloklienckiego podczas Automatycznego Przełączania Utworu
Scenariusz weryfikuje spójność stanów wyświetlanych na dwóch niezależnych urządzeniach . Test otwiera dwa okna przeglądarki reprezentujące konsoletę FOH oraz ekran sceniczny . W opcjach setlisty włączana jest funkcja `autoAdvance` . Test doprowadza odtwarzanie do końca utworu, a w momencie rozpoczęcia automatycznego przełączania wykonuje z poziomu okna FOH komendę `Pause` . Kryterium zaliczenia stanowi potwierdzenie, że oba okna przeglądarki pozostają w spójnym stanie zatrzymania na tym samym utworze, a ekran sceniczny nie dokonuje samowolnego przełączenia piosenki .

---

## Podsumowanie i Rekomendacje Architektoniczne

Przeprowadzony audyt silnika StageSync v5 wykazał wysoki poziom dopracowania matematycznego w obszarze czystej algebry czasu (zgodnie z wytycznymi ADR 0002), ale równocześnie ujawnił istotne luki w warstwie orkiestracji asynchronicznej oraz integracji z protokołem WebSocket . 

Do najważniejszych rekomendacji wdrożeniowych należą:
1. **Unifikacja źródła danych przy reconnect**: Całkowite usunięcie pomocniczego wywołania `getTransport()` z handlera `ws.onopen` w pliku [`TransportProvider.tsx`](../../../../apps/web/src/transport/TransportProvider.tsx) . Stan początkowy po ponownym połączeniu powinien być deterministycznie budowany wyłącznie na podstawie natychmiastowej ramki powitalnej WebSocket przesyłanej przez serwer .
2. **Sekwencjonowanie operacji I/O na serwerze**: Wdrożenie mechanizmu sprawdzania aktualności stanu (stale-check) po zakończeniu każdej operacji asynchronicznej w modułach [`pause-at-end.ts`](../../../../apps/server/src/transport/pause-at-end.ts) oraz [`auto-advance.ts`](../../../../apps/server/src/transport/auto-advance.ts) . Przed wykonaniem jakiejkolwiek modyfikacji transportu kod musi zweryfikować, czy pozycja oraz stan odtwarzania w silniku nie uległy zmianie w trakcie trwania obietnicy I/O .
3. **Czystość funkcji próbkowania**: Usunięcie efektów ubocznych z funkcji `samplePosition()` w pliku [`engine.ts`](../../../../apps/server/src/transport/engine.ts) poprzez rozdzielenie czystego odczytu pozycji od operacji modyfikacji kotwicy pętli .
4. **Wdrożenie jawnej obsługi błędu Fail-Fast**: Zastąpienie cichego odrzucania błędnych ramek czasowych w kliencie jawnym stanem błędu, który informuje realizatora spektaklu o wystąpieniu anomali i natychmiastowo przywraca spójność ze źródłem prawdy .

---
Powered by [AI Exporter](https://saveai.net)
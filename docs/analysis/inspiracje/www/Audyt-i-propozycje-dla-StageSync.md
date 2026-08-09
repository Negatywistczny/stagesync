> From: https://gemini.google.com/app/be82762ede7e6fb8

Audyt Strony StageSync

# Raport audytu i strategii marketingowej StageSync (apps/www)

System StageSync reprezentuje klasę oprogramowania **Live Show Control** — scentralizowany transport sceniczny, reżyserię osi czasu (Timeline) oraz wielourządzeniową synchronizację stanowisk wykonawczych na żywo w sieci lokalnej . Produkt ten jest projektowany z myślą o stanowiskach FOH (Front of House), reżyserii oraz muzykach na scenie, a nie jako generyczny cyfrowy kontroler dźwięku (DAW) w chmurze . Niniejszy raport stanowi całościową analizę obecnego stanu witryny marketingowej `apps/www` oraz przedstawia poparte dowodami technologicznymi i projektowymi wytyczne jej optymalizacji dla linii produktowej **5.2 Pocket Stage** .

---

## 1. Audyt obecnej strony marketingowej

Ocena stanu faktycznego serwisu `apps/www` została przeprowadzona na podstawie szczegółowej weryfikacji kodu źródłowego pliku HTML, arkuszy stylów CSS, skryptów TypeScript oraz dołączonej dokumentacji systemowej . Wyniki audytu podzielono na dziewięć obszarów problemowych, zwięźle zestawionych w poniższej tabeli podsumowującej.

| Obszar audytu             | Identyfikowane uchybienie lub podatność                                                                                                            | Poziom krytyczności | Plik źródłowy                                                                                                              |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------- |
| **SEO & Dostępność**      | Brak tekstowego nagłówka `H1` w strukturze DOM — zastosowanie wyłącznie znaku graficznego SVG .                                                    | Wysoki              | [`index.html`](../../../../apps/desktop/launcher/index.html)                                                               |
| **SEO & Social Share**    | Całkowity brak metadanych Open Graph (`og:*`) oraz kart Twittera (`twitter:*`) .                                                                   | Średni              | [`index.html`](../../../../apps/desktop/launcher/index.html)                                                               |
| **Brand Consistency**     | Twardo zakodowane wartości kolorów HEX w pliku HTML zamiast użycia tokenów `--ss-*` .                                                              | Średni              | [`index.html`](../../../../apps/desktop/launcher/index.html), [`styles.css`](../../../../apps/desktop/launcher/styles.css) |
| **Dojrzałość techniczna** | Sztywne adresy URL API w kodzie źródłowym TypeScript z pominięciem manifestu [`channels.json`](../../../../apps/www/public/config/channels.json) . | Średni              | [`releases.ts`](../../../../apps/www/src/releases.ts), [`channels.json`](../../../../apps/www/public/config/channels.json) |
| **UX & Konwersja**        | Brak kontekstowych odnośników do dokumentów instalacyjnych przy kartach pobierania .                                                               | Średni              | [`index.html`](../../../../apps/desktop/launcher/index.html), [`main.ts`](../../../../apps/www/src/main.ts)                |
| **Copywriting**           | Stosowanie sformułowań opartych na marketingu absencji („bez serwera”, „bez chmury”) .                                                             | Niski               | [`index.html`](../../../../apps/desktop/launcher/index.html)                                                               |
| **Dostępność (A11y)**     | Brak dynamicznego powiadamiania czytników ekranu (live region) o zmianie stanu katalogu .                                                          | Niski               | [`index.html`](../../../../apps/desktop/launcher/index.html), [`main.ts`](../../../../apps/www/src/main.ts)                |
| **UX Mobilny**            | Ukrywanie kluczowych odnośników nawigacyjnych na małych ekranach zamiast płynnego menu .                                                           | Niski               | [`styles.css`](../../../../apps/desktop/launcher/styles.css)                                                               |
| **Utrzymanie kodu**       | Mieszanie logiki widoku z ręcznym generowaniem węzłów DOM w skrypcie [`main.ts`](../../../../apps/www/src/main.ts) .                               | Niski               | [`main.ts`](../../../../apps/www/src/main.ts)                                                                              |

### Architektura informacji i struktura sekcji

Nawigacja i struktura sekcji obecnej strony układają się w prostą ścieżkę liniową: górny pasek nawigacji, sekcja Hero, filary wartości (Pillars), podział ról scenicznych (Roles), instrukcja wdrożenia krok po kroku (Steps), katalog pobierania (Download) oraz stopka . Taki układ zapewnia przejrzysty przepływ informacji, jednak odseparowanie materiałów dokumentacyjnych od sekcji pobierania stwarza tarcie na ścieżce konwersji inżynierów i operatorów . Użytkownicy poszukujący szczegółowych wymogów instalacyjnych dla systemu macOS lub procedury sideloadu na platformie Android są zmuszeni do samodzielnego przeszukiwania zewnętrznego repozytorium GitHub .

### Sekcja Hero i kompozycja pierwszego ekranu

Kompozycja pierwszego ekranu (first viewport) zachowuje zwięzłość i skupienie na produkcie, reprezentując estetykę konsolety reżyserskiej . Wykorzystanie animowanego motywu osi czasu oraz przesuwającej się głowicy odtwarzania (Playhead) jednoznacznie buduje klimat środowiska scenicznego . Kluczowym uchybieniem konstrukcyjnym jest jednak zrealizowanie nagłówka `H1` wyłącznie jako elementu graficznego `<img src="...stagesync-logo.svg" alt="StageSync" />` . Mimo obecności atrybutu `alt`, brak czystego tekstu wewnątrz elementu nagłówkowego uderza w hierarchię semantyczną dokumentu i ogranicza indeksowalność w wyszukiwarkach .

### Copywriting i pozycjonowanie ról

Komunikacja tekstowa na stronie precyzyjnie rozgranicza zadania Operatora (Desktop Launcher / Android Console) od zadań Muzyka (Android Performer) . Poprawnie akcentowana jest rola hosta jako jedynego autorytetu czasu (SSOT) oraz natywna praca w sieci lokalnej . Na stronie występują jednak uchybienia w postaci marketingu absencji — opisywania zalet produktu poprzez negację, np. „bez konfiguracji serwera i bez kont w chmurze” . Tego rodzaju sformułowania osłabiają profesjonalny wydźwięk marki i powinny zostać zastąpione bezpośrednim językiem korzyści technicznych, takimi jak „Autonomiczna sieć lokalna LAN” oraz „Lokalny silnik zero-config” .

### Ścieżka konwersji i obasługa CTA

Główny przycisk akcji w sekcji Hero płynnie przewija widok do sekcji pobierania `#download` . Proces dynamicznego pobierania danych o wydaniach z GitHub Releases API działa stabilnie, lecz w przypadku błędu sieciowego lub przekroczenia limitów zapytania serwowany jest zdawkowy komunikat błędu . W sytuacji braku gotowych artefaktów dla danej platformy strona wyświetla szary, nieaktywny element bez wskazania alternatywnej ścieżki (np. samodzielnej kompilacji ze źródeł lub przejścia do archiwum wydań) .

### Spójność marki i tokenów stylów

Strona importuje zaimplementowane w monorepo tokeny stylów z pakietu `@stagesync/ui/tokens.css` i bazuje na zmiennych CSS `--ss-*` . Spójność ta jest jednak naruszona bezpośrednio w pliku [`index.html`](../../../../apps/desktop/launcher/index.html), gdzie wewnatrz grafiki SVG w sekcji Hero użyto sztywno zakodowanych wartości kolorów HEX (`#fbbf24`, `#3f3f46`, `#27272a`) . Uniemożliwia to dynamiczną zmianę palety barwowej Hero w przypadku modyfikacji motywu w globalnych tokenach UI .

### Dostępność cyfrowa (A11y)

Strona posiada poprawnie zintegrowany link bezpośredniego przejścia do treści (`skip-link`) oraz respektuje preferencje użytkowników dotyczące ograniczenia ruchu (`prefers-reduced-motion`), wyłączając zapętlone animacje osi czasu . Kontrast tekstów w trybie ciemnym spełnia normy WCAG . Brakuje natomiast atrybutu `aria-live="polite"` w kontenerze dynamicznie wczytywanego katalogu wydań (`#download-catalog`), co sprawia, że czytniki ekranu nie powiadamiają użytkownika o zakończeniu pobierania listy instalatorów .

### Responsywność i dostosowanie mobilne

Kaskadowe arkusze stylów sprawnie obsługują punkty załamania ekranu . Poniżej szerokości `52rem` wielokolumnowe siatki ról i wydań przekształcają się w czytelny układ jednokolumnowy, a tło osi czasu w sekcji Hero zmniejsza krycie, zapewniając pełną czytelność tekstu . Słabszym punktem jest reguła poniżej `28rem`, która usuwa z paska nawigacji większość odnośników bez zaoferowania rozwijanego menu .

### Optymalizacja SEO

Dokument posiada poprawnie skonfigurowane podstawowe znaczniki metadanych, w tym język `pl`, tytuł oraz opis . Strona jest jednak całkowicie pozbawiona tagów Open Graph (`og:*`) i Twitter Cards . W efekcie udostępnienie odnośnika do StageSync w komunikatorach branżowych (Slack, Discord, Telegram) nie generuje karty podglądu z grafiką i podsumowaniem, co obniża współczynnik klikalności (CTR) w kanałach społecznościowych i bezpośrednich.

### Dojrzałość techniczna kodu

Aplikacja została zbudowana przy użyciu TypeScriptu i środowiska Vite . Logika klasyfikacji artefaktów w module [`releases.ts`](../../../../apps/www/src/releases.ts) poprawnie rozpoznaje pliki `.dmg`, `.msi` oraz `.apk` . Kod ignoruje jednak istniejący w korzeniu repozytorium plik [`channels.json`](../../../../apps/www/public/config/channels.json), zawierający zcentralizowane adresy URL dla aktualizacji i dokumentacji . Na skutek tego adresy API zostały na sztywno wpisane w kodzie TypeScript, co utrudnia późniejsze utrzymanie i zarządzanie kanałami wydań .

---

## 2. Sugestie rozwojowe (Must / Should / Later)

Wszystkie proponowane działania opierają się wyłącznie na oficjalnie udostępnionych funkcjonalnościach linii produktowej **5.2 Pocket Stage** .

### Wymagania bezwzględne (Must)

- **Ujednolicenie semantyki nagłówka H1 i zastąpienie wartości HEX tokenami w SVG:** Wprowadzenie tekstowego nagłówka `H1` w połączeniu z logotypem oraz zamiana sztywnych wartości HEX w SVG na zmienne `var(--ss-color-primary)` i `var(--ss-color-surface)` . Działanie to podnosi wskaźniki dostępności oraz gwarantuje spójność wizualną z systemem tokenów . Sukces zostanie potwierdzony uzyskaniem wyniku 100/100 w audycie dostępności Lighthouse .
- **Powiązanie logiki pobierania wydań z manifestem [`channels.json`](../../../../apps/www/public/config/channels.json):** Zastąpienie zahardkodowanych adresów URL w module [`releases.ts`](../../../../apps/www/src/releases.ts) dynamicznym odczytem z pliku [`channels.json`](../../../../apps/www/public/config/channels.json) . Usprawnienie to zapobiega powstawaniu nieaktywnych odnośników w przypadku modyfikacji infrastruktury repozytorium . Sukces zostanie zmierzony poprawnym pobieraniem katalogu wydań w środowisku testowym bez obecności sztywnych ciągów znaków w kodzie źródłowym .
- **Wdrożenie pełnego zestawu metadanych Open Graph i Twitter Cards:** Dodanie tagów `og:title`, `og:description`, `og:image`, `og:type` oraz `twitter:card` do sekcji `<head>` pliku [`index.html`](../../../../apps/desktop/launcher/index.html) . Zapewnia to profesjonalny podgląd wizualny serwisu podczas udostępniania linków w mediach społecznościowych i komunikatorach . Sukces zostanie potwierdzony bezbłędną weryfikacją podglądu karty w oficjalnym narzędziu Facebook Sharing Debugger .

### Rekomendowane usprawnienia (Should)

- **Eliminacja marketingu absencji na rzecz języka korzyści technicznych:** Przekształcenie zwrotów zawierających zaprzeczenia na opisy unikalnych cech architektury systemowej (np. „Zero-config LAN”, „W pełni autonomiczne środowisko lokalne”) . Przebudowa copywiritingu wzmacnia wiarygodność produktu w oczach profesjonalnych realizatorów koncertowych . Sukces zostanie zmierzony wzrostem średniego czasu spędzonego przez użytkowników w sekcji opisu ról scenicznych .
- **Kontekstowa integracja wydań z przewodnikami instalacji:** Dołączenie do kart pobierania bezpośrednich odnośników do dedykowanych instrukcji w dokumentacji ([`DESKTOP.md`](../../../guides/DESKTOP.md), [`MOBILE.md`](../../../guides/MOBILE.md), [`INSTALL.md`](../../../guides/INSTALL.md)) . Działanie to eliminuje niepewność użytkownika związaną ze zdejmowaniem kwarantanny macOS Gatekeeper lub procedurą sideloadu na platformie Android . Sukces zostanie zmierzony przyrostem przejść z kart pobierania do odpowiednich plików dokumentacji w repozytorium .

### Rozwój długoterminowy (Later)

- **Statyczny bufor wydań generowany w czasie budowy (Build-time Release Fallback):** Utworzenie skryptu kompilacji, który podczas budowania strony pobiera aktualny katalog z GitHub API i zapisuje go w projekcie jako lokalny plik JSON . Gwarantuje to błyskawiczne wyświetlenie oferty pobierania nawet w przypadku całkowitej awarii API lub przekroczenia limitów zapytań klienta . Sukces zostanie zmierzony skróceniem czasu do pierwszego wyrenderowania kart pobierania do 0 ms dla danych z lokalnego bufora .

---

## 3. Proponowana Architektura Informacji (IA)

Nowa struktura strony marketingowej eliminuje zbędne rozpraszacze, kierując użytkownika bezpośrednio do właściwego artefaktu wykonawczego lub dokumentacji technicznej .

1. **Górny pasek nawigacji (Topbar Nav)**
   - Logotyp marki StageSync z linkiem powrotnym do sekcji głównej .
   - Ekrany nawigacji: Architektura systemowa, Role sceniczne, Wdrożenie, Pobierz, Dokumentacja .
2. **Sekcja Hero (First Viewport)**
   - Etykieta nadrzędna: Live Show Control · Pocket Stage 5.2 .
   - Główny nagłówek H1 z połączonym symbolem marki i tekstem czytelnym dla robotów .
   - Podtytuł (Lede): Jeden autorytatywny zegar dla całej sceny. Reżyseria Timeline na stanowisku FOH oraz zynchronizowane ekrany wykonawców w sieci lokalnej .
   - Grupa przycisków akcji: Pobierz dla swojej stacji roboczej, Instrukcja szybkiego startu .
   - Główny motyw wizualny: Wizualizacja stanowiska reżyserskiego z aktywną osią czasu i płynnym wskaźnikiem pozycji odtwarzania .
3. **Sekcja Filarów Systemowych (Pillars)**
   - Wspólny czas: Jedno źródło prawdy (SSOT) dla zegara, tempa i metrum bez ryzyka rozjeżdżania się stanowisk .
   - Reżyseria setu: Tworzenie struktur utworów, sekcji i przejść na osi czasu zaprojektowanej pod specyfikę koncertową .
   - Ekrany wykonawców: Zsynchronizowane przewijanie akordów, tekstów, partytur OSMD oraz sekcji rytmicznych na tabletach .
4. **Sekcja Podziału Ról Scenicznych (Roles)**
   - Stanowisko Operatora: Sterowanie transportem i osią czasu z poziomu aplikacji Desktop (macOS/Windows) lub tabletu Android Console .
   - Stanowisko Muzyka: Podgląd materiałów na żywo przez aplikację Android Performer podłączoną do hosta w lokalnej sieci LAN .
5. **Sekcja Ścieżki Wdrożenia (Workflow Steps)**
   - Krok 1: Uruchomienie hosta na stacji roboczej lub serwerze .
   - Krok 2: Przygotowanie setlisty, formy utworów i automatyzacji MIDI .
   - Krok 3: Podłączenie urządzeń scenicznych przez zero-config LAN lub kod QR .
6. **Sekcja Katalogu Pobierania (Interactive Download Hub)**
   - Wskaźnik stanu hydratacji wydań z obsługą komunikatów błędu i odnośnikiem do archiwum .
   - Stacje robocze operatora: Instalatory Windows (MSI) oraz macOS (DMG dla Apple Silicon i Intel) wraz z linkiem do przewodnika [`DESKTOP.md`](../../../guides/DESKTOP.md) .
   - Aplikacje sceniczne: Pakiety APK dla Android Console oraz Android Performer wraz z linkiem do przewodnika [`MOBILE.md`](../../../guides/MOBILE.md) .
   - Serwer rackowy: Instrukcja uruchomienia kontenera Docker Compose wraz z linkiem do przewodnika [`INSTALL.md`](../../../guides/INSTALL.md) .
7. **Stopka (Footer)**
   - Identyfikacja marki i informacja o licencji źródłowej BUSL-1.1 .
   - Odnośniki bezpośrednie: Wykazy wydań na GitHubie, Dokumentacja API, Dziennik zmian (Changelog v5.2) .

---

## 4. Kierunki copywritingu (Warianty PL)

Poniższe warianty tekstowe eliminują marketing absencji oraz żargon operacyjny, skupiając się na precyzyjnym języku korzyści technicznych.

### Sekcja Hero (Nagłówek i Podtytuł)

| Wariant                       | Główny nagłówek (H1)                                         | Podtytuł (Lede)                                                                                                                                                |
| :---------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wariant 1 (Inżynieryjny)**  | Scentralizowana kontrola występów na żywo.                   | Pełna synchronizacja transportu, osi czasu i ekranów scenicznych. Jeden autorytatywny zegar dla stanowiska reżyserii i każdego muzyka w sieci lokalnej .       |
| **Wariant 2 (Koncertowy)**    | Jeden zegar. Cały zespół w idealnym tempie.                  | StageSync łączy reżyserię osi czasu z automatycznym przewijaniem nut, akordów i tekstu na tabletach wykonawców. Wszystko w oparciu o bezpieczną sieć LAN .     |
| **Wariant 3 (Wydajnościowy)** | Profesjonalny system transportu i synchronizacji scenicznej. | Kontroluj przebieg koncertu ze stacji roboczej lub tabletu. Dostarczaj zsynchronizowane widoki wykonawcze z gwarancją stabilności i bez zależności od chmury . |

### Sekcja Opisu Ról Scenicznych

- **Operator (FOH / Reżyseria):** Sterujesz transportem, setlistą oraz automatyzacją komunikatów MIDI . Praca na stacji roboczej macOS/Windows poprzez launcher aplikacji lub bezpośrednio na tablecie z wykorzystaniem pełnowymiarowego panelu Android Console .
- **Muzyk (Stanowisko na scenie):** Otrzymujesz automatycznie zsynchronizowany podgląd partytur, akordów i tekstu . Aplikacja Android Performer łączy się bezpośrednio z lokalnym hostem w sieci LAN, gwarantując stałe tempo i pozycję bez konieczności manualnej konfiguracji .

---

## 5. Sugestie wizualne i mikrointerakcje (Visual / UX)

Warstwa wizualna serwisu powinna odzwierciedlać atmosferę stanowiska reżyserskiego (Live Booth) oraz osi czasu, unikając generycznych szablonów opartych na kartach w sekcji Hero .

### Animacja głowicy transportu (Live Playhead Drift)

Główny element wizualny w sekcji Hero wykorzystuje grafikę wektorową przedstawiającą ścieżki i klipy osi czasu . Płynny ruch wskaźnika pozycji odtwarzania (Playhead) realizowany jest za pomocą animacji CSS `@keyframes playhead-drift` z wymuszoną akceleracją sprzętową GPU (`will-change: transform`) . Podczas najechania kursorem na główny przycisk akcji, wskaźnik Playhead delikatnie zwiększa częstotliwość ruchu, dając wizualną odpowiedź o gotowości silnika do pracy .

### Wskaźnik stanu sieci lokalnej (Booth Status Beacon)

Przy elemencie prezentującym wersję oraz status nawiązanego połączenia umieszczony zostaje dyskretny, świecący wskaźnik optyczny imitujący diodę LED z urządzeń rackowych. Dioda wykorzystuje płynną animację `@keyframes cta-pulse` operującą na zmiennych kolorów `color-mix(in srgb, var(--ss-color-primary) ...)` . W trakcie wczytywania danych z API wydań dioda tętni w trybie oczekiwania, a po pomyślnym załadowaniu katalogu przechodzi w stan stałego podświetlenia .

### Mikroprzejścia kart pobierania

W sekcji pobierania przełączanie pomiędzy dostępnymi wariantami architektur (np. macOS Apple Silicon ARM64 vs Intel x64) odbywa się w obrębie jednej karty bez przeładowywania widoku . Przejście realizowane jest za pomocą właściwości `opacity` oraz `transform` z czasem reakcji zdefiniowanym w tokenie `var(--ss-duration-normal)`, co podkreśla lekkość i responsywność interfejsu .

---

## 6. Uwagi techniczne dla aplikacji `apps/www`

Wdrożenie zaleceń audytowych wymaga modyfikacji określonych plików w strukturze katalogu `apps/www` oraz wykorzystania wspólnego pliku konfiguracyjnego [`channels.json`](../../../../apps/www/public/config/channels.json) .

### Plik [`apps/www/index.html`](../../../../apps/www/index.html)

- **Poprawa semantyki H1:** Zastąpienie wyłącznego znacznika obrazu strukturą łączącą ukryty tekst dostępny dla czytników z graficznym logotypem marki :
  - Wprowadzenie elementu `<span class="visually-hidden">StageSync — Live Show Control</span>` wewnątrz nagłówka `<h1 id="hero-title" class="hero__title">` .
- **Dodanie obszaru powiadomień A11y:** Uzupełnienie kontenera wydań o atrybut dynamicznego powiadamiania czytników ekranu :
  - Dodanie atrybutu `aria-live="polite"` do elementu `<div class="download__catalog" id="download-catalog">` .
- **Uzupełnienie metadanych SEO:** Wstawienie kompletnego zestawu tagów Open Graph oraz Twitter Cards w sekcji `<head>` .

### Plik [`apps/www/src/releases.ts`](../../../../apps/www/src/releases.ts)

- **Integracja z manifestem kanałów:** Wyeliminowanie na sztywno wpisanych ciągów znaków i zaimportowanie konfiguracji z pliku [`channels.json`](../../../../apps/www/public/config/channels.json) zlokalizowanego w korzeniu monorepo :
  - Odczyt adresu API wydań poprzez właściwość `channels.latestReleaseApi` oraz adresu strony wydań poprzez `channels.releases` .

### Plik [`apps/www/src/main.ts`](../../../../apps/www/src/main.ts)

- **Kontekstowa integracja z dokumentacją:** Rozbudowa funkcji `renderCard` o automatyczne dołączanie bezpośrednich linków do plików przewodników ([`DESKTOP.md`](../../../guides/DESKTOP.md), [`MOBILE.md`](../../../guides/MOBILE.md)) odczytywanych z obietnicy konfiguracyjnej .
- **Rozbudowana obsługa błędów:** Wzbogacenie funkcji `hydrateDownloads` o generowanie linku ratunkowego do archiwum wydań na GitHubie w sytuacji wystąpienia błędu sieciowego .

### Plik [`apps/www/src/styles.css`](../../../../apps/www/src/styles.css)

- **Refaktoryzacja wartości kolorów:** Zastąpienie bezpośrednich wartości HEX wewnątrz osadzonych grafik wektorowych SVG zmiennymi CSS opartymi na tokenach `--ss-*` :
  - Zastosowanie właściwości `stroke: var(--ss-color-border-muted)` dla linii osi czasu oraz `fill: var(--ss-color-surface-elevated)` dla bloków klipów .

---

## 7. Checklista bezpieczeństwa komunikacji (Claim Safety)

Przed wdrożeniem produkcyjnym nowej wersji serwisu marketingowego należy dokonać weryfikacji wszystkich komunikatów z poniższą listą kontrolną, gwarantującą pełną zgodność z dostarczonym stanem kodu **5.2 Pocket Stage** .

| Kategoria funkcjonalna   | Dozwolony zakres komunikacji (Zgodny ze stanem repozytorium)                                  | Niedozwolone sformułowania i błędne twierdzenia                                           | Stan weryfikacji |
| :----------------------- | :-------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- | :--------------- |
| **Android Console**      | Dedykowany pełny panel SPA (Admin + Timeline) z możliwością uruchomienia lokalnego hosta .    | Promowanie Console jako bezprzewodowego zastępstwa dla DAW w chmurze .                    | ZGODNE           |
| **Android Performer**    | Pasywny klient sceniczny do zsynchronizowanego podglądu nut, akordów i tekstu .               | Przypisywanie Performerowi funkcji miksowania audio lub edycji linii czasu .              | ZGODNE           |
| **Łączność w sieci LAN** | Bezobsługowe wykrywanie urządzeń w sieci lokalnej (zero-config LAN / mDNS) .                  | Stosowanie marketingu absencji: „Bez konfiguracji, bez serwerów, bez OAuth” .             | DO POPRAWY       |
| **Ścieżka dystrybucji**  | Instalatory stacji roboczych i pakiety APK jako główna ścieżka; Docker jako opcja serwerowa . | Prezentowanie kontenera Docker jako wyłącznej lub wymaganej metody wdrożenia .            | ZGODNE           |
| **Wersja produktowa**    | Wersja stabilna 5.2 Pocket Stage .                                                            | Reklamowanie funkcji planowanych z plików ROADMAP/TODO lub wersji eksperymentalnych .     | ZGODNE           |
| **Język opisu**          | Precyzyjne określanie parametrów technicznych z perspektywy realizatora .                     | Używanie wewnętrznego żargonu operacyjnego (np. ADR, parity v4, soft-gate, claim green) . | ZGODNE           |

---

Powered by [AI Exporter](https://saveai.net)

# Changelog

Wszystkie istotne zmiany w StageSync są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
projekt stosuje [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

### Dodano

#### ⏱️ Timeline & DAW

- **Tab selection i nożyczki:** zaznaczanie klipów zakładkami oraz narzędzie nożyczek (scissors) do podziału klipów na osi czasu.

#### 🎸 Easter eggi i kultura sceniczna

- **Stałe Hexspeak i strojenie:** typowane stałe szesnastkowe (`0xDEADBEEF`, `0xCAFEBABE`, `0x00C0FFEE`, `0x57A6E`), formatowanie faderu Spinal Tap (+11) oraz deskryptor strojenia 432 Hz w `@stagesync/shared`.
- **Endpointy API:** kawiarka RFC 2324 (`/api/coffee`), rider koncertowy Van Halen (`/api/rider`) oraz gaśnica sceniczna w `POST /api/midi/panic`.
- **Client & DevTools:** syntezatory Web Audio (*The Lick*, *Rickroll*), tęczowy Konami Code, metronom *Rushing Drummer* oraz generator roboczych tytułów utworów w modalu nowego projektu.

#### 🧪 Testy i pokrycie

- **Smart Tempo beat-grid:** pokrycie testami powyżej 85 % (nowe scenariusze grid, sekcje, krawędzie).
- **Pristine grid:** testy jednostkowe dla `buildPristineSectionGrid`.
- **Top-10 I/O files:** pokrycie linii powyżej 50 % dla najcięższych plików wejścia/wyjścia.
- **yt-dlp stubs:** precyzyjniejsze matchery URL w testach sieciowych serwera.

#### 🛠️ DX & Dev Hub

- **Scoped verify gates:** bramy weryfikacji CI/Daily/Audit z parsowaniem wyników Vitest/Coverage/Playwright.
- **Interaktywny zapis logów verify:** po zakończeniu weryfikacji można zapisać logi do pliku.
- **Danger confirms:** potwierdzenia i ostrzeżenia efektów ubocznych w destrukcyjnych akcjach Dev Hub.
- **Richer Verify summary:** per-step details w podsumowaniu verify.

### Zmieniono

#### 🏗️ Architektura

- **Modularyzacja kodu źródłowego:** split `smart-tempo`, `audioTempoAnalysis`, `audioPlayback`, `text-anchor-bridge` na wyspecjalizowane moduły; split ~20 komponentów `apps/web` pod limit `max-lines` (inspektory, mixer, edycja, dashboard); split tras serwera (`system`, `youtube-audio`).
- **Reorganizacja `shells/`:** pliki przeniesione z płaskiego katalogu `shells/` do subdirectories: `client/`, `desktop/`, `import/`, `settings/`, `timeline/`, `components/`.
- **Reorganizacja `server/src/` i `shared/src/`:** pliki pogrupowane w katalogi domenowe.

#### ⏱️ Timeline & DAW

- **Smart Tempo forma layout:** poprawiony algorytm rozkładu sekcji Formy oraz onset grid w text-anchor bridge.
- **Import US+UG:** przy ciasnym oknie Formy mostek pomija nadmiarowe akordy zamiast upychać je w odcinki 1-tick (ostrzeżenie w wyniku importu); sekcja bez miejsca przed następnym Beat 1 wokalu dostaje 1-taktowy stub Formy zamiast zerowej długości.

#### 🛠️ DX & Dev Hub

- **Modularyzacja Dev Hub:** rozbicie monolitycznego skryptu na moduły `scripts/hub/` (`dev-hub`, `doctor`, `network`, `gate`, `utils`) z ulepszonym stylem terminala.
- **Audit summary:** wzmocniony full audit z pinem postcss dla nanoid CVE.

#### 📚 Dokumentacja

- **DX.md → `docs/guides/`:** przewodnik deweloperski przeniesiony do katalogu `guides/` i uproszczony; scentralizowana dokumentacja DX.
- **Usunięcie balastu historycznego:** usunięcie przestarzałych docs i preferencji z ery early-v5.
- **Linki po restrukturyzacji:** aktualizacja wszystkich odnośników w dokumentacji po reorganizacji folderów.
- **Przewodniki:** INSTALL / DESKTOP / MOBILE ujednolicone (odbiorca, mapa aktualizacji, kontrakty operatora w INSTALL; odchudzone menu desktop i wall-of-text Android).

#### 🖥️ App Shell & UI

- **Client Grid / Partytura:** `prefers-reduced-motion` wyłącza też CSS karuzeli fraz (nie tylko hero); kursor OSMD na ticku idzie tylko do przodu bez pełnego `reset` przy każdym takcie.

### Naprawiono

#### 🔒 Bezpieczeństwo

- **CodeQL:** zamknięcie alertów ReDoS (regexpy) i walidacja `postMessage` origin.

#### 📚 Dokumentacja

- **Desktop (dev):** w przewodniku DESKTOP poprawiona ścieżka skryptu setupu Windows (`scripts/setup/setup.ps1`).

### Usunięto

#### 🖥️ App Shell & UI

- **Admin Utwory:** import biblioteki przyjmuje wyłącznie pakiet v5 (`.stagesync.json` / `{ projects }`) — bez autodetekcji i migracji monolitu 4.x `database.json`.
- **Motyw:** tylko profile `booth` / `daylight` / `midnight` / `matrix` / `neon` — bez aliasów `dark`/`light`/`*-high` i bez migracji starych kluczy `localStorage`.

#### ⚙️ Serwer & API

- **`POST /api/library/import`:** wyłącznie pakiet v5; format 4.x (`songs[]`) jest odrzucany z czytelnym błędem.
- **Transport tick:** klient wymaga pełnej koperty `transport_tick` (bez bare `TransportState`).

## [5.4.11](https://github.com/Negatywistczny/stagesync/compare/v5.4.10...v5.4.11) - 2026-08-10

### Naprawiono

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Android (aktualizacja APK):** po „Pobieranie APK…” znów pojawia się systemowe potwierdzenie instalacji (Console / Performer) — wcześniej sesja `PackageInstaller` kończyła się bez odbiornika statusu.
- **Windows (aktualizacja):** po instalacji z Launchera / Admina uruchamiana jest właściwa aplikacja StageSync — nie lokalny instalator testowy „NSIS Smoke”, który zostawał na starej wersji i ciągle pokazywał dostępność aktualizacji.

## [5.4.10](https://github.com/Negatywistczny/stagesync/compare/v5.4.9...v5.4.10) - 2026-08-09

### Dodano

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Windows:** jeden ekran startowy przy instalacji i przy aktualizacji z Launchera / Admina, potem od razu aplikacja.

### Zmieniono

#### 🖥️ App Shell & UI

- **Powiadomienia:** w Ustawieniach tylko etykieta i przycisk **Włączone** / **Wyłączone** — bez opisu uprawnień i statusu Push.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Desktop (Windows / Linux):** zintegrowany ciemny pasek menu w oknie (`Plik`…`Pomoc`) z przyciskami minimalizacji, maksymalizacji i zamknięcia; bez osobnego natywnego paska tytułu. W wąskim oknie sekcje są pod jednym **Menu**, a ich zawartość otwiera się obok w osobnym panelu. Menubar działa jak w aplikacjach desktop: po otwarciu najechanie przełącza sąsiednie menu, strzałki nawigują po pozycjach / submenu / top-level. Na macOS nadal natywny menubar systemowy. (#836)

### Naprawiono

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Powiadomienia (Windows):** włączenie w Ustawieniach nie kończy się już natychmiastową „odmową” WebView — desktop używa natywnych toastów Tauri (bez fałszywego dialogu przeglądarki).

#### 🖥️ App Shell & UI

- **Klient:** na desktopie Tauri wraca pełny pasek L1 z chipami **Admin / Timeline** (wcześniej cały nagłówek znikał); w przeglądarce po wejściu z Admina/Timeline sesja operatora znów pokazuje te skoki; wysokość paska L1 (Admin / Timeline / Client) wyrównana do wspólnego kontraktu.

## [5.4.9](https://github.com/Negatywistczny/stagesync/compare/v5.4.8...v5.4.9) - 2026-08-09

### Naprawiono

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Android (aktualizacja APK):** pobieranie z GitHub Releases znów działa — allowlista akceptuje redirect CDN (`release-assets.githubusercontent.com`) z ścieżką UUID (nazwa `.apk` w query, nie w path).

## [5.4.8](https://github.com/Negatywistczny/stagesync/compare/v5.4.7...v5.4.8) - 2026-08-08

### Dodano

#### 🔧 Infrastruktura

- **Skrypty instalacyjne:** nowe w pełni interaktywne skrypty [`setup.ps1`](./scripts/setup/setup.ps1) (Windows) oraz [`setup.sh`](./scripts/setup/setup.sh) (Linux/macOS) automatyzujące instalację środowiska dev (Node.js 22, pnpm, Rust, MSVC, WebView2) bez konieczności ręcznego restartu terminala i wpisywania komend. Skrypty te stają się zalecaną ścieżką startową opisaną w docs.

#### 🖥️ App Shell & Desktop

- **Splashscreen:** dodano natywny ekran ładowania podczas startu launchera, który automatycznie chowa się po inicjalizacji, zapobiegając błyskaniu okna.
- **Narzędzia pre-build:** dodano skrypty [`check-rust.mjs`](./apps/desktop/scripts/check-rust.mjs) i [`kill-zombies.mjs`](./apps/desktop/scripts/kill-zombies.mjs), zapewniając odpowiednią wersję środowiska Rust i sprzątając osierocone procesy Tauri przed ponownym buildem (`pnpm dev` / `build`).
- **Dev Preview:** integracja globalnych skrótów klawiszowych (Alt+1/2/3 itd.) z iframe'ami preview za pomocą `postMessage`.

### Zmieniono

#### 📚 Dokumentacja

- **Desktop (dev):** w przewodniku DESKTOP oraz CONTRIBUTING wskazano zautomatyzowane skrypty instalacyjne ([`setup.ps1`](./scripts/setup/setup.ps1) / [`setup.sh`](./scripts/setup/setup.sh)) jako główną (zalecaną) metodę przygotowania toolchainu Tauri, a ręczne komendy `winget` zostały przeniesione do sekcji alternatywnej. Odróżniono też `pnpm dev` (web) od kompilacji shella.

#### 🖥️ App Shell & Desktop

- **Instalator Windows:** zmieniono format budowania na zoptymalizowany instalator NSIS (.exe) działający w trybie szybkiej, cichej dekompresji ("Minimal Extraction Banner") z automatycznym startem aplikacji, co zastępuje dotychczasowy kreator WiX `.msi`.
- **Motyw okna:** wymuszono ciemny motyw systemowy (`theme: "Dark"`) dla głównego okna powłoki Tauri, naprawiając tym samym biały pasek tytułowy na Windowsie.
- **Skróty klawiszowe:** dodano globalne przechwytywanie skrótów `Alt+Left` / `Alt+Right` blokujące nawigację po historii WebView, naprawiając tym samym działanie przesuwania klipów na osi czasu (Timeline) w wersji instalacyjnej (Windows).
- **Dev:** wymuszony bind `host: "127.0.0.1"` w deweloperskim serwerze Vite.

## [5.4.7](https://github.com/Negatywistczny/stagesync/compare/v5.4.6...v5.4.7) - 2026-08-07

### Dodano

#### 🖥️ App Shell & UI

- **Import utworu:** w Adminie (Zarządzaj bazą → Importuj utwór…) oraz w menu Plik Desktop (**Importuj utwór…**) ten sam kreator co w Timeline — wybór źródeł UltraStar / UG / Audio; import biblioteki JSON zostaje osobno („Importuj bibliotekę…” / Z pliku…).

### Zmieniono

#### ⏱️ Timeline & DAW

- **Import:** zamiast trzech osobnych przycisków (US+UG / UG / UltraStar) jeden **Importuj…** z chipami źródeł i pomijaniem etapów (w tym audio przy US+UG).

#### 📚 Dokumentacja

- **Pomoc Timeline:** jedna karta „Import utworu” zamiast osobnych wpisów US+UG / UG / UltraStar.

### Naprawiono

#### ⏱️ Timeline & DAW

- **Import USDB:** w kreatorze z UltraStar (także ścieżka US+UG) przy braku konta lub błędzie sesji otwiera się formularz **Konto USDB**, nie tylko komunikat o konieczności logowania.

## [5.4.6](https://github.com/Negatywistczny/stagesync/compare/v5.4.5...v5.4.6) - 2026-08-07

### Zmieniono

#### 📚 Dokumentacja

- **Podręczniki operatorskie:** INSTALL / DESKTOP / MOBILE / MIGRATION żyją w `docs/guides/`; linki z aplikacji, witryny download oraz komunikatów hosta wskazują nowe ścieżki na GitHub.
- **Mobile:** opis jawnej aktualizacji APK — allowlista hosta/GitHub StageSync oraz weryfikacja package/podpisu przed instalatorem.

### Naprawiono

#### ⚙️ Serwer & API

- **Import USDB:** przy czyszczeniu HTML ze szczegółów utworu zagnieżdżone tagi `<script>` / `<style>` są usuwane w pętli — tekst importu nie zostawia już osadzonego HTML ze „włożonych” tagów.

### Bezpieczeństwo

- **Android (Console / Performer):** aktualizacja APK tylko z allowlisty URL (host `/downloads/stagesync-*.apk` lub GitHub Releases StageSync) oraz weryfikacja package name i certyfikatu podpisu przed otwarciem instalatora.
- **Ustawienia hosta:** zapis zarządzanego pliku ustawień (`.env`) z uprawnieniami tylko dla właściciela (mode `0600`).

## [5.4.5](https://github.com/Negatywistczny/stagesync/compare/v5.4.4...v5.4.5) - 2026-08-05

### Dodano

#### 🖥️ App Shell & UI

- **Admin — Dev:** w buildach deweloperskich pojawiła się sekcja `Dev` w Adminie (`/admin?section=dev`) z kafelkami na Smart Tempo, Dev Preview multi-surface, Layout Matrix i planowane narzędzia diagnostyczne.
- **Smart Tempo — benchmark history:** panel `/smart-tempo` korzysta z historii regresji benchmarków, a recorder dopisuje kolejne snapshoty do JSON historycznego.

### Zmieniono

#### 🖥️ App Shell & UI

- **Chrome Admin / Timeline / Klient:** na desktopie z menu OS znikają tylko przyciski chrome; wordmark i nawigacja shelli zostają widoczne, a Admin pokazuje tylko aktywne sekcje (`Dev` wyłącznie w DEV buildach).

### Naprawiono

#### ⏱️ Timeline & DAW

- **Smart Tempo:** diagnostyka analizy jest teraz liczona i logowana bez warunków wokół debug flag, a analiza korzysta z ujednoliconej siatki BPM i historii benchmarków dla regresji.

## [5.4.4](https://github.com/Negatywistczny/stagesync/compare/v5.4.3...v5.4.4) - 2026-08-05

### Dodano

#### 🖥️ App Shell & UI

- **Admin — Smart Tempo:** na `/smart-tempo` wykres przebiegu tempa w czasie (kontur + zbieżność) — porównanie ścieżki referencyjnej z estymacją Smart Tempo.

### Naprawiono

#### ⏱️ Timeline & DAW

- **Smart Tempo:** kotwiczenie pierwszego downbeatu na transientach kick / sub-bass; siatka beatów premiuje kolce energii (dual-band); lokalny okres śledzenia mniej sztywny względem seeda — mapa tempa lepiej trzyma się żywego groove'u przy Import US+UG.
- **Import YouTube (US+UG):** gdy konwersja MP3 albo systemowy yt-dlp zawodzi, host próbuje strumień audio, binarkę wbudowaną i świeżą z GitHub — czytelniejsze komunikaty błędów.

## [5.4.3](https://github.com/Negatywistczny/stagesync/compare/v5.4.2...v5.4.3) - 2026-08-05

### Dodano

#### 🖥️ App Shell & UI

- **Admin — Smart Tempo:** strona `/smart-tempo` z pulpitem dokładności analizy (benchmark) — otwierana z Systemu; wykresy porównawcze bez zbędnych linii łączących ścieżki.

### Naprawiono

#### ⏱️ Timeline & DAW

- **Smart Tempo:** siatka beatów silniej premiuje downbeaty i fazę względem onsetów — mapa tempa lepiej trzyma się nagrania; Import US+UG przy układzie Beat 1 / siatki bierze BPM z analizy audio, gdy jest dostępny (zamiast samego metronomu pliku).

## [5.4.2](https://github.com/Negatywistczny/stagesync/compare/v5.4.1...v5.4.2) - 2026-08-04 — Smart Tempo

### Dodano

#### ⏱️ Timeline & DAW

- **Smart Tempo (Import US+UG):** kreator Desktop Studio (dwukolumnowe kroki USDB/UG z listą kart wyników, osobne karty plik/YouTube, panoramiczny Beat Mapper z kafelkami sekcji), podkład audio (DnD / upload MP3, YouTube przez yt-dlp — także przy nowym utworze; **płynny pasek postępu** od pobierania YouTube przez dekodowanie aż do analizy tempa; kotwica Beat 1 z długiego pipe Intro + `#GAP` tak, by przedtakt wokalu lądował w ostatnim takcie Intro, a Verse na barlinie Formy — transient tylko gdy blisko tej kotwicy; po analizie onsetów Beat 1 dociąga do najbliższego ataku w ±¼ beatu, także „do przodu", gdy offset siedział za atakiem; po wczytaniu UG ponownie liczy kotwicę pipe+GAP, gdy audio weszło wcześniej i złapało pierwszy transient), analiza audio offline (strumień energii / transienty → autocorrelacja BPM z interpolacją lagów → siatka beatów **z lokalnym okresem z onsetów** i silniejszą inercją mediany IBI — gęste fill'e / ósemki nie wciągają mapy w double-time ani nie przyspieszają Adapt o kilka BPM w jednym takcie) → **seed mapy = mediana IBI** siatki (z odrzuceniem outlierów half/double-time), nie sam peak ACF; mapa tempa o gęstości zbliżonej do Logic Smart Tempo, średnio co 1–2 takty, bez skoków z pojedynczych blipów IBI; benchmark 3-tier ms dokładności analizy + pasek postępu pipeline w formularzu importu; sortowanie wyników UG wg zgodności z tekstem US; 3-kolumnowy import audio z DnD klipów.
- **Import US+UG:** etykieta „eksperymentalny" usunięta — Smart Tempo z audio jest stable (mapa tempa z onsetów, a nie z sylab UltraStar).

#### 🖥️ App Shell & UI

- **Pamięć (web):** przy wysokim zużyciu RAM przeglądarki pojawia się ostrzeżenie u góry (z możliwością ukrycia); w konsoli (F12) logi `[stagesync-mem]` z rozbiciem przyczyny — sterta JS, cache PCM odtwarzania, bufor importu US+UG, scratch analizy tempa.

### Zmieniono

#### 🎛️ Audio / MIDI / Transport

- **Metronom:** domyślna głośność klika jest wyraźnie wyższa — przy faderze Click na 0 dB akcent i pozostałe beaty są dobrze słyszalne obok podkładu (Ustawienia → Metronom nadal balansują akcent vs reszta); przy Smart Tempo kliki liczą lead time po mapie tempa/metrum (AlongMap), a nie po płaskim BPM sesji — metronom nie „znika" ani nie rozjeżdża się względem playheada; metronom gra nieprzerwanie przy przełączaniu zakładek przeglądarki (AudioContext utrzymywany przez Web Locks API).

### Naprawiono

#### ⏱️ Timeline & DAW

- **Smart Tempo (Import US+UG):** analiza onsetów obejmuje **cały** plik audio (do 8 min), nie tylko pierwsze ~90 s z doklejaną stałą siatką — mapa tempa nie zostaje już przy 2–3 węzłach na 5‑minutowy utwór; siatka beatów trzyma lokalny okres z onsetów (bez kumulacyjnego przyspieszania playheada/metronomu względem audio) i nie przyspiesza nagle przy gęstym klastrze onsetów (np. ok. taktu 5) — inercja mediany IBI + odrzucenie przejść double-time; gdy ACF ma kilka **porównywalnych** szczytów w tej samej oktawie, wybór bliższy soft seedowi (nie surowemu maxowi) — słaby „duch" ACF koło seeda (~112 przy silnym ~128) ani half-time z histogramu (~64) nie wymyśla już kompromisowego periodHint; ACF BPM liczy się na gęstszym hopie (limit rozdzielczości lagu, żeby mid-tempo nie wpadało między lagami); kotwica `periodHint` w trackerze jest na tyle stabilna, by ~120–128 nie zapadało do ~91 na regularnych ćwiartkach; seed BPM bierze medianę IBI siatki zamiast zawyżonego peaku ACF — mapa nie jest już „dociągana" w górę do szybszego seeda; węzły mapy nie wstawiają już skoku z pojedynczego blipu IBI przy wymuszonym odświeżeniu co 1–2 takty; Beat 1 dociąga do onsetu ataku w obie strony (MP3 na barlinie); po dojściu pipe Intro kotwica pipe+GAP zastępuje przypadkowy pierwszy transient; siatka po dodaniu podkładu obejmuje cały utwór; gdy estymacja z audio jest słaba, odstępy beatów startują od metronomu pliku UltraStar (mapa tempa nadal z audio/onsetów); silny peak z audio nie jest już nadpisywany odległym metronomem UltraStar (header/4); mapa nie skacze co beat między ścianami ±8% seeda; długie intro nie ląduje na stałym 120 BPM z pustą siatką; Beat Mapper: żółty znacznik kursora nie zostaje po odsłuchu/zoomie, niebieski Beat 1 = początek osi taktów (**Ustaw Beat 1 w miejscu kursora** przycina ciszę przed kotwicą i kotwiczy mapę); przy długim intro pipe + `#GAP` Beat 1 ustawia się redakcyjnie tak, by przedtakt wokalu wpadł w ostatni takt Intro, a Verse Formy zaczął się od kolejnego taktowego; gdy nagranie jest ciche do wokalu, kotwica zostaje przy `#GAP`; po wczytaniu audio mostek dogrywa drobną korektę Beat 1 względem pierwszej sylaby powiązanej z akordem sekcji (bez snapa wszystkich sylab do siatki) — **ręczny Audio Start Offset zostaje** (auto-korekta tylko przy pierwszym wczytaniu); sekcje wokalne Formy biorą długość ze ścian UltraStar (pipe dla instrumentali; akordy tylko wypełniają kontener) — bez ucięcia ostatniego taktu; Zapis po imporcie z podkładem w istniejącym utworze nie kończy się konfliktem wersji; anakrusa wokalu wchodzi w ostatni takt Intro (bez pustego taktu pośredniego); tekst, akordy i Forma na jednej osi (interwały BPM z audio); mapa tempa z audio nie jest nadpisywana auto-zaznaczonymi węzłami sekcji — tylko ręczna edycja w Beat Mapperze; brak końcówki tempa ~20 BPM i klip audio liczy długość po mapie tempa od tick 0 (po trimie Beat 1); gęsta mapa tempa z Beat Mappera (setki zdarzeń na dłuższych utworach) zapisuje się poprawnie zamiast zostawiać pusty szablon Countdown+Intro; przy nowym utworze z podkładem klip audio jest utrwalany po uploadzie (nie tylko w pamięci); tempoMap audio chroniony przed nadpisaniem przez `#BPM` z nagłówka UltraStar; `runAudioDrivenSmartTempo` poprawnie importowany w formularzu US+UG; tempoMap dołączany do `smartTempoAudio` w kreatorze; auto-persist przy re-imporcie US+UG (mapa tempa zapisywana na dysku); duplikaty ścieżek audio usunięte — filtrowanie plików AppleDouble (macOS `._*`); faza barlinii (`firstBeatIdx`) wyrównana — eliminacja przesunięcia 3/4 taktu; węzeł kolca ~127 BPM przy długim pre-rollu w trybie GAP offset usunięty; SmartTempo z audio ma priorytet nad seedBpm z nagłówka tekstu (bridge).

#### 🎛️ Audio / MIDI / Transport

- **Playback / pamięć:** cache zdekodowanego audio ma limit bajtowy (~384 MB) i max 8 plików zamiast 32 pełnych PCM naraz — Timeline nie powinien już zjadać wielu GB RAM przy setliście / waveformach; generowanie peaków waveformu nie pinuje już wszystkich utworów w cache playbacku; wycieki pamięci rozwiązane (dev Service Worker wyrejestrowany, bypass cache audio).
- **Metronom:** przy zawieszonym AudioContext kursor beatów dogania playhead bez schedulowania (po unlock nie ma burstu spóźnionych klików ani „martwego" metronomu); mocno spóźnione catch-up nie składają się w jeden głośny strzał — kursor dogania w ciszy, a kolejny klik idzie look-ahead; przy ręcznym seeku / zmianie pozycji playheada poprzedni klik metronomu jest jawnie anulowany — brak podwójnego kliknięcia (AudioBufferSourceNode.stop()).
- **Loop / playback:** klip audio ustawiony na granicy pętli (np. takt 2.1 przy cyklu taktu 1) nie słychać już na końcu cyklu — soft-clock nie przekracza końca pętli między tickami serwera, kompensacja latency jest zawijana w zakres pętli, a przejście wrap wyłącza aktywne głosy.

#### 🖥️ App Shell & UI

- **Klient (Karaoke):** podświetlenie sylab trzyma się do następnej sylaby (albo końca linii) — krótkie nuty UltraStar nie gasną już w jednej klatce.
- **Import — ładowanie:** stan ładowania pojawia się natychmiast po kliknięciu przycisku Import (yield wątku UI przed ciężkimi zadaniami DSP).

#### 📚 Dokumentacja

- **Pomoc Timeline:** Import US+UG — tekst/melodia dokładnie po czasie UltraStar względem MP3 (bez snapa sylab do siatki); Forma/akordy z powiązań z tekstem (UG↔US); Smart Tempo — mapa tempa z pliku audio, playback i metronom podążają za nagraniem.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Desktop / Ustawienia hosta:** zapis konta USDB i pozostałych ustawień serwera trafia do `{folder danych}/host/.env` (np. `Documents\\StageSync\\host\\.env`), a nie do katalogu instalacji w Program Files — bez błędu EPERM przy imporcie UltraStar na Windows.

#### 🔧 Infrastruktura

- **Server:** zmienne `STAGESYNC_USDB_*` zadeklarowane w `turbo globalEnv`; przy retry sesji USDB błąd zachowuje `cause` — pełny stack w logach.
- **Shared:** diakrytyki UltraStar normalizowane przez jawny zakres combining marks (`[\u0300-\u036f]`) zamiast `\p{M}` — kompatybilność z silnikami bez ICU (nodejs-mobile); czyszczenie ostrzeżeń ESLint blokujących CI lint.

## [5.4.1](https://github.com/Negatywistczny/stagesync/compare/v5.4.0...v5.4.1) - 2026-08-03

### Dodano

#### ⏱️ Timeline & DAW

- **Import UltraStar:** wyszukiwanie na USDB (tytuł / artysta) oraz pobranie pliku z linku — jak przy Ultimate Guitar; konto USDB ustawia się w dialogu importu (**Konto USDB**) albo w Ustawieniach serwera (zapis na hoście); przy wygaśnięciu sesji host sam loguje się ponownie zapisanymi danymi i ponawia żądanie (komunikat o sesji tylko gdy ponowne logowanie też się nie uda); **Testuj połączenie** i logowanie nie odrzucają poprawnego konta przez mylący HTML odpowiedzi USDB (po sukcesie strona nadal pokazuje „Please login” — host weryfikuje sesję na stronie przeglądania); przy złym haśle, braku sieci albo limicie prób komunikat po polsku wskazuje Konto USDB; wklejenie i plik `.txt` są od razu widoczne w dialogu; parser zachowuje spacje końcowe / początkowe sylab (granice słów USDX — bez sklejania „Aboutthin”), zapisuje spacje na końcach słów w blokach sylab (Client nie skleja „Ihearthedrums”), usuwa melisma `~` z tekstu i liczy `#GAP`/`#BPM`→ticki przez mapę tempa; lyrics trafiają na ścieżkę Tekst (nie na Formę); lista wyników USDB czyta wiersze `data-songid` (nie myli tytułu z tekstem „There are N results…”); z **Wybierz utwór** powstaje nowy utwór w bibliotece, z Metadanych (ⓘ) — nadpisanie bieżącego draftu (Zapisz ⌘S).
- **Import US+UG (eksperymentalny):** mostek buduje Formę na czystej siatce taktów i przybliżoną mapę tempa ze ścian sekcji (timing UltraStar jest orientacyjny — sync z MP3 bywa niedokładny; w UI status eksperymentalny do Smart Tempo w 5.4.2); `sourceSection` z dopasowania UG↔US; akordy na strukturalnych Beat 1/3; pipe = 1 takt/komórka; słabe dopasowanie wymaga potwierdzenia; osobne Import UG / UltraStar oraz Różdżka zostają; z **Wybierz utwór** powstaje nowy utwór, z Metadanych (ⓘ) — nadpisanie draftu.

#### 🎛️ Audio / MIDI / Transport

- **Transport / mapa tempa:** playhead i seek idą po mapie tempa (i metrum) projektu — zmiana BPM w trakcie utworu nie rozjeżdża pozycji względem audio; soft-clock między tickami serwera korzysta z tej samej matematyki (AlongMap), a kompensacja latency / sync-lead też liczy offset po mapie zamiast płaskiego BPM.

### Zmieniono

#### ⏱️ Timeline & DAW

- **Import UG:** w **Wybierz utwór** import tworzy nowy utwór w bibliotece (nie nadpisuje otwartego); nadpisanie bieżącego draftu zostaje w Metadanych utworu (ⓘ).

### Naprawiono

#### ⏱️ Timeline & DAW

- **Transport Stop:** po Stop canvas przewija się na początek (Countdown / start utworu), razem z locatorem — nie zostaje w miejscu playheada.
- **Edycja clipów (wąskie okno):** na komputerze z myszką zwężenie okna nie włącza już trybu tabletu — zostaje przeciąganie i resize myszką; przyciski ◀▶ / rozciągania tylko przy wskaźniku dotykowym.
- **Import UltraStar:** po imporcie metronom i mapa tempa (event @ 0) dostają BPM z pliku — sylaby nie lądują „obok” audio przez stare 120 BPM; melisma `~` nie dokleja się do słów (np. „Conversation” zamiast „Convers~~tion”); import jest w draftcie — komunikat przypomina o **Zapisz**; kolejne wersy / frazy nie rozjeżdżają się w czasie względem audio (pierwszy wers był OK, dalsze miały za duże odstępy).
- **Forma:** klik w sekcję zaznacza tylko ten clip (nie całą kaskadę przesuwanych sekcji).
- **Chrome / pasek narzędzi:** obwódka przycisków ikon (narzędzia, transport, setlista, nagłówek) jest zawsze widoczna — także górna krawędź (kontenery ze scrollem poziomym mają wstawkę, żeby ramka nie ginęła na krawędzi przycięcia); na hover tylko wzmacnia kolor.
- **Fader ścieżki:** skala w docku i Inspektorze jak na Mixerze — skrajny dół to pełne wyciszenie (−∞ / −60 dB), ta sama krzywa co strip miksera.
- **Mixer — mierniki poziomu:** płynniejsze wskazanie (szybki atak, wolniejszy spadek) zamiast skoków co klatkę; skala LED zielona → żółta → czerwona (−12 / 0 dB) zamiast samego zielonego.
- **Mixer — busy:** dodanie pustych busów (bez routingu ścieżek na nie) nie podbija już głośności ścieżek audio — wcześniej każdy „+ Dodaj Bus” przebudowywał głosy clipów i mógł zostawiać stare połączenia w grafie WebAudio, przez co poziom rósł na stałe.
- **Audio / Timeline:** klipy audio wypełniają wysokość toru (jak Forma), zamiast niskiego paska pod etykietą.
- **Ścieżki audio:** usunięcie toru i **Zapisz** naprawdę zapisuje usunięcie — ścieżka (i jej clipy) nie wracają już po odświeżeniu.

#### 🎛️ Audio / MIDI / Transport

- **Playback / MP3:** odtwarzanie backingów bliżej jakości systemowego odtwarzacza macOS — kontekst audio w trybie muzycznym (większe bufory zamiast ścieżki „interactive”), stereo Master na domyślnej ścieżce speakers (discrete multi-out tylko gdy są HW Outy albo niezerowy remap Mastera), bez wymuszania niskiego sample rate; po seeku / scrubie playheada w trakcie Play / Pause / zmianie grafu poprzedni głos jest zatrzymywany, a stary BufferSource nie wyłącza już nowego głosu tego samego klipu (wcześniej pętla restartów nakładała ścieżki na siebie i brzmiała jak zniekształcone częstotliwości / „aliasing”); usunięcie klipu audio w trakcie odtwarzania nie zostawia już uciętych resztek dźwięku — fade i poziom są wyciszane przed stop, a opóźnione ładowanie pliku nie odpala głosu skasowanego klipu.

#### 🖥️ App Shell & UI

- **Klient (Karaoke / tekst):** słowa nie sklejają się między sylabami — spacje z linii są zachowane przy podświetlaniu bloków (np. „I hear the drums”, nie „Ihearthedrums”).
- **Klient (Akordy):** kafelki cyklu biorą akord z bieżącego clipu na playheadzie (także półtaktowe / kotwiczone przy słowach po imporcie US+UG), a szerokość kafelka jest proporcjonalna do czasu trwania — nie tylko do początku taktu.

## [5.4.0](https://github.com/Negatywistczny/stagesync/compare/v5.3.8...v5.4.0) - 2026-08-02 — Syllables

### Dodano

#### ⏱️ Timeline & DAW

- **Import UltraStar:** wklejenie lub plik `.txt` (USDX) buduje timed sylaby i ścieżkę melodii; w Karaoke podświetlenie idzie po blokach w sync z transportem.

#### ⚙️ Serwer & API

- **Projekt:** fundament timed lyrics — bloki tekstu na liniach (pozycje w tickach), opcjonalne role wokalu i ścieżka melodii; starsze projekty przechodzą automatycznie przy odczycie i zapisie — treść, akordy i audio zostają.

#### 🖥️ App Shell & UI

- **Klient (Karaoke):** gdy linia ma kilka bloków czasowych, podświetlenie podąża za aktywnym fragmentem w sync z transportem; jedna cała linia jako jeden blok wygląda jak dotychczas.

## [5.3.8](https://github.com/Negatywistczny/stagesync/compare/v5.3.7...v5.3.8) - 2026-08-02

### Dodano

#### ⏱️ Timeline & DAW

- **Ustawienia:** preferencje podzielone na zakładki **Audio** (urządzenia, kompensacja opóźnień), **Ogólne** (wygląd, zegar, nazwa), **Metronom**, **MIDI** oraz **Serwer**.

#### 🖥️ App Shell & UI

- **Telefon (landscape):** lepsze dopasowanie nagłówków, nawigacji operatora i widoku Klienta w poziomie.
- **Admin:** osobne okna importu MusicXML i seryjnej edycji MIDI Program Change (Batch PC); odświeżony widok biblioteki utworów.

#### ⚙️ Serwer & API

- **CORS:** obsługa CORS dla klientów mobilnych — stabilniejsze połączenia z hostem spoza originu.

### Zmieniono

#### ⏱️ Timeline & DAW

- **Mixer:** w nagłówkach stref Audio / Busy / HW Out przycisk to **+ Dodaj** (bez obcinania dłuższych etykiet); pusta strefa HW Out bez komunikatu diagnostycznego.
- **Mixer — HW Out:** usunięto przycisk × przy Mute (ryzyko live); usuwanie przez PPM albo Delete/Backspace na zaznaczonym pasku; **+ Dodaj** wyłącza się po wyczerpaniu kanałów urządzenia (Master zajmuje wyjścia 1–2); stereo ma podwójny miernik L/R i przełącznik M/ST.
- **Mixer — Master:** przy multi-out można przemapować Stereo Out na inną parę fizyczną (domyślnie CH 1–2); zmiana zablokowana w trakcie Play.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Wydania:** poprawiony format linków do instalatorów MSI w notatkach release.

### Naprawiono

#### 🖥️ App Shell & UI

- **Admin (desktop):** zakładki **Utwory / Set / Scena / Host** znowu wyglądają jak przyciski UI (akcent przy aktywnej sekcji) — nie jak szare przyciski systemowe.
- **Desktop (Tauri):** wykrywanie powłoki OS menu nie psuje się w trybie deweloperskim — przycisk pełnego ekranu zostaje ukryty także przy `tauri dev`.

## [5.3.7](https://github.com/Negatywistczny/stagesync/compare/v5.3.6...v5.3.7) - 2026-07-31

### Dodano

#### 🖥️ App Shell & UI

- **Powiadomienia:** w Ustawieniach (Klient i Admin → Ogólne) można włączyć powiadomienia systemowe; przy utracie połączenia z hostem i pracy aplikacji w tle pojawia się lokalny alert. Token urządzenia rejestruje się u hosta, a zdalny Push (FCM / WebPush) działa po skonfigurowaniu opcjonalnych kluczy bez publikowania sekretów w APK.

### Naprawiono

#### 🖥️ App Shell & UI

- **Stabilizacja cutu:** uporządkowano i zweryfikowano główne ścieżki UI i transportu dla bieżącego cutu, dzięki czemu patch był gotowy do release’a bez wchodzenia w nowy zakres funkcjonalny.
- **Testy i build:** potwierdzono poprawność testów server/web oraz buildów po przygotowaniu środowiska Node 20.

#### 📦 Packaging & Desktop

- **Wersja i metadane:** zaktualizowano numer wersji aplikacji i odświeżono metadane release dla kolejnego minora.

## [5.3.6](https://github.com/Negatywistczny/stagesync/compare/v5.3.5...v5.3.6) - 2026-07-29

### Dodano

#### 🖥️ App Shell & UI

- **Motyw:** obok nazwy każdej skóry w Wyglądzie widać dwa kolorowe punkty (tło + akcent) — łatwiej rozpoznać Booth Amber, Daylight, Midnight Cyan, Matrix Green i Neon Ember.

### Zmieniono

#### 🖥️ App Shell & UI

- **Motyw:** pierwszy punkt przy nazwie skóry pokazuje kolor podniesionej powierzchni (karty, ustawienia), nie tła aplikacji — z obramowaniem w kolorze motywu, żeby był czytelny także na jasnych skórach (np. Daylight).
- **Timeline:** usunięto osobny przycisk Wygląd — motyw i skóry są w Preferencjach (⚙️), jak w Adminie i Kliencie.
- **Pełny ekran:** przycisk tylko w przeglądarce LAN (Admin / Timeline / Klient); ukryty w Tauri oraz w natywnych powłokach Console / Performer.
- **Tablet (641–1024px):** nawigacja jak na desktopie — zakładki sekcji Admin, chipy **Timeline / Klient** i nagłówek Client bez trybu telefonu; **OperatorNav** tylko na wąskim telefonie (≤640px).
- **Ustawienia (desktop):** szersze okno preferencji z pionową nawigacją po lewej i treścią po prawej (od 769px); ten sam rozmiar okna przy każdej zakładce — krótsze treści nie zwężają panelu, dłuższe przewijają się wewnątrz; na telefonie zakładki zostają w jednym przewijanym rzędzie u góry.

#### ⏱️ Timeline & DAW

- **Timeline:** przełącznik wskaźnika MIDI playhead przeniesiony z Wyglądu na pasek transportu (obok „Podążaj za wskaźnikiem”).

### Naprawiono

#### ⏱️ Timeline & DAW

- **Timeline (telefon):** nagłówek i pasek transportu mieszczą się w dwóch wierszach — bez osobnego paska Level 1 pod **OperatorNav** i bez zawijania setlisty pod transport.
- **Tap:** przycisk przy warstwie Tekst włącza tylko tryb znaczników wokalu (Spacja = start linii przy playheadzie) — bez zmiany tempa utworu.
- **Timeline (telefon / tablet):** na telefonie (≤640px) znikają narzędzia edycji (wskaźnik, ołówek, gumka itd.) — zostaje transport i setlista; na tablecie (641–1024px) pasek narzędzi wraca na lewą kolumnę siatki z wyśrodkowanym transportem jak na desktopie (v4).
- **Timeline (tablet):** przyciski przesuwania i rozciągania klipu po obu stronach zaznaczenia (lewo / prawo), z nieco mniejszymi przyciskami rozciągania — jak w v4, nie jako jeden pasek pod klipem.

#### 🖥️ App Shell & UI

- **Klient:** wskaźnik metronomu w nagłówku jest po lewej (obok logo), a nie przy prawej krawędzi obok ustawień.
- **Ustawienia (web):** przycisk ⚙️ w Timeline / Admin / OperatorNav znowu otwiera preferencje — w przeglądarce na `:4000` nagłówek nie chowa się jak w Tauri; na Kliencie z sesją operatora panel globalnych ustawień nie jest przycinany przez overflow nagłówka.
- **Client:** przycisk ⚙️ (oraz OperatorNav / skrót preferencji na `/client`) znowu otwiera ustawienia Klienta (wygląd, strój instrumentu, polskie nazwy sekcji) zamiast preferencji Admina (serwer, MIDI, host).
- **Klient (web, sesja operatora):** nagłówek z OperatorNav i przyciskami w chrome nie jest już pionowo przycinany — widoczne są dolne krawędzie przycisków.
- **Client (tablet):** kafelki wyboru roli są kwadratowe jak na desktopie — siatka 2×2 w kompaktowym rozmiarze (bez rozciągania na szerokość ani wysokość ekranu).
- **Klient (web, sesja operatora):** po wejściu z Admina/Timeline na **Klienta** wraca nawigacja operatora — na telefonie pasek **Admin · Timeline · Klient**, na tablecie/desktopie chipy **Admin / Timeline**; bez sesji zostaje widok muzyka.
- **Admin (tablet):** nagłówek znowu w jednym wierszu (sekcje, **Timeline / Klient**, ustawienia) — bez zawijania na drugi rząd.
- **Admin (tablet):** sekcje **Set**, **Scena** i **Host** znów w układu desktopowym (podział panelów, bez accordionu telefonu) na tablecie i desktopie (>640px); accordion tylko na telefonie (≤640px).
- **Admin (tablet, portret):** zakładki sekcji nie nachodzą już na **Timeline / Klient** — przy wąskim pasku przewijają się w poziomie, a logo zostaje samą ikoną.
- **Ustawienia (telefon):** zakładki **Ogólne / Serwer** w jednym rzędzie z przewijaniem w poziomie; pionowy pasek przewijania nie zasłania pól formularza.
- **Klient (telefon):** przycisk **Ustawienia** w nagłówku ma ten sam odstęp od krawędzi co Admin i Timeline.
- **Chrome Admin / Timeline / Klient:** przyciski **Ustawienia** i **Pełny ekran** mają teraz ten sam rozmiar na telefonie, tablecie i desktopie; różni się tylko układ paska.
- **Nawigacja (telefon):** chipy **Admin · Timeline · Klient**, lista sekcji i skróty aplikacji w nagłówku mają tę samą wysokość co **Ustawienia** i **Pełny ekran** — bez mieszanych 44px i 36px w jednym rzędzie.
- **Timeline (web >640px):** chipy **Admin / Klient** zamiast wbudowanego paska operatora na tablecie i desktopie w przeglądarce.
- **Admin (telefon):** kafelki **StageSync Performer** i **Console** w sekcji Host są obok siebie w jednym rzędzie — zamiast jeden pod drugim.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Desktop (wąskie okno ≤640px):** Tauri używa tego samego chrome telefonu co Web LAN i Console (Android) — **OperatorNav**, układ jednej kolumny w Adminie i tryb odtwarzania Timeline; bez osobnego wariantu nagłówka. Menu OS i ukryty przycisk pełnego ekranu bez zmian.

## [5.3.5](https://github.com/Negatywistczny/stagesync/compare/v5.3.4...v5.3.5) - 2026-07-27

### Naprawiono

#### 🖥️ App Shell & UI

- **Admin (desktop / Tauri):** przywrócone zakładki **Utwory · Set · Scena · Host**, skróty **Timeline · Klient** oraz **Ustawienia** i akcje hosta w górnym pasku — zamiast paska nawigacji operatora na szerokim ekranie.
- **Klient:** usunięty dodatkowy wiersz z przełącznikiem **Admin · Timeline**; nagłówek znów to jeden pasek z logo, tytułem, statusem i **Ustawieniami** po prawej.
- **Nawigacja operatora (telefon):** stały układ trzech slotów — przełącznik **Admin · Timeline · Klient** zawsze po lewej, kontekst (sekcja Admin lub tytuł utworu) na środku, **Ustawienia** po prawej; przyciski nie przeskakują między ekranami.
- **Timeline (telefon):** pasek nawigacji operatora wraca na Timeline — można przejść do Admina lub Klienta bez utknięcia w edytorze.
- **Admin (telefon):** nagłówek mieści się w jednym wierszu bez poziomego ani pionowego przewijania; lista sekcji ma tę samą wysokość co przycisk **Ustawienia**.
- **Chrome Admin / Timeline / Klient:** wszystkie widoczne przyciski **⚙️ Ustawienia** otwierają te same Preferencje (także w dev preview); na tablecie nagłówki zostają w jednym rzędzie, a większe 44px cele dotyku są tylko dla telefonu (≤640px), bez mieszania z zakresem tabletu.

## [5.3.4](https://github.com/Negatywistczny/stagesync/compare/v5.3.3...v5.3.4) - 2026-07-27

### Naprawiono

#### 🖥️ App Shell & UI

- **Wejście:** adres `/` przekierowuje na **Klienta** zamiast Admina.
- **Nawigacja operatora (telefon):** jeden wiersz — wybór sekcji Admin, przełącznik **Admin · Timeline · Klient** i **Ustawienia** bez drugiego rzędu chipów; wysokość paska do 44px.
- **Klient (sesja operatora):** pasek nawigacji nie nachodzi na logo StageSync; na zwykłym widoku muzyka pasek pozostaje ukryty.
- **Nawigacja operatora:** spójne style przycisków segmentów w Admin, Timeline i Klient.

## [5.3.3](https://github.com/Negatywistczny/stagesync/compare/v5.3.2...v5.3.3) - 2026-07-27

### Dodano

#### 🖥️ App Shell & UI

- **Nawigacja operatora (web / Console):** wspólny pasek **Admin · Timeline · Klient** z sekcjami Admina i skrótami `Ctrl/⌘+1…3` oraz `Alt+1…4` (jak menu Widok na desktopie); na tablecie i w przeglądarce LAN zamiast rozproszonych chipów.

### Zmieniono

#### 🖥️ App Shell & UI

- **Desktop / Pomoc:** menu systemowe **Odtwarzanie** zamiast angielskiego „Transport”; ta sama nazwa w Pomocy Timeline i na pasku sterowania L2.

## [5.3.2](https://github.com/Negatywistczny/stagesync/compare/v5.3.1...v5.3.2) - 2026-07-27

### Naprawiono

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Console (Android) — lokalny host:** uruchomienie wbudowanego serwera na tablecie nie pada już przy starcie silnika Node (walidacja nazwy hosta w sieci na środowiskach bez pełnego wsparcia RegExp Unicode).
- **Console (Android) — log diagnostyczny:** udostępniony plik ma nazwę `stagesync-host-<data>.txt` (UTC), zamiast generycznego tytułu share.

#### 📚 Dokumentacja

- **Mobile:** wersja Console local host oraz nazwa eksportu logu lokalnego hosta.

## [5.3.1](https://github.com/Negatywistczny/stagesync/compare/v5.3.0...v5.3.1) - 2026-07-27

### Zmieniono

#### 🖥️ App Shell & UI

- **Client — wąski telefon:** kafel roli od razu wchodzi w widok (bez **Rozpocznij**); siatka 2×2 wypełnia ekran pod nagłówkiem.
- **Client / Admin — ≤640px:** jednowierszowy pasek Client (ikona + tytuł + status + ustawienia); Admin — lista sekcji zamiast zakładek, chipy Timeline/Klient, tylko **Ustawienia** w akcjach; mniejsze paddingi workspace.
- **Admin — Połączenie & Sieć:** adresy hosta kopiujesz kliknięciem w sam adres (bez osobnych przycisków **Kopiuj**), a kafelki APK pokazują tylko akcję **Pobierz APK** z kodem QR i krótką instrukcją skanowania w tej samej sieci LAN.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Launcher (Desktop / Android):** lista hostów pokazuje **nazwę hosta w sieci** (z mDNS / ustawień serwera) zamiast wersji produktu; druga linia: adres IP · `v5.3.0` · projekt. W Admin → Ustawienia serwera: **Nazwa hosta w sieci** (osobno od nazwy urządzenia na Scenie).
- **Console / Performer (Android):** dialog odświeżenia interfejsu z hosta rozróżnia hosta nowszego, starszego i nieustalonego kierunku — osobny opis i CTA (np. **Dopasuj do hosta** przy starszym hoście), bez hashy i bez żargonu APK.
- **Console / Performer (Android):** przy sekcji wyszukanych serwerów widoczny przycisk **Odśwież** (jak w launcherze Desktop), zamiast ukrytego odświeżania po kliknięciu w status.
- **Desktop — zasobnik:** menu podzielone na status, sieć (kopiuj / otwórz w przeglądarce) i sterowanie hostem (w tym restart); tooltip z adresem; ikona ze statyczną kropką stanu; błąd otwiera Launcher.

### Naprawiono

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Desktop — restart / shutdown hosta:** po restarcie z Admina lub menu OS zostajesz w sesji Admin zamiast na ekranie Launchera; wyłączenie serwera nie pokazuje już fałszywego błędu przy powrocie; zasobnik wykrywa host po restarcie poza sidecarem, a **Zatrzymaj Host** gasi osierocony proces na porcie 4000.
- **Launcher — aktualizacja:** podczas pobierania instalatora **Pomiń tę wersję** jest nieaktywny (bez efektu najechania).

## [5.3.0](https://github.com/Negatywistczny/stagesync/compare/v5.2.11...v5.3.0) - 2026-07-27 — Colors & Channels

### Dodano

#### ⏱️ Timeline & DAW

- **Mixer — multi-out:** przy urządzeniu z ≥ 4 kanałami możesz dodać patchy HW Out, skierować ścieżkę / bus / próbkę Cue na fizyczne wyjścia i sterować faderem/mute z miernikami — Master zostaje na kanałach 1–2; przy stereo strefa HW Out jest ukryta (bez komunikatu Quad/5.1); Busy i HW Out rozdzielone tą samą kreską stref co Audio|Busy.
- **Mixer — widoczność stref:** oczko przy nagłówku Audio / Busy / HW Out / Master chowa lub pokazuje faderzy całej strefy (zostaje zwarty nagłówek); wybór zapamiętany w przeglądarce.
- **Motyw:** w Wyglądzie wybierasz jedną z pięciu skór (Booth Amber, Daylight, Midnight Cyan, Matrix Green, Neon Ember) zamiast osobnych przełączników jasny/kontrast; zapis w Preferencjach zamyka okno i nie cofa skóry przy Anuluj (wyjście audio wywoływane tylko gdy faktycznie się zmienia).

#### 🖥️ App Shell & UI

- **Preferencje audio:** widać liczbę kanałów wyjścia WebAudio.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Menu OS — Plik:** Nowy (utwór / wzór / z wzoru), Otwórz, Zapisz jako, Importuj / Eksportuj bibliotekę — działa też z Timeline, nie tylko z Admina.
- **Menu OS — Edycja / Widok:** Wytnij / Kopiuj / Wklej steruje schowkiem klipów Timeline; **Wygląd…** otwiera motyw w Timeline, ustawienia wyglądu Klienta na Client, albo Preferencje (Ogólne) w Adminie.

#### 📚 Dokumentacja

- **INSTALL / DESKTOP:** opis multi-out (Quad/5.1 / Aggregate) oraz nowych ID `STAGESYNC_THEME_DEFAULT`.
- **DESKTOP:** zaktualizowana tabela pozycji menu systemowego.

### Zmieniono

#### ⏱️ Timeline & DAW

- **Mixer:** w strefie Audio jest **+ Dodaj Ścieżkę** (jak **+ Dodaj Bus**); usunięte puste komunikaty „Brak ścieżek…” / „Brak busów…”.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Desktop — zasobnik:** status hosta i kopiowanie adresu LAN to jedna pozycja menu (klik przy działającym hoście kopiuje URL).

### Naprawiono

#### 🎛️ Audio / MIDI / Transport

- **Desktop / sesja:** przy utracie połączenia **Wróć do wyboru hosta** znów przenosi do Launchera — także gdy brak mostka Tauri na hoście w LAN albo lokalnym.

#### 🖥️ App Shell & UI

- **Client — chrome:** ustawienia, pełny ekran i inne ikony w nagłówku mają ten sam rozmiar i wygląd `Button` co Admin / Timeline (36×36 na Desktop); większe 44×44 tylko na wąskim / PWA.
- **Admin / Desktop — APK:** kafelki i QR „Pobierz Performer / Console” znów wykrywają APK na lokalnym hoście otwartym przez `localhost` — wcześniej sonda szła na adres LAN (cross-origin) i fałszywie pokazywała brak pliku mimo działającego `/downloads/`.

## [5.2.11](https://github.com/Negatywistczny/stagesync/compare/v5.2.10...v5.2.11) - 2026-07-26

### Dodano

#### 🎛️ Audio / MIDI / Transport

- **Safety Net:** po **Przejmij** (Spare → Master), gdy leciało odtwarzanie, transport przechodzi w **PAUSE** z zachowanym playheadem — zamiast lecieć dalej na świeżo przejętym masterze.
- **Mixer:** zmiana wyjścia fizycznego (`hw_out`) jest zablokowana w trakcie Play (wystarczy Pause).
- **Admin — MIDI Panic:** przytrzymaj ~1 s, żeby wysłać Panic / Reset Controllers (bez PIN-u); na Performerze nie ma globalnego Panic.

#### 🖥️ App Shell & UI

- **PIN operatora:** sesja nie wygasa podczas Play; poza show blokada po ukryciu karty / uśpieniu oraz po 15 min bezczynności.
- **Console / Performer — Zastosuj UI:** przy Play na hoście Performer blokuje aktualizację interfejsu; Console ostrzega (także o utracie Admina przy lokalnym hoście) i wymaga potwierdzenia.

### Naprawiono

#### ⏱️ Timeline & DAW

- **Kotwice:** zaznaczoną kotwicę usuwasz Delete / Backspace — tak jak inne klipy (nie tylko gumką).

#### 🖥️ App Shell & UI

- **Client — partytura:** MusicXML znów transponuje się przy zmianie stroju instrumentu (C / B♭ / E♭ / ręczna) oraz przy globalnej transpozycji zespołu z Live Desk (Admin → Scena) — jak w Grid i w v4.
- **Client — partytura:** podświetlenie taktu idzie dalej przy powtórzeniach i drugiej volcie — kursor OSMD trafia w właściwy takt partytury, a nie „klei się” na początku volty.

## [5.2.10](https://github.com/Negatywistczny/stagesync/compare/v5.2.9...v5.2.10) - 2026-07-26

### Dodano

#### ⏱️ Timeline & DAW

- **Import UG:** pełny flow jak w v4 — wyszukiwanie lub link Ultimate Guitar → pobranie zakładki Chords przez host → podgląd sekcji, edycja taktów i opcjonalna Różdżka; wklejenie tekstu zostaje jako zapas. Działa też w aplikacji Desktop (lokalny host).

### Zmieniono

#### ⏱️ Timeline & DAW

- **Różdżka:** przycisk przy warstwie Forma (jak Tap przy Tekście); skrót W + 1/2/3 bez zmian.

#### 🖥️ App Shell & UI

- **Admin — Pliki:** przycisk eksportu biblioteki to teraz **Eksport**.
- **Nazwa urządzenia:** w tytule „Witaj w StageSync” słowo **StageSync** ma oficjalny krój (Sora) i kolory marki — Stage w kolorze tekstu, Sync w amber.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Aktualizacja (Desktop + Android):** uproszczony dialog — tytuł z numerem wersji, treść „Korzystasz z wersji…”, przyciski **Aktualizuj** / **Przypomnij później** (Desktop dodatkowo **Pomiń tę wersję**); bez listy zmian z release.

### Naprawiono

#### ⏱️ Timeline & DAW

- **Import UG:** polskie litery w tekście (np. ó) dekodują się poprawnie; tipy autora UG (np. „you can play E7…”) nie wchodzą już do Formy / tekstu — przy pobraniu z linku i przy wklejeniu.

#### 🖥️ App Shell & UI

- **Nazwa urządzenia / PIN:** przy wpisywaniu imienia lub PIN-u na telefonie (także w Console / Performer) klawiatura nie zasłania już całego kafelka — panel zostaje nad IME.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Console / Performer (Android):** przy wpisywaniu adresu hosta klawiatura nie zasłania już pola ani przycisku Połącz — cały blok ręcznego połączenia (oraz panel wklejenia w skanie QR) zostaje nad IME.

## [5.2.9](https://github.com/Negatywistczny/stagesync/compare/v5.2.8...v5.2.9) - 2026-07-26

### Dodano

#### ⏱️ Timeline & DAW

- **Różdżka:** z powrotem zawsze na pasku narzędzi Timeline; skrót W + 1/2/3 bez zmian.
- **Import UG:** podgląd sekcji przed zapisem; edytowalne takty każdej sekcji; opcjonalna Różdżka zaraz po imporcie (Tekst+Akordy → Forma). Puste linie i [Verse]/[Chorus] budują Formę; Countdown bez zmian.

### Naprawiono

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Launcher:** „Wyczyść błąd” i „Pobierz logi diagnostyczne” znikają przy braku błędu hosta (CSS `hidden` nie przegrywa już z `display: flex` wiersza przycisków).

## [5.2.8](https://github.com/Negatywistczny/stagesync/compare/v5.2.7...v5.2.8) - 2026-07-26

### Dodano

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Desktop — zasobnik systemowy:** zamknięcie okna chowa aplikację do tray / Menu Bar (lokalny host dalej działa w LAN); menu: status, kopiuj adres, uruchom/zatrzymaj host, zakończ. Pełne wyjście tylko przez **Zakończ** / ⌘Q. (#813)
- **Console / Performer (Android):** po starcie launchera (przy internecie) pojawia się jawny dialog, gdy GitHub Releases ma nowszy APK — pobranie tylko po zgodzie; manifest `android-latest.json` jak Desktop `latest.json`. W Adminie **Sprawdź aktualizacje** porównuje wersję z tym samym manifestem i oferuje **Pobierz APK**.

### Naprawiono

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Admin Host — aktualizacje:** przycisk **Aktualizuj host** pojawia się tylko gdy Watchtower jest skonfigurowany; bez `STAGESYNC_UPDATER_*` widać jasną wskazówkę (Docker: [`compose.prod.yml`](./compose.prod.yml), inaczej instalator z Releases) zamiast błędu po kliknięciu.

## [5.2.7](https://github.com/Negatywistczny/stagesync/compare/v5.2.6...v5.2.7) - 2026-07-26

### Zmieniono

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Desktop (Windows MSI):** instalator WiX ma ciemne banery StageSync i język polski (`pl-PL`) zamiast domyślnego wyglądu Windows. (#812)

### Naprawiono

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Console (Android):** powiadomienie lokalnego hosta jest trwałe (nie da się go zrzucić gestem) — zatrzymanie tylko akcją **Zatrzymaj Host**, która bezpiecznie gasi silnik i zdejmuje foreground.
- **Console (Android) — aktualizacje:** „Sprawdź aktualizacje” w Host nie sugeruje już Watchtower / [`compose.prod.yml`](./compose.prod.yml) ani „Desktop: pobierz instalator” — na tablecie / w APK aktualizacje to nowy APK (Releases / karta Połączenie & Sieć), także gdy mostek `StageSyncNative` nie złapie od razu.

## [5.2.6](https://github.com/Negatywistczny/stagesync/compare/v5.2.5...v5.2.6) - 2026-07-26

### Dodano

#### 🖥️ App Shell & UI

- **Client (iOS / PWA):** lepsze użytkowanie sceniczne w Safari — wake lock z fallbackiem wideo, natychmiastowy reconnect WebSocket po powrocie do karty, tryb standalone (status bar translucent, `viewport-fit=cover`), bez pull-to-refresh i dwukrotnego zoomu; baner pokazuje też **Łączenie…**. (#809)

### Zmieniono

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Launcher (Desktop / Console Android):** „Pobierz log” znika spod przycisku lokalnego hosta — dyskretna ikona **Pobierz logi** w nagłówku; przy awarii silnika pod banerem błędu jest **Pobierz logi diagnostyczne**.

### Naprawiono

#### 🖥️ App Shell & UI

- **Admin Host (telefon):** akordeon Host nie rozpycha już pierwszej karty kosztem Logów / MIDI / O aplikacji — grupy kolumn to prawdziwe flex-y (bez `display: contents`), a otwarty panel przewija się wewnątrz. (#811)

## [5.2.5](https://github.com/Negatywistczny/stagesync/compare/v5.2.4...v5.2.5) - 2026-07-26

### Naprawiono

#### ⏱️ Timeline & DAW

- **Ekran dotykowy (telefon i tablet):** przy domyślnym narzędziu Wskaźnik przeciągnięcie przesuwa canvas (bez przypadkowego zaznaczania prostokątem); uszczypnięcie zmienia zoom poziomy (ten sam tor co suwak Zoom H, ze skalą UI); krótkie stuknięcie w pusty obszar ustawia locator.

#### 🖥️ App Shell & UI

- **Admin Host (telefon):** akordeon nie rozpycha już pierwszej karty na cały ekran — nagłówki Logi / MIDI / O aplikacji zostają widoczne i klikalne, a treść otwartej sekcji przewija się wewnątrz panelu.

## [5.2.4](https://github.com/Negatywistczny/stagesync/compare/v5.2.3...v5.2.4) - 2026-07-26

### Dodano

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Launcher — aktualizacja:** przy starcie (oraz z menu Sprawdź aktualizacje…) dialog nowej wersji z release notes: **Zaktualizuj**, **Przypomnij później**, **Pomiń tę wersję** (zapamiętane lokalnie).

#### 📚 Dokumentacja

- **Desktop:** opis dialogu aktualizacji Launchera (Zaktualizuj / Przypomnij później / Pomiń tę wersję).

### Zmieniono

#### 🖥️ App Shell & UI

- **Admin (telefon):** Utwory, Set, Scena i Host mają akordeon kart (jedna rozwinięta na raz), bez chevrona; przewija się tylko aktywna sekcja pod stałym chrome — tablety zostają przy układzie desktopowym.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Console (Android):** akcja **Zamknij host** w powiadomieniu lokalnego hosta ma czerwony kolor (destructive).
- **APK (sideload / host / Releases):** bundel `data/downloads` i artefakty Releases przebudowane pod 5.2.4 — Console `versionCode` **50213**, Performer **50206** (`versionName` 5.2.4); stały klucz sideload (zamiast efemerycznego debug keystore CI), żeby instalacja / aktualizacja nie padała na niezgodności podpisu; Performer w Releases znowu zawiera UI (`assets/www`).

### Naprawiono

#### 🖥️ App Shell & UI

- **Admin / Android:** sprawdzanie aktualizacji w Host nie próbuje już API desktopowego Tauri (WebView na `127.0.0.1:4000` mylnie wyglądał jak shell desktopowy) — zostaje ścieżka hosta; aktualizacja APK nadal przez natywny dialog przy połączeniu.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **APK Android:** poprawiona instalacja paczek 5.2.4 — wcześniejszy cut podbił wersję w Gradle bez przebudowy bundla hosta, a Releases podpisywało APK innym kluczem na każdym runnerze (oraz Console zaniżało `versionCode`, a Performer wychodził bez UI).

## [5.2.3](https://github.com/Negatywistczny/stagesync/compare/v5.2.2...v5.2.3) - 2026-07-26

### Dodano

#### 📦 Packaging & Desktop (Tauri / Docker)

- **APK (sideload / host):** bundel `data/downloads` zaktualizowany do UI Admin mobile (akordeon Host, stały górny pasek) — Console `versionCode` **50212**, Performer **50205** (`versionName` 5.2.3).
- **Console (Android):** „Uruchom lokalny host” startuje wbudowany serwer StageSync na tablecie (`127.0.0.1:4000`), czeka na gotowość i otwiera Admin — ten sam tor co desktop; domyślny APK zawiera silnik Node i paczkę hosta (MIDI sprzętowe na Androidzie niedostępne; łączenie LAN nadal działa). Lokalny host działa w osobnym procesie (`:host`) — awaria silnika Node nie zamyka już launchera; start z większą stertą wątku, absolutną ścieżką wejścia i `NODE_PATH`; status po śmierci procesu hosta. Po udanym health check launcher wychodzi ze „Uruchamianie…” i otwiera lokalny Admin także wtedy, gdy broadcast między procesami nie dojdzie (wspólny status na dysku). Podczas działania host utrzymuje powiadomienie na pasku z **Otwórz aplikację** i **Zamknij host** (dotknięcie powiadomienia też wraca do Console). Gdy host już działa, launcher pokazuje **Połącz z localhostem** zamiast ponownego startu — bez zawieszenia na „Uruchamianie…”. Domyślny APK pakuje `libnode` wyrównany do 16 KB (przebudowa digidem `v18.20.4`), żeby host startował też na Android 15+ ze stroną pamięci 16 KB; przy starej paczce 4 KB UI wskazuje konkretny mismatch page size / ELF. Gdy `:host` pada, launcher pokazuje krótki komunikat, przewijany log (faza + Node) oraz **Wyczyść** / **Pobierz log** — jak przy błędzie lokalnego hosta na desktopie (bez adb; logcat: `SsLocalHost`). Paczka hosta dostosowuje `path-to-regexp` (Express 5) do silnika Node bez pełnego ICU, żeby wbudowany serwer w ogóle się załadował. Po READY lokalny host reklamuje `_stagesync._tcp` w LAN (Android NSD) — inne launchery (Performer / Console / desktop) wykrywają go automatycznie jak host desktopowy.

#### 📚 Dokumentacja

- **Mobile / Desktop:** opis lokalnego hosta Console oraz wymagań buildu (NDK / CMake).

### Zmieniono

#### 🖥️ App Shell & UI

- **Admin Host:** układ dwukolumnowy na wysokość treści (lewa: Połączenie & Sieć z kafelkami Performer/Console + O Aplikacji; prawa: Logi serwera + MIDI & Safety Net) — bez rozciągania pustych pól; adres mDNS `http://nazwa.local:port` obok IP gdy host go reklamuje; Wejście / Wyjście / Clock OUT w jednym rzędzie; Pauza / Wyczyść / Pobierz (.zip) na dole karty logów. Na wąskim ekranie karty Host to akordeon — jedna rozwinięta na raz (domyślnie Połączenie & Sieć).
- **Admin Utwory:** w panelu wybranego utworu **Odtwórz** przed **Timeline** (krótsza etykieta zamiast „Otwórz w Timeline”); **Import** przy nagłówku sekcji Pliki; Partytura / XML przy metadanych.

#### 📚 Dokumentacja

- **Mobile:** opis QR/APK w Host wskazuje kartę Połączenie & Sieć (kafelki Performer / Console).

### Naprawiono

#### ⏱️ Timeline & DAW

- **Wskaźniki / dock:** locator i playhead nie malują się już nad kolumną docku przy przewijaniu w poziomie (sticky dock nad playhead/locator).
- **Mixer:** Solo, Mute i kolor/ikona ścieżki mają etykiety z nazwą toru (czytelniej na czytniku ekranu i w podpowiedziach) (#798).

#### 🖥️ App Shell & UI

- **Admin (mobile):** górny pasek nie rozjeżdża się już przy zawijaniu — wordmark z ikonami w jednym rzędzie, zakładki Utwory/Set/Scena/Host w równej siatce, Timeline/Klient pod spodem.
- **Admin / Host:** grupy MIDI In/Out i Clock OUT; etykiety pobierania APK i Releases; regiony Pliki bazy, Biblioteka i kolejność setlisty; „Usuń” / „Nowy z wzoru” / „Usuń komunikat” / „Dodaj zaznaczone” z kontekstem; stan Partytury MusicXML i import XML (#696, #712, #741, #751, #758, #763, #765, #786, #788, #806).
- **Client / Launcher:** etykiety komórek cyklu akordów; dekoracyjne takty Formy; Połącz przy zmianie serwera; powrót do launchera po utracie połączenia; podgląd QR i kart hostów; pole PIN operatora (#698, #703, #704, #705, #711, #725).
- **Admin Set:** czas setlisty z uszkodzonymi / nieliczbowymi wartościami pokazuje 0:00 zamiast pustki (#753).

## [5.2.2](https://github.com/Negatywistczny/stagesync/compare/v5.2.1...v5.2.2) - 2026-07-26

### Zmieniono

#### 🖥️ App Shell & UI

- **Design system:** wspólne pola formularza (`Input` / `Select` / `Textarea` / `Field`), badge i segmenty w `@stagesync/ui`; chrome Admin (karty, URL+Kopiuj, metryki MIDI, toolbary) z jednego modułu shared — mniej rozjazdu wyglądu między stronami.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Launcher:** te same tokeny i klasy przycisków co SPA (`ss-btn*`) — bez ręcznej kopii stylów w cold-start.

#### 📚 Dokumentacja

- **Desktop / design system:** Launcher i SPA dzielą te same tokeny oraz klasy przycisków; opis w DESKTOP i docs/ui.

### Naprawiono

#### ⏱️ Timeline & DAW

- **Mobile — podgląd:** na telefonie Timeline nie pokazuje zablokowanego chrome edycji (Tap, „Dodaj ścieżkę”, Inspector, Mikser, Snap) — zostają transport, wybór utworu i zoom do przeglądania.

#### 🖥️ App Shell & UI

- **Admin (telefon):** ciaśniejszy workspace i chrome; Utwory — lista nad panelem wybranego utworu bez sztywnego 60/40; Set / Scena — czytelniejszy układ na wąskim ekranie; ustawienia serwera na pełną wysokość.
- **Admin Host:** z powrotem pełne adresy URL z Kopiuj, podpowiedź o skanowaniu QR w LAN oraz pełna telemetria MIDI (Clock/s, SPP/s, PC/s, Beat→WS) ze statusami Wejście / Wyjście / Clock OUT; karty dopasowują wysokość do treści zamiast pustych czarnych pól.
- **Client:** przyciski chrome i w ustawieniach (ikony, Start, zoom, strój, Zamknij) znów mają ten sam cel dotykowy 44×44 — panel ustawień nie wracał do 36px po portalu poza `.page`.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **APK z hosta:** QR / linki Performer i Console działają na lokalnym hoście desktopu bez ręcznego kopiowania do Documents — host bierze APK z bundla / monorepo `data/downloads` (puste tylko gdy artefakt naprawdę nie jest w instalacji).

## [5.2.1](https://github.com/Negatywistczny/stagesync/compare/v5.2.0...v5.2.1) - 2026-07-26

### Dodano

#### 🖥️ App Shell & UI

- **Admin — Przywróć:** w Ustawieniach serwera można przywrócić shadow `.bak` (jeden plik, zaznaczenie albo cały katalog) albo archiwum `.zip` z drzewem danych do katalogu hosta — po potwierdzeniu, z PIN-em operatora gdy włączony; przed każdym nadpisaniem powstaje kopia pre-restore.

#### 🛠️ Infrastruktura & Build

- **Monitoring:** opcjonalne raportowanie awarii (Sentry) dla hosta i UI — włączane tylko gdy ustawisz `SENTRY_DSN` / `VITE_SENTRY_DSN` (bez DSN aplikacja działa jak wcześniej; bez wysyłania haseł i tokenów).

#### 📚 Dokumentacja

- **Instalacja / Desktop:** opis Przywróć (`.bak` / ZIP) w ustawieniach serwera oraz opcjonalnych DSN Sentry.

### Zmieniono

#### 🖥️ App Shell & UI

- **Admin Utwory:** czytelniejsza hierarchia akcji (Otwórz w Timeline jako główna, Odtwórz / Import osobno, Usuń w rogu z potwierdzeniem); w inspectorze tonacja, tempo i czas utworu; na liście dyskretne badge BPM / tonacja / czas; pasek statusu z wyraźnymi slotami Teraz / Sekcja / Pozycja / Dalej / Połączenie.
- **Admin Set:** stały toolbar nad setlistą (przerwa / szablon / wyczyść / zapisz); kafelki z czasem, BPM i tonacją oraz uchwytem przeciągania; pasek budżetu czasu (OK / overrun); „Dodaj zaznaczone” w stopce biblioteki.
- **Admin Scena:** przełączniki ON/OFF w Korekcie (edycja zdalna); komunikaty z jasną hierarchią (Wyślij jako główna akcja, role / TTL / Alert jako opcje); puste stany zamiast pustki; kafelki klientów z rolą i statusem połączenia.
- **Admin Host:** siatka 2×2 równych kart (Połączenie & Sieć | MIDI & Safety Net | Aplikacje Mobilne | O Aplikacji & Aktualizacje); logi zwijane pod spodem ze stałą wysokością; bez zagnieżdżonych ramek w kartach.
- **Admin Ustawienia:** jeden **Zapisz** w stopce (także nazwa urządzenia — bez osobnego „Zapisz nazwę”); **MIDI Panic** na górze zakładki MIDI; **Odsłuch** obok dźwięku metronomu; zakładka Serwer przewija się nad stopką (ścieżki / backup bez przycięcia).
- **Client:** bez ręcznej zmiany utworu w chrome (usunięty „→następny”) — setlista sterowana z Admin / Timeline; minimalistyczny nagłówek (tytuł utworu, bez tonacji / tempa / metrum / taktu) i więcej miejsca na treść sceniczną; nazwa urządzenia tylko na ekranie wyboru roli (nie w ustawieniach).
- **Kontrolki shelli:** przyciski chrome (ikony, taby, chipy, transport, Solo/Mute, zoom partytury) na kanonicznym `Button` z `@stagesync/ui` — bez lokalnych rozmiarów sm/lg ani nadpisań paddingu/fontu.

### Naprawiono

#### 🖥️ App Shell & UI

- **Client / Akordy (mobile):** hero przy zmianie akordu znów wlatuje z prawej, a nie od góry.
- **Client:** ustawienia roli (Karaoke / Akordy / Partytura / Perkusja) znów mają ikonę suwaków, a nie to samo koło zębate co ustawienia globalne; panel ustawień nie jest ucinany przez overflow nagłówka.
- **Client Karaoke:** usunięty nieproszony pasek bieżącego akordu nad tekstem (regresja po typografii akordów) — akordy zostają w roli Akordy; ustawienia roli floatują bez pustego rzędu nad sceną.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Launcher:** „Pobierz log” i „Wyczyść błąd” pojawiają się tylko gdy jest log diagnostyczny albo błąd do wyczyszczenia.

### Usunięto

#### 🖥️ App Shell & UI

- **Motyw sceniczny:** z Korekty Sceny znika blokada motywu (wymuszenie jasnego / wysokiego kontrastu na Clientach). Clienty zostają przy lokalnych przełącznikach w ustawieniach oraz opcjonalnym domyślnym motywie hosta (`STAGESYNC_THEME_DEFAULT`).

## [5.2.0](https://github.com/Negatywistczny/stagesync/compare/v5.1.3...v5.2.0) - 2026-07-25 — Pocket Stage

> **Pocket Stage:** PIN operatora, Safety Net Master/Spare, Cues Sampler, Mixer bus→bus, Performer/Console Offline-First oraz domyślny motyw hosta.

### Dodano

#### ⏱️ Timeline & DAW

- **Ołówek / audio:** klik w pustym na ścieżce audio otwiera Import i wstawia klip w miejscu kliknięcia (jak Logic), z No Overlap.
- **Mixer — bus→bus:** wyjście busa można skierować na Master albo inny bus (bez pętli); silnik odtwarzania buduje DAG.
- **Cues Sampler:** klip Cue może mieć próbkę audio (one-shot / gated) na Master lub Bus; start z playheadu albo przycisk GO w Inspectorze; opcjonalnie dokończenie po Stop.
- **Safety Net:** w Admin Host widać rolę Master/Spare i przycisk **Przejmij** na Spare (ręczne przejęcie).

#### 🎛️ Audio / MIDI / Transport

- **MIDI Host:** wybór kanału Program Change IN (Omni albo 1–16) i OUT w ustawieniach hosta; przy szybkiej serii PC silnik czeka 50 ms i bierze najnowszy komunikat (ochrona przed przypadkową zmianą utworu na współdzielonej magistrali).

#### 🖥️ App Shell & UI

- **PWA / Client:** „Dodaj do ekranu głównego” (manifest + Service Worker); cache odświeża się z wersją interfejsu (bez cache API, WebSocket i pobierań); w aktywnym widoku Client ekran nie gaśnie (Screen Wake Lock).
- **Admin Host:** w karcie Sieć osobne QR/linki **Dołącz** oraz **Pobierz StageSync Performer / Console** (APK z hosta); gdy pliku brak — jasny pusty stan. Modal QR: tryby Dołącz | Performer | Console.
- **Nazwa urządzenia:** przed Client / Admin / Timeline urządzenie bez zapisanej nazwy dostaje prompt „Podaj swoje imię lub nazwę urządzenia.”; nazwa widać na liście klientów (Scena) i da się ją zmienić w ustawieniach.
- **Motyw sceniczny:** w Korekcie na scenie realizator może włączyć blokadę motywu na Clientach (jasny / wysoki kontrast) — nadpisuje lokalny wygląd tabletu do zdjęcia blokady; lokalne przełączniki na Clientcie są wtedy wyłączone.
- **Motyw domyślny hosta:** `STAGESYNC_THEME_DEFAULT` (`dark` / `light` / `*-high`) ustawia wygląd dla urządzeń bez zapisanego motywu lokalnego (health → `themeDefault`).
- **PIN operatora:** gdy host ma ustawiony kod PIN, Admin i Timeline proszą o odblokowanie przed edycją; Client może odblokować edycję notatek w ustawieniach.

#### ⚙️ Serwer & API

- **Downloads:** host serwuje APK Performer i Console spod `/downloads/` (404 z komunikatem, gdy artefakt nie leży na dysku) oraz paczki UI do jawnej aktualizacji Offline-First (pełna i warianty roli Performer / Console).
- **Health / UI sync:** health zwraca wersję protokołu i hash interfejsu (pełny oraz opcjonalnie per rola); manifest UI listuje assety do synchronizacji na telefonie.
- **PIN operatora:** opcjonalny `STAGESYNC_OPERATOR_PIN` blokuje destrukcyjne mutacje REST (projekt, setlista, ustawienia, MIDI config, zmiana utworu…); Play/Stop i MIDI Panic bez PIN-u; status `GET /api/system/operator-auth`.
- **Safety Net:** rola Master/Spare (`STAGESYNC_SAFETY_ROLE`); na Spare MIDI OUT jest wyciszony; Host może ręcznie **Przejmij**.
- **Motyw domyślny:** health może zwracać `themeDefault` z `STAGESYNC_THEME_DEFAULT` (dla klientów bez lokalnej preferencji).

#### 📚 Dokumentacja

- **Mobile:** podręcznik [MOBILE.md](./docs/guides/MOBILE.md) — Performer vs Console (Console = pełny odpowiednik desktopu; lokalny host w produkcie), sideload, QR dołączenia vs QR APK, Offline-First (dialog „Zastosuj”).

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Android:** sideload **StageSync Performer** (Client na scenie) i **StageSync Console** (pełne SPA: Admin + Timeline + Client; link „Klient” działa z lokalnego bundla) — bez Google Play; mniejsze APK tylko pod ARM (`arm64-v8a` / `armeabi-v7a`).
- **Performer / Console — launcher:** ciemny ekran z oficjalnym wordmarkiem StageSync i nazwą roli (**Performer** / **Console**) obok — jak chrome Admin / Timeline; karty serwerów z sieci (jedno dotknięcie), kafelki **Skanuj kod QR** / **Ostatnie serwery** oraz ręczny adres; skan QR otwiera podgląd kamery, rozpoznaje URL LAN z QR „Dołącz” i łączy jak przy wpisanym adresie (wklejenie bez kamery nadal działa; uzasadnienie uprawnienia Kamera po polsku); w Console — **Uruchom lokalny host** (przy braku silnika w APK — uczciwy komunikat); wstecz w sesji idzie po historii strony; **Zmień serwer** / **Dodaj serwer…** w ustawieniach Client / Admin (nie jako pływający przycisk); ikona aplikacji i PWA to oficjalny znak StageSync.
- **Performer / Console — aktualizacje:** po połączeniu jawny dialog aktualizacji APK (**Pobierz i zainstaluj** / **Później**), gdy host ma nowszą wersję i plik jest dostępny — bez cichej aktualizacji w tle. **Offline-First:** start z lokalnego UI; przy nowszej wersji interfejsu roli na hoście — dialog **„Zastosuj nowy interfejs”** / **Później**; przy niezgodnym protokole tryb zdalny bez kasowania lokalnego bufora.
- **Client / Admin (mobile):** przycisk **Pełny ekran** ukryty w powłoce Android oraz w samodzielnym PWA na małym / touch ekranie — desktop i Tauri bez zmian.

### Zmieniono

#### ⏱️ Timeline & DAW

- **Wskaźniki:** locator (amber) i playhead MIDI (info) znów są wizualnie rozdzielone — bez wspólnej „przygaszonej” linii.

### Naprawiono

#### ⏱️ Timeline & DAW

- **Ołówek:** podgląd przeciągania klipu (Forma / Tekst / Akordy / Cue) pokazuje etykietę z tym samym wyrównaniem co zapisany klip.
- **Zaznaczenie:** menu kontekstowe klipu i ścieżki audio oraz segmenty mapy Tempo / Metrum / Tonacja ogłaszają liczbę zaznaczonych elementów; Inspector przy wielu klipach ([#675](https://github.com/Negatywistczny/stagesync/pull/675), [#676](https://github.com/Negatywistczny/stagesync/pull/676), [#687](https://github.com/Negatywistczny/stagesync/pull/687), [#690](https://github.com/Negatywistczny/stagesync/pull/690)).

#### 🎛️ Audio / MIDI / Transport

- **Playback:** po Stop/scrub bufor źródła jest zwalniany (pusty buffer) — mniej trzasków / obciążenia pamięci przy scrubie w WebKit/Safari.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Launcher:** jaśniejsze etykiety powrotu, błędu lokalnego hosta, łączenia ręcznego oraz stanu zajętości / ponowienia ([#677](https://github.com/Negatywistczny/stagesync/pull/677), [#684](https://github.com/Negatywistczny/stagesync/pull/684), [#689](https://github.com/Negatywistczny/stagesync/pull/689)).
- **Android:** ikona Performer / Console na ekranie głównym ma właściwy odstęp wokół znaku StageSync (bez przycinania playheada w masce launchera).

## [5.1.3](https://github.com/Negatywistczny/stagesync/compare/v5.1.2...v5.1.3) - 2026-07-25

### Dodano

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Launcher:** przy nieudanym starcie lokalnego hosta (m.in. zajęty port) można pobrać log diagnostyczny do pliku.

### Zmieniono

#### ⏱️ Timeline & DAW

- **Narzędzia / Pomoc:** odmiana „klip” w tytułach narzędzi i karcie Pomocy; przycisk i dialog „Importuj UG” ([#640](https://github.com/Negatywistczny/stagesync/pull/640), [#641](https://github.com/Negatywistczny/stagesync/pull/641), [#668](https://github.com/Negatywistczny/stagesync/pull/668), [#669](https://github.com/Negatywistczny/stagesync/pull/669)).
- **Inspector:** polskie etykiety klipu audio (wyciszenie / gain) ([#635](https://github.com/Negatywistczny/stagesync/pull/635)).

#### 🖥️ App Shell & UI

- **Dialogi:** potwierdzenie „Potwierdź”, alert „Rozumiem” ([#606](https://github.com/Negatywistczny/stagesync/pull/606), [#622](https://github.com/Negatywistczny/stagesync/pull/622)).
- **Admin:** sort biblioteki „Program Change”; polskie tytuły importu UG/MusicXML ([#626](https://github.com/Negatywistczny/stagesync/pull/626), [#657](https://github.com/Negatywistczny/stagesync/pull/657)).
- **Host:** „Telemetria MIDI”; crash fallback z widocznymi „Przejdź do Client/Admin” ([#638](https://github.com/Negatywistczny/stagesync/pull/638), [#671](https://github.com/Negatywistczny/stagesync/pull/671)).
- **Połączenie:** tooltip wskaźnika z polskimi statusami ([#607](https://github.com/Negatywistczny/stagesync/pull/607)).

#### 📚 Dokumentacja

- **Desktop:** podręcznik instalacji i Launchera bez żargonu etapów i szczegółów implementacji shella — czytelniejsze menu, Gatekeeper i aktualizacja.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Aktualizacja aplikacji:** przed instalacją dialog ostrzega o restarcie StageSync i konieczności zapisania niezapisanych zmian w projekcie (Anuluj przerywa aktualizację).

### Naprawiono

#### ⏱️ Timeline & DAW

- **Mobile — Inspector:** dolny sheet Właściwości znów jest nad paskiem transportu i statusem (Snap / zoom), zamiast chować się pod nimi.
- **Etykiety AT:** jaśniejsze aria startu tekst/akord/cue, zaznaczanie segmentów mapy, wyłączone Zoom H/V w Mixerze, źródło Różdżki ([#646](https://github.com/Negatywistczny/stagesync/pull/646), [#647](https://github.com/Negatywistczny/stagesync/pull/647), [#655](https://github.com/Negatywistczny/stagesync/pull/655), [#672](https://github.com/Negatywistczny/stagesync/pull/672)).

#### 🖥️ App Shell & UI

- **Schowek / PPM:** zaznaczony tekst (także poza polami) znów kopiuje się Ctrl/Cmd+C i ma natywne Wytnij/Kopiuj/Wklej w menu kontekstowym; Inspect Element nadal wyłączony poza polami i zaznaczeniem; przy edycji nazwy ścieżki PPM systemowe działa w polu.
- **Set / biblioteka / Stage / Client:** etykiety ikon Set, status biblioteki, puste Score/Karaoke, pliki projektu i Stage, format zegara, QR LAN ([#603](https://github.com/Negatywistczny/stagesync/pull/603), [#608](https://github.com/Negatywistczny/stagesync/pull/608), [#613](https://github.com/Negatywistczny/stagesync/pull/613), [#614](https://github.com/Negatywistczny/stagesync/pull/614), [#615](https://github.com/Negatywistczny/stagesync/pull/615), [#623](https://github.com/Negatywistczny/stagesync/pull/623), [#649](https://github.com/Negatywistczny/stagesync/pull/649)).

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Desktop:** lokalny host zapisuje projekty w `~/Documents/StageSync`; przy pierwszym starcie po aktualizacji kopiuje dane z poprzedniej lokalizacji aplikacji, jeśli Dokumenty są jeszcze puste (bez nadpisywania istniejących plików).

## [5.1.2](https://github.com/Negatywistczny/stagesync/compare/v5.1.1...v5.1.2) - 2026-07-25

### Dodano

#### 🎛️ Audio / MIDI / Transport

- **Setlista:** zmiana kolejności lub auto-advance w Adminie od razu aktualizuje podgląd „następny utwór” na Client / Admin / Timeline przez WebSocket (bez czekania na zmianę utworu).

### Zmieniono

#### ⏱️ Timeline & DAW

- **Snap:** widoczna opcja wyłączenia to „Wyłącz” (zamiast „Off”) ([#521](https://github.com/Negatywistczny/stagesync/pull/521)).
- **Map-edit / Inspector:** w dialogach Tempo / Metrum / Tonacja „lane” → „ścieżka”, etykieta toniki „Tonika”; pola Inspectora (PC, tonika, gain, fade) z polskimi nazwami zgodnymi z chrome ([#511](https://github.com/Negatywistczny/stagesync/pull/511), [#561](https://github.com/Negatywistczny/stagesync/pull/561)).
- **Mixer:** tryb kanału ogłaszany jako „Tryb mono” / „Tryb stereo” ([#525](https://github.com/Negatywistczny/stagesync/pull/525)).

#### 🖥️ App Shell & UI

- **Client:** tytuł ustawień globalnych to „Ustawienia globalne” ([#553](https://github.com/Negatywistczny/stagesync/pull/553)).
- **Admin / Batch PC:** jaśniejsze tytuły modalów MusicXML i Batch PC; pole startu to „Start Program Change” ([#569](https://github.com/Negatywistczny/stagesync/pull/569), [#573](https://github.com/Negatywistczny/stagesync/pull/573)).
- **Admin / Host:** sekcja telemetrii to „Telemetria Midi” (bez skrótu do Ustawień); Restart / Wyłącz z pulsującym pierścieniem potwierdzenia i anulowaniem po kliknięciu poza przyciskiem.
- **Ustawienia:** nagłówek „Zaawansowane — Ścieżki plików” bez zbędnego „▸”.

### Naprawiono

#### ⏱️ Timeline & DAW

- **Etykiety AT:** Dodaj ścieżkę, menu oka i narzędzi, zoom, picker utworu i wyglądu ścieżki, dialogi edycji mapy oraz grupy transportu / statusu mają czytelne nazwy i powiązania dla czytników ekranu; w Pomocy puste wyniki wyszukiwania są ogłaszane na żywo ([#500](https://github.com/Negatywistczny/stagesync/pull/500), [#505](https://github.com/Negatywistczny/stagesync/pull/505), [#512](https://github.com/Negatywistczny/stagesync/pull/512), [#544](https://github.com/Negatywistczny/stagesync/pull/544), [#551](https://github.com/Negatywistczny/stagesync/pull/551), [#587](https://github.com/Negatywistczny/stagesync/pull/587), [#601](https://github.com/Negatywistczny/stagesync/pull/601)).
- **Mixer / Click:** Mute Clicka oraz stripy (wyjście stereo, balans, panorama, peak) z polskimi etykietami AT ([#497](https://github.com/Negatywistczny/stagesync/pull/497), [#513](https://github.com/Negatywistczny/stagesync/pull/513)).
- **Menu narzędzi:** skróty jako pojedyncza litera (np. I), bez prefiksu T.
- **Audio / edycja:** split respektuje mapę tempa przy `trimIn`; resize z kolizją nie wywala UI; multi-przesuwanie trzyma klip wiodący; Gain odrzuca NaN.
- **Akordy:** symbol w Inspectorze nie jest kanonizowany w trakcie wpisywania; normalizacja przy wyjściu z pola; niedokończony bas po ukośniku (`C#m7/`) nie psuje indeksu górnego na scenie.

#### 🎛️ Audio / MIDI / Transport

- **MIDI Host:** clock OUT z ticków transportu (bez osobnego timera); bezpieczny send przy odłączeniu USB; Program Change IN/OUT bierze najnowszy komunikat przy szybkiej serii (także przy floodzie PC); SPP nie seekuje poza koniec utworu.
- **Mixer / mono:** Peak/VU ścieżki mono nie spada przy twardej panoramie; po dekodowaniu pliku mono ścieżka bez trybu dostaje tryb mono (panorama zamiast True Balance).
- **Mixer / Solo:** gdy Solo ścieżki jest aktywne, Solo szyny nie wycisza już wyjścia — słychać wysolowaną ścieżkę (nawet gdy idzie na inną szynę).
- **Mixer / Peak Hold i fader:** Peak Hold nie wraca po wyczyść przez wyścig z odświeżaniem miernika; zmiana fadera / mute / solo bez trzasków (krótka rampa wzmocnienia, bez rozłączania szyn na każdy tick transportu).
- **Playback:** plik mono na ścieżce stereo słychać na L i R (nie tylko lewy); głośność klipu bez restartu odtwarzania; Pause w trakcie buforowania nie odpala „widmowego” dźwięku; seek na jeszcze niezaładowany plik wznawia clip po decode; przełączenie projektu nie zostawia starych buforów w cache; na końcu utworu WebAudio cichnie lokalnie, gdy ticki SSOT są już za końcem, zanim serwer dokończy pauzę albo auto-advance.
- **Transport:** Seek / Pause FOH podczas pauzy na końcu utworu albo auto-advance nie jest nadpisywany przez spóźnione odczyty z dysku; po ponownym połączeniu WS playhead bierze świeży tick (bez skoku z opóźnionego HTTP).
- **Setlista / auto-advance:** utwór spoza setlisty (np. bis) nie skacze automatycznie do pierwszego numeru — transport zatrzymuje się jak na końcu setu.

#### 🖥️ App Shell & UI

- **Admin:** „Zarządzaj bazą”, modale, log systemowy, Zapisz / Wyczyść setlistę i toolbar Batch PC z poprawnymi etykietami i powiązaniami ARIA ([#510](https://github.com/Negatywistczny/stagesync/pull/510), [#545](https://github.com/Negatywistczny/stagesync/pull/545), [#575](https://github.com/Negatywistczny/stagesync/pull/575), [#577](https://github.com/Negatywistczny/stagesync/pull/577), [#599](https://github.com/Negatywistczny/stagesync/pull/599)).
- **Client:** status ładowania partytury i paneli, pusty Set oraz reset zoomu partytury ogłaszane czytnikom; wordmark z kontekstem shella ([#578](https://github.com/Negatywistczny/stagesync/pull/578), [#580](https://github.com/Negatywistczny/stagesync/pull/580), [#582](https://github.com/Negatywistczny/stagesync/pull/582), [#592](https://github.com/Negatywistczny/stagesync/pull/592), [#596](https://github.com/Negatywistczny/stagesync/pull/596)).
- **Client / Score:** zoom i transpozycja partytury są debounced, żeby uniknąć serii pełnych przebudów SVG podczas szybkich kliknięć.
- **Scena:** priorytet i czas wyświetlania komunikatu oraz „Usuń komunikat” z czytelnymi etykietami ([#528](https://github.com/Negatywistczny/stagesync/pull/528), [#533](https://github.com/Negatywistczny/stagesync/pull/533)).
- **Ustawienia / crash / dialogi:** polskie nazwy w Ustawieniach serwera; etykiety nawigacji po crashu; unikalne tytuły dialogów shella ([#506](https://github.com/Negatywistczny/stagesync/pull/506), [#508](https://github.com/Negatywistczny/stagesync/pull/508), [#538](https://github.com/Negatywistczny/stagesync/pull/538)).
- **Desktop:** modale menu natywnego powiązane z tytułami dla AT ([#543](https://github.com/Negatywistczny/stagesync/pull/543)).

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Launcher:** pole adresu, kafelki hostów, Odśwież i lista ostatnich z etykietami AT ([#499](https://github.com/Negatywistczny/stagesync/pull/499), [#532](https://github.com/Negatywistczny/stagesync/pull/532)).

## [5.1.1](https://github.com/Negatywistczny/stagesync/compare/v5.1.0...v5.1.1) - 2026-07-24

### Naprawiono

#### ⏱️ Timeline & DAW

- **Etykiety AT:** Solo/Mute w Mixerze oraz meta transportu i segmenty mapy Tempo / Metrum / Tonacja mają czytelne nazwy dla czytników ekranu ([#480](https://github.com/Negatywistczny/stagesync/pull/480), [#483](https://github.com/Negatywistczny/stagesync/pull/483), [#487](https://github.com/Negatywistczny/stagesync/pull/487)).
- **Fokus rename:** po rename ścieżki myszą w docku / Mixerze nie zostaje „przyklejony” pierścień fokusu; przy Tab pierścień nadal widać ([#485](https://github.com/Negatywistczny/stagesync/pull/485)).

#### 🎛️ Audio / MIDI / Transport

- **MIDI Host:** clock OUT z ticków transportu (bez osobnego timera); bezpieczny send przy odłączeniu USB; Program Change IN/OUT bierze najnowszy komunikat przy szybkiej serii; SPP nie seekuje poza koniec utworu.

#### 🖥️ App Shell & UI

- **Client / Akordy:** zapis literowy w projekcie (`Cmaj7`, `Am7(b5)`, …); na scenie pryma na linii bazowej, a jakość i symbole (`Δ`, `°`, `ø`, `−`, `+`) w indeksie górnym — w kafelkach bas po ukośniku pod prymą, w Hero/nast. nadal w jednej linii ([#478](https://github.com/Negatywistczny/stagesync/issues/478)).
- **Client / etykiety AT:** następny w setliście, obecność na Scenie, wskaźnik połączenia i dodawanie busa mają czytelne nazwy dla czytników ekranu ([#480](https://github.com/Negatywistczny/stagesync/pull/480)).
- **Admin Set:** menu „Wczytaj szablon” w pustym secie z poprawnymi powiązaniami ARIA; Escape zamyka menu ([#491](https://github.com/Negatywistczny/stagesync/pull/491)).
- **Dialogi:** Escape zamyka okna confirm / prompt / alert jak Anuluj ([#493](https://github.com/Negatywistczny/stagesync/pull/493)).

## [5.1.0](https://github.com/Negatywistczny/stagesync/compare/v5.0.1...v5.1.0) - 2026-07-24 — Launch & Mix

> **Launch & Mix:** Launcher hosta (lokalny / LAN / remote), Mixer Timeline oraz zestaw narzędzi i skrótów live-show.

### Dodano

#### ⏱️ Timeline & DAW

- **Menu narzędzi Timeline:** zestaw live-show w stylu Logic (Wskaźnik, Ołówek, Gumka, Nożyczki, Połącz, Mute, Solo, Fade, Gain, Zaznaczanie, Zoom) — akord T otwiera menu przy kursorze; na pasku domyślnie cztery podstawowe narzędzia, widoczność pozostałych do wyboru lokalnie. Na audio: podział / scalanie sąsiadów, mute clipu, chwilowe solo ścieżki, fade i gain myszą; marquee obejmuje też clipy audio. Różdżka i Tap (przy warstwie Tekst).
- **Menu kontekstowe:** PPM na klipach Forma / Tekst / Akordy / Cue / Audio, pustej lane i nagłówku ścieżki — schowek, mute/rozdziel audio, import oraz zmiana nazwy / duplikuj / usuń ścieżkę (także w Mixerze); bez natywnego Look Up / Inspect na nazwie.
- **Dock ścieżek audio:** zaznaczanie i multi-select ścieżek, Solo/Mute na zaznaczonych (w tym solo wyłącznie tej), edycja nazwy i reset fadera dwuklikiem, nowa ścieżka dwuklikiem pustego docku; układ 2-rzędowy z kolorem/ikoną, skracaniem długiej nazwy i regulowaną szerokością kolumny (zapamiętaną); przy niskiej wysokości — jeden rząd bez fadera.
- **Mixer:** cztery strefy (Audio | Busy | Click | Master) — przewijanie Audio+Busy, Click i Master przypięte; stripy stałej szerokości z M/ST, PAN (mono) / BAL True Balance (stereo), Peak Hold, faderem +6…−∞, metrami LED i Out = Master|Bus; Busy z dodawaniem/usuwaniem busów; Click = Direct Cue (Mute metronomu w sesji); Stereo Out dual L+R. Kolor i ikona ścieżki wspólne z dockiem i waveformem; przycisk Mikser obok Tempo. Zoom UI skaluje stripy; Zoom H/V w Mixerze wyłączone.

#### 🖥️ App Shell & UI

- **Menu kontekstowe systemu:** natywne menu przeglądarki / Inspect Element wyłączone w całej aplikacji; w polach tekstowych nadal dostępne wycinasie i wklejanie systemowe.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Launcher:** ekran startowy przed Adminem — lokalny host, wykrywanie StageSync w LAN (mDNS: hostname, projekt, status transportu; adres LAN) albo wpisany adres; ostatnio używane z diodą online/offline; czytelne błędy zamiast białego ekranu.
- **Launcher / sesja:** przy utracie połączenia ponawianie łączenia i powrót do wyboru hosta (desktop lokalny); crash lokalnego hosta wraca do Launchera; ostrzeżenie przy różnicy wersji aplikacji i zdalnego hosta.

### Zmieniono

#### ⏱️ Timeline & DAW

- **Transport — licznik BBT:** odczyt tylko takt.miara (bez ticków); węższa stała szerokość, bez skoków layoutu.
- **Wysokość ścieżek:** Tempo, Tonacja, Metrum, Kotwice, Forma, Tekst, Akordy i Cue startują wąsko (niżej niż Audio); ręcznie zmieniona wysokość zostaje zapamiętana. Zoom V zachowuje proporcję.
- **Inspector ścieżki audio:** Solo/Mute usunięte z Właściwości — zostają w docku i Mixerze (Mute clipu w Inspectorze bez zmian).

#### 📚 Dokumentacja

- **Pomoc Timeline (?):** skróty w kartach Widok / Narzędzia / Edycja / Transport / Nawigacja (w tym akord T i skróty globalne); zakładka narzędzi z wypunktowaniem; wyszukiwanie filtruje skróty i opisy na żywo.

### Naprawiono

#### ⏱️ Timeline & DAW

- **Tap:** w trybie Tap podświetlana jest aktywna linia Tekstu.
- **Canvas:** przewijanie w pionie zatrzymuje się na dole treści (ścieżki + „Dodaj ścieżkę”) — bez uciekania w pustkę pod ostatnim wierszem.
- **UI Scale:** pasek transportu w jednym rzędzie; Inspector przewija się w kolumnie bez nachodzenia na status; ścieżki osiągalne przy powiększonym UI; Zoom UI 85–125%; pasek statusu trzyma Snap / UI / H / V zawsze widoczne.

#### 📚 Dokumentacja

- **Pomoc Timeline:** treść w modalu znów się przewija (przyklejony nagłówek i zakładki, scrollowalny korpus) — nic nie jest obcinane na dole.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Desktop / lokalny host:** zamknięcie okna albo wyjście z aplikacji zatrzymuje wbudowany host (port nie zostaje zajęty); przy kolejnym „Uruchom lokalny host” porzucony proces jest sprzątany automatycznie.

## [5.0.1](https://github.com/Negatywistczny/stagesync/compare/v5.0.0...v5.0.1) - 2026-07-23

### Zmieniono

#### 🖥️ App Shell & UI

- **Admin Host (desktop):** w O aplikacji tylko wersja aplikacji — bez etykiety Sidecar i bez notki o Watchtower/Docker.

### Naprawiono

#### ⏱️ Timeline & DAW

- **Kotwice XML:** bloczki synchronizacji taktów pozycjonowane na osi czasu (drag zmienia takt logiczny, bez pakowania jeden za drugim) ([#477](https://github.com/Negatywistczny/stagesync/issues/477)).
- **Tap wokalu:** Spacja ustawia start linii Tekstu przy playheadzie (nie na zparkowanym locatorze / takcie 1); przycisk Tap przy warstwie Tekst podświetla aktywny tryb ([#479](https://github.com/Negatywistczny/stagesync/issues/479)).

#### 🖥️ App Shell & UI

- **Client / Akordy:** import UG respektuje złożone i polskie akordy (`Edim`, `G/A`, `G/H` → zapis `G/B`; na scenie znów `H` przy „H zamiast B”) ([#478](https://github.com/Negatywistczny/stagesync/issues/478)).

## [5.0.0](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-beta.2...v5.0.0) - 2026-07-23 — Overture

> **Overture:** pierwsze stabilne 5.0 — pełny parytet zachowania v4, odświeżony UI, Audio fade/loop, rozszerzone menu OS, partytura Client (MusicXML), Preferencje oraz Live Desk.

### Dodano

#### ⏱️ Timeline & DAW

- **Narzędzia i nawigacja:** Tap i Zoom (+ Ctrl+Alt hold-zoom); snap (off / takt / beat / subdivision) z zapisem sesji; zoom H/V/UI z ikonami; opcjonalny wskaźnik MIDI playhead w Wygląd; start clipu w Inspectorze jako takt.beat; meta okładki (URL).
- **Różdżka:** z powrotem w toolbarze / skrót W — rozmieszcza Tekst/Akordy wg sekcji Formy (1/2/3); zakres = zaznaczone sekcje lub clipy treści; Forma bez zmian.
- **Tablet — nudge i gesty ([#473](https://github.com/Negatywistczny/stagesync/pull/473)):** pasek ◀▶ + 4 przyciski krawędzi (rozciąganie) dla Formy, Tekst/Akordy/Cue i Audio; pinch-zoom oraz double-tap = Fit Zoom.
- **Mobile — inspector:** na telefonie Właściwości jako dolny sheet (Metadane / zaznaczenie) z Zamknij i tłem; desktop bez zmian układu.
- **Inspector audio ([#428](https://github.com/Negatywistczny/stagesync/issues/428)):** kontekst Track vs Clip (fader/M/S na ścieżce; trim/fade/loop na klipie); Solo w docku; wspólny Slider w design systemie.
- **Linijka ([#61](https://github.com/Negatywistczny/stagesync/pull/61)):** góra — takty + region pętli (klik = cycle); dół — beaty + scrub playheada.
- **Forma i Cue:** kaskadowe przesuwanie późniejszych sekcji przy drag; luka Intro po Countdown; nożyczki na pustym lane; role sceniczne + priorytet Alert w Inspectorze i bannerze Client.
- **Inspector i Undo:** dwuklik klipu Formy/treści lub segmentu mapy otwiera Właściwości; Undo przywraca zaznaczenie klipów razem z projektem; Pomoc z kartami sekcji, miniaturami i skrótami.

#### 🎛️ Audio / MIDI / Transport

- **Preferencje ([#432](https://github.com/Negatywistczny/stagesync/issues/432)):** modal (Cmd/Ctrl+, / menu StageSync) z zakładkami Ogólne, Audio, MIDI i Metronom; draft z **Odrzuć** / **Zapisz** (Esc i tło przywracają stan z otwarcia); wyjście audio i porty MIDI na hoście dopiero po zapisie.
- **Preferencje — Audio / MIDI Panic:** informacje silnika (sample rate, latencja sieci), kompensacja latencji wyjścia (−100…+500 ms); **MIDI Panic / Reset Controllers** na 16 kanałach hosta z potwierdzeniem „Wysłano sygnał Reset”.
- **Live Desk:** transpozycja zespołu, kompensacja sync-lead i przełącznik edycji zdalnej — Admin Scena + Client (broadcast sesji).
- **Audio na klipie:** fade in/out z uchwytami Smart, crossfade przy styku, region loop, kopiuj/wklej; buforowanie przed Play ze spinnerem i ostrzeżeniem przy błędzie decode ([#365](https://github.com/Negatywistczny/stagesync/issues/365)).
- **Transport i setlista ([#358](https://github.com/Negatywistczny/stagesync/issues/358)):** pauza / stop na końcu utworu; opcjonalne auto-advance; `[` / `]` między utworami; ponowne łączenie WS z backoffiem; baner offline Client + odświeżenie projektu.
- **MIDI (host):** Start/Stop/Continue/SPP z wejścia; Program Change OUT przy załadowaniu projektu; Program Change IN ładuje projekt po numerze programu (SSOT serwera).

#### 🖥️ App Shell & UI

- **Admin Scena — Komunikaty:** lista aktywnych komunikatów z usuwaniem pojedynczym i „Wyczyść wszystkie”; bez statusu „Wysłano do wszystkich”.
- **Client — partytura ([#465](https://github.com/Negatywistczny/stagesync/pull/465)):** MusicXML z synchronizacją playheada, seek po kliknięciu taktu, zoom i śledzenie wskaźnika; wybór partii oraz oktawa (−1/0/+1) z Live Desk.
- **Client — strój, Formy i tap:** C / B♭ / E♭ / ręczna (−6…+6); polskie nazwy sekcji Formy; Karaoke/Grid z live transpozycją akordów; ↑/↓ przełącza linię kolejki (obok Spacji).
- **Chrome ([#443](https://github.com/Negatywistczny/stagesync/issues/443)):** wspólny nagłówek Level 1 (ukrywany w Desktop); Timeline Level 2 z klastrem utworu po prawej.
- **Admin:** zwijany inspector Utwory; kopiowanie URL-i sieci Host; token lifecycle w ustawieniach; Escape czyści filtry biblioteki.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Menu OS ([#443](https://github.com/Negatywistczny/stagesync/issues/443), Faza D):** Edycja — Cofnij/Ponów/Usuń (z wyszarzaniem bez historii); Widok — Powiększ / Pomniejsz / Rzeczywisty rozmiar; Pomoc — Skróty; czytelniejsze błędy transportu i sąsiadów setlisty.
- **Diagnostyka ([#351](https://github.com/Negatywistczny/stagesync/issues/351)):** rotujący log hosta, handlery crashy, eksport ZIP z Admin Host / menu Pomoc; osobny log sidecara.
- **Instalator Windows ([#396](https://github.com/Negatywistczny/stagesync/issues/396)):** `StageSync_{version}_x64.msi` (bez `_en-US`); zwinięte notatki updatera w release; `latest.json` przy rename.

#### ⚙️ Serwer & API

- **Komunikaty sesji:** aktywne komunikaty z usuwaniem (REST + WS dismiss / snapshot przy connect).
- **Migracja v4→v5:** rok i okładka; MusicXML oraz lokalne okładki/audio → assets; CLI z katalogiem uploadów kopiuje pliki.

#### 📚 Dokumentacja

- **API:** REST + WebSocket (Project, Assets, Transport, Setlist, Stage, MIDI, System) — w tym komunikaty sesji, `POST /api/midi/panic` i presence.

### Zmieniono

#### ⏱️ Timeline & DAW

- **Pomoc:** zakładki **⌨️ Skróty Klawiszowe** (domyślna, zwarta siatka 3 kolumn) i **📖 Opis Narzędzi & Ścieżek** (kafelki Podstawy / Locator / Zaznaczanie / Ścieżki Audio); skrót `?` bez zmian.

#### 🖥️ App Shell & UI

- **Ustawienia (Admin):** jedno okno **Ustawienia** (Audio/MIDI/Metronom + Serwer: port/bind/mDNS, logi, kanał Stable/Beta/RC, ścieżki z pickerem); Odrzuć/Zapisz dla draftu lokalnego i `.env`; przycisk **Ustawienia** zamiast Wygląd.
- **Dirty draft:** usunięta etykieta „niezapisane”; przy niezapisanych zmianach wyróżnione **Zapisz** i **Odrzuć** — Preferencje oraz chrome Timeline.
- **Client — partytura:** ustawienia (zoom, oktawa, śledzenie playheada, widoczne partie) w oknie **Partytura**, bez pływającego toolbara nad nutami.
- **Admin Utwory — master-detail:** lewa kolumna (szukaj / sort / + Nowy Utwór + lista + zwijane Wzory); prawa tylko inspector wybranego utworu; import/eksport JSON i UG w menu **Zarządzaj bazą ▾**.
- **Admin Set:** pasek **Czas** / łączny czas (domyślnie 45 min); pusty stan z przeciąganiem oraz **+ Dodaj przerwę** / **Wczytaj szablon**; pozycje **Przerwa / Zapowiedź** w minutach (w sumie, bez auto-advance).
- **Admin Scena:** układ reżyserski — Master Bar **Korekta na scenie** nad siatką **Komunikaty** | **Klienci**; panel komunikatów z priorytetem Alert/Normal i TTL 6/10/15/30/∞.
- **Admin Host:** diagnostyka 2-kolumnowa (Sieć & QR / telemetria / O aplikacji | konsola logów); Preferencje MIDI/Audio przez Cmd/Ctrl+, bez atrapy „Ustawienia hosta” i „Kopie zapasowe”.
- **Preferencje Audio:** sekcje **Urządzenia Wyjściowe** i **Parametry Silnika**; bez zbędnego hintu „Wybór zapisywany lokalnie.”
- **Client / Komunikaty:** większe toasty sceniczne (`TERAZ` / `ZA N`) z kolorami success/alert i animacją wejścia — układ jak w v4.
- **Mobile / tablet:** wspólne progi telefon / tablet; na telefonie Timeline — większe cele dotykowe, wąski dock, Inspector jako drawer, Tempo/Metrum/Tonacja tylko do odczytu; bez poziomego overflow. Desktop bez zmian układu.
- **Design system:** typografia, odstępy i touch targety w Admin / Client / Timeline zgodne z gęstością design systemu.

#### ⚙️ Serwer & API

- **Ustawienia hosta:** odczyt/zapis ustawień systemu + przeglądanie katalogów; bind host; filtr kanału aktualizacji; flaga mDNS w sieci.
- **Cue TTL:** wartość 0 = ∞ (REST + WS); Admin wysyła 0 zamiast cichego spadku do 6 s.
- **Walidacja i timebase:** ściślejsze limity długości, BPM (20–400) i metrum; konwersje ticks↔BBT oraz snap respektują mapę metrum.
- **Serwer:** restart/shutdown LAN za tokenem lifecycle; limity ramek WebSocket; atomowy zapis JSON; blokada cold-seed biblioteki; PUT nie przywraca usuniętych klipów audio.

### Naprawiono

#### ⏱️ Timeline & DAW

- **Różdżka:** poprawione szacowanie długości w taktach (osobne reguły dla Tekstu i Akordów); zakres zaznaczenia + toast wyniku; Forma bez zmian.
- **Pomoc i i18n:** skróty zsynchronizowane z kodem (schowek, zoom, Fit Zoom, nożyczki, pętla); polskie etykiety narzędzi.
- **Metrum i snap:** zmiana metrum od Taktu 1 przelicza przedtakt; snap do beatu odcinkowo po mapie metrum.
- **Chrome Timeline:** przywrócony układ tools | transport | utwór; wyśrodkowany przycisk oka w docku; playhead/locator od górnej krawędzi pasa beatów; suwaki zoom w kolorze primary.
- **Stabilność edycji:** ochrona przed nakładającymi się komendami transportu; jaśniejszy konflikt zapisu przy równoległej edycji; anulowanie pobierania przy zamknięciu pickera/uploadu; limit 64 ścieżek audio w UI.
- **Setlista ([#363](https://github.com/Negatywistczny/stagesync/issues/363)):** `[` / `]` przełączają utwór (obok Alt+←/→); Pomoc zgodna z kodem.

#### 🎛️ Audio / MIDI / Transport

- **Playback:** poprawna obwiednia fade in/out i loop z oknem trim; dźwięk gaśnie od razu przy Pause/Stop (bez czekania na potwierdzenie serwera).
- **Transport:** po załadowaniu projektu playhead wraca na początek Countdown; odpowiedzi REST zawierają czas serwera; cue sceniczny nie jest już mylony z tickiem transportu.

#### 🖥️ App Shell & UI

- **Client — partytura:** poprawne ładowanie skompresowanego MusicXML (`.mxl`); brak crasha przy otwarciu Score.
- **Admin Host — QR:** kod QR i domyślny URL używają adresu LAN (nie `localhost`), żeby telefon muzyków mógł się połączyć.
- **Client / Komunikaty:** klipy Cue z Timeline jako `TERAZ` / `ZA N` (~5 s wcześniej) z filtrem ról i priorytetem Alert; live komunikat wygrywa slot `TERAZ`; pusty stan bez placeholdera.
- **Client Karaoke / Grid:** aktywna linia na środku ekranu; w pauzach między frazami brak podświetlenia; karuzela Grid bez mrugnięcia na końcu przesunięcia wersów.
- **Client:** ikony stroju jak w v4; Spacja (tap wokalu) nie przechwytuje fokusu w polach tekstowych ([#363](https://github.com/Negatywistczny/stagesync/issues/363)); suwaki stroju i skali Karaoke w kolorze primary.
- **Mobile:** toolbar Timeline, header Client oraz zakładki Admin zawijają się bez poziomego overflow.
- **Preferencje / Host:** Audio / MIDI jako zakładki z podkreśleniem; metryki MIDI w jednej kolumnie; „Aktywny set” i „Auto-setlista” obok siebie na wąskim ekranie.
- **Admin / Client:** ignorowanie przestarzałych odpowiedzi poll/refresh; cue sceniczny tylko dla pasujących ról i czyszczony po rozłączeniu WS; czytelne błędy fullscreen / restart Host.

#### 📦 Packaging & Desktop (Tauri / Docker)

- **Desktop:** upuszczanie plików w WebView Tauri — import biblioteki i przeciąganie setlisty znów działają.

## [5.0.0-beta.2](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-beta.1.1...v5.0.0-beta.2) - 2026-07-21

> **β2:** ścieżki Audio 0…N, MIDI I/O na hoście, menu OS Plik / Host / Transport, Stop wracający do Countdown; aktualizacje desktop dla macOS i Windows.

### Dodano

- **Desktop OS menu:** natywne **Plik** (Otwórz ostatnie / Zapisz / Zamknij), **Host** (status, klienci, QR z LAN URL, restart, ustawienia), **Transport** (Play/Stop/prev/next). Dialog QR z URL LAN w aplikacji.
- **Host MIDI I/O + clock:** lista / wybór urządzeń, clock OUT zsynchronizowany z transportem SSOT (Start/Continue/Stop/SPP/Clock), metryki Admin → Host; API MIDI config. Bez MIDI w procesie Tauri ([ADR 0010](docs/architecture/adr/0010-desktop-shell-tauri.md) / [ADR 0002](docs/architecture/adr/0002-timebase-ssot.md)).
- **Audio 0…N (Timeline):** lane’y w menu oka (+ Ścieżka Audio), clipy move/trim (Pointer/Smart; bez pencil), waveform peak/RMS, gain/mute clip + fader/mute track; odtwarzanie sync do ticków serwera ([ADR 0008](docs/architecture/adr/0008-timeline-clip-editing.md), [#42](https://github.com/Negatywistczny/stagesync/issues/42)).

### Naprawiono

- **Transport Stop / Countdown ([#41](https://github.com/Negatywistczny/stagesync/issues/41)):** Stop wraca na początek pre-roll (start clipu Forma Countdown), nie na tick 0 „po CD”; locator Timeline też — Play od odliczania działa bez ręcznego szukania CD.
- **Desktop updater:** `Could not fetch a valid release JSON` — endpoint Tauri (`…/releases/latest/download/latest.json`) 404, bo wszystkie alpha/beta były GitHub **prerelease** (API `/releases/latest` je pomija). Release `v5.0.0-beta.1.1` odznaczony; `release.yml` zawsze publikuje jako `--latest`. Poprawione URL-e właściciela repo w UI (Host, Pomoc).
- **Desktop updater (darwin w `latest.json`):** target bundle `app` obok `dmg` — bez `app` bundler nie tworzy `.app.tar.gz`/`.sig`, więc macOS nie trafia do manifestu (zostaje Windows-only / last-writer). Sidecar health reject przy mismatch wersji.

## [5.0.0-beta.1.1](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-beta.1...v5.0.0-beta.1.1) - 2026-07-21

> **β1.1:** poprawka numeracji instalatora Windows dla zagnieżdżonych wersji `beta.N.M`; bez nowych funkcji produktowych.

### Zmieniono

- **Instalator Windows:** WiX poprawnie mapuje zagnieżdżone wersje `beta.N.M` (np. `.10101`), z zachowaniem shipped `beta.1` = `.10001`.

## [5.0.0-beta.1](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.13...v5.0.0-beta.1) - 2026-07-21

> **β1:** pierwszy milestone dystrybucyjny — aplikacja desktop (Tauri + wbudowany host), Docker jako wariant dodatkowy oraz aktualizacje na żądanie.

### Naprawiono

- **Admin → aktualizacje (desktop):** Host/Watchtower nie jest już czerwonym „twardym” błędem w shellu Tauri (sidecar pomija GitHub Releases; Watchtower = Docker). `Aplikacja: undefined` — normalize rejectów Tauri (`String` / brak `.message`). Porównanie hosta używa listy Releases **z prerelease** (nie `/releases/latest`, które 404 przy samych alpha).

## [5.0.0-alpha.13](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.12...v5.0.0-alpha.13) - 2026-07-21

> **α13:** hotfix — aplikacja Windows (.msi) znów startuje po instalacji.

### Naprawiono

- **Desktop (Windows):** sidecar Node padał przy starcie z MSI z `EISDIR: lstat 'C:'` — Tauri `resource_dir()` zwraca ścieżki Win32 `\\?\C:\…`, a Node przy takim main module path zawodzi ([nodejs/node#62446](https://github.com/nodejs/node/issues/62446)). Shell spawnuje teraz względne `dist/index.js` + cwd bez prefiksu verbatim; assert ścieżek + self-test w [`build-desktop-sidecar.mjs`](./apps/desktop/scripts/build-desktop-sidecar.mjs).

## [5.0.0-alpha.12](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.11...v5.0.0-alpha.12) - 2026-07-21

> **α12:** domknięcie — Desktop OS menu Faza A + hotfixy shella; Faza B+ → β1.

### Dodano

- **Desktop OS menu:** natywne **StageSync** | **Widok** | **Pomoc** — O programie / Sprawdź aktualizacje…; Admin·Timeline·Klient; zakładki Admina; pełny ekran; linki do dokumentacji i Issues.

### Naprawiono

- **Desktop (Windows):** mylący komunikat „port zajęty” przy starcie — shell czyta stdout/stderr sidecara, fail-fast przy crashu hosta, dłuższy timeout (~120 s) pod pierwsze skanowanie Defendera; docs troubleshooting w [DESKTOP.md](./docs/guides/DESKTOP.md).

## [5.0.0-alpha.11](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.10...v5.0.0-alpha.11) - 2026-07-21

> **α11:** desktop shell polish — menu OS Widok, wykrywanie sidecara, draft updater pipeline.

### Dodano

- **Desktop ([ADR 0010](docs/architecture/adr/0010-desktop-shell-tauri.md)):** menu OS **Widok** (Admin / Timeline / Klient) + **StageSync → Zakończ**; ostatni utwór Timeline w `localStorage` + sync do menu natywnego; deep link `/admin?section=host`.
- **Biblioteka:** domyślny wzór **Template** przy pierwszym uruchomieniu (seed [`library.template.json`](./apps/desktop/src-tauri/resources/sidecar/seed/library.template.json) + `seed-projects/`; parity z legacy v4).
- **Admin → O aplikacji:** przycisk „Zgłoś błąd lub pomysł” (GitHub Issues).

### Zmieniono

- **Admin → aktualizacje (desktop):** błędy sprawdzania aplikacji widoczne w UI; „Aktualizuj host” ukryte w standalone (Watchtower = Docker).
- **Desktop:** domyślne wejście `/admin` (Klient pod `/client`); natywny pełny ekran okna w shellu Tauri zamiast HTML Fullscreen API; layout bundla sidecara (`resources/sidecar` + symlink compat).
- **Shell:** modalne dialogi in-app zamiast `window.prompt` / `confirm` / `alert` (Admin, Timeline, pliki projektu).
- **Admin → O aplikacji:** układ dwukolumnowy (wersja / kopie zapasowe | dokumentacja / zgłoszenia / aktualizacje).

### Naprawiono

- **Desktop:** wykrywanie shella Tauri na `http://127.0.0.1:4000` (fallback hostname/port, meta `stagesync-shell`, marker na początku `<head>`, `Cache-Control: no-store` na HTML) — fullscreen / updater / `openExternalUrl` przy cache WebView bez injectu.
- **Desktop sidecar:** Tauri rozwija symlinki pnpm w bundle ([tauri#13219](https://github.com/tauri-apps/tauri/issues/13219)) — host padał z `ERR_MODULE_NOT_FOUND` (`zod` / transitive deps), a UI pokazywał mylący komunikat o zajętym porcie `4000`. [`build-desktop-sidecar.mjs`](./apps/desktop/scripts/build-desktop-sidecar.mjs) spłaszcza `node_modules` do realnych pakietów (bez `.pnpm`); assert + `--fix-app` / `--materialize-node-modules`.
- **Marka:** wordmark w logo SVG (`stagesync-logo*.svg`) — ścieżki wektorowe zamiast `<text>` (spójny render bez zależności od fontu); większa domyślna wysokość w shellach.

## [5.0.0-alpha.10](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.9...v5.0.0-alpha.10) - 2026-07-21

> **α10:** standalone desktop (Tauri + Node sidecar) — pierwszy build β1 host.

### Dodano

- **Standalone desktop ([ADR 0010](docs/architecture/adr/0010-desktop-shell-tauri.md)):** Tauri spawnuje wbudowany Node sidecar (`stagesync-host`), czeka na `GET /api/health`, ładuje UI; shutdown przy zamknięciu okna; czytelny ekran błędu przy konflikcie portu `4000`; dev fallback przez `STAGESYNC_URL` gdy brak bundla sidecara.
- **Desktop sidecar packaging:** `launch/scripts/build-desktop-sidecar.mjs` — Node runtime per architektura, `pnpm deploy --prod @stagesync/server`, web `dist`, seed [`library.template.json`](./apps/desktop/src-tauri/resources/sidecar/seed/library.template.json); `bundle.externalBin` + `bundle.resources` w Tauri; `STAGESYNC_SEED_DIR` w serwerze; CI `--smoke` (health + higiena docs).
- **β1 host / dystrybucja:** Docker Compose ([`Dockerfile`](./Dockerfile) + [`compose.yml`](./compose.yml), volume `data/`); docs [INSTALL.md](./docs/guides/INSTALL.md) / [DESKTOP.md](./docs/guides/DESKTOP.md); OCC `409` na stale `updatedAt` przy PUT projektu; shadow backup + migracja schematu volume przy starcie; ESLint ACL (web ↛ server, shared pure); API Zod `details`; CI Compose build + health smoke + `cargo check` desktop.
- **Folder danych użytkownika:** domyślny `STAGESYNC_DATA_DIR` = `~/Documents/StageSync` (desktop/host; macOS + Windows); dev: `STAGESYNC_REPO_DEV=1` zachowuje `<repo>/data`; Docker: jawne `/app/data` bez zmian ([ADR 0012](docs/architecture/adr/0012-user-data-location.md)).
- **β1 release pipeline:** `release.yml` (GHCR private, Tauri mac/win, minisign updater, GitHub Release); [`compose.prod.yml`](./compose.prod.yml) + Watchtower HTTP-only (update na żądanie, bez auto-poll).
- **β1 aktualizacje na żądanie (ADR 0004 amendement):** `GET /api/system/update-status` + `POST /api/system/apply-update` (Watchtower trigger); Admin → Sprawdź / Aktualizuj host; [`desktopBridge.ts`](./apps/web/src/lib/client/desktopBridge.ts) + Tauri updater (minisign); Admin → Aktualizuj aplikację w shellu Tauri.
- Pełny zestaw ikon Tauri (`icons/icon.icns`, [`icon.ico`](./apps/desktop/src-tauri/icons/icon.ico), [`32x32.png`](./apps/desktop/src-tauri/icons/32x32.png) itd.) z marki [stagesync-mark.svg](apps/web/public/brand/stagesync-mark.svg).
- **Dokumentacja in-app vs GitHub ([ADR 0013](docs/architecture/adr/0013-in-app-vs-github-docs.md)):** Timeline — skróty `?` / `Esc` dla overlay pomocy; Admin → O aplikacji — link „Pełna instrukcja na GitHubie”, bilan hosta, `open_external_url` w Tauri; `.gitignore` artefaktów sidecar; assert higieny docs w [`build-desktop-sidecar.mjs`](./apps/desktop/scripts/build-desktop-sidecar.mjs).

### Zmieniono

- Shell headers (Admin / Timeline / Client): wordmark tekstowy → SVG logo (`/brand/stagesync-logo*.svg`, wariant light przy `data-theme`).
- `PUT /api/projects/:id`: body wymaga `updatedAt` (token OCC); mismatch → 409.
- `@stagesync/shared` package exports → `dist/` (Node runtime / Docker).

## [5.0.0-alpha.9](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.8...v5.0.0-alpha.9) - 2026-07-21

> **α9:** migrator legacy v4→v5 (M1–M9) oraz domknięcie parytetu zachowania Client / Timeline / Admin.

### Usunięto

- **Timeline:** Różdżka (wand) ukryta w toolbarze / skrócie W do naprawy zachowania (core `wandContentToForma` zostaje).
- **Client:** stopka `transportNote` (Play/Pause · BPM) — status transportu zostaje w headerze (metronom / takt).
- **Admin Utwory:** duplikaty **Eksport** / **Import UG** z nagłówka listy — zostają tylko w kafelku **Pliki** (pod Wybrany).
- **Admin Utwory:** filtr Wszystkie / Ostrzeżenia — lista zawsze pokazuje wszystkie utwory.
- **Admin:** zakładka **Pliki** — kafelek importu (`.stagesync.json` / legacy) przeniesiony pod **Wybrany** na Utwory.
- **Admin Utwory:** przełącznik Ukryj/Pokaż panel (split) — prawy panel „Wybrany” zawsze widoczny.
- **Admin footer:** usunięte atrapy disabled „MIDI / Timeline” oraz Tr. / Lead / Edycja zdalna (brak API; wrócą z Live Desk). Status Teraz/Sekcja/Pozycja/Dalej/Połączenie bez zmian.
- **Timeline:** przełącznik Ukryj/Pokaż Właściwości — panel inspector zawsze widoczny.

### Dodano

- **Timeline:** panel narzędzi pod **T** (menu przy kursorze + litery jak v4); **Alt/⌥+drag** = duplikat clipów (TE-07); live preview multi-drag; loop region **snap na podglądzie** (beat; Cmd/Ctrl = off).
- Docs: playbook PO smoke P8 (`report-po-smoke-p8.md`); higiena scope α8 (suwaki Zoom H/V/UI wchłonięte w rebuild, tool lupa OUT).
- **Client stage content (override ADR 0011 — treść tylko):** wizualny port Karaoke / Grid / Forma / Score stub z v4 `client.css` (fonty, kafelki, hero Formy + poziomy strip, pasek taktów karaoke); chrome (header, settings, role buttons) zostaje v5. CL-P0: progress `--beat-progress` w sekcjach bez tekstu, karuzela Grid + hero „nast.”, Forma past/current. Inventarz CL-R-* = content clone.
- **Migrator M9:** fixture `docs/examples/legacy/database.typical.json` (usunięty po #841) + pack v5 [`docs/examples/v5/library.pack.sample.stagesync.json`](./docs/examples/v5/library.pack.sample.stagesync.json); smoke testy + dry-run w CI.
- **Admin:** przycisk pełnego ekranu w headerze (jak Timeline / Client).
- **Admin Utwory (pod Wybrany):** import legacy `database.json` z auto-detect (v5 pack vs 4.x `songs[]`) + migracja `migrateLegacy`* przy `POST /api/library/import`; ZIP odroczony (komunikat PL).
- **Timeline:** marquee + multi-select (`items` id+lane / `primaryId`; zaznaczenie **cross-lane** jak v4) + multi-drag same lane (live preview całej grupy; po puścieniu zachowane zaznaczenie) + clipboard ⌘C/X/V/D (Forma/Tekst/Akordy/Cue; paste przy locatorze; copy = primary lane); hit-test `data-clip-lane`; pusty obszar pod trackami = marquee/clear — parity zachowania v4, nie clone CSS.
- **Timeline:** ręczna wysokość ścieżki (drag na dolnej krawędzi docka; dwuklik = Zoom V; `localStorage`; Zoom V zachowuje proporcje) — jak v4 `laneHeights`.
- **Web:** ekran błędu trasy (`errorElement`) + root ErrorBoundary — Odśwież / Client / Admin zamiast białego ekranu.
- **Host Restart / Wyłącz:** `POST /api/system/restart|shutdown` + potwierdzenie 2× (jak v4); sieć `GET /api/system/network`.
- **Schema v5:** `keyMap`, `midiProgramId`, `isTemplate`, `artist` / `genre` / `year`; katalog biblioteki z PC / wzorami / `hasMusicXml`.
- **Admin parity:** Batch PC, Ostrzeżenia, kolumna PC, Wzory (nowy z wzoru), Eksport/Import `.stagesync.json`, MusicXML upload.
- **Timeline:** Tonacja (keyMap) edit/readout, Tempo BPM przy playheadzie, suwaki Zoom H/V/UI, metadane PC/artysta/gatunek.
- **Wygląd:** jasny motyw + wysoki kontrast (`data-theme` / `data-contrast`) w Admin / Timeline / Client.
- **Client:** skala tekstu karaoke, auto-scroll, score zoom lokalny; appearance w drawerze globalnym.
- **Timeline parity follow-up:** Metadane (tytuł / defaultBpm), Loop (region na linijce + `POST /api/transport/loop` SSOT), Follow playhead, Tekst/Akordy/Cue move/resize/pencil, Kotwice (`scoreBarMap`), scissors content, Client H/B + Tap wokalu + notatki Formy.
- **Migrator α9 MVP:** `migrateLegacy`* + CLI `pnpm migrate:legacy` (./docs/guides/MIGRATION.md)); drop legacy `vl-cd-`* (cyfry CD = render Client, nie storage) + granice długości Tekst z restami (bez rozciągania „1” w utwór).
- **Admin:** Host logi SSE (`/api/system/logs/stream` + Pauza/Wyczyść); Scena **presence** (`GET /api/stage/clients` + WS `client_hello`).

### Zmieniono

- **Client:** usunięty pasek `rolePaneHead` (etykieta roli + czarny strip nad treścią); ustawienia roli jako floating gear (jak v4), bez chrome nad sceną.
- **Client:** górny pasek (header) zawsze przyklejony — shell `100dvh` + `position: sticky`; treść przewija się poniżej.
- **Admin Scena:** kolumna **Klienci** szersza (`fr` / `minmax`, nie cap MIDI Host) — listy presence mniej ściśnięte.
- **Admin Host MIDI:** kafelki liczników wypełniają panel (siatka 2×2); wartość pod etykietą, wycentrowane.
- **Admin Host:** Ustawienia / Restart / Wyłącz w chrome headerze (`ShellIconButton`, kolejność jak v4); Sieć na pełną szerokość rzędu.
- **Proces:** α8 rebuild = **code freeze** (engineering); α9 must (migrator + **P8 green 2026-07-21**); β1 na prośbę (`report-parity-blocker-alpha8.md`).
- **Admin Wybrany:** przycisk „Zapisz nazwę” w tym samym rzędzie co pole nazwy.
- **Admin Utwory:** lista pokazuje `tytuł - artysta` (artysta po „-” bez pogrubienia, muted), gdy `artist` jest ustawiony.
- **Countdown cyfry:** nie są już zapisywane jako clipy Tekst/Akordy (`vl-cd-`*); Client (karaoke / grid) syntetyzuje „2…1” z długości Forma Countdown; migracja / `setCountdownBars` tylko scrubuje stare digit clipy (TE-21).
- **Admin Host:** karta **Sieć** (port / hostname / URL-e z `GET /api/system/network`) zawsze widoczna na zakładce Host; w Ustawieniach tylko krótkie odesłanie + path picker.
- **Admin Host:** Logi (SSE) w lewej kolumnie, MIDI (β2 stub) w prawej — siatka `twoUp`.
- **Admin:** scroll tylko wewnątrz kafelków (listy / body karty / logi) — shell `100dvh` bez przewijania całej strony; chrome + status nieruchome.
- **Admin:** treść paneli (karty / split) w wycentrowanej kolumnie max-width — bez bloczków na całą szerokość viewportu; chrome zakładek i status footer bez zmian.
- **Timeline Tonacja:** tonic + tryb wąskie, w jednym rzędzie (jak Metrum `x / y`).
- **Timeline Metrum:** edycja jako `x / y` (bez etykiet Licznik/Mianownik).
- **Timeline clipy:** kolorowe przezroczyste skóry lane (`color-mix` ~16–20% fill / ~45% border: Forma primary, Tekst info, Akordy primary, Cue warning, Kotwice success, mapy info, Countdown dashed muted); selected = mocniejszy outline/`selected-border` bez żółtego flood.
- **Timeline canvas:** Zoom V (`--tl-row-h`) / Zoom UI (`--tl-zoom-ui`) skalują lane + ruler chrome; suwaki zoom `accent-color: primary`; barlines z `meterMap`; beat ticks na ruler gdy px/bar ≥ 56.
- **Timeline gesty:** Forma snap do musical barlines (meterMap); Tekst/Akordy/Cue snap do beatu; szersze hit zones trim (12px); Cmd/Ctrl = snap off.
- **Timeline mapy:** Tempo/Metrum/Tonacja — snap beat; eraser nie rusza seed przy 0.
- **Timeline chrome:** header grid (song center, ≤1100); help ~72rem; bez narzędzia Zoom (lupa) na pasku — zoom = suwaki H/V/UI (+ Ctrl/Meta+wheel); metadane ⓘ close clears sheet.
- **Client stage:** karaoke pełna lista linii + center scroll (jak v4), hero akord + next, Forma sekcja/notatka/lista; header wtórny.
- **Admin Set:** biblioteka + kolejność w jednym flow; gęstsze karty.
- **Timeline touch:** `data-tl-tier` (mobile RO / tablet nudge).
- Client — wybór roli: hover/selected tylko black/amber (`selected`); usunięte tęczowe `--ss-color-role-*` (mapowanie na success/warning/focus-ring).
- **Rebuild alpha:** ADR 0003 + konstytucja + TODO / parity-blocker / inventarz — inventarz-first i „engineering READY” **odrzucone**; done = PO smoke zachowania; Admin Set + wybór utworów w jednym flow.
- Client — ekran wyboru roli: duże kafle z ikonami (układ jak v4), hero „Wybierz rolę”, dynamiczny hint i pasek Rozpocznij.
- **Timeline:** ukryte lane’y audio / `+ Audio` / eye-toggle audio do β2 (schema v3 refs bez zmian).

### Naprawiono

- **Client Grid (karuzela / hero):** translateY przy zmianie podsekcji nie restartuje się na każdym ticku playheada (wcześniej `cycle` w deps + cleanup bez finish → `carouselBusy` / animacja stuck); hero fly/exit nie jest zdzierany przez reconcile React (`StaticDomAnchor` + stabilne `className` na rootach motion).
- **Client Karaoke — przedtakt:** linia Tekst z onsetem w ostatnim takcie poprzedniej części Formy (nachodzi na granicę) trafia do **następnej** sekcji — jak v4 `resolveVocalSectionId`; cyfry Countdown zostają na CD.
- **Client Karaoke (Tekst):** tekst w kartach sekcji Formy (nagłówki jak v4); pasek taktów tylko gdy sekcja bez realnego tekstu; highlight linii = kolor/glow (bez scale-pulse co beat); scroll do środka tylko przy zmianie aktywnej linii/sekcji (`karaokeScrollKey`).
- **Timeline grid miar:** przy Zoom H (effective px/bar ≥ 56, jak v4 `effectivePxPerBar`) widać podziały beatów — pełne ticki na ruler + linie w lane grid (wcześniej tylko krótkie, prawie niewidoczne ticki na linijce).
- **Timeline dock / wiersze:** ciągła sticky szyna docka (jak v4 `.timeline-dock`) + nieprzezroczyste tło wierszy; widoczne szwy ścieżek w docku (`inset` border jak v4); bez `opacity` na lane muted i bez card-radius na lane (szczeliny / prześwit grida między szwami); bar-grid tylko na prawo od `--tl-dock-w`; fill pod ostatnią ścieżką.
- **Timeline Forma:** znaki podziału podsekcji za etykietą sekcji (z-index jak v4), nie przed tekstem.
- **Migracja / Forma podsekcje:** sekcje z legacy (i już zmigrowane projekty bez `subsections`) dostają domyślne granice 4-taktowe jak v4 (`defaultSubsections4Bar`); Countdown bez podsekcji; istniejące niepuste `subsections` bez nadpisania; `ensureFormaSubsections` przy odczycie/zapisie projektu.
- **Timeline dock:** kolumna etykiet ścieżek / narożnik ruler nieprzeźroczysta (`--ss-color-surface`) — grid i locator/playhead nie prześwitują (bez `opacity` na sticky cell).
- **Timeline Zoom H / clipy:** szerokość paint = geometria tick→px (`clipStylePx` / `segmentStylePx`) — bez flooru 4px i bez pompowania boxa przez padding/border (border-box + `min-width: 0`; etykieta ellipsis wewnątrz); gęste Akordy/Tekst nie nachodzą wizualnie mimo rozłącznych ticków (PO).
- **Client:** wskaźnik połączenia w headerze (kropka + Połączony/Rozłączony) oraz opóźnienie sieci (`N ms`) z ticków transportu (`sentAtMs`) — regresja vs v4 `#connection-indicator`.
- **Import UG / Akordy:** linia akordów + tekst = jeden takt jak w v4 (onsets w takcie, długość do następnego) — bez nachodzenia; przy move/split zachowany symbol remnantu (`-r`).
- **Migrator legacy → akordy:** długość = do następnego onsetu (nie min=takt) + poprawne mapowanie indeksów po sortowaniu — gęste utwory typu Money bez nachodzenia; `sealAkordyLengths` na wyjściu.
- **Timeline Countdown:** rozciąganie długości gestem (body / prawa krawędź, snap do taktów) + shift treści jak v4; lewa krawędź zablokowana (komunikat); inspector `setCountdownBars` z renormem końca CD przy ticku 0; po zmianie długości — regeneracja cyfr CD w regionie Countdown; podczas gestu — scroll na początek timeline (widoczne nowe takty CD) + delta z clientX; grid/ruler dzielą takty też w pre-roll CD.
- Admin — wiersze wzorów / Batch PC / Scena / Pliki: siatka bez fałszywej kolumny PC, żeby przycisk „Nowy z wzoru” nie zasłaniał nazwy.
- **Timeline parity vs v4:** locator/loop snap do beatu (Cmd/Ctrl = off); locator `primary` vs playhead `info`; playhead nie jako linia przy pause; toolbar transport/BBT wyśrodkowany; Zoom UI mnoży H+V; meta year + editable metrum/tonacja przy 0.
- **Timeline chrome (korekta bez decyzji PO):** Odrzuć/Zapisz z powrotem jako **ikony**; metronom + follow w **center** przy transporcie; footer bez dublowania Utwór/Pozycja/Połączenie/Stan (conn-dot + zoom jak v4).
- **Timeline sterowanie:** Ctrl/Meta+wheel (H zoom), Alt+wheel (V/H), Shift+wheel (scroll H); skróty Space / K / C / ⌘S / Z-fit / ←→ locator.

## [5.0.0-alpha.8](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.7...v5.0.0-alpha.8) - 2026-07-20

### Dodano

- **Lane Akordy / Cue:** pencil, select, Delete/eraser, inspector (`symbol` / `label`); no-overlap; Client **grid** czyta `akordy.clips`.
- **Scissors Forma:** `splitClipAt` + tool; Countdown nietykalny.
- **Tap** (dock Tekst): tap tempo → `tempoMap` przy locatorze.
- **Różdżka:** Tekst→Forma, Akordy→Forma, Tekst+Akordy→Forma (`wandContentToForma`).
- **Import UG:** Timeline song screen + Admin; parser Zod Result (`importUgText`); zły input = komunikat UI.
- **Undo/Redo sesji:** stos draftu; po Zapisz `dirty=false` i stos zostaje; Odrzuć = snapshot serwera + clear stos; ⌘/Ctrl+Z.
- **Metronom:** Web Audio klik sync z transportem; `AudioContext.resume()` na Play / toggle.
- **Client:** →następny (setlista), fullscreen; **score** stub MusicXML (OSMD wire).
- **Admin:** filtr + sort utworów; Scena filtr ról w cue; Import UG do zaznaczonego utworu.

### Zmieniono

- Inventarz UI: odhaczone must α8; świadome delty (zoom, Host MIDI, audio tracks, Batch PC bez schematu).

## [5.0.0-alpha.7](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.6...v5.0.0-alpha.7) - 2026-07-20

### Dodano

- **Timeline Forma:** pencil drag (zakres taktów), pointer/Smart move + resize brzegów, Delete/Backspace + eraser; transakcyjny `gesturePreview` (commit na pointerup); no-overlap w `@stagesync/shared` (`clip-collision`); Countdown nietykalny; sekcje `startTicks >= 0` ([ADR 0008](docs/architecture/adr/0008-timeline-clip-editing.md)).
- **Smart Tool** w toolbarze; strefy trim/move tylko przy Pointer/Smart — Pencil = exclusive draw.
- **Snap:** Cmd/Ctrl = chwilowy snap off, ewaluacja `metaKey`/`ctrlKey` na każdym `pointermove` ([ADR 0007](docs/architecture/adr/0007-snap-grid.md) faza 3).
- **Schema v4:** lane’y `tekst` / `akordy` / `cue`; upgrade v3→v4; seed puste tablice.
- **Lane Tekst MVP:** pencil click, select, Delete, inspector tekst; Client karaoke czyta linię z clipu.

### Zmieniono

- Canonical `Project` = v4; Tap / UG / Różdżka / Scissors / Zoom pozostają disabled (cut α7).

## [5.0.0-alpha.6](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.5...v5.0.0-alpha.6) - 2026-07-20

### Dodano

- **Schema v3:** `assets[]`, `audioTracks[]`, `audioClips[]`; upgrade v2→v3 przy odczycie; `projectEndTicks` (fallback 2 takty).
- **Pliki projektu:** import audio (multipart) do `data/projects/<id>/assets/`; lista/usuń w inspectorze Admin; merge-preserve przy PUT (race z uploadem).
- **Setlista:** `data/library/setlist.json`; API GET/PUT + auto-advance; zakładka Set (dodaj, drag, zapisz); footer **Dalej** / **Teraz** z transportu.
- **Timeline:** lane’y audio read-only z v3 (placeholder bez playback); Stop; prev/next / auto-setlista w headerze.
- **Scena (minimal):** `POST /api/stage/message` + cue na Client przez WS.
- **Client:** empty states `grid` / `score` (α7); toast komunikatu sceny.

## [5.0.0-alpha.5](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.4...v5.0.0-alpha.5) - 2026-07-20

### Dodano

- **Client karaoke:** rola Tekst z live kontekstem projektu (sekcja Formy, BBT, tempo/metrum przy transporcie); placeholder braku linii wokalu (`KaraokePane`, [`clientKaraoke.ts`](./apps/web/src/lib/client/clientKaraoke.ts)).
- **Client shell:** `useActiveProject`, `DrumsPane`; ikony kart ról na ekranie welcome (parity v4).
- **Timeline:** tokeny warstw `--ss-z-`*; locator (bursztynowy) + playhead MIDI (cyjan) na linijce w stylu v4.

### Naprawiono

- Timeline: warstwy z-index (playhead nad clipami); eye w ruler dock (bez pustego wiersza ścieżki); menu widoczności przez portal (bez clipu scroll).
- Timeline: przeciąganie locatora po linijce; typografia numerów taktów (`tabular-nums`, semibold).

## [5.0.0-alpha.4](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.3...v5.0.0-alpha.4) - 2026-07-20

### Dodano

- **Timeline track grid:** wspólna siatka wierszy dock ↔ lane (`trackRow`, sticky dock); kolejność v4 (Specjalne nad treścią); eye menu per ślad ([`timelineTracks.ts`](./apps/web/src/lib/timeline/timelineTracks.ts)).
- **Lane Tempo/Metrum:** read-only segmenty z `tempoMap` / `meterMap` ([`mapSegments.ts`](./apps/web/src/lib/timeline/mapSegments.ts)).
- **Inspector Formy:** rename sekcji + długość Countdown (takty) → draft → PUT ([`formaInspector.ts`](./apps/web/src/lib/timeline-edit/formaInspector.ts)).
- **Dirty guard:** `beforeunload` + React Router `useBlocker` przy nawigacji z niezapisanym draftem.
- `loadTransport` **w Timeline:** jawne ładowanie map przy otwarciu projektu.
- **Admin:** przycisk ukrycia panelu na krawędzi splitu; empty state „Pliki projektu”.

### Zmieniono

- Router web: `createBrowserRouter` (wymóg `useBlocker`).

### Naprawiono

- Transport: clamp ujemnego elapsed przy skew zegara (M15); ignorowanie starszych ticków WS po `serverTimeMs` (M12).
- Walidacja klienta transportu Zod przed fetch (M1); zakres beat/tick w `bbtToTicks` (M3).

## [5.0.0-alpha.3](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) - 2026-07-20

### Dodano

- **ProjectSchema v2** (strict): `forma.clips`, `tempoMap`, `meterMap`, seed Countdown
  −7680; resolvery `resolveTempoAt` / `resolveMeterAt` / `resolveFormaClipAt`; auto-upgrade v1→v2.
- **API treści:** GET/PUT pełny [`project.json`](./apps/desktop/src-tauri/resources/sidecar/seed/seed-projects/00000000-0000-4000-8000-000000000001/project.json); transport z `activeProjectId`, play/seek z map
  projektu; `POST /api/transport/load`.
- **Timeline α3:** route `/timeline/:projectId`, Forma z danych, pencil, Zapisz/Odrzuć;
  song picker z biblioteki; read-only lane Tempo/Metrum.
- **Admin / Client:** link Timeline z wybranym id; status „Sekcja”; rola Client `drums` (Forma).
- **Chrome shelli:** wspólny `ShellWordmark`; `ShellIconButton`, `SettingsPopover`, `ConnectionIndicator`;
  Client — jednolinijkowy nagłówek, popovery ustawień (v4-style).
- **Snap grid (faza 1):** `quantizeTicks` w shared, domyślnie takt; ADR [0007](docs/architecture/adr/0007-snap-grid.md).
- **Stabilność storage/transport:** H1/H5 engine, H2–H4 library CRUD, `ProjectIdSchema` (UUID).
- Dokumentacja: [docs/architecture/api/](docs/architecture/api/README.md) (PUT v2 + transport z map).
  tokeny `--ss-duration-fast|normal|slow`; ikony shelli przez Lucide.

## [5.0.0-alpha.2](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) - 2026-07-20

### Dodano

Dependabot (npm + github-actions, weekly); [CODEOWNERS](.github/CODEOWNERS).
checklista branch protection (status checks) w CONTRIBUTING; JSDoc `@example`
na helperach czasu / soft playhead (`@stagesync/shared`).

- Tokeny statusu `--ss-color-success` / `warning` / `info`; dokumentacja
  [docs/architecture/ui/](docs/architecture/ui/README.md) (kolory + Button 7 stanów / PWA); [docs/ROADMAP.md](docs/ROADMAP.md);
  checklista release w CONTRIBUTING; README `@stagesync/ui` i `@stagesync/shared`.
  [LICENSE](LICENSE) (MIT); [SECURITY.md](.github/SECURITY.md).
  foldery projektów), mapa pace layers, checklista ACL pod migrator / MIDI /
  audio.
  indeks ADR + słownik statusów ([docs/architecture/adr/README.md](docs/architecture/adr/README.md)).
- Fundament gęstości UI: skala `--ss-space-1…16`, elevation
  (`surface` / `elevated`), `border-muted`, scenic scrollbary, reguła
  `[ui-density.mdc](.cursor/rules/ui-density.mdc)`; Button `iconOnly` +
  focus outline / `@media (hover: hover)`; remap shelli Admin / Client /
  Timeline na tokeny spacingu.
- Tokeny typografii: `--ss-text-*` (w tym `control` pod Button/inputy),
  `--ss-font-weight-*`, `--ss-leading-*`, `--ss-tracking-*` (shells/`Button` bez
  ad-hoc wartości; Button = control + semibold + leading compact).
- Paleta domyślna black / amber (jak v4) w `--ss-*`; `--ss-color-on-primary` pod
  tekst na amber CTA.
- Admin — tworzenie / usuwanie / zmiana nazwy projektu z UI (Zod body przed
  fetch; `commandPending` blokuje listę i panel).
- Shelle UI: Admin — własny layout (chrome + sekcje + status), inventarz
  funkcji v4 (./docs/architecture/ui/ui-shell-inventory.md)); Client /
  Timeline — inventarz (osobny redesign); tokeny black/amber + CSS Modules;
  `TransportProvider` nad routerem; Audio 0…N; bez git-apply
  ([ADR 0004](docs/architecture/adr/0004-updates-docker.md)).
- Klient web: panel transportu (Play / Pause / Seek), WebSocket + soft playhead
  (`getDisplayTicks` w shared, rAF z `frameTime`), Vite proxy `/api` i `/ws`,
  `Button loading` na czas komend REST.
- Transport SSOT na serwerze: `GET|POST /api/transport` (play / pause / seek),
  WebSocket `/ws/transport` (~25 Hz); pozycja z anchor + elapsed (bez driftu
  `+=` na timerze); schematy Zod w shared.
- Kanon timebase w `@stagesync/shared`: integer ticks + `DEFAULT_PPQ` (960),
  helpery `ticksToBbt` / `bbtToTicks`, `toDisplayBar` / `fromDisplayBar`
  (oraz `quartersToTicks` / `ticksToQuarters` pod migrator).
- CRUD API projektów / biblioteki z persystencją w `data/` (`GET /api/library`,
  `POST|GET|PUT|DELETE /api/projects`) — Zod na krawędziach, seed z
  [`library.template.json`](./apps/desktop/src-tauri/resources/sidecar/seed/library.template.json), override `STAGESYNC_DATA_DIR` pod testy.
  ([CONTRIBUTING.md](.github/CONTRIBUTING.md)).
  inventarz kontrolek = parity v4 (./docs/architecture/ui/ui-shell-inventory.md)).

### Usunięto

- Float `absBeat` z `@stagesync/shared` (kanon pozycji = ticks + PPQ).

## [5.0.0-alpha.1](https://github.com/Negatywistczny/stagesync/releases/tag/v5.0.0-alpha.1) - 2026-07-19

### Dodano

- Bootstrap monorepo: Turborepo + pnpm workspaces
- `apps/web` — klient Vite + React (port 3000)
- `apps/server` — szkielet API Express (port 4000)
- `packages/shared` — schematy Zod i czyste helpery czasu
- `packages/ui` — kanoniczny `Button` (7 stanów) i tokeny `--ss-*`
- Układ `data/`: `library/`, `projects/`, `logs/` + szablon biblioteki

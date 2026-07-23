# Changelog

Wszystkie istotne zmiany w StageSync **5.x** są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
projekt stosuje [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

### Dodano

#### ⏱️ Timeline & DAW
- **Menu kontekstowe (PPM):** na klipie Forma / Tekst / Akordy / Cue / Audio — wytnij, kopiuj, wklej, duplikuj, usuń, mute (audio), rozdziel w miejscu kursora (gdzie dostępne), pokaż w Inspectorze; na pustej lane — wklej @ kursor, dodaj sekcję/treść/cue albo import audio; na nagłówku ścieżki audio — zmień nazwę / duplikuj / usuń (także w Mixerze).
- **Dock ścieżek audio:** multi-select (Shift = zakres, ⌘/Ctrl = przełącz); Solo/Mute na wszystkich zaznaczonych; ⌘/Ctrl+S/M na wszystkich ścieżkach; ⌥/Alt+S = solo wyłącznie tej ścieżki; dwuklik nazwy = zmiana w miejscu; dwuklik pustego docku = nowa ścieżka; dwuklik fadera = 0.0 dB; widok Mixer z tymi samymi kontrolkami kanału; w wąskiej kolumnie / niskiej wysokości ścieżki — nazwa ze skracaniem środka + S/M (fader się chowa, bez poszerzania docku).

#### 🖥️ App Shell & UI
- **Menu kontekstowe systemu:** natywne menu przeglądarki / Inspect Element wyłączone w całej aplikacji; w polach tekstowych (input / textarea) nadal dostępne wycinasie i wklejanie systemowe.

#### 📦 Packaging & Desktop (Tauri / Docker)
- **Launcher:** ekran startowy przed Adminem (wordmark StageSync) — uruchom lokalny host, wykryj StageSync w LAN (mDNS wybiera adres LAN, nie most Dockera / link-local) albo wpisz adres; czytelny status błędów (brak sieci, uprawnienia, log sidecara) zamiast białego ekranu; bezpieczne pomijanie uszkodzonej listy ostatnich hostów.
- **Launcher / sesja:** przy utracie połączenia z hostem komunikat z ponawianiem łączenia oraz (na desktopie lokalnym) powrót do wyboru hosta; crash lokalnego hosta wraca do Launchera zamiast zawieszenia; ostrzeżenie przy różnicy wersji aplikacji i zdalnego hosta.

### Naprawiono

#### 📦 Packaging & Desktop (Tauri / Docker)
- **Desktop / lokalny host:** zamknięcie okna albo wyjście z aplikacji zatrzymuje wbudowany host (port 4000 nie zostaje zajęty po Force Quit / samym zamknięciu okna na macOS); przy kolejnym „Uruchom lokalny host” porzucony proces hosta jest sprzątany automatycznie.

## [5.0.1](https://github.com/Negatywistczny/stagesync/compare/v5.0.0...v5.0.1) - 2026-07-23

### Zmieniono

#### 🖥️ App Shell & UI
- **Admin Host (desktop):** w O aplikacji tylko wersja aplikacji — bez etykiety Sidecar i bez notki o Watchtower/Docker.

### Naprawiono

#### ⏱️ Timeline & DAW
- **Kotwice XML:** bloczki synchronizacji taktów pozycjonowane na osi czasu (drag zmienia takt logiczny, bez pakowania jeden za drugim) ([#477](https://github.com/Negatywistczny/stagesync/issues/477)).
- **Tap wokalu:** Spacja ustawia start linii Tekstu przy playheadzie (nie na zparkowanym locatorze / takcie 1); przycisk Tap przy warstwie Tekst podświetla aktywny tryb ([#479](https://github.com/Negatywistyczny/stagesync/issues/479)).

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
- **Host MIDI I/O + clock:** lista / wybór urządzeń, clock OUT zsynchronizowany z transportem SSOT (Start/Continue/Stop/SPP/Clock), metryki Admin → Host; API MIDI config. Bez MIDI w procesie Tauri ([ADR 0010](docs/adr/0010-desktop-shell-tauri.md) / [ADR 0002](docs/adr/0002-timebase-ssot.md)).
- **Audio 0…N (Timeline):** lane’y w menu oka (+ Ścieżka Audio), clipy move/trim (Pointer/Smart; bez pencil), waveform peak/RMS, gain/mute clip + fader/mute track; odtwarzanie sync do ticków serwera ([ADR 0008](docs/adr/0008-timeline-clip-editing.md), [#42](https://github.com/Negatywistczny/stagesync/issues/42)).

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

- **Desktop (Windows):** sidecar Node padał przy starcie z MSI z `EISDIR: lstat 'C:'` — Tauri `resource_dir()` zwraca ścieżki Win32 `\\?\C:\…`, a Node przy takim main module path zawodzi ([nodejs/node#62446](https://github.com/nodejs/node/issues/62446)). Shell spawnuje teraz względne `dist/index.js` + cwd bez prefiksu verbatim; assert ścieżek + self-test w `build-desktop-sidecar.mjs`.

## [5.0.0-alpha.12](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.11...v5.0.0-alpha.12) - 2026-07-21

> **α12:** domknięcie — Desktop OS menu Faza A + hotfixy shelła; Faza B+ → β1.

### Dodano

- **Desktop OS menu:** natywne **StageSync** | **Widok** | **Pomoc** — O programie / Sprawdź aktualizacje…; Admin·Timeline·Klient; zakładki Admina; pełny ekran; linki do dokumentacji i Issues.

### Naprawiono

- **Desktop (Windows):** mylący komunikat „port zajęty” przy starcie — shell czyta stdout/stderr sidecara, fail-fast przy crashu hosta, dłuższy timeout (~120 s) pod pierwsze skanowanie Defendera; docs troubleshooting w [DESKTOP.md](docs/DESKTOP.md).

## [5.0.0-alpha.11](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.10...v5.0.0-alpha.11) - 2026-07-21

> **α11:** desktop shell polish — menu OS Widok, wykrywanie sidecara, draft updater pipeline.

### Dodano

- **Desktop ([ADR 0010](docs/adr/0010-desktop-shell-tauri.md)):** menu OS **Widok** (Admin / Timeline / Klient) + **StageSync → Zakończ**; ostatni utwór Timeline w `localStorage` + sync do menu natywnego; deep link `/admin?section=host`.
- **Biblioteka:** domyślny wzór **Template** przy pierwszym uruchomieniu (seed `library.template.json` + `seed-projects/`; parity z legacy v4).
- **Admin → O aplikacji:** przycisk „Zgłoś błąd lub pomysł” (GitHub Issues).

### Zmieniono

- **Admin → aktualizacje (desktop):** błędy sprawdzania aplikacji widoczne w UI; „Aktualizuj host” ukryte w standalone (Watchtower = Docker).
- **Desktop:** domyślne wejście `/admin` (Klient pod `/client`); natywny pełny ekran okna w shellu Tauri zamiast HTML Fullscreen API; layout bundla sidecara (`resources/sidecar` + symlink compat).
- **Shell:** modalne dialogi in-app zamiast `window.prompt` / `confirm` / `alert` (Admin, Timeline, pliki projektu).
- **Admin → O aplikacji:** układ dwukolumnowy (wersja / kopie zapasowe | dokumentacja / zgłoszenia / aktualizacje).

### Naprawiono

- **Desktop:** wykrywanie shella Tauri na `http://127.0.0.1:4000` (fallback hostname/port, meta `stagesync-shell`, marker na początku `<head>`, `Cache-Control: no-store` na HTML) — fullscreen / updater / `openExternalUrl` przy cache WebView bez injectu.
- **Desktop sidecar:** Tauri rozwija symlinki pnpm w bundle ([tauri#13219](https://github.com/tauri-apps/tauri/issues/13219)) — host padał z `ERR_MODULE_NOT_FOUND` (`zod` / transitive deps), a UI pokazywał mylący komunikat o zajętym porcie `4000`. `build-desktop-sidecar.mjs` spłaszcza `node_modules` do realnych pakietów (bez `.pnpm`); assert + `--fix-app` / `--materialize-node-modules`.
- **Marka:** wordmark w logo SVG (`stagesync-logo*.svg`) — ścieżki wektorowe zamiast `<text>` (spójny render bez zależności od fontu); większa domyślna wysokość w shellach.

## [5.0.0-alpha.10](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.9...v5.0.0-alpha.10) - 2026-07-21

> **α10:** standalone desktop (Tauri + Node sidecar) — pierwszy build β1 host.

### Dodano

- **Standalone desktop ([ADR 0010](docs/adr/0010-desktop-shell-tauri.md)):** Tauri spawnuje wbudowany Node sidecar (`stagesync-host`), czeka na `GET /api/health`, ładuje UI; shutdown przy zamknięciu okna; czytelny ekran błędu przy konflikcie portu `4000`; dev fallback przez `STAGESYNC_URL` gdy brak bundla sidecara.
- **Desktop sidecar packaging:** `launch/scripts/build-desktop-sidecar.mjs` — Node runtime per architektura, `pnpm deploy --prod @stagesync/server`, web `dist`, seed `library.template.json`; `bundle.externalBin` + `bundle.resources` w Tauri; `STAGESYNC_SEED_DIR` w serwerze; CI `--smoke` (health + higiena docs).
- **β1 host / dystrybucja:** Docker Compose (`Dockerfile` + `compose.yml`, volume `data/`); docs [INSTALL.md](docs/INSTALL.md) / [DESKTOP.md](docs/DESKTOP.md); OCC `409` na stale `updatedAt` przy PUT projektu; shadow backup + migracja schematu volume przy starcie; ESLint ACL (web ↛ server, shared pure); API Zod `details`; CI Compose build + health smoke + `cargo check` desktop.
- **Folder danych użytkownika:** domyślny `STAGESYNC_DATA_DIR` = `~/Documents/StageSync` (desktop/host; macOS + Windows); dev: `STAGESYNC_REPO_DEV=1` zachowuje `<repo>/data`; Docker: jawne `/app/data` bez zmian ([ADR 0012](docs/adr/0012-user-data-location.md)).
- **β1 release pipeline:** `release.yml` (GHCR private, Tauri mac/win, minisign updater, GitHub Release); `compose.prod.yml` + Watchtower HTTP-only (update na żądanie, bez auto-poll).
- **β1 aktualizacje na żądanie (ADR 0004 amendement):** `GET /api/system/update-status` + `POST /api/system/apply-update` (Watchtower trigger); Admin → Sprawdź / Aktualizuj host; `desktopBridge.ts` + Tauri updater (minisign); Admin → Aktualizuj aplikację w shellu Tauri.
- Pełny zestaw ikon Tauri (`icons/icon.icns`, `icon.ico`, `32x32.png` itd.) z marki [stagesync-mark.svg](apps/web/public/brand/stagesync-mark.svg).
- **Dokumentacja in-app vs GitHub ([ADR 0013](docs/adr/0013-in-app-vs-github-docs.md)):** Timeline — skróty `?` / `Esc` dla overlay pomocy; Admin → O aplikacji — link „Pełna instrukcja na GitHubie”, bilan hosta, `open_external_url` w Tauri; `.gitignore` artefaktów sidecar; assert higieny docs w `build-desktop-sidecar.mjs`.

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
- Docs: playbook PO smoke P8 ([report-po-smoke-p8.md](docs/analysis/reports/report-po-smoke-p8.md)); higiena scope α8 (suwaki Zoom H/V/UI wchłonięte w rebuild, tool lupa OUT).
- **Client stage content (override ADR 0011 — treść tylko):** wizualny port Karaoke / Grid / Forma / Score stub z v4 `client.css` (fonty, kafelki, hero Formy + poziomy strip, pasek taktów karaoke); chrome (header, settings, role buttons) zostaje v5. CL-P0: progress `--beat-progress` w sekcjach bez tekstu, karuzela Grid + hero „nast.”, Forma past/current. Inventarz CL-R-* = content clone.
- **Migrator M9:** fixture `docs/examples/legacy/database.typical.json` + pack v5 `docs/examples/v5/library.pack.sample.stagesync.json`; smoke testy + dry-run w CI.
- **Admin:** przycisk pełnego ekranu w headerze (jak Timeline / Client).
- **Admin Utwory (pod Wybrany):** import legacy `database.json` z auto-detect (v5 pack vs 4.x `songs[]`) + migracja `migrateLegacy`* przy `POST /api/library/import`; ZIP odroczony (komunikat PL).
- **Timeline:** marquee + multi-select (`items` id+lane / `primaryId`; zaznaczenie **cross-lane** jak v4) + multi-drag same lane (live preview całej grupy; po puścieniu zachowane zaznaczenie) + clipboard ⌘C/X/V/D (Forma/Tekst/Akordy/Cue; paste @ locator; copy = primary lane); hit-test `data-clip-lane`; pusty obszar pod trackami = marquee/clear — parity zachowania v4, nie clone CSS.
- **Timeline:** ręczna wysokość ścieżki (drag na dolnej krawędzi docka; dwuklik = Zoom V; `localStorage`; Zoom V zachowuje proporcje) — jak v4 `laneHeights`.
- **Web:** ekran błędu trasy (`errorElement`) + root ErrorBoundary — Odśwież / Client / Admin zamiast białego ekranu.
- **Host Restart / Wyłącz:** `POST /api/system/restart|shutdown` + potwierdzenie 2× (jak v4); sieć `GET /api/system/network`.
- **Schema v5:** `keyMap`, `midiProgramId`, `isTemplate`, `artist` / `genre` / `year`; katalog biblioteki z PC / wzorami / `hasMusicXml`.
- **Admin parity:** Batch PC, Ostrzeżenia, kolumna PC, Wzory (nowy z wzoru), Eksport/Import `.stagesync.json`, MusicXML upload.
- **Timeline:** Tonacja (keyMap) edit/readout, Tempo BPM @ playhead, suwaki Zoom H/V/UI, metadane PC/artysta/gatunek.
- **Wygląd:** jasny motyw + wysoki kontrast (`data-theme` / `data-contrast`) w Admin / Timeline / Client.
- **Client:** skala tekstu karaoke, auto-scroll, score zoom lokalny; appearance w drawerze globalnym.
- **Timeline parity follow-up:** Metadane (tytuł / defaultBpm), Loop (region na linijce + `POST /api/transport/loop` SSOT), Follow playhead, Tekst/Akordy/Cue move/resize/pencil, Kotwice (`scoreBarMap`), scissors content, Client H/B + Tap wokalu + notatki Formy.
- **Migrator α9 MVP:** `migrateLegacy`* + CLI `pnpm migrate:legacy` ([MIGRATION.md](docs/MIGRATION.md)); drop legacy `vl-cd-`* (cyfry CD = render Client, nie storage) + granice długości Tekst z restami (bez rozciągania „1” w utwór).
- **Admin:** Host logi SSE (`/api/system/logs/stream` + Pauza/Wyczyść); Scena **presence** (`GET /api/stage/clients` + WS `client_hello`).

### Zmieniono

- **Client:** usunięty pasek `rolePaneHead` (etykieta roli + czarny strip nad treścią); ustawienia roli jako floating gear (jak v4), bez chrome nad sceną.
- **Client:** górny pasek (header) zawsze przyklejony — shell `100dvh` + `position: sticky`; treść przewija się poniżej.
- **Admin Scena:** kolumna **Klienci** szersza (`fr` / `minmax`, nie cap MIDI Host) — listy presence mniej ściśnięte.
- **Admin Host MIDI:** kafelki liczników wypełniają panel (siatka 2×2); wartość pod etykietą, wycentrowane.
- **Admin Host:** Ustawienia / Restart / Wyłącz w chrome headerze (`ShellIconButton`, kolejność jak v4); Sieć na pełną szerokość rzędu.
- **Proces:** α8 rebuild = **code freeze** (engineering); α9 must (migrator + **P8 green 2026-07-21**); β1 na prośbę ([report-parity-blocker-alpha8.md](docs/analysis/reports/report-parity-blocker-alpha8.md)).
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
- **Timeline mapy:** Tempo/Metrum/Tonacja — snap beat; eraser nie rusza seed @ 0.
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
- **Timeline Countdown:** rozciąganie długości gestem (body / prawa krawędź, snap do taktów) + shift treści jak v4; lewa krawędź zablokowana (komunikat); inspector `setCountdownBars` z renormem końca CD @ tick 0; po zmianie długości — regeneracja cyfr CD w regionie Countdown; podczas gestu — scroll na początek timeline (widoczne nowe takty CD) + delta z clientX; grid/ruler dzielą takty też w pre-roll CD.
- Admin — wiersze wzorów / Batch PC / Scena / Pliki: siatka bez fałszywej kolumny PC, żeby przycisk „Nowy z wzoru” nie zasłaniał nazwy.
- **Timeline parity vs v4:** locator/loop snap @ beat (Cmd/Ctrl = off); locator `primary` vs playhead `info`; playhead nie jako linia przy pause; toolbar transport/BBT wyśrodkowany; Zoom UI mnoży H+V; meta year + editable metrum/tonacja @ 0.
- **Timeline chrome (korekta bez decyzji PO):** Odrzuć/Zapisz z powrotem jako **ikony**; metronom + follow w **center** przy transporcie; footer bez dublowania Utwór/Pozycja/Połączenie/Stan (conn-dot + zoom jak v4).
- **Timeline sterowanie:** Ctrl/Meta+wheel (H zoom), Alt+wheel (V/H), Shift+wheel (scroll H); skróty Space / K / C / ⌘S / Z-fit / ←→ locator.

## [5.0.0-alpha.8](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.7...v5.0.0-alpha.8) - 2026-07-20

### Dodano

- **Lane Akordy / Cue:** pencil, select, Delete/eraser, inspector (`symbol` / `label`); no-overlap; Client **grid** czyta `akordy.clips`.
- **Scissors Forma:** `splitClipAt` + tool; Countdown nietykalny.
- **Tap** (dock Tekst): tap tempo → `tempoMap` @ locator.
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

- **Timeline Forma:** pencil drag (zakres taktów), pointer/Smart move + resize brzegów, Delete/Backspace + eraser; transakcyjny `gesturePreview` (commit na pointerup); no-overlap w `@stagesync/shared` (`clip-collision`); Countdown nietykalny; sekcje `startTicks >= 0` ([ADR 0008](docs/adr/0008-timeline-clip-editing.md)).
- **Smart Tool** w toolbarze; strefy trim/move tylko przy Pointer/Smart — Pencil = exclusive draw.
- **Snap:** Cmd/Ctrl = chwilowy snap off, ewaluacja `metaKey`/`ctrlKey` na każdym `pointermove` ([ADR 0007](docs/adr/0007-snap-grid.md) faza 3).
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

- **Client karaoke:** rola Tekst z live kontekstem projektu (sekcja Formy, BBT, tempo/metrum @ transport); placeholder braku linii wokalu (`KaraokePane`, `clientKaraoke.ts`).
- **Client shell:** `useActiveProject`, `DrumsPane`; ikony kart ról na ekranie welcome (parity v4).
- **Timeline:** tokeny warstw `--ss-z-`*; locator (bursztynowy) + playhead MIDI (cyjan) na linijce w stylu v4.

### Naprawiono

- Timeline: warstwy z-index (playhead nad clipami); eye w ruler dock (bez pustego wiersza ścieżki); menu widoczności przez portal (bez clipu scroll).
- Timeline: przeciąganie locatora po linijce; typografia numerów taktów (`tabular-nums`, semibold).

## [5.0.0-alpha.4](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.3...v5.0.0-alpha.4) - 2026-07-20

### Dodano

- **Timeline track grid:** wspólna siatka wierszy dock ↔ lane (`trackRow`, sticky dock); kolejność v4 (Specjalne nad treścią); eye menu per ślad (`timelineTracks.ts`).
- **Lane Tempo/Metrum:** read-only segmenty z `tempoMap` / `meterMap` (`mapSegments.ts`).
- **Inspector Formy:** rename sekcji + długość Countdown (takty) → draft → PUT (`formaInspector.ts`).
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
- **API treści:** GET/PUT pełny `project.json`; transport z `activeProjectId`, play/seek z map
projektu; `POST /api/transport/load`.
- **Timeline α3:** route `/timeline/:projectId`, Forma z danych, pencil, Zapisz/Odrzuć;
song picker z biblioteki; read-only lane Tempo/Metrum.
- **Admin / Client:** link Timeline z wybranym id; status „Sekcja”; rola Client `drums` (Forma).
- **Chrome shelli:** wspólny `ShellWordmark`; `ShellIconButton`, `SettingsPopover`, `ConnectionIndicator`;
Client — jednolinijkowy nagłówek, popovery ustawień (v4-style).
- **Snap grid (faza 1):** `quantizeTicks` @ shared, domyślnie takt; ADR [0007](docs/adr/0007-snap-grid.md).
- **Stabilność storage/transport:** H1/H5 engine, H2–H4 library CRUD, `ProjectIdSchema` (UUID).
- Dokumentacja: [docs/api/](docs/api/README.md) (PUT v2 + transport z map).
tokeny `--ss-duration-fast|normal|slow`; ikony shelli przez Lucide.

## [5.0.0-alpha.2](https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) - 2026-07-20

### Dodano

Dependabot (npm + github-actions, weekly); [CODEOWNERS](.github/CODEOWNERS).
checklista branch protection (status checks) w CONTRIBUTING; JSDoc `@example`
na helperach czasu / soft playhead (`@stagesync/shared`).
- Tokeny statusu `--ss-color-success` / `warning` / `info`; dokumentacja
[docs/ui/](docs/ui/README.md) (kolory + Button 7 stanów / PWA); [docs/ROADMAP.md](docs/ROADMAP.md);
checklista release w CONTRIBUTING; README `@stagesync/ui` i `@stagesync/shared`.
[LICENSE](LICENSE) (MIT); [SECURITY.md](SECURITY.md).
foldery projektów), mapa pace layers, checklista ACL pod migrator / MIDI /
audio.
indeks ADR + słownik statusów ([docs/adr/README.md](docs/adr/README.md)).
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
funkcji v4 ([ui-shell-inventory.md](docs/ui-shell-inventory.md)); Client /
Timeline — inventarz (osobny redesign); tokeny black/amber + CSS Modules;
`TransportProvider` nad routerem; Audio 0…N; bez git-apply
([ADR 0004](docs/adr/0004-updates-docker.md)).
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
`library.template.json`, override `STAGESYNC_DATA_DIR` pod testy.
([CONTRIBUTING.md](CONTRIBUTING.md)).
inventarz kontrolek = parity v4 ([ui-shell-inventory.md](docs/ui-shell-inventory.md)).

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

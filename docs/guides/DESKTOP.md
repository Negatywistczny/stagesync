# StageSync — aplikacja desktop

Okno desktopowe (Admin / Timeline / Client) z wbudowanym lokalnym hostem albo połączeniem z hostem w sieci.

**Dla kogo:** operator sceny na macOS / Windows.  
**Aktualizacje:** updater w Launcherze / Adminie (nie Watchtower). Docker host → [INSTALL.md](./INSTALL.md); Android → [MOBILE.md](./MOBILE.md).

Szczegóły decyzji: [ADR 0010](../adr/0010-desktop-shell-tauri.md), [ADR 0014](../adr/0014-desktop-launcher.md).  
Android (Performer / Console): [MOBILE.md](./MOBILE.md) · [ADR 0016](../adr/0016-android-performer-console.md). Console na tablecie może też uruchomić **lokalny host** na urządzeniu (ten sam tor health → Admin).

## Start — Launcher

Po włączeniu aplikacji widać ekran wyboru hosta (nie od razu Admin):

- **Uruchom lokalny host** — uruchamia wbudowany host na `http://127.0.0.1:4000`, czeka na gotowość, potem otwiera Admin.
- **Wykryte w sieci** — lista hostów z mDNS (`_stagesync._tcp`); kafle pokazują **nazwę hosta w sieci** (TXT / ustawienie w Admin → Ustawienia serwera), projekt (lub „Brak projektu”), stan transportu (Play / Pauza / Stop) oraz w drugiej linii adres IP · wersję. Wymaga włączonego mDNS na hoście i nasłuchu nie tylko na localhost. Preferowane jest IP z LAN (pomijane: loopback, link-local, most Docker `172.17`).
- **Połącz ręcznie** / **Ostatnio używane** — wpisz `http://host:port` (sprawdzenie health, timeout ~3 s → Admin). Przy ostatnich hostach krótki probe (~1,5 s) z diodą online/offline. Różnica wersji host/aplikacja — ostrzeżenie (nie twardy blok).

Błędy startu lokalnego hosta (port zajęty, timeout, uprawnienia, zła wersja, awaria hosta) pokazuje Launcher z logiem, **Ponów**, dyskretną ikoną **Pobierz logi** w nagłówku oraz — przy awarii — przyciskiem **Pobierz logi diagnostyczne** pod banerem błędu. Gdy lokalny host padnie w trakcie sesji, aplikacja wraca do Launchera z komunikatem. Przy utracie połączenia: banner „Utracono połączenie…” + **Wróć do wyboru hosta**.

Wygląd Launchera (kolory, przyciski) pochodzi z tego samego design systemu co SPA (`--ss-*`, klasy `ss-btn*`) — bez osobnej palety „na cold-start”.

**Domyślny widok po połączeniu:** Admin (`/admin`). Klient (`/client`) też w aplikacji desktop; w przeglądarce / Dockerze root `/` to Client.

### Zasobnik systemowy (tray / Menu Bar)

Ikona StageSync zostaje w zasobniku Windows / Menu Bar macOS przez cały czas działania aplikacji.

- **Zamknięcie okna (X)** — chowa okno do zasobnika; **lokalny host nadal działa** (LAN / klienci bez przerwy).
- **Lewy klik** (lub pozycja **Otwórz StageSync**) — przywraca okno.
- **Menu kontekstowe:**
  - **Status hosta** (informacyjny: wyłączony / uruchamianie / działa z adresem / błąd); przy błędzie klik otwiera Launcher z komunikatem.
  - **Kopiuj adres LAN** i **Otwórz w przeglądarce** — gdy host gotowy (także localhost).
  - **Uruchom / Zatrzymaj Host** (podczas startu: **Anuluj start**), **Restartuj host** (tylko zarządzany lokalny sidecar).
  - **Zakończ StageSync** — pełne wyjście.
- **Ikona w zasobniku:** statyczna ikona StageSync z kropką stanu (szara / żółta start / zielona gotowy / czerwona błąd); tooltip z adresem hosta.
- **Pełne wyjście** (gasi host + proces aplikacji): tray **Zakończ StageSync**, menu OS **Zakończ**, ⌘/Ctrl+Q.

Przy kolejnym starcie aplikacja sprząta porzucony proces hosta na porcie 4000 (np. po Force Quit).

### Nawigacja L1 (OperatorNav vs menu aplikacji)

| Powierzchnia                      | Admin / Timeline / Klient                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tauri desktop (szerokie okno)** | Menu aplikacji (**Widok**, skróty `⌘/Ctrl+1…3`, `Alt+1…4`) + pasek L1 z wordmarkiem i chipami Admin/Timeline/Klient; w buildach DEV Admin ma też sekcję `Dev`. Bez przycisku pełnego ekranu w chrome (jest w menu). |
| **Tauri desktop (≤640px)**        | Ten sam chrome telefonu co Web / Console: **OperatorNav** + kompaktowy L1                                                                                                                                           |
| **Tauri `/client`**               | Zawsze pełny L1 z chipami **Admin / Timeline** (booth); menu HTML/OS osobno                                                                                                                                         |
| **Przeglądarka operatora (LAN)**  | Po wizycie w Admin/Timeline — sesja operatora: chipy (tablet/desktop) albo **OperatorNav** (≤640px) na `/client`; bez sesji = widok muzyka. Bez title bara okna.                                                    |
| **Console Android**               | **OperatorNav** / chipy jak web operator; na `/client` zawsze                                                                                                                                                       |
| **Performer / muzyk `/client`**   | Brak przełącznika aplikacji                                                                                                                                                                                         |

### Title bar (Windows / Linux) — [#836](https://github.com/Negatywistczny/stagesync/issues/836)

Okno bez dekoracji OS (`decorations: false`). W WebView:

- Ciemny pasek: menubar | tytuł „StageSync” | min / max / close
- Szerokie okno: top-level **Plik | Edycja | Widok | Odtwarzanie | Host | Pomoc**
- Wąskie (≤1024px): jedno **Menu** → kolumna sekcji + panel drugiego poziomu **obok**
- Przeciąganie: `data-tauri-drag-region` / mostek `start_dragging`
- **macOS:** natywne dekoracje + natywny menubar (bez HTML title bara)

**Przeglądarka / PWA:** title bar i window controls są ukryte. Detekcja to realny WebView Tauri (`__TAURI__` / `__STAGESYNC_TAURI_SHELL__` / surface `tauri`) — sam marker HTML sidecara `__STAGESYNC_SHELL__=desktop` **nie** włącza chrome okna ani „Wróć do wyboru hosta” w launcherze.

## Menu aplikacji

**macOS (pasek systemowy):** **StageSync** | **Plik** | **Edycja** | **Widok** | **Odtwarzanie** | **Host** | **Pomoc**

**Windows / Linux (w oknie, ciemny title bar):** **Plik** | **Edycja** | **Widok** | **Odtwarzanie** | **Host** | **Pomoc**  
(Preferencje / aktualizacje / Zakończ w **Plik**, O programie w **Pomoc**).

**Wąskie okno (≤1024px):** przycisk **Menu** → lista sekcji; drugi poziom w **osobnym panelu obok**.

### Zachowanie menubara (Windows / Linux)

1. Samo najechanie **nie** otwiera menu.
2. Po **kliknięciu** top-level (lub **Menu**) menubar jest „uzbrojony” — najechanie na sąsiednią pozycję **przełącza** otwarte menu.
3. Klawiatura: `↑`/`↓` pozycje; `→`/`←` submenu lub sąsiednie top-level; `Enter`/`Space` aktywuje; `Escape` zamyka; `Home`/`End` w liście.
4. Klik poza menu albo drugi klik w tę samą pozycję top-level zamyka.

| Menu                        | Pozycje                                                                                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **StageSync** (tylko macOS) | O programie; Preferencje…; Sprawdź aktualizacje…; Zakończ                                                                                                                                                   |
| **Plik**                    | Nowy (Utwór / Wzór / Z wzoru…); Otwórz…; Otwórz ostatnie; Zapisz (`⌘/Ctrl+S`); Zapisz jako…; Importuj / Eksportuj bibliotekę…; Zamknij projekt; _(Win/Linux: Preferencje…; Sprawdź aktualizacje…; Zakończ)_ |
| **Edycja**                  | Cofnij / Ponów; Wytnij / Kopiuj / Wklej (schowek klipów Timeline); Usuń; Zaznacz wszystko                                                                                                                   |
| **Widok**                   | Admin / Timeline / Klient (`⌘/Ctrl+1…3`); Zakładki Admina (`⌥/Alt+1…4`); Powiększ / Pomniejsz / Rzeczywisty rozmiar; Wygląd…; Pełny ekran                                                                   |
| **Odtwarzanie**             | Odtwórz; Stop; Poprzedni / Następny utwór (`⌥/Alt+←/→`)                                                                                                                                                     |
| **Host**                    | Status; Klienci / urządzenia; Kod QR… (LAN URL); Restart hosta; Ustawienia…                                                                                                                                 |
| **Pomoc**                   | Skróty klawiszowe…; Dokumentacja online; Zgłoś problem; Eksport logów; O programie (Win/Linux)                                                                                                              |

Na **macOS** menu buduje proces desktop (Tauri); na **Windows / Linux** ten sam kontrakt pozycji działa w HTML title barze. Skróty (`Ctrl/⌘+S`, `Ctrl/⌘+1…3`, itd.) obsługuje WebView. Cofnij/Ponów zależą od historii draftu Timeline; **Otwórz ostatnie** — do 8 pozycji.

> **MIDI i zegar muzyczny** obsługuje wyłącznie host (serwer) — nie proces okna desktop. Status MIDI widać w Admin → Host.
>
> **Dane projektów** — lokalny host zapisuje w `~/Documents/StageSync` ([ADR 0012](../adr/0012-user-data-location.md)).
> Przy pierwszym starcie aplikacja może jednorazowo skopiować dane z poprzedniej lokalizacji
> Application Support / AppData (bez nadpisywania Dokumentów).
> Lista ostatnich hostów Launchera zostaje w katalogu aplikacji OS.
>
> **Przywróć kopię / Sentry / PIN / Safety Net / Mixer:** [INSTALL.md](./INSTALL.md).

## Instalacja (gotowe instalatory)

Pobierz instalator dla swojej platformy z [GitHub Releases](https://github.com/Negatywistczny/stagesync/releases):

| Platforma | Plik                                        |
| --------- | ------------------------------------------- |
| macOS     | `StageSync_x.y.z_aarch64.dmg` lub `x64.dmg` |
| Windows   | `StageSync-Setup.exe`                       |

### Instalacja bez podpisu cyfrowego

Instalatory niepodpisane certyfikatem Apple / SmartScreen. Na nowszym macOS Gatekeeper często pokazuje mylący komunikat **„Rzecz … jest uszkodzona”** zamiast „nieznany deweloper”.

**macOS — po skopiowaniu StageSync do `/Applications`:**

```sh
xattr -cr /Applications/StageSync.app
open /Applications/StageSync.app
```

To zdejmuje flagę kwarantanny (Chrome / Safari). Trzeba powtórzyć **po każdej świeżej instalacji** z `.dmg`.

Alternatywy: prawy klik na `.app` → **Otwórz** → **Otwórz**; albo Ustawienia systemowe → Prywatność i ochrona → **Otwórz mimo to**.

**Windows — SmartScreen:**

1. Kliknij **Więcej informacji** w ostrzeżeniu SmartScreen.
2. Kliknij **Uruchom mimo to**.

### Windows — host nie startuje

Launcher pokazuje **status + log** z akcją **Ponów** (nie biały ekran).

- Przy awarii hosta najpierw sprawdź **log** w Launcherze — komunikat o zajętym porcie `4000` bywa mylący, gdy prawdziwy problem to awaria hosta albo blokada Defendera.
- Pierwsze uruchomienie na Windows może potrwać dłużej (skan Defendera) — timeout startu to ~2 min.

Jeśli nadal pada: zamknij StageSync, w PowerShell `netstat -ano | findstr :4000` (powinno być pusto), uruchom ponownie. Przy braku zależności — przeinstaluj z najnowszego [Release](https://github.com/Negatywistczny/stagesync/releases).

## Aktualizacja aplikacji

Gdy jest dostępna nowa wersja, **Launcher** przy starcie pokazuje dialog:

1. **Aktualizuj** — pobiera instalator z GitHub Releases (`latest.json` + minisign) i uruchamia StageSync ponownie.
2. **Przypomnij później** — zamyka dialog; przypomnienie wraca przy następnym uruchomieniu.
3. **Pomiń tę wersję** — zapisuje wersję w lokalnej konfiguracji Launchera (`ignoredVersion`) i nie pyta ponownie o tę konkretną wersję.

Menu **StageSync** → **Sprawdź aktualizacje…** na ekranie Launchera otwiera ten sam dialog (także gdy wersja była pominięta).

Po połączeniu z hostem aktualizację widać też w Adminie → **O aplikacji** → **Sprawdź aktualizacje** / **Aktualizuj aplikację** (z potwierdzeniem restartu).

> Aktualizacja wymaga internetu. Dane projektów są u hosta (`~/Documents/StageSync` przy lokalnym hoście) — okno ich nie przechowuje osobno.  
> Na Androidzie (Performer / Console) aktualizacja to osobny dialog APK — [MOBILE.md](./MOBILE.md).

## Pełny ekran i przeciąganie plików

- **Pełny ekran** w aplikacji desktop przełącza natywne okno; w przeglądarce — tryb pełnoekranowy HTML (np. Client na tablecie).
- **Przeciąganie plików** (import biblioteki, setlista) działa jak w przeglądarce — drop w Adminie.

## Mixer (UI desktop)

- **HW Out:** gdy urządzenie ma ≥ 4 kanały — strefa **HW Out** w Mixerze; **+ Dodaj**, M/ST, dual L/R, usuwanie przez PPM lub Delete/Backspace. Remap Mastera / zmiana Out zablokowane w Play.
- **Widoczność stref:** oczko przy nagłówku Audio / Busy / HW Out / Master chowa lub pokazuje faderzy (nagłówek zostaje).
- Kontrakty i env: [INSTALL.md](./INSTALL.md) · [ADR 0017](../adr/0017-live-show-control-contracts.md) §7.

### Checklist smoke multi-out (operator)

1. Ustaw wyjście systemowe na layout ≥ 4 kanałów (macOS Audio MIDI Setup / Windows Speakers).
2. Preferencje → Audio: sprawdź „Kanały wyjścia” ≥ 4.
3. Mixer → **+ Dodaj** w strefie HW Out; skieruj ścieżkę na HW; Play — sygnał na fizycznych Out 3–4+.
4. Play → próba zmiany Out na/z HW albo remap Master = zablokowana; Pause → OK.
5. Opcjonalnie: Out na Masterze → inna para (np. CH 5–6), gdy urządzenie ma ≥ 6 kanałów i slot jest wolny.

## Wymagania (dev / build)

Powłoka `apps/desktop` to **Tauri 2 (Rust)**. `pnpm install` / `pnpm dev` w root wystarczą do UI w przeglądarce; **nie** zbudują shella desktop bez poniższych zależności.

Kanoniczna lista upstream: https://v2.tauri.app/start/prerequisites/

### Windows

1. **MSVC** — Visual Studio 2022 Build Tools z workloadem _Desktop development with C++_.
2. **WebView2** Evergreen Runtime (często już zainstalowany z Edge).
3. **Rust** przez [rustup](https://rustup.rs/) (`cargo` w `PATH` po nowym terminalu).
4. **Node 22 + pnpm 11** — [.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md#środowisko).

**Najprostsza metoda:** po sklonowaniu repozytorium:

```powershell
.\scripts\setup\setup.ps1
```

Skrypt sprawdzi Node.js, pnpm, Rust, MSVC oraz WebView2 i zaproponuje instalację przy brakach.

**Ręczna instalacja (winget)** — po instalacji wymagany **nowy** terminal:

```powershell
winget install -e --id OpenJS.NodeJS.22
winget install -e --id Microsoft.VisualStudio.2022.BuildTools `
  --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install -e --id Microsoft.EdgeWebView2Runtime
winget install -e --id Rustlang.Rustup
```

Weryfikacja: `rustc -V`, `cargo -V`, `node -v` oraz workload C++ w Installerze VS. Skrypt [`apps/desktop/scripts/check-rust.mjs`](../../apps/desktop/scripts/check-rust.mjs) (przy `pnpm --filter @stagesync/desktop dev`) przypomni o [`setup.ps1`](../../scripts/setup/setup.ps1) przy braku Rusta.

MSI: jeśli `light.exe` / VBSCRIPT pada przy buildzie instalatora — włącz funkcję opcjonalną VBSCRIPT (Ustawienia → Funkcje opcjonalne).

### macOS

- Xcode Command Line Tools: `xcode-select --install`
- rustup + Node/pnpm jak wyżej

### Po toolchainie

- Lokalny host uruchamia się automatycznie przy wyborze lokalnego hosta w Launcherze.
- Dev / cienki shell: zewnętrzny host przez `STAGESYNC_URL`.
- Pełny build `.dmg` / `.exe` (NSIS) jest w [Release workflow](../../.github/workflows/release.yml) (tagi `v*`). Lokalnie: `cargo check` w `apps/desktop/src-tauri` przed zmianami shella.

## Dev

Launchery monorepo: [DX.md](./DX.md).

```sh
# Terminal A — opcjonalny zewnętrzny host
docker compose up --build
# albo: pnpm dev   → UI :3000, API :4000

# Terminal B — shell
pnpm install
pnpm --filter @stagesync/desktop dev
```

Opcjonalnie (cienki shell bez sidecara):

- `pnpm dev`: `STAGESYNC_URL=http://127.0.0.1:3000/admin pnpm --filter @stagesync/desktop dev`
- Docker Compose (UI + API na :4000): `STAGESYNC_URL=http://127.0.0.1:4000/admin …`

## Build lokalny (macOS / Windows)

```sh
pnpm --filter @stagesync/desktop build
```

| Platforma | Artefakt                                 |
| --------- | ---------------------------------------- |
| macOS     | `.dmg`                                   |
| Windows   | zoptymalizowany instalator `.exe` (NSIS) |

## Ograniczenia (ADR 0010)

- Autorytet transportu i czasu muzycznego — tylko host (`apps/server`)
- MIDI I/O — tylko host (`/api/midi`); okno desktop nie otwiera portów MIDI
- Brak auto-update w tle i sklepów OS — aktualizacja na żądanie z menu / Admina

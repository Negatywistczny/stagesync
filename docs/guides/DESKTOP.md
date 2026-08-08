# StageSync — aplikacja desktop

Okno desktopowe (Admin / Timeline / Client) z wbudowanym lokalnym hostem albo połączeniem z hostem w sieci.
Szczegóły decyzji: [ADR 0010](../adr/0010-desktop-shell-tauri.md), [ADR 0014](../adr/0014-desktop-launcher.md).  
Android (Performer / Console): [MOBILE.md](./MOBILE.md) · [ADR 0016](../adr/0016-android-performer-console.md). Console na tablecie może też uruchomić **lokalny host** na urządzeniu (ten sam tor health → Admin).

## Start — Launcher

Po włączeniu aplikacji widać ekran wyboru hosta (nie od razu Admin):

- **Uruchom lokalny host** — uruchamia wbudowany host na `http://127.0.0.1:4000`, czeka na gotowość, potem otwiera Admin.
- **Wykryte w sieci** — lista hostów z mDNS (`_stagesync._tcp`); kafle pokazują **nazwę hosta w sieci** (TXT / ustawienie w Admin → Ustawienia serwera), projekt (lub „Brak projektu”), stan transportu (Play / Pauza / Stop) oraz w drugiej linii adres IP · wersję. Wymaga włączonego mDNS na hoście i nasłuchu nie tylko na localhost. Preferowane jest IP z LAN (pomijane: loopback, link-local, most Docker `172.17`).
- **Połącz ręcznie** / **Ostatnio używane** — wpisz `http://host:port` (sprawdzenie health, timeout ~3 s → Admin). Przy ostatnich hostach krótki probe (~1,5 s) z diodą online/offline. Różnica wersji host/aplikacja — ostrzeżenie (nie twardy blok).

Błędy startu lokalnego hosta (port zajęty, timeout, uprawnienia, zła wersja, awaria hosta) pokazuje Launcher z logiem, **Ponów**, dyskretną ikoną **Pobierz logi** w nagłówku oraz — przy awarii — przyciskiem **Pobierz logi diagnostyczne** pod banerem błędu — bez białego ekranu. Gdy lokalny host padnie w trakcie sesji, aplikacja wraca do Launchera z komunikatem. Przy utracie połączenia: banner „Utracono połączenie…” + **Wróć do wyboru hosta**.

Wygląd Launchera (kolory, przyciski) pochodzi z tego samego design systemu co SPA (`--ss-*`, klasy `ss-btn*`) — bez osobnej palety „na cold-start”.

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

**Domyślny widok po połączeniu:** Admin (`/admin`). Klient (`/client`) też w aplikacji desktop; w przeglądarce / Dockerze root `/` to Client.

### Nawigacja L1 (OperatorNav vs menu OS)

| Powierzchnia | Admin / Timeline / Klient |
|--------------|---------------------------|
| **Tauri desktop** | Menu OS **Widok** (`⌘/Ctrl+1…3`, `Alt+1…4`) na szerokim oknie; w buildach DEV Admin ma też sekcję `Dev`; przy ≤640px ten sam chrome telefonu co Web / Console (**OperatorNav**) |
| **Przeglądarka operatora (LAN)** | Pasek **OperatorNav** w aplikacji + te same skróty |
| **Console Android** | Pasek **OperatorNav** (jak web operator) |
| **Performer / muzyk `/client`** | Brak przełącznika aplikacji |

## Menu systemowe

**StageSync** | **Plik** | **Edycja** | **Widok** | **Odtwarzanie** | **Host** | **Pomoc**

| Menu | Pozycje |
|------|---------|
| **StageSync** | O programie; Preferencje…; Sprawdź aktualizacje…; Zakończ |
| **Plik** | Nowy (Utwór / Wzór / Z wzoru…); Otwórz…; Otwórz ostatnie; Zapisz (`⌘/Ctrl+S`); Zapisz jako…; Importuj / Eksportuj bibliotekę…; Zamknij projekt |
| **Edycja** | Cofnij / Ponów; Wytnij / Kopiuj / Wklej (schowek klipów Timeline); Usuń; Zaznacz wszystko |
| **Widok** | Admin / Timeline / Klient (`⌘/Ctrl+1…3`); Zakładki Admina (`⌥/Alt+1…4`); Powiększ / Pomniejsz / Rzeczywisty rozmiar; Wygląd…; Pełny ekran |
| **Odtwarzanie** | Odtwórz; Stop; Poprzedni / Następny utwór (`⌥/Alt+←/→`) |
| **Host** | Status; Klienci / urządzenia; Kod QR… (LAN URL); Restart hosta; Ustawienia… |
| **Pomoc** | Skróty klawiszowe…; Dokumentacja online; Zgłoś problem; Eksport logów; O programie (Win/Linux) |

### Szczegółowe działanie menu Tauri

Menu jest budowane natywnie w procesie desktop przy starcie aplikacji i instalowane w `setup`. Kliknięcia nie wykonują akcji bezpośrednio w Rust, tylko trafiają do głównego WebView jako event `stagesync:desktop-menu` albo przez nawigację do odpowiedniej trasy. Jeśli główne okno `main` nie istnieje, część akcji kończy się bez efektu.

#### StageSync

| Pozycja | Działanie | Kiedy działa | Kiedy nie działa |
|---------|-----------|--------------|------------------|
| O programie StageSync | Przechodzi do `/admin?section=host` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Preferencje… | Wysyła event `preferences` do WebView | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Sprawdź aktualizacje... | Na launcherze emituje `launcher-check-update`; w SPA hosta przechodzi do `/admin?section=host&action=check-update` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Zakończ | Zamyka aplikację | Zawsze, jeśli system zdąży obsłużyć event | Nie ma osobnego warunku w menu, ale proces może zostać zamknięty przez OS |

#### Plik

| Pozycja | Działanie | Kiedy działa | Kiedy nie działa |
|---------|-----------|--------------|------------------|
| Nowy → Utwór | Event `file-new` | Zawsze z aktywnym menu | Brak `main` |
| Nowy → Wzór | Event `file-new-template` | Zawsze z aktywnym menu | Brak `main` |
| Nowy → Z wzoru… | Event `file-new-from-template` | Zawsze z aktywnym menu | Brak `main` |
| Otwórz… | Event `file-open` | Zawsze z aktywnym menu | Brak `main` |
| Otwórz ostatnie | Przejście do `/timeline/<id>` dla wybranego projektu | Tylko gdy lista ostatnich projektów nie jest pusta | Gdy `recent_projects` jest puste, pokazuje tylko nieaktywny wpis „Brak ostatnich” |
| Zapisz | Event `file-save` | Zawsze z aktywnym menu | Brak `main` |
| Zapisz jako… | Event `file-save-as` | Zawsze z aktywnym menu | Brak `main` |
| Importuj bibliotekę… | Event `file-import` | Zawsze z aktywnym menu | Brak `main` |
| Eksportuj bibliotekę… | Event `file-export` | Zawsze z aktywnym menu | Brak `main` |
| Zamknij projekt | Przechodzi do `/admin` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |

#### Edycja

| Pozycja | Działanie | Kiedy działa | Kiedy nie działa |
|---------|-----------|--------------|------------------|
| Cofnij | Event `edit-undo` | Gdy frontend ustawi `can_undo = true` przez `set_edit_history_state` | Gdy `can_undo = false` |
| Ponów | Event `edit-redo` | Gdy frontend ustawi `can_redo = true` przez `set_edit_history_state` | Gdy `can_redo = false` |
| Wytnij | Event `edit-cut` | Zawsze z aktywnym menu | Brak `main` |
| Kopiuj | Event `edit-copy` | Zawsze z aktywnym menu | Brak `main` |
| Wklej | Event `edit-paste` | Zawsze z aktywnym menu | Brak `main` |
| Usuń | Event `edit-delete` | Zawsze z aktywnym menu | Brak `main` |
| Zaznacz wszystko | Natywne `select_all` | Zawsze z aktywnym menu | Brak `main` |

#### Widok

| Pozycja | Działanie | Kiedy działa | Kiedy nie działa |
|---------|-----------|--------------|------------------|
| Admin | Przechodzi do `/admin` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Timeline | Przechodzi do `/timeline/<timeline_project_id>`; jeśli ID nie jest znane, fallback do `/admin` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Klient | Przechodzi do `/client` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Zakładki Admina → Utwory / Setlista / Scena / Host | Przechodzą do odpowiednich sekcji `/admin?section=...` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Powiększ / Pomniejsz / Rzeczywisty rozmiar | Eventy `view-zoom-in`, `view-zoom-out`, `view-zoom-reset` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Wygląd… | Event `appearance` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Pełny ekran | Przełącza natywne fullscreen okna | Gdy istnieje okno `main` | Gdy okna `main` nie ma |

#### Odtwarzanie

| Pozycja | Działanie | Kiedy działa | Kiedy nie działa |
|---------|-----------|--------------|------------------|
| Odtwórz | Event `transport-play` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Stop | Event `transport-stop` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Poprzedni utwór | Event `transport-prev` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Następny utwór | Event `transport-next` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |

#### Host

| Pozycja | Działanie | Kiedy działa | Kiedy nie działa |
|---------|-----------|--------------|------------------|
| Status | Przechodzi do `/admin?section=host` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Klienci / urządzenia | Przechodzi do `/admin?section=stage` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Kod QR… | Event `host-qr` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Restart hosta | Event `host-restart` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Ustawienia… | Przechodzi do `/admin?section=host` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |

#### Pomoc

| Pozycja | Działanie | Kiedy działa | Kiedy nie działa |
|---------|-----------|--------------|------------------|
| Skróty klawiszowe… | Event `help-shortcuts` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| Dokumentacja online | Otwiera zewnętrzny URL dokumentacji | Tylko dla `http(s)` i gdy system może otworzyć przeglądarkę | Inne schematy URL są odrzucane |
| Zgłoś problem | Otwiera zewnętrzny URL issue tracker | Tylko dla `http(s)` i gdy system może otworzyć przeglądarkę | Inne schematy URL są odrzucane |
| Eksport logów | Event `diagnostics-export` | Gdy istnieje okno `main` | Gdy okna `main` nie ma |
| O programie (Win/Linux) | Przechodzi do `/admin?section=host` | Tylko poza macOS, gdy istnieje okno `main` | Na macOS pozycja nie występuje |

#### Zasady aktywności

- Lista **Otwórz ostatnie** jest zasilana przez `set_nav_recent_projects`, obcięta do 8 elementów i odświeża całe menu po zmianie.
- `Cofnij` i `Ponów` są włączane wyłącznie przez `set_edit_history_state`.
- `Timeline` korzysta z `timeline_project_id`; gdy ID brak, kliknięcie prowadzi do `/admin`.
- `Pełny ekran` przełącza natywne okno, nie HTML fullscreen strony.
- W menu OS nie ma osobnej obsługi błędów poza cichym no-op, jeśli `main` nie istnieje.

### Tray / Menu Bar

Menu zasobnika jest osobne od menu systemowego okna.

| Pozycja | Działanie | Kiedy działa | Kiedy nie działa |
|---------|-----------|--------------|------------------|
| Otwórz StageSync | Pokazuje główne okno | Zawsze | Brak okna `main` oznacza tylko brak czego pokazać |
| Status hosta | Pokazuje aktualny stan; przy błędzie otwiera Launcher | Klikalne tylko w stanie Error | W Idle / Starting / Running jest informacyjne |
| Kopiuj adres LAN | Kopiuje LAN URL hosta | Tylko gdy host działa i ma dostępny URL sieciowy | Gdy host nie działa, startuje albo nie ma URL |
| Otwórz w przeglądarce | Otwiera LAN URL w domyślnej przeglądarce | Tylko gdy host działa i ma dostępny URL sieciowy | Gdy host nie działa, startuje albo nie ma URL |
| Uruchom Host / Zatrzymaj Host / Anuluj start | Przełącza lokalny host | Gdy stan pozwala na toggle | Zależnie od stanu może być wyłączone w trayu |
| Restartuj host | Restartuje zarządzany lokalny host | Tylko gdy host działa, ma child process i jest gotowa sieć | Gdy host jest Idle / Starting / Error albo nie jest zarządzany |
| Zakończ StageSync | Kończy aplikację i host | Zawsze | Brak osobnego warunku |

Tray nie otwiera menu po lewym kliknięciu ikony, bo `show_menu_on_left_click(false)`; lewy klik przywraca tylko okno.


> **MIDI i zegar muzyczny** obsługuje wyłącznie host (serwer) — nie proces okna desktop. Status MIDI widać w Admin → Host.
>
> **Dane projektów** — lokalny host zapisuje w `~/Documents/StageSync` ([ADR 0012](../adr/0012-user-data-location.md)).
> Przy pierwszym starcie aplikacja może jednorazowo skopiować dane z poprzedniej lokalizacji
> Application Support / AppData (bez nadpisywania Dokumentów).
> Lista ostatnich hostów Launchera zostaje w katalogu aplikacji OS.
>
> **Przywróć kopię:** Ustawienia → Serwer → Zaawansowane — **Przywróć…**
> (`.bak` pojedynczo / zaznaczenie / katalog; albo archiwum `.zip` z drzewem danych;
> PIN gdy włączony). Szczegóły: [INSTALL.md](./INSTALL.md) § Backup volume.
>
> **Sentry (opcjonalnie):** ustaw `SENTRY_DSN` / `VITE_SENTRY_DSN` w `.env` hosta — bez DSN brak raportowania (./INSTALL.md) § Sentry).

## Instalacja (gotowe instalatory)

Pobierz instalator dla swojej platformy z [GitHub Releases](https://github.com/Negatywistczny/stagesync/releases):

| Platforma | Plik |
|-----------|------|
| macOS | `StageSync_x.y.z_aarch64.dmg` lub `x64.dmg` |
| Windows | `StageSync_x.y.z_x64-setup.exe` (NSIS) |

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
> Na Androidzie (Performer / Console) aktualizacja to osobny dialog APK z hosta — nie Tauri updater.

## Pełny ekran i przeciąganie plików

- **Pełny ekran** w aplikacji desktop przełącza natywne okno; w przeglądarce — tryb pełnoekranowy HTML (np. Client na tablecie).
- **Przeciąganie plików** (import biblioteki, setlista) działa jak w przeglądarce — drop w Adminie.

## Wymagania (dev / build)

Powłoka `apps/desktop` to **Tauri 2 (Rust)**. `pnpm install` / `pnpm dev` w root wystarczą do UI w przeglądarce; **nie** zbudują shella desktop bez poniższych zależności.

Kanoniczna lista upstream: https://v2.tauri.app/start/prerequisites/

### Windows

1. **MSVC** — Visual Studio 2022 Build Tools z workloadem *Desktop development with C++* (bez tego `cargo` / linkowanie pada od razu).
2. **WebView2** Evergreen Runtime (często już zainstalowany z Edge).
3. **Rust** przez [rustup](https://rustup.rs/) (`cargo` w `PATH` po nowym terminalu).
4. **Node 22 + pnpm 11** — [.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md#środowisko).

**Najprostsza metoda (Zalecane):**
Po sklonowaniu repozytorium, uruchom w głównym folderze skrypt:
```powershell
.\scripts\setup.ps1
```
Skrypt interaktywnie sprawdzi obecność Node.js, pnpm, Rust, MSVC oraz WebView2 i zaoferuje ich automatyczną instalację w razie braków (zwracając kod błędu, jeśli coś pójdzie nie tak).

**Ręczna instalacja (winget):**
Jeśli wolisz zainstalować wymagania ręcznie (po instalacji wymagany **nowy** terminal):

```powershell
winget install -e --id OpenJS.NodeJS.22
winget install -e --id Microsoft.VisualStudio.2022.BuildTools `
  --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install -e --id Microsoft.EdgeWebView2Runtime
winget install -e --id Rustlang.Rustup
```

Weryfikacja: `rustc -V`, `cargo -V`, `node -v` oraz że w Installerze VS widać workload C++. Skrypt `apps/desktop/scripts/check-rust.mjs` (uruchamiany przy `pnpm --filter @stagesync/desktop dev`) przypomni o użyciu `setup.ps1` w razie braku Rusta.

MSI: jeśli `light.exe` / VBSCRIPT pada przy buildzie instalatora — włącz funkcję opcjonalną VBSCRIPT (Ustawienia → Funkcje opcjonalne / „Więcej funkcji systemu Windows”); szczegóły w docs Tauri.

### macOS

- Xcode Command Line Tools: `xcode-select --install`
- rustup + Node/pnpm jak wyżej

### Po toolchainie

- Lokalny host uruchamia się automatycznie przy wyborze lokalnego hosta w Launcherze.
- Dev / cienki shell: zewnętrzny host przez `STAGESYNC_URL`.
- Pełny build `.dmg` / `.exe` (NSIS) jest w [Release workflow](../../.github/workflows/release.yml) (tagi `v*`). Lokalnie: `cargo check` w `apps/desktop/src-tauri` przed zmianami shella.

## Dev

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

| Platforma | Artefakt |
|-----------|----------|
| macOS | `.dmg` |
| Windows | zoptymalizowany instalator `.exe` (NSIS) |

## Operator: PIN, Safety Net, Sampler, bus→bus, motyw, multi-out

- **Mixer bus→bus:** wyjście busa na Master albo inny bus (bez pętli).
- **Mixer multi-out (HW):** gdy urządzenie audio ma ≥ 4 kanały (layout OS Quad/5.1 lub Aggregate Device), Mixer listuje **HW Out**. Master domyślnie idzie na CH 1–2 (można przemapować na inną wolną parę w selektorze Out na pasku Master — zablokowane w Play). Patchy HW: **+ Dodaj** (wyłącza się po wyczerpaniu kanałów), M/ST, dual L/R przy stereo, usuwanie przez PPM albo Delete/Backspace (bez × przy Mute). Ścieżka / bus / próbka Cue mogą iść na HW. Przy stereo-only strefa HW Out jest ukryta. Zmiana wyjścia fizycznego zablokowana w trakcie Play ([ADR 0017](../adr/0017-live-show-control-contracts.md) §7).
- **Mixer — widoczność stref:** oczko przy nagłówku Audio / Busy / HW Out / Master chowa lub pokazuje faderzy strefy (nagłówek zostaje); wybór w przeglądarce.
- **PIN operatora** (`STAGESYNC_OPERATOR_PIN` w `.env` hosta) — bramka przy wejściu w Admin / Timeline; destrukcyjne REST wymagają nagłówka PIN. Sesja **nie wygasa** podczas `PLAYING`; poza show — lock przy ukryciu karty / uśpieniu oraz po **15 min** bezczynności ([ADR 0017](../adr/0017-live-show-control-contracts.md) §8a).
- **Safety Net** — **Operator-Assisted Hot Standby** (ręczny **Przejmij**; bez Zero-Glitch HA). W Admin → Host: rola Master/Spare; na Spare MIDI OUT wyciszony. Po Przejmij w trakcie `PLAYING` → **PAUSE** (playhead zachowany) ([ADR 0017](../adr/0017-live-show-control-contracts.md) §2–§3).
- **Panic:** globalny MIDI Panic bez PIN w ustawieniach Admin (przytrzymaj ~1 s). Performer / Client bez globalnego Panic ([ADR 0017](../adr/0017-live-show-control-contracts.md) §8b).
- **Cues Sampler** — Inspector klipu Cue: próbka, tryb one-shot/gated, GO, Master/Bus/HW.
- **Motyw:** picker 5 skór (Booth / Daylight / Midnight / Matrix / Neon); `STAGESYNC_THEME_DEFAULT` dla urządzeń bez lokalnej preferencji.

### Checklist smoke multi-out (operator — bez claim green)

1. Ustaw wyjście systemowe na layout ≥ 4 kanałów (macOS Audio MIDI Setup / Windows Speakers).
2. Preferencje → Audio: sprawdź „Kanały wyjścia” ≥ 4.
3. Mixer → **+ Dodaj** w strefie HW Out (przy 4 kanałach zmieści się jedna para stereo poza Masterem); skieruj ścieżkę na HW; Play — sygnał na fizycznych Out 3–4+.
4. Play → próba zmiany Out na/z HW albo remap Master = zablokowana; Pause → OK.
5. Opcjonalnie: Out na Masterze → inna para (np. CH 5–6), gdy urządzenie ma ≥ 6 kanałów i slot jest wolny.

Szczegóły env: [INSTALL.md](./INSTALL.md).

## Ograniczenia (ADR 0010)

- Autorytet transportu i czasu muzycznego — tylko host (`apps/server`)
- MIDI I/O — tylko host (`/api/midi`); okno desktop nie otwiera portów MIDI
- Brak auto-update w tle i sklepów OS — aktualizacja na żądanie z menu / Admina

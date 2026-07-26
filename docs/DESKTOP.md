# StageSync — aplikacja desktop

Okno desktopowe (Admin / Timeline / Client) z wbudowanym lokalnym hostem albo połączeniem z hostem w sieci.
Szczegóły decyzji: [ADR 0010](./adr/0010-desktop-shell-tauri.md), [ADR 0014](./adr/0014-desktop-launcher.md).  
Android (sideload Performer / Console, bez Google Play): [MOBILE.md](./MOBILE.md) · [ADR 0016](./adr/0016-android-performer-console.md). Console na tablecie może też uruchomić **lokalny host** na urządzeniu (ten sam tor health → Admin).

## Start — Launcher

Po włączeniu aplikacji widać ekran wyboru hosta (nie od razu Admin):

- **Uruchom lokalny host** — uruchamia wbudowany host na `http://127.0.0.1:4000`, czeka na gotowość, potem otwiera Admin.
- **Wykryte w sieci** — lista hostów z mDNS (`_stagesync._tcp`); kafle pokazują hostname, projekt (lub „Brak projektu”), stan transportu (Play / Pauza / Stop) oraz IP + wersję. Wymaga włączonego mDNS na hoście i nasłuchu nie tylko na localhost. Preferowane jest IP z LAN (pomijane: loopback, link-local, most Docker `172.17`).
- **Połącz ręcznie** / **Ostatnio używane** — wpisz `http://host:port` (sprawdzenie health, timeout ~3 s → Admin). Przy ostatnich hostach krótki probe (~1,5 s) z diodą online/offline. Różnica wersji host/aplikacja — ostrzeżenie (nie twardy blok).

Błędy startu lokalnego hosta (port zajęty, timeout, uprawnienia, zła wersja, awaria hosta) pokazuje Launcher z logiem, **Ponów**, dyskretną ikoną **Pobierz logi** w nagłówku oraz — przy awarii — przyciskiem **Pobierz logi diagnostyczne** pod banerem błędu — bez białego ekranu. Gdy lokalny host padnie w trakcie sesji, aplikacja wraca do Launchera z komunikatem. Przy utracie połączenia: banner „Utracono połączenie…” + **Wróć do wyboru hosta**.

Wygląd Launchera (kolory, przyciski) pochodzi z tego samego design systemu co SPA (`--ss-*`, klasy `ss-btn*`) — bez osobnej palety „na cold-start”.

### Zasobnik systemowy (tray / Menu Bar)

Ikona StageSync zostaje w zasobniku Windows / Menu Bar macOS przez cały czas działania aplikacji.

- **Zamknięcie okna (X)** — chowa okno do zasobnika; **lokalny host nadal działa** (LAN / klienci bez przerwy).
- **Lewy klik** (lub pozycja **Otwórz StageSync**) — przywraca okno.
- **Menu kontekstowe:** Status Hosta (wyłączony / działa z adresem LAN / błąd), **Kopiuj adres LAN**, **Uruchom / Zatrzymaj Host**, **Zakończ StageSync**.
- **Pełne wyjście** (gasi host + proces aplikacji): tray **Zakończ StageSync**, menu OS **Zakończ**, ⌘/Ctrl+Q.

Przy kolejnym starcie aplikacja sprząta porzucony proces hosta na porcie 4000 (np. po Force Quit).

**Domyślny widok po połączeniu:** Admin (`/admin`). Klient (`/client`) też w aplikacji desktop; w przeglądarce / Dockerze root `/` to Client.

## Menu systemowe

**StageSync** | **Plik** | **Edycja** | **Widok** | **Transport** | **Host** | **Pomoc**

| Menu | Pozycje |
|------|---------|
| **StageSync** | O programie; Sprawdź aktualizacje…; Zakończ |
| **Plik** | Otwórz ostatnie; Zapisz (`⌘/Ctrl+S`); Zamknij projekt |
| **Edycja** | Wytnij / Kopiuj / Wklej / Zaznacz wszystko (`⌘/Ctrl+X/C/V/A`) |
| **Widok** | Admin / Timeline / Klient (`⌘/Ctrl+1…3`); Zakładki Admina (`⌥/Alt+1…4`); Pełny ekran |
| **Transport** | Odtwórz; Stop; Poprzedni / Następny utwór (`⌥/Alt+←/→`) |
| **Host** | Status; Klienci / urządzenia; Kod QR… (LAN URL); Restart hosta; Ustawienia… |
| **Pomoc** | Dokumentacja online; Zgłoś problem; O programie (Win/Linux) |

MIDI i zegar muzyczny obsługuje wyłącznie host (serwer) — nie proces okna desktop. Status MIDI widać w Admin → Host.

> **Dane projektów** — lokalny host zapisuje w `~/Documents/StageSync` ([ADR 0012](./adr/0012-user-data-location.md)).
> Przy pierwszym starcie aplikacja może jednorazowo skopiować dane z poprzedniej lokalizacji
> Application Support / AppData (bez nadpisywania Dokumentów).
> Lista ostatnich hostów Launchera zostaje w katalogu aplikacji OS.
>
> **Przywróć kopię:** Ustawienia → Serwer → Zaawansowane — **Przywróć…**
> (`.bak` pojedynczo / zaznaczenie / katalog; albo archiwum `.zip` z drzewem danych;
> PIN gdy włączony). Szczegóły: [INSTALL.md](./INSTALL.md) § Backup volume.
>
> **Sentry (opcjonalnie):** ustaw `SENTRY_DSN` / `VITE_SENTRY_DSN` w `.env` hosta — bez DSN brak raportowania ([INSTALL.md](./INSTALL.md) § Sentry).

## Instalacja (gotowe instalatory)

Pobierz instalator dla swojej platformy z [GitHub Releases](https://github.com/Negatywistczny/stagesync/releases):

| Platforma | Plik |
|-----------|------|
| macOS | `StageSync_x.y.z_aarch64.dmg` lub `x64.dmg` |
| Windows | `StageSync_x.y.z_x64.msi` |

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

- Rust toolchain (`rustup`) + zależności platformowe Tauri 2 — https://v2.tauri.app/start/prerequisites/
- Lokalny host uruchamia się automatycznie przy wyborze lokalnego hosta w Launcherze.
- Dev / cienki shell: zewnętrzny host przez `STAGESYNC_URL`.
- Pełny build `.dmg` / `.msi` jest w [Release workflow](../.github/workflows/release.yml) (tagi `v*`). Lokalnie: `cargo check` w `apps/desktop/src-tauri` przed zmianami shella.

## Dev

```sh
# Terminal A — opcjonalny zewnętrzny host
docker compose up --build
# albo: pnpm dev

# Terminal B — shell
pnpm install
pnpm --filter @stagesync/desktop tauri dev
```

Opcjonalnie: `STAGESYNC_URL=http://127.0.0.1:4000/admin pnpm --filter @stagesync/desktop tauri dev`

## Build lokalny (macOS / Windows)

```sh
pnpm --filter @stagesync/desktop tauri build
```

| Platforma | Artefakt |
|-----------|----------|
| macOS | `.dmg` |
| Windows | `.msi` |

## Operator: PIN, Safety Net, Sampler, bus→bus, motyw

- **Mixer bus→bus:** wyjście busa na Master albo inny bus (bez pętli).
- **PIN operatora** (`STAGESYNC_OPERATOR_PIN` w `.env` hosta) — bramka przy wejściu w Admin / Timeline; destrukcyjne REST wymagają nagłówka PIN. Sesja **nie wygasa** podczas `PLAYING`; poza show — lock przy ukryciu karty / uśpieniu oraz po **15 min** bezczynności ([ADR 0017](./adr/0017-live-show-control-contracts.md) §8a).
- **Safety Net** — **Operator-Assisted Hot Standby** (ręczny **Przejmij**; bez Zero-Glitch HA). W Admin → Host: rola Master/Spare; na Spare MIDI OUT wyciszony. Po Przejmij w trakcie `PLAYING` → **PAUSE** (playhead zachowany) ([ADR 0017](./adr/0017-live-show-control-contracts.md) §2–§3).
- **Panic:** globalny MIDI Panic bez PIN w ustawieniach Admin (przytrzymaj ~1 s). Performer / Client bez globalnego Panic ([ADR 0017](./adr/0017-live-show-control-contracts.md) §8b).
- **Cues Sampler** — Inspector klipu Cue: próbka, tryb one-shot/gated, GO, Master/Bus.
- **Motyw:** lokalne przełączniki w ustawieniach; `STAGESYNC_THEME_DEFAULT` dla urządzeń bez lokalnej preferencji.

Szczegóły env: [INSTALL.md](./INSTALL.md).

## Ograniczenia (ADR 0010)

- Autorytet transportu i czasu muzycznego — tylko host (`apps/server`)
- MIDI I/O — tylko host (`/api/midi`); okno desktop nie otwiera portów MIDI
- Brak auto-update w tle i sklepów OS — aktualizacja na żądanie z menu / Admina

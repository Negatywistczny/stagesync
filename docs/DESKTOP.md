# StageSync — aplikacja desktop

Okno desktopowe (Admin / Timeline / Client) z wbudowanym lokalnym hostem albo połączeniem z hostem w sieci.
Szczegóły decyzji: [ADR 0010](./adr/0010-desktop-shell-tauri.md), [ADR 0014](./adr/0014-desktop-launcher.md).

## Start — Launcher

Po włączeniu aplikacji widać ekran wyboru hosta (nie od razu Admin):

- **Uruchom lokalny host** — uruchamia wbudowany host na `http://127.0.0.1:4000`, czeka na gotowość, potem otwiera Admin.
- **Wykryte w sieci** — lista hostów z mDNS (`_stagesync._tcp`); kafle pokazują hostname, projekt (lub „Brak projektu”), stan transportu (Play / Pauza / Stop) oraz IP + wersję. Wymaga włączonego mDNS na hoście i nasłuchu nie tylko na localhost. Preferowane jest IP z LAN (pomijane: loopback, link-local, most Docker `172.17`).
- **Połącz ręcznie** / **Ostatnio używane** — wpisz `http://host:port` (sprawdzenie health, timeout ~3 s → Admin). Przy ostatnich hostach krótki probe (~1,5 s) z diodą online/offline. Różnica wersji host/aplikacja — ostrzeżenie (nie twardy blok).

Błędy startu lokalnego hosta (port zajęty, timeout, uprawnienia, zła wersja, awaria hosta) pokazuje Launcher z logiem, **Ponów** i **Pobierz log** — bez białego ekranu. Gdy lokalny host padnie w trakcie sesji, aplikacja wraca do Launchera z komunikatem. Przy utracie połączenia: banner „Utracono połączenie…” + **Wróć do wyboru hosta**.

Zamknięcie okna albo **Zakończ** (⌘/Ctrl+Q) zatrzymuje lokalny host. Przy kolejnym starcie aplikacja sprząta porzucony proces hosta na porcie 4000 (np. po Force Quit).

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

Gdy jest dostępna nowa wersja:

1. Uruchom StageSync.
2. W Adminie → **O aplikacji** → **Sprawdź aktualizacje** (albo menu **StageSync** → **Sprawdź aktualizacje…**).
3. Jeśli jest nowsza wersja: **Aktualizuj aplikację** — potwierdź ostrzeżenie (restart; zapisz niezapisane zmiany). **Anuluj** przerywa aktualizację.
4. Aplikacja pobierze aktualizację i uruchomi się ponownie.

> Aktualizacja wymaga internetu. Dane projektów są u hosta (`~/Documents/StageSync` przy lokalnym hoście) — okno ich nie przechowuje osobno.

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

## Ograniczenia (ADR 0010)

- Autorytet transportu i czasu muzycznego — tylko host (`apps/server`)
- MIDI I/O — tylko host (`/api/midi`); okno desktop nie otwiera portów MIDI
- Brak auto-update w tle i sklepów OS — aktualizacja na żądanie z menu / Admina

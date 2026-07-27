# StageSync — instalacja produkcyjna (Docker — ścieżka drugorzędna)

Host na scenie (rack/server): **Docker Compose** + volume `data/`.
Aktualizacja bez git-apply — [ADR 0004](./adr/0004-updates-docker.md).

Desktop operatora (standalone): [DESKTOP.md](./DESKTOP.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md).  
Android Performer / Console (sideload): [MOBILE.md](./MOBILE.md) · [ADR 0016](./adr/0016-android-performer-console.md).

## Wymagania

- Docker Engine + Compose v2
- Port hosta wolny (domyślnie **4000**)

## Dev / ze źródeł

```sh
docker compose up --build -d
```

| URL | Opis |
|-----|------|
| http://localhost:4000/ | Client |
| http://localhost:4000/admin | Admin |
| http://localhost:4000/timeline | Timeline |
| http://localhost:4000/api/health | Healthcheck (`protocolVersion`, `uiHash`) |

Dane użytkownika: volume `./data` → `/app/data` w kontenerze (`STAGESYNC_DATA_DIR`).

### Host restart / shutdown (LAN)

`POST /api/system/restart` i `shutdown` są dozwolone z loopback bez tokenu.
Z LAN wymagają `Authorization: Bearer <STAGESYNC_HOST_TOKEN>` **albo**
`STAGESYNC_ALLOW_REMOTE_LIFECYCLE=1` (tylko zaufane sieci). Admin wysyła token
z `localStorage.stagesync.hostToken` gdy ustawiony — w UI: zakładka **Host**
(przyciski restart / shutdown w nagłówku Admina; PR [#257](https://github.com/Negatywistczny/stagesync/pull/257)).

### Operator PIN (opcjonalny)

Ustaw `STAGESYNC_OPERATOR_PIN` w `.env`, aby chronić destrukcyjne mutacje REST
(projekt, setlista, live desk, ustawienia, MIDI config, `transport/load` itd.).
Transport Play/Pause/Stop/Seek/Loop oraz MIDI Panic **nie** wymagają PIN-u.
Admin i Timeline proszą o PIN przy wejściu; Client — w ustawieniach przy edycji
notatek/form. Nagłówek: `X-Stagesync-Operator-Pin` (alias `X-StageSync-PIN`).
Status: `GET /api/system/operator-auth` → `{ required: boolean }`.

### Safety Net (Master / Spare)

`STAGESYNC_SAFETY_ROLE=spare` wycisza MIDI OUT na tym hoście (lustro). W Admin → Host
widać rolę i przycisk **Przejmij** (ręczne przejęcie → Master).

### Motyw domyślny hosta

`STAGESYNC_THEME_DEFAULT` (`booth` \| `daylight` \| `midnight` \| `matrix` \| `neon`)
ustawia wygląd dla klientów **bez** zapisanego motywu lokalnego (`GET /api/health` →
`themeDefault`). Aliasy legacy `dark` / `light` / `*-high` mapują się na booth/daylight.

### Mixer bus→bus

Wyjście busa można skierować na Master albo inny bus (bez pętli).

### Mixer multi-out (HW Out)

Gdy przeglądarka / WebView raportuje `maxChannelCount ≥ 4` (layout głośników Quad/5.1
albo Aggregate Device), Mixer udostępnia patchy **HW Out** (ChannelMerger → dyskretne
kanały destination). Track, bus i Cue Sampler mogą iść na `hw_out`. Przy samym stereo
UI nie listuje atrap — komunikat operatorski. Zob. [DESKTOP.md](./DESKTOP.md).

### Cues Sampler

Klip Cue może mieć próbkę audio (one-shot / gated) na Master, Bus lub HW — start z
playheadu albo GO w Inspectorze Timeline. Opcjonalnie dokończenie po Stop.

## Produkcja z GHCR (compose.prod.yml)

### 1. Logowanie do GHCR

```sh
# Wygeneruj PAT na https://github.com/settings/tokens → read:packages
docker login ghcr.io -u <twój-login-github> -p <PAT>
```

### 2. Konfiguracja `.env`

```sh
cp .env.example .env
# Wypełnij:
#   STAGESYNC_VERSION=5.2.0

#   GHCR_USER=<login>
#   GHCR_TOKEN=<PAT read:packages>
#   WATCHTOWER_TOKEN=<losowy secret — openssl rand -hex 32>
#   STAGESYNC_GITHUB_TOKEN=<PAT read releases — opcjonalnie>
```

### 3. Uruchomienie

```sh
docker compose -f compose.prod.yml up -d
```

Stack zawiera dwa kontenery: `stagesync` (host) i `watchtower` (update on demand).

## Backup volume

Przed update / migracją skopiuj katalog danych:

```sh
cp -a data "data-backup-$(date +%Y%m%d-%H%M%S)"
```

Serwer przy starcie robi też **shadow `.bak`** przed destrukcyjnym rewrite schematu projektu (`formatVersion` < 5).

### Przywróć z Admina

W **Ustawienia → Serwer → Zaawansowane — Ścieżki** jest **Przywróć…**:

- **Pojedynczy / wiele `.bak`** — zaznacz jeden lub więcej plików shadow backup
  (np. `project.json.schema.bak` obok oryginału albo kopie w
  `STAGESYNC_BACKUPS_DIR` / `{dataDir}/backups` z zachowaną strukturą ścieżek),
  albo użyj **Przywróć katalog (.bak)** dla wszystkich `.bak` w bieżącym folderze
  (max 64 naraz).
- **Archiwum `.zip`** — wybierz ZIP z drzewem katalogu danych (opcjonalny wspólny
  folder najwyższego poziomu jest obcinany) albo z plikami `.bak` wewnątrz.
  Obsługiwane: STORE i DEFLATE; max 256 wpisów.

Host nadpisuje pliki w katalogu danych po potwierdzeniu; gdy ustawiony jest
`STAGESYNC_OPERATOR_PIN`, wymagany jest PIN. Przed każdym nadpisaniem powstaje
`.pre-restore.bak`. Po przywróceniu odśwież Admin / Timeline, jeśli otwarty
był ten projekt.

## Update hosta

### Na żądanie z Admina (zalecane)

Admin → Host → **Sprawdź aktualizacje** → **Aktualizuj host**.

Wymagane: `compose.prod.yml` z Watchtower + zmienne `STAGESYNC_UPDATER_*` / `WATCHTOWER_TOKEN` ustawione.

~30s przerwy WS podczas restartu kontenera. Dane na volume bez zmian.

### Ręcznie (CLI)

1. Zatrzymaj stack: `docker compose -f compose.prod.yml down`
2. Zmień `STAGESYNC_VERSION` w `.env` na nowszy tag.
3. `docker compose -f compose.prod.yml pull && docker compose -f compose.prod.yml up -d`

### Rollback

```sh
# Przywróć poprzednią wersję w .env, np.:
# STAGESYNC_VERSION=5.2.0
docker compose -f compose.prod.yml up -d
```

Dane na volume bez zmian.

## Dev (bez Dockera)

```sh
pnpm install
pnpm dev   # web :3000 + server :4000
```

Zob. [README.md](../README.md).

## Folder danych użytkownika

Projekty, biblioteka i setlista są przechowywane w **`~/Documents/StageSync`** —
analogicznie do MuseScore / aplikacji kreatywnych. Możesz je kopiować, backupować
i przeglądać ręcznie w Finderze (macOS) lub Eksploratorze (Windows).

```
~/Documents/StageSync/
  library/
    library.json        # indeks biblioteki
    setlist.json
  projects/
    <uuid>/
      project.json
      assets/
```

**Windows:** `C:\Users\<nazwa>\Documents\StageSync`

### Zmiana lokalizacji

Ustaw `STAGESYNC_DATA_DIR` przed uruchomieniem serwera:

```sh
# macOS / Linux
STAGESYNC_DATA_DIR=/Volumes/Dysk/StageSync pnpm dev

# lub w .env
STAGESYNC_DATA_DIR=/Users/ja/Muzyka/StageSync
```

### Migracja istniejących danych (jeśli miałeś dane w `repo/data`)

```sh
cp -a data ~/Documents/StageSync
```

Potem uruchom serwer bez `STAGESYNC_REPO_DEV=1` (wykomentuj w `.env`) —
serwer automatycznie użyje `~/Documents/StageSync`.

Desktop (Tauri): lokalny host ustawia `STAGESYNC_DATA_DIR` na Documents; jeśli wcześniej
dane były tylko w Application Support / AppData, aplikacja skopiuje je raz przy starcie
(bez nadpisywania istniejących plików w Dokumentach). Zob. [DESKTOP.md](./DESKTOP.md).
APK Performer/Console serwowane są automatycznie z bundla instalacji / monorepo
`data/downloads` (nie trzeba ich przenosić do Documents) — [MOBILE.md](./MOBILE.md).

### Dev — dane w repo (domyślne)

Lokalne środowisko dev trzyma dane w `<repo>/data` dzięki `STAGESYNC_REPO_DEV=1`
w `.env` (ustawione domyślnie w `.env.example`). Nie trzeba nic zmieniać.

### Sentry (opcjonalne)

Crash reporting jest **wyłączony**, dopóki nie ustawisz DSN w `.env`:

- `SENTRY_DSN` — host Node (`apps/server`)
- `VITE_SENTRY_DSN` — UI (wczytywane przy buildzie Vite; po zmianie przebuduj `apps/web`)

Bez DSN aplikacja startuje normalnie. Raporty nie zawierają domyślnie PII
(tokenów hosta, PIN-u operatora, cookies). Nie commituj prawdziwych wartości DSN.

## Zmienne środowiskowe

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `PORT` | `4000` | HTTP + WS |
| `STAGESYNC_DATA_DIR` | `~/Documents/StageSync` (desktop) · `/app/data` (Compose) | Library + projects |
| `STAGESYNC_DOWNLOADS_DIR` | (auto) | Nadpisanie katalogu APK; desktop lokalny host ustawia bundel / monorepo `data/downloads` |
| `STAGESYNC_APK_BUNDLE_DIR` | obok seeda (`data/downloads`) | Read-only fallback APK (gdy brak w dataDir) |
| `STAGESYNC_REPO_DEV` | `1` (z `.env.example`) | Wymusza `<repo>/data` w trybie dev |
| `STAGESYNC_STATIC_DIR` | `/app/web` (obraz) | Vite `dist` serwowany przez Node |
| `STAGESYNC_URL` | `http://127.0.0.1:4000` | URL dla shella Tauri |
| `STAGESYNC_VERSION` | — | Tag obrazu GHCR (`compose.prod.yml`) |
| `GHCR_USER` / `GHCR_TOKEN` | — | Poświadczenia Watchtower do GHCR |
| `WATCHTOWER_TOKEN` | — | Shared secret Watchtower HTTP API |
| `STAGESYNC_UPDATER_URL` | — | URL Watchtower (`http://watchtower:8080`) |
| `STAGESYNC_UPDATER_TOKEN` | — | = `WATCHTOWER_TOKEN` (używany przez serwer) |
| `STAGESYNC_GITHUB_TOKEN` | — | PAT do GitHub Releases API (update-status na Docker/host; desktop sidecar pomija) |
| `STAGESYNC_HOST_TOKEN` | — | Bearer / `X-Stagesync-Host-Token` dla restart/shutdown z LAN |
| `STAGESYNC_ALLOW_REMOTE_LIFECYCLE` | — | `1` = pozwól na restart/shutdown spoza localhost bez tokenu |
| `STAGESYNC_OPERATOR_PIN` | — | Opcjonalny PIN destrukcyjnych mutacji Admin REST (`X-Stagesync-Operator-Pin`) |
| `STAGESYNC_SAFETY_ROLE` | `master` | Safety Net: `master` \| `spare` (Spare = bez MIDI OUT; ręczne Przejmij) |
| `STAGESYNC_THEME_DEFAULT` | — | Domyślny motyw klientów bez lokalnej preferencji (`booth` / `daylight` / `midnight` / `matrix` / `neon`) |
| `STAGESYNC_BACKUPS_DIR` | `{dataDir}/backups` | Katalog kopii (mapowanie przy Przywróć); puste = domyślny podkatalog danych |
| `SENTRY_DSN` | — | Opcjonalny DSN Sentry dla hosta Node (brak = bez raportowania; bez PII) |
| `VITE_SENTRY_DSN` | — | Opcjonalny DSN Sentry dla UI (wbudowany przy `pnpm build` w `apps/web`; brak = bez raportowania) |

Wzór: [`.env.example`](../.env.example). Decyzja: [ADR 0012](./adr/0012-user-data-location.md).

**Host restart/shutdown:** z `localhost` zawsze dozwolone (desktop / Tauri). Z innej maszyny w LAN —
ustaw `STAGESYNC_HOST_TOKEN` (Admin: `localStorage.stagesync.hostToken`) albo świadomie
`STAGESYNC_ALLOW_REMOTE_LIFECYCLE=1`.

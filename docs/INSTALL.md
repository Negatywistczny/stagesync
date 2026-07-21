# StageSync — instalacja produkcyjna (Docker)

Kanoniczny host na scenie: **Docker Compose** + volume `data/`.
Aktualizacja bez git-apply — [ADR 0004](./adr/0004-updates-docker.md).

Desktop operatora (thin WebView): [DESKTOP.md](./DESKTOP.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md).

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
| http://localhost:4000/api/health | Healthcheck |

Dane użytkownika: volume `./data` → `/app/data` w kontenerze (`STAGESYNC_DATA_DIR`).

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
#   STAGESYNC_VERSION=5.0.0-beta.1
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

## Update hosta

### Na żądanie z Admina (zalecane)

Admin → Ustawienia hosta → **Sprawdź aktualizacje** → **Aktualizuj host**.

Wymagane: `compose.prod.yml` z Watchtower + zmienne `STAGESYNC_UPDATER_*` / `WATCHTOWER_TOKEN` ustawione.

~30s przerwy WS podczas restartu kontenera. Dane na volume bez zmian.

### Ręcznie (CLI)

1. Zatrzymaj stack: `docker compose -f compose.prod.yml down`
2. Zmień `STAGESYNC_VERSION` w `.env` na nowszy tag.
3. `docker compose -f compose.prod.yml pull && docker compose -f compose.prod.yml up -d`

### Rollback

```sh
# Przywróć poprzednią wersję w .env, np.:
# STAGESYNC_VERSION=5.0.0-alpha.9
docker compose -f compose.prod.yml up -d
```

Dane na volume bez zmian.

## Dev (bez Dockera)

```sh
pnpm install
pnpm dev   # web :3000 + server :4000
```

Zob. [README.md](../README.md).

## Zmienne środowiskowe

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `PORT` | `4000` | HTTP + WS |
| `STAGESYNC_DATA_DIR` | `/app/data` (Compose) | Library + projects |
| `STAGESYNC_STATIC_DIR` | `/app/web` (obraz) | Vite `dist` serwowany przez Node |
| `STAGESYNC_URL` | `http://127.0.0.1:4000` | URL dla shella Tauri |
| `STAGESYNC_VERSION` | — | Tag obrazu GHCR (`compose.prod.yml`) |
| `GHCR_USER` / `GHCR_TOKEN` | — | Poświadczenia Watchtower do GHCR |
| `WATCHTOWER_TOKEN` | — | Shared secret Watchtower HTTP API |
| `STAGESYNC_UPDATER_URL` | — | URL Watchtower (`http://watchtower:8080`) |
| `STAGESYNC_UPDATER_TOKEN` | — | = `WATCHTOWER_TOKEN` (używany przez serwer) |
| `STAGESYNC_GITHUB_TOKEN` | — | PAT do GitHub Releases API (update-status) |

Wzór: [`.env.example`](../.env.example).

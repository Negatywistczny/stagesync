# StageSync

[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/Negatywistczny/stagesync/actions/workflows/ci.yml)
[![version](https://img.shields.io/badge/version-5.0.0--beta.1-blue)](https://github.com/Negatywistczny/stagesync/releases)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

StageSync **v5** — synchronizacja sceniczna / timeline (monorepo).

> Legacy **4.x:** [STAGESYNC-APP-LEGACY](https://github.com/Negatywistczny/STAGESYNC-APP-LEGACY). Rozwój v5: [stagesync](https://github.com/Negatywistczny/stagesync).

## Szybki start — scena / produkcja

### Aplikacja desktop (Tauri — standalone, primary)

Pobierz `.dmg` (macOS) lub `.msi` (Windows) z [Releases](https://github.com/Negatywistczny/stagesync/releases) i zainstaluj.
W β1 aplikacja uruchamia lokalny serwer (sidecar Node) automatycznie i otwiera okno Admin/Timeline.

Instrukcja: [docs/DESKTOP.md](docs/DESKTOP.md).

> Uwaga (PoC v1): serwer startuje na `http://127.0.0.1:4000`. Jeśli port `4000` jest zajęty, zobaczysz czytelny błąd zamiast pustego ekranu.

### Serwer sceniczny (Docker — secondary)

```sh
docker login ghcr.io          # PAT read:packages — jednorazowo
cp .env.example .env          # ustaw STAGESYNC_VERSION, tokeny
docker compose -f compose.prod.yml up -d
```

| URL | Opis |
|-----|------|
| http://localhost:4000/admin | Admin (operacje, ustawienia) |
| http://localhost:4000/ | Client (role sceniczne) |
| http://localhost:4000/timeline | Timeline (edytor) |

Pełna instrukcja: [docs/INSTALL.md](docs/INSTALL.md).

### Aktualizacja

Admin → **Sprawdź aktualizacje** → Aktualizuj host / Aktualizuj aplikację.
Ręcznie: zmień `STAGESYNC_VERSION` w `.env` → `docker compose -f compose.prod.yml up -d`.
Bez git-apply ([ADR 0004](docs/adr/0004-updates-docker.md)).

---

## Dev (ze źródeł)

**Wymagania:** Node.js 20 (`nvm use`), [pnpm](https://pnpm.io/) 9.

```sh
git clone https://github.com/Negatywistczny/stagesync.git
cd stagesync
pnpm install
pnpm dev       # web :3000 + server :4000
```

```sh
pnpm test
pnpm build
pnpm lint
docker compose up --build -d   # dev z Dockerem (lokalny build)
```

Wersja: `"version"` w root `package.json`.

## Dokumentacja

| Plik | Zawartość |
|------|-----------|
| [INSTALL](docs/INSTALL.md) | Docker Compose — scena, GHCR, update/rollback |
| [DESKTOP](docs/DESKTOP.md) | Tauri standalone (sidecar) — operator |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Mapa monorepo, SSOT, legacy |
| [ROADMAP](docs/ROADMAP.md) | Etapy wydania (alpha → beta → 5.0.0) |
| [TODO](docs/TODO.md) | Checklista bieżącego etapu |
| [CHANGELOG](CHANGELOG.md) | Historia zmian |
| [docs/ui/](docs/ui/README.md) | Design system (kolory, Button) |
| [CONTRIBUTING](CONTRIBUTING.md) | Język docs + Conventional Commits |

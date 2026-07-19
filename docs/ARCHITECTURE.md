# StageSync v5 — Architektura

## Mapa dokumentacji (jedno źródło prawdy)

| Plik | Tylko to | Nie tu |
|------|----------|--------|
| [README](../README.md) | Uruchomienie | Historia, backlog, pełne reguły |
| [CHANGELOG](../CHANGELOG.md) | Historia wydań | Przyszłe zadania |
| [TODO](./TODO.md) | Przyszłe zadania | Odhaczone / „zrobione” |
| [STANDARDS](./STANDARDS.md) | Linki do speców zewnętrznych | Treść tych speców |
| [CONTRIBUTING](../CONTRIBUTING.md) | Język docs + workflow commitów | SemVer / release (→ versioning) |
| [docs/adr/](./adr/) | Decyzje z kontekstem i konsekwencjami | Checklisty zadań |
| `.cursor/rules/` | Reguły egzekwowane przez agenta | Długie tutoriale |

## Monorepo

| Paczka / app | Stack | Odpowiedzialność |
|--------------|-------|------------------|
| `apps/server` | Express (Node 20+) | API, persystencja, transport SSOT |
| `apps/web` | Vite + React | UI; playhead tylko między tickami serwera |
| `packages/shared` | TypeScript + Zod | Czyste schematy i czas |
| `packages/ui` | React | Design system (`Button`, `--ss-*`) |
| `data/` | JSON / katalogi | Biblioteka, `projects/<id>/`, logi |

Szczegóły granic i zakazów: [konstytucja](../.cursor/rules/constitution.mdc).

## SSOT i czas

Serwer jest źródłem prawdy transportu i stanu projektu; klient może wygładzać playhead wyłącznie między tickami serwera.

**Kanon pozycji:** integer **ticks** + stałe **PPQ** (nie float `absBeat`, nie sekundy). **BBT** = widok/API. Takt 1 = start utworu; pre-roll ≤ 0. Pełna decyzja: [ADR 0002](./adr/0002-timebase-ssot.md).

Układ na dysku: [ADR 0001](./adr/0001-storage-layout.md).  
Kierunek UI (Booth): [ADR 0003](./adr/0003-ui-direction-booth.md).

## API biblioteki (REST)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/health` | Healthcheck |
| `GET` | `/api/library` | Indeks biblioteki (seed z template jeśli brak pliku) |
| `POST` | `/api/projects` | Utwórz projekt (`{ name }`) |
| `GET` | `/api/projects/:id` | Odczyt `project.json` |
| `PUT` | `/api/projects/:id` | Aktualizacja (`{ name? }`) |
| `DELETE` | `/api/projects/:id` | Usuń projekt + wpis w indeksie |

Błędy: `400` / `404` / `500` → `{ ok: false, error }`. Dane runtime: `STAGESYNC_DATA_DIR` (domyślnie `data/`).

## Legacy

**4.x** tylko w **STAGESYNC-APP-LEGACY**. Nie mieszaj hotfixów 4.x tutaj. Import → przyszły migrator (`data/projects/<id>/`).

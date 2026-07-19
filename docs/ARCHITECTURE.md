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

Serwer jest źródłem prawdy transportu i stanu projektu; klient może wygładzać playhead wyłącznie między tickami. Pełna decyzja: [ADR 0002](./adr/0002-timebase-ssot.md).

Układ na dysku: [ADR 0001](./adr/0001-storage-layout.md).

## Legacy

**4.x** tylko w **STAGESYNC-APP-LEGACY**. Nie mieszaj hotfixów 4.x tutaj. Import → przyszły migrator (`data/projects/<id>/`).

# StageSync v5 — Architektura

## Mapa dokumentacji (jedno źródło prawdy)

| Plik | Tylko to | Nie tu |
|------|----------|--------|
| [README](../README.md) | Uruchomienie | Historia, backlog, pełne reguły |
| [CHANGELOG](../CHANGELOG.md) | Historia wydań | Przyszłe zadania |
| [TODO](./TODO.md) | Checklista bieżącego etapu (alpha / beta) | Odhaczone / kolejne etapy |
| [ROADMAP](./ROADMAP.md) | Etapy wydania (alpha → beta → 5.0.0) | Bieżąca checklista (→ TODO) |
| [docs/ui/](./ui/README.md) | Design system (kolory, typografia, spacing, Button) | Implementacja w `packages/ui` |
| [docs/api/](./api/README.md) | Kontrakt REST / WS (krótko) | OpenAPI / pełne TSDoc |
| [docs/analysis/](./analysis/README.md) | `reports/` (kanon) + `working/` (scratch) dla audytów release/alpha | Scratch-notes jako SSOT |
| [STANDARDS](./STANDARDS.md) | Linki do speców zewnętrznych | Treść tych speców |
| [CONTRIBUTING](../CONTRIBUTING.md) | Język docs + workflow commitów | SemVer / release (→ versioning) |
| [docs/adr/](./adr/README.md) | Decyzje z kontekstem i konsekwencjami (indeks) | Checklisty zadań |
| `.cursor/rules/` | Reguły egzekwowane przez agenta | Długie tutoriale |

## Monorepo

| Paczka / app | Stack | Odpowiedzialność |
|--------------|-------|------------------|
| `apps/server` | Express (Node 20, `.nvmrc`) | API, persystencja, transport SSOT |
| `apps/web` | Vite + React | UI; playhead tylko między tickami serwera |
| `packages/shared` | TypeScript + Zod | Czyste schematy i czas |
| `packages/ui` | React | Design system (`Button`, `--ss-*`) |
| `data/` | JSON / katalogi | Biblioteka, `projects/<id>/`, logi |

Szczegóły granic i zakazów: [konstytucja](../.cursor/rules/constitution.mdc).

## Granica 0 (Domain Axioms)

Niezmienniki domenowe — zmiana = rewrite / nowa edycja, nie zwykły feature:

- **Czas:** takt 1 = start utworu; pre-roll ≤ 0; ticks + PPQ → [ADR 0002](./adr/0002-timebase-ssot.md)
- **Storage:** izolowane foldery `projects/<id>/` → [ADR 0001](./adr/0001-storage-layout.md)

Nazwa warstwy, pace layers, ACL przy migratorze / MIDI / audio:
[ADR 0005](./adr/0005-domain-axioms.md).

## SSOT i czas

Serwer jest źródłem prawdy transportu i stanu projektu; klient może wygładzać playhead wyłącznie między tickami serwera.

**Kanon pozycji:** integer **ticks** + stałe **PPQ** (nie float `absBeat`, nie sekundy). **BBT** = widok/API. Takt 1 = start utworu; pre-roll ≤ 0. API: `ticksToBbt` / `bbtToTicks` w shared. Pełna decyzja: [ADR 0002](./adr/0002-timebase-ssot.md).

Transport (alpha): pozycja z **anchor + elapsed** (nie akumulacja na timerze); broadcast WS ~25 Hz gdy playing. Implementacja: REST + `/ws/transport`. Klient web: Vite proxy `/api` + `/ws`, soft playhead (`getDisplayTicks`) między tickami, `Button loading` na komendach.

**UI:** nowy layout paneli; tokeny black/amber `--ss-*` / CSS Modules; `TransportProvider`
nad routerem. Parity = **zachowanie** v4 (nie inventarz-first, nie clone chrome) —
[ADR 0011](./adr/0011-ui-parity-behavior.md); kierunek wizualny [ADR 0003](./adr/0003-ui-direction-booth.md);
checklista wtórna [ui-shell-inventory.md](./ui-shell-inventory.md).
Aktualizacje Docker: [ADR 0004](./adr/0004-updates-docker.md).  
Desktop shell (Tauri, β1): [ADR 0010](./adr/0010-desktop-shell-tauri.md).

Układ na dysku: [ADR 0001](./adr/0001-storage-layout.md).

Edycja klipów Timeline (Forma, audio, kolizje, Smart Tool): [ADR 0008](./adr/0008-timeline-clip-editing.md).
Snap / kwantyzacja: [ADR 0007](./adr/0007-snap-grid.md).

## API biblioteki (REST + WS)

Kontrakt endpointów, kształt błędów i ticków WS: [docs/api/](./api/README.md).
Schematy Zod: `@stagesync/shared`. Nie JSON:API — [ADR 0006](./adr/0006-no-json-api.md).
Dane runtime: `STAGESYNC_DATA_DIR` (domyślnie `data/`).

## Legacy

**4.x** tylko w **STAGESYNC-APP-LEGACY**. Nie mieszaj hotfixów 4.x tutaj. Import → [MIGRATION.md](./MIGRATION.md) (`pnpm migrate:legacy`).

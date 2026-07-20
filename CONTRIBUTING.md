# StageSync — uwagi dla współtwórców

## Język (kanon)

| Co | Język |
|----|--------|
| Dokumentacja produktowa, ADR, CHANGELOG, reguły agenta | **Polski** |
| Treść commitów (Conventional Commits), kod, nazwy API | **Angielski** |

## Gałęzie (trunk-based)

- **`main`** — linia integracyjna; przed pushem lokalnie przechodzą `pnpm test` i `pnpm build`.
- **Docs / chore / drobne poprawki** — wolno commitować i pushować prosto na `main`.
- **Zadania produktowe z [TODO](docs/TODO.md)** (CRUD, transport, MIDI, …) — tylko krótkie gałęzie `feat/<nazwa>` (ew. `fix/…`) → **Pull Request** → merge do `main`.
- **Bez** Git Flow: nie używamy `develop` ani `release/*`.
- CI: workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) na `push` /
  PR do `main`. Wymaganie zielonego CI przy merge (branch protection) —
  konfiguracja w ustawieniach repozytorium, nie w kodzie.

## Commity

[Conventional Commits](https://www.conventionalcommits.org/pl/v1.0.0/) — egzekwowane przez commitlint + husky (`commit-msg`):

- `feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:` / `ci:` …
- Opis po angielsku; w normalnym workflow **bez** `--no-verify`

Linki do SemVer, Keep a Changelog, EditorConfig, ADR itd.: [docs/STANDARDS.md](docs/STANDARDS.md).  
Mapa „gdzie co żyje”: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

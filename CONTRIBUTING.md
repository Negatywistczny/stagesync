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
Roadmapa (kierunek): [ROADMAP.md](ROADMAP.md). Design UI: [docs/ui/](docs/ui/README.md).

## Checklista przed release

- [ ] [CHANGELOG.md](CHANGELOG.md) — wpisy przeniesione z Unreleased / uzupełnione
- [ ] [README.md](README.md) — uruchomienie i wersja nadal zgodne z rzeczywistością
- [ ] Design System — brak ad-hoc HEX / drugiego Buttona; tokeny `--ss-*` ([docs/ui/](docs/ui/README.md))
- [ ] Brak orphan `TODO` / `FIXME` / `TEMP` w kodzie bez pozycji w [docs/TODO.md](docs/TODO.md)
- [ ] `pnpm lint` / `pnpm check-types` / `pnpm test` / `pnpm build`
- [ ] Zmiana architektury → ADR (status + konsekwencje); Granica 0 → [ADR 0005](docs/adr/0005-domain-axioms.md)

# StageSync — uwagi dla współtwórców

## Język (kanon)

| Co | Język |
|----|--------|
| Dokumentacja produktowa, ADR, CHANGELOG, reguły agenta | **Polski** |
| Treść commitów (Conventional Commits), kod, nazwy API | **Angielski** |

## Commity

[Conventional Commits](https://www.conventionalcommits.org/pl/v1.0.0/) — egzekwowane przez commitlint + husky (`commit-msg`):

- `feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:` / `ci:` …
- Opis po angielsku; w normalnym workflow **bez** `--no-verify`

Linki do SemVer, Keep a Changelog, EditorConfig, ADR itd.: [docs/STANDARDS.md](docs/STANDARDS.md).  
Mapa „gdzie co żyje”: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

# StageSync — uwagi dla współtwórców

## Język

| Co | Język |
|----|--------|
| Dokumentacja produktowa, ADR, CHANGELOG, reguły agenta | **Polski** |
| Treść commitów (Conventional Commits), kod, nazwy API | **Angielski** |

## Commity

Akceptowane są wyłącznie [Conventional Commits](https://www.conventionalcommits.org/pl/v1.0.0/) (commitlint + husky `commit-msg`):

- `feat: …` — nowa możliwość
- `fix: …` — poprawka błędu
- `docs: …` — tylko dokumentacja
- `chore: …` — tooling, zależności, scaffolding
- `refactor: …` / `test: …` / `ci: …` w razie potrzeby

W normalnym workflow **nie** używaj `--no-verify`.

Pełna lista standardów zewnętrznych (linki, bez kopii w repo): [docs/STANDARDS.md](docs/STANDARDS.md).

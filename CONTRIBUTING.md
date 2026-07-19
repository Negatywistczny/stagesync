# StageSync — uwagi dla współtwórców

## Język

| Co | Język |
|----|--------|
| Dokumentacja produktowa, ADR, CHANGELOG, reguły agenta | **Polski** |
| Treść commitów (Conventional Commits), kod, nazwy API | **Angielski** |

## Commity

Akceptowane są wyłącznie [Conventional Commits](https://www.conventionalcommits.org/) (commitlint + husky `commit-msg`):

- `feat: …` — nowa możliwość
- `fix: …` — poprawka błędu
- `docs: …` — tylko dokumentacja
- `chore: …` — tooling, zależności, scaffolding
- `refactor: …` / `test: …` / `ci: …` w razie potrzeby

W normalnym workflow **nie** używaj `--no-verify`.

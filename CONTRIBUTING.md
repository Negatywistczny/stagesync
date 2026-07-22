# StageSync — uwagi dla współtwórców

## Środowisko

- **Node.js 20** — [`.nvmrc`](.nvmrc) (`nvm use`); root `engines`: `>=20 <21`.
- **pnpm 9** — `packageManager` w root `package.json`.

## Język (kanon)

| Co | Język |
|----|--------|
| Dokumentacja produktowa, ADR, CHANGELOG, reguły agenta | **Polski** |
| Treść commitów (Conventional Commits), kod, nazwy API | **Angielski** |

## Gałęzie (trunk-based)

- **`main`** — domyślna linia pracy; małe kroki kod → test → commit → push. Przed pushem lokalnie `pnpm test` i `pnpm build` gdy zmieniasz kod.
- **Gałąź / PR** (`feat/…`, `fix/…`) — tylko gdy **użytkownik o to prosi** albo gdy jawnie potrzebna izolacja; nie „na zapas”.
- **Bez** Git Flow: nie używamy `develop` ani `release/*`.
- CI: workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) na `push` /
  PR do `main`.

Higiena listy zadań i parytetu: [docs/TODO.md](docs/TODO.md), [`.cursor/rules/todo-hygiene.mdc`](.cursor/rules/todo-hygiene.mdc).

### Branch protection (właściciel repo)

Push na `main` OK (Admin bypass). Na PR-ach do `main` — ruleset
[main — require CI](https://github.com/Negatywistyczny/stagesync/rules/19185142)
(Settings → Rules → Rulesets):

- [x] **Require status checks to pass before merging**
- [x] Status check: `lint-types-test-build` (job `name:` w
      `ci.yml`; bez unicode — inaczej Actions `startup_failure`)
- [x] **Nie** wymagaj „Require a pull request before merging”
- [x] Bypass: rola **Admin** (`always`) — bezpośredni push na `main` możliwy

Konfiguracja w GitHub UI / API — nie w kodzie repozytorium.

## Pull Request (gdy użytkownik prosi)

W opisie PR podaj **problem** (1–2 zdania) oraz zaznacz **Wpływ** (model / API / UI / Granica 0)
w [szablonie PR](.github/PULL_REQUEST_TEMPLATE.md). Przy zmianie architektury
lub Granicy 0 — link do ADR.

**Bez** wymogu wireframe → makieta → kod.

## Commity

[Conventional Commits](https://www.conventionalcommits.org/pl/v1.0.0/) — egzekwowane przez commitlint + husky (`commit-msg`):

- `feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:` / `ci:` …
- Opis po angielsku; w normalnym workflow **bez** `--no-verify`
- Merge commits GitHuba (`Merge pull request #…`) nie przechodzą przez lokalny
  hook — to akceptowany wyjątek; treść PR / squash title powinna być CC

Linki do SemVer, Keep a Changelog, EditorConfig, ADR itd.: [docs/STANDARDS.md](docs/STANDARDS.md).  
Mapa „gdzie co żyje”: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).  
Roadmapa (kierunek): [docs/ROADMAP.md](docs/ROADMAP.md). Design UI: [docs/ui/](docs/ui/README.md).

### CHANGELOG.md (Keep a Changelog) + TODO

Pełne reguły agenta: [`.cursor/rules/changelog.mdc`](.cursor/rules/changelog.mdc), [`.cursor/rules/todo-hygiene.mdc`](.cursor/rules/todo-hygiene.mdc).

Skrót CHANGELOG: ludzki opis korzyści/zachowania; kolejność H3 **Dodano → Zmieniono → Naprawiono**; domeny jako emoji `####` (`⏱️ Timeline & DAW`, `🎛️ Audio / MIDI / Transport`, `🖥️ App Shell & UI`, …); **nigdy** drugi ten sam H3; agreguj commity; bez nazw funkcji, tokenów CSS, CI/Vitest ani checklist G1–G10. Skrót TODO: tylko otwarte `[ ]`; ukończone → CHANGELOG, potem usuń z listy (bez „Dostarczone” / `[x]`).

| Tak | Nie |
|-----|-----|
| Co się zmienia w zachowaniu systemu | Żargon czatu / AI (`stub`, `residual`, `must w strumieniu`, `ROADMAP OUT`) |
| Fakt względem ostatniego wydania | Fałszywy „powrót” do stanu, którego nie było w wydanej wersji |
| Kategorie: Zmieniono / Dodano / Naprawiono / Usunięto | Polityka zespołu, ADR, checklisty TODO (to żyje w ADR / CONTRIBUTING / TODO) |
| Zwięzły opis + opcjonalny link `#issue` / `#pr` | Relacja przebiegu prac („fundament pod…”, „parity bez stubu…”) |

Polityka parytetu v4 → `5.0.0`: [ADR 0011 §1a](docs/adr/0011-ui-parity-behavior.md).

## Checklista przed release

- [ ] [CHANGELOG.md](CHANGELOG.md) — wpisy przeniesione z Unreleased / uzupełnione; **bez** sekcji `[Unreleased]` w trakcie cut release (dopiero po pierwszych zmianach post-release); styl wg [changelog.mdc](.cursor/rules/changelog.mdc)
- [ ] [README.md](README.md) — uruchomienie i wersja nadal zgodne z rzeczywistością
- [ ] Design System — brak ad-hoc HEX / drugiego Buttona; tokeny `--ss-*` ([docs/ui/](docs/ui/README.md))
- [ ] Brak orphan `TODO` / `FIXME` / `TEMP` w kodzie bez pozycji w [docs/TODO.md](docs/TODO.md)
- [ ] `pnpm lint` / `pnpm check-types` / `pnpm test` / `pnpm build`
- [ ] Zmiana architektury → ADR (status + konsekwencje); Granica 0 → [ADR 0005](docs/adr/0005-domain-axioms.md)

# StageSync — uwagi dla współtwórców

## Środowisko

StageSync to monorepo **web + serwer Node** oraz powłoka **desktop Tauri (Rust)**. Same Node/pnpm wystarczą do pracy w przeglądarce; build / `tauri dev` wymaga toolchainu natywnego.

### 1) Warstwa JS (web + API) — zawsze

- **Node.js 22** — [`.nvmrc`](../.nvmrc); root `engines`: `>=22 <23`.
- **pnpm 11** — pole `packageManager` w root `package.json` (np. `pnpm@11.18.0`). **Bez** `npm install` w tym monorepo.

```bash
corepack enable
corepack prepare pnpm@11.18.0 --activate   # wersja = packageManager
pnpm install
pnpm dev   # Vite :3000 + API :4000 — bez kompilacji Rusta
```

### 2) Warstwa desktop (Tauri) — gdy budujesz shell

Poza Node potrzebujesz:

| | Windows | macOS |
|--|---------|--------|
| Kompilator C/C++ | **MSVC** — Visual Studio Build Tools, workload *Desktop development with C++* | **Xcode CLT** (`xcode-select --install`) |
| Runtime WebView | **WebView2** (Evergreen; często już jest z Edge) | (WebKit systemowy) |
| Rust | **rustup** + `cargo` w PATH | to samo |

Kanoniczna lista Tauri 2: https://v2.tauri.app/start/prerequisites/  
Konkretne komendy i weryfikacja: [docs/guides/DESKTOP.md — Wymagania](../docs/guides/DESKTOP.md#wymagania-dev--build).

```bash
pnpm --filter @stagesync/desktop dev
```

`apps/desktop/scripts/check-rust.mjs` może dograć **rustup**, ale **nie** instaluje MSVC ani WebView2 — na czystym Windowsie to najczęstsza przyczyna padu `tauri` / `cargo`.

### Windows (pierwszy raz) — skrót

Uruchom poniższy skrypt po sklonowaniu repozytorium. Automatycznie (po potwierdzeniu) zainstaluje Node 22, włączy pnpm i dogra MSVC/Rust dla aplikacji Tauri:

```powershell
.\scripts\setup.ps1
```

*(Opcjonalnie) Instalacja ręczna (winget):*
```powershell
winget install -e --id OpenJS.NodeJS.22
winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install -e --id Microsoft.EdgeWebView2Runtime
winget install -e --id Rustlang.Rustup
```

Po instalacji VS Build Tools / rustup (lub po zakończeniu `setup.ps1`) **zamknij i otwórz** terminal (oraz Cursor), żeby odświeżyć `PATH`. Następnie:
```bash
pnpm --filter @stagesync/desktop dev
```
Alternatywa pinu Node: [fnm](https://github.com/Schniz/fnm) + `.nvmrc`.

## Język (kanon)

| Co | Język |
|----|--------|
| Dokumentacja produktowa, ADR, CHANGELOG, reguły agenta | **Polski** |
| Treść commitów (Conventional Commits), kod, nazwy API | **Angielski** |

## Gałęzie (trunk-based)

- **`main`** — domyślna linia pracy; małe kroki kod → test → commit → push. Przed pushem lokalnie `pnpm test` i `pnpm build` gdy zmieniasz kod.
- **Gałąź / PR** (`feat/…`, `fix/…`) — tylko gdy **użytkownik o to prosi** albo gdy jawnie potrzebna izolacja; nie „na zapas”.
- Po merge PR head na `origin` jest **usuwany automatycznie** (`delete_branch_on_merge`); lokalnie: `git fetch --prune` i `git branch -d`.
- **Bez** Git Flow: nie używamy `develop` ani `release/*`.
- CI: workflow [`.github/workflows/ci.yml`](./workflows/ci.yml) na `push` /
  PR do `main` — na PR wymagany job `lint-types-test-build`; Docker Compose
  tylko na push do `main` / `workflow_dispatch`; job `playwright-smoke` na push
  do `main` albo PR gdy zmienia się `apps/web/src/**` (docs-only → skip);
  Rust/Tauri wyłącznie w [`.github/workflows/release.yml`](./workflows/release.yml)
  (tagi `v*`). Coverage: flagi Codecov per warstwa — [docs/STANDARDS.md](../docs/STANDARDS.md).
- Wkładki (PR / patch) przyjmujemy na warunkach [LICENSE](../LICENSE) (BSL 1.1).

Higiena listy zadań i parytetu: [docs/TODO.md](../docs/TODO.md), [`.cursor/rules/todo-hygiene.mdc`](../.cursor/rules/todo-hygiene.mdc).

## Cursor (agent tooling)

- **Rules** (zawsze): [`.cursor/rules/`](../.cursor/rules/) — konstytucja, CHANGELOG, parity, TODO.
- **Commands / skills** (jawne): `/night-audit`, `/triage-next`, `/turn-red` → [`.cursor/skills/`](../.cursor/skills/) (procedury sesji; nie dublują Rules).
- **Subagent:** `night-auditor` ([`.cursor/agents/night-auditor.md`](../.cursor/agents/night-auditor.md)) — długie sesje night/evening hygiene z handoffem.

### Branch protection (właściciel repo)

Push na `main` OK (Admin bypass). Na PR-ach do `main` — ruleset
[main — require CI](https://github.com/Negatywistczny/stagesync/rules/19185142)
(Settings → Rules → Rulesets):

- [x] **Require status checks to pass before merging**
- [x] Status check: `lint-types-test-build` (job `name:` w
      `ci.yml`; bez unicode — inaczej Actions `startup_failure`)
- [x] **Nie** wymagaj „Require a pull request before merging”
- [x] Bypass: rola **Admin** (`always`) — bezpośredni push na `main` możliwy

Konfiguracja w GitHub UI / API — nie w kodzie repozytorium.

## Pull Request (gdy użytkownik prosi)

W opisie PR podaj **problem** (1–2 zdania) oraz zaznacz **Wpływ** (model / API / UI / Granica 0)
w [szablonie PR](./PULL_REQUEST_TEMPLATE.md). Przy zmianie architektury
lub Granicy 0 — link do ADR. Etykiety GitHub (`scope:*` / `type:*` / `status:*`) —
zgodnie z konwencją repo (Settings → Labels).

**Bez** wymogu wireframe → makieta → kod.

## Commity

[Conventional Commits](https://www.conventionalcommits.org/pl/v1.0.0/) — egzekwowane przez commitlint + husky (`commit-msg`):

- `feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:` / `ci:` …
- Opis po angielsku; w normalnym workflow **bez** `--no-verify`
- Merge commits GitHuba (`Merge pull request #…`) nie przechodzą przez lokalny
  hook — to akceptowany wyjątek; treść PR / squash title powinna być CC

Linki do SemVer, Keep a Changelog, EditorConfig, ADR itd.: [docs/STANDARDS.md](../docs/STANDARDS.md).  
Mapa „gdzie co żyje”: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).  
Roadmapa (kierunek): [docs/ROADMAP.md](../docs/ROADMAP.md). Design UI: [docs/ui/](../docs/ui/README.md).

### CHANGELOG.md (Keep a Changelog) + TODO

Pełne reguły: [`.cursor/rules/changelog.mdc`](../.cursor/rules/changelog.mdc), [`.cursor/rules/todo-hygiene.mdc`](../.cursor/rules/todo-hygiene.mdc).

**Złota zasada:** wpis tylko gdy użytkownik/realizator zauważyłby różnicę w działaniu aplikacji. Domknięcie TODO ≠ automatyczny wpis.

Skrót CHANGELOG: ludzki opis korzyści/zachowania; kolejność H3 **Dodano → Zmieniono → Naprawiono**; domeny jako emoji `####`; **nigdy** drugi ten sam H3; agreguj commity. **Poza CHANGELOG:** ADR/reporty/ROADMAP/TODO, CI/CD (`.github/`, skrypty release), testy, czysty refactor, bumpy narzędzi, żargon bramek (G1–G10). Wyjątki: Pomoc in-app / INSTALL·DESKTOP·API; instalator/updater widoczny dla użytkownika; krytyczne security w runtime.

Skrót TODO: tylko otwarte `[ ]`; ukończone → ewentualnie CHANGELOG (gdy złota zasada), potem usuń z listy (bez „Dostarczone” / `[x]`).

| Tak | Nie |
|-----|-----|
| Co się zmienia w zachowaniu systemu | Żargon czatu / AI (`stub`, `residual`, `must w strumieniu`, `ROADMAP OUT`) |
| Fakt względem ostatniego wydania | Fałszywy „powrót” do stanu, którego nie było w wydanej wersji |
| Kategorie: Zmieniono / Dodano / Naprawiono / Usunięto | Polityka zespołu, ADR, checklisty TODO, CI, skrypty build |
| Zwięzły opis + opcjonalny link `#issue` / `#pr` | Relacja przebiegu prac („fundament pod…”, „parity bez stubu…”) |

Polityka parytetu v4 → `5.0.0`: [ADR 0011 §1a](../docs/adr/0011-ui-parity-behavior.md).

## Checklista przed release

- [ ] Albo ręcznie, albo: `pnpm cut-release <patch|minor|major> --yes [--push]` ([scripts/release/cut-release.mjs](../scripts/release/cut-release.mjs))
- [ ] [CHANGELOG.md](../CHANGELOG.md) — wpisy przeniesione z Unreleased / uzupełnione; **bez** sekcji `[Unreleased]` w trakcie cut release (dopiero po pierwszych zmianach post-release); styl wg [changelog.mdc](../.cursor/rules/changelog.mdc)
- [ ] [README.md](../README.md) — uruchomienie i wersja nadal zgodne z rzeczywistością
- [ ] Design System — brak ad-hoc HEX / drugiego Buttona; tokeny `--ss-*` ([docs/ui/](../docs/ui/README.md))
- [ ] Brak orphan `TODO` / `FIXME` / `TEMP` w kodzie bez pozycji w [docs/TODO.md](../docs/TODO.md)
- [ ] `pnpm lint` / `pnpm lint:ss-css` / `pnpm check-types` / `pnpm test` / `pnpm build`
- [ ] Po zmianie `packages/ui` tokenów/Button: `pnpm sync:launcher-ui` (przed `tauri dev` / build)
- [ ] Zmiana architektury → ADR (status + konsekwencje); Granica 0 → [ADR 0005](../docs/adr/0005-domain-axioms.md)

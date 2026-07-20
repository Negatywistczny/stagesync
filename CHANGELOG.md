# Changelog

Wszystkie istotne zmiany w StageSync **5.x** są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
projekt stosuje [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

### Dodano

- Branch protection na `main`: wymagany status check CI
  (`lint-types-test-build`) przed merge PR — bez wymuszania PR na
  docs/chore ([CONTRIBUTING](CONTRIBUTING.md)).
- ADR [0008](docs/adr/0008-timeline-clip-editing.md) — edycja klipów Timeline (Forma α7, audio β1, Smart Tool, no overlap).
- ADR [0007](docs/adr/0007-snap-grid.md) — uzupełnienie: Cmd/Ctrl = chwilowy snap off.

## [5.0.0-alpha.5] - 2026-07-20

### Dodano

- **Client karaoke:** rola Tekst z live kontekstem projektu (sekcja Formy, BBT, tempo/metrum @ transport); placeholder braku linii wokalu (`KaraokePane`, `clientKaraoke.ts`).
- **Client shell:** `useActiveProject`, `DrumsPane`; ikony kart ról na ekranie welcome (parity v4).
- **Timeline:** tokeny warstw `--ss-z-*`; locator (bursztynowy) + playhead MIDI (cyjan) na linijce w stylu v4.

### Naprawiono

- Timeline: warstwy z-index (playhead nad clipami); eye w ruler dock (bez pustego wiersza ścieżki); menu widoczności przez portal (bez clipu scroll).
- Timeline: przeciąganie locatora po linijce; typografia numerów taktów (`tabular-nums`, semibold).

## [5.0.0-alpha.4] - 2026-07-20

### Dodano

- **Timeline track grid:** wspólna siatka wierszy dock ↔ lane (`trackRow`, sticky dock); kolejność v4 (Specjalne nad treścią); eye menu per ślad (`timelineTracks.ts`).
- **Lane Tempo/Metrum:** read-only segmenty z `tempoMap` / `meterMap` (`mapSegments.ts`).
- **Inspector Formy:** rename sekcji + długość Countdown (takty) → draft → PUT (`formaInspector.ts`).
- **Dirty guard:** `beforeunload` + React Router `useBlocker` przy nawigacji z niezapisanym draftem.
- **`loadTransport` w Timeline:** jawne ładowanie map przy otwarciu projektu.
- **Admin:** przycisk ukrycia panelu na krawędzi splitu; empty state „Pliki projektu”.

### Naprawiono

- Transport: clamp ujemnego elapsed przy skew zegara (M15); ignorowanie starszych ticków WS po `serverTimeMs` (M12).
- Walidacja klienta transportu Zod przed fetch (M1); zakres beat/tick w `bbtToTicks` (M3).

### Zmieniono

- Router web: `createBrowserRouter` (wymóg `useBlocker`).

## [5.0.0-alpha.3] - 2026-07-20

### Dodano

- **ProjectSchema v2** (strict): `forma.clips`, `tempoMap`, `meterMap`, seed Countdown
  −7680; resolvery `resolveTempoAt` / `resolveMeterAt` / `resolveFormaClipAt`; auto-upgrade v1→v2.
- **API treści:** GET/PUT pełny `project.json`; transport z `activeProjectId`, play/seek z map
  projektu; `POST /api/transport/load`.
- **Timeline α3:** route `/timeline/:projectId`, Forma z danych, pencil, Zapisz/Odrzuć;
  song picker z biblioteki; read-only lane Tempo/Metrum.
- **Admin / Client:** link Timeline z wybranym id; status „Sekcja”; rola Client `drums` (Forma).
- **Chrome shelli:** wspólny `ShellWordmark`; `ShellIconButton`, `SettingsPopover`, `ConnectionIndicator`;
  Client — jednolinijkowy nagłówek, popovery ustawień (v4-style).
- **Snap grid (faza 1):** `quantizeTicks` @ shared, domyślnie takt; ADR [0007](docs/adr/0007-snap-grid.md).
- **Stabilność storage/transport:** H1/H5 engine, H2–H4 library CRUD, `ProjectIdSchema` (UUID).
- Dokumentacja: [docs/api/](docs/api/README.md) (PUT v2 + transport z map).
- Dokumentacja DS: [typography](docs/ui/typography.md) / [spacing](docs/ui/spacing.md);
  tokeny `--ss-duration-fast|normal|slow`; ikony shelli przez Lucide.

## [5.0.0-alpha.2] - 2026-07-20

### Dodano

- Higiena repo: [`.env.example`](.env.example) (`PORT`, `STAGESYNC_DATA_DIR`);
  Dependabot (npm + github-actions, weekly); [CODEOWNERS](.github/CODEOWNERS).
- DX: pin Node 20 (`.nvmrc`, `engines` `>=20 <21`, CI `node-version-file`);
  checklista branch protection (status checks) w CONTRIBUTING; JSDoc `@example`
  na helperach czasu / soft playhead (`@stagesync/shared`).
- Tokeny statusu `--ss-color-success` / `warning` / `info`; dokumentacja
  [docs/ui/](docs/ui/README.md) (kolory + Button 7 stanów / PWA); [docs/ROADMAP.md](docs/ROADMAP.md);
  checklista release w CONTRIBUTING; README `@stagesync/ui` i `@stagesync/shared`.
- CI GitHub Actions (lint, check-types, test, build) + szablony PR / Issues;
  [LICENSE](LICENSE) (MIT); [SECURITY.md](SECURITY.md).
- [ADR 0005](docs/adr/0005-domain-axioms.md) — Granica 0 (domain axioms: czas +
  foldery projektów), mapa pace layers, checklista ACL pod migrator / MIDI /
  audio.
- [ADR 0006](docs/adr/0006-no-json-api.md) — świadome odrzucenie JSON:API;
  indeks ADR + słownik statusów ([docs/adr/README.md](docs/adr/README.md)).
- Fundament gęstości UI: skala `--ss-space-1…16`, elevation
  (`surface` / `elevated`), `border-muted`, scenic scrollbary, reguła
  [`ui-density.mdc`](.cursor/rules/ui-density.mdc); Button `iconOnly` +
  focus outline / `@media (hover: hover)`; remap shelli Admin / Client /
  Timeline na tokeny spacingu.
- Tokeny typografii: `--ss-text-*` (w tym `control` pod Button/inputy),
  `--ss-font-weight-*`, `--ss-leading-*`, `--ss-tracking-*` (shells/`Button` bez
  ad-hoc wartości; Button = control + semibold + leading compact).
- Paleta domyślna black / amber (jak v4) w `--ss-*`; `--ss-color-on-primary` pod
  tekst na amber CTA.
- Admin — tworzenie / usuwanie / zmiana nazwy projektu z UI (Zod body przed
  fetch; `commandPending` blokuje listę i panel).
- Shelle UI: Admin — własny layout (chrome + sekcje + status), inventarz
  funkcji v4 ([ui-shell-inventory.md](docs/ui-shell-inventory.md)); Client /
  Timeline — inventarz (osobny redesign); tokeny black/amber + CSS Modules;
  `TransportProvider` nad routerem; Audio 0…N; bez git-apply
  ([ADR 0004](docs/adr/0004-updates-docker.md)).
- Klient web: panel transportu (Play / Pause / Seek), WebSocket + soft playhead
  (`getDisplayTicks` w shared, rAF z `frameTime`), Vite proxy `/api` i `/ws`,
  `Button loading` na czas komend REST.
- Transport SSOT na serwerze: `GET|POST /api/transport` (play / pause / seek),
  WebSocket `/ws/transport` (~25 Hz); pozycja z anchor + elapsed (bez driftu
  `+=` na timerze); schematy Zod w shared.
- Kanon timebase w `@stagesync/shared`: integer ticks + `DEFAULT_PPQ` (960),
  helpery `ticksToBbt` / `bbtToTicks`, `toDisplayBar` / `fromDisplayBar`
  (oraz `quartersToTicks` / `ticksToQuarters` pod migrator).
- CRUD API projektów / biblioteki z persystencją w `data/` (`GET /api/library`,
  `POST|GET|PUT|DELETE /api/projects`) — Zod na krawędziach, seed z
  `library.template.json`, override `STAGESYNC_DATA_DIR` pod testy.
- Dokumentacja produktowa i reguły agenta po polsku (commity i kod pozostają EN).
- [docs/STANDARDS.md](docs/STANDARDS.md) — linki do zewnętrznych standardów (bez vendoringu).
- [`.editorconfig`](.editorconfig) — spójny styl edytora (jak legacy).
- Workflow gałęzi (trunk-based): docs/chore na `main`; feature z TODO → `feat/*` + PR
  ([CONTRIBUTING.md](CONTRIBUTING.md)).
- [ADR 0003](docs/adr/0003-ui-direction-booth.md) — black/amber domyślnie; layout nowy;
  inventarz kontrolek = parity v4 ([ui-shell-inventory.md](docs/ui-shell-inventory.md)).
- [ADR 0004](docs/adr/0004-updates-docker.md) — aktualizacje przez Docker (bez git-apply).

### Zmieniono

- [ADR 0002](docs/adr/0002-timebase-ssot.md) — kanon timebase: integer ticks + PPQ;
  BBT tylko jako widok.
- [ADR 0003](docs/adr/0003-ui-direction-booth.md) — layout ≠ inventarz; zakaz
  ucinania kontrolek v4 „bo placeholder”.
- Podział dokumentacji bez dublowania (README = start, TODO = tylko przyszłość,
  ARCHITECTURE = mapa + monorepo, historia = CHANGELOG); usunięte odhaczone day-0 z TODO.

### Usunięto

- Float `absBeat` z `@stagesync/shared` (kanon pozycji = ticks + PPQ).

## [5.0.0-alpha.1] - 2026-07-19

### Dodano

- Bootstrap monorepo: Turborepo + pnpm workspaces
- `apps/web` — klient Vite + React (port 3000)
- `apps/server` — szkielet API Express (port 4000)
- `packages/shared` — schematy Zod i czyste helpery czasu
- `packages/ui` — kanoniczny `Button` (7 stanów) i tokeny `--ss-*`
- Układ `data/`: `library/`, `projects/`, `logs/` + szablon biblioteki
- Konstytucja, ADR (storage, timebase SSOT), architektura i TODO
- Conventional Commits przez commitlint + husky

[Unreleased]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.5...HEAD
[5.0.0-alpha.5]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.4...v5.0.0-alpha.5
[5.0.0-alpha.4]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.3...v5.0.0-alpha.4
[5.0.0-alpha.3]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.2...v5.0.0-alpha.3
[5.0.0-alpha.2]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.1...v5.0.0-alpha.2
[5.0.0-alpha.1]: https://github.com/Negatywistyczny/stagesync/releases/tag/v5.0.0-alpha.1

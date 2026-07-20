# Changelog

Wszystkie istotne zmiany w StageSync **5.x** są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
projekt stosuje [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

### Dodano

- [ADR 0010](docs/adr/0010-desktop-shell-tauri.md) — desktop shell Tauri (thin WebView, SSOT na serwerze).

### Zmieniono

- ROADMAP: β1 = host (Docker + Tauri + stabilność); β2 = audio + MIDI (rozbicie „feature complete”).
- **Timeline:** ukryte lane’y audio / `+ Audio` / eye-toggle audio do β2 (schema v3 refs bez zmian).

## [5.0.0-alpha.7] - 2026-07-20

### Dodano

- **Timeline Forma:** pencil drag (zakres taktów), pointer/Smart move + resize brzegów, Delete/Backspace + eraser; transakcyjny `gesturePreview` (commit na pointerup); no-overlap w `@stagesync/shared` (`clip-collision`); Countdown nietykalny; sekcje `startTicks >= 0` ([ADR 0008](docs/adr/0008-timeline-clip-editing.md)).
- **Smart Tool** w toolbarze; strefy trim/move tylko przy Pointer/Smart — Pencil = exclusive draw.
- **Snap:** Cmd/Ctrl = chwilowy snap off, ewaluacja `metaKey`/`ctrlKey` na każdym `pointermove` ([ADR 0007](docs/adr/0007-snap-grid.md) faza 3).
- **Schema v4:** lane’y `tekst` / `akordy` / `cue`; upgrade v3→v4; seed puste tablice.
- **Lane Tekst MVP:** pencil click, select, Delete, inspector tekst; Client karaoke czyta linię z clipu.
- Scope + plan + QA: [report-scope-alpha7](docs/analysis/reports/report-scope-alpha7.md); ADR 0008 → Zaakceptowany.

### Zmieniono

- Canonical `Project` = v4; Tap / UG / Różdżka / Scissors / Zoom pozostają disabled (cut α7).

## [5.0.0-alpha.6] - 2026-07-20

### Dodano

- **Schema v3:** `assets[]`, `audioTracks[]`, `audioClips[]`; upgrade v2→v3 przy odczycie; `projectEndTicks` (fallback 2 takty).
- **Pliki projektu:** import audio (multipart) do `data/projects/<id>/assets/`; lista/usuń w inspectorze Admin; merge-preserve przy PUT (race z uploadem).
- **Setlista:** `data/library/setlist.json`; API GET/PUT + auto-advance; zakładka Set (dodaj, drag, zapisz); footer **Dalej** / **Teraz** z transportu.
- **Timeline:** lane’y audio read-only z v3 (placeholder bez playback); Stop; prev/next / auto-setlista w headerze.
- **Scena (minimal):** `POST /api/stage/message` + cue na Client przez WS.
- **Client:** empty states `grid` / `score` (α7); toast komunikatu sceny.
- ADR [0009](docs/adr/0009-project-schema-v3.md); uzupełnienie [ADR 0001](docs/adr/0001-storage-layout.md) (`assets/`, `setlist.json`).
- ADR [0008](docs/adr/0008-timeline-clip-editing.md) — edycja klipów Timeline (Forma α7, audio β1, Smart Tool, no overlap).
- ADR [0007](docs/adr/0007-snap-grid.md) — uzupełnienie: Cmd/Ctrl = chwilowy snap off.
- Branch protection na `main`: wymagany status check CI (`lint-types-test-build`) przed merge PR.

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

[Unreleased]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.7...HEAD
[5.0.0-alpha.7]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.6...v5.0.0-alpha.7
[5.0.0-alpha.6]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.5...v5.0.0-alpha.6
[5.0.0-alpha.5]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.4...v5.0.0-alpha.5
[5.0.0-alpha.4]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.3...v5.0.0-alpha.4
[5.0.0-alpha.3]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.2...v5.0.0-alpha.3
[5.0.0-alpha.2]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.1...v5.0.0-alpha.2
[5.0.0-alpha.1]: https://github.com/Negatywistyczny/stagesync/releases/tag/v5.0.0-alpha.1

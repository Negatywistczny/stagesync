# Changelog

Wszystkie istotne zmiany w StageSync **5.x** są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
projekt stosuje [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

> **α8 code freeze (2026-07-20):** engineering must + rebuild TE-P0/CD/chrome/Admin zamknięte w kodzie — [report-alpha8-code-freeze.md](docs/analysis/reports/report-alpha8-code-freeze.md).  
> Aktywny etap: **α9** (migrator fixtures + PO smoke P8 + Client CL-01/04/05). **Zakaz β** do green P8 + CL-P0.  
> `package.json` nadal `5.0.0-alpha.8` — bump/tag tylko na prośbę.

### Usunięto

- **Admin Utwory:** duplikaty **Eksport** / **Import UG** z nagłówka listy — zostają tylko w kafelku **Pliki** (pod Wybrany).
- **Admin Utwory:** filtr Wszystkie / Ostrzeżenia — lista zawsze pokazuje wszystkie utwory.
- **Admin:** zakładka **Pliki** — kafelek importu (`.stagesync.json` / legacy) przeniesiony pod **Wybrany** na Utwory.
- **Admin Utwory:** przełącznik Ukryj/Pokaż panel (split) — prawy panel „Wybrany” zawsze widoczny.
- **Admin footer:** atrapy inventarz-first — disabled „MIDI / Timeline” oraz Tr. / Lead / Edycja zdalna (brak API; wrócą z Live Desk / β2). Status Teraz/Sekcja/Pozycja/Dalej/Połączenie bez zmian.
- **Timeline:** przełącznik Ukryj/Pokaż Właściwości — panel inspector zawsze widoczny.

### Dodano

- **Admin:** przycisk pełnego ekranu w headerze (jak Timeline / Client).
- **Admin Utwory (pod Wybrany):** import legacy `database.json` z auto-detect (v5 pack vs 4.x `songs[]`) + migracja `migrateLegacy*` przy `POST /api/library/import`; ZIP odroczony (komunikat PL).
- **Timeline:** marquee + multi-select (`selectedIds` / `primaryId`) + multi-drag same lane + clipboard ⌘C/X/V/D (Forma/Tekst/Akordy/Cue; paste @ locator) — parity zachowania v4, nie clone CSS.
- SSOT luk behawioralnych: [report-v4-v5-gap-audit.md](docs/analysis/reports/report-v4-v5-gap-audit.md) (TE/KB/AD/CL); szacunek ~55–65% uznany za zbyt optymistyczny (~35–45%).
- **Timeline:** ręczna wysokość ścieżki (drag na dolnej krawędzi docka; dwuklik = Zoom V; `localStorage`; Zoom V zachowuje proporcje) — jak v4 `laneHeights`.
- **Web:** ekran błędu trasy (`errorElement`) + root ErrorBoundary — Odśwież / Client / Admin zamiast białego ekranu.
- [ADR 0011](docs/adr/0011-ui-parity-behavior.md) — parity = zachowanie v4; zakaz clone chrome; zakaz disabled-for-inventory w chrome; inventarz wtórny.
- **Host Restart / Wyłącz:** `POST /api/system/restart|shutdown` + potwierdzenie 2× (jak v4); sieć `GET /api/system/network`.
- **Schema v5:** `keyMap`, `midiProgramId`, `isTemplate`, `artist` / `genre` / `year`; katalog biblioteki z PC / wzorami / `hasMusicXml`.
- **Admin parity:** Batch PC, Ostrzeżenia, kolumna PC, Wzory (nowy z wzoru), Eksport/Import `.stagesync.json`, MusicXML upload.
- **Timeline:** Tonacja (keyMap) edit/readout, Tempo BPM @ playhead, suwaki Zoom H/V/UI, metadane PC/artysta/gatunek.
- **Wygląd:** jasny motyw + wysoki kontrast (`data-theme` / `data-contrast`) w Admin / Timeline / Client.
- **Client:** skala tekstu karaoke, auto-scroll, score zoom lokalny; appearance w drawerze globalnym.
- **Timeline parity follow-up:** Metadane (tytuł / defaultBpm), Loop (region na linijce + `POST /api/transport/loop` SSOT), Follow playhead, Tekst/Akordy/Cue move/resize/pencil, Kotwice (`scoreBarMap`), scissors content, Client H/B + Tap wokalu + notatki Formy.
- **Migrator α9 MVP:** `migrateLegacy*` + CLI `pnpm migrate:legacy` ([MIGRATION.md](docs/MIGRATION.md)); drop legacy `vl-cd-*` (cyfry CD = render Client, nie storage) + granice długości Tekst z restami (bez rozciągania „1” w utwór).
- **Admin:** Host logi SSE (`/api/system/logs/stream` + Pauza/Wyczyść); Scena **presence** (`GET /api/stage/clients` + WS `client_hello`).
- [ADR 0010](docs/adr/0010-desktop-shell-tauri.md) — desktop shell Tauri (thin WebView, SSOT na serwerze).

### Zmieniono

- **Admin Scena:** kolumna **Klienci** szersza (`fr` / `minmax`, nie cap MIDI Host) — listy presence mniej ściśnięte.
- **Admin Host MIDI:** kafelki liczników wypełniają panel (siatka 2×2); wartość pod etykietą, wycentrowane.
- **Admin Host:** Ustawienia / Restart / Wyłącz w chrome headerze (`ShellIconButton`, kolejność jak v4); Sieć na pełną szerokość rzędu.
- **Proces:** α8 rebuild = **code freeze** (engineering); aktywny etap → α9; β nadal zakazana do P8 + CL-P0 ([report-alpha8-code-freeze.md](docs/analysis/reports/report-alpha8-code-freeze.md)).
- **Admin Wybrany:** przycisk „Zapisz nazwę” w tym samym rzędzie co pole nazwy.
- **Admin Utwory:** lista pokazuje `tytuł - artysta` (artysta po „-” bez pogrubienia, muted), gdy `artist` jest ustawiony.
- **Countdown cyfry:** nie są już zapisywane jako clipy Tekst/Akordy (`vl-cd-*`); Client (karaoke / grid) syntetyzuje „2…1” z długości Forma Countdown; migracja / `setCountdownBars` tylko scrubuje stare digit clipy (TE-21).
- **Admin Host:** karta **Sieć** (port / hostname / URL-e z `GET /api/system/network`) zawsze widoczna na zakładce Host; w Ustawieniach tylko krótkie odesłanie + path picker.
- **Admin Host:** Logi (SSE) w lewej kolumnie, MIDI (β2 stub) w prawej — siatka `twoUp`.
- **Admin:** scroll tylko wewnątrz kafelków (listy / body karty / logi) — shell `100dvh` bez przewijania całej strony; chrome + status nieruchome.
- **Admin:** treść paneli (karty / split) w wycentrowanej kolumnie max-width — bez bloczków na całą szerokość viewportu; chrome zakładek i status footer bez zmian.
- **Timeline Tonacja:** tonic + tryb wąskie, w jednym rzędzie (jak Metrum `x / y`).
- **Timeline Metrum:** edycja jako `x / y` (bez etykiet Licznik/Mianownik).
- **Timeline clipy:** kolorowe przezroczyste skóry lane (`color-mix` ~16–20% fill / ~45% border: Forma primary, Tekst info, Akordy primary, Cue warning, Kotwice success, mapy info, Countdown dashed muted); selected = mocniejszy outline/`selected-border` bez żółtego flood.
- **Timeline canvas:** Zoom V (`--tl-row-h`) / Zoom UI (`--tl-zoom-ui`) skalują lane + ruler chrome; suwaki zoom `accent-color: primary`; barlines z `meterMap`; beat ticks na ruler gdy px/bar ≥ 56.
- **Timeline gesty:** Forma snap do musical barlines (meterMap); Tekst/Akordy/Cue snap do beatu; szersze hit zones trim (12px); Cmd/Ctrl = snap off.
- **Timeline mapy:** Tempo/Metrum/Tonacja — snap beat; eraser nie rusza seed @ 0.
- **Timeline chrome:** header grid (song center, ≤1100); help ~72rem; bez narzędzia Zoom (lupa) na pasku — zoom = suwaki H/V/UI (+ Ctrl/Meta+wheel); metadane ⓘ close clears sheet.
- **Client stage:** karaoke window linii, hero akord + next, Forma sekcja/notatka/lista; header wtórny.
- **Admin Set:** biblioteka + kolejność w jednym flow; gęstsze karty.
- **Timeline touch:** `data-tl-tier` (mobile RO / tablet nudge).
- Client — wybór roli: hover/selected tylko black/amber (`selected`); usunięte tęczowe `--ss-color-role-*` (mapowanie na success/warning/focus-ring).
- **Rebuild alpha:** ADR 0003 + konstytucja + TODO / parity-blocker / inventarz — inventarz-first i „engineering READY” **odrzucone**; done = PO smoke zachowania; Admin Set + wybór utworów w jednym flow.
- Client — ekran wyboru roli: duże kafle z ikonami (układ jak v4), hero „Wybierz rolę”, dynamiczny hint i pasek Rozpocznij.
- ROADMAP: β1 = host (Docker + Tauri + stabilność); β2 = audio + MIDI; α8 = reset/rebuild wg ADR 0011.
- **Timeline:** ukryte lane’y audio / `+ Audio` / eye-toggle audio do β2 (schema v3 refs bez zmian).

### Naprawiono

- **Timeline dock:** kolumna etykiet ścieżek / narożnik ruler nieprzeźroczysta (`--ss-color-surface`) — grid i locator/playhead nie prześwitują (bez `opacity` na sticky cell).
- **Timeline Zoom H:** krótkie clipy / segmenty map przy oddaleniu — min. szerokość renderu 4px (`MIN_CLIP_WIDTH_PX`; Forma/Tekst/Akordy/Cue + mapy), żeby nie wyglądały na nachodzące mimo rozłącznych ticków.
- **Client:** wskaźnik połączenia w headerze (kropka + Połączony/Rozłączony) oraz opóźnienie sieci (`N ms`) z ticków transportu (`sentAtMs`) — regresja vs v4 `#connection-indicator`.
- **Import UG / Akordy:** linia akordów + tekst = jeden takt jak w v4 (onsets w takcie, długość do następnego) — bez nachodzenia; przy move/split zachowany symbol remnantu (`-r`).
- **Migrator legacy → akordy:** długość = do następnego onsetu (nie min=takt) + poprawne mapowanie indeksów po sortowaniu — gęste utwory typu Money bez nachodzenia; `sealAkordyLengths` na wyjściu.
- **Timeline Countdown:** rozciąganie długości gestem (body / prawa krawędź, snap do taktów) + shift treści jak v4; lewa krawędź zablokowana (komunikat); inspector `setCountdownBars` z renormem końca CD @ tick 0; po zmianie długości — regeneracja cyfr CD w regionie Countdown + kotwiczenie scrolla (song start w tym samym miejscu viewportu).
- Admin — wiersze wzorów / Batch PC / Scena / Pliki: siatka bez fałszywej kolumny PC, żeby przycisk „Nowy z wzoru” nie zasłaniał nazwy.
- **Timeline parity vs v4:** locator/loop snap @ beat (Cmd/Ctrl = off); locator `primary` vs playhead `info`; playhead nie jako linia przy pause; toolbar transport/BBT wyśrodkowany; Zoom UI mnoży H+V; meta year + editable metrum/tonacja @ 0.
- **Timeline chrome (korekta bez decyzji PO):** Odrzuć/Zapisz z powrotem jako **ikony**; metronom + follow w **center** przy transporcie; footer bez dublowania Utwór/Pozycja/Połączenie/Stan (conn-dot + zoom jak v4).
- **Timeline sterowanie:** Ctrl/Meta+wheel (H zoom), Alt+wheel (V/H), Shift+wheel (scroll H); skróty Space / K / C / ⌘S / Z-fit / ←→ locator.

## [5.0.0-alpha.8] - 2026-07-20

### Dodano

- **Lane Akordy / Cue:** pencil, select, Delete/eraser, inspector (`symbol` / `label`); no-overlap; Client **grid** czyta `akordy.clips`.
- **Scissors Forma:** `splitClipAt` + tool; Countdown nietykalny.
- **Tap** (dock Tekst): tap tempo → `tempoMap` @ locator.
- **Różdżka:** Tekst→Forma, Akordy→Forma, Tekst+Akordy→Forma (`wandContentToForma`).
- **Import UG:** Timeline song screen + Admin; parser Zod Result (`importUgText`); zły input = komunikat UI.
- **Undo/Redo sesji:** stos draftu; po Zapisz `dirty=false` i stos zostaje; Odrzuć = snapshot serwera + clear stos; ⌘/Ctrl+Z.
- **Metronom:** Web Audio klik sync z transportem; `AudioContext.resume()` na Play / toggle.
- **Client:** →następny (setlista), fullscreen; **score** stub MusicXML (OSMD wire).
- **Admin:** filtr + sort utworów; Scena filtr ról w cue; Import UG do zaznaczonego utworu.
- Scope + plan + QA: [report-scope-alpha8](docs/analysis/reports/report-scope-alpha8.md).

### Zmieniono

- ROADMAP: α8 parity / α9 migrator / β1 bez migratora.
- Inventarz UI: odhaczone must α8; świadome delty (zoom, Host MIDI, audio tracks, Batch PC bez schematu).

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

[Unreleased]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.8...HEAD
[5.0.0-alpha.8]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.7...v5.0.0-alpha.8
[5.0.0-alpha.7]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.6...v5.0.0-alpha.7
[5.0.0-alpha.6]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.5...v5.0.0-alpha.6
[5.0.0-alpha.5]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.4...v5.0.0-alpha.5
[5.0.0-alpha.4]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.3...v5.0.0-alpha.4
[5.0.0-alpha.3]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.2...v5.0.0-alpha.3
[5.0.0-alpha.2]: https://github.com/Negatywistyczny/stagesync/compare/v5.0.0-alpha.1...v5.0.0-alpha.2
[5.0.0-alpha.1]: https://github.com/Negatywistyczny/stagesync/releases/tag/v5.0.0-alpha.1

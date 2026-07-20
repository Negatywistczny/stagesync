# Overnight Audit — StageSync V5 monorepo

**Status:** ukończony (2026-07-20)  
**Data audytu:** 2026-07-20 (sesje ~04:36–11:00 Europe/Warsaw; pass 1–16)  
**Zakres:** read-only — `packages/shared`, `apps/server`, `apps/web`, `packages/ui`, ADR, docs  
**Deliverable:** wyłącznie ten plik  
**Metoda:** inventory → deep read → reprodukcje → adversarial → races → edge math → HTTP partial-apply → docs/CI gaps

---

## 1. Podsumowanie Wykonawcze (Exec Summary)

Kod alpha (`5.0.0-alpha.x`) jest **architektonicznie spójny z Granicą 0**: kanon ticks+PPQ w `@stagesync/shared`, silnik transportu oparty o anchor+elapsed (nie `+=` na timerze), Zod na krawędziach HTTP/dysku, brak wycieków DOM/FS ze shared, brak JSON:API, tokeny `--ss-*` jako SSOT kolorów.

**Szacowany poziom ryzyka: ŚREDNI–WYSOKI (Medium–High)** — nie z powodu chaosu architektury, lecz kilku konkretnych luk, które przy concurrent CRUD lub zmianie BPM w trakcie play mogą skazić dane albo zepsuć synchronizację czasu.

| Obszar | Werdykt |
|--------|---------|
| Time math (shared) | Solidny fundament; floorDiv/euclidMod OK dla pre-roll; float tylko w `ticksPerMs` (udokumentowane) |
| Transport engine | **High:** H1 skok pozycji; **H5** częściowy apply BPM przy 500 |
| Storage / concurrency | **High:** RMW + cold seed race; path traversal; ghost entries |
| API / Zod R1 | Library CRUD OK; transport client M1; brak `.strict()` M11; BPM schema bez `.finite()` (M2) |
| UI density / R2 | SongsView OK; chrome częściowe; touch 32px (M13); double-submit window (M14) |
| Playhead / WS client | Soft-clock OK (w tym 5/8 + pre-roll); Timeline canvas mock; WS/REST race (M12) |
| TypeScript | `strict` + `noUncheckedIndexedAccess`; prawie zero `any`; `!` w ClientShell |

**Najwyższy priorytet przed wiringiem Timeline/α3:** H1 (kolejność play), **H5** (finite BPM przed mutate), H2 (mutex storage), H3 (ProjectId), M11 (`.strict()`), M12 (ordering ticków), M15 (clamp elapsed≥0).

**Liczniki:** High **5** · Medium **15** · Low **24**

---

## 2. Krytyczne Znaleziska (High Priority)

### H1 — `play()` zmienia BPM/meter *przed* `samplePosition()` przy już grającym stanie → skok pozycji

**Dowód:** `apps/server/src/transport/engine.ts` linie 109–122:

```109:122:apps/server/src/transport/engine.ts
    play(opts: TransportPlayBody = {}): TransportState {
      if (opts.bpm !== undefined) {
        bpm = opts.bpm;
      }
      if (opts.timeSignature !== undefined) {
        assertValidTimeSignature(opts.timeSignature, ppq);
        timeSignature = { ...opts.timeSignature };
      }
      positionTicks = samplePosition();
      playing = true;
      reanchor();
      startTimer();
      notify();
      return snapshot();
    },
```

`samplePosition()` (41–45) liczy `originTicks + elapsedToTicks(elapsed, bpm, timeSignature, ppq)`. Gdy transport **już gra**, a klient wyśle `POST /play` z nowym `bpm` / `timeSignature`, elapsed od starego `originMs` jest przeliczany **nowymi** parametrami → pozycja skacze (np. 2 s @ 120 BPM ≈ 3840 ticków; po podmianie na 60 BPM przed sample → ≈ 1920).

**Reprodukcja (potwierdzona, resume pass):** skrypt `pnpm exec tsx` w `apps/server` — `play({ bpm: 120 })`, `t = 1000 ms`, potem `play({ bpm: 60 })` przy `playing === true`:

```json
{
  "before": 1920,
  "expected120": 1920,
  "after": 960,
  "wrongIfNewBpm": 960,
  "expectedContinuous": 1920,
  "bugConfirmed": true
}
```

Pozycja **spada o połowę** (1920 → 960): elapsed 1000 ms jest przeliczany nowym BPM 60 zamiast kontynuacji 1920 ticków @ 120.

**Ten sam root cause dla zmiany metrum:** `play({ timeSignature: { numerator: 5, denominator: 8 } })` przy play @120 po 1000 ms → `before: 1920`, `after: 960` (elapsed przeliczany nowym `ticksPerBeat` zamiast kontynuacji).

**Adversarial (pass 4):** `play({})` (puste body) przy `playing` **nie skacze** — `mid === afterEmpty === 1920`. Bug tylko gdy zmienia się `bpm` / `timeSignature`.

**Testy:** `engine.test.ts` sprawdza `play({ bpm: 60 })` tylko ze stanu stop (linie 68–76) — nie pokrywa mid-play change.

**Remediacja:** najpierw `positionTicks = samplePosition()` przy **starych** bpm/ts; potem przypisz nowe bpm/ts; potem `reanchor()`. Albo osobny endpoint `PATCH /transport/tempo` z tą samą kolejnością.

**Impact:** desync playhead / klientów WS; łamie SSOT czasu (ADR 0002).

---

### H2 — Brak mutex / serializacji na read-modify-write `library.json`

**Dowód:** `apps/server/src/storage/index.ts`:

- `createProject` 103–116: `writeProject` → `ensureLibrary` → `push` → `saveLibrary`
- `updateProject` 123–149: analogiczny RMW
- `deleteProject` 152–179: `rm` katalogu, potem splice + `saveLibrary`

Dwa równoległe `POST /api/projects` mogą oba przeczytać ten sam snapshot biblioteki i nadpisać nawzajem wpisy (lost update). Atomic rename (`atomic-write.ts` 5–14) chroni przed half-written JSON, **nie** przed race logicznym.

**Reprodukcja (pass 3, `pnpm exec tsx` + równoległe `fetch`):**

| Równoległe POST | 201 | 500 | wpisy w `library.json` | katalogi `projects/` |
|-----------------|-----|-----|------------------------|----------------------|
| 10 | 4 | 6 | **1** | **10** |
| 20 | 5 | 15 | **2** | **20** |

Przykładowy błąd 500: `ENOENT: no such file or directory, rename '…library.json.<pid>.<ts>.tmp' -> '…library.json'`.

**Mechanizm:** (1) lost update — ostatni `saveLibrary` wygrywa, wcześniejsze `push` znikają; (2) `createProject` zapisuje `project.json` **przed** `saveLibrary` (`storage/index.ts` 112–115) — przy 500 katalog zostaje, wpis w bibliotece nie; (3) `atomic-write.ts` L10: `tmpPath = filePath + '.' + pid + '.' + Date.now()` — wiele zapisów w tej samej ms (ten sam pid) może kolidować na tmp/rename (100 iteracji sync → 1 unikalna ścieżka tmp w teście Node).

**Pass 4 — równoległe DELETE (5 projektów):** statusy `[204,500,500,500,500]`; `projectDirs: 0` (wszystkie foldery usunięte); `libraryEntries: 4` — **ghosty w indeksie** bez katalogów (H4 w praktyce).

**Pass 4 — równoległe PUT rename (10× ten sam id):** `libraryName: "Name9"`, `projectName: "Name8"`, **`match: false`** — indeks biblioteki i `project.json` **rozjechały się** na nazwie. To gorsze niż sam lost-update: dwa SSOT-y nazwy projektu.

**Pass 7 — cold `ensureLibrary` (20× równoległe `GET /api/library` na pustym `dataDir`):** `oks: 15`, `fails: 5` ze `500 Failed to seed library from template` — concurrent seed z `library.template.json` bez locka (`storage/index.ts` 49–69). Sam odczyt biblioteki też wymaga mutexu / single-flight seed.

**Impact:** utrata wpisów; sieroty na dysku; ghosty w bibliotece; **niespójna nazwa library↔project**; użytkownik widzi 500 mimo częściowego sukcesu; **pierwszy start / świeży dataDir** flaky pod load.

---

### H3 — Path traversal / escape z `projectsDir` przez niesanityzowane `id`

**Dowód:**

```29:35:apps/server/src/storage/paths.ts
export function projectDir(paths: DataPaths, id: string): string {
  return join(paths.projectsDir, id);
}
```

`join(projectsDir, '..')` normalizuje poza `projects/`; `join(projectsDir, '../library/library.json')` trafia w `library/library.json` (zweryfikowane: `projectDir()` w resume pass).

Trasy `GET|PUT|DELETE /api/projects/:id` przekazują `req.params.id` bez walidacji UUID / charset (`projects.ts` 24, 38, 47). `deleteProject` woła `rm(projectDir(...), { recursive: true, force: true })` (storage `index.ts` 168–170).

**HTTP (resume pass):** Express normalizuje samotny segment `..` / `.` w URL (np. `DELETE /api/projects/..` → 404 HTML, nie trafia do handlera). Natomiast **zakodowany** `:id` z separatorami ścieżki **dociera** do storage, np. `GET /api/projects/..%2Flibrary%2Flibrary.json` → `req.params.id === "../library/library.json"` → próba odczytu poza `projects/<uuid>/` (500 po seedzie biblioteki — Zod mismatch, nie wyciek treści). Warstwa `join` bez `resolve` + containment jest podatna niezależnie od normalizacji Express.

**Adversarial pass 4:** `DELETE …/../library` → 404 (brak `project.json` w celu — `deleteProject` woła `rm` tylko gdy `access(projectFile)` OK). `PUT` traversal → 404 (wymaga istniejącego projektu). **Blast radius dziś** ograniczony konwencją nazwy `project.json` + create tylko przez UUID; nadal brak whitelisty id = klasa podatności High przed rozrostem API.

**Impact:** odczyt/zapis/usunięcie poza zamierzonym drzewem gdy istnieje `…/project.json`; przy ekspozycji sieciowej — krytyczne w potencjale; na LAN alpha realne przy złośliwym `:id`.

**Remediacja:** Zod `ProjectIdSchema` (np. UUID v4) + assert `resolve(projectDir) ===` prefix `resolve(projectsDir)` + reject `..`, separatorów.

---

### H4 — Okno awarii: projekt na dysku bez wpisu w bibliotece (i odwrotnie przy delete)

**Dowód create:** `writeProject` (112) **przed** `saveLibrary` (115). Crash / kill procesu między nimi → katalog `projects/<uuid>/project.json` istnieje, `library.json` go nie zna. UI listuje tylko bibliotekę → „zniknięty” projekt; `getProject(id)` nadal zadziała po UUID.

**Dowód delete:** `rm` katalogu (168–170) **przed** `saveLibrary` (176–178). Crash po `rm`, przed zapisem indeksu → wpis-widmo w UI, 404 przy otwarciu.

**Impact:** niespójność storage vs Granica 0 „izolowane foldery + indeks”; wymaga ręcznej naprawy / przyszłego hygiene CLI (świadomie poza HTTP — OK), ale alpha nie ma nawet CLI audit.

---

### H5 — Częściowa mutacja w `play()`: BPM przypisywany przed walidacją metrum → HTTP 500 zostawia nowy BPM

**Dowód HTTP (pass 8):** silnik już gra @120; `POST /api/transport/play` body:

```json
{ "bpm": 999, "timeSignature": { "numerator": 4, "denominator": 7 } }
```

→ **500** `ticksPerBar must be an integer…`; natychmiast `GET /api/transport` → **`bpm: 999`**, `timeSignature` nadal 4/4, `playing: true`, pozycja przeliczona jak @999 (np. ~7992 po 500 ms). Klient dostaje błąd, SSOT **cicho zmienił tempo**.

**Mechanizm** (`engine.ts` 109–116): `bpm = opts.bpm` **bez** walidacji; dopiero potem `assertValidTimeSignature` (przed assign metrum). Throw → metrum nietknięte, BPM już zmienione; `playing`/`origin` z poprzedniego play.

**Dodatkowo (pass 6, in-process):** `TransportPlayBodySchema` akceptuje `bpm: Infinity` → mutate → `samplePosition` throw → `getState`/`pause` throw aż do `play({ bpm: finite })`. REST JSON nie przenosi `Infinity` (→ null → 400).

**Remediacja:** waliduj **całość** opts (Zod `.finite()` + `assertValidTimeSignature`) *zanim* jakakolwiek mutacja stanu; albo transactional apply (kopia → validate → commit).

---

## 3. Średnie i Drobne Odstępstwa (Medium / Low)

### Medium

#### M1 — R1: klient transportu nie waliduje body Zod przed `fetch`

`apps/web/src/transport/api.ts` 26–50: `playTransport` / `seekTransport` serializują surowy obiekt bez `TransportPlayBodySchema.parse` / `TransportSeekBodySchema.parse`. Serwer i tak `.parse` (`routes/transport.ts` 22, 39), ale konstytucja + R1 wymagają walidacji na **obu** krawędziach UI→HTTP (por. `libraryApi.ts` 31, 51 — wzorzec poprawny).

#### M2 — `TransportPlayBodySchema` / metrum: słaba walidacja BPM i `ticksPerBar`

`packages/shared/src/transport.ts` 4–7, 12, 25–28:

- Zod akceptuje `denominator: 7` → silnik `assertValidTimeSignature` → `RangeError` → HTTP **500** `"ticksPerBar must be an integer…"` (pass 7 potwierdzony), nie 400.
- `bpm: z.number().positive()` **akceptuje `Infinity`** (pass 6: `safeParse` success) **i ułamki** (`0.5`, `1e-10`, `Number.MAX_VALUE`). `ticksPerMs` wymaga `Number.isFinite(bpm)` — skutek poison → **H5**.
- **HTTP:** `JSON.stringify(Infinity)` → `null` → 400 — REST chroniony przypadkiem. `POST { bpm: 0.5 }` → **200**.
- Pass 6: `play({ bpm: 1e-10 })` mid-play przy H1 → skok pozycji `1920 → ~0`.

**Remediacja:** `.finite().min(…).max(…)`; refine `ticksPerBar`; mapować `RangeError` → 400; nie mutować przed walidacją (H5).

#### M3 — `bbtToTicks` nie waliduje zakresu beat/tick

`packages/shared/src/time.ts` 170–190: beat poza `1..numerator` lub tick ∉ `[0, perBeat)` nadal zwraca ticks. Pass 6 (4/4):

| Wejście | ticks | `ticksToBbt` |
|---------|-------|----------------|
| beat 5 | 3840 | bar 1 beat 1 |
| beat 0 | −960 | bar −1 beat 4 |
| beat −1 | −1920 | bar −1 beat 3 |
| tick 961 | 961 | bar 0 beat 2 tick 1 |
| tick −1 | −1 | bar −1 beat 4 tick 959 |

Round-trip „legalny” tylko dla beat∈[1,n], tick∈[0,perBeat). Ryzyko przy UI seek po BBT.

#### M4 — Soft-clock nie używa `serverTimeMs`; tylko lokalny receipt

`TransportProvider.tsx` 116–125: anchor z ticka + `performance.now()`; `serverTimeMs` z WS jest w schemacie (`transport.ts` 32–35) ale **ignorowany**. Przy dużym jitterze sieci display driftuje między klientami (nadal nie jest autorytetem — OK ADR 0002), ale brak korekty offsetu wall-clock.

#### M5 — R2 częściowe: `commandPending` nie blokuje chrome / innych sekcji Admin

`AdminShell.tsx` SongsView: `locked = commandPending` + `disabled={locked}` na wierszach/input/CRUD (399–568) — **zgodne z R2 dla songs**.  
Natomiast:

- zakładki sekcji (151–164) — bez `disabled`
- linki Timeline/Klient, ikona Wygląd (169–182)
- `FilesView` przycisk „Z pliku…” (693) — bez `commandPending`
- `HostView` Ustawienia / Path picker (721, 789)

**Timeline (pass 3):** `TimelineShell.tsx` 231 — tylko przycisk play/pause ma `disabled={commandPending}` z `TransportProvider`. Reszta toolbaru (188–204 narzędzia, 139 song picker, undo/redo) **bez** `commandPending`. Brak seek w UI — `seek()` z kontekstu nieużywane w shellach (grep `seek(` w `apps/web` = 0).

**Dwa niezależne `commandPending`:** AdminShell L42 (library CRUD) vs TransportProvider L43 (transport REST) — mutacja biblioteki nie blokuje play w Timeline i odwrotnie (by design alpha, ale poza ścisłym R2 „wszystkie kontrolki”).

**ClientShell (pass 14):** `useTransport()` tylko `state` / `displayTicks` / `wsStatus` — brak play/pause/`commandPending` (klient = viewer). Nie luką R2; świadomy scope.

Równoległa nawigacja podczas mutacji może zmieniać kontekst UX (niekoniecznie double-submit library — `runMutation` early-return 93).

#### M6 — Magic px / rem poza siatką tokenów (ui-density)

Przykłady (nie soft-px border 1–2px). Pass 4 inventory:

| Plik | hover / `@media (hover)` | HEX | rem ad-hoc | odd px (>2, poza 4/8pt) |
|------|--------------------------|-----|------------|-------------------------|
| `AdminShell.module.css` | 6 / 6 **OK** | 0 | 16rem, 12rem, 36rem, 5.5rem… | blur **10px** L41; breakpoint 900 |
| `ClientShell.module.css` | **0 / 0** (brak hover feedback) | 0 | 12rem | 320/400/640/720 layout |
| `TimelineShell.module.css` | 3 / 2 (oba bloki media OK) | 0 | 7.5rem, 9rem… | 200/240/480/640 |
| `index.css` | 1 / **0** | 0 | — | — (M7) |
| `button.css` | 3 / 1 (wszystkie hover w media) | 0 | 1rem spinner | 36 iconOnly OK |
| `tokens.css` | — | 22 (SSOT) | type scale | radius 6px |

HEX poza `tokens.css`: **brak** w shellach — zgodne.

#### M7 — Scrollbar `:hover` bez `@media (hover: hover)`

`apps/web/src/index.css` 23–25 — sticky hover na thumb (niski impact, ale odstępstwo od ui-density §5). Button/shelly poza tym owinięte poprawnie.

#### M8 — Express `req.params.id` typowo `string | string[]` (Express 5) bez normalizacji

`projects.ts` przekazuje `req.params.id` prosto do storage. Przy nietypowym shape może dojść do dziwnego `join` / Zod fail później. Brak `String` assert / ProjectId schema.

#### M9 — Brak API zmiany tempa bez `play()`; brak testu mid-play

Produktowo tempo map (draft alpha3) będzie wymagał reanchor. Dziś jedyna ścieżka = H1. `engine.test.ts` nie ma case „playing + bpm change”.

#### M10 — Orphan `.tmp` + kolizja nazw tmp przy concurrent write

`atomic-write.ts` 10–13: `writeFile(tmp)` potem `rename`. Kill między nimi zostawia `*.pid.timestamp.tmp`. Nie psuje JSON (stary plik zostaje), ale śmieci na dysku; brak cleanup.

Przy wielu równoległych `saveLibrary` ten sam `process.pid` + `Date.now()` w tej samej ms → ta sama ścieżka tmp → `ENOENT` na `rename` (powiązane z H2, pass 3). Remediacja: `randomUUID()` lub licznik monotoniczny w tmp path + mutex na plik.

#### M11 — Brak `.strict()` na schematach body → ciche odrzucanie nieznanych pól (strip)

`packages/shared/src/schema.ts` 33–35 — `UpdateProjectBodySchema` bez `.strict()`. Domyślne zachowanie Zod 3: **strip** nieznanych kluczy.

**Resume pass (weryfikacja):**

```text
UpdateProjectBodySchema.parse({ name: "Renamed", forma: { clips: [] } })
→ {"name":"Renamed"}   // forma cicho usunięte

UpdateProjectBodySchema.strict().parse(…) → ZodError code: unrecognized_keys
```

**Pass 12–13:** HTTP `PUT` z `forma` + `formatVersion: 2` → **200**, dysk nadal `formatVersion: 1`. `POST /transport/play` z `{ bpm: 100, unknownTempoMap: true }` → **200** @100 — `TransportPlayBodySchema` (`transport.ts` 25–28) też strip (cisza przy przyszłym wiring tempoMap przez play).
**HTTP:** `PUT /api/projects/:id` z `{ name: "Y", forma: { clips: [] } }` → **200**, odpowiedź tylko ze zmienioną nazwą — treść projektu **nie zapisana, bez błędu**. Przy przyszłym ProjectSchema v2 (draft alpha3) to łamie konstytucję „fail fast — bez cichej naprawy”. Dotyczy też `CreateProjectBodySchema` (28–29) i innych obiektów bez `.strict()`.

**Remediacja:** `.strict()` na schematach body (oraz docelowo pełnym `ProjectSchema` przy PUT).

#### M12 — Race WS tick vs REST command: brak guarda kolejności w `TransportProvider`

`TransportProvider.tsx`:

- `ws.onmessage` (110–134): każdy tick woła `applyAnchor(..., performance.now())` bez porównania `serverTimeMs` ani numeru sekwencji.
- `runCommand` (172–188): po REST `play`/`pause`/`seek` też woła `applyAnchor` z odpowiedzią HTTP.

**Scenariusz:** użytkownik `seek(1000)` → REST zwraca `positionTicks: 1000`; w locie jest starszy WS tick z `positionTicks: 500` → `onmessage` **po** REST nadpisuje anchor na 500 → rAF extrapoluje od złej pozycji do następnego ticka (~40 ms, `TRANSPORT_TICK_INTERVAL_MS`). Analogicznie: REST `play` + opóźniony WS `playing: false`.

`serverTimeMs` jest w `TransportTickMessageSchema` (`transport.ts` 32–35) i wysyłany z silnika (`engine.ts` 63), ale **nigdzie nieużywany** po stronie klienta (pokrywa się z M4, tu osobny aspekt: **ordering**, nie tylko offset).

**Impact:** migotanie playhead / BBT w Admin/Client/Timeline; po seek przy play — widoczny cof playhead. Serwer SSOT poprawny; klient chwilowo mylący.

**Remediacja:** monotoniczny `serverTimeMs` / `revision` w stanie; ignoruj WS starsze niż ostatni REST receipt; albo jeden kanał komend (tylko WS lub tylko REST + polling).

#### M13 — Strefy dotykowe poniżej ui-density (32px vs 36/44)

`ui-density.mdc` §5: desktop min **36×36**, Client PWA **44×44**.

| Element | Plik | Rozmiar |
|---------|------|---------|
| Timeline `.playBtn` / `.iconBtn` / `.toolBtn` | `TimelineShell.module.css` 81–86 (oraz 119–120 playBtn dup) | `var(--ss-space-8)` = **32×32** |
| Client `.iconBtn` | `ClientShell.module.css` 83–84 | **32×32** |
| Admin `.iconBtn` | `AdminShell.module.css` 151–152 | **32×32** |
| Button `iconOnly` | `button.css` 94–95 | **36×36** (OK desktop, poniżej 44 PWA) |

Krytyczna akcja Play na Timeline ma cel **mniejszy** niż minimum desktop — naruszenie scenic ergonomics. Client (tablet) iconBtn 32 << 44.

#### M14 — `runMutation` / `runCommand`: okno double-submit przed re-render

`AdminShell.tsx` 91–105: `if (commandPending) return` w `useCallback(..., [commandPending])`. Dwa szybkie kliknięcia przed flush `setCommandPending(true)` używają tej samej closure z `commandPending === false` → **dwa równoległe** `create`/`delete`/`rename` (nasila H2). `disabled={locked}` pomaga po re-render, nie w tym samym ticku zdarzeń.

`TransportProvider.tsx` 172–188: `runCommand` **nie** ma early-return przy `commandPending` — tylko ustawia flagę; dwa równoległe play/pause możliwe (nasila M12).

**Remediacja:** `useRef` lock synchroniczny; lub `if (pendingRef.current) return; pendingRef.current = true` przed await.

#### M15 — Cofnięcie wall-clock → cofnięcie `positionTicks` w silniku (brak clamp)

`engine.ts` `samplePosition` 41–45: `originTicks + elapsedToTicks(now() - originMs, …)` — **bez** `Math.max(0, elapsed)`.

**Pass 5:** play @ t=1000 → t=2000 → `positionTicks: 1920`; ustawiono t=1500 (skew −500 ms) → **`960`** (pozycja cofnęła się). Soft-clock klienta (`soft-clock.ts` 34) clampuje ujemny elapsed — display lokalny chroniony; **SSOT serwera** nie.

`elapsedToTicks(-500, 120, 4/4)` → `-960` (zamierzone floorDiv; pass 5). BPM ≤0 / non-finite → `RangeError` (OK). Seek ujemny −3840 + play — OK pre-roll.

**Impact:** rzadkie (NTP / zawieszony proces), ale łamie monotoniczność playhead SSOT. Remediacja: clamp elapsed≥0 w `samplePosition` **lub** reanchor przy wykryciu ujemnego elapsed.

---

### Low

#### L1 — Shared czyste: brak `window` / `fs` / `Date.now` w konwersjach — **PASS**

Grep `packages/shared` — zero trafień. `performance.now` tylko w `engine.ts` (server, injectable) — zgodne z ADR 0002 („clock od callera”).

#### L2 — Brak testów 9/8, 12/8 w `time.test.ts` (matematyka OK poza CI)

Pokryte 4/4, 5/8, 7/8. Pass 3: programowy round-trip pre-roll dla 9/8, 12/8, 6/8, 11/8 @ PPQ 960 — wszystkie `rt=true`. Brak regresji w CI, nie bug runtime.

#### L3 — `getDisplayTicks` nie waliduje anchor (NaN bpm, float ticks)

Zakłada zaufany tick z Zod. Przy bugowanym callerze — garbage in. Akceptowalne przy obecnym wiringu.

#### L4 — `quartersToTicks` tylko integer quarters

OK dla migratora z ACL `Math.round(startAbs * PPQ)` — draft alpha3 to przewiduje; dziś brak migratora (TODO).

#### L5 — ClientShell non-null assertions

`ClientShell.tsx` 32: `prev[1]!`; 215: `ROLES.find(...)!`. Bezpieczne przy lokalnych invariantach, ale kruche przy refaktorze listy ról.

#### L6 — JSON.parse `as unknown` w storage

`storage/index.ts` 43 — potem Zod `.parse` — wzorzec OK (nie `as Project`).

#### L7 — Chrome vs main flex

Admin: grid `auto 1fr auto` (`.shell` L5–6) + `.chrome { flex: 0 0 auto }` L33 + workspace rośnie — **PASS** dla dead-space chrome. Timeline/Client podobnie (`flex: 0 0 auto` / `1 1 auto`). Drobne: `.sections { flex: 1 }` (Admin L80) zamiast `1 1 auto` — kosmetyka.

#### L8 — Hardcoded wersja UI `5.0.0-alpha.1` w AdminShell

`AdminShell.tsx` 146, 769 vs root package version (może dryf przy bumpie) — docs/product polish.

#### L9 — ProjectSchema v1 vs draft v2 — świadomy gap + checklist wiring α3

`schema.ts` 18–23 vs `docs/analysis/reports/report-project-schema-draft-alpha3.md` — nie bug dziś. Draft trzyma ticks (ADR 0002). **Luki produktowe (pass 3–5):**

| Element draft v2 | Stan kodu |
|------------------|-----------|
| `forma.clips`, `tempoMap`, `meterMap` | brak w `ProjectSchema` v1 |
| `GET` pełnego projektu w UI | brak `fetchProject(id)` w `libraryApi.ts` |
| `activeProjectId` w transport | brak w `TransportState` / silniku |
| `resolveTempoAt` / `resolveMeterAt` / `resolveFormaClipAt` | brak w shared (draft L223–231) |
| Full document PUT | dziś tylko `{ name? }` + strip (M11) |
| Auto-upgrade v1→v2 vs fail-fast | draft L237–241 — napięcie z konstytucją |
| Timeline ruler z ticks | mock `CD,1,2…` (`TimelineShell.tsx` 322–324) |
| Seed CD 2 takty (−7680) | draft L130–133; szkic −3840 — **nie kopiować** |

#### L10 — `deleteProject` 204 / brak idempotencji „już usunięte”

`libraryApi.ts` 63–73: 204 bez body — zgodne z ADR 0006; przy błędzie czyta `{ error }`. Informacyjnie: brak jawnego idempotentnego 204 vs 404 — nie luka walidacji.

#### L11 — Timeline: playhead i ruler niepodpięte pod `displayTicks`

`TimelineShell.tsx` 321–327: ruler hardcoded `CD, 1, 2, …` (12 spanów); playhead to pusty `<div className={styles.playhead}>` bez `style.left` z ticks.

`TimelineShell.module.css` 310–318: `.playhead { left: 18%; … }` — stała pozycja CSS, nie funkcja `displayTicks`.

`displayTicks` używane tylko do BBT w pasku transportu (239–240), nie do canvas. Shell alpha — świadome, ale mylące przy testach sync; wiring α3 musi mapować ticks→px.

#### L12 — `ApiErrorSchema` / `HealthResponseSchema` zdefiniowane, nieużywane w runtime

`packages/shared/src/schema.ts` 39–52; eksport `index.ts` 23–24. **Nigdzie** `.parse()` w `apps/` (grep pass 3). Klienci czytają `body.error` ad-hoc (`libraryApi.ts` 13, `transport/api.ts` 11). `/api/health` (`app.ts` 35–41) buduje obiekt typowany `HealthResponse` bez `HealthResponseSchema.parse` — zwraca `"version":"5.0.0-alpha.1"` podczas gdy root `package.json` = `5.0.0-alpha.2` (dryf wersji).

#### L13 — `TransportProvider.error` nie wyświetlany w shellach

`TransportProvider.tsx` 44, 132, 155, 185, 217: stan `error` w kontekście. `AdminShell` / `ClientShell` / `TimelineShell` destrukturyzują `useTransport()` **bez** `error` — invalid WS JSON / failed load transportu niewidoczne w UI (tylko devtools / stan React).

#### L14 — Middleware minimalny; brak global error/404 JSON; brak graceful shutdown

`app.ts` 33–48: wyłącznie `express.json()` (bez limitu body — default ~100kb Express); **brak** `app.use` error middleware; **brak** catch-all JSON 404 (→ L19). Trasy mają lokalne `try/catch` + `handleRouteError`. `index.ts` 7–13: brak `SIGTERM` / `transport.dispose()`. Brak IPC — OK alpha.

**API edge (pass 3):** `POST /transport/seek` bez body → 400; `PUT {}` → 400 — OK.

#### L15 — ClientShell: metronom na sztywno 4 beaty

`ClientShell.tsx` 162–171: `[1, 2, 3, 4].map` — przy `timeSignature` 5/8 / 7/8 podświetlenie `bbt.beat` nie pokrywa metrum (beat 5 nigdy nie ma kropki / 4 kropki mylące).

#### L16 — ClientShell: brak stanów `:hover` (i brak sticky-hover)

`ClientShell.module.css`: **0** reguł `:hover`, **0** `@media (hover: hover)`. Brak sticky-hover (dobrze na tablet), ale też brak feedbacku hover na desktop dla `.roleTile` / `.iconBtn`. Niski priorytet polish.

#### L17 — `seek` z `Number.MAX_SAFE_INTEGER + 2` przechodzi Zod `.int()`

Pass 4: `TransportSeekBodySchema.parse({ positionTicks: Number.MAX_SAFE_INTEGER + 2 })` → accepted (IEEE float nie jest już dokładnym int). Ryzyko przy ekstremalnych seekach — Low; praktycznie UI nie wyśle takich wartości.

#### L18 — Serwer akceptuje nazwę projektu ze whitespace / bez trim / bez max length

`CreateProjectBodySchema` (`schema.ts` 27–29): `z.string().min(1)` — `" "` i `"\t"` **pass** (pass 8: HTTP **201**). Puste `""` → 400. Emoji OK. Pass 11: nazwa **50 000** znaków → **201**, `library.json` ~50 KB — brak `.max()` (DoS dysku / UI przy wielu wpisach). Klient `libraryApi.ts` 31 robi `.trim()` przed parse.

#### L19 — Nieznane ścieżki / błędy body-parser → HTML, nie `{ ok: false, error }`

`app.ts` 27–48: brak catch-all JSON 404; brak global error middleware.

| Request | Status | Shape |
|---------|--------|-------|
| `GET /api/nope` | 404 | HTML Express (pass 5) |
| `POST` body > ~100kb | **413** | HTML `PayloadTooLargeError` (pass 6) — nie `sendError` |

Istniejące trasy z `try/catch` zwracają JSON `{ ok:false }` — niespójność krawędzi poza handlerami.

#### L20 — Dialogi: niespójne `aria-*`, brak focus trap

| Miejsce | Problem |
|---------|---------|
| `AdminShell.tsx` Modal ~810 | `aria-modal` bez `aria-labelledby` (tytuł w `<h2>` niepowiązany) |
| `AdminShell.tsx` appearPop 187 | `role="dialog"` bez `aria-modal` |
| `ClientShell.tsx` drawer 361 | `aria-modal` bez `aria-labelledby` |
| Wszystkie overlaye | brak focus trap / Esc (poza klik backdrop) — shell alpha |

Client name modal 47 — wzorzec OK (`aria-labelledby="name-title"`).

#### L21 — Docs consistency (STANDARDS / ROADMAP / CONTRIBUTING) vs kod

| Źródło | Werdykt |
|--------|---------|
| STANDARDS.md ADR 0006 | Zgodne z kodem (brak JSON:API) |
| ROADMAP Granica 0 → ADR 0005 | Zgodne z konstytucją |
| CONTRIBUTING feat/→PR dla TODO | Zgodne; audyt nie wymaga zmian kodu |
| Wersja `5.0.0-alpha.1` w UI/health fallback | Dryf vs `package.json` **alpha.2** — już L8/L12 |
| Draft schema seed −3840 vs nota −7680 | Wewnętrzna sprzeczność draftu (L9) — nie implementować −3840 |
| CONTRIBUTING / engines | `package.json` `engines.node: ">=20 <21"`; CI `.nvmrc` = **20** — zgodne. Lokalny Node 26 (środowisko agenta) poza pin — nie bug produktu |
| Draft `TempoEventSchema.bpm` | Też `.positive()` bez `.finite()` — te same luki co M2 przy α3 |
| Evidence `01-inventory.md` | 91× `disabled` w shellach — zgodne z L20/M5 (alpha wiring); brak sprzeczności z audytem |
| TODO.md vs ROADMAP | TODO ma Auth/multi-user; ROADMAP nie wymienia Auth — lukę dokumentacyjną (nie sprzeczność kodu) |
| HEX poza `tokens.css` | Pass 9: **0** w `apps/web` shells — PASS konstytucji |

#### L22 — `notify()`: wyjątek w listenerze przerywa pozostałych

`engine.ts` 67–71: synchroniczna pętla `for (const listener of listeners)`. Pass 6: dwa listenery — pierwszy throw → `play()` propaguje błąd, drugi **nie** wywołany (`n=1`). `ws.ts` 24–30 subskrybuje `onChange` — wyjątek w `JSON.stringify`/`parse` lub send może odciąć broadcast do innych klientów w tej samej turze (dziś `send` per-client w osobnej pętli na snapshotcie — OK; listener silnika jest jeden). Nadal: brak izolacji try/catch wokół listenerów.

#### L23 — TODO Auth vs ROADMAP (spójność docs)

Auth przeniesione z TODO do [docs/ROADMAP.md](../../ROADMAP.md) (sekcja „Po 5.0.0”, speculative) — **zamknięte** w reorganizacji docs.

#### L24 — Brak regresji CI dla H1 / H5 w `engine.test.ts`

`apps/server/src/transport/engine.test.ts` (77 linii): advance/pause/seek/pre-roll/bpm-on-start — **brak** case „playing @120 → play({bpm:60}) continuous” oraz „play({bpm:999, bad meter}) nie mutuje bpm”. Soft-clock ma clamp test (PASS). Dopisać przy fix H1/H5.

---

## 4. Lista Rekomendacji (Action Plan)

Priorytet sprintowy — od blokujących SSOT/dane:

1. **[H1] Fix kolejności w `createTransportEngine().play`** — `apps/server/src/transport/engine.ts` ~109–122: sample przy starych parametrach → mutate bpm/ts → reanchor. Dodać test w `engine.test.ts` (playing @120, advance, play bpm 60, expect continuous ticks).
2. **[H5] Atomic apply w `play()`** — waliduj bpm+meter *przed* mutate; Zod `.finite()`; test HTTP: `{bpm:999, timeSignature:{4,7}}` → 400 **i** GET nadal bpm 120. `transport.ts` + `engine.ts` 109–116.
3. **[H3] ProjectIdSchema + path containment** — nowy schema w `packages/shared/src/schema.ts`; użyć w `routes/projects.ts` i `storage` przed `join`; reject `..`, `/`, `\\`.
4. **[H2] Serializacja mutacji biblioteki** — mutex/queue per `dataDir` wokół `create/update/delete` w `storage/index.ts` (lub pojedynczy write-lock file).
5. **[H4] Kolejność create/delete + reconciler** — create: library przed/atomowo z projektem; delete: splice+save przed `rm`.
6. **[M1] Zod przed fetch w `apps/web/src/transport/api.ts`** — mirror `libraryApi.ts`.
7. **[M11] `.strict()` na body / ProjectSchema v2** — fail-fast; test PUT unknown → 400.
8. **[M2] Superrefine time signature + RangeError→400** — z H5.
9. **[M3] Walidacja BBT w `bbtToTicks`** — RangeError gdy beat∉[1,n] lub tick∉[0,perBeat).
10. **[M5/M14] R2 + sync lock** — `AdminShell.tsx` / `TransportProvider.tsx`.
11. **[M12] Guard kolejności WS vs REST** — `TransportProvider.tsx`.
12. **[M15] Clamp elapsed≥0 w `samplePosition`** — `engine.ts` 41–45.
13. **[M4] (opcjonalnie)** — offset `serverTimeMs`.
14. **[M6/M7/M13] CSS + touch** — Timeline/Client/Admin.
15. **[M9/M10] Tempo API + tmp `randomUUID()`** — `atomic-write.ts` L10.
16. **[L11/L15/L18/L19/L20/L22/L24]** — playhead; metronom; trim; JSON 404/413; a11y; listener try/catch; testy H1/H5.
17. **Docs / α3** — H1–H5 + M15 przed wiring; ProjectSchema v2 + `.strict()` + `.finite()` na bpm map; seed CD −7680.

---

## 5. Macierz zgodności (skrót weryfikacji)

| Reguła / ADR | Status | Notatka |
|--------------|--------|---------|
| ADR 0002 ticks+PPQ, BBT view | PASS (shared) | Float tylko `ticksPerMs` |
| ADR 0002 klient ≠ autorytet | PARTIAL | soft-clock OK; M12 ordering WS/REST; L11 playhead mock |
| ADR 0005 shared bez FS/DOM | PASS | |
| ADR 0001 folders per project | PASS layout | H2–H4 = integralność runtime |
| ADR 0006 no JSON:API | PASS | domain JSON + `{ok:false,error}` |
| Zod na krawędziach | PARTIAL | server OK; web transport M1; brak `.strict()` M11 |
| ui-density hover | PARTIAL | button/shells OK; scrollbar M7 index.css |
| ui-density no raw HEX in components | PASS | HEX tylko `tokens.css` |
| R2 commandPending all controls | PARTIAL | SongsView yes; chrome/Timeline tools no |
| Touch targets ui-density | FAIL partial | Play/icon 32px (M13) |
| TypeScript strict hygiene | PASS+ | `strict` + `noUncheckedIndexedAccess`; L5 `!` |

---

## 6. Adversarial re-check (założenie: findingi błędne)

| Finding | Próba obalenia | Wynik |
|---------|----------------|-------|
| H1 | „zawsze skacze przy play” | `play({})` mid-play continuous 1920→1920; skok tylko przy bpm/ts | **Uściślone, utrzymane** |
| H2 | „tylko create” | PUT: library Name9 ≠ project Name8; DELETE: 4 ghosty / 0 dirs | **Potwierdzone szerzej** |
| H3 | „Express / brak project.json = bezpieczne” | DELETE/PUT traversal → 404 dziś; GET escape działa; brak UUID whitelist | **Utrzymane High (klasa + przyszły blast)** |
| M12 WS/REST | „REST nadpisze WS zawsze” | Brak guarda `serverTimeMs` | **Utrzymane** |
| M2 Infinity BPM | „HTTP crashuje silnik” | `JSON.stringify(Infinity)`→null→400; in-process nadal dziura | **Obalone jako High; utrzymane Medium (schema)** |
| M11 (strip) | „strip to feature” | PUT 200 przy `{forma:…}` | **Utrzymane** |
| M13 touch | „36 w Button wystarczy” | Timeline playBtn 32px < 36 | **Utrzymane** |
| L11 playhead | „to tylko shell” | `displayTicks` już w kontekście | **Low OK** |
| „Critical float ticks” | `Math.round` na pozycji | Brak — `Math.floor` w `elapsedToTicks` | **Brak Critical float** |
| H5 Infinity poison | „tylko in-process” | **HTTP:** 500 na złe metrum zostawia bpm 999 | **Utrzymane / wzmocnione** |
| M3 BBT range | „round-trip zawsze” | beat 5 / tick 961 → inny BBT | **Utrzymane / rozszerzone** |
| L22 notify | „WS izoluje klientów” | Pętla listenerów silnika bez try/catch | **Nowe Low** |

**Obszary przeskanowane (pass 3–6):** WS (brak inbound `message` — OK alpha); middleware/`express.json`/413; IPC (brak); playhead; schema draft v2 + resolvers; concurrent CRUD; extreme meters; CSS; Client a11y; BPM Infinity **poison**; health version; clock skew (M15); HTML 404/413; dialog aria; STANDARDS/ROADMAP/CONTRIBUTING; corrupt project.json; BBT out-of-range; library.template; soft-clock clamp vs silnik.

---

## 7. Evidencja — kluczowe ścieżki plików

| Faza | Pliki |
|------|-------|
| 1 Time | `packages/shared/src/time.ts`, `soft-clock.ts`, `transport.ts`, `*.test.ts`, ADR 0002/0005 |
| 2 API | `apps/server/src/routes/*`, `errors.ts`, `app.ts`, `apps/web/src/lib/libraryApi.ts`, `transport/api.ts` |
| 3 UI | `AdminShell` / `ClientShell` / `TimelineShell` + CSS, `packages/ui`, `ui-density.mdc` |
| 4 Storage | `atomic-write.ts`, `paths.ts`, `storage/index.ts`, ADR 0001 |
| 5 TS / docs | tsconfig strict; STANDARDS, ROADMAP, CONTRIBUTING, alpha3 schema draft |

---

## 8. Pass 3–6 — skrót dowodów

| Temat | Wynik |
|-------|--------|
| Concurrent POST/PUT/DELETE | H2: orphan dirs, ghost entries, Name9≠Name8 |
| Cold parallel GET library | H2 pass 7: 15×200 / 5×500 seed race |
| Seek mid-play | continuous OK (−3840+500ms→−2880) — **PASS** (nie H1) |
| H1 bpm/meter / empty play | skok przy zmianie; `play({})` continuous |
| Extreme meters / soft-clock | round-trip OK; 5/8 500ms=480 |
| M12 / M14 / M15 | WS order; double-submit; clock skew 1920→960 |
| M13 touch | 32px Timeline/Client/Admin iconBtn |
| BPM Infinity HTTP | null→400; schema `.positive()` only |
| L18–L21 | spaces name; HTML 404/413; a11y dialogs; docs OK |
| Corrupt project.json | 500 Invalid project.json — fail-fast OK |
| PayloadTooLarge | 413 HTML (L19) |
| beat 0 / out-of-range BBT | M3 tabela pass 6 |
| Infinity BPM Zod | success → engine poison (H5); HTTP null→400 |
| HTTP partial BPM | `{bpm:999, den:7}` → 500, GET bpm=999 (H5) |
| only bad meter | bpm unchanged 120 — assert-before-assign OK dla ts |
| WS inbound client msg | ignorowane — bpm stays 120 (PASS alpha) |
| notify listener throw | L22 n=1, drugi listener skip |
| Cold GET library | 15/20 seed OK (H2) |
| Line re-verify H1/H2 | engine 109–122; storage 103–179 — **aktualne** |
| TransportStateSchema Inf bpm | success (M2/H5 klasa) |
| 50k project name | 201 + library ~50KB (L18) |
| L24 engine tests | brak H1/H5 cases |
| H1 meter-only recheck | 1920→960 (pass 12) |
| PUT forma+formatVersion | 200 rename only; v1 stays (M11) |

---

## 9. Historia passeów (delta pass 7–16)

| Pass | Nowe / wzmocnione |
|------|-------------------|
| 7 | Cold `GET /library` seed race (H2); bad meter → 500 |
| 8 | **H5 HTTP** partial BPM apply; L18 tab/space names |
| 9 | WS inbound ignore PASS; HEX only tokens PASS; L23 Auth docs |
| 10 | L24 brak testów H1/H5; ID hygiene L1–24 |
| 11 | 50k name; TransportState Inf bpm |
| 12 | H1 meter-only reconfirm; M11 PUT strip reconfirm |
| 13 | Line cite H1 OK; play body strip unknown keys (M11); `as any` ≈0 w apps/packages |
| 14 | Resolvers α3 nadal absent; ClientShell transport display-only (brak play); ADR 0006 error shape OK poza L19 |
| 15 | 10× parallel POST projects → 9×500 + 1×201, library n=1 (H2 reconfirm); transport parallel sync OK (single-thread) |
| 16 | `libraryApi` Zod parse in+out PASS; `index.ts` brak SIGTERM/`transport.dispose` (L14); M7 `index.css` L23 |

---

*Raport overnight-audit — ukończony 2026-07-20. High 5 · Medium 15 · Low 24.*

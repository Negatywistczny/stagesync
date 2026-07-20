# Audyt alpha.4 — StageSync V5

**Status:** ukończony (2026-07-20)  
**Data audytu:** 2026-07-20, ~16:21–17:00 Europe/Warsaw  
**Repo:** `stagesync` · wersja w `package.json`: **5.0.0-alpha.3** (α4 w TODO — bez bumpu / tagu)  
**Zakres:** read-only kod + repro in-process; deliverable wyłącznie `docs/analysis/reports/`  
**Podstawa scope:** [report-scope-alpha4.md](./report-scope-alpha4.md) · carry-over: [report-overnight-audit.md](./report-overnight-audit.md)

---

## 1. Podsumowanie wykonawcze

| Metryka | Wartość |
|---------|---------|
| **Poziom ryzyka (wydanie α4)** | **WYSOKI** — brak domknięcia must layoutu Timeline; tag α4 przedwczesny |
| **Poziom ryzyka (fundament po α3)** | **ŚREDNI** — H1/H5/H2/H3 naprawione w kodzie; pozostają M12/M15 i okna H4 |
| **Gotowość scope α4 (must)** | **~21%** (1× PASS, 2× PARTIAL, 4× FAIL z 7) |
| **CI** | `pnpm test` — **89** testów PASS (shared 48, ui 5, server 21, web 15) |
| **Nowe vs carry-over** | **0** nowych High z audytu α4; **4** must α4 FAIL (produkt); overnight **H1/H5/H3 FIXED**, **H2/H4 PARTIAL** |

**Werdykt:** Repozytorium jest **gotowe jako alpha.3** (zgodnie z tagiem), **nie** jako `5.0.0-alpha.4`. Must layout (#1–#3) i inspector Formy (#5) nie zostały zaimplementowane; song picker (#6) jest domknięty. Przed release α4 obowiązkowy jest PR `feat/timeline-track-grid` (blokuje resztę UI) zgodnie z [report-implementation-plan-alpha4.md](./report-implementation-plan-alpha4.md).

**Carry-over:** Większość krytycznych usterek transportu/storage z overnight-auditu została załatana w α3 (CHANGELOG, testy `engine.test.ts`, `library-crud.test.ts`). Otwarte: monotoniczność playhead przy skew zegara (M15), race WS/REST (M12), walidacja klienta transportu (M1), zakres BBT (M3), okno crash create (H4).

---

## 2. Scope α4 — macierz must / should

### Must (7)

| # | Kryterium | Status | Dowód |
|---|-----------|--------|-------|
| 1 | **Track grid** — dock ↔ lane zsynchronizowane, brak rozjeżdżania przy resize | **FAIL** | Osobne drzewa DOM: `aside.dock` (`TimelineShell.tsx` 429–485) vs `motiondiv.lanes` (506–586); brak wspólnej siatki wierszy / `subgrid`. CSS: `.main` grid kolumn, nie wierszy (`TimelineShell.module.css` 135–142). Przy `@media (max-width: 900px)` dock przechodzi w `flex-direction: row; flex-wrap` (549–558) — etykiety poziomo, lane’y pionowo → **gwarantowany rozjazd**. Wysokości: `.dockLabel` `min-height: var(--ss-space-10)` (199–204) vs `.formaLane` `min-height: calc(var(--ss-space-10) + var(--ss-space-2))` (307–311). |
| 2 | **Eye menu per ślad** (Forma zawsze on) | **FAIL** | Jedyny wpis menu: `Specjalne: on/off` (`TimelineShell.tsx` 442–449, stan `showSpecial` 130). Brak per-ślad (Tekst/Akordy/Cue/Audio). Forma nie ma toggle — OK, ale wymóg „pojedyncze ukrywanie” **niespełniony**. |
| 3 | **Kolejność lane’ów = v4** (Tempo/Tonacja/Metrum/Kotwice **nad** treścią) | **FAIL** | Dock: Forma → Tekst → Akordy → Cue → dopiero Specjalne (453–477). Canvas: Forma → Tekst → Akordy → Cue → Specjalne (523–571). Kolejność **odwrotna** do scope α4. |
| 4 | **Lane Tempo/Metrum read-only z `tempoMap` / `meterMap`** + sync playhead | **PARTIAL** | Wartości z resolverów: `resolveTempoAt` / `resolveMeterAt` (`TimelineShell.tsx` 206–211); transport bar 409–414; lane’y to **tekst** `Tempo {n} (read-only)` / `Metrum x/y` (557–569), **bez** renderu zdarzeń map wzdłuż osi czasu. Playhead z `displayTicks` (201, 518–521) — sync **wartości** OK, sync **wizualny map** — brak. |
| 5 | **Inspector Formy** — rename sekcji + długość Countdown → draft → PUT | **FAIL** | Inspector read-only (`TimelineShell.tsx` 602–622). Brak inputów rename / CD length. CSS `.lengthInput` zdefiniowany (`TimelineShell.module.css` 411–421) — **nieużywany** w TSX. `putProject` + draft istnieją (213–225, 63–77 `libraryApi.ts`) — brak UI. |
| 6 | **Song picker** — `GET /api/library` → `/timeline/:id` | **PASS** | `fetchLibrary` przy otwarciu overlay (158–167); modal z `Link to={/timeline/${p.id}}` (692–716); przycisk picker (303–311). Bez mock listy statycznej. |
| 7 | **Dirty badge + load** | **PARTIAL** | Badge „Niezapisane zmiany” (`170–173`, `424–426`). Zapisz/Odrzuć działają (327–335). **Brak** `beforeunload` / guard nawigacji (grep `apps/web` — 0 trafień). `loadTransport` w `transport/api.ts` 37–43 — **nieużywany** w shellach; play woła `play({ projectId })` (396–398), serwer ładuje mapy przy play (`routes/transport.ts` 25–34). |

**Must pass rate (ściśle PASS):** 1/7 = **14%**  
**Must z częściowym uznaniem (PASS + ½×PARTIAL):** **~21%**

### Should (α4 — skrót)

| Wycinek | Status | Dowód |
|---------|--------|-------|
| Admin „Ukryj panel” na split (nie w toolbarze Utwory) | **FAIL** | Przycisk w `cardHead` sekcji Utwory (`AdminShell.tsx` 464–469). |
| Admin „Pliki projektu” empty state | **FAIL** | Statyczna lista `MusicXML / Audio / Okładka` (623–628). |
| Client `drums` polish | **PARTIAL** | `formaPane` z nazwą/sekcją/taktem (`ClientShell.tsx` 224–233) — lepsze niż sam tekst α3, bez pełnego layoutu roli. |
| Client welcome ikony | **NOT STARTED** | Karty ról bez emoji v4. |
| Admin „Teraz” vs `activeProjectId` | **NOT STARTED** | Przycisk „Odtwórz” + `play` (`AdminShell.tsx` 606–611) — bez sync etykiet D-12. |
| Transport Stop / clamp końca / seek UI | **NOT STARTED** | Stop disabled (`TimelineShell.tsx` 387–388). |
| Walidacja transportu web + BBT (M1–M3) | **PARTIAL** | `libraryApi` Zod in+out OK; `transport/api.ts` bez parse przed fetch (M1); `bbtToTicks` bez walidacji beat∈[1,n] (M3). |

---

## 3. Krytyczne (High)

Brak **nowych** High wprowadzonych przez prace α4 (α4 w praktyce nie ruszyła layoutu). Poniżej carry-over nadal istotny dla SSOT / integralności:

| ID | Temat | Status | Dowód |
|----|-------|--------|-------|
| **H4** | Okno crash create/delete (indeks ↔ dysk) | **PARTIAL** | Delete: `saveLibrary` przed `rm` (`storage/index.ts` 198–208) — **poprawione**. Create: `saveLibrary` **przed** `writeProject` (141–143) — crash między nimi → wpis w bibliotece bez `project.json`. |
| **M15→High** | Cofnięcie `positionTicks` przy skew wall-clock | **OPEN** | `samplePosition` bez clamp elapsed (`engine.ts` 45–48). Repro 2026-07-20: `p1=1920`, `p2=960`, `rewound=true`. |

Pozostałe overnight **High** — **FIXED** (sekcja 5).

---

## 4. Średnie / niskie

### Średnie (wybrane — α4 + carry-over)

| ID | Temat | Status | Dowód |
|----|-------|--------|-------|
| **M1** | Klient transportu bez Zod przed `fetch` | **OPEN** | `playTransport` serializuje body bez `TransportPlayBodySchema.parse` (`transport/api.ts` 26–34). Wzorzec poprawny: `libraryApi.ts` 43, 67. |
| **M3** | `bbtToTicks` — beat/tick poza zakresem | **OPEN** | `time.ts` 170–189 — brak walidacji beat∈[1,numerator], tick∈[0,perBeat). |
| **M5** | `commandPending` nie blokuje całego chrome Timeline | **OPEN** | Tylko play (`TimelineShell.tsx` 394); narzędzia/undo/picker bez locka (357–368). |
| **M11** | `.strict()` na wszystkich body | **PARTIAL** | `PutProjectBodySchema` / `ProjectSchemaV2` strict (`schema.ts` 61–76, 84–87); `CreateProjectBodySchema` bez strict (91–93). Test HTTP unknown PUT → 400 (`library-crud.test.ts` 141–154). |
| **M12** | Race WS tick vs REST | **OPEN** | `TransportProvider.tsx` 110–126 — `applyAnchor` bez porównania `serverTimeMs`; REST receipt 178–179 ten sam wzorzec. |
| **M14** | Double-submit przed re-render | **OPEN** | `runCommand` bez sync ref lock (`TransportProvider.tsx` 173–189). |
| **H2 remnant** | Cold `ensureLibrary` bez locka na GET | **PARTIAL** | Mutacje przez `withLibraryLock` (64–73, 136+); `getLibrary` → `ensureLibrary` bez mutexu (131–133) — równoległy cold seed nadal możliwy (overnight pass 7). CI: `concurrent creates` 5×201 (`library-crud.test.ts` 203–219) — mutacje OK. |
| **α4 product** | Brak track grid / eye / inspector | **OPEN** | Macierz §2 — bloker release. |

### Niskie (skrót)

| ID | Temat | Status |
|----|-------|--------|
| L8/L12 | Wersja UI `5.0.0-alpha.3` w `appVersion.ts` | OK (zgodne z `package.json`) |
| M13 | Touch 32px play na Timeline | OPEN (`TimelineShell.module.css` 48–53) |
| M7 | Scrollbar `:hover` bez `@media (hover)` | OPEN (`index.css`) |
| L19 | HTML 404 poza handlerami | OPEN (`app.ts`) |
| L13 | `TransportProvider.error` niewidoczny w shellach | OPEN |

---

## 5. Carry-over z overnight — H1–H5

| ID | Opis | Status | Dowód |
|----|------|--------|-------|
| **H1** | `play()` zmienia BPM przed `samplePosition()` | **FIXED** | `positionTicks = samplePosition()` przed mutacją BPM (`engine.ts` 143–157). Test: `engine.test.ts` 78–87. Repro: `before=1920, after=1920, bugConfirmed=false`. |
| **H2** | RMW `library.json` bez serializacji | **FIXED** (mutacje) | `withLibraryLock` (`storage/index.ts` 64–73, 136–210). Test concurrent 5× create (`library-crud.test.ts` 203–219). Cold seed GET — **PARTIAL** (§4). |
| **H3** | Path traversal `:id` | **FIXED** | `assertSafeProjectId` + UUID (`paths.ts` 38–46); HTTP 400 invalid id (`library-crud.test.ts` 165–168). |
| **H4** | Ghost / orphan przy crash | **PARTIAL** | Delete order poprawiony; create nadal 2-krokowy po zapisie indeksu (§3). |
| **H5** | Częściowy apply BPM przy złym metrum | **FIXED** | Walidacja TS przed mutate (`engine.ts` 139–141); Zod `.finite()` na BPM (`transport.ts` 28); `RangeError` → 400 (`errors.ts` 38–40). Test: `engine.test.ts` 90–100. Repro: bpm pozostaje 120 po invalid meter. |

---

## 6. Cross-cutting (faza C)

| Obszar | Werdykt | Notatka |
|--------|---------|---------|
| Time math shared | **PASS** | `packages/shared` — testy 48; brak DOM/FS w konwersjach. |
| API Zod / ADR 0006 | **PASS+** | Trasy projektów/transportu `parse` + `{ ok: false, error }`; PUT strict + test 400. |
| UI density Timeline/Admin | **PARTIAL** | Tokeny `--ss-*` bez HEX w shellach; play 32px (M13); `commandPending` częściowy (M5). |
| Storage races | **PARTIAL** | Mutex na CRUD; tmp path nadal `pid+Date.now` (`atomic-write.ts` 10). |
| Playhead Timeline | **PASS** (α3+) | `playheadPx` z `displayTicks` (`TimelineShell.tsx` 201, 518–521) — poprawa vs overnight L11. |

### Faza D — repro (read-only)

| Skrypt | Wynik |
|--------|-------|
| H1 mid-play BPM | `bugConfirmed: false` |
| H5 bad meter + bpm 999 | throw; `bpm` unchanged 120 |
| M15 clock skew | `rewound: true` (1920→960) |
| `pnpm test` | 89/89 PASS |

---

## 7. Action Plan (kolejność sprintu α4)

1. **`feat/timeline-track-grid`** — wspólna siatka wierszy dock+canvas; CSS `subgrid` lub jeden kontener wierszy; test resize / opcjonalny Vitest layout — `TimelineShell.tsx` 429–586, `TimelineShell.module.css` 135–315.
2. **Kolejność lane’ów** — przenieść Tempo/Tonacja/Metrum/Kotwice **nad** Forma w dock **i** lanes (ten sam PR co #1).
3. **Eye per ślad** — stan `Record<trackId, boolean>`, Forma `disabled`/always true — `TimelineShell.tsx` 130–131, 442–449.
4. **`feat/timeline-readonly-maps`** — render segmentów `tempoMap`/`meterMap` na lane (helper w `formaCanvas.ts` lub nowy moduł); nie tylko tekst 557–569.
5. **`feat/timeline-inspector-forma`** — input rename + CD `lengthInput`; mutacja `draftProject` → istniejący `onSave`/`putProject` — 591–623.
6. **Dirty guard** — `beforeunload` + `useBlocker` / modal przy `Link` z dirty — `TimelineShell.tsx` 170–173.
7. **`loadTransport` w UI** (opcjonalnie) — przy zmianie utworu bez play: wywołać z picker zamiast tylko route + `reloadProject` — `transport/api.ts` 37–43.
8. **Carry-over:** M15 clamp elapsed w `engine.ts` 45–48; M12 guard `serverTimeMs`; M1 Zod w `transport/api.ts`; M3 walidacja BBT.
9. **Should:** Admin panel toggle na split (`AdminShell.tsx` 464–469); empty state plików (623–628).
10. **Release:** dopiero po must #1–6 — bump `5.0.0-alpha.4`, CHANGELOG, `appVersion.ts`, smoke z [report-implementation-plan-alpha4.md](./report-implementation-plan-alpha4.md).

---

## 8. Sign-off checklist — bramka α4

Legenda: ✅ · ⚠️ · ❌ · 🔜 OUT

| ID | Kryterium | Status | Notatka |
|----|-----------|--------|---------|
| D-01 | Track grid dock ↔ lane zsynchronizowane | ❌ | §2 #1 |
| D-02 | Eye per ślad; Forma zawsze on | ❌ | tylko Specjalne on/off |
| D-03 | Specjalne lane’y nad treścią | ❌ | odwrotna kolejność |
| D-04 | Lane Tempo/Metrum z map (nie placeholder) | ⚠️ | wartości OK, brak renderu map |
| D-05 | Inspector rename + CD length → PUT | ❌ | read-only |
| D-06 | Song picker biblioteka → route | ✅ | |
| D-07 | Dirty badge widoczny | ✅ | |
| D-08 | Dirty guard przy wyjściu | ❌ | D-11 z QA α3 |
| D-09 | `POST /api/transport/load` w UI (jawny) | ⚠️ | API + play z projectId |
| D-10 | `pnpm lint && check-types && test && build` | ✅ | sesja 2026-07-20: lint, check-types, test (89), build — PASS |
| D-11 | Smoke: picker → eye → edycja → save → play → sekcja | ❌ | eye/inspector blokują |
| D-12 | Wersja shelli = `package.json` | ✅ | `appVersion.ts` = alpha.3 |
| D-13 | Carry-over H1/H5 bez regresji | ✅ | testy + repro |
| D-14 | Bump `5.0.0-alpha.4` + CHANGELOG | ❌ | nadal alpha.3 |
| D-15 | Admin panel split (should) | ❌ | |
| D-16 | Pliki projektu empty state (should) | ❌ | |

**Bramka release α4:** **ZAMKNIĘTA** — wymagane D-01–D-06, D-08, D-11, D-14.

---

## 9. Liczniki końcowe

| Klasa | Liczba | Uwagi |
|-------|--------|-------|
| **High** | **2** | H4 partial, M15 (SSOT monotoniczność) |
| **Medium** | **10** | M1, M3, M5, M11 partial, M12, M14, H2 cold seed, 4× must α4 product |
| **Low** | **6+** | M7, M13, L13, L19, polish should |

**Must α4:** 1 PASS · 2 PARTIAL · 4 FAIL · 0 NOT STARTED (wszystkie dotknięte kodem α3, brak PR α4).

---

*Audyt alpha.4 — ukończony 2026-07-20. Następny krok: PR #1 track grid zgodnie z planem implementacji.*

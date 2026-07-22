# Audyt kodu 2026-07-21 — StageSync v5 (α9)

**Status:** ZAKOŃCZONY (sesja przerwana ~03:07 przez limit użycia; Exec domknięty ~10:19)  
**Start:** ~01:38 · **Plan deadline:** 11:00 · **Faktyczny stop:** ~03:07 (F302) · **Wersja:** `5.0.0-alpha.9`  
**Metoda:** deep-read + repro · bez fixów · bez commitów  
**Runbook:** `working/working-audit-2026-07-21-runbook.md` (notatka robocza, poza git)  
**Testy @02:08:** lint **PASS** · `pnpm test` **PASS** (server 44 / web 139 / shared+ui) · H03+H04 FIXED  
**Baza:** [report-parity-blocker-alpha8.md](./report-parity-blocker-alpha8.md)

> Evidence: F01–F302 (notatki robocze lokalne, poza git; patrz runbook).

---

## 0. Exec (final)

| Metryka | Wartość |
|---------|---------|
| Ryzyko fundamentu | **ŚREDNI** — transport H1/H5, mutex mutacji, path UUID **FIXED**; **A21-H01** cold seed nadal OPEN |
| Ryzyko ops/CI | **ŚREDNI-WYSOKI** — lint+test **PASS**; **A21-H02** unauth restart/shutdown na LAN **LIVE** |
| Parity produkt | P8 zielone; residual Help/autoAdvance/inventarz drift |
| High OPEN | **2** (H01, H02) |
| High FIXED (sesja) | H03 lint · H04 OCC |
| Medium | **~55** (§3) |
| Evidence | **F01–F302** (302 pliki) |

### Werdykt

α9 jest **znacząco lepsze** niż overnight-audit: transport mid-BPM, mutex na mutacjach, OCC 409, lint, shadow/migrate, Tauri thin, CI β1 — **potwierdzone** repro/testami w tej sesji.

**Blokery przed β1 na hoście produkcyjnym:**

1. **A21-H01** — `getLibrary()` seeduje bez `withLibraryLock` (asymetria vs `getSetlist`; repro 1/19).
2. **A21-H02** — `POST /api/system/restart|shutdown` bez auth + bind all-interfaces (LIVE restart → DOWN).
3. **M15/M27** — flaga auto-setlista bez silnika advance; Help kłamie o skrótach i auto-advance.

**Najważniejsze P1 (nie blokują smoke, blokują polish):** M08 REST bez `serverTimeMs`, M34 soft-clock bez loop wrap, M43 brak UI na 409, M47 `placeClipNoOverlap` vs Countdown, M49 health `0.0.0` z workspace packages.

### Diff vs overnight-audit (skrót)

| Obszar | Overnight | Dziś |
|--------|-----------|------|
| H1 mid-play BPM | OPEN | **FIXED** (F54/F267) |
| H2 mutex mutacji | OPEN | **FIXED** |
| H2 cold seed | OPEN | **OPEN → A21-H01** |
| H3 path traversal | OPEN | **FIXED** (LIVE F205) |
| H4 crash order | PARTIAL | **PARTIAL** (delete PASS; create M02) |
| H5 partial BPM | OPEN | **FIXED** |
| M1 client Zod | OPEN | **FIXED** |
| M11 `.strict()` | PARTIAL | **PARTIAL** (Project OK; Library/nested M31/M48) |
| M14 double-submit | OPEN | **OPEN** |
| M15 clock skew | OPEN | **FIXED** |

### Uwaga o zakresie sesji

Subagent [Looped audit until 11:00](74c47aed-d82b-4729-b261-0e5eeeeb174a) zatrzymał się o ~03:07 na **monthly usage limit**. Fale F01–F302 są kompletne; planowane cykle 03:07→11:00 **nie wykonano**. Werdykt opiera się na materiale do F302, nie na pełnym 8h wall-clock.

---

## 1. Diff vs overnight-audit

| ID | Temat | Status dziś | Ev |
|----|-------|-------------|-----|
| **H1** | mid-play BPM skok | **FIXED** (tsx 01:58: 1920→1920) | F01/F54 |
| **H2** mutacje | mutex RMW | **FIXED** | F02 |
| **H2** seed | cold getLibrary | **OPEN → A21-H01** | F02 |
| **H3** | path traversal | **FIXED** | F02/F205 LIVE |
| **H4** | crash create/delete | **PARTIAL** | F02 |
| **H5** | partial BPM | **FIXED** (tsx denom7→throw, bpm=120) | F01/F54 |
| **M1** | client Zod transport | **FIXED** | F21/F150 |
| **M2** | BPM finite / meter | **PARTIAL** | finite OK; min/max M26; Put meter M36; play denom7→400 |
| **M3** | bbtToTicks | **FIXED** | F11/F151 |
| **M11** | `.strict()` | **PARTIAL** | Project OK; Library/clips M31/M48 |
| **M12** | WS/REST | **OPEN → A21-M08** | F05 |
| **M13** | touch 32px | **PARTIAL** (Button 36; ShellIcon 32) | F21/F102 |
| **M14** | double-submit | **OPEN** | F22 |
| **M4/M12** | serverTimeMs / WS race | **PARTIAL** — WS order OK; REST M08 | F243 |
| **M5** seek unused | **FIXED** — locator seek wired | F276 |
| **M10** | atomic tmp UUID | **OPEN** | F244 |
| **L24** | engine H1/H5 tests | **FIXED** | F267 |
| **M15** | clock skew | **FIXED** | F01 |

---

## 2. High (2026-07-21)

### A21-H01 — Cold `getLibrary` poza mutex
`getSetlist` już używa `withLibraryLock`; `getLibrary` nie (F290).  
20× parallel na pustym dataDir → **1 OK / 19 fail** (re-verify 01:56 tsx).  
`getLibrary` → `ensureLibrary()` bez `withLibraryLock`. F02

### A21-H02 — Unauth `POST /api/system/restart|shutdown` + listen all-interfaces
DoS/kill show na open Wi‑Fi. F10 · F26


### A21-H04 — OCC — **FIXED** F83 (import keeps `updatedAt`)
Serwer compare+409; klient wysyła token; import nie stripuje `updatedAt`; `pnpm test` **PASS**.  
Residual: brak UI na 409 → **A21-M43**.  
F83 · history F63–F69

### A21-H03 — `pnpm lint` — **FIXED** F83 (ACL + test ignores)
F72 REOPEN → F83: `acl.js` `ignores: **/*.test.ts`; `pnpm lint --force` **PASS**.  
F83 · F72

---

## 3. Medium

| ID | Temat | Ev |
|----|-------|-----|
| **A21-M02** | Create: library przed writeProject (WIP nadal) | F02/F64 |
| **A21-M03–M05** | Create/nested strict; UUID gaps | F03 |
| **A21-M07** | Split id `${id}-r` | F04 |
| **A21-M08** | REST applyAnchor bez serverTimeMs (`toTickMessage` dead) | F05/F43/F44 |
| **A21-M09** | TimelineShell 5k LOC bez testu UI | F06/F08 |
| **A21-M10–M11** | Bind / logi bez auth | F10 |
| **A21-M12** | Client typography poza `--ss-*` | F12 |
| **A21-M13** | PUT merge client-wins assets | F13 |
| **A21-M14** | Double-submit Admin/Transport | F22 |
| **A21-M15** | autoAdvance flaga bez advance | F15/F25 |
| **A21-M18** | express.json default limit | F18 |
| **A21-M19** | Brak OCC → **eskalacja H04** (schema wymaga updatedAt) | F19/F63 |
| **A21-M20** | PUT bez scrubCountdown | F20 |
| **A21-M21** | Admin MIDI/Docker placeholders | F21 |
| **A21-M22** | ESLint ACL **FIXED**; test override brak → H03 | F23/F72 |
| **A21-M23** | Zod details — **FIXED** w errors (F68); było OPEN F26 | F26/F68 |
| **A21-M24** | Brak E2E | F29 |
| **A21-M25** | Docker+Tauri scaffold **jest**; CI jobs; jakość OCC/lint | F31/F70/F81 |
| **A21-M26** | BPM bez min/max | F32 |
| **A21-M27** | Help kłamie o Auto-setliście | F39 |
| **A21-M28** | Kotwice `ticksFromLogicBar` @ meter@0 | F41 |
| **A21-M29** | Asset upload ext-only + 100MB memory | F42 |
| **A21-M31** | Library/Setlist bez `.strict()` | F49 |
| **A21-M32** | β1 Must omija product P0 (autoAdvance/H01/H02) | F52 |
| **A21-M33** | Stage cue unauth / no strict | F58 |
| **A21-M34** | Soft-clock bez loopWrap (UI overshoot) | F59 |
| **A21-M35** | β1 shadow/migrateVolume WIP nie w boot | F64 |
| **A21-M36** | Put meter ≠ assertValidTimeSignature | F65 |
| **A21-M38** | Docker runtime not slim | F71 |
| **A21-M39** | Brak bind 127.0.0.1 docs/compose | F75 |
| **A21-M40** | Scissors empty = no-op (TE-13) | F76 |
| **A21-M41** | CHANGELOG Unreleased overclaim OCC/ACL quality | F80 |

---

## 4. Low

| ID | Temat | Ev |
|----|-------|-----|
| **A21-L63** | brak tapTempo.test.ts | F213 |
| **A21-L64** | 13× web/lib bez unit tests | F214 |
| **A21-L65** | Help proza vs tabela ←/→ | F218 |
| **A21-L66** | Help `[`/`]` niezaimplementowane | F225 |
| **A21-L67** | WS client_hello bez Zod | F227 |
| **A21-L68** | litera `c` scissors vs loop | F232 |
| **A21-L69** | ClientShell rem poza `--ss-*` | F238 |
| **A21-L70** | multer 100MB LAN upload | F239 |
| **A21-L74** | ScorePane copy „β1+” vs scope β2 | F251 |

## 4b. Low (kontynuacja)
 (skrót)

L01–L57 — rosnące. Overnight: L11 playhead **FIXED**, L14 shutdown **FIXED**, L24 H1 test **FIXED**; L15 metro / L13 error UI / L17 int / L18 API trim **OPEN**.  
**PASS:** UG, purity, snap, touch tiers, MIDI stub, Button, static-web, marquee. Inventarz wand **stale** (M45).

---

## 5. Fale

| F | Temat |
|---|-------|
| 01–39 | Fundament → Help lie |
| 40 | Report collision note |
| 41 | Kotwice meterMap |
| 42 | Asset upload ext-only |
| 43–44 | WS/REST ordering + toTickMessage unused |
| 45 | Lint H03 FIXED |
| 46 | PUT scrub / create order |
| 47 | H01 repro 1/19 + inventarz drift |
| 48 | Marquee PASS (inventarz stale) |
| 49 | Library strict + atomic fsync |
| 50 | Split `${id}-r` |
| 51 | system logs SSE |
| 52 | ROADMAP/TODO vs P0 |
| 53 | M13/M14/M19 residual |
| 54 | H1/H5 tsx FIXED |
| 55–56 | Button PASS; migrator fail-soft |
| 57–58 | Client typography; stage cue |
| 59 | Soft-clock loop overshoot |
| 60 | Overnight Lows batch (L24 FIXED) |
| 61–62 | Client metro; clipboard UUID |
| 63 | **H04 OCC Put broken** |
| 64 | WIP OCC/β1 incomplete |
| 65 | Meter Put vs assert |
| 66–67 | β1 scope; static-web |
| 68 | OCC progres (import 409) |
| 69 | Import OCC strip root cause |
| 70 | Docker+migrate boot progres |
| 71 | Dockerfile slim gaps |
| 72 | ACL lint reopen H03 |
| 73 | a11y dialog |
| 74 | play past end repro |
| 75 | Compose bind H02 |
| 76 | TE-13 scissors |
| 77–79 | scissors asym; kotwice; notify |
| 80–81 | CHANGELOG vs tree; Tauri shell |
| 82 | INSTALL security docs |
| 83 | **H03+H04 FIXED** lint+tests green |
| 84–85 | host-stability pulse; OCC test PASS |
| 86–88 | UG/E2E; M08 open; create/scrub |
| 89–90 | M14 partial; H01 reconfirm 1/19 |
| 91–92 | CI β1; ADR0002 vs loop soft-clock |
| 93 | Admin autoAdvance UI |
| 94–95 | BPM bounds; stageHub isolation |
| 96–97 | dirty tree; env.example |
| 98 | TODO β1 overclaim |
| 99 | api README OCC + v2 drift |
| 100 | Checkpoint konsolidacji |
| 101 | L16/L18 residual |
| 102 | ShellIconButton 32px touch |
| 103–104 | create name trim; grid innerHTML |
| 105 | shared dist exports |
| 106 | forma subsections meter PASS |
| 107–108 | role emoji; setlist no advance |
| 109 | MIDI stub PASS |
| 110 | WS Zod hot path |
| 111 | time round-trip PASS |
| 112 | H01 reconfirm 1/19 OPEN |
| 113 | H02 bind+system unauth |
| 114 | create order + scrub gap |
| 115 | Client typography M12 |
| 116 | REST serverTimeMs M08 |
| 117 | scissors asym M40 |
| 118 | BPM bounds M26 |
| 119 | OCC UI gap M43 |
| 120 | stage+softclock M33/M34 |
| 121 | assets upload M29 |
| 122 | Help autoAdvance lie M27 |
| 123 | test gaps M09/M24 |
| 124 | kotwice meter@0 M28 repro Δ1440 |
| 125 | transport race + WS hello |
| 126 | inventarz wand/autoAdvance stale |
| 127 | Library strict + ProjectId PASS |
| 128 | TODO/CHANGELOG overclaim M44 |
| 129 | meter Zod≠assert M36 repro 4/7 |
| 130 | INSTALL security M39 |
| 131 | delete library→rm residual |
| 132 | api README v2 drift M46 |
| 133 | soft-clock tests no loop |
| 134 | grid innerHTML Low |
| 135 | H1/H5 vitest PASS |
| 136 | Dockerfile not slim M38 |
| 137 | Button 7 states PASS |
| 138 | placeClipNoOverlap CD overlap M47 |
| 139 | overnight High map |
| 140 | create lock 10/10 PASS |
| 141 | Project.id schema soft |
| 142 | CI β1 jobs |
| 143 | static-web PASS |
| 144 | Client OCC silent |
| 145 | Tauri thin + CSP null |
| 146 | purity + network |
| 147 | audio lanes OUT PASS |
| 148 | Zod details PASS |
| 149 | boot migrate sequential |
| 150 | overnight M transport updates |
| 151 | bbtToTicks range FIXED |
| 152 | double-confirm ≠ auth |
| 153 | collision test gap M47 |
| 154 | nested clip strip M48 |
| 155 | score-bar-map |
| 156 | desktop stubs L54 |
| 157 | MIDI stub PASS |
| 158 | presence unbounded |
| 159 | atomic no fsync |
| 160 | touch tiers PASS |
| 161 | snap ADR0007 PASS |
| 162 | UG fail-soft PASS |
| 163 | overnight Lows batch |
| 164 | L13/L17 OPEN |
| 165 | a11y partial + notify L22 |
| 166 | API HTML 404 L19 |
| 167 | ROADMAP vs autoAdvance |
| 168 | stop@0 Low |
| 169 | β1 scope vs H01/H02 |
| 170 | play past end reconfirm |
| 171 | contrast tokens PASS |
| 172 | no dual-write PASS |
| 173 | STANDARDS→api drift |
| 174 | husky empty |
| 175 | stagehub isolation PASS |
| 176 | H01 still 1/19 @02:36 |
| 177 | TimelineShell 5055 LOC |
| 178 | mergePreserve PASS |
| 179 | dirty/⌘S PASS |
| 180 | lane heights PASS |
| 181 | zoom session-only |
| 182–183 | health version 0.0.0 M49 |
| 184 | H02 LIVE restart 200→DOWN |
| 185 | network/logs unauth LIVE |
| 186 | REST transport no serverTimeMs |
| 187 | Client metro + WS LIVE |
| 188 | OCC ConflictError PASS |
| 189 | StageMessage Zod PASS |
| 190 | clipboard UUID PASS |
| 191 | map lane PASS |
| 192 | logbuffer SSE |
| 193 | no secrets PASS |
| 194 | draftHistory PASS |
| 195 | vite proxy 502 PASS |
| 196 | migrator + engines |
| 197 | gap TE-13/16/18 |
| 198 | TE-16 gap-seal M50 |
| 199 | STAGESYNC_VERSION unused |
| 200 | TE-07 Alt+drag PRESENT (gap stale) |
| 201 | KB-05 PASS; Help arrows lie |
| 202 | Score stub + TE-10 PASS |
| 203 | TE-27 dblclick absent |
| 204 | setlist next paths |
| 205 | path traversal LIVE PASS |
| 206 | payload 413 HTML |
| 207 | name spaces LIVE L18 |
| 208 | shared eslint PASS |
| 209 | Health/ApiError schema unused |
| 210 | checkpoint 02:45 |
| 211 | appearance PASS |
| 212 | Express5 params residual |
| 213 | tap 40–300 vs schema M26 |
| 214 | web/lib no sibling tests L64 |
| 215 | H01 reconfirm 1/19 |
| 216 | soft-clock no loop M34 |
| 217 | placeClip CD hole M47 |
| 218 | Help ←/→ contradiction |
| 219 | Dockerfile fat M38 |
| 220 | Space double-submit M14 |
| 221 | scissors needs selection M40 |
| 222 | nested schema strip M48 |
| 223 | REST no serverTimeMs M08 |
| 224 | gap-audit stale TE-07/KB-05 |
| 225 | Help [/] absent vs Alt+arrows |
| 226 | create/scrub pulse M02/M20 |
| 227 | presence Zod + delete PASS |
| 228–229 | health 0.0.0 LIVE M49 |
| 230 | meter denom7 M36 |
| 231 | wand hidden / inventarz M45 |
| 232 | key c scissors vs loop |
| 233–234 | stage unauth + INSTALL |
| 235 | placeClip CD overlap repro |
| 236 | shadow/migrate PASS |
| 237 | Tauri PASS / OCC UI M43 |
| 238 | Client typo rem L69 |
| 239 | Library not strict + multer |
| 240 | Setlist not strict + ACL PASS |
| 241 | TE-27 dblclick ABSENT |
| 242 | no rate-limit |
| 243 | M4/M12 PARTIAL vs overnight |
| 244 | atomic tmp + touch 32 |
| 245 | APP_VERSION hardcoded |
| 246 | CI PASS / TE-14 ABSENT |
| 247 | Follow PASS / H01 mech |
| 248 | security surface ≥20 cytatów |
| 249 | Client CL-03/07 ABSENT |
| 250 | play BPM unbounded M26 |
| 251 | UG PASS / Score β1+ L74 |
| 252 | SPA + mergePreserve PASS |
| 253 | dirty/⌘S PASS |
| 254 | play past end repro |
| 255 | no role rainbow PASS |
| 256 | shared purity PASS |
| 257 | ADR 0002 PASS |
| 258 | Zod details/409 PASS |
| 259 | Create not strict / Put strict |
| 260 | import/migrator PASS |
| 261 | vitest green / M47 hole |
| 262 | ROADMAP auth vs H02 |
| 263 | TODO β1 overclaim M44 |
| 264 | a11y / name spaces |
| 265 | TE-16 gap-seal M50 |
| 266 | notify try/catch L22 |
| 267 | engine tests H1/H5 FIXED |
| 268 | Vite 502 JSON PASS |
| 269 | env/desktop |
| 270 | E2E absent / engines |
| 271 | ADR 0011 atrapy PASS |
| 272 | TimelineShell 5k M09 |
| 273 | path PASS / network unauth |
| 274 | presence sanitize / stage hub |
| 275 | bbtToTicks PASS / husky empty |
| 276 | seek + Admin lock PASS |
| 277 | scrollbar M7 / audio hidden |
| 278 | overnight L2/L5 OPEN |
| 279 | PlayBody strict PASS |
| 280 | Seek/state strip L83 |
| 281 | network LIVE + version |
| 282 | konsolidacja High/Med |
| 301 | KB-17 Tap keys ABSENT |
| 302 | CH-02 live badge ABSENT |
| 303+ | **nie wykonano** (limit użycia ~03:07) |

---

## 6. Remediacje (priorytet)

1. **P0** getLibrary lock (**H01**)  
2. **P0** Auto-setlista + Help (M15/M27)  
3. **P0/P1** system auth/bind (**H02**)  
4. **P1** UI 409 (M43); soft-clock loop (M34); TE-13 (M40)  
5. ~~H03 lint / H04 OCC~~ **DONE** F83  
5. **P1** serverTimeMs; OCC; scrub; BPM bounds; Kotwice meterMap (M28)  
6. **P2** touch 36px; ESLint ACL; Client tokeny


## 5. Remediacje (propozycje — bez implementacji w tej sesji)

| Priorytet | ID | Remediacja |
|-----------|-----|------------|
| **P0** | H01 | `getLibrary` → `withLibraryLock(() => ensureLibrary())` |
| **P0** | H02 | Token/bind localhost + INSTALL warning; disable restart bez auth |
| **P0** | M15/M27 | Implement auto-advance **lub** usuń claim z Help/UI |
| **P1** | M08 | REST transport → `toTickMessage()` |
| **P1** | M02 | create: `writeProject` przed `saveLibrary` |
| **P1** | M20 | `scrubCountdownDigitClips` w `writeProject` |
| **P1** | M28 | `ticksFromLogicBar` walk meterMap |
| **P1** | M34 | soft-clock + loopWrap |
| **P1** | M40 | scissors hit-test bez prior selection |
| **P1** | M43 | UI 409 OCC |
| **P1** | M47 | `placeClipNoOverlap` reject CD overlap |
| **P1** | M49 | health version z root / STAGESYNC_VERSION |
| **P2** | M45/M51 | odśwież inventarz + gap-audit |
| **P2** | Help | ←/→, `[`/`]`, auto-setlista copy |


## 6. PASS / poprawione vs overnight (skrót)

H1 mid-BPM · H2 mutex mut · H3 UUID path · H5 partial BPM · M15 clock skew · OCC 409 · lint ACL · Put `.strict()` · shadow/migrate · Tauri thin · CI compose+cargo · SPA static · mergePreserve · UG fail-soft · Follow playhead · Dirty/⌘S · Button 7 · shared purity · TE-07 Alt+drag · KB-05 T menu · Zod details · import/migrator · ensureFormaSubsections write

**Nadal High:** H01 cold seed · H02 unauth restart/LAN

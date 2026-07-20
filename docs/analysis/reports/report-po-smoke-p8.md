# PO smoke P8 — playbook (α9)

**Cel:** ludzki sign-off zachowania v4→v5 przed β.  
**Status:** **green** — PO sign-off **2026-07-21**.  
**Polityka:** [ADR 0011](../../adr/0011-ui-parity-behavior.md) · bramka: [parity-blocker](./report-parity-blocker-alpha8.md).  
**Kod:** α8 freeze + CL-P0 (CL-01/04/05) = **done**; ten dokument = checklista PO.

Uruchom lokalnie **Admin** / **Timeline** / **Client** na zmergowanym drzewie (`pnpm` dev jak w README).  
Po green: odhacz [TODO.md](../../TODO.md) R1/R5 + inventarz „PO verified”; zaktualizuj ten plik i QA.

---

## Podsumowanie (odhacz na końcu)

| ID | Obszar | Pass |
|----|--------|------|
| **T-gest** | marquee, Cmd/Shift select, multi-drag, ⌘C/X/V/D | ☑ |
| **T-loc / zoom / maps / chrome** | locator, suwaki H/V/UI, mapy, header | ☑ |
| **meta / CD** | Countdown length + ephemeral digits | ☑ |
| **A1** | Set + song pick | ☑ |
| **C1** | Karaoke fill, Grid cycle, Forma strip | ☑ |
| **P8** | Sign-off (wszystkie powyżej green) | ☑ |

**β:** P8 green — wejście β1 **na prośbę** (Docker/Tauri). Nie bumpaj `5.0.0-beta.*` bez osobnej decyzji. Tag α9 — osobna prośba.

**Sesja notes (2026-07-21):** cross-lane select; loop snap na podglądzie; CD scroll + grid pre-roll; Różdżka ukryta; Help/skróty v4 → Should; Alt+drag + panel T.

---

## T-gest — Timeline gesty

- [x] **Marquee** — przeciągnięcie pustego obszaru canvas → prostokąt zaznaczenia; kilka clipów na lane zaznaczonych
- [x] **Empty / short marquee** — krótki drag / klik w pustkę → clear selection + locator pod kursorem
- [x] **Cmd/Ctrl + klik** — dodaj / odejmij z multi-select
- [x] **Shift + klik** — range select (jak v4 / sensowne w shellu)
- [x] **Multi-drag** — przeciągnięcie zaznaczenia (Forma lub content) w tej samej lane; no-overlap; Commit na pointerup
- [x] **⌘/Ctrl+C / X / V / D** — copy / cut / paste @ locator / duplicate (Forma, Tekst, Akordy, Cue)
- [x] **Move / resize / pencil** — pojedynczy clip Forma + content; snap bar/beat; Cmd/Ctrl = snap off podczas gestu

**Pass T-gest:** ☑

---

## T-loc / T-zoom / T-maps / T-chrome

### T-loc

- [x] Scrub locator na linijce → kwantyzacja do **beatu**; Cmd/Ctrl = snap off
- [x] Loop region na linijce → bounds @ beat; Play respektuje region (MVP OK); **snap na podglądzie**
- [x] Play: locator follows; **brak** linii playhead gdy pause; CSS: locator = `primary`, playheadMidi = `info`

### T-zoom

- [x] Suwak **Zoom H** — szerokość taktów / clipów
- [x] Suwak **Zoom V** — wysokość wierszy lane
- [x] Suwak **Zoom UI** — chrome + mnoży effective H/V (nie tylko fonty)
- [x] Ctrl/Meta+wheel (H); Alt+wheel (V/H) — bez toola lupy na pasku

### T-maps

- [x] Tempo / Metrum / Tonacja — readout + insert/edit/drag; eraser chroni seed @ 0
- [x] Pencil / scissors / eraser na mapach bez crasha

### T-chrome

- [x] Header: brand \| center song \| actions; ≤1100 controls pod
- [x] Toolbar: BBT / transport / Tempo·Metrum·Tonacja **wyśrodkowane**
- [x] Help overlay rozmiar używalny; bez cyan-as-brand (polish Help + skróty v4 → Should)

**Pass T-loc / zoom / maps / chrome:** ☑

---

## meta / CD

- [x] Meta ⓘ — year + editable metrum + tonic/mode @ 0 → Zapisz → reload
- [x] Countdown: body / prawa krawędź = długość (snap taktów) + shift treści post-CD; scroll + grid pre-roll
- [x] Lewa krawędź CD zablokowana (komunikat)
- [x] Cyfry CD **ephemeral** (Client / render) — nie persystują jako `vl-cd-*` w storage
- [x] Inspector długości CD spójny z gestem

**Pass meta / CD:** ☑

---

## A1 — Admin Set + song pick

- [x] **Jeden flow:** Set + wybór utworów bez „zaznacz na innej zakładce”
- [x] Dodaj / usuń / kolejność setlisty; Zapisz
- [x] Otwórz Timeline na wybranym utworze (SPA link)
- [x] Utwory: filtr/sort / Batch PC / Wzory — smoke bez regresji krytycznej

**Pass A1:** ☑

---

## C1 — Client treść (po CL-P0 kod)

Kod CL-01/04/05 = **done**; tu weryfikacja PO przy żywym transporcie:

- [x] **CL-01 Karaoke** — pasek taktów sekcji + fill `--beat-progress` + pulse na zmianie beatu
- [x] **CL-04 Grid** — cykl akordów multi-bar (compress / detectCycle) przy Play
- [x] **CL-05 Forma strip** — segmenty past/current + meta takt/beat
- [x] →następny zmienia utwór setlisty; presence / połączenie OK

**Pass C1:** ☑

---

## P8 — Sign-off

- [x] **P8** — PO akceptuje zachowanie jako wejście β (nie inventarz `[x]`) — **2026-07-21**

Po green:

1. [TODO.md](../../TODO.md) — odhacz must PO smoke + release gate wg procedury
2. [ui-shell-inventory.md](../../ui-shell-inventory.md) — dopisz „PO verified” gdzie dotyczy
3. [parity-blocker](./report-parity-blocker-alpha8.md) + [QA α8](./report-qa-signoff-alpha8.md) — P8 → green
4. Ten plik — tabela Podsumowanie → wszystkie ☑

**Nie** bumpaj `5.0.0-beta.*` bez osobnej prośby; β1 = Docker/Tauri po decyzji PO.

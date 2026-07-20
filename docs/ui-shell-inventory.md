# Inventarz kontrolek UI (v4 → v5 shelle)

**Cel:** checklista **funkcji / kontrolek**, nie layoutu.  
Layout paneli w v5 jest **nowy** ([ADR 0003](./adr/0003-ui-direction-booth.md)); paleta domyślna black/amber.  
Każda pozycja musi mieć kontrolkę w shellu (`disabled` / overlay lokalny OK). Usunięcie bez wpisu w „Świadome delty” = blocker.

## Świadome delty v5

| Delta | Uwagi |
|-------|--------|
| + Audio 0…N w Timeline | Brak ścieżek = OK |
| Countdown widoczny; długość = pre-roll ≤ 0 | Semantyka v5 |
| − git-apply / „Zaktualizuj teraz” | [ADR 0004](./adr/0004-updates-docker.md) |
| SPA: linki Admin → `/timeline`, `/` | Bez labowego ShellNav |
| React + CSS Modules + `--ss-*` | Stack v5 |
| Admin: Utwory · Set · Scena · Pliki · Host (osobne sekcje) | IA v5; Set ≠ biblioteka — wiring setu α6 |
| Timeline α3: treść Formy wired, **layout track grid niedokończony** | Dług UI → **α4 must** ([report-scope-alpha4](../analysis/reports/report-scope-alpha4.md)) |
| Edycja klipów: no overlap, draft+PUT, Smart Tool | [ADR 0008](../adr/0008-timeline-clip-editing.md); Forma α7, audio β1 |

## Timeline — wymagania layoutu (parity v4, α4+)

**Nie** wchodzi w inventarz kontrolek — to kontrakt **układu** obowiązujący od α4:

1. **Jedna siatka wierszy:** nagłówek ścieżki (dock) i lane canvas w **tym samym wierszu** (zsynchronizowana wysokość).
2. **Kolejność pionowa (od góry):** Tempo → Tonacja → Metrum → Kotwice → Forma → Tekst → Akordy → Cue → Audio (specjalne domyślnie ukryte eye).
3. **Eye menu:** ukrywanie **pojedynczych** śladów (min. grupa Treść vs Specjalne); Forma zawsze widoczna.
4. **Responsywność:** węższe okno nie rozdziela nagłówków od lane’ów (brak „pływania” etykiet osobno od treści).

Placeholdery (disabled, skróty UI/H/V, pomoc-szkielet) = OK do **5.0.0 polish** — patrz scope α4 OUT.

## Timeline

### Tools (pasek)

- [ ] `smart` — Smart Tool (strefy select/move/trim; obok toolbara — [ADR 0008](./adr/0008-timeline-clip-editing.md))
- [ ] `pointer` (ikona)
- [ ] `pencil`
- [ ] `eraser`
- [ ] `scissors`
- [ ] `zoom`
- [ ] `gain` — Gain Tool (clip audio; β1)
- [ ] `mute` — Mute Tool (clip / ścieżka; β1)
- [ ] `wand` + menu: Tekst→Forma, Akordy→Forma, Tekst+Akordy→Forma
- [ ] `tap` na docku ścieżki Tekst (nie na głównym pasku)

### Header

- [ ] Brand (+ link Admin)
- [ ] Metadane utworu
- [ ] Setlista ← / picker / →
- [ ] Auto-setlista
- [ ] Undo / Redo / Odrzuć / Zapisz
- [ ] Pomoc `?` (overlay w DOM)
- [ ] Wygląd (overlay)
- [ ] Pełny ekran

### Transport / status

- [ ] Stop / Play / Loop
- [ ] BBT readout
- [ ] Tempo / Metrum / Tonacja
- [ ] Metronom / Follow playhead
- [ ] Dirty badge
- [ ] Conn + badge MIDI/Timeline
- [ ] Zoom UI / H / V

### Canvas / dock / inspector

- [ ] Eye menu ścieżek (Treść / Specjalne) — **α4:** per-ślad, nie tylko grupa Specjalne
- [ ] **Layout track grid** (nagłówek ↔ lane) — **α4 must**; patrz sekcja „wymagania layoutu”
- [ ] Forma z **Countdown** + sekcje (osobne clipy)
- [ ] Tekst, Akordy (**1 akord = 1 clip**), Cue
- [ ] Tempo / Tonacja / Metrum / Kotwice (domyślnie ukryte)
- [ ] Audio 0…N — clipy per projekt; fader ścieżki + mute track ([ADR 0008](./adr/0008-timeline-clip-editing.md))
- [ ] Inspector (Właściwości)
- [ ] Song screen: Ze wzoru / Import UG (**przyciski**, nie goły tekst)

## Admin

**Layout v5:** własny (sekcje w chrome + workspace + pasek statusu) — nie Booth rail/desk, nie accordion v4.  
Kontrolki poniżej = inventarz funkcji. Timeline/Client: osobny redesign.

### Sekcja → kontrolki

| Sekcja | Kontrolki |
|--------|-----------|
| **Chrome** | Brand + wersja; zakładki Utwory · Set · Scena · Pliki · Host; linki Timeline · Klient; Wygląd |
| **Utwory** | Filtr, sort, filtry ostrzeżeń; lista (PC, tytuł); panel wybranego; XML / Partytura / Timeline / Usuń; eksport; import; wzory; Batch PC |
| **Wybrany (inspector)** | Nazwa, akcje, **Pliki projektu** — α6 wiring; do α4: empty state zamiast fake listy |
| **Set** | Aktywny, auto, dodaj zaznaczone, zapisz, wyczyść, wiersze |
| **Scena** | Komunikat (tekst, role, TTL, wyślij, wyczyść); klienci / sieć |
| **Pliki** | Import / eksport paczki; drop zone; modal |
| **Host** | Ustawienia; Logi; MIDI; O aplikacji (wersja, sprawdź aktualizacje **bez** Apply, kanał, backupy); Restart / Wyłącz |
| **Status** (zawsze) | Teraz · sekcja · pozycja/BBT · dalej · conn · MIDI/Timeline; Tr. / Lead / edycja zdalna |

### Checklist (parity)

- [ ] Chrome: brand, wersja, Timeline, Klient, Wygląd, zakładki sekcji
- [ ] Status: utwór / sekcja / BBT / dalej / conn / Kontrola + korekta
- [ ] Utwory: filtr, sort, filtry, lista+panel, XML/Partytura/Edytuj/Usuń, eksport, wzory
  _(żywe: create / rename / delete)_
- [ ] Set: włącz, auto, dodaj, zapisz, wyczyść
- [ ] Scena: komunikat + klienci
- [ ] Pliki: import/eksport + modal
- [ ] Host: ustawienia, logi, MIDI, o aplikacji (bez Apply), restart/wyłącz
- [ ] Modale w DOM: Wygląd, Ustawienia, import, MusicXML, path picker, batch PC

## Client

- [ ] Name modal
- [ ] 4 role: `karaoke` | `grid` | `score` | `drums`
- [ ] Rozpocznij / widok dzielony
- [ ] Header: brand→welcome, metronom, conn, tytuł, →następny, takt, ustawienia, fullscreen
- [ ] Panele ról + empty states + split
- [ ] Cue toast host
- [ ] Drawery: global + per-rola (Tekst / Akordy / Partytura / Forma)

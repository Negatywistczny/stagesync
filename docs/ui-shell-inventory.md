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

## Timeline

### Tools (pasek)

- [ ] `pointer` (ikona)
- [ ] `pencil`
- [ ] `eraser`
- [ ] `scissors`
- [ ] `zoom`
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

- [ ] Eye menu ścieżek (Treść / Specjalne)
- [ ] Forma z **Countdown** + sekcje (osobne clipy)
- [ ] Tekst, Akordy (**1 akord = 1 clip**), Cue
- [ ] Tempo / Tonacja / Metrum / Kotwice (domyślnie ukryte)
- [ ] Audio 0…N
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
| **Set** | Aktywny, auto, dodaj zaznaczone, zapisz, wyczyść, wiersze |
| **Scena** | Komunikat (tekst, role, TTL, wyślij, wyczyść); klienci / sieć |
| **Pliki** | Import / eksport paczki; drop zone; modal |
| **Host** | Ustawienia; Logi; MIDI; O aplikacji (wersja, sprawdź aktualizacje **bez** Apply, kanał, backupy); Restart / Wyłącz |
| **Status** (zawsze) | Teraz · sekcja · pozycja/BBT · dalej · conn · MIDI/Timeline; Tr. / Lead / edycja zdalna |

### Checklist (parity)

- [ ] Chrome: brand, wersja, Timeline, Klient, Wygląd, zakładki sekcji
- [ ] Status: utwór / sekcja / BBT / dalej / conn / Kontrola + korekta
- [ ] Utwory: filtr, sort, filtry, lista+panel, XML/Partytura/Edytuj/Usuń, eksport, wzory
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

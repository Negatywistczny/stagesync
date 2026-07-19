# Inventarz kontrolek UI (v4 → v5 shelle)

**Cel:** checklista **funkcji / kontrolek**, nie layoutu.  
Layout paneli w v5 jest **nowy** ([ADR 0003](./adr/0003-ui-direction-booth.md)); Booth = tokeny.  
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

**Layout v5:** Booth shell (topbar + rail + lista/detail + Live Desk) — nie strona collapsible v4.  
Mapowanie regionów → kontrolki poniżej. Timeline/Client: osobny redesign.

### Booth: region → kontrolki v4

| Region | Kontrolki |
|--------|-----------|
| **Topbar** | Brand + wersja; context (utwór / BPM / BBT); linki Timeline · Klient; Wygląd; zwiń rail |
| **Rail → Biblioteka** | Search, sort, filtry ostrzeżeń; lista (PC, tytuł, artysta, gatunek); XML / Partytura / Edytuj / Usuń; export; wzory; panel szczegółów (metadane, assety XML/audio/okładka) |
| **Rail → Setlista** | Włącz, auto, dodaj zaznaczone, zapisz, wyczyść, wiersze |
| **Rail → Scena** | Komunikaty live (tekst, role, TTL, wyślij, wyczyść); sieć / klienci |
| **Rail → Import** | Import / export paczki; drop zone; modal preview |
| **Rail → System** | Ustawienia serwera; Logi; Monitor MIDI; O aplikacji (wersja, sprawdź aktualizacje **bez** Apply, kanał, backupy); Restart / Wyłącz |
| **Live Desk** (zawsze) | Utwór · sekcja · BBT · następny · conn · Kontrola MIDI/Timeline; skrót transpozycja / sync lead / edycja zdalna |

### Checklist (parity)

- [ ] Topbar: brand, wersja, Timeline, Klient, Wygląd, collapse rail
- [ ] Live Desk: utwór / sekcja / BBT / następny / conn / Kontrola + korekta skrót
- [ ] Biblioteka: search, sort, filtry, lista+detail, XML/Partytura/Edytuj/Usuń, export, wzory
- [ ] Setlista: włącz, auto, dodaj, zapisz, wyczyść
- [ ] Scena: komunikaty live + sieć/klienci
- [ ] Import: import/export + modal
- [ ] System: ustawienia, logi, MIDI monitor, o aplikacji (bez Apply), restart/wyłącz
- [ ] Modale w DOM: Wygląd, Ustawienia, import preview, MusicXML, path picker, batch PC

## Client

- [ ] Name modal
- [ ] 4 role: `karaoke` | `grid` | `score` | `drums`
- [ ] Rozpocznij / widok dzielony
- [ ] Header: brand→welcome, metronom, conn, tytuł, →następny, takt, ustawienia, fullscreen
- [ ] Panele ról + empty states + split
- [ ] Cue toast host
- [ ] Drawery: global + per-rola (Tekst / Akordy / Partytura / Forma)

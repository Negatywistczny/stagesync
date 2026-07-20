# Inventarz delta — alpha.3 vs shelle (alpha.2)

Źródło checklisty: [`docs/ui-shell-inventory.md`](../../ui-shell-inventory.md).  
Kod: `apps/web/src/shells/{Admin,Timeline,Client}Shell.tsx`.

**Legenda statusu**

| Status | Znaczenie |
|--------|-----------|
| **wired** | Działa z API / transportem SSOT |
| **local** | UI działa lokalnie (state React), bez persystencji / SSOT treści |
| **disabled** | Kontrolka w DOM, `disabled` lub noop |
| **missing** | Brak w shellu (naruszenie inventarza — wymaga wpisu w świadomej delcie) |

Kolumna **Blokuje α3?** = czy bez wiringu tej pozycji **nie** da się domknąć default scope alpha.3.

---

## Timeline

### Tools

| Kontrolka | Status α2 | Blokuje α3? | Uwagi |
|-----------|-----------|-------------|-------|
| pointer | **local** (wybór narzędzia) | nie | Canvas to mock clipów |
| pencil | **local** (wybór) | **tak** | α3: pencil zapisuje Formę → PUT |
| eraser | **local** | nie | OUT α3 (zostaje disabled-semantyka / no-op na Formie OK) |
| scissors | **local** | nie | OUT |
| zoom | **local** | nie | OUT (read canvas bez zoom OK) |
| wand + menu | **local** open / menu **disabled** | nie | OUT (Tap/UG/Różdżka poza scope) |
| tap (dock Tekst) | **disabled** | nie | OUT |

### Header

| Kontrolka | Status α2 | Blokuje α3? | Uwagi |
|-----------|-----------|-------------|-------|
| Brand + link Admin | **wired** (Link) | nie | |
| Metadane utworu | **disabled** | nie | Opcjonalnie później; name z projektu wystarczy |
| Setlista ← / picker / → | picker = **local** overlay; strzałki **disabled** | **częściowo** | α3: picker z biblioteki + route `projectId` (nie setlista) |
| Auto-setlista | **disabled** | nie | OUT |
| Undo / Redo / Odrzuć / Zapisz | **disabled** | **Zapisz = tak** | α3: Zapisz → PUT treści; undo OUT |
| Pomoc `?` | **local** overlay | nie | |
| Wygląd | **local** (switchy disabled) | nie | Motywy OUT |
| Pełny ekran | **disabled** | nie | |

### Transport / status

| Kontrolka | Status α2 | Blokuje α3? | Uwagi |
|-----------|-----------|-------------|-------|
| Stop | **disabled** | nie | Pause wystarczy; Stop = seek 0 opcjonalnie |
| Play / Pause | **wired** | **tak** | α3: play z tempo/metrum projektu |
| Loop | **disabled** | nie | OUT |
| BBT readout | **wired** | nie | |
| Tempo / Metrum / Tonacja | Tempo/Metrum **read** z transportu; Tonacja „—” | **tak** (tempo/metrum) | Źródło = mapa projektu, nie hardcoded 120/4-4 |
| Metronom / Follow | **disabled** | nie | |
| Dirty badge | hidden | nie | α3: pokazać przy dirty Formy (nice-to-have) |
| Conn + MIDI badge | **local** (WS dot) | nie | MIDI OUT |
| Zoom UI / H / V | **disabled** | nie | |

### Canvas / dock / inspector

| Kontrolka | Status α2 | Blokuje α3? | Uwagi |
|-----------|-----------|-------------|-------|
| Eye menu | **local** | nie | Specjalne ścieżki: Tempo/Metrum read-only α3 OK |
| Forma + Countdown | **local** mock | **tak** | α3: clipy z `project.json` (ticks) |
| Tekst / Akordy / Cue | **local** mock | nie | OUT edycja; lane puste / ukryte OK |
| Tempo / Tonacja / Metrum / Kotwice | mock gdy eye on | **częściowo** | α3: Tempo+Metrum read z map (opcjonalnie lane) |
| Audio 0…N | **local** add track | nie | OUT silnik; przycisk może zostać local |
| Inspector | **local** | nie | α3: length Countdown / nazwa sekcji (min.) |
| Song screen: wzór / UG | overlay **local**; przyciski **disabled** | nie | UG OUT; lista biblioteki **IN** |

---

## Admin

| Obszar | Status α2 | Blokuje α3? | Uwagi |
|--------|-----------|-------------|-------|
| Chrome: brand, zakładki, Timeline/Klient | **wired** / local tabs | nie | Wersja w UI nadal „alpha.1” (kosmetyka) |
| Wygląd | **local** (motywy disabled) | nie | OUT |
| Status: Teraz (nazwa) | **wired** (selected) | nie | |
| Status: sekcja | „—” | **tak** | α3: aktywna sekcja Formy z transportu+projektu |
| Status: BBT / BPM | **wired** (transport) | nie | |
| Status: Dalej / MIDI / Tr./Lead / edycja | **disabled** / placeholder | nie | OUT |
| Utwory: lista + select | **wired** | **tak** | Już jest — fundament |
| Utwory: Nowy / rename / Usuń | **wired** | nie | |
| Utwory: filtr / sort / Batch PC / eksport | **disabled** | nie | OUT |
| Import / XML / Partytura / wzory | modal shell / disabled | nie | OUT |
| **Otwórz w Timeline** | Link → `/timeline` **bez** `projectId` | **tak** | α3: `/timeline/:projectId` |
| Set / Scena / Pliki / Host (reszta) | prawie wszystko **disabled** | nie | OUT |

---

## Client

| Kontrolka | Status α2 | Blokuje α3? | Uwagi |
|-----------|-----------|-------------|-------|
| Name modal | **local** | nie | |
| 4 role + start / split | **local** | nie | |
| Header: conn, takt, brand | **wired**/local | nie | |
| Tytuł utworu | „Brak utworu” | **tak** | α3: nazwa aktywnego projektu |
| → następny | hidden | nie | Setlista OUT |
| Fullscreen | **disabled** | nie | |
| Panele ról + empty | empty „Oczekiwanie…” | **tak** (Forma / grid sekcji) | α3: aktywna sekcja; nie pełny grid akordów |
| Cue toast | hidden | nie | OUT |
| Drawery settings | **local** / pola disabled | nie | Motywy OUT |

---

## Świadome delty inventarza (alpha.3)

Nie usuwamy kontrolek z DOM. Alpha.3 **nie** odhacza inventarza do parity — tylko wiring wycinka:

1. Treść projektu (Forma + tempo/metrum) end-to-end.
2. Nawigacja Admin → Timeline z `projectId`.
3. Client / Admin status: aktywna sekcja + tytuł.
4. Transport czyta mapy z projektu.

Pozostałe pozycje inventarza: **disabled/local bez blocker status** — OK do późniejszych alph.

## Blokery alpha.3 (skrót)

1. Schema + GET/PUT treści (dziś tylko `name`).
2. Route Timeline z `projectId` + load projektu.
3. Canvas Formy z danych (nie mock).
4. Pencil → mutacja Formy → Zapisz/PUT.
5. Play/seek → bpm/meter z `tempoMap`/`meterMap`.
6. Active section resolver (ticks → clip Formy) w Client (+ status Admin).

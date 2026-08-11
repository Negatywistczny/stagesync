export type HelpTab = "shortcuts" | "tools";

export type ShortcutRow = { keys: string; action: string };
export type ShortcutGroup = { heading: string; rows: ShortcutRow[] };

export type ToolBullet = { term: string; detail: string };
export type ToolSection = { title: string; bullets: ToolBullet[] };

export const TABS: { id: HelpTab; label: string }[] = [
  { id: "shortcuts", label: "Skróty klawiszowe" },
  { id: "tools", label: "Narzędzia i ścieżki" },
];

export const KEY_GROUPS: ShortcutGroup[] = [
  {
    heading: "Widok",
    rows: [
      { keys: "X", action: "Mikser on/off (ikona obok Tempo)" },
      {
        keys: "I",
        action:
          "Inspector / Właściwości on/off (Timeline; × w panelu; ukryte w Mixerze)",
      },
      { keys: "? / Shift+/", action: "Otwórz tę pomoc" },
    ],
  },
  {
    heading: "Narzędzia",
    rows: [
      { keys: "T", action: "Otwórz menu narzędzi (akord)" },
      {
        keys: "T, potem T/P/E/I/J/M/S/A/G/R/Y",
        action:
          "Wybór narzędzia: T T Wskaźnik, T P Ołówek, T E Gumka, T I Nożyczki, T J Połącz, T M Mute, T S Solo, T A Fade, T G Gain, T R Zaznaczanie, T Y Zoom",
      },
      {
        keys: "W",
        action: "Różdżka — przycisk przy Formie lub skrót (1/2/3 w menu)",
      },
      { keys: "1 / 2 / 3", action: "Tekst / Akordy / obie (menu Różdżki)" },
      {
        keys: "Przycisk Tap (Tekst)",
        action: "Tryb Tap — kolejka linii (bez skrótu)",
      },
      { keys: "↑ / ↓", action: "Tap: poprzednia / następna linia" },
      { keys: "Esc", action: "Anuluj akord / odznacz / Tap→Wskaźnik" },
      { keys: "⌃/Ctrl+⌥/Alt", action: "Chwilowy Zoom" },
      { keys: "⌘/Ctrl+drag", action: "Snap off przy przeciąganiu" },
    ],
  },
  {
    heading: "Edycja",
    rows: [
      { keys: "⌘/Ctrl+S", action: "Zapisz (gdy dirty)" },
      { keys: "⌘/Ctrl+A", action: "Zaznacz wszystkie klipy" },
      { keys: "⌘/Ctrl+C", action: "Kopiuj klipy (w tym audio)" },
      { keys: "⌘/Ctrl+X", action: "Wytnij zaznaczone klipy" },
      { keys: "⌘/Ctrl+V", action: "Wklej przy locatorze" },
      { keys: "⌘/Ctrl+D", action: "Duplikuj zaznaczone" },
      { keys: "⌘/Ctrl+T", action: "Podziel zaznaczony klip przy playheadzie" },
      { keys: "⌘/Ctrl+J", action: "Połącz sąsiednie zaznaczone klipy" },
      { keys: "⌥/Alt+← / →", action: "Nudge zaznaczonego klipu ±1 siatka" },
      {
        keys: "Delete / ⌫",
        action: "Usuń klip / mapę / ścieżkę / bus / HW Out",
      },
      { keys: "⌘/Ctrl+Z", action: "Undo (z zaznaczeniem)" },
      { keys: "⌘/Ctrl+⇧+Z", action: "Redo" },
    ],
  },
  {
    heading: "Odtwarzanie",
    rows: [
      { keys: "Spacja", action: "Play / Pause (Tap: mark linii)" },
      { keys: "Shift+Spacja", action: "Play od startu zaznaczonego klipu" },
      { keys: "Enter / Home", action: "Stop + początek utworu" },
      { keys: "C", action: "Pętla / Cycle on/off" },
      {
        keys: "U / ⌘/Ctrl+U",
        action: "Cycle = długość zaznaczonego klipu audio",
      },
      { keys: "K", action: "Metronom on/off" },
      {
        keys: "⌘/Ctrl+klik S/M",
        action: "Solo/Mute wszystkich ścieżek (dock)",
      },
      { keys: "⌥/Alt+klik S", action: "Solo wyłącznie tej ścieżki" },
      {
        keys: "Shift / ⌘+klik",
        action: "Zakres / przełącz zaznaczenie ścieżek",
      },
    ],
  },
  {
    heading: "Nawigacja",
    rows: [
      { keys: "← / →", action: "Locator ±1 beat" },
      { keys: "[ / ]", action: "Poprzedni / następny utwór" },
      { keys: "⌘/Ctrl+← / →", action: "Zoom H" },
      { keys: "⌘/Ctrl+↑ / ↓", action: "Zoom V (lane)" },
      { keys: "Z", action: "Fit Zoom (cały utwór)" },
      { keys: "Shift+Wheel", action: "Poziome przewijanie" },
    ],
  },
];

export const TOOL_SECTIONS: ToolSection[] = [
  {
    title: "Podstawy & Odtwarzanie",
    bullets: [
      {
        term: "Ścieżki",
        detail:
          "edytuj Forma, Tekst, Akordy, Cue; specjalne (Tempo / Tonacja / Metrum / Kotwice) włącz w menu oka.",
      },
      {
        term: "Zapisz / Odrzuć",
        detail:
          "zapis lub cofnięcie lokalnych zmian; Undo/Redo: ⌘/Ctrl+Z / ⌘/Ctrl+Shift+Z lub menu Edycja.",
      },
      {
        term: "Metadane",
        detail: "ikona info ⓘ — tytuł, PC, tempo, tonacja, artysta, gatunek.",
      },
      {
        term: "Widok",
        detail:
          "X = Mikser (bez panelu Właściwości); I / Właściwości = Inspector w Timeline; ? = ta pomoc.",
      },
      {
        term: "Odtwarzanie",
        detail:
          "Play / Pause / Stop (Enter/Home = stop + początek); pętla C; U = cycle z klipu audio; metronom K; Podążaj za wskaźnikiem.",
      },
      {
        term: "Utwory",
        detail:
          "tytuł otwiera bibliotekę; [ / ] = poprzedni / następny; auto-setlista po końcu utworu.",
      },
      {
        term: "Playhead",
        detail:
          "pozycja transportu serwera (SSOT); klient tylko wygładza między tickami. Locator — klik w linijkę lub przeciągnij marker.",
      },
      {
        term: "Shift+Spacja",
        detail: "odtwarzanie od startu zaznaczonego klipu (lub locatora).",
      },
    ],
  },
  {
    title: "Zaznaczanie i gesty myszy",
    bullets: [
      {
        term: "PPM",
        detail:
          "menu kontekstowe na klipie (wytnij / kopiuj / wklej / duplikuj / usuń / mute / rozdziel / Inspector), pustej lane i nagłówku ścieżki audio.",
      },
      {
        term: "⌘/Ctrl+drag",
        detail: "chwilowo wyłącza snap (Forma: takt; treść/mapy: beat).",
      },
      {
        term: "Schowek",
        detail:
          "⌘/Ctrl+A zaznacz wszystkie; ⌘/Ctrl+T podział przy playheadzie; ⌘/Ctrl+J scal; ⌥/Alt+←/→ nudge.",
      },
      {
        term: "Dwuklik klipu",
        detail: "fokus Inspectora; tablet: double-tap osi = Fit Zoom.",
      },
      {
        term: "Forma",
        detail:
          "Countdown zablokowany (bez pencil / scissors / delete); długość przez resize prawej krawędzi; single-move przesuwa też późniejsze sekcje.",
      },
      {
        term: "Kotwice",
        detail:
          "Pencil gdy jest MusicXML / mapa; przeciąganie kotwicy zmienia logicBar.",
      },
    ],
  },
  {
    title: "Ścieżki Audio i Dock",
    bullets: [
      {
        term: "+ Dodaj Ścieżkę",
        detail:
          "pod listą w docku; dwuklik pustego miejsca w kolumnie docku też dodaje ścieżkę.",
      },
      {
        term: "Zaznaczanie ścieżek",
        detail:
          "klik = jedna; Shift+klik = zakres; ⌘/Ctrl+klik = przełącz w zestawie.",
      },
      {
        term: "S / M",
        detail:
          "Solo / Mute w docku; przy multi — na zaznaczonych. ⌘/Ctrl+S/M = wszystkie; ⌥/Alt+S = solo wyłącznie tej.",
      },
      {
        term: "Fader",
        detail: "dwuklik fadera / dB = reset 0.0 dB.",
      },
      {
        term: "Mikser",
        detail:
          "ikona obok Tempo (X); pionowe paski: M / ST (PAN vs True Balance BAL), ciemny baner z cienkim paskiem koloru ścieżki, fader z podziałką, peak LED (mono 1 pasek / stereo L+R; zielony / żółty −6 / czerwony clip), S/M; Out = Master|Bus|HW; Busy / Click / Master; HW Out: M/ST, L/R, PPM/Delete; Master Out = para fizyczna przy multi-out; przypięty Stereo Out.",
      },
      {
        term: "Dock",
        detail:
          "nazwa + S/M w pierwszym rzędzie, fader na pełną szerokość w drugim; przeciągnij prawą krawędź kolumny (zapamiętane).",
      },
      {
        term: "Import utworu",
        detail:
          "Wybierz utwór → Importuj… (albo Metadane ⓘ → Importuj…): wybierz źródła UltraStar / Ultimate Guitar / Audio. US+UG buduje Formę i akordy z powiązań tekstu oraz Smart Tempo z audio (opcjonalnie). Sam UltraStar — timed sylaby i melodia; sam UG — Forma + akordy (+ Różdżka). Konto USDB: Konto USDB w kreatorze albo Ustawienia serwera. Nadpisanie draftu wymaga Zapisz (⌘S) przy samym UltraStar/UG; US+UG często zapisuje od razu.",
      },
      {
        term: "Import",
        detail: "upuść plik na pustą lane, PPM → Importuj, albo z Inspectora.",
      },
      {
        term: "Schowek audio",
        detail: "⌘C / ⌘X / ⌘V / ⌘D także dla klipów audio (i z PPM).",
      },
    ],
  },
  {
    title: "Lista narzędzi audio",
    bullets: [
      {
        term: "Menu T",
        detail:
          "Logic-style: T otwiera menu przy kursorze; druga litera wybiera narzędzie. Same litery nie przełączają narzędzi.",
      },
      {
        term: "Pasek",
        detail:
          "domyślnie Wskaźnik / Ołówek / Gumka / Nożyczki; kafelek ustawień wybiera widoczne (lokalnie). Pełny zestaw zawsze przez T + litera.",
      },
      {
        term: "Pointer (T T)",
        detail:
          "zaznacz, przesuń, zmień długość (strefy na brzegach). Esc = anuluj / Wskaźnik / odznacz.",
      },
      {
        term: "Pencil (T P)",
        detail:
          "klik: 1 takt / marker; przeciągnięcie: zakres z nadpisaniem. Na mapach: nowa zmiana przy snapie. Na audio: klik w pustym → Import i wstawienie w miejscu kliknięcia (jak Logic).",
      },
      {
        term: "Eraser (T E)",
        detail:
          "usuń kliknięty klip (Forma / treść / audio) lub zdarzenie mapy.",
      },
      {
        term: "Scissors (T I)",
        detail:
          "podział klipu / podsekcja Formy / nowa zmiana mapy. Samo I = Inspector (nie nożyczki).",
      },
      {
        term: "Join (T J)",
        detail:
          "scal sąsiednie klipy albo usuń najbliższą granicę podsekcji Formy.",
      },
      {
        term: "Mute (T M) / Solo (T S)",
        detail:
          "klik = mute klipu; przytrzymaj LMB = chwilowe solo ścieżki. Dock S/M bez zmian.",
      },
      {
        term: "Fade (T A)",
        detail: "przeciągnij na krawędzi klipu: fade in / out.",
      },
      {
        term: "Gain (T G)",
        detail: "przeciągnij w pionie na klipie: poziom dB.",
      },
      {
        term: "Marquee (T R)",
        detail: "prostokąt zaznaczenia na siatce (także klipy audio).",
      },
      {
        term: "Zoom (T Y)",
        detail:
          "przeciągnij prostokąt na osi; klik tła = Fit; Ctrl+Alt = chwilowy Zoom. Z = Fit Zoom.",
      },
      {
        term: "Różdżka (W)",
        detail:
          "naprawa / sam UG: przycisk przy warstwie Forma lub W — Tekst→Forma / Akordy→Forma / obie (1 / 2 / 3). Przy imporcie US+UG struktura powstaje z mostka; Różdżka nie jest domyślną ścieżką.",
      },
      {
        term: "Tap",
        detail:
          "tylko przycisk przy warstwie Tekst: kolejka linii; Spacja = start przy playheadzie; ↑/↓ = linie; Esc wychodzi.",
      },
    ],
  },
];

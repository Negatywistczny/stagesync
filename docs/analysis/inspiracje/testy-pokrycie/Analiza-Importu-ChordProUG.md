> From: https://gemini.google.com/app/da02a6ee2bd7cee6

# you asked

message time: 2026-07-27 14:28:31

Jesteś ekspertem od importu ChordPro/UG w StageSync. Przeanalizuj [`packages/shared/src/ug-import.ts`](../../../../packages/shared/src/ug-import.ts) — parsowanie tekstu → Forma + Tekst + Akordy (fail-soft, Zod na wyjściu).

CEL ANALIZY
[`ug-import.test.ts`](../../../../packages/shared/src/ug-import.test.ts) jest bogaty; moduł ma >50 uncovered lines. Znajdź luki w parserze sekcji, onsets, `reflowUgImportSectionBars`, `applyUgImportToProject`.

PYTANIA BADAWCZE

1. Które regex/token paths (`CHORD_TOKEN`, `SECTION_BRACKET`) nie mają negatywnych testów?
2. `barsPerLine` ≠ 1, custom `contentFloorTicks`, `idPrefix` — pokrycie?
3. `clipsFromOnsets` / `chordOnsetsInBar` — overlapping, empty bar, multiple chords per bar?
4. `reflowUgImportSectionBars` po zmianie metrum — edge cases?
5. `applyUgImportToProject`: merge z istniejącym project vs replace lanes?
6. Walidacja `UgImportPayloadSchema` — corrupt output z parsera?
7. Integracja z `wand.sealAkordyLengths` po imporcie?

KONTEKST

- Pure shared; fail-soft `UgImportResult`; Polish H → B via `toLiteralStorage`.
- Vitest; bez I/O.
- Parity legacy: barsPerLine, onset timing do następnego akordu.

OCZEKIWANY OUTPUT

1. Lista brakujących testów z przykładowym input string (ChordPro-lite).
2. Fixture snippets inline (nie tylko Money sample).
3. Mocki: brak (pure).
4. Ryzyka flaky: brak.
5. Propozycja tabeli sekcji [Verse]/[Chorus] × chord-only lines × lyric-only.

---

# gemini response

Oto ułożony plan, jak pracować nad tym zagadnieniem. Jeśli chcesz, abym go zmienił, poinformuj mnie o tym.
http://googleusercontent.com/deep_research_confirmation_content/0

---

# you asked

message time: 2026-07-27 14:34:32

Zacznij wyszukiwanie

---

# gemini response

I've completed your research. Feel free to ask me follow-up questions or request changes.

Analiza UG Import StageSync

# Systemowa Analiza Parseru UG/ChordPro oraz Audyt Pokrycia Testowego Modułu ug-import.ts w StageSync

Moduł importu Ultimate Guitar (UG) oraz ChordPro-lite, umiejscowiony w ścieżce [`packages/shared/src/ug-import.ts`](../../../../packages/shared/src/ug-import.ts), stanowi kluczowy element architektoniczny warstwy dzielonej (_pure shared domain_) w systemie StageSync . Odpowiada on za bezwyjątkową (_fail-soft_) transformację surowego tekstu piosenki z akordami na deterministyczne struktury danych: sekcje Formy (`formaMusic`), linie wokalne (`tekst`) oraz klipy akordowe (`akordy`) . Proces ten opiera się na siatce czasowej wyznaczonej przez wskaźnik PPQ (_Pulses Per Quarter Note_, domyślnie 960) oraz metrum .

Mimo że istniejąca suita testowa [`ug-import.test.ts`](../../../../packages/shared/src/ug-import.test.ts) weryfikuje podstawowe przypadki użycia, szczegółowa analiza wykazuje ponad 50 niepokrytych linii kodu . Luki te dotyczą krawędziowych ścieżek parsowania tokenów akordowych, nietypowych nagłówków sekcji, matematyki czasowej przy parametrze `barsPerLine > 1`, przeliczania metrum podczas operacji `reflowUgImportSectionBars`, a także integracji wyniku importu z dokumentem projektu i modułem Różdżki (`shared-wand.ts`) .

---

## Audyt Wyrażeń Regularnych i Parsera Tokenów (`CHORD_TOKEN`, `SECTION_BRACKET`)

Infrastruktura rozpoznawania akordów oraz struktury utworów w [`ug-import.ts`](../../../../packages/shared/src/ug-import.ts) opiera się na dwóch głównych wyrażeniach regularnych: `CHORD_TOKEN` oraz `SECTION_BRACKET` . Choć zapewniają one wysoką elastyczność w przetwarzaniu tekstu, brak negatywnych testów jednostkowych stwarza ryzyko wprowadzania regresji .

```typescript
const CHORD_TOKEN =
  /^[A-H](?:#|b)?(?:maj|min|m|sus|dim|aug|add|alt)?[0-9]*(?:sus[0-9]*)?(?:\/[24])?(?:(?:#|b)(?:5|9|11|13))*(?:\([^)]+\))?(?:\/[A-H](?:#|b)?)?$/i;
```

Wyrażenie `CHORD_TOKEN` służy do weryfikacji tokenów w liniach czysto akordowych oraz wewnątrz nawiasów kwadratowych ChordPro . Analiza reguły ujawnia następujące luki w testach negatywnych:

- **Nieprawidłowy Bass po Ukośniku (Slash Bass)**: Tokeny zawierające niepoprawny dźwięk basowy, takie jak `C/9` lub `C/Z`, są dopuszczane przez człon `(?:\/[A-H](?:#|b)?)?` w `CHORD_TOKEN`, lecz odrzucane na etapie `splitRealBass` w `toLiteralStorage` . W przypadku napotkania tokenu `C/9` w linii czysto akordowej, parser traktuje go jako nie-akord, co powoduje zakwalifikowanie całej linii jako linii tekstu wokalnego . Błąd ten nie posiada obecnie dedykowanego testu .
- **Wielokrotne Grupy Alteracji w Nawiasach**: Regex akceptuje tylko jedną grupę nawiasów `(?:\([^)]+\))?` . Złożone symbole, takie jak `C(add9)(omit3)`, nie dopasowują się do wzorca i są błędnie traktowane jako słowa tekstu piosenki .
- **Kolidujące Litery Jednoliterowe**: Słowa jednoliterowe stanowiące w języku polskim lub angielskim spójniki (np. „A”, „i”), występujące w liniach z akordami, są interpretowane jako nuty basowe lub prymy akordów . Linia składająca się wyłącznie ze słów „A B C” zostanie w całości sparowana jako linia akordowa bez tekstu .
- **Wielokrotne Modyfikacje Alterowane**: Sekwencje nakładających się alteracji (np. `Cmaj7#5#9#11#13`) testują chciwość wyrażenia regularnego, ale brak jest testów sprawdzających limity długości i poprawności .

Nagłówki sekcji są identyfikowane przez wyrażenie `SECTION_BRACKET` oraz funkcję `parseSectionHeader` :

```typescript
const SECTION_BRACKET =
  /^\[(Verse|Chorus|Bridge|Intro|Outro|Pre-?Chorus|Solo|Instrumental|Interlude|Tag|Ending|Hook|Refrain|Coda|Break|Prechorus)(?:\s*\d*)?\]$/i;
```

Wyrażenie `SECTION_BRACKET` akceptuje wyłącznie angielskie nazwy sekcji . Polskie nazwy, takie jak `[Zwrotka 1]` czy `[Refren]`, nie pasują do tego regexu, lecz wpadają do drugiego warunku awaryjnego w `parseSectionHeader` (`/^\[[^\]]+\]$/`), o ile linia nie zawiera wewnątrz akordów w nawiasach . Rezmieszczenie to działa poprawnie dzięki projektowej ścieżce fallback, ale zachowanie to nie jest objęte żadnym testem .

Ponadto dyrektywy blokowe ChordPro, takie jak `{start_of_verse: Intro}` lub `{start_of_chorus}`, są parsowane przez `parseSectionHeader`, podczas gdy dyrektywy metadanych (np. `{title: Song}`) są odrzucane przez `isSkipMetaDirective` . W zestawie testów brakuje weryfikacji, czy dyrektywa `{title}` nie powoduje błędnego utworzenia pustej sekcji Formy .

---

## Parametryzacja Importu i Matematyka Czasu

Konfiguracja importu przekazywana w obiekcie `UgImportOptions` steruje rozmieszczaniem obiektów na osi czasowej wyrażonej w tickach . Domyślne wartości to `PPQ = 960` (co daje 3840 ticków na takt w metrum 4/4), `contentFloorTicks = 0` oraz `idPrefix = "ug"` .

| Parametr Konfiguracji | Wartość Domyślna | Znaczenie Architektoniczne w Kodzie                                                              | Stan Pokrycia Testowego                                    |
| :-------------------- | :--------------- | :----------------------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| `barsPerLine`         | `1`              | Liczba taktów siatki przydzielana na jedną linię tekstu (`lineTicks = barTicks * barsPerLine`) . | **Brak** (weryfikowane tylko domyślne `barsPerLine = 1`) . |
| `contentFloorTicks`   | `0`              | Punkt startowy na osi czasu (np. przesunięcie po klipie odliczania `countdown`) .                | **Brak** (wszystkie testy startują od ticka 0) .           |
| `idPrefix`            | `"ug"`           | Prefiks generowanych identyfikatorów klipów (`ug-tekst-N`, `ug-akord-N`, `ug-forma-N`) .         | **Brak** (weryfikowane tylko domyślny prefiks `"ug"`) .    |

Gdy parametr `barsPerLine` przybiera wartość większą od 1 (np. `barsPerLine = 2`), jedna linia tekstu zajmuje w projekcie 2 takty (7680 ticków przy PPQ 960 i metrum 4/4) . Klip tekstu (`TekstClip`) otrzymuje wówczas `lengthTicks = 7680` .

Akordy przypisane do tej linii są rozmieszczane przez funkcję `chordOnsetsInBar` w granicach **pierwszego taktu** (`barTicks = 3840`) . Jednakże funkcja `clipsFromOnsets` wylicza długość ostatniego akordu w linii jako `spanEnd - startTicks`, gdzie `spanEnd = lineStart + lineTicks` . W efekcie ostatni akord danej linii rozciąga się przez cały drugi takt, aż do rozpoczęcia kolejnej linii wokalnej . Jest to zachowanie zgodne z historyczną specyfikacją systemu StageSync (_legacy parity_), ale nie posiada ono testu weryfikacyjnego w [`ug-import.test.ts`](../../../../packages/shared/src/ug-import.test.ts) .

---

## Algorytmy Rozmieszczania Akordów (`chordOnsetsInBar`, `clipsFromOnsets`, `sealAkordyLengths`)

Wyliczanie pozycji akordów w obrębie taktu opiera się na matematycznej dystrybucji miar . Funkcja `chordOnsetsInBar` wyznacza unikalne i monotonicznie rosnące punkty startowe (_onsets_) :

1.  Dla `chordCount == 1` zwracany jest jednowelementowy wektor `[barStart]` .
2.  Dla `chordCount <= beatsPerBar` stosowana jest funkcja `distributeChordBeatIndices`, przypisująca akordy do konkretnych miar taktu (1..4) .
3.  Dla gęstych linii (`chordCount > beatsPerBar`) stosuje się równomierny podział liniowy `Math.floor((i * barTicks) / chordCount)` .
4.  Korekta nakładania wymusza minimalny krok `minStep = Math.max(1, Math.floor(ticksPerBeat / 4))` oraz przycina pozycje do granic taktu, zapobiegając przekraczaniu krawędzi `barEnd` .

Funkcja `clipsFromOnsets` przekształca wyznaczone punkty startowe na obiekty `AkordClip`, ustalając długość każdego klipu jako różnicę między kolejnym punktem startowym a pozycją bieżącą . Z kolei funkcja `sealAkordyLengths` sortuje klipy i usuwa wszelkie luki oraz nakładania na całej ścieżce akordów .

W zestawie testów występuje luka dotycząca obsługi **wielokrotnych linii czysto akordowych występujących bezpośrednio po sobie** . Gdy w tekście wejściowym znajdują się dwie linie akordowe bez tekstu (np. `C G\nAm F`), akordy z pierwszej linii trafiają do bufora `pendingChords` . Druga linia akordowa dopisuje swoje tokeny do bufora . Dopiero napotkanie linii tekstu lub końca pliku (EOF) wyzwala operację `flushChordsAtCursor` . W efekcie wszystkie skumulowane akordy są rozmieszczane w obrębie jednego taktu, zamiast tworzyć osobne takty na osi czasu . Taka specyfika buforowania wymaga dokładnego przetestowania .

---

## Skalowanie i Przeliczanie Metrum (`reflowUgImportSectionBars`)

Funkcja `reflowUgImportSectionBars` umożliwia operatorowi interaktywne rozciąganie lub zwężanie sekcji Formy (zmiana liczby taktów) oraz proporcjonalne przeliczanie pozycji klipów tekstu i akordów wewnątrz tych sekcji . Przeliczenie pozycji klipu odbywa się na podstawie względnego przesunięcia `rel` w starej sekcji oraz nowej długości sekcji `neu.lengthTicks` :

$\text{startTicks}_{\text{new}} = \text{startTicks}_{\text{section, new}} + \left\lfloor \frac{\text{startTicks}_{\text{clip, old}} - \text{startTicks}_{\text{section, old}}}{\text{lengthTicks}_{\text{section, old}}} \times \text{lengthTicks}_{\text{section, new}} \right\rceil$

$\text{lengthTicks}_{\text{new}} = \max\left(1, \left\lfloor \text{lengthTicks}_{\text{clip, old}} \times \frac{\text{lengthTicks}_{\text{section, new}}}{\text{lengthTicks}_{\text{section, old}}} \right\rceil\right)$

Podczas analizy kodu `reflowUgImportSectionBars` zidentyfikowano następujące niepokryte ścieżki i sytuacje brzegowe :

- **Niezgodność Długości Tablicy Sekcji**: Kod zawiera warunek walidacyjny sprawdzający, czy podana tablica długości `sectionBars` odpowiada liczbie sekcji w obiekcie `imported.formaMusic.clips` . Ścieżka zwracająca błąd `{ ok: false, message: "Liczba długości sekcji nie pasuje..." }` nie jest wywoływana w żadnym teście .
- **Nieprawidłowe lub Ujemne Wartości Taktów**: Konwersja `Math.min(256, Math.max(1, v))` zabezpiecza kod przed wartościami ujemnymi, zerowymi oraz `NaN` . Przypadek przekazania wartości ujemnych w tablicy `sectionBars` nie jest objęty testem .
- **Zmiana Metrum podczas Reflow**: Gdy import pierwotny wykonano w metrum 4/4 (`barTicks = 3840`), a wywołanie `reflowUgImportSectionBars` przekaże nową konfigurację metrum 3/4 (`barTicks = 2880`), nowa długość sekcji zostanie wyliczona w oparciu o metrum 3/4 . Skalowanie proporcjonalne przeliczy pozycje tickowe, jednak klipy mogą zostać przesunięte poza miary taktu . Brak jest testów weryfikujących zachowanie parsera przy zmianie metrum .

---

## Integracja z Dokumentem Projektu i Modułem Różdżki

Import z Ultimate Guitar nie działa w izolacji, lecz integruje się ze stanem dokumentu projektu `Project` (w wersji V5) oraz algorytmami automatycznego rozmieszczania Różdżki (`shared-wand.ts`) .

### Scalanie ze Stanem Projektu (`applyUgImportToProject`)

Funkcja `applyUgImportToProject` przyjmuje istniejący obiekt `Project` oraz wynik importu `UgImportOk` . Operacja ta realizuje następujące reguły:

1.  **Ochrona Klipów Odliczania**: Z dotychczasowej Formy projektu filtrowane i zachowywane są wyłącznie klipy typu `countdown` (`kind === "countdown"`) .
2.  **Zastąpienie Sekcji Muzycznych**: Wszystkie dotychczasowe sekcje muzyczne Formy są usuwane i zastępowane nowymi sekcjami z `imported.formaMusic.clips` .
3.  **Calkowita Podmiana Torów Contentu**: Tory `tekst` oraz `akordy` są w całości zastępowane przez dane pochodzące z importu .
4.  **Nienaruszalność Pozostałych Torów**: Tory ścieżek audio (`audioTracks`, `audioClips`), automatyka sygnałów `cue`, mapy tempa (`tempoMap`), metrum (`meterMap`) oraz tonacji (`keyMap`) pozostają całkowicie nienaruszone .

W zestawie testów brakuje weryfikacji, czy wywołanie `applyUgImportToProject` faktycznie pozostawia klipy `cue` oraz ścieżki audio w stanie niezmienionym .

### Spójność Algorytmiczna z Modułem Różdżki (`shared-wand.ts`)

Podczas parsowania tekstu w [`ug-import.ts`](../../../../packages/shared/src/ug-import.ts), każdy klip tekstu otrzymuje pole `sourceSection` (nazwa sekcji), a każdy klip akordowy pole `sourceLineId` (identyfikator linii tekstu) . Te metadane stanowią fundament działania algorytmu Różdżki (`placeContentFromForma`) w pliku `shared-wand.ts` .

Gdy użytkownik uruchamia Różdżkę w celu ponownego dopasowania tekstu lub akordów do zmienionych długości sekcji Formy, moduł [`wand.ts`](../../../../packages/shared/src/wand.ts) wylicza nowe pozycje startowe klipów, a następnie wywołuje funkcję `sealAkordyLengths` zaimportowaną bezpośrednio z [`ug-import.ts`](../../../../packages/shared/src/ug-import.ts) . Zapewnia to jednolitą regułę domenną: klipy akordowe w całym systemie StageSync są przycinane do punktu startowego kolejnego akordu, co wyklucza nakładanie się elementów na torze .

---

## Bezpieczeństwo Typów i Walidacja Schematu (`UgImportPayloadSchema`)

Parser realizuje wzorzec bezwyjątkowej obsługi błędów (_fail-soft_) . Żaden nieprawidłowy ciąg znaków wprowadzony przez użytkownika nie generuje wyjątku `throw` . Przechwytywanie błędów na najwyższym poziomie pakuje ewentualne awarie do obiektu `{ ok: false, message: "..." }` z komunikatem w języku polskim .

Przed zwróceniem wyniku `UgImportOk`, sparowane tablice klipów są przepuszczane przez walidator Zod `UgImportPayloadSchema` :

```typescript
const UgImportPayloadSchema = z.object({
  tekst: z.object({ clips: z.array(TekstClipSchema) }),
  akordy: z.object({ clips: z.array(AkordClipSchema) }),
  formaMusic: z.object({ clips: z.array(FormaClipSchema) }),
});
```

Jedyny istniejący test walidacji schematu wymusza błąd poprzez przepełnienie pola tekstu (`text.repeat(2001)`) . Brak jest testów sprawdzających zachowanie parsera w sytuacji, gdyby wewnętrzny algorytm wygenerował obiekt niezgodny ze schematem (np. z ujemnymi wartościami `startTicks` dla sekcji muzycznych lub nieprawidłowymi identyfikatorami) .

---

## Propozycja Matrycy Scenariuszy Testowych oraz Zestaw Suity Testowej

### Matryca Pokrycia Scenariuszy Importu

| Typ Sekcji Formy   | Typ Linii          | Scenariusz Wejściowy (ChordPro-lite)                  | Oczekiwany Wynik Parsera i Stan Pokrycia                                                                 |
| :----------------- | :----------------- | :---------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| `[Verse]`          | Akordy + Tekst     | `[Am7b5]Line 1\n[C7b9]Line 2`                         | Akordy alterowane zaakceptowane, zmapowane na kanoniczny format storage . **Pokryte** .                  |
| `[Chorus]`         | Czyste Akordy      | `G/H\ntekst`                                          | Polish H w basie zamienione na B (`G/B`), linia tekstu zachowana . **Pokryte** .                         |
| `[Zwrotka 1]`      | Akordy w nawiasach | `[Hdim]Tekst`                                         | Nagłówek przetworzony przez fallback, `Hdim` $\to$ `Bdim` . **Częściowe** .                              |
| `{start_of_verse}` | Dyrektywy ChordPro | `{start_of_verse: Intro}\n[C]Hello`                   | Wykrycie nazwy sekcji "Intro" z dyrektywy blokowej . **Brak pokrycia** .                                 |
| `{title: Song}`    | Metadane ChordPro  | `{title: Test}\n[Verse]\n[C]Hi`                       | Pomięcie dyrektywy metadanych, utworzenie sekcji `Verse` . **Brak pokrycia** .                           |
| Brak               | Błędne Akordy      | `C/9\nLine text`                                      | Token `C/9` odrzucony jako akord, linia uznana za tekst wokalny . **Brak pokrycia** .                    |
| `[Intro]`          | Multi-bar line     | `barsPerLine: 2`                                      | `lineTicks = 7680`, klip tekstu ma długość 7680, akord rozciągnięty do końca linii . **Brak pokrycia** . |
| Odliczanie         | Custom Offset      | `contentFloorTicks: 3840`                             | Sekcje i klipy rozpoczynają się od offsetu 3840 ticków . **Brak pokrycia** .                             |
| `[Verse]`          | Custom ID          | `idPrefix: "test-import"`                             | Klipy otrzymują identyfikatory z prefiksem `test-import-` . **Brak pokrycia** .                          |
| Reflow             | Mismatch Tablicy   | `reflowUgImportSectionBars(res, [8])` przy 2 sekcjach | Zwraca `{ ok: false, message: "Liczba długości..." }` . **Brak pokrycia** .                              |

### Suita Uzupełniających Testów Jednostkowych

Poniższy kod stanowi gotowy zestaw testów jednostkowych Vitest, przeznaczony do wdrożenia w pliku [`packages/shared/src/ug-import.test.ts`](../../../../packages/shared/src/ug-import.test.ts). Testy są w 100% czyste (_pureshared_), nie używają atrap (_mocks_), nie wykonują I/O i są w pełni deterministyczne .

```typescript
import { describe, expect, it } from "vitest";
import {
  applyUgImportToProject,
  importUgText,
  reflowUgImportSectionBars,
} from "./ug-import.js";
import type { Project } from "./schema.js";

describe("ug-import edge cases & missing coverage", () => {
  it("handles ChordPro directives {start_of_verse} and skips metadata {title}", () => {
    const input = `{title: Ignored Song Title}
{start_of_verse: Zwrotka Pierwsza}
[C]Tekst zwrotki`;

    const result = importUgText(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.formaMusic.clips).toHaveLength(1);
    expect(result.formaMusic.clips[0]!.name).toBe("Zwrotka Pierwsza");
    expect(result.tekst.clips[0]!.text).toBe("Tekst zwrotki");
  });

  it("handles custom options: barsPerLine, contentFloorTicks, and idPrefix", () => {
    const input = `[Verse]
[C]Line one
[G]Line two`;

    const result = importUgText(input, {
      barsPerLine: 2,
      contentFloorTicks: 3840,
      idPrefix: "custom-import",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const barTicks = 3840; // 4/4 @ PPQ 960
    const lineTicks = barTicks * 2; // 7680

    // Verification of contentFloorTicks offset
    expect(result.formaMusic.clips[0]!.startTicks).toBe(3840);
    expect(result.tekst.clips[0]!.startTicks).toBe(3840);
    expect(result.tekst.clips[0]!.lengthTicks).toBe(lineTicks);
    expect(result.tekst.clips[1]!.startTicks).toBe(3840 + lineTicks);

    // Verification of custom idPrefix
    expect(result.tekst.clips[0]!.id).toMatch(/^custom-import-tekst-/);
    expect(result.akordy.clips[0]!.id).toMatch(/^custom-import-akord-/);
    expect(result.formaMusic.clips[0]!.id).toMatch(/^custom-import-forma-/);
  });

  it("handles multiple consecutive chord-only lines accumulating pending chords", () => {
    const input = `[Intro]
C G
Am F
Lyrics after chords`;

    const result = importUgText(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.akordy.clips.map((c) => c.symbol)).toEqual([
      "C",
      "G",
      "Am",
      "F",
    ]);
    expect(result.tekst.clips).toHaveLength(1);
    expect(result.tekst.clips[0]!.text).toBe("Lyrics after chords");
  });

  it("reflowUgImportSectionBars fails gracefully on sectionBars length mismatch", () => {
    const input = `[Verse]
[C]Hello

[Chorus]
[G]World`;

    const result = importUgText(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Pass 1 bar length instead of 2 (for 2 sections)
    const reflowed = reflowUgImportSectionBars(result, [8]);
    expect(reflowed.ok).toBe(false);
    if (reflowed.ok) return;
    expect(reflowed.message).toMatch(/Liczba długości sekcji nie pasuje/);
  });

  it("reflowUgImportSectionBars clamps invalid or negative bar inputs to range 1..256", () => {
    const input = `[Verse]
[C]Hello`;

    const result = importUgText(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reflowed = reflowUgImportSectionBars(result, [-5]);
    expect(reflowed.ok).toBe(true);
    if (!reflowed.ok) return;

    // Clamped to minimum 1 bar
    expect(reflowed.formaMusic.clips[0]!.lengthTicks).toBe(3840);
    expect(reflowed.sections[0]!.estimatedBars).toBe(1);
  });

  it("applyUgImportToProject retains audioTracks, cue, and tempoMap while replacing content", () => {
    const input = `[Verse]
[C]Imported Lyric`;

    const imported = importUgText(input);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const mockProject: Project = {
      id: "proj-123",
      name: "Test Song",
      formatVersion: 5,
      updatedAt: "2025-01-01T00:00:00.000Z",
      ppq: 960,
      defaultBpm: 120,
      defaultMeter: { numerator: 4, denominator: 4 },
      forma: {
        clips: [
          {
            id: "cd-1",
            name: "Countdown",
            startTicks: -3840,
            lengthTicks: 3840,
            kind: "countdown",
          },
          {
            id: "old-sec",
            name: "Old Section",
            startTicks: 0,
            lengthTicks: 3840,
            kind: "section",
          },
        ],
      },
      tempoMap: [{ id: "t1", startTicks: 0, bpm: 120 }],
      meterMap: [{ id: "m1", startTicks: 0, numerator: 4, denominator: 4 }],
      keyMap: [],
      assets: [],
      audioTracks: [{ id: "tr-1", name: "Backing Track", gainDb: 0 }],
      audioClips: [],
      tekst: {
        clips: [
          { id: "old-t", startTicks: 0, lengthTicks: 3840, text: "Old Text" },
        ],
      },
      akordy: { clips: [] },
      cue: {
        clips: [
          { id: "cue-1", startTicks: 0, lengthTicks: 960, label: "Count In" },
        ],
      },
      scoreBarMap: { anchors: [] },
    };

    const updated = applyUgImportToProject(mockProject, imported);

    // Countdown preserved, old section replaced by imported Verse
    expect(updated.forma.clips).toHaveLength(2);
    expect(updated.forma.clips[0]!.id).toBe("cd-1");
    expect(updated.forma.clips[1]!.name).toBe("Verse");

    // Non-content lanes preserved
    expect(updated.audioTracks).toEqual(mockProject.audioTracks);
    expect(updated.cue).toEqual(mockProject.cue);

    // Tekst lane replaced
    expect(updated.tekst.clips[0]!.text).toBe("Imported Lyric");
  });
});
```

---

Powered by [AI Exporter](https://saveai.net)

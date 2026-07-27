> From: https://gemini.google.com/app/3751c417c92edbf2

# you asked

message time: 2026-07-27 14:26:56

Jesteś ekspertem od testów domeny muzycznej StageSync. Przeanalizuj `packages/shared/src/wand.ts` — Różdżka: placement Tekst/Akordy z Forma (v4 parity, pure functions).

CEL ANALIZY
`wand.test.ts` jest obszerny, ale moduł ma >50 uncovered lines. Zidentyfikuj luki w algorytmach A–F (tekst) i A–E+L (akordy), scope, approximate layers.

PYTANIA BADAWCZE
1. Które gałęzie `placeContentFromForma` / `wandContentToForma` nie są trafiane (grep coverage)?
2. Scenariusze: puste Forma, scope sectionIds, countdown clips, subsections, multi-section Verse/Chorus?
3. `TEXT_WEIGHT_RATIO_THRESHOLD` heurystyki — edge cases krótkich ostatnich linii?
4. Tryb `both` (tekst + akordy) — kolejność i `approximate` flag?
5. Integracja z `sealAkordyLengths` z ug-import — wspólne testy czy osobne?
6. Czy `placeContentFromForma` nigdy nie powinien throw — wszystkie fail-soft paths pokryte?

KONTEKST
- Pure; Forma clips nie mutowane; fail-soft via `WandResult.ok`.
- Czas: `ticksPerBar`, `resolveMeterAt` — bez Date.now.
- Vitest + `createProjectV5Seed` fixtures.

OCZEKIWANY OUTPUT
1. Macierz: scenariusz × mode (tekst/akordy/both) × oczekiwany placed/approximate.
2. Brakujące testy z konkretnymi liniami tekstu/akordów.
3. Mocki: niepotrzebne (pure).
4. Ryzyka flaky: brak.
5. Propozycja property-based tests (opcjonalnie) dla random section lengths.

---

# gemini response

Oto ułożony plan, jak pracować nad tym zagadnieniem. Jeśli chcesz, abym go zmienił, poinformuj mnie o tym.
http://googleusercontent.com/deep_research_confirmation_content/0

---

# you asked

message time: 2026-07-27 14:30:49

Zacznij wyszukiwanie

---

# gemini response

I've completed your research. Feel free to ask me follow-up questions or request changes.

Analiza Testów Modułu Wand

# Analiza Pokrycia Testowego i Specyfikacja Testów Modułu Różdżki (`wand.ts`) w Systemie StageSync

## Architektura i Niezmienniki Modułu Różdżki

Moduł Różdżki zawarty w pliku `packages/shared/src/wand.ts` realizuje algorytmy rozmieszczania i dopasowywania klipów zawartości — śpiewalnego tekstu (`TekstClip`) oraz symboli akordów (`AkordClip`) — do istniejących sekcji struktury muzycznej `Forma` . Logika ta stanowi przeniesienie algorytmów z wersji v4 systemu z zachowaniem pełnej kompatybilności wstecznej (v4 parity) . W całości opiera się na czystych funkcjach (pure functions), co oznacza, że wyliczenia pozycji nie korzystają ze stanu zewnętrznego, zmiennych globalnych ani operacji wejścia/wyjścia, a jedynym źródłem prawdy dla czasu muzycznego jest oś dyskretnych jednostkach `ticks` oparta na stałej gęstości $PPQ = 960$ oraz mapie metrum (`meterMap`) .

Architektura modułu gwarantuje dwa fundamentalne niezmienniki domenowe. Po pierwsze, struktura sekcji muzycznych zawarta w obiekcie `project.forma` nie podlega żadnym mutacjom . Operacje Różdżki modyfikują wyłącznie pozycje `startTicks` oraz długości `lengthTicks` klipów na ścieżkach `tekst` oraz `akordy` . Po drugie, klipy należące do strefy odliczania (pre-roll / countdown) są całkowicie chronione przed przesunięciem . Ochrona ta dotyczy zarówno klipów posiadających identyfikatory etykiet cyfrowych (`vl-cd-*`), jak i elementów umieszczonych w strefie ujemnych wartości czasu .

Przetwarzanie danych realizowane jest w sposób zorientowany na rezultat poprzez typ `WandResult` . W przypadku powodzenia funkcja zwraca nową instancję obiektu projektu wraz z liczbą zmodyfikowanych klipów oraz flagą `approximate`, sygnalizującą zastosowanie warstwy przybliżonej . W sytuacji wystąpienia błędu biznesowego funkcja zwraca obiekt z flagą `ok: false` oraz czytelnym komunikatem dla operatora, wykluczając rzucanie wyjątków wykonawczych .

---

## Macierz Scenariuszy Placementu i Klasyfikacji Warstw

Poniższa macierz klasyfikuje zachowanie algorytmu Różdżki w zależności od struktury sekcji `Forma`, charakterystyki wprowadzanych danych oraz wybranego trybu pracy (`tekst`, `akordy` lub `both`).

| Scenariusz struktury Forma / Kontentu | Tryb (`mode`) | Oczekiwane `placed` | Oczekiwane `approximate` | Dominująca warstwa (Layer) | Stan wyniku (`ok`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Sekcja 8 taktów, 4 linie tekstu (podział równomierny) | `tekst` | 4 | `false` | Layer A (równy podział taktowy) | `true` |
| Sekcja 7 taktów, 4 linie tekstu (podział nierównomierny) | `tekst` | 4 | `true` | Layer B (reszta taktów na końcu: 1+2+2+2) | `true` |
| Sekcja 4 takty, 8 linii tekstu ($n > \text{bars}$) | `tekst` | 8 | `false` | Layer D (ułamkowy podział taktu) | `true` |
| Sekcja 4 takty, 1 linia tekstu ($n = 1$) | `tekst` | 1 | `false` | Layer E (rozciągnięcie na pełną sekcję) | `true` |
| Sekcja 8 taktów, 6 linii o dużej dysproporcji długości | `tekst` | 6 | `true` | Layer F (podział ważony długością) | `true` |
| Podsekcje typu Content/Gap (np. 4+1+4+1 bar) | `tekst` / `akordy` | $n$ | `true` (gdy sub-layer B/F) | Layer C (omijanie pauz/gapów) | `true` |
| Akordy przypisane via `sourceLineId` do linii tekstu | `akordy` | $n$ | Zależy od pod-warstwy | Layer L (placement po wersach) | `true` |
| Akordy zgrupowane w taktach odpowiadających wersom | `akordy` | $n$ | Zależy od pod-warstwy | Layer L (klastry taktowe) | `true` |
| Brak sekcji muzycznych w `Forma` (tylko Countdown) | dowolny | 0 | `false` | Brak | `false` (`"Brak sekcji Formy"`) |
| Pusta ścieżka tekstu lub brak śpiewalnych linii | `tekst` | 0 | `false` | Brak | `false` (`"Brak linii Tekstu"`) |
| Scope `sectionIds` niepasujący do istniejących sekcji | dowolny | 0 | `false` | Brak | `false` (`"Brak... w zaznaczonych"`) |
| Poprawny Tekst, brak akordów w projekcie | `both` | $n_{\text{tekst}}$ | Zależy od Tekstu | Tekst: A–F, Akordy: brak | `false` (`"Tekst OK, ale..."`) |

---

## Pogłębiona Analiza Pytań Badawczych i Luk Pokrycia

### 1. Identyfikacja Nieprzetestowanych Gałęzi (Grep Coverage)

Szczegółowa weryfikacja kodu źródłowego w zestawieniu z istniejącymi testami w `wand.test.ts` pozwala na precyzyjne wykazanie nieprzetestowanych ścieżek wykonania . 第一ą kluczową luką jest logicznie nieosiągalna gałąź sprawdzająca pusty filtr zakresu. W funkcjach `placeTekstFromForma` oraz `placeAkordyFromForma` umieszczono warunek `if (filter && filter.size === 0)` . Jednak funkcja pomocnicza `sectionFilter(scope)` zwraca wartość `null` w sytuacji, gdy tablica `sectionIds` po odfiltrowaniu pustych łańcuchów znaków nie zawiera elementów . W efekcie zmienna `filter` przyjmuje wartość `null` zamiast instancji `Set` o rozmiarze 0, co sprawia, że blok kodu dedykowany dla `filter.size === 0` stanowi martwy kod .

Druga luka dotyczy obsługi spływu nadmiarowych klipów w podsekcjach wewnątrz funkcji `placeSectionContent` . Warunek `if (offset < lines.length && contentSpans.length)` odpowiada za umieszczenie klipów, które pozostały nieprzydzielone po proporcjonalnym rozdzieleniu elementów na przedziały typu Content . W obecnym zestawie testów brak scenariusza wymuszającego przejście przez tę ścieżkę .

Trzecim obszarem bez pokrycia jest algorytm redystrybucji zerowych przydziałów w funkcji `splitCountsByContentBars` . W sytuacji, gdy liczba klipów jest większa lub równa liczbie obszarów grających ($n \ge \text{contentSpans.length}$), a matematyczne zaokrąglenie przydzieli do bardzo krótkiej podsekcji 0 klipów, pętla naprawcza odbiera klip z przedziału o najwyższej obsadzie i przekazuje go do pustej podsekcji . Logika ta nie została poddana weryfikacji w testach .

Czwarta luka występuje w funkcji `placeInSpan`, gdzie znajdują się dwie instrukcje korygujące pozycje onsetów . Pierwsza z nich, `if (onsets[i] > maxStart)`, ogranicza przesunięcie klipu do maksymalnego punktu startowego przed końcem sekcji . Druga, `if (i > 0 && onsets[i] < onsets[i - 1])`, zapobiega nakładaniu się lub odwróceniu kolejności klipów, wymuszając minimalny krok czasowy równy jednej mierze taktowej (beat) . Oba warunki skrajne nie są wyzwalane przez istniejące asercje .

Ostatnia luka dotyczy częściowego przypisania w funkcji `assignClipsToVocalSpans` (przypadek, gdy część akordów posiada `sourceLineId`, wyzwalając gałąź `tagged > 0`, lecz wybrane wersy wokalne pozostają bez akordów) oraz braku bezpośrednich testów dla nakładek pomocniczych `wandContentToForma` w trybach `"akordy"` oraz `"both"` .

### 2. Scenariusze Brzegowe Struktury i Zakresu

W przypadku całkowitego braku sekcji muzycznych w obiekcie `Forma` (np. gdy projekt zawiera wyłącznie sekcję odliczania) funkcja natychmiast przerywa działanie, zwracając status `ok: false` oraz komunikat `"Brak sekcji Formy"` . Gdy operacja jest ograniczona zakresem `WandScope`, Różdżka przetwarza wyłącznie sekcje, których identyfikatory znajdują się w zbiorze `scope.sectionIds` . Klipy przypisane do sekcji pominiętych w zakresie zachowują swoje pierwotne wartości `startTicks` i `lengthTicks` bez jakichkolwiek modyfikacji .

Klipy wokalne oraz akordowe należące do pre-rollu są filtrowane przez funkcje pomocnicze . Predykat `isSungTekst` odrzuca klipy posiadające identyfikatory cyfr odliczania (`vl-cd-*`), klipy z pustym tekstem oraz elementy, których tekst reprezentuje cyfrę umieszczoną w czasie ujemnym (`startTicks < 0`) . Analogiczna ochrona obowiązuje dla klipów akordowych .

Jeżeli sekcja `FormaClip` posiada zdefiniowane ucięcia wewnętrzne w tablicy `subsections`, algorytm wywołuje funkcję `detectContentGapSpans` . Podsekcje o długości nieprzekraczającej jednego taktu są klasyfikowane jako pauzy (Gap), natomiast dłuższe podsekcje jako partie grające (Content) . Różdżka rozmieszcza klipy wyłącznie na obszarach Content, gwarantując, że pauzy instrumentalne pozostają wolne od tekstu i akordów .

Rozmieszczanie zawartości w strukturach wielosekcyjnych (np. ciągi zwrotek i refrenów) opiera się na dwustopniowej przynależności . Najwyższy priorytet ma afiniczność nazewnicza, wyliczana poprzez dopasowanie znormalizowanego ciągu `sourceSection` klipu do nazwy sekcji w `Forma` . W przypadku braku dopasowania afinicznego algorytm przypisuje klip na podstawie jego bezwzględnego czasu `startTicks` via `containingSection` . Funkcja ta uwzględnia margines przedtaktu: klip leżący w granicach jednego taktu przed początkiem kolejnej sekcji jest automatycznie zaliczany do sekcji następnej .

### 3. Analiza Heurystyki Tekstowej (Layer F) i Krótkich Puent

Warstwa ważona rozkładu tekstu (Layer F) jest aktywowana w funkcji `shouldUseTextWeights` na podstawie analizy wag pojedynczych linii ($W_i$) . Waga linii wyliczana jest przez funkcję `textWeight`: dla fraz składających się z co najmniej dwóch słów jest to liczba słów, natomiast dla fraz jednosłowowych jest to liczba znaków . Warunek przejścia do rozkładu ważonego opisują dwie relacje matematyczne :

$\frac{\max(W)}{\min(W)} \ge \text{TEXT\_WEIGHT\_RATIO\_THRESHOLD} \quad (\text{gdzie threshold} = 2.0)$

$\frac{W_{\text{last}}}{\text{avg}(W)} \le \text{TEXT\_WEIGHT\_SHORT\_LAST\_RATIO} \quad (\text{gdzie ratio} = 0.55)$

Wyborowi warstwy towarzyszy rygorystyczna hierarchia . Jeżeli liczba taktów sekcji jest podzielna przez liczbę linii tekstu ($\text{bars} \% n === 0$), algorytm zawsze wybiera bezwzględnie równomierną warstwę Layer A, ignorując wagę tekstu, chyba że flaga `opts.forceWeights` zostanie wymuszona . Warstwa F jest brana pod uwagę dopiero wtedy, gdy bazowa liczba taktów na linię wynosi $base \le 1$ .

Niezwykle istotnym przypadkiem brzegowym są krótkie puenty wokalne . Gdy po kilku długich, wielosłowowych wierszach występuje krótka linia zamykająca (np. "Tak" lub "Ooh"), wartość $W_{\text{last}} / \text{avg}(W)$ spada poniżej progu $0.55$ . Sytuacja ta powoduje przełączenie algorytmu w tryb Layer F oraz ustawienie flagi `approximate: true`, co stanowi oczekiwane zachowanie systemu .

### 4. Specyfika Trybu Both i Agregacja Błędów

Przetwarzanie w trybie `both` realizuje sekwencyjną kompozycję dwóch niezależnych przejść . W pierwszej kolejności wywoływana jest funkcja `placeTekstFromForma(project, scope)` . Jeżeli etap układania tekstu zakończy się niepowodzeniem, algorytm przerywa pracę i zwraca wynik tekstu . 

W przypadku sukcesu zmodyfikowany obiekt projektu (`vocals.project`) przekazywany jest do funkcji `placeAkordyFromForma(vocals.project, scope)` . Sytuacja, w której tekst zostanie pomyślnie rozłożony, ale etap układania akordów zwróci błąd, jest obsługiwana w sposób specyficzny: funkcja zwraca wynik ze stanem `ok: false`, ale w polu `project` zachowuje projekt ze zmienionym tekstem . Komunikat błędu przybiera wówczas postać skonsolidowaną: `Tekst OK, ale ${chords.message}` .

Flaga przybliżenia `approximate` dla trybu `both` wyliczana jest jako alternatywa logiczna wyników obu etapów: `Boolean(vocals.approximate |

| chords.approximate)` .

### 5. Integracja z Uszczelnianiem Długości Akordów (`sealAkordyLengths`)

Po zakończeniu wyliczania nowych pozycji `startTicks` dla klipów akordowych funkcja `placeAkordyFromForma` przekazuje przetworzoną tablicę do funkcji `sealAkordyLengths` pochodzącej z modułu `./ug-import.js` . Zadaniem `sealAkordyLengths` jest posortowanie klipów i przeliczenie ich właściwości `lengthTicks` tak, aby każdy akord trwał dokładnie do momentu rozpoczęcia kolejnego symbolu na osi czasu .

Z punktu widzenia strategii testów pomocnicza funkcja `sealAkordyLengths` posiada dedykowane testy jednostkowe w pliku `ug-import.test.ts` . W zestawie `wand.test.ts` nie należy powielać testów jednostkowych samej logiki uszczelniania . Testy Różdżki powinny weryfikować integrację jako asercje stanu końcowego — sprawdzając, czy po przełożeniu akordów na nową strukturę `Forma` długość każdego akordu prawidłowo sięga do onsetu następnego elementu .

### 6. Analiza Ścieżek Fail-Soft i Bezpieczeństwo Wykonania

Projekt modułu `wand.ts` w pełni realizuje wzorzec bezpiecznej obsługi błędów (fail-soft) . Funkcja `placeContentFromForma` nie zgłasza wyjątków (`throw`) podczas operowania na niekompletnych, pustych lub niezgodnych strukturalnie obiektach domenowych . Wszelkie odchylenia od stanu prawidłowego są przechwytywane przez instrukcje strażnicze (guard clauses) i zwracane jako `WandResult` z flagą `ok: false` oraz precyzyjnym komunikatem biznesowym w języku polskim .

Potencjalnym punktem awarii z punktu widzenia wykonywania kodu mogłyby być jedynie nieprawidłowe wartości w mapie metrum lub metrum domyślnym ($PPQ \le 0$ lub numerator/denominator $\le 0$), które wywołałyby wyjątek `RangeError` w dziedzinowych funkcjach pomocniczych pliku `time.ts` . Wszystkie przypadki użycia biznesowego na poziomie warstwy Różdżki są w pełni chronione .

---

## Specyfikacja Brakujących Testów Jednostkowych

Dla zapewnienia pełnego pokrycia kodu modułu `wand.ts` należy rozbudować plik `wand.test.ts` o poniższe zestawy testowe.

### 1. Test Heurystyki Krótkiej Puenty (Layer F)
Test weryfikuje aktywację rozkładu ważonego przy wystąpieniu krótkiej linii na końcu sekcji, gdzie liczba taktów nie jest podzielna przez liczbę linii.

```typescript
it("aktywuje Layer F i oznacza approximate dla krótkiej puenty wokalnej", () => {
  // Sekcja 5 taktów, 3 linie tekstu (5 % 3 !== 0 -> brak Layer A)
  // Wagi: "Pierwszy bardzo długi wiersz zwrotki" (5 słów), "Drugi równie długi wiersz" (4 słowa), "Ooh" (3 znaki)
  // Wagi: [5, 4, 3], avg = 4.0. Last / avg = 3 / 4.0 = 0.75 -> aktywacja przez ratio max/min lub short last
  const p = sectionProject(5, [
    "Pierwsza bardzo długa linia tekstu zwrotki",
    "Druga równie długa linia śpiewana",
    "Tak"
  ]);
  const result = placeContentFromForma(p, "tekst");
  expect(result.ok).toBe(true);
  expect(result.approximate).toBe(true);
  expect(result.message).toMatch(/przybliżonych/);
});
```

### 2. Test Redystrybucji Zerowych Przydziałów w Podsekcjach
Test sprawdza, czy algorytm poprawnie odbiera klip z obszernej podsekcji i przekazuje go do bardzo krótkiego przedziału Content, unikając pozostawienia przydziału zerowego.

```typescript
it("redystrybuuje klipy do krótkich podsekcji przy zerowym przydziale początkowym", () => {
  // Sekcja 10 taktów z podsekcjami: Content 9.5 taktu, Gap 0.2 taktu, Content 0.3 taktu
  // 2 linie tekstu: podział proporcjonalny daje przydział [2, 0]. Algorytm musi skorygować na [1, 1].
  const p = sectionProject(10, ["Linia 1", "Linia 2"], {
    subsections: [Math.floor(9.5 * BAR), Math.floor(9.7 * BAR)]
  });
  const result = placeContentFromForma(p, "tekst");
  expect(result.ok).toBe(true);
  expect(result.placed).toBe(2);
  const starts = result.project.tekst.clips.map((c) => c.startTicks).sort((a, b) => a - b);
  expect(starts[0]).toBe(0);
  expect(starts[1]).toBeGreaterThanOrEqual(Math.floor(9.7 * BAR));
});
```

### 3. Test Częściowego Przypisania Akordów via `sourceLineId`
Test weryfikuje zachowanie algorytmu w sytuacji, gdy tylko część akordów posiada przypisanie do identyfikatorów wersów tekstu.

```typescript
it("prawidłowo obsługuje częściowe powiązanie akordów via sourceLineId", () => {
  let p = sectionProject(4, []);
  const intro = p.forma.clips.find((c) => c.name === "Intro")!;
  p = {
    ...p,
    tekst: {
      clips: [
        { id: "line-1", startTicks: intro.startTicks, lengthTicks: BAR, text: "Wers pierwszy", sourceSection: "Intro" },
        { id: "line-2", startTicks: intro.startTicks + 2 * BAR, lengthTicks: BAR, text: "Wers drugi", sourceSection: "Intro" }
      ]
    },
    akordy: {
      clips: [
        { id: "a1", startTicks: 0, lengthTicks: BAR, symbol: "C", sourceLineId: "line-1" }
      ]
    }
  };
  const result = placeContentFromForma(p, "akordy");
  expect(result.ok).toBe(true);
  expect(result.placed).toBe(1);
  expect(result.project.akordy.clips[0]!.startTicks).toBe(intro.startTicks);
});
```

### 4. Test Zachowania Projektu w Trybie Both przy Błędzie Akordów
Test weryfikuje, czy w przypadku niepowodzenia na etapie akordów projekt zachowuje pomyślnie zmodyfikowaną ścieżkę tekstu.

```typescript
it("w trybie both zachowuje zmieniony Tekst gdy etap Akordów zwróci błąd", () => {
  let p = sectionProject(4, ["Wers A", "Wers B"]);
  p = { ...p, akordy: { clips: [] } }; // Pusta ścieżka akordów wywoła błąd w 2. kroku
  const result = placeContentFromForma(p, "both");
  expect(result.ok).toBe(false);
  expect(result.message).toMatch(/Tekst OK, ale Brak clipów Akordów/);
  expect(result.project.tekst.clips[0]!.startTicks).toBe(0);
  expect(result.project.tekst.clips[1]!.startTicks).toBe(2 * BAR);
});
```

### 5. Testy Wynikowe dla `wandContentToForma`
Testy zapewniają pokrycie skrótowych wywołań pomocniczych dla trybów `"akordy"` oraz `"both"`.

```typescript
it("wandContentToForma obsługuje tryb akordy oraz both", () => {
  let p = sectionProject(4, ["Tekst 1", "Tekst 2"]);
  p = {
    ...p,
    akordy: {
      clips: [
        { id: "a1", startTicks: 0, lengthTicks: BAR, symbol: "Am" },
        { id: "a2", startTicks: 0, lengthTicks: BAR, symbol: "F" }
      ]
    }
  };
  const pChords = wandContentToForma(p, "akordy");
  expect(pChords.akordy.clips[1]!.startTicks).toBe(2 * BAR);

  const pBoth = wandContentToForma(p, "both");
  expect(pBoth.tekst.clips[1]!.startTicks).toBe(2 * BAR);
  expect(pBoth.akordy.clips[1]!.startTicks).toBe(2 * BAR);
});
```

---

## Propozycja Testów Bazujących na Właściwościach (Property-Based Tests)

Do weryfikacji stabilności algorytmów Różdżki w warunkach losowych długości sekcji, nieregularnych siatek taktowych i dowolnych konfiguracji tekstowych zaleca się wprowadzenie zestawu testów wykorzystujących bibliotekę `fast-check`.

### Inwarianty do Weryfikacji w PBT

1. **Niezmienność Struktury Forma**: Dla dowolnej losowej kombinacji sekcji i klipów obiekt `project.forma` pozostaje nienaruszony po wykonaniu operacji Różdżki .
2. **Monotoniczność Czasowa**: Pozycje `startTicks` wszystkich przetworzonych klipów tworzą ciąg niemalejący i nie wykraczają poza granice przydzielonej sekcji .
3. **Ciągłość Akordów**: Wyliczone długości `lengthTicks` klipów akordowych idealnie dolegają do początku kolejnych symboli akordów .
4. **Fail-Soft Safety**: Wywołanie `placeContentFromForma` na dowolnym prawidlowym obiekcie typu `Project` nigdy nie zgłasza nieobsłużonego wyjątku .

### Kod Testu PBT (`wand.pbt.test.ts`)

```typescript
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { placeContentFromForma } from "./wand.js";
import { createProjectV5Seed } from "./project-seed.js";
import { DEFAULT_PPQ, ticksPerBar } from "./time.js";

const BAR = ticksPerBar({ numerator: 4, denominator: 4 }, DEFAULT_PPQ);

describe("Różdżka — Property-Based Tests (fast-check)", () => {
  it("zachowuje niezmienniki przestrzenne dla losowych długości sekcji i liczby linii", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 32 }),
        fc.array(fc.string({ minLength: 1, maxLength: 80 }), { minLength: 1, maxLength: 32 }),
        (bars, lines) => {
          let p = createProjectV5Seed("pbt-1", "PBT Song", "2026-01-01T00:00:00.000Z");
          const intro = p.forma.clips[0]!;
          p = {
            ...p,
            forma: {
              clips: [{ ...intro, lengthTicks: bars * BAR }]
            },
            tekst: {
              clips: lines.map((text, i) => ({
                id: `t-${i}`,
                startTicks: 0,
                lengthTicks: BAR,
                text
              }))
            }
          };

          const formaBefore = JSON.stringify(p.forma);
          const result = placeContentFromForma(p, "tekst");

          if (result.ok) {
            // Inwariant 1: Bezpieczeństwo struktury Forma
            expect(JSON.stringify(result.project.forma)).toBe(formaBefore);
            expect(result.placed).toBe(lines.length);

            // Inwariant 2: Monotoniczność i zachowanie granic
            const starts = result.project.tekst.clips.map((c) => c.startTicks);
            for (let i = 0; i < starts.length; i++) {
              expect(starts[i]).toBeGreaterThanOrEqual(0);
              expect(starts[i]).toBeLessThan(bars * BAR);
              if (i > 0) {
                expect(starts[i]).toBeGreaterThanOrEqual(starts[i - 1]!);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

---

## Ocena Potrzeby Atrap oraz Ryzyka Migania Testów

Logika modułu `wand.ts` oraz wszystkie wywoływane przez nią funkcje pomocnicze mają charakter w pełni czysty (pure functions) . W konsekwencji tworzenie atrap (mocków) obiektów systemowych, zegarów czy modułów zewnętrznych jest zbędne . Wszystkie scenariusze testowe powinny być realizowane w oparciu o czyste struktury danych inicjalizowane przy użyciu zautomatyzowanej fabryki `createProjectV5Seed` .

Ryzyko wystąpienia testów niestabilnych (flaky tests) wynosi 0%. Wyliczenia pozycji w domenie StageSync opierają się na matematyce dyskretnej (całkowitoliczbowe wartości `ticks`), wykluczając operacje niedeterministyczne, losowość oraz zależności od czasu rzeczywistego (`Date.now`) . Zapewnia to pełną powtarzalność wyników w każdym środowisku wykonawczym i w potokach CI/CD.

---
Powered by [AI Exporter](https://saveai.net)
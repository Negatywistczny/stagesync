> From: https://gemini.google.com/app/7f5eba2c90be7b3e

# you asked

message time: 2026-07-27 14:23:42

Jesteś ekspertem od testów serwerowych StageSync. Przeanalizuj [`apps/server/src/ug/ug-fetch.ts`](../../../../apps/server/src/ug/ug-fetch.ts) — pobieranie zakładek Ultimate Guitar (HTML → js-store JSON → ChordPro-lite).

CEL ANALIZY
Zwiększyć pokrycie parserów HTML/JSON, normalizacji metadanych, wyszukiwania i ścieżek błędów sieciowych w `fetchUgTab` / `searchUgChords` / `resolveUgTabUrl`.

PYTANIA BADAWCZE

1. Co jest już pokryte w [`ug-fetch.test.ts`](../../../../apps/server/src/ug/ug-fetch.test.ts) (pure helpers) vs co wymaga mock `fetch` (async I/O)?
2. Jak testować: Cloudflare challenge, 403, timeout, 404, brak js-store, nieprawidłowy JSON, typ tab ≠ Chords?
3. Czy `parseUgSearchResults` + `rankSearchHits` + filtr artist wymagają fixture HTML search?
4. Jak mockować `fetchUgHtml` / `AbortSignal.timeout` deterministycznie w Vitest?
5. Integracja z `routes/import.ts` i `cleanUgTabContent` ze shared — które testy należy w routerze, a które tutaj?
6. Czy warto dodać snapshot/fixture dla reverse attribute order (`data-content` przed `class`)?

KONTEKST

- Server-side fetch (CORS/Cloudflare); admin tool, nie mass scraping.
- Shared: `decodeHtmlEntities`, `cleanUgTabContent`, `importUgText`.
- Vitest; fixture [`ug-tab-sample.json`](../../../../apps/server/src/ug/fixtures/ug-tab-sample.json) już istnieje.

OCZEKIWANY OUTPUT

1. Priorytetowa lista testów unit (pure) + integration (mock fetch).
2. Propozycje fixture’ów HTML (minimalne stringi inline vs pliki).
3. Mocki: global `fetch`, timer dla timeout.
4. Ryzyka flaky: brak (przy mock fetch) — wskazać testy do izolacji od sieci.
5. Mapa uncovered branches → test case.

---

# gemini response

Oto ułożony plan działania. Jeśli chcesz go zmienić, poinformuj mnie o tym.
http://googleusercontent.com/deep_research_confirmation_content/0

---

# you asked

message time: 2026-07-27 14:23:59

Zacznij wyszukiwanie

---

# gemini response

I've completed your research. Feel free to ask me follow-up questions or request changes.

Plan Testów Ultimate Guitar

# Analiza Pokrycia Testowego i Strategia Testowania Modułu ug-fetch w Środowisku StageSync

Moduł pobierania i przetwarzania zakładek Ultimate Guitar umieszczony w pliku [`apps/server/src/ug/ug-fetch.ts`](../../../../apps/server/src/ug/ug-fetch.ts) pełni kluczową rolę w procesie zasilania systemu StageSync w metadane oraz struktury akordowo-tekstowe . Ze względu na wykonywanie operacji po stronie serwera w celu obejścia ograniczeń CORS oraz mechanizmów zabezpieczających Cloudflare, stabilność parsera HTML/JSON oraz odporność na błędy sieciowe ma bezpośredni wpływ na niezawodność całej aplikacji .

Obecny zestaw testów w pliku [`ug-fetch.test.ts`](../../../../apps/server/src/ug/ug-fetch.test.ts) weryfikuje czyste funkcje pomocnicze oraz podstawową ścieżkę sukcesu z użyciem statycznego pliku fixture [`ug-tab-sample.json`](../../../../apps/server/src/ug/fixtures/ug-tab-sample.json) . Jednak złożona logika decyzyjna, reakcja na błędne odpowiedzi HTTP, detekcja wyzwań Cloudflare, automatyczne wyznaczanie alternatywnych adresów URL oraz asynchroniczne operacje wejścia/wyjścia pozostają niepokryte .

---

## Architektura i Podział Odpowiedzialności Testowej

W architekturze systemu StageSync proces importu z Ultimate Guitar jest rozproszony pomiędzy trzy główne warstwy: logikę pobierania serwerowego ([`ug-fetch.ts`](../../../../apps/server/src/ug/ug-fetch.ts)), router HTTP Express (`routes/import.ts`) oraz moduły wspólnej logiki dziedzinowej (`@stagesync/shared`) . Aby zapewnić czytelność i uniknąć powielania asercji, konieczne jest precyzyjne rozgraniczenie zakresów testowania.

Logika serwerowa w [`ug-fetch.ts`](../../../../apps/server/src/ug/ug-fetch.ts) odpowiada za komunikację HTTP z serwisem Ultimate Guitar, wyciąganie surowego ciągu JSON z kontenera `js-store`, normalizację metadanych oraz wstępne czyszczenie zawartości . Router w `routes/import.ts` odpowiada wyłącznie za walidację schematów Zod żądań przychodzących, przekazywanie parametrów do [`ug-fetch.ts`](../../../../apps/server/src/ug/ug-fetch.ts) oraz mapowanie zgłoszonych błędów na odpowiednie kody statusu HTTP . Z kolei moduł `@stagesync/shared` realizuje czyszczenie znaczników wiki, dekodowanie encji HTML oraz konwersję tekstu na sekcje i klipy osi czasu .

| Obszar Funkcjonalny            | Zakres Testowy w [`ug-fetch.test.ts`](../../../../apps/server/src/ug/ug-fetch.test.ts)              | Zakres Testowy w `routes/import.test.ts`                                                        | Zakres Testowy w `@stagesync/shared`                                                        |
| :----------------------------- | :-------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| **Parsowanie HTML i JSON**     | Wyciąganie `js-store`, obsługa odwrotnej kolejności atrybutów XML/HTML, walidacja błędnego JSON-a . | Brak (router zakłada poprawność zwracanych danych z `fetchUgTab`) .                             | Entity decoding (`decodeHtmlEntities`), czyszczenie znaczników wiki (`cleanUgTabContent`) . |
| **Normalizacja Metadanych**    | Hierarchiczne mapowanie tonacji, tempa, metrum, stroju instrumentu oraz identyfikatorów .           | Przekazywanie uzyskanych metadanych w odpowiedzi JSON .                                         | Kanonizacja symboli akordów (`canonicalizePolishH`, `toLiteralStorage`) .                   |
| **Obsługa Sieci i Pętla Prób** | Timeouty, statusy 403, Cloudflare challenge, pętla fallback search w `resolveUgTabUrl` .            | Mapowanie zgłoszonych błędów sieciowych na statusy HTTP (np. błąd Cloudflare/403 -> HTTP 502) . | Brak.                                                                                       |
| **Walidacja Typu Tabulatura**  | Weryfikacja typu zakładki (`Chords` vs `Pro`/`Guitar Pro`/`Bass`) i rzucenie wyjątku .              | Walidacja schema Zod żądania wejściowego (`UgFetchBodySchema`, `UgSearchBodySchema`) .          | Podział na sekcje Forma, przeliczanie miar i generowanie klipów (`importUgText`) .          |

Aanaliza istniejącego pliku [`ug-fetch.test.ts`](../../../../apps/server/src/ug/ug-fetch.test.ts) wykazuje, że pokryte są funkcje bezstanowe, takie jak `isValidUgTabUrl`, `extractTabId`, `parseUgUrlSlug`, `extractDataContentJson` (dla standardowej kolejności atrybutów), `hasUgTabPayload`, `isCloudflareChallenge`, `isUgNotFound` oraz podstawowy przypadek `normalizeUgMetadata` i `buildFetchResult` . Wszystkie funkcje asynchroniczne (`fetchUgHtml`, `resolveUgTabUrl`, `fetchUgTab`, `searchUgChords`) oraz ścieżki obsługi błędów sieciowych wymagają wprowadzenia atrapy (mocka) globalnej funkcji `fetch` .

---

## Analiza Pytań Badawczych i Strategia Testowania

### Scenariusze Błędów i Sytuacji Awaryjnych

Testowanie reakcji aplikacji na niekorzystne odpowiedzi serwera Ultimate Guitar wymaga symulacji zróżnicowanych nagłówków HTTP oraz treści odpowiedzi HTML :

- **Wyzwanie Cloudflare i Status 403**: Wyzwania Cloudflare objawiają się kodem HTTP 403 lub kodem 200 z treścią HTML zawierającą frazy `Just a moment...` bądź `cf-browser-verification` . Mock `fetch` powinien zwracać takie odpowiedzi, aby weryfikować, czy `fetchUgTab` oraz `searchUgChords` zgłaszają wyjątek o treści `"Ultimate Guitar zablokował żądanie. Spróbuj ponownie później."` .
- **Przekroczenie Czasu Oczekiwania (Timeout)**: Kod produkcyjny stosuje `AbortSignal.timeout(20000)` . W testach należy symulować odrzucenie obietnicy z obiektem `DOMException` o nazwie `TimeoutError` lub `AbortError` . Oczekuje się przechwycenia błędu i zgłoszenia komunikatu `"Przekroczono limit czasu pobierania strony UG."` .
- **Błąd 404, Brak js-store i Nieprawidłowy JSON**: W przypadku statusu 404 lub braku elementu `js-store`, funkcja `resolveUgTabUrl` wyciąga slug piosenki i próbuje odnaleźć alternatywny adres URL przez wyszukiwarkę . Jeśli alternatywa nie zostanie znaleziona, system wyrzuca komunikat `"Nie znaleziono zakładki UG pod tym linkiem..."` . W przypadku uszkodzonego ciągu JSON w atrybucie `data-content`, funkcja `JSON.parse` zgłasza błąd, który powinien zostać zweryfikowany jako awaria struktury danych .
- **Typ Tabulatury Inny niż Chords**: Jeśli pobrana zakładka posiada typ np. `"Guitar Pro"` lub `"Bass"`, funkcja `buildFetchResult` wyrzuca wyjątek `"Obsługiwane są tylko zakładki typu Chords..."` .

### Wyszukiwanie, Filtrowanie i Ranking Wyników

Funkcje `parseUgSearchResults` oraz `rankSearchHits` są czystymi funkcjami operującymi na sparsowanym obiekcie JSON . Do ich przetestowania nie jest wymagany pełny plik fixture HTML wyszukiwania. Wystarczy przygotować minimalny obiekt JSON reprezentujący strukturę `store.page.data.results` (lub użyć dedykowanego pliku fixture JSON `ug-search-sample.json`) . Pozwala to na szybkie i bezpośrednie przetestowanie odrzucania wpisów typu `Pro` oraz reklam `marketing_type`, filtrowania po nazwie wykonawcy bez względu na wielkość liter oraz sortowania malejącego według liczby głosów `votes` .

### Deterministyczne Mockowanie fetch oraz AbortSignal.timeout

W środowisku Vitest najlepszą praktyką jest zastąpienie globalnej funkcji `fetch` za pomocą `vi.stubGlobal("fetch", vi.fn())` . Aby przetestować działanie `AbortSignal.timeout` w sposób deterministyczny i bez wprowadzania opóźnień czasowych, atrapa `fetch` powinna natychmiastowo odrzucać obietnicę z odpowiednim błędem .

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUgTab, searchUgChords } from "./ug-fetch.js";

describe("ug-fetch integration with mocked fetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("handles AbortSignal timeout deterministically", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    const timeoutError = new DOMException("Timeout", "TimeoutError");
    fetchMock.mockRejectedValueOnce(timeoutError);

    await expect(
      fetchUgTab(
        "https://tabs.ultimate-guitar.com/tab/artist/song-chords-12345",
      ),
    ).rejects.toThrow("Przekroczono limit czasu pobierania strony UG.");
  });

  it("handles Cloudflare challenge response", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response("<html><body>cf-browser-verification</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    await expect(
      fetchUgTab(
        "https://tabs.ultimate-guitar.com/tab/artist/song-chords-12345",
      ),
    ).rejects.toThrow(
      "Ultimate Guitar zablokował żądanie. Spróbuj ponownie później.",
    );
  });
});
```

Poniższy fragment ilustruje testowanie pętli fallback w `resolveUgTabUrl`, gdy pierwszy URL zwraca błąd 404, a wyszukiwarka odnajduje działający zamiennik :

```typescript
it("resolves direct 404 URL by falling back to search", async () => {
  const fetchMock = vi.mocked(globalThis.fetch);

  // 1. Pierwsze żądanie: 404 Not Found
  fetchMock.mockResolvedValueOnce(
    new Response("<html><body>Oops! Couldn't find that page</body></html>", {
      status: 404,
    }),
  );

  // 2. Drugie żądanie: Wyniki wyszukiwania UG dla wyciągniętego sluga
  const searchJson = {
    store: {
      page: {
        data: {
          results: [
            {
              id: 999,
              song_name: "Test Song",
              artist_name: "Test Artist",
              type: "Chords",
              votes: 50,
              tab_url:
                "https://tabs.ultimate-guitar.com/tab/test-artist/test-song-chords-999",
            },
          ],
        },
      },
    },
  };
  const searchHtml = `<div class="js-store" data-content="${encodeURIComponent(JSON.stringify(searchJson))}"></div>`;
  fetchMock.mockResolvedValueOnce(new Response(searchHtml, { status: 200 }));

  // 3. Trzecie żądanie: Pobranie poprawnej zakładki pod nowym adresem
  const tabJson = {
    store: {
      page: {
        data: {
          tab: {
            id: 999,
            song_name: "Test Song",
            artist_name: "Test Artist",
            type: "Chords",
          },
          tab_view: { wiki_tab: { content: "[Verse]\n[Am]Hello" } },
        },
      },
    },
  };
  const tabHtml = `<div class="js-store" data-content="${encodeURIComponent(JSON.stringify(tabJson))}"></div>`;
  fetchMock.mockResolvedValueOnce(new Response(tabHtml, { status: 200 }));

  const result = await fetchUgTab(
    "https://tabs.ultimate-guitar.com/tab/test-artist/test-song-chords-111",
  );
  expect(result.metadata.tabId).toBe(999);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
```

### Testowanie Odwrotnej Kolejności Atrybutów w HTML

Funkcja `extractDataContentJson` zawiera dwa niezależne wyrażenia regularne: pierwsze dopasowuje `class="...js-store..."` występujące przed `data-content="..."`, natomiast drugie obsługuje sytuację odwrotną, gdzie `data-content="..."` znajduje się przed `class="...js-store..."` . Zastosowanie jednolinijkowego ciągu fixture `<div data-content="..." class="js-store"></div>` w teście jednostkowym jest w pełni uzasadnione, ponieważ pozwala weryfikować drugą gałąź regexu bez konieczności tworzenia ciężkich plików zewnętrznych .

---

## Mapa Niepokrytych Gałęzi Kodowych

Poniższa tabela przedstawia zestawienie gałęzi instrukcji warunkowych w [`apps/server/src/ug/ug-fetch.ts`](../../../../apps/server/src/ug/ug-fetch.ts), które nie posiadają bezpośrednich asercji w istniejącym zestawie testów .

| ID Gałęzi | Funkcja / Obszar         | Warunek w Kodzie Source                                                              | Przyczyna Braku Pokrycia                                                 | Oczekiwany Test Case                                                                      |
| :-------- | :----------------------- | :----------------------------------------------------------------------------------- | :----------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| **BR-01** | `extractDataContentJson` | Drugi regex: `data-content="..."` przed `class="js-store"` .                         | Testowano tylko standardową kolejność atrybutów HTML .                   | Parsowanie prawidlowego JSON z elementu `<div data-content="..." class="js-store">` .     |
| **BR-02** | `extractDataContentJson` | Brak dopasowania obu regexów (rzucenie błędu ze wskazaniem zmiany struktury) .       | Brak testu przekazującego prawidłowy kod HTML bez znacznika `js-store` . | Wywołanie z kodem HTML bez kontenera -> oczekiwany wyjątek `"Nie znaleziono danych..."` . |
| **BR-03** | `getPageData`            | Parametr `raw` nie jest obiektem lub `store.page.data` jest nieobecne .              | Testowano tylko poprawny obiekt fixture .                                | Przekazanie `null`, `undefined`, liczby lub `{}` -> oczekiwany zwrot `null` .             |
| **BR-04** | `normalizeUgMetadata`    | Strój (`tuningObj`) przekazany jako obiekt z polem `name` bez pola `value` .         | Fixture zawierał wyłącznie pole `value` .                                | Metadane z `tuning: { name: "drop d" }` -> poprawna ekstrakcja `"drop d"` .               |
| **BR-05** | `normalizeUgMetadata`    | Alternatywne klucze tonacji (`tonality_name`, `tab.tonality`, `tab_view.tonality`) . | Testowano tylko `meta.tonality` .                                        | Sprawdzenie kolejności odczytu tonacji z pól zastępczych .                                |
| **BR-06** | `normalizeUgMetadata`    | Klucze zastępcze dla tempa (`bpm`) oraz metrum (`signature`, `meter`, `time`) .      | Testowano tylko `tempo` i `time_signature` .                             | Podanie metadanych z `bpm: 140` oraz `meter: "3/4"` -> poprawna konwersja .               |
| **BR-07** | `normalizeUgMetadata`    | Identyfikator zakładki przekazany jako `string` lub pobierany z URL .                | Testowano tylko `tab.id` jako `number` .                                 | Podanie `tab.id: "1086983"` oraz odczyt ID ze slug URL przy braku pola `tab.id` .         |
| **BR-08** | `getWikiTabContent`      | Pole `wiki_tab.content` jest puste lub nie jest ciągiem znaków .                     | Testowano tylko obecność niepustego tekstu .                             | Puste pole content -> rzucenie wyjątku `"Brak treści zakładki..."` .                      |
| **BR-09** | `buildFetchResult`       | Wynik czyszczenia przez `cleanUgTabContent` zwraca pusty tekst .                     | W testach przekazywano zawsze poprawny tekst .                           | Przekazanie tekstu zawierającego tylko odrzucone linie -> rzucenie błędu .                |
| **BR-10** | `rankSearchHits`         | Preferowanie typów `Chords` oraz sortowanie po liczbie głosów `votes` .              | Funkcja nie posiadała osobnego testu jednostkowego .                     | Przekazanie wyników mieszanych (`Pro`, `Chords`) -> weryfikacja kolejności .              |
| **BR-11** | `resolveUgTabUrl`        | Błąd 404 dla podanego URL -> wyciągnięcie sluga -> wyszukanie alternatywy .          | Logika asynchroniczna nie była wywoływana .                              | Odpowiedź 404 dla URL -> zapytanie do wyszukiwarki -> pobranie nowego URL .               |
| **BR-12** | `fetchUgTab`             | Obsługa błędów sieciowych `TimeoutError` oraz `AbortError` .                         | Brak mockowania `fetch` z błędem czasu .                                 | Symulacja odrzucenia obietnicy -> błąd `"Przekroczono limit czasu..."` .                  |
| **BR-13** | `fetchUgTab`             | Wykrycie blokady Cloudflare (status 403 lub treść `isCloudflareChallenge`) .         | Sprawdzano jedynie pomocnik `isCloudflareChallenge` .                    | Zwrot HTML z `cf-browser-verification` -> błąd blokady Ultimate Guitar .                  |
| **BR-14** | `searchUgChords`         | Puste zapytanie wyszukiwania (pusty string lub same spacje) .                        | Funkcja nie była wywoływana w testach .                                  | Wywołanie `searchUgChords("")` -> zwrot `[]` bez żądania HTTP .                           |

---

## Priorytetyzowana Lista Testów i Propozycje Fixture'ów

### Priorytetyzacja Przypadków Testowych

1. **Testy Jednostkowe (Pure Functions - P1)**:
   - Wyciąganie JSON z HTML przy odwrotnej kolejności atrybutów (`data-content` przed `class`) .
   - Rzucanie błędu w `extractDataContentJson` przy braku znacznika `js-store` .
   - Odrzucanie tabulatur o typie innym niż `Chords` w `buildFetchResult` .
   - Awaria `buildFetchResult` po wyczyszczeniu tekstu do pustego ciągu znaków .
   - Puste zapytanie w `searchUgChords` zwracające natychmiastowo pustą tablicę .

2. **Testy Integracyjne z Mockiem fetch (Async I/O - P1/P2)**:
   - Przekroczenie limitu czasu połączenia w `fetchUgTab` oraz `searchUgChords` (`TimeoutError`) .
   - Obsługa wyzwań Cloudflare oraz statusu 403 .
   - Pętla ponawiania żądania w `resolveUgTabUrl` po napotkaniu błędu 404 .
   - Sortowanie i filtrowanie wyników wyszukiwania w `searchUgChords` .

3. **Testy Uzupełniające Metadane (Pure Functions - P3)**:
   - Mapowanie stroju z obiektu `{ name: "drop d" }` w `normalizeUgMetadata` .
   - Pobieranie tonacji, tempa oraz metrum z alternatywnych pól kluczy .
   - Obsługa braku danych w `getPageData` .

### Propozycje Fixture'ów HTML i JSON

Dla zachowania przejrzystości i szybkości wykonywania testów zaleca się podział fixture'ów na dwie kategorie:

- **Pliki Statyczne (Katalog `fixtures/`)**:
  - [`ug-tab-sample.json`](../../../../apps/server/src/ug/fixtures/ug-tab-sample.json): Pełny plik JSON używany do testowania prawidłowego odczytu metadanych i zawartości akordów (już istnieje w projekcie) .
  - `ug-search-sample.json`: Plik JSON zawierający wymieszane wyniki wyszukiwania (`Chords`, `Pro`, wpisy z `marketing_type`, zróżnicowana liczba głosów) do weryfikacji funkcji `parseUgSearchResults` i `rankSearchHits` .

- **Minimalne Stringi Inline (Bezpośrednio w Kodzie Testu)**:
  - String z odwrotną kolejnością atrybutów: `<div data-content="{&quot;store&quot;:{}}" class="js-store"></div>` .
  - String wyzwania Cloudflare: `<html><body>cf-browser-verification</body></html>` .
  - String błędu 404: `<html><body>Oops! Couldn't find that page</body></html>` .

---

## Izolacja Środowiska i Wyeliminowanie Ryzyka Flaky Tests

Wprowadzenie atrapy globalnej funkcji `fetch` całkowicie eliminuje niestabilność testów wynikającą z czynników zewnętrznych, takich jak opóźnienia sieciowe czy chwilowe blokady IP ze strony serwisu Ultimate Guitar . W celu zapewnienia pełnej izolacji pomiędzy poszczególnymi przypisami testowymi należy stosować następujące zasady:

- Bezwzględne czyszczenie i przywracanie oryginalnych funkcji globalnych w haczyku `afterEach` poprzez `vi.unstubAllGlobals()` oraz `vi.restoreAllMocks()` .
- Unikanie rzeczywistego oczekiwania na upływ czasu poprzez natychmiastowe odrzucanie obietnic w atrapach dla testów przekroczenia limitu czasu (timeout) .
- Brak zależności pomiędzy poszczególnymi przypadkami testowymi – każdy test musi samodzielnie konfigurować zachowanie atrapy `fetch` dla swoich potrzeb .

---

Powered by [AI Exporter](https://saveai.net)

> From: https://gemini.google.com/app/8ad3bd3ca0754bd0

# you asked

message time: 2026-07-27 14:26:29

Jesteś ekspertem od testów integracji Desktop StageSync. Przeanalizuj `apps/web/src/lib/desktopFileMenu.ts` — menu Plik Tauri (create/save-as/import/export) z delegacją do `libraryApi`.

CEL ANALIZY
`desktopFileMenu.ts` ma minimalne pokrycie (tylko `currentTimelineProjectId` w `desktopMenuEvents.test.ts`). Zaproponuj pełną strategię testów dla async flows.

PYTANIA BADAWCZE
1. Jak mockować `createProject`, `fetchProject`, `putProject`, `importLibraryPack`, `exportLibraryPack`?
2. `saveProjectAs`: optimistic lock `updatedAt`, zachowanie `midiProgramId` — scenariusze błędów?
3. `importLibraryFile`: limit 16MB, ZIP rejection (`looksLikeZipBytes`), invalid JSON — testy?
4. `downloadLibraryExport`: mock `URL.createObjectURL`, anchor click — jsdom/happy-dom?
5. `listTemplateIds`: filtrowanie `isTemplate` — unit z mock fetchLibrary?
6. Integracja z `DesktopMenuBridge.tsx` — co testować w komponencie vs w lib?

KONTEKST
- Tauri shell; web lib musi działać też w przeglądarce (fetch API).
- Shared: `looksLikeZipBytes`, `ZIP_IMPORT_UNSUPPORTED_PL`.
- Vitest; wzorzec mock `vi.mock('./libraryApi.js')`.

OCZEKIWANY OUTPUT
1. Lista testów unit per exported function.
2. Mocki: libraryApi, pushRecentTimelineProject, DOM download, File/ArrayBuffer.
3. Ryzyka flaky: brak przy mockach; uwaga na global URL APIs.
4. Propozycja jednego pliku `desktopFileMenu.test.ts` vs rozszerzenie istniejącego.
5. Priorytety: import/save-as (data loss risk) > export > templates.

---

# gemini response

Oto ułożony plan działania. Jeśli chcesz go zmienić, poinformuj mnie o tym.
http://googleusercontent.com/deep_research_confirmation_content/0

---

# you asked

message time: 2026-07-27 14:30:11

Zacznij wyszukiwanie

---

# gemini response

I've completed your research. Feel free to ask me follow-up questions or request changes.

Strategia Testów Desktop File Menu

# Strategia Testów Integracyjnych dla Modułu desktopFileMenu w Aplikacji StageSync

W hybrydowej architekturze StageSync, łączącej powłokę desktopową Tauri z aplikacją internetową, moduł `desktopFileMenu.ts` pełni funkcję kluczowej warstwy pośredniczącej pomiędzy zdarzeniami systemowego menu a interfejsem programmatic API biblioteki `libraryApi.ts` . Odpowiada on za orkiestrację asynchronicznych operacji na projektach, walidację formatów i rozmiarów plików, obsługę specyficznych reguł biznesowych oraz interakcję z obiektami przeglądarkowego drzewa DOM . Dotychczasowy stan pokrycia testami kodu w tym obszarze ograniczał się wyłącznie do weryfikacji funkcji pomocniczej `currentTimelineProjectId` w pliku `desktopMenuEvents.test.ts` . Niniejszy raport przedstawia wyczerpującą strategię testowania asynchronicznych przepływów danych (async flows), precyzując mechanizmy mockowania, podział odpowiedzialności pomiędzy modułami oraz hierarchię priorytetów testowych.

---

## Analiza Architektoniczna i Zakres Odpowiedzialności `desktopFileMenu.ts`

Moduł `desktopFileMenu.ts` nie zawiera stanu lokalnego Reacta, lecz skupia w sobie czystą logikę orkiestracyjną i walidacyjną . Wykonuje on operacje asynchroniczne, które delegują zadania do zewnętrznych usług REST API (`libraryApi.ts`), zarządza historią otwartych projektów w pamięci lokalnej (`pushRecentTimelineProject`) oraz wykorzystuje niskopoziomowe interfejsy przeglądarki do obsługi strumieni binarnych i pobierania plików .

Moduł eksportuje sześć głównych funkcji, z których pięć realizuje operacje asynchroniczne podatne na błędy sieciowe, walidacyjne i sprzętowe . Funkcja `createSongAndOpen` tworzy nowy projekt w bibliotece i rejestruje go w pamięci podręcznej ostatnich projektów . Operacja `saveProjectAs` realizuje klonowanie istniejącego projektu z zachowaniem zasad spójności danych i optymistycznego blokowania wersji . Funkcja `listTemplateIds` odpowiada za pobieranie bazy projektów i wyodrębnianie z niej szablonów . Z kolei `importLibraryFile` przeprowadza inspekcję binarną bufora pliku, weryfikuje ograniczenia rozmiarowe i składniowe, po czym przekazuje spakowany obiekt do importu . Ostatnia z funkcji asynchronicznych, `downloadLibraryExport`, generuje eksport całej biblioteki do obiektu Blob i wyzwala jego pobranie poprzez dynamiczny element drzewa DOM .

---

## Strategia Mockowania Zależności i Środowiska Wykonawczego

Skuteczne testowanie jednostkowe i integracyjne modułu `desktopFileMenu.ts` wymaga odizolowania kodu od rzeczywiście działającego serwera HTTP oraz od fizycznego systemu plików . W środowisku Vitest podstawowym wzorcem mockowania jest zastąpienie modułów zależnych za pomocą fabryk `vi.mock()` .

Podstawową zależnością sieciową modułu jest `libraryApi.js` . Należy go zablokować na poziomie modułu Vitest poprzez przechwycenie wywołań funkcji `createProject`, `fetchProject`, `putProject`, `fetchLibrary`, `importLibraryPack` oraz `exportLibraryPack` . Zastosowanie `vi.mocked()` wewnątrz poszczególnych bloków testowych umożliwia precyzyjne sterowanie zwracanymi wartościami (obietnicami rozwiązanymi pozytywnie lub odrzuconymi z konkretnym błędem HTTP) oraz analizę argumentów przekazywanych do API . Drugą zależnością do zreplikowania jest moduł `lastTimelineProject.js`, a w szczególności funkcja `pushRecentTimelineProject`, która w środowisku produkcyjnym modyfikuje wpisy w `localStorage` . Zastąpienie jej prostym mockiem `vi.fn()` zapobiega niepożądanym skutkom ubocznym w pamięci przeglądarki i pozwala na weryfikację, czy identyfikator oraz nazwa projektu zostały prawidłowo dopisane do listy niedawno otwieranych pozycji .

Testowanie funkcji związanych z odczytem i zapisem plików wymaga symulacji obiektów `File`, `ArrayBuffer` oraz globalnych interfejsów DOM . Odczyt pliku przez `importLibraryFile` opiera się na metodzie `file.arrayBuffer()` . W środowisku testowym (jsdom lub happy-dom) obiekty `File` tworzy się poprzez przekazanie tablicy bajtów `Uint8Array` skonwertowanej do `ArrayBuffer` . Pozwala to na precyzyjne symulowanie nagłówków binarnych (magicznych bajtów) oraz przekraczania dopuszczalnych limitów pamięci . Z kolei funkcja `downloadLibraryExport` wchodzi w interakcję z globalnym obiektem `URL` (`createObjectURL`, `revokeObjectURL`) oraz dynamicznie generuje element kotwicy `<a>` w obiekcie `document` . Aby zapobiec błędom w środowisku testowym, należy przeszpiegować lub podmienić metody `URL.createObjectURL` i `URL.revokeObjectURL`, a także stworzyć atrapę elementu HTMLAnchorElement, przechwytującą ustawiane właściwości `href`, `download` oraz wywołanie metody `.click()` .

---

## Analiza Scenariuszy Testowych i Przepływów Asynchronicznych

### Zapewnienie Spójności Danych w Operacji Zapisz Jako (`saveProjectAs`)

Przepływ funkcji `saveProjectAs` składa się z czterech kroków: odczytania projektu źródłowego poprzez `fetchProject`, utworzenia nowego projektu o zadanej nazwie poprzez `createProject`, nadpisania danych w nowo utworzonym projekcie poprzez `putProject` oraz zarejestrowania go w historii ostatnich projektów .

Podczas zapisywania projektu pod nową nazwą występują dwa krytyczne punkty styku z logiką backendową: obsługa blokady optymistycznej oraz zapobieganie kolizjom programów MIDI . Próbując zaktualizować dane nowo utworzonego projektu za pomocą `putProject`, wymagane jest przekazanie znacznika czasu `updatedAt` . Sygnatura funkcji `putProject` wymusza dopasowanie tego znacznika do nowo wygenerowanej struktury . Jeżeli w obiekcie przesyłanym do `putProject` użyto by wartości `source.updatedAt` ze starego projektu zamiast `created.updatedAt` z nowego shella, backend odrzuciłby zapytanie z błędem konfliktu wersji (HTTP 409) . Test jednostkowy musi więc bezwzględnie sprawdzić, czy obiekt przekazany do `putProject` zawiera wartość `updatedAt` pochodzącą z odpowiedzi `createProject` .

Podobnie wygląda kwestia numeru programu MIDI (`midiProgramId`) . Serwer automatycznie przydziela unikalny numer PC do nowego projektu w momencie jego utworzenia w `createProject` . Przepływ w `saveProjectAs` musi nadpisać dane źródłowe wartością `created.midiProgramId`, zapobiegając nadpisaniu go wartością z projektu źródłowego, co doprowadziłoby do kolizji komunikatów MIDI na scenie .

Testy dla `saveProjectAs` muszą również pokrywać scenariusze błędowe, w tym sytuację, gdy podana nazwa projektu po obcięciu białych znaków jest pusta . W takim przypadku funkcja powinna natychmiast wyrzucić błąd z komunikatem `"Nazwa projektu jest wymagana"`, nie wykonując żadnych zapytań sieciowych . Dodatkowo należy przetestować zachowanie w przypadku odrzucenia obietnicy przez `fetchProject`, `createProject` lub `putProject`, upewniając się, że błąd jest prawidłowo propagowany do wywołującego, a funkcja `pushRecentTimelineProject` nie zostaje wywołana .

### Walidacja Binarna i Składniowa w Import pliku (`importLibraryFile`)

Funkcja `importLibraryFile` stanowi pierwszą linię obrony przed wprowadzeniem uszkodzonych lub niepoprawnych danych do bazy StageSync . Operacja ta wczytuje bufor pliku i poddaje go trzystopniowej weryfikacji przed przekazaniem ładunku do `importLibraryPack` .

Pierwszym sprawdzianem jest weryfikacja rozmiaru . Dopuszczalny limit wielkości pliku wynosi dokładnie 16 MB ($16 \times 1024 \times 1024 \text{ bajtów}$) . Testy muszą zweryfikować zachowanie dla bufora o rozmiarze brzegowym $16\,777\,216 \text{ B}$ (wykonanie poprawne) oraz $16\,777\,217 \text{ B}$ (odrzucenie z wyjątkiem `"Plik importu jest za duży (max 16 MB)."`).

Kolejnym etapem jest detekcja archiwów skompresowanych . Pomimo że aplikacja StageSync operuje na rozszerzeniach `.stagesync.json`, użytkownicy mogą próbować zaimportować surowe archiwa ZIP . Funkcja wykorzystuje pomocniczy moduł `looksLikeZipBytes`, sprawdzający nagłówki binarne (bajty `0x50 0x4B` odpowiadające sygnaturze `PK`) . Test musi potwierdzić, że w przypadku przekazania bufora zaczynającego się od sekwencji bajtów archiwum ZIP, funkcja przerywa pracę i zgłasza błąd z treścią stałej `ZIP_IMPORT_UNSUPPORTED_PL` .

Ostatnim etapem weryfikacji lokalnej jest dekodowanie tekstowe strumienia bajtów za pomocą `TextDecoder` oraz jego parsowanie przy użyciu `JSON.parse` . Jeśli struktura pliku nie stanowi poprawnego składniowo dokumentu JSON, blok `try...catch` musi przechwycić błąd parsera i wyrzucić sprecyzowany komunikat w języku polskim: `"Nie udało się odczytać JSON. Użyj .stagesync.json (v5) albo legacy database.json."` . Dopiero po przejściu wszystkich walidacji odkodowany obiekt jest przekazywany do `importLibraryPack(pack)`, a funkcja zwraca zagregowane podsumowanie zawierające liczbę utworzonych obiektów oraz wykryty format pakietu .

### Eksport Biblioteki i Generowanie Pobierania DOM (`downloadLibraryExport`)

Eksport biblioteki polega na pobraniu strumienia danych z serwera przez `exportLibraryPack()`, zmapowaniu odpowiedzi do obiektu typu `Blob`, a następnie wymuszeniu na przeglądarce pobrania pliku .

Test jednostkowy tej funkcji w środowisku jsdom/happy-dom musi zweryfikować cykl życia tymczasowego adresu URL . Po pobraniu Bloba wywoływana jest metoda `URL.createObjectURL(blob)`, której wynik przypisywany jest do właściwości `href` sztucznie utworzonego elementu `<a>` . Nazwa pobieranego pliku tworzona jest dynamicznie na podstawie znacznika czasu we wzorcu `stagesync-export-[timestamp].stagesync.json` . Test musi upewnić się, że po symulacji zdarzenia `.click()` na elemencie kotwicy, funkcja natychmiast zwalnia zasób pamięciowy wywołaniem `URL.revokeObjectURL(url)`, zapobiegając wyciekom pamięci w długo działającej instancji aplikacji Tauri .

### Zarządzanie Szablonami i Tworzenie Utworów (`listTemplateIds`, `createSongAndOpen`)

Funkcja `listTemplateIds` odpowiada za odczyt całej biblioteki przez `fetchLibrary()` oraz wyfiltrowanie wyłącznie tych projektów, które posiadają właściwość `isTemplate === true` . Zestaw testów powinien uwzględniać przypadek biblioteki zawierającej projekty zwykłe, szablony, jak również obiekty z brakiem zdefiniowanej flagi `isTemplate` .

Funkcja `createSongAndOpen` weryfikuje poprawne przekazanie opcji opcjonalnych (takich jak `fromTemplateId` czy `isTemplate`) do metody `createProject` w API, a także upewnia się, że po utworzeniu struktury zostaje wywołana funkcja `pushRecentTimelineProject` z odpowiednim identyfikatorem i nazwą .

---

## Podział Odpowiedzialności Testowej: Lib vs. Component (`DesktopMenuBridge.tsx`)

Testowanie logiki interfejsu w aplikacji hybrydowej wymaga wyraźnego rozgraniczenia pomiędzy testami czystych funkcji orkiestracyjnych w `desktopFileMenu.ts` a testami integracyjnymi komponentu widoku `DesktopMenuBridge.tsx` . Komponent `DesktopMenuBridge.tsx` nasłuchuje zdarzeń globalnych `DESKTOP_MENU_EVENT` i zarządza stanem interfejsu (dialogi, modalne okna wprowadzania nazw, nakładki ładowania `fileBusy`) .

| Obszar Funkcjonalny | Zakres Testów w `desktopFileMenu.test.ts` (Unit / Lib) | Zakres Testów w `DesktopMenuBridge.test.tsx` (Integration / UI) |
| :--- | :--- | :--- |
| **Walidacja Danych Wejściowych** | Weryfikacja pustych nazw, walidacja limitu 16MB, detekcja magii ZIP i błędów JSON . | Wyświetlanie dialogu powiadomień `window.alert` z komunikatem błędu zwróconym z biblioteki . |
| **Komunikacja z API** | Poprawność wywołań `createProject`, `putProject`, `importLibraryPack`, `exportLibraryPack` . | Nie dotyczy – komponent nie wywołuje `libraryApi.ts` bezpośrednio, deleguje zadania do lib . |
| **Zarządzanie Stanem UI** | Brak – moduł lib nie posiada stanu i nie reaguje na cykl życia Reacta . | Przełączanie flagi `fileBusy`, wyświetlanie `ShellPromptDialog` dla akcji "Zapisz jako" i "Nowy" . |
| **Nawigacja i Routing** | Weryfikacja poprawności wyciągania identyfikatora ze ścieżki w `currentTimelineProjectId` . | Reakcja na zwrócenie obiektu projektu i wywołanie `navigate('/timeline/:id')` lub `/admin` . |
| **Interakcja z Drzewem DOM** | Generowanie Blobów, tworzenie obiektów URL, wywoływanie `a.click()` i `URL.revokeObjectURL` . | Wyzwalanie zdarzenia `.click()` na ukrytym elemencie `<input type="file">` po odebraniu `file-import` . |

---

## Analiza Ryzyka Testów Nestabilnych (Flaky Tests) i Mitygacja

Testowanie operacji asynchronicznych i integracji z DOM w środowisku Vitest wiąże się z ryzykiem powstawania testów nestabilnych . Podstawowe źródła potencjalnych fluktuacji oraz metody ich eliminacji obejmują:

Przede wszystkim, czyszczenie globalnych mocków pamięciowych stanowi kluczowy element stabilności zestawu testów . Globalne obiekty środowiska uruchomieniowego, takie jak `URL.createObjectURL` oraz `URL.revokeObjectURL`, są współdzielone pomiędzy wszystkimi plikami testowymi . Brak przywrócenia ich pierwotnych implementacji w bloku `afterEach` przy użyciu `vi.restoreAllMocks()` może prowadzić do zanieczyszczenia stanu w sąsiednich zestawach testowych.

Kolejnym czynnikiem jest zmienność znaczników czasu . Funkcja `downloadLibraryExport` generuje nazwę pliku przy użyciu `Date.now()` . Porównywanie dokładnej nazwy pliku w asercjach bez zamrożenia zegara systemowego doprowadzi do awarii testu . Mitygacja polega na zastosowaniu mechanizmu `vi.useFakeTimers()` i ustawieniu stałego punktu w czasie przed wykonaniem testu eksportu lub na weryfikacji nazwy pliku przy użyciu wyrażeń regularnych.

Ostatnim ryzykiem jest alokacja i odczyt buforów binarnych w sztucznym środowisku DOM . Różnice w implementacji `TextDecoder` lub `ArrayBuffer` pomiędzy środowiskiem Node.js a jsdom mogą powodować błędy odczytu bajtów. Aby temu zapobiec, testy należy zasilać jawnie utworzonymi obiektami `Uint8Array` przekazywanymi bezpośrednio z bufora `new Uint8Array([...]).buffer`, co gwarantuje spójne zachowanie niezależnie od użytego runnera .

---

## Architektura Plików i Priorytetyzacja Testów

### Rekomendacja Struktury Plików

Zaleca się utworzenie **nowego, dedykowanego pliku testowego** `apps/web/src/lib/desktopFileMenu.test.ts`, zamiast dopisywania przypadków do istniejącego `desktopMenuEvents.test.ts` . Existing plik `desktopMenuEvents.test.ts` służy do weryfikacji czystego parsowania zdarzeń `CustomEvent` oraz sprawdzania dozwolonych akcji menu . Wprowadzenie do niego złożonych mocków modułów, atrap obiektów DOM oraz operacji na plikach obniżyłoby czytelność kodyfikacji i utrudniło maintenance . Nowy plik skupi się wyłącznie na przepływach asynchronicznych i integracji z API .

### Priorytetyzacja Wdrożenia Scenariuszy Testowych

Priorytetyzacja opiera się na analizie ryzyka utraty danych użytkownika (Data Loss Risk) oraz awarii aplikacji podczas pracy w trybie offline / na scenie.

| Priorytet | Funkcja | Poziom Ryzyka | Uzasadnienie Priorytetu |
| :---: | :--- | :---: | :--- |
| **P0** | `importLibraryFile` | **Krytyczny** | Uszkodzenie struktury bazy danych lub wyzwalanie unhandled exceptions przy wczytaniu złego pliku (ZIP, >16MB, bad JSON) . |
| **P0** | `saveProjectAs` | **Krytyczny** | Ryzyko utraty zmian lub nadpisania projektu źródłowego w przypadku błędnej obsługi `updatedAt` lub `midiProgramId` . |
| **P1** | `createSongAndOpen` | **Wysoki** | Podstawowy przepływ tworzenia utworów; awaria uniemożliwia rozpoczynanie nowych projektów na scenie . |
| **P1** | `downloadLibraryExport` | **Średni** | Uniemożliwienie wykonania kopii zapasowej; podatność na wycieki pamięci URL w interfejsie DOM . |
| **P2** | `listTemplateIds` | **Niski** | Operacja bezpieczna (tylko odczyt); błąd skutkuje jedynie brakiem wyświetlenia listy szablonów . |

---

## Propozycja Pełnej Implementacji `desktopFileMenu.test.ts`

Poniższy kod stanowi gotową do wdrożenia, kompletną implementację zestawu testów w pliku `apps/web/src/lib/desktopFileMenu.test.ts`, realizującą wszystkie postawione pytania badawcze.

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSongAndOpen,
  downloadLibraryExport,
  importLibraryFile,
  listTemplateIds,
  saveProjectAs,
} from "./desktopFileMenu.js";
import {
  createProject,
  exportLibraryPack,
  fetchLibrary,
  fetchProject,
  importLibraryPack,
  putProject,
} from "./libraryApi.js";
import { pushRecentTimelineProject } from "./lastTimelineProject.js";
import { ZIP_IMPORT_UNSUPPORTED_PL } from "@stagesync/shared";

vi.mock("./libraryApi.js", () => ({
  createProject: vi.fn(),
  fetchProject: vi.fn(),
  putProject: vi.fn(),
  fetchLibrary: vi.fn(),
  importLibraryPack: vi.fn(),
  exportLibraryPack: vi.fn(),
}));

vi.mock("./lastTimelineProject.js", () => ({
  pushRecentTimelineProject: vi.fn(),
}));

describe("desktopFileMenu async flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSongAndOpen", () => {
    it("creates project via API and updates recent timeline project history", async () => {
      vi.mocked(createProject).mockResolvedValueOnce({
        id: "proj-101",
        name: "Koncert Finale",
        formatVersion: 5,
        updatedAt: "2026-03-30T10:00:00.000Z",
      } as any);

      const result = await createSongAndOpen("Koncert Finale");

      expect(createProject).toHaveBeenCalledWith("Koncert Finale", undefined);
      expect(pushRecentTimelineProject).toHaveBeenCalledWith("proj-101", "Koncert Finale");
      expect(result).toEqual({ id: "proj-101", name: "Koncert Finale" });
    });

    it("passes template options to createProject when requested", async () => {
      vi.mocked(createProject).mockResolvedValueOnce({
        id: "proj-tmpl-1",
        name: "Szablon Pop",
        isTemplate: true,
      } as any);

      await createSongAndOpen("Szablon Pop", { isTemplate: true });

      expect(createProject).toHaveBeenCalledWith("Szablon Pop", { isTemplate: true });
    });
  });

  describe("saveProjectAs", () => {
    it("correctly preserves created shell updatedAt for optimistic lock and midiProgramId to avoid PC collisions", async () => {
      const sourceProject = {
        id: "source-proj-id",
        name: "Utwór Źródłowy",
        isTemplate: false,
        updatedAt: "2025-01-01T00:00:00.000Z",
        midiProgramId: 12,
        tempo: 140,
        sections: [{ id: 1, name: "Intro" }],
      };

      const newlyCreatedShell = {
        id: "new-copy-id",
        name: "Utwór Kopia",
        isTemplate: false,
        updatedAt: "2026-03-30T12:00:00.000Z",
        midiProgramId: 88,
      };

      vi.mocked(fetchProject).mockResolvedValueOnce(sourceProject as any);
      vi.mocked(createProject).mockResolvedValueOnce(newlyCreatedShell as any);
      vi.mocked(putProject).mockResolvedValueOnce({
        ...sourceProject,
        id: newlyCreatedShell.id,
        name: "Utwór Kopia",
        updatedAt: newlyCreatedShell.updatedAt,
        midiProgramId: newlyCreatedShell.midiProgramId,
      } as any);

      const result = await saveProjectAs("source-proj-id", "  Utwór Kopia  ");

      expect(fetchProject).toHaveBeenCalledWith("source-proj-id");
      expect(createProject).toHaveBeenCalledWith("Utwór Kopia", { isTemplate: false });
      expect(putProject).toHaveBeenCalledWith("new-copy-id", {
        ...sourceProject,
        name: "Utwór Kopia",
        isTemplate: false,
        updatedAt: "2026-03-30T12:00:00.000Z",
        midiProgramId: 88,
      });
      expect(pushRecentTimelineProject).toHaveBeenCalledWith("new-copy-id", "Utwór Kopia");
      expect(result).toEqual({ id: "new-copy-id", name: "Utwór Kopia" });
    });

    it("throws error immediately if trimmed new name is empty", async () => {
      await expect(saveProjectAs("source-id", "   ")).rejects.toThrow(
        "Nazwa projektu jest wymagana",
      );
      expect(fetchProject).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
    });

    it("propagates error when fetchProject fails", async () => {
      vi.mocked(fetchProject).mockRejectedValueOnce(new Error("HTTP 404: Projekt nie istnieje"));

      await expect(saveProjectAs("missing-id", "Nowa Nazwa")).rejects.toThrow(
        "HTTP 404: Projekt nie istnieje",
      );
      expect(createProject).not.toHaveBeenCalled();
      expect(pushRecentTimelineProject).not.toHaveBeenCalled();
    });
  });

  describe("importLibraryFile", () => {
    it("rejects files larger than 16 MB limit", async () => {
      const oversizedBuffer = new ArrayBuffer(16 * 1024 * 1024 + 1);
      const mockFile = {
        arrayBuffer: async () => oversizedBuffer,
      } as File;

      await expect(importLibraryFile(mockFile)).rejects.toThrow(
        "Plik importu jest za duży (max 16 MB).",
      );
      expect(importLibraryPack).not.toHaveBeenCalled();
    });

    it("rejects ZIP archives identified by looksLikeZipBytes magic bytes", async () => {
      const zipHeaderBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]).buffer;
      const mockFile = {
        arrayBuffer: async () => zipHeaderBytes,
      } as File;

      await expect(importLibraryFile(mockFile)).rejects.toThrow(
        ZIP_IMPORT_UNSUPPORTED_PL,
      );
      expect(importLibraryPack).not.toHaveBeenCalled();
    });

    it("throws readable polish error when JSON syntax is invalid", async () => {
      const invalidJsonBytes = new TextEncoder().encode("{ stagesync: invalid-json ");
      const mockFile = {
        arrayBuffer: async () => invalidJsonBytes.buffer,
      } as File;

      await expect(importLibraryFile(mockFile)).rejects.toThrow(
        "Nie udało się odczytać JSON. Użyj .stagesync.json (v5) albo legacy database.json.",
      );
      expect(importLibraryPack).not.toHaveBeenCalled();
    });

    it("successfully parses valid JSON and passes package to importLibraryPack API", async () => {
      const packObject = {
        stagesyncExportVersion: 3,
        projects: [{ name: "Song 1" }, { name: "Song 2" }],
      };
      const validJsonBytes = new TextEncoder().encode(JSON.stringify(packObject));
      const mockFile = {
        arrayBuffer: async () => validJsonBytes.buffer,
      } as File;

      vi.mocked(importLibraryPack).mockResolvedValueOnce({
        library: {} as any,
        created: ["id-1", "id-2"],
        format: "v5-pack",
        warnings: [],
      });

      const result = await importLibraryFile(mockFile);

      expect(importLibraryPack).toHaveBeenCalledWith(packObject);
      expect(result).toEqual({ createdCount: 2, format: "v5-pack" });
    });
  });

  describe("downloadLibraryExport", () => {
    it("requests blob, creates object URL, triggers DOM anchor click, and revokes URL", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-30T15:00:00.000Z"));

      const mockBlob = new Blob(['{"projects":[]}'], { type: "application/json" });
      vi.mocked(exportLibraryPack).mockResolvedValueOnce(mockBlob);

      const createObjectURLSpy = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:http://localhost/stagesync-export-mock");
      const revokeObjectURLSpy = vi
        .spyOn(URL, "revokeObjectURL")
        .mockImplementation(() => {});

      const clickSpy = vi.fn();
      let capturedHref = "";
      let capturedDownload = "";

      const anchorMock = {
        set href(val: string) {
          capturedHref = val;
        },
        set download(val: string) {
          capturedDownload = val;
        },
        click: clickSpy,
      };

      vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        if (tagName === "a") return anchorMock as any;
        return document.createElement(tagName);
      });

      await downloadLibraryExport();

      expect(exportLibraryPack).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      expect(capturedHref).toBe("blob:http://localhost/stagesync-export-mock");
      expect(capturedDownload).toBe(`stagesync-export-${Date.now()}.stagesync.json`);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:http://localhost/stagesync-export-mock");

      vi.useRealTimers();
    });
  });

  describe("listTemplateIds", () => {
    it("fetches library and returns mapped array containing only projects marked as template", async () => {
      vi.mocked(fetchLibrary).mockResolvedValueOnce({
        projects: [
          { id: "p1", name: "Utwór Standard", isTemplate: false },
          { id: "p2", name: "Szablon Zwrotka-Refren", isTemplate: true },
          { id: "p3", name: "Utwór Bez Flag" },
          { id: "p4", name: "Szablon Akustyczny", isTemplate: true },
        ],
      } as any);

      const templates = await listTemplateIds();

      expect(fetchLibrary).toHaveBeenCalledTimes(1);
      expect(templates).toEqual([
        { id: "p2", name: "Szablon Zwrotka-Refren" },
        { id: "p4", name: "Szablon Akustyczny" },
      ]);
    });
  });
});
```

---
Powered by [AI Exporter](https://saveai.net)
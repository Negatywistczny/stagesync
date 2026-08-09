> From: https://gemini.google.com/app/268fde14b0d30945

Specyfikacja Kanałów MIDI StageSync

# Specyfikacja Techniczna i Referencja Architektoniczna MIDI Program Change Channeling dla StageSync v5.2+

## 1. Architektura Systemu i Deklaracja Kanonu Indeksowania Kanałów (SSOT)

Dotychczasowa architektura modułu MIDI w środowisku StageSync (wersje v5.0 oraz v5.1) wykorzystywała uproszczony model obsługi komunikatów Program Change (PC) . Sygnał wejściowy (PC IN) przetwarzano w bezwzględnym trybie Omni, co oznaczało akceptację wiadomości ze wszystkich szesnastu kanałów MIDI . Z kolei sygnał wyjściowy (PC OUT) wyzwalany przy zmianie aktywnego projektu wysyłany był na twardo zakodowanym kanale o indeksie `0`, odpowiadającym pierwszemu kanałowi w ujęciu użytkownika .

W profesjonalnych instalacjach scenicznych i systemach Show Control, gdzie magistrala MIDI powiązana jest z wieloma urządzeniami (sterownikami oświetlenia, procesorami efektów, syntezatorami i konsoletami audio), brak selektywnego filtrowania sygnału wejściowego oraz brak możliwości wyboru kanału wyjściowego stwarzają bezpośrednie ryzyko operacyjne. Przypadkowy komunikat PC nadany przez zewnętrzne urządzenie na współdzielonej magistrali mógł wywołać nieintencjonalną zmianę utworu w trakcie trwania koncertu.

Dla zagwarantowania pełnej spójności operacyjnej pomiędzy interfejsem użytkownika, warstwą serwerową oraz fizycznymi urządzeniami wykonawczymi, ustala się kanon indeksowania kanałów MIDI obowiązujący we wszystkich modułach oprogramowania StageSync.

| Warstwa Systemu | Typ Indeksowania | Zakres Dla Konkretnego Kanału | Wartość Dla Trybu Omni | Przykład Reprezentacji |
| :--- | :--- | :--- | :--- | :--- |
| **Interfejs Użytkownika (Admin UI / FOH)** | 1-based (Ludzki) | `1` do `16` | `Omni` (wszystkie kanały) | „Channel 1”, „Omni” |
| **API REST / DTO / Kontrakty Zod** | 0-based (Natywne MIDI) | `0` do `15` | `null` | `{ inputChannel: 0 }`, `{ inputChannel: null }` |
| **Plik Konfiguracyjny (`midi-config.json`)** | 0-based (Natywne MIDI) | `0` do `15` | `null` | `"inputChannel": null`, `"outputChannel": 0` |
| **Silnik Wykonawczy (`MidiHost` / Backend)** | 0-based (Bajtowe MIDI) | `0` do `15` | Brak filtru (`null`) | `msg.channel === config.inputChannel` |

Matematyczną relację pomiędzy wartością prezentowaną w interfejsie użytkownika a wartością przesyłaną w kontraktach API definiuje zależność:

$Channel_{API} = Channel_{UI} - 1$

Walidacja po stronie schematów Zod odrzuca wszelkie liczby spoza przedziału od `0` do `15` dla kanałów dedykowanych oraz zezwala na wartość `null` wyłącznie w odniesieniu do filtru wejściowego .

---

## 2. Semantyka Filtrowania Kanałów: Omni vs Single vs Multi (PC-CH-01)

Różne środowiska Show Control oraz stacje DAW stosują odmienne modele zarządzania kanałami MIDI . W celu właściwego pozycjonowania oprogramowania StageSync v5.2+ przeprowadzono analizę porównawczą wiodących rozwiązań branżowych .

| Oprogramowanie / Standard | Obsługa PC IN | Obsługa PC OUT | Konfiguracja Kanałów |
| :--- | :--- | :--- | :--- |
| **Apple MainStage** | Single Channel / Omni per Patch | Single Channel per Channel Strip | Konfigurowana w oknie inspektora sygnału |
| **Ableton Live** | Single Channel / Omni (MIDI From) | Single Channel (MIDI To) | Wybierana w nagłówku ścieżki MIDI |
| **OnSong / Pedalboardy** | Single Channel Filter | Single Channel Send | Globalny kanał sterowania w ustawieniach systemu |
| **QLab MIDI Cues** | Single Channel | Single Channel per Cue | Przypisywana indywidualnie do punktu wyzwolenia |
| **StageSync v5.2+** | **Single Channel + Omni** | **Single Channel** | **Globalna w `MidiHostConfig` (Host SSOT)** |

### Zakres Wspierany w StageSync v5.2+
W wersji v5.2+ StageSync wspiera wyłącznie semantykę **Single Channel** oraz **Omni** dla sygnału wejściowego, a także **Single Channel** dla sygnału wyjściowego :

1. **Tryb IN Omni (`inputChannel: null`)**: Silnik przyjmuje komunikaty Program Change ze wszystkich szesnastu kanałów MIDI . Jest to tryb domyślny, zapewniający całkowitą kompatybilność wsteczną z projektami i plikami konfiguracyjnymi utworzonymi w wersjach v5.0 i v5.1 .
2. **Tryb IN Single (`inputChannel: 0..15`)**: Silnik przepuszcza wyłącznie komunikaty PC odebrane na wskazanym kanale MIDI (np. wartość `0` odpowiadająca Kanałowi 1 w UI) . Wiadomości ze wszystkich pozostałych piętnastu kanałów są natychmiast odrzucane .
3. **Tryb OUT Single (`outputChannel: 0..15`)**: Zmiana aktywnego projektu wyzwala automatyczną emisję komunikatu PC zawierającego identyfikator `midiProgramId` skojarzony z danym utworem, nadawanego na wskazanym w konfiguracji kanale wyjściowym .

### Wykluczenie Trybu Multi-Channel w v5.2+
Tryb **Multi-Channel** (rozumiany jako możliwość zdefiniowania niestandardowej listy lub tablicy kilku wybranych kanałów wejściowych, np. jednoczesne nasłuchiwanie na Kanałach 1, 4 oraz 12 przy ignorowaniu pozostałych) zostaje uznany za wykraczający poza zakres wersji v5.2+ (`OUT of scope` / `limit 5.2+`) . Wprowadzenie złożonych struktur tablicowych w konfiguracji portu hosta zwiększałoby skomplikowanie walidacji Zod oraz interfejsu Admin UI bez jednoznacznych korzyści w standardowych setupach koncertowych, gdzie pojedyncza magistrala wyzwalająca działa w oparciu o jeden dedykowany kanał sterujący.

---

## 3. Kontrakt Danych `MidiHostConfig` i Strategia Migracji (PC-CH-02)

Kontrakt konfiguracyjny hosta MIDI w paczce `@stagesync/shared` zostaje rozszerzony o dwa nowe pola określające kanały komunikacji . Nowe pola w schemacie `MidiHostConfigSchema` przymują ścisłe ograniczenia walidacyjne, zapobiegając wstrzyknięciu nieprawidłowych danych na krawędziach systemu .

Payload DTO dla operacji modyfikacji konfiguracji (`PutMidiHostConfigBodySchema`) dopuszcza opcjonalne aktualizacje częściowe .

| Pole API / Config | Typ Zod | Wartość Domyślna | Opis i Kanon Indeksowania |
| :--- | :--- | :--- | :--- |
| `inputId` | `z.string().min(1).nullable()` | `null` | Identyfikator portu wejściowego MIDI |
| `outputId` | `z.string().min(1).nullable()` | `null` | Identyfikator portu wyjściowego MIDI |
| `clockOutEnabled` | `z.boolean()` | `true` | Flaga emisji sygnału MIDI Clock z SSOT transportu  |
| `inputChannel` | `z.number().int().min(0).max(15).nullable()` | `null` | Kanał wejściowy PC (`null` = Omni; `0` = Ch 1)  |
| `outputChannel` | `z.number().int().min(0).max(15)` | `0` | Kanał wyjściowy PC (`0` = Ch 1)  |

Podczas uruchamiania serwera funkcja `loadMidiHostConfigFile` zawarta w module [`config-persist.ts`](../../../../apps/server/src/midi/config-persist.ts) wczytuje plik konfiguracyjny `data/host/midi-config.json` . W przypadku napotkania pliku wygenerowanego przez wcześniejszą wersję oprogramowania (v5.0/v5.1), który nie zawiera pól `inputChannel` oraz `outputChannel`, proces parsowania Zod automatycznie nakłada wartości domyślne :

1. W przypadku braku pól w pliku JSON, Zod uzupełnia brakujące wartości do postaci `{ ..., "inputChannel": null, "outputChannel": 0 }` .
2. Zaktualizowana struktura jest utrzymywana w pamięci podręcznej hosta . Każda zmiana konfiguracji z poziomu Admin UI inicjuje zapis z użyciem pliku tymczasowego z identyfikatorem PID oraz operacją `renameSync`, co gwarantuje atomowość zapisu na dysku .
3. Funkcja `resolveBootMidiConfig` zachowuje możliwość nadpisania portów wejścia i wyjścia ze zmiennych środowiskowych (`STAGESYNC_MIDI_INPUT`, `STAGESYNC_MIDI_OUTPUT`), pozostawiając zarządzanie kanałami w gestii trwałego pliku konfiguracyjnego .

---

## 4. Architektura Filtrowania, Flood Protection i Obsługa Błędnych Kanałów (PC-CH-03)

Filtrowanie komunikatów wejściowych zachodzi w najwcześniejszej możliwej fazie przetworzenia sygnału – bezpośrednio wewnątrz metody `onInputMessage` modułu `createMidiHost` . Jest to kluczowe z punktu widzenia zachowania niskich opóźnień i minimalizacji obciążenia procesora.

Gdy backend natywny lub testowy przekazuje zdarzenie typu `program`, silnik wykonuje sekwencyjną weryfikację warunkową:

1. Sprawdzenie typu wiadomości: jeśli typ jest inny niż `program`, wiadomość trafia do odpowiednich procesorów zegara lub transportu .
2. Weryfikacja kanału: jeśli `config.inputChannel` ma wartość inną niż `null` oraz kanał odebranej wiadomości `msg.channel` różni się od `config.inputChannel`, komunikat jest natychmiast odrzucany w trybie **Silent Drop** .
3. W przypadku Silent Drop silnik nie wykonuje powiadomienia funkcji `onProgramChange`, nie rejestruje incydentu w logach systemowych oraz nie inkrementuje licznika telemetrii `pcIn` .
4. Jeśli wiadomość przejdzie filtr kanałowy (lub gdy system działa w trybie Omni), silnik rejestruje zdarzenie w liczniku `pcIn` i przekazuje numer programu do bufora coalescingu .

Podczas występów na żywo zakłócenia sprzętowe lub pętle pętli MIDI mogą generować potok komunikatów (MIDI Flood). StageSync v5.2+ realizuje dwupoziomową ochronę przed przeciążeniem pętli zdarzeń Node.js :

Ochrona pierwszego stopnia (Silent Drop) zapobiega alokacji pamięci oraz operacjom dyskowym I/O na wiadomościach pochodzących z niepożądanych kanałów . 

Ochrona drugiego stopnia (Coalescing Latest-Wins) obsługuje potok komunikatów napływających na właściwym kanale. Silnik wykorzystuje mechanizm `queueMicrotask` oraz zmienną `pendingProgram` . W sytuacji odebrania serii kilkuset komunikatów PC w jednym cyklu pętli zdarzeń, silnik przetrzymuje w pamięci wyłącznie ostatnio odebraną wartość programu (`latest-wins`), wyzwalając procedurę ładowania projektu `onProgramChange` dokładnie raz .

Wskaźnik `rates.pcPerSec` zwracany przez endpoint REST `/api/midi` raportuje natężenie wyłącznie tych komunikatów Program Change, które pomyślnie przeszły filtr kanałowy i zostały zaakceptowane przez silnik . Pozwala to realizatorowi FOH na bieżąco diagnozować w panelu Admin UI, czy sygnał ze sterownika dociera na właściwym kanale.

---

## 5. Projekt Interfejsu Administratora Admin Host UI (PC-CH-04)

Modyfikacje interfejsu użytkownika obejmują dwa komponenty konsoli administratora: modal ustawień globalnych [`ServerSettingsModal.tsx`](../../../../apps/web/src/shells/ServerSettingsModal.tsx) oraz panel telemetrii scenicznej [`SystemView.tsx`](../../../../apps/web/src/shells/admin/SystemView.tsx) .

W zakładce "MIDI" modalu [`ServerSettingsModal.tsx`](../../../../apps/web/src/shells/ServerSettingsModal.tsx) umieszczone są dwa nowe pola wyboru typu `select`, usytuowane bezpośrednio pod selektorami portów fizycznych . Rezygnuje się z jakichkolwiek elementów atrapowych (`stubs`) – każda zmiana wartości modyfikuje lokalny stan roboczy (`draft`), a kliknięcie przycisku "Zapisz" wysyła żądanie `PUT /api/midi/config` do serwera .

Etykiety interfejsu łączą polską czytelność operacyjną z branżowym żargonem technicznym w języku angielskim:

| Element Interfejsu | Etykieta w UI (PL / EN) | Dostępne Opcje w Dropdownie | Mapowanie na Stan Draft / API |
| :--- | :--- | :--- | :--- |
| **Select IN Channel** | Kanał wejściowy Program Change | `Omni (wszystkie kanały)`<br>`Kanał 1`<br>`Kanał 2`<br>...<br>`Kanał 16` | `null`<br>`0`<br>`1`<br>...<br>`15` |
| **Select OUT Channel** | Kanał wyjściowy Program Change | `Kanał 1`<br>`Kanał 2`<br>...<br>`Kanał 16` | `0`<br>`1`<br>...<br>`15` |

Sekcja podglądu portów w karcie telemetrii komponentu [`SystemView.tsx`](../../../../apps/web/src/shells/admin/SystemView.tsx) została rozbudowana o wizualizację stanu filtrów kanałowych :

- **Wejście**: Wyświetla nazwę fizycznego portu wejściowego oraz aktywny filtr, np. `USB MIDI Pedalboard (Kanał 1)` lub `Roland UM-ONE (Omni)` .
- **Wyjście**: Wyświetla nazwę portu wyjściowego oraz skonfigurowany kanał nadawczy, np. `Korg sound module (Kanał 2)` .

---

## 6. Plan Testów i Weryfikacja Jakościowa (PC-CH-05)

Dla zapewnienia bezawaryjnej pracy w warunkach koncertowych wdrożenie wymaga weryfikacji w oparciu o trójpoziomowy plan testów.

### Testy Jednostkowe (Unit Tests: [`host.test.ts`](../../../../apps/server/src/midi/host.test.ts))
Zestaw przypadków testowych weryfikujących logikę filtru wewnątrz modułu `createMidiHost` :

| ID Testu | Stan Konfiguracji `inputChannel` | Przychodzący Komunikat MIDI | Oczekiwane Zachowanie Silnika |
| :--- | :--- | :--- | :--- |
| **UT-PC-01** | `null` (Omni) | `PC program: 5, channel: 0` | Wywołanie `onProgramChange(5)`. Inkrementacja `pcPerSec` . |
| **UT-PC-02** | `null` (Omni) | `PC program: 5, channel: 9` | Wywołanie `onProgramChange(5)`. Inkrementacja `pcPerSec` . |
| **UT-PC-03** | `0` (Kanał 1) | `PC program: 12, channel: 0` | Wywołanie `onProgramChange(12)`. Inkrementacja `pcPerSec` . |
| **UT-PC-04** | `0` (Kanał 1) | `PC program: 12, channel: 1` | **Silent Drop**. Brak wywołania `onProgramChange`. Wskaźnik `pcPerSec` = 0 . |
| **UT-PC-05** | `15` (Kanał 16) | `PC program: 1, channel: 15` | Wywołanie `onProgramChange(1)`. Inkrementacja `pcPerSec` . |
| **UT-PC-06** | `0` (Kanał 1) | Flood 100x `PC ch:1` + 100x `PC ch:0` | Odrzucenie 100 wiadomości ch:1, zsumowanie 100 wiadomości ch:0 do 1 wywołania `onProgramChange` (latest-wins) . |

### Testy Integracyjne (Integration Tests: `program-change-out.test.ts`)
Weryfikacja procesu nadawania komunikatów na wyjściu przy użyciu backendu testowego (`mock backend`) :

| ID Testu | Scenariusz Testowy | Konfiguracja `outputChannel` | Zdarzenie w Systemie | Oczekiwana Wiadomość Wyjściowa |
| :--- | :--- | :--- | :--- | :--- |
| **IT-PC-01** | Wysyłka domyślna | `0` (Kanał 1) | Zmiana projektu na posiadający `midiProgramId: 42`  | Emisja `{ type: "program", channel: 0, program: 42 }` na backendzie . |
| **IT-PC-02** | Zmiana kanału wyjścia | `3` (Kanał 4) | Zmiana projektu na posiadający `midiProgramId: 10`  | Emisja `{ type: "program", channel: 3, program: 10 }` na backendzie . |
| **IT-PC-03** | Projekt bez PC | `0` (Kanał 1) | Zmiana projektu bez opcjonalnego `midiProgramId`  | Brak emisji jakichkolwiek wiadomości MIDI . |

### Scenariusz Smoke Test FOH (2 Urządzenia / 2 Kanały)
Weryfikacja stanowiskowa z dwoma fizycznymi interfejsami MIDI w torze sygnałowym:

1. **Konfiguracja Stanowiska**:
   - Urządzenie A (Sterownik nożny): Skonfigurowane na nadawanie komunikatów PC na **Kanalie 1** (API `channel: 0`).
   - Urządzenie B (Procesor efektów): Oczekuje na komunikaty PC na **Kanalie 2** (API `channel: 1`).
   - StageSync v5.2+: Port wejściowy połączony z Urządzeniem A (`inputChannel: 0`). Port wyjściowy połączony z Urządzeniem B (`outputChannel: 1`).
2. **Procedura Testowa**:
   - Nadanie komunikatu `PC #3` z zewnętrznego generatora na **Kanalie 5**. Silnik StageSync ignoruje wiadomość. Brak reakcji systemu i brak emisji wyjściowej.
   - Nadanie komunikatu `PC #5` ze Sterownika A na **Kanalie 1**. StageSync odbiera wiadomość, ładuje projekt o `midiProgramId: 5`.
   - Zmiana projektu wyzwala automatyczną emisję komunikatu `PC #5` na **Kanalie 2** do Urządzenia B. Urządzenie B przełącza preset.

---

## 7. Mapowanie Zmian na Pliki Projektu i Architektura Ryzyk (PC-CH-06)

Implementacja specyfikacji rozkłada się na poszczególne warstwy architektoniczne aplikacji. Punktem wyjścia jest zamknięcie pozycji audytowych **RSK-MIDI-04** oraz **RSK-MIDI-05** .

| Identyfikator Pliku | Ścieżka Pliku w Repozytorium | Zakres Wprowadzanych Zmian | Relewantne ID Ryzyka / Specyfikacji |
| :--- | :--- | :--- | :--- |
| [`schema.ts`](../../../../packages/shared/src/schema.ts) | [`packages/shared/src/schema.ts`](../../../../packages/shared/src/schema.ts) | Rozszerzenie `MidiHostConfigSchema` oraz `PutMidiHostConfigBodySchema` o pola `inputChannel` i `outputChannel` z walidacją Zod . | **RSK-MIDI-04**, **RSK-MIDI-05**, **PC-CH-02** |
| [`config-persist.ts`](../../../../apps/server/src/midi/config-persist.ts) | [`apps/server/src/midi/config-persist.ts`](../../../../apps/server/src/midi/config-persist.ts) | Aktualizacja funkcji parsowania i zapisu konfiguracji w celu nakładania domyślnych wartości kanałów przy migracji . | **PC-CH-02** |
| [`host.ts`](../../../../apps/server/src/midi/host.ts) | [`apps/server/src/midi/host.ts`](../../../../apps/server/src/midi/host.ts) | Aplikacja filtru kanałowego w `onInputMessage` (Silent Drop) oraz wywoływanie `sendProgramChange` z `config.outputChannel` . | **RSK-MIDI-04**, **RSK-MIDI-05**, **PC-CH-03** |
| [`program-change-out.ts`](../../../../apps/server/src/midi/program-change-out.ts) | [`apps/server/src/midi/program-change-out.ts`](../../../../apps/server/src/midi/program-change-out.ts) | Użycie `config.outputChannel` z hosta podczas automatycznej emisji PC po zmianie projektu . | **RSK-MIDI-05**, **PC-CH-03** |
| [`midi.ts`](../../../../apps/server/src/routes/midi.ts) | [`apps/server/src/routes/midi.ts`](../../../../apps/server/src/routes/midi.ts) | Obsługa zaktualizowanego schematu PUT w routerze Express `/api/midi/config` . | **PC-CH-02** |
| [`ServerSettingsModal.tsx`](../../../../apps/web/src/shells/ServerSettingsModal.tsx) | `apps/desktop/src/components/ServerSettingsModal.tsx` | Wdrożenie kontrolek `Select` dla kanałów PC IN i OUT w zakładce MIDI . | **PC-CH-04** |
| [`SystemView.tsx`](../../../../apps/web/src/shells/admin/SystemView.tsx) | `apps/desktop/src/components/views/SystemView.tsx` | Rozbudowa sekcji podglądu portów o wizualizację aktywnych kanałów MIDI . | **PC-CH-04** |

Niniejsze opracowanie zamyka pozycje o stanie `limit` z audytu bezpieczeństwa silnika :

- **RSK-MIDI-04 (PC IN Omni)**: Rozwiązane poprzez wprowadzenie pola `inputChannel` i filtrowanie wiadomości na krawędzi wejścia .
- **RSK-MIDI-05 (Hardkodowany PC OUT Ch 0)**: Rozwiązane poprzez wprowadzenie pola `outputChannel` i dynamiczne przekazywanie kanału do metody `sendProgramChange` .

Naprawione wcześniej ryzyka **RSK-MIDI-01..03** oraz **RSK-MIDI-06..09** (odporność na awarie I/O, spójność zegara z tickami transportu oraz coalescing wiadomości) pozostają nienaruszoną bazą stabilności środowiska StageSync .

---

## 8. Podsumowanie Konkluzji i Rekomendacji

1. **Bezwzględny Kanon Indeksowania**: Należy rygorystycznie przestrzegać rozdzielenia warstwy prezentacji (`1-based`) od warstwy API i wykonawczej (`0-based`), co eliminuje błędy przesunięcia o jeden kanał (off-by-one errors).
2. **Walidacja Fail-Fast**: Każda próba przesłania nieprawidłowego kanału musi być blokowana przez schematy Zod na krawędzi API, zwracając status `400 Bad Request` .
3. **Cisza w Logach przy Błędnym Kanale**: Odrzucenie wiadomości ze złego kanału nie może generować wpisów w logach ani obciążać pętli zdarzeń Node.js .
4. **Brak Drugiego Zegara**: Zgodnie z zasadą Single Source of Truth (ADR 0002 / ADR 0010), synchronizacja czasu opiera się wyłącznie na serwerowym silniku transportu; filtry kanałowe Program Change pracują niezależnie i nie wpływają na przesyłanie impulsów MIDI Clock .

---
Powered by [AI Exporter](https://saveai.net)
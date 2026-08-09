> From: https://gemini.google.com/app/4b027d19f5882e1f

# you asked

message time: 2026-07-27 14:27:34

Jesteś ekspertem od testów MIDI i transportu StageSync. Przeanalizuj [`apps/server/src/midi/host.ts`](../../../../apps/server/src/midi/host.ts) — MIDI I/O hosta, clock OUT z ticków SSOT, clock IN, Program Change debounce, panic.

CEL ANALIZY
Uzupełnić pokrycie `createMidiHost` poza [`host.test.ts`](../../../../apps/server/src/midi/host.test.ts) i testami midi-api/pc-*.

PYTANIA BADAWCZE

1. Clock OUT: `emitClocksThrough`, `MAX_CLOCK_BURST`, seek while playing → re-SPP+Continue — wszystkie edge?
2. Clock IN: beat boundary co 24 ticków → `onBeatToWs` — licznik `inputClockCount`?
3. PC IN: debounce 50ms latest-wins, channel filter silent drop — testy z fake timers?
4. Start/Continue/Stop ze `lastSppTicks` — seek + play na transporcie?
5. `safeSend` / USB unplug — error w `lastError` bez crash procesu?
6. `applyPorts` przy boot z persisted config — integracja [`config-persist.ts`](../../../../apps/server/src/midi/config-persist.ts)?
7. `panic()`: 16 channels × CC 120/121/123 — partial failure?

KONTEKST

- SSOT = transport engine; clock pulses z domain tick deltas, nie setInterval.
- `createMockMidiBackend` już istnieje.
- `isMidiOutAllowed` z safety-net.
- Vitest `vi.useFakeTimers()` dla debounce.

OCZEKIWANY OUTPUT

1. Lista testów per message type (clock/spp/pc/start/stop/continue).
2. Mocki: MidiBackend, TransportEngine, `now()`, optional onProgramChange/onBeatToWs.
3. Ryzyka flaky: fake timers + debounce — wzorce cleanup w afterEach.
4. Priorytety: clock sync > PC load > panic.
5. Mapa uncovered lines → test.

---

# gemini response

Oto ułożony plan. Jeśli chcesz wprowadzić zmiany, zanim przejdę do wyszukiwania, poinformuj mnie o tym.
http://googleusercontent.com/deep_research_confirmation_content/0

---

# you asked

message time: 2026-07-27 14:32:11

Zacznij wyszukiwanie

---

# gemini response

I've completed your research. Feel free to ask me follow-up questions or request changes.

Plan Testów MIDI Host

# Analiza Pokrycia Testowego i Strategia Testowania Modułu Host MIDI ([`apps/server/src/midi/host.ts`](../../../../apps/server/src/midi/host.ts))

Moduł Host MIDI ([`apps/server/src/midi/host.ts`](../../../../apps/server/src/midi/host.ts)) odgrywa kluczową rolę w architekturze przesyłania sygnałów sterujących i chronometrażu w systemie StageSync . Odpowiada on za dwukierunkową komunikację MIDI I/O, synchroniczne generowanie sygnału zegarowego (Clock OUT) w oparciu o silnik transportu stanowiący pojedyncze źródło prawdy (SSOT – _Single Source of Truth_), odbiór i metrykowanie sygnałów wejściowych (Clock IN, SPP, Program Change), bezprzerwowe przełączanie utworów oraz realizację procedur awaryjnych (Panic) .

Poniższa analiza weryfikuje mechanizmy działania modułu, odpowiada na siedem szczegółowych pytań badawczych, identyfikuje luki w pokryciu kodu i definiuje deterministyczną strategię testową pozwalającą zabezpieczyć stabilność aplikacji w środowisku scenicznym.

---

## 1. Architektura Synchroniczna Transportu SSOT i Przepływu Wiadomości MIDI

Moduł `createMidiHost` nie korzysta z niezależnych interwałów czasowych `setInterval` do generowania impulsów zegarowych MIDI, lecz opiera się bezpośrednio na delcie ticków generowanej przez silnik transportu `TransportEngine` . Standard MIDI Clock definiuje $24$ impulsy na ćwierćnutę (PPQN – _Pulses Per Quarter Note_) . Przy domyślnej rozdzielczości domenowej $PPQ = 960$, jeden impuls zegara MIDI przypada dokładnie na każde $40$ ticków ($960 / 24 = 40$) .

Wszelkie wyjścia MIDI są chronione przez mechanizm `isMidiOutAllowed()`, pochodzący z modułu [`safety-net.ts`](../../../../apps/server/src/safety-net.ts) . W trybie Master emisja komunikatów jest dozwolona, natomiast w trybie Spare ruch wyjściowy jest całkowicie blokowany, co zapobiega nakładaniu się sygnałów sterujących z fizycznie zsynchronizowanych urządzeń zapasowych . Wszystkie operacje wysyłania pakietów przechodzą przez wewnętrzną funkcję wrapper `safeSend()`, która izoluje wyjątki zgłaszane przez warstwę I/O (np. nagłe odłączenie kabla USB) i wycisza awarię, zapobiegając załamaniu całego procesu Node.js .

---

## 2. Analiza Pytań Badawczych

### Pytanie 1: Zegar Wyjściowy (Clock OUT), Limitowanie Burst i Re-sync SPP

Funkcja `emitClocksThrough` oblicza docelowy indeks zegara na podstawie bieżącej pozycji transportu w tickach przy użyciu pomocniczego przelicznika `ticksToMidiClockIndex` . Progresja indeksów zegarowych wyznacza zakres impulsów do wyemitowania .

W przypadku skoku pozycji transportu (seek) w trakcie odtwarzania, funkcja `onTransport` sprawdza różnicę bezwzględną między obecną a poprzednią pozycją w tickach (`Math.abs(msg.positionTicks - lastTicks)`). Jeżeli delta przekracza wartość $PPQ$ (jedna ćwierćnuta), system klasyfikuje zmianę jako skok pozycji i wywołuje `sendTransportEdge(msg, "continue")` . Powoduje to natychmiastowe wysłanie komunikatu SPP (_Song Position Pointer_) oraz `continue`, resetując wskaźnik `lastEmittedClockIndex` do nowej pozycji .

Gdy zmiana pozycji jest dodatnia, ale nie przekracza progu re-sync, lub następuje płynny upływ czasu, `emitClocksThrough` przelicza zakres od `from + 1` do `target` . Aby zapobiec zalewowi magistrali MIDI po wznowieniu długo wstrzymanego wątku lub przy bardzo dużych krokach czasowych, wartość `target` jest sztywno ograniczana przez stałą `MAX_CLOCK_BURST = MIDI_CLOCK_PPQN * 8` (192 impulsy, czyli równowartość 8 ćwierćnut) .

Jeśli pozycja w tickach maleje (np. cofnięcie taśmy/seek wstecz bez przekroczenia progu lub ujemna korekta) i nowy indeks `idx` jest mniejszy lub równy `lastEmittedClockIndex`, funkcja jedynie aktualizuje `lastEmittedClockIndex = idx` bez emitowania jakichkolwiek impulsów . W przypadku gdy w trakcie pętli burst funkcja `safeSend` zwróci `false` (np. awaria portu), natychmiast wywoływana jest funkcja `stopClockOut()`, co wyłącza wyjście zegarowe i zapobiega dalszym nieudanym próbom nadawania .

### Pytanie 2: Zegar Wejściowy (Clock IN) i Wskaźnik Beat→WS

Każdy odebrany pakiet zegarowy typu `clock` inkrementuje wewnętrzny licznik `inputClockCount` oraz odnotowuje zdarzenie w liczniku częstotliwości `clockIn` . Warunek `inputClockCount % MIDI_CLOCK_PPQN === 0` weryfikuje osiągnięcie granicy ćwierćnuty (co 24 impulsy) . Zgodnie z tą regułą, dokładnie na każdym wyznaczonym uderzeniu metronomicznym rejestrowane jest zdarzenie w mierniku `beatToWs` oraz wywoływana jest opcjonalna funkcja zwrotna `options.onBeatToWs?.()` .

Odebranie komunikatu `start` powoduje bezwzględny reset licznika `inputClockCount = 0` . Zapewnia to idealne wyrównanie fazowe wskaźników beatu przy odtwarzaniu od początku utworu .

### Pytanie 3: Filtrowanie i Debounce Komunikatów Program Change (PC IN)

Moduł obsługuje komunikaty zmiana programu (`program`) za pośrednictwem strategii odraczania (_debounce_) ze stałym oknem czasowym `PC_DEBOUNCE_MS = 50` ms oraz zasadą _latest-wins_ .

W momencie nadejścia komunikatu PC, w pierwszej kolejności sprawdzany jest kanał MIDI . Jeśli konfiguracja zawiera zdefiniowany kanał wejściowy (`config.inputChannel != null`), a kanał odebranej wiadomości różni się od skonfigurowanego, wiadomość jest bezgłośnie odrzucana (_silent drop_) . W takim przypadku pakiet nie trafia do miernika `pcIn`, ani nie planuje wywołania funkcji `onProgramChange` .

Dla wiadomości zgodnych kanałowo, numer programu zapisywany jest w zmiennej `pendingProgram = msg.program`, po czym wywoływana jest funkcja `scheduleProgramFlush()` . Jeśli w ciągu 50 ms nadejdzie seria komunikatów PC (np. w wyniku szybkiego kręcenia enkoderem), poprzedni zegar `programFlushTimer` jest anulowany przez `clearTimeout`, a timer jest ustawiany na nowo . Po upływie 50 ms od ostatniego pakietu wywoływana jest funkcja `flushPendingProgram()`, która jednorazowo przekazuje najnowszą wartość `pendingProgram` do opcjonalnego callbacku `options.onProgramChange` . Testowanie tej logiki wymaga użycia wirtualnych zegarów Vitest (`vi.useFakeTimers()`) oraz asynchronicznego przesuwania czasu (`await vi.advanceTimersByTimeAsync(50)`) .

### Pytanie 4: Sterowanie Transportem ze Stanu `lastSppTicks`

Gdy na wejściu MIDI pojawi się pakiet `spp` z wartością numeryczną `value`, moduł przelicza go na pozycję w tickach (`sppToTicks(msg.value, ppq)`) i zapisuje w zmiennej `lastSppTicks` . Wiadomość SPP sama w sobie nie zmienia stanu odtwarzania silnika transportu .

Odebranie komunikatu `start` zeruje licznik impulsów `inputClockCount = 0` . Następnie, jeżeli `lastSppTicks` posiada zapisaną wartość, wykonywana jest operacja `seekFromMidi(lastSppTicks)`; w przeciwnym razie następuje seek do pozycji 0 . Na końcu wywoływana jest metoda `transport.play()` .

Odebranie komunikatu `continue` sprawdza obecność `lastSppTicks` . Jeśli wartość istnieje, następuje `seekFromMidi(lastSppTicks)`; jeśli jest równa `null`, transport wznawia odtwarzanie od bieżącej pozycji w tickach . Odebranie komunikatu `stop` natychmiast wywołuje `transport.pause()`, wstrzymując odtwarzanie bez zmiany pozycji .

### Pytanie 5: Odporność na Awaryjne Odłączenie Sprzętu (USB Unplug) i `safeSend`

Każda próba emisji danych wyjściowych odbywa się poprzez funkcję `safeSend(msg)` . Wykonuje ona weryfikację uprawnień `isMidiOutAllowed()` . Jeżeli operacja wyjścia jest dozwolona, pętla próbuje przekazać komunikat do sterownika za pomocą `backend.send(msg)` .

Jeśli sterownik sprzętowy wyrzuci wyjątek (np. w wyniku odłączenia interfejsu USB od magistrali), blok `try...catch` w `safeSend` wywoływana metodę `setError(err)` . Tekst błędu jest przycinany do 500 znaków i zapisywany w `lastError`, a funkcja zwraca wartość `false` . Żaden wyjątek nie przedostaje się do głównego wątku Node.js, chroniąc serwer przed awarią . Wszystkie funkcje wywołujące (`emitClocksThrough`, `sendTransportEdge`, `panic`) sprawdzają wynik `safeSend`; przy wartości `false` natychmiast przerywają pętlę i wywołują `stopClockOut()`, unieszkodliwiając aktywny zegar wyjściowy .

### Pytanie 6: Inicjalizacja Boot / `applyPorts` i Integracja z Plikiem Konfiguracyjnym

Podczas uruchamiania funkcji `createMidiHost`, konfiguracja inicjalna jest tworzona w oparciu o opcjonalny obiekt `initialConfig`, plik JSON zdefiniowany w `configFile` lub wartości domyślne . Plik ładuje funkcja `loadMidiHostConfigFile`, a wynik jest scalany ze zmiennymi środowiskowymi (`STAGESYNC_MIDI_INPUT`, `STAGESYNC_MIDI_OUTPUT`) przez `resolveBootMidiConfig` . Zmienne środowiskowe mają wyższy priorytet niż ustawienia zapisane w pliku .

Jeżeli w skonfigurowanej strukturze zidentyfikowano port wejściowy lub wyjściowy, wywoływana jest funkcja `applyPorts()` . Zamyka ona istniejące połączenia i otwiera wskazane porty w obiekcie `backend` . Jeżeli w momencie uruchamiania modułu silnik transportu znajduje się już w stanie odtwarzania (`state.playing === true`), a wyjście zegarowe jest włączone, `applyPorts()` automatycznie generuje odpowiednią krawędź startową (`start` dla pozycji 0, `continue` dla pozycji większej od 0) wraz z pakietem SPP, wymuszając natychmiastową synchronizację podłączonego sprzętu .

### Pytanie 7: Procedura Awaryjna `panic()` i Obsługa Błędów Częściowych

Funkcja `panic()` realizuje wyciszenie urządzeń poprzez przeiterowanie przez wszystkie 16 kanałów MIDI (indeksy 0–15) . Na każdym kanale wysyłane są sekwencyjnie trzy komunikaty Control Change (CC):

1. CC 120: _All Sound Off_ (wartość 0)
2. CC 121: _Reset All Controllers_ (wartość 0)
3. CC 123: _All Notes Off_ (wartość 0)

Łącznie funkcja próbuje wyemitować $16 \times 3 = 48$ komunikatów CC . Pętla realizowana jest w sposób transakcyjny z natychmiastowym przerwaniem: jeśli jakikolwiek wywołanie `safeSend` zwróci `false` (np. interfejs wyczyści się lub zostanie odłączony na 5. kanale), funkcja natychmiast przerywa działanie i zwraca `{ sent: false, channels: 0 }` . Tylko pomyślna emisja wszystkich 48 komunikatów czyści `lastError` i zwraca `{ sent: true, channels: 16 }` .

---

## 3. Kompletna Lista Scenariuszy Testowych Według Typów Wiadomości

Tabela przedstawia macierz testów jednostkowych i integracyjnych wymaganych do uzyskania pełnego pokrycia modułu Host MIDI.

| Typ Wiadomości     | Kierunek | Scenariusz Testowy                        | Stan Wejściowy                                | Oczekiwane Zachowanie / Asercje                                                                    |
| :----------------- | :------- | :---------------------------------------- | :-------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Clock**          | OUT      | Inicjalizacja indeksu zegara przy starcie | Play od pozycji 0 ticków                      | Brak nadmiarowego impulsu na ticku 0; `lastEmittedClockIndex` ustawia się na 0 .                   |
| **Clock**          | OUT      | Emisja liniowa (Tick Delta)               | Odtwarzanie 120 BPM, PPQ=960                  | Emisja dokładnie 24 impulsów clock na każdą ćwierćnutę (co 40 ticków) .                            |
| **Clock**          | OUT      | Ograniczenie `MAX_CLOCK_BURST`            | Skok pozycji transportu > 192 impulsy         | Emisja zostaje przycięta do 192 impulsów (`MAX_CLOCK_BURST`), brak pętli nieskończonej .           |
| **Clock**          | OUT      | Ujemna korekta / Seek wstecz              | Wartość `positionTicks` maleje                | Wskazanie `lastEmittedClockIndex` aktualizuje się; brak transmisji pakietów clock .                |
| **Clock**          | OUT      | Przerwanie po błędzie I/O                 | Sterownik wyjścia rzuca błąd                  | `safeSend` zwraca `false`, wywoływane jest `stopClockOut()`, błąd trafia do `lastError` .          |
| **Clock**          | IN       | Zliczanie i wskaźnik Beat→WS              | Odbiór impulsów clock                         | Zwiększanie `inputClockCount`; co 24 impulsy wywołanie `onBeatToWs()` i inkrementacja `beatToWs` . |
| **Clock**          | IN       | Reset licznika przez Start                | `inputClockCount = 15`                        | Po odebraniu komunikatu `start` licznik `inputClockCount` zostaje zresetowany do 0 .               |
| **SPP**            | OUT      | Wyliczenie wartości SPP z ticków          | Transport na pozycji 960 ticków (PPQ=960)     | Emisja pakietu `spp` o wartości 4 (4 szesnastki = 1 ćwierćnuta) .                                  |
| **SPP**            | IN       | Buforowanie `lastSppTicks`                | Odbiór `spp` value=8                          | `lastSppTicks` ustawia się na 1920 ticków; transport nie zmienia pozycji do czasu Start/Continue . |
| **SPP**            | IN       | Nadmiarowy potok SPP (Flood)              | Seria 1000 komunikatów SPP                    | Przechowywana jest tylko ostatnia wartość SPP; rate meter rejestruje 1000 zdarzeń .                |
| **Program Change** | IN       | Debounce 50ms (Latest-Wins)               | Seria PC (np. 1, 5, 10) w 10ms                | Brak natychmiastowych wywołań; po 50ms wywołanie `onProgramChange(10)` dokładnie raz .             |
| **Program Change** | IN       | Odfiltrowanie kanału (Silent Drop)        | Config `inputChannel=3`, PC ch=0              | Ignorowanie wiadomości; brak rejestracji w `pcIn` oraz brak wywołania callbacku .                  |
| **Program Change** | OUT      | Walidacja argumentów zakakresowych        | `sendProgramChange(128, 0)` lub `(-1)`        | Odrzucenie bez wysyłania do backendu; brak modyfikacji stanu `lastError` .                         |
| **Start**          | OUT      | Krawędź startowa z pozycji 0              | Transition `playing` false → true (ticks=0)   | Wysyłane `spp` (val=0), następnie `start`; aktywacja `clockOutActive = true` .                     |
| **Start**          | IN       | Wyzwolenie ze stanem SPP                  | `lastSppTicks = 1920`                         | Wywołanie `seekFromMidi(1920)`, wywołanie `transport.play()`, reset `inputClockCount` .            |
| **Continue**       | OUT      | Krawędź wznowienia (position > 0)         | Transition `playing` false → true (ticks=960) | Wysyłane `spp` (val=4), następnie `continue`; aktywacja wyjścia zegarowego .                       |
| **Continue**       | OUT      | Seek podczas odtwarzania                  | Skok pozycji > PPQ przy `playing=true`        | Detekcja `                                                                                         | Δticks | > PPQ`wyzwala powtórną emisję`spp`oraz`continue` . |
| **Continue**       | IN       | Wznowienie z/bez `lastSppTicks`           | Odbiór `continue`                             | Jeśli `lastSppTicks != null`, wykonaj seek; jeśli `null`, wznów od obecnej pozycji .               |
| **Stop**           | OUT/IN   | Zatrzymanie transportu                    | `playing` true → false                        | Emisja `stop` na wyjściu, `stopClockOut()`; na wejściu wywołanie `transport.pause()` .             |

---

## 4. Mocki i Konfiguracja Środowiska Testowego

Do zagwarantowania deterministycznego wykonania testów bez dostępu do fizycznych interfejsów audio/MIDI stosuje się wzorce atrap (_mocks_) .

### Mock Backend MIDI (`createMockMidiBackend`)

Istniejący moduł [`mock-backend.ts`](../../../../apps/server/src/midi/mock-backend.ts) dostarcza pełną atrapę interfejsu hardware z obsługą kontrolowanych błędów I/O :

```typescript
import type {
  MidiBackend,
  MidiPortInfo,
  MidiRealtimeMessage,
} from "./backend.js";

export function createTestMidiBackend() {
  const inputs: MidiPortInfo[] = [
    { id: "mock-in-1", name: "Mock In 1", direction: "input" },
  ];
  const outputs: MidiPortInfo[] = [
    { id: "mock-out-1", name: "Mock Out 1", direction: "output" },
  ];

  let inputHandler: ((msg: MidiRealtimeMessage) => void) | null = null;
  let openInputId: string | null = null;
  let openOutputId: string | null = null;
  const sent: MidiRealtimeMessage[] = [];

  return {
    kind: "mock" as const,
    sent,
    throwOnSend: null as Error | null,

    listInputs: () => inputs,
    listOutputs: () => outputs,

    openInput(id: string, onMessage: (msg: MidiRealtimeMessage) => void) {
      if (!inputs.some((p) => p.id === id))
        throw new Error(`Unknown input: ${id}`);
      openInputId = id;
      inputHandler = onMessage;
    },
    closeInput() {
      openInputId = null;
      inputHandler = null;
    },
    openOutput(id: string) {
      if (!outputs.some((p) => p.id === id))
        throw new Error(`Unknown output: ${id}`);
      openOutputId = id;
    },
    closeOutput() {
      openOutputId = null;
    },
    send(msg: MidiRealtimeMessage) {
      if (!openOutputId) return;
      if (this.throwOnSend) throw this.throwOnSend;
      sent.push(msg);
    },
    emitInput(msg: MidiRealtimeMessage) {
      if (openInputId && inputHandler) inputHandler(msg);
    },
    dispose() {
      openInputId = null;
      openOutputId = null;
      inputHandler = null;
      sent.length = 0;
      this.throwOnSend = null;
    },
  };
}
```

### Sterowanie Czasem i Eliminacja Ryzyk Flakiness

Mieszanie zegarów wirtualnych Vitest (`vi.useFakeTimers()`) z asynchronicznymi obietnicami dyskowymi pliku konfiguracyjnego oraz subskrypcjami transportu rodzi ryzyko powstawania wyścigów (_race conditions_) i wycieków pamięci . W celu eliminacji niestabilności testów należy stosować ścisły wzorzec czyszczenia w `afterEach`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTransportEngine } from "../transport/engine.js";
import { createMidiHost } from "./host.js";
import { createMockMidiBackend } from "./mock-backend.js";

describe("midi host - deterministic suite", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // 1. Czyszczenie timerow Vitest
    vi.clearAllTimers();
    vi.useRealTimers();

    // 2. Przywrócenie mockow i szpiegów
    vi.restoreAllMocks();

    // 3. Przywrócenie zmiennych środowiskowych
    process.env = originalEnv;
  });

  it("handles deterministic time and program change debounce", async () => {
    vi.useFakeTimers();
    let virtualTime = 1_000_000;
    const transport = createTransportEngine({ now: () => virtualTime });
    const backend = createMockMidiBackend();
    const receivedPrograms: number[] = [];

    const host = createMidiHost(transport, {
      backend,
      now: () => virtualTime,
      onProgramChange: (prog) => receivedPrograms.push(prog),
    });

    host.setConfig({ inputId: "mock-in-1" });

    // Emisja dwóch komunikatów PC w krótkim czasie
    backend.emitInput({ type: "program", channel: 0, program: 12 });
    virtualTime += 10;
    backend.emitInput({ type: "program", channel: 0, program: 24 });

    expect(receivedPrograms).toHaveLength(0);

    // Przesunięcie zegara o pełne okno debounce
    await vi.advanceTimersByTimeAsync(50);

    expect(receivedPrograms).toEqual([24]);

    host.dispose();
    transport.dispose();
  });
});
```

---

## 5. Priorytetyzacja Pokrycia i Macierz Ryzyka

Strategia testowa priorytetyzuje obszary funkcjonalne pod kątem ich wpływu na stabilność występów scenicznych. Najwyższy priorytet przypisano synchronizacji zegarowej, której awaria powoduje natychmiastowe rozjechanie się urządzeń wykonawczych .

| Priorytet | Obszar Funkcjonalny          | Wpływ Awarii na System                                                                 | Cel Pokrycia Testowego                                              |
| :-------- | :--------------------------- | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------ |
| **P0**    | Clock OUT / IN & SPP Sync    | **Krytyczny**: Rozsynchronizowanie sekwencerów i syntezatorów .                        | 100% logicznych ścieżek `emitClocksThrough` i `sendTransportEdge` . |
| **P1**    | PC Debounce & Channel Filter | **Wysoki**: Złe presety brzmieniowe, zawieszenie procesora przy zalewie sygnałów .     | Weryfikacja filtrowania kanałów i okna 50ms .                       |
| **P2**    | Panic & Safety-Net Isolation | **Średni/Wysoki**: Zawieszone nuty (stuck notes) lub niepożądana transmisja ze Spare . | Pełne pokrycie przerywania pętli i weryfikacji ról .                |
| **P3**    | Config Persistence & Boot    | **Niski/Średni**: Błędne odczyty portów przy restarcie serwera .                       | Pokrycie błędów uszkodzonego pliku JSON i nadpisań ENV .            |

---

## 6. Mapa Niepokrytych Linii Kodowych (Uncovered Lines) → Scenariusz Testowy

Analiza porównawcza kodu [`apps/server/src/midi/host.ts`](../../../../apps/server/src/midi/host.ts) z istniejącym zestawem testów w [`host.test.ts`](../../../../apps/server/src/midi/host.test.ts) wykazuje specyficzne luki w pokryciu logicznym. Tabela wskazuje dokładnie fragmenty kodu wymagające uzupełnienia.

| Linie Kodowe | Fragment Logiki                                                | Opis Luki w Pokryciu                                                                                                                      | Proponowany Test Jednostkowy                                                                                                                                            |
| :----------- | :------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **72–75**    | `catch` w konstruktorze przy odczycie `configFile`             | Uszkodzony plik konfiguracyjny JSON wywołuje wyjątek przechwytywany w bloku `catch`, co jest logowane bez załamania modułu .              | Utwórz niepoprawny plik JSON (`{corrupt`). Utwórz hosta z tym plikiem i upewnij się, że załadowano domyślną konfigurację boot z env .                                   |
| **121–125**  | Limit `MAX_CLOCK_BURST` w `emitClocksThrough`                  | Brak testu sprawdzającego sytuację, w której wymagana delta zegara przekracza 192 impulsy .                                               | Wykonaj skok pozycji z 0 do 100 000 ticków przy odtwarzaniu. Zweryfikuj, że wyemitowano dokładnie 192 impulsy `clock` .                                                 |
| **122–124**  | Błąd `safeSend` wewnątrz pętli `emitClocksThrough`             | Jeśli `safeSend` zwróci `false` w połowie pętli burst, wywoływana jest funkcja `stopClockOut()` .                                         | Ustaw `throwOnSend` w mocku po wysłaniu 3. zegara. Sprawdź, czy pętla natychmiast się przerwie, a `clockOutActive` zmieni stan na `false` .                             |
| **138–142**  | Błąd `safeSend` przy wysyłaniu `spp` w `sendTransportEdge`     | Awaria wysyłania komunikatu SPP przy starcie zatrzymuje dalszą emisję nagłówka krawędzi .                                                 | Skonfiguruj backend tak, aby wyrzucał wyjątek przy wiadomości typu `spp`. Zweryfikuj, że komunikat `start` lub `continue` nie zostanie wyemitowany .                    |
| **169–173**  | Skok pozycji przy odtwarzaniu (`Math.abs > ppq`)               | Przepływ wyzwalający ponowną emisję `spp` oraz `continue` zamiast standardowej emisji `clock` .                                           | Włącz odtwarzanie, a następnie wykonaj `transport.seek( position + PPQ + 10 )`. Zweryfikuj, że backend otrzymał nową sekwencję `spp` + `continue` .                     |
| **217–221**  | Obsługa błędu zapisu pliku w `setConfig`                       | Catch block w `setConfig` wywoływany w sytuacji, gdy zapis pliku konfiguracyjnego zakończy się niepowodzeniem .                           | Podaj ścieżkę do `configFile` w katalogu tylko do odczytu. Wywołaj `setConfig()`, sprawdzając czy `getStatus().lastError` zawiera komunikat błędu I/O .                 |
| **230–234**  | Odbiór MIDI IN `continue` przy `lastSppTicks == null`          | Po odebraniu `continue` bez wcześniejszego `spp`, transport powienien rozpocząć odtwarzanie od obecnej pozycji bez wykonywania seeka .    | Wyślij komunikat wejściowy `continue` bezpośrednio po inicjalizacji (bez wysyłania `spp`). Sprawdź, czy transport przeszedł w stan `playing=true` na pozycji 0 .        |
| **238–248**  | Podpięcie wyjścia w trakcie trwania odtwarzania (`applyPorts`) | Gdy transport jest już w stanie `playing`, wywołanie `applyPorts()` (np. przez `setConfig`) musi wyemitować krawędź startową .            | Uruchom transport (`play`), a następnie skonfiguruj `outputId`. Sprawdź, czy na nowo otwartym porcie wyjściowym natychmiast pojawią się komunikaty `spp` i `continue` . |
| **257–275**  | Częściowe niepowodzenie pętli `panic()`                        | Gdy błąd wysyłania wystąpi np. na 5. kanale, funkcja `panic()` musi natychmiast przerwać pracę i zwrócić `{ sent: false, channels: 0 }` . | Skonfiguruj backend, aby zgłaszał wyjątek po odebraniu 13 komunikatów CC. Wywołaj `panic()` i sprawdź, czy zwraca wynik `{ sent: false, channels: 0 }` .                |
| **104**      | Sprawdzanie `isMidiOutAllowed()` w trybie `spare`              | Węzeł pasywny (Spare) ma zablokowaną możliwość wysyłania jakichkolwiek komunikatów MIDI OUT .                                             | Ustaw `process.env.STAGESYNC_SAFETY_ROLE = "spare"`. Wywołaj `sendProgramChange` oraz `panic()` – zweryfikuj, że do backendu nie trafiły żadne pakiety .                |

---

## 7. Wnioski i Rekomendacje

Przeanalizowany moduł [`apps/server/src/midi/host.ts`](../../../../apps/server/src/midi/host.ts) wykazuje wysoki stopień dojrzałości architektonicznej . Izolacja błędów I/O wewnątrz `safeSend` oraz ścisłe powiązanie zegara wyjściowego z deltywicznym przeliczaniem ticków transportu gwarantują stabilność działania serwera . Udostępnienie dedykowanego pliku testowego `host-edges.test.ts` pokrywającego wykazane w powyższej tabeli luki logiczne pozwoli uzyskać bliskie 100% pokrycie gałęzi (_branch coverage_) przy zachowaniu pełnej deterministyczności pętli CI/CD.

---

Powered by [AI Exporter](https://saveai.net)

> From: https://gemini.google.com/app/92cbdb3a2d09fb8b

# you asked

message time: 2026-07-27 14:27:51

Jesteś ekspertem od testów WebSocket w StageSync server. Przeanalizuj [`apps/server/src/transport/ws.ts`](../../../../apps/server/src/transport/ws.ts) — broadcast transport tick + stage/liveDesk/setlist hubs, client presence hello.

CEL ANALIZY
[`transport-api.test.ts`](../../../../apps/server/src/transport-api.test.ts) pokrywa podstawy REST+WS; `attachTransportWs` ma luki w hub broadcast, presence, error handling, malformed messages.

PYTANIA BADAWCZE
1. Connection handshake: initial tick + liveDesk snapshot + setlist + stage cues — wszystkie kombinacje optional hubs?
2. `transport.onChange` broadcast — wielu klientów, closed socket skip?
3. `client_hello` message: displayName, roles, latencyMs — upsert presence; malformed JSON ignored?
4. Message length > 8192 — drop?
5. `wss.on('error')` — czy testować (process survival)?
6. Cleanup on `wss.close`: unsubscribe wszystkich hubów?
7. Zod `TransportTickMessageSchema.parse` w send — invalid message handling?

KONTEKST
- Path `/ws/transport`; biblioteka `ws`.
- Wzorzec testów: createServer + WebSocket client w [`transport-api.test.ts`](../../../../apps/server/src/transport-api.test.ts).
- Vitest + prawdziwy WS na localhost.

OCZEKIWANY OUTPUT
1. Lista testów integration (multi-client WS).
2. Mocki: minimal TransportEngine, opcjonalne StageHub/LiveDesk/SetlistHub/ClientPresence stubs.
3. Ryzyka flaky: timing connect/message — wzorce `await new Promise` z timeout.
4. Propozycja extract pure helpers jeśli są (obecnie mostly side effects).
5. Priorytety: broadcast correctness > presence > error resilience.

---

# gemini response

Oto ułożony plan, jak pracować nad tym zagadnieniem. Jeśli chcesz, abym go zmienił, poinformuj mnie o tym.
http://googleusercontent.com/deep_research_confirmation_content/0

---

# you asked

message time: 2026-07-27 14:32:32

Zacznij wyszukiwanie

---

# gemini response

I've completed your research. Feel free to ask me follow-up questions or request changes.

Plan Testów StageSync WebSocket

# Architektura i Strategia Testów Integracyjnych WebSocket Transport w StageSync Server

Moduł transportu WebSocket zlokalizowany w ścieżce [`apps/server/src/transport/ws.ts`](../../../../apps/server/src/transport/ws.ts) pełni funkcję centralnego węzła dystrybucji stanu w czasie rzeczywistym dla całego środowiska StageSync . Jego podstawowym zadaniem jest realizacja wzorca rozgłaszania jedno- do-wielokrotnego (fanout) dla zdarzeń generowanych przez silnik odtwarzacza (`TransportEngine`), sklepu ustawień konsolety (`LiveDeskStore`), dystrybutora migawek listy utworów (`SetlistHub`), komunikatora scenicznego (`StageHub`) oraz modułu śledzenia obecności klientów (`ClientPresence`) . Dotychczasowa pakietowa weryfikacja w [`transport-api.test.ts`](../../../../apps/server/src/transport-api.test.ts) skupiała się na podstawowych operacjach interfejsu REST oraz pojedynczym połączeniu WebSocket . Zapewnienie pełnej niezawodności w warunkach koncertowych wymaga jednak głębokiej analizy wieloklienckiej, odporności na uszkodzone ramki danych, weryfikacji właściwego czyszczenia zasobów oraz eliminacji ryzyka nieobsłużonych wyjątków .

---

## Analiza Cyklu Życia Połączenia WebSocket i Mechanizmów Dystrybucji

Inicjalizacja połączenia na punkcie końcowym `/ws/transport` uruchamia sekwencyjny proces przygotowania gniazda i wysyłki ramek powitalnych . Podczas zdarzenia `connection` serwer przypisuje gniazdowi unikalny identyfikator `randomUUID()`, rejestruje wstępne połączenie w obiekcie `presence` i emituje stan początkowy . Przeanalizowanie mechanizmów wykonawczych w odpowiedzi na postawione pytania badawcze ujawnia kluczowe zależności architektoniczne oraz potencjalne punkty krytyczne .

### Handshake Połączenia i Obsługa Hubów Opcjonalnych

Sekwencja startowa zakłada obowiązkowe przesłanie wiadomości typu `transport_tick` poprzez funkcję pomocniczą `send(ws, transport.toTickMessage())` . W dalszej kolejności serwer bada obecność opcjonalnych modułów pomocniczych . Jeśli przekazano instancję `liveDesk`, wysyłana jest natychmiastowa ramka `liveDesk.snapshotMessage()` . Następnie, jeśli zdefiniowano `setlistHub` i jego metoda `snapshotMessage()` zwraca wartość inną niż `null`, do klienta trafia migawka zestawu . Na końcu, w przypadku obecności `stageHub`, serwer iteruje po tablicy aktywnych komunikatów wywołaniem `stageHub.snapshotCues()` i emituje każdy komunikat sceniczny jako odrębną ramkę WebSocket .

Nieobecność któregokolwiek z hubów jest bezpiecznie obsługiwana przez składnię opcjonalnego wywoływania oraz instrukcje warunkowe . Dzięki temu brak hubów nie powoduje wyjątku `TypeError` . Należy jednak wskazać, że brak sprawdzania stanu gniazda `ws.readyState` pomiędzy kolejnymi wywołaniami wewnątrz zdarzenia `connection` może prowadzić do próby zapisu na gnieździe, które zostało gwałtownie zamknięte przez klienta w trakcie trwania procedury handshake.

### Rozgłaszanie Stanu i Izolacja Zamkniętych Gniazd

Dystrybucja zmian stanu zegara odbywa się za pośrednictwem subskrypcji zdarzenia `transport.onChange` . Po odebraniu sygnału zmodyfikowany stan jest serializowany, a następnie serwer iteruje po zbiorze `wss.clients` . Kluczowym elementem ochrony przed błędami zapisu jest weryfikacja warunku `client.readyState === client.OPEN` . Gniazda znajdujące się w stanach `CONNECTING`, `CLOSING` lub `CLOSED` są cicho pomijane .

Mechanizm ten jest analogicznie powielony dla zdarzeń generowanych przez `stageHub`, `liveDesk` oraz `setlistHub` . Istnieje jednak subtelne ryzyko wyścigu w sytuacji, gdy gniazdo przejdzie w stan zamykania dokładnie w momencie wykonywania pętli `for...of` . Ponieważ wywołanie `client.send()` nie jest otoczone blokiem `try...catch`, ewentualny błąd sterownika sieciowego przy próbie zapisu do uszkodzonego bufora socketu może doprowadzić do przerwania pętli rozgłoszeniowej dla pozostałych podłączonych klientów.

### Przetwarzanie Komunikatów Wejściowych i Stan Obecności

Jedyną wiadomością przyjmowaną przez serwer po nawiązaniu połączenia jest komunikat rejestracji obecności wykonawcy . Po odebraniu zdarzenia `message` serwer sprawdza twardy limit długości tekstu :

$\text{długość ramek} \le 8192 \text{ bajtów}$

Jeśli warunek jest spełniony, następuje próba sparsowania ciągu JSON w bloku `try...catch` . Gdy odczytany obiekt posiada pole `type === "client_hello"`, serwer przekazuje parametry `displayName`, `roles` oraz `latencyMs` do metody `presence.upsert(id, payload)` .

Moduł `createClientPresence` dokonuje ścisłej sanitaryzacji danych . Nazwa użytkownika jest czyszczona z wielokrotnych spacji i przycinana do maksymalnie 40 znaków . Zbiór ról jest filtrowany w oparciu o dopuszczalną listę (`karaoke`, `grid`, `score`, `drums`, `timeline`), a ich liczba zostaje ograniczona do maksymalnie dwóch . Wartość opóźnienia `latencyMs` jest konwertowana na liczbę skończoną i ograniczana do zakresu od 0 do 60 000 ms . Wszelkie wiadomości niepoprawne składniowo lub niebędące komunikatami `client_hello` są bezgłośnie ignorowane, co zabezpiecza serwer przed złośliwymi ładunkami bez zrywania połączenia .

### Limit Długości Wiadomości oraz Błędy Serwera WSS

Twardy limit rozmiaru wiadomości (8192 bajty) stanowi skuteczną barierę chroniącą proces przed alokacją nadmiernej ilości pamięci przy parsowaniu złożonych struktur JSON . Przekroczenie tej wartości powoduje natychmiastowe przerwanie dalszego przetwarzania zdarzenia bez zgłaszania błędu do klienta .

W kontekście przetrwania procesu aplikacji kluczowe znaczenie ma rejestracja słuchacza `wss.on("error", ...)` . W architekturze Node.js zdarzenia błędu emitowane przez `EventEmitter` (w tym przejęte błędy gniazd z bazowego serwera HTTP) kończą się natychmiastowym wyłączeniem procesu, jeśli nie podpięto do nich żadnego słuchacza . Istnienie powiązania logującego w `attachTransportWs` gwarantuje, że sytuacje awaryjne na poziomie warstwy sieciowej nie powodują zatrzymania głównego wątku serwera .

### Odłączenie Subskrypcji i Walidacja Schematu Zod

Zamknięcie serwera WebSocket poprzez wywołanie `wss.close()` aktywuje wewnętrzne zdarzenie `'close'`, które odpowiada za wykonanie funkcji czyszczących . Serwer wywołuje zwrócone wcześniej funkcje wyrejestrowujące `unsubscribe()`, `unsubStage()`, `unsubLive()` oraz `unsubSetlist()` . Zapobiega to wyciekom pamięci, w których nieaktywny obiekt `WebSocketServer` pozostawałby w pamięci reprezentowany przez referencje w długożyjących hubach .

Krytycznym punktem podatności jest natomiast użycie schematu `TransportTickMessageSchema.parse(raw)` wewnątrz funkcji `send` oraz w słuchaczu `transport.onChange` . Jeżeli silnik transportowy wyemituje stan niezgodny ze specyfikacją Zod (np. wartość BPM poza zakresem lub niecałkowitą pozycję w tickach), funkcja `parse` rzuci synchroniczny wyjątek `ZodError` . W przypadku zdarzenia handshake wywoła to błąd wewnątrz procedury połączenia, natomiast w trakcie rozgłaszania przerwie pętlę i uniemożliwi dostarczenie wiadomości do kolejnych gniazd w zbiorze .

---

## Zestawienie Scenariuszy Testów Integracyjnych dla Wielu Klientów

W celu kompletnego pokrycia mechanizmów transportu WebSocket w środowisku testowym Vitest zaprojektowano pakiet testów integracyjnych . Testy te symulują równoległe połączenia wielu klientów, weryfikują izolację błędów oraz sprawdzają spójność dostarczania ramek danych .

| ID Testu | Kategoria | Scenariusz Testowy | Stan Wstępny | Akcja Testowa | Oczekiwany Rezultat |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Handshake | Inicjalizacja z pełnym kompletem hubów  | Utworzone i zasilone dane we wszystkich 4 hubach . | Połączenie nowego klienta WS do `/ws/transport` . | Odbiór w ścisłej kolejności: `transport_tick`, `live_desk`, `setlist_snapshot` oraz serii ramek `stage_cue` . |
| **TC-02** | Handshake | Inicjalizacja bez opcjonalnych hubów  | Przekazana wyłącznie instancja `TransportEngine` . | Połączenie nowego klienta WS do `/ws/transport` . | Odbiór dokładnie jednej ramki `transport_tick`. Brak jakichkolwiek błędów po stronie serwera . |
| **TC-03** | Fanout | Rozgłaszanie zegara do wielu klientów  | Aktywne 3 połączenia klientów WS (`C1`, `C2`, `C3`) . | Wywołanie zmiany pozycji lub tempa w `TransportEngine` . | Wszyscy trzej klienci odbierają zaktualizowaną ramkę `transport_tick` o identycznym znaczniku czasu . |
| **TC-04** | Fanout | Izolacja i pomijanie zamkniętych gniazd  | Podłączeni klienci `C1` i `C2`. Gniazdo `C2` zostaje zamknięte wywołaniem `close()` . | Emisja nowej wiadomości w `StageHub` . | Klient `C1` odbiera wiadomość. Serwer nie zgłasza błędów zapisu dla klienta `C2` . |
| **TC-05** | Presence | Rejestracja i aktualizacja `client_hello`  | Klient `C1` podłączony do serwera . | Wysyłka poprawnej ramki JSON `client_hello` z danymi profilu . | Wywołanie `presence.upsert` z poprawnym identyfikatorem socketu i obecnością klienta na liście . |
| **TC-06** | Presence | Sanitaryzacja niepoprawnych ról i przekroczeń długości  | Klient `C1` podłączony do serwera . | Wysyłka `client_hello` z nazwą 100 znaków i niedozwoloną rolą . | Nazwa w rejestrze zostaje przycięta do 40 znaków, a nieprawidłowa rola odrzucona . |
| **TC-07** | Presence | Automatyczne usuwanie po rozłączeniu  | Klient `C1` zarejestrowany w module `presence` . | Fizyczne przerwanie połączenia przez klienta `C1` . | Wywołanie `presence.remove(id)`. Klient znika z listy obecności . |
| **TC-08** | Boundary | Ignorowanie ramek przekraczających 8192 bajty  | Klient `C1` podłączony do serwera . | Wysyłka ramki JSON o skumulowanym rozmiarze 8193 bajtów . | Ramka zostaje odrzucona. Stan obecności nie ulega zmianie, gniazdo pozostaje otwarte . |
| **TC-09** | Boundary | Odporność na uszkodzony format JSON  | Klient `C1` podłączony do serwera . | Wysyłka niepoprawnego ciągu tekstowego `{ malformed json ...` . | Serwer ignoruje błąd parsowania. Gniazdo nie zostaje zerwane . |
| **TC-10** | Resilience | Obsługa błędu bazowego serwera WSS  | Uruchomiony serwer transportowy WebSocket . | Sztuczne wyemitowanie zdarzenia `wss.emit('error', new Error())` . | Błąd trafia do przechwycenia. Główny proces testowy kontynuuje działanie . |
| **TC-11** | Teardown | Pełne czyszczenie subskrypcji przy zamknięciu  | Serwer powiązany ze wszystkimi 4 hubami . | Wywołanie metody `wss.close()` . | Odłączenie wszystkich listenerów ze wszystkich hubów (`listeners.size === 0`) . |

---

## Specyfikacja Obiektów Makietowych (Stubs i Mocks)

Aby zapewnić całkowitą izolację testów integracyjnych warstwy transportowej od operacji na dysku oraz skomplikowanej logiki biznesowej, konieczne jest zastosowanie lekkich atrap obiektów . Każda atrapa musi wiernie odtwarzać interfejs zdarzeniowy odpowiadającego jej modułu produkcyjnego.

```typescript
import type { TransportEngine } from "./transport/engine.js";
import type { ClientPresence, PresenceClient } from "./client-presence.js";
import type { LiveDeskStore } from "./live-desk.js";
import type { StageHub } from "./transport/stage-hub.js";
import type { SetlistHub } from "./transport/setlist-hub.js";
import type { TransportTickMessage, LiveDeskMessage, SetlistSnapshotMessage, StageCueMessage } from "@stagesync/shared";

export function createTransportEngineStub(): TransportEngine & { emitTick: (msg?: Partial<TransportTickMessage>) => void } {
  const listeners = new Set<(msg: TransportTickMessage) => void>();
  let currentTick: TransportTickMessage = {
    type: "transport_tick",
    playing: false,
    positionTicks: 0,
    bpm: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    ppq: 192,
    activeProjectId: null,
    loop: null,
    serverTimeMs: 1000,
    sentAtMs: 1000,
  };

  return {
    toTickMessage: () => currentTick,
    onChange: (fn) => {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    emitTick: (override) => {
      if (override) currentTick = { ...currentTick, ...override };
      listeners.forEach((fn) => fn(currentTick));
    },
    getState: () => currentTick,
    getPlaybackStatus: () => "STOPPED",
    getActiveProjectId: () => currentTick.activeProjectId,
    isLooping: () => false,
    loadProject: () => currentTick,
    play: () => currentTick,
    pause: () => currentTick,
    stop: () => currentTick,
    seek: () => currentTick,
    setLoop: () => currentTick,
    clearActiveIf: () => null,
    dispose: () => { listeners.clear(); },
  } as unknown as TransportEngine & { emitTick: (msg?: Partial<TransportTickMessage>) => void };
}
```

Do weryfikacji pozostałych modułów pomocniczych wykorzystuje się uproszczone atrapy stanowe reprezentowane w poniższej specyfikacji.

| Obiekt Makietowy | Symulowany Interfejs | Zarządzanie Stanem Wewnętrznym | Sposób Wyzwalania Zdarzeń |
| :--- | :--- | :--- | :--- |
| `StageHubStub` | `snapshotCues()`, `onMessage()` . | Wewnętrzna tablica `StageCueMessage[]` oraz zbiór listenerów `Set` . | Metoda `emitCue(msg)` dodaje komunikat do tablicy i rozgłasza go do słuchaczy . |
| `LiveDeskStoreStub` | `snapshotMessage()`, `onMessage()` . | Obiekt `LiveDeskMessage` przechowujący transpozycję i parametry synchronizacji . | Metoda `emitUpdate(patch)` aktualizuje stan i powiadamia słuchaczy . |
| `SetlistHubStub` | `snapshotMessage()`, `onMessage()` . | Instancja `SetlistSnapshotMessage` lub wartość `null` . | Metoda `publish(msg)` zmienia zapamiętaną migawkę i emituje zdarzenie . |
| `ClientPresenceStub` | `connect()`, `upsert()`, `remove()`, `list()` . | Mapa `Map<string, PresenceClient>` indeksowana identyfikatorem socketu `id` . | Wywołania metod modyfikują mapę w pamięci analogicznie do modułu produkcyjnego . |

---

## Mitigacja Ryzyk Niestabilności Testów Asynchronicznych

Testowanie sieciowych gniazd WebSocket w środowisku lokalnym jest podatne na problemy z synchronizacją czasową (race conditions) . Opóźnienia w uaktywnianiu pętli zdarzeń Node.js, czas potrzebny na wykonanie powitania TCP oraz asynchroniczny charakter biblioteki `ws` mogą powodować, że asercje testowe wykonają się przed odebraniem ramek przez klienta .

W celu wyeliminowania niedeterministycznych opóźnień typu `setTimeout` wprowadzono wzorzec obietnic deterministycznych z limitem czasu (timeout). Pierwszy z nich, pomocnik `waitForMessage`, przechwytuje nadchodzące wiadomości z gniazda i weryfikuje je za pomocą predykatu:

```typescript
import { WebSocket } from "ws";

export function waitForMessage<T = unknown>(
  ws: WebSocket,
  predicate: (msg: any) => boolean,
  timeoutMs = 1500
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", handler);
      reject(new Error(`Przekroczono limit czasu (${timeoutMs}ms) oczekując na wiadomość WebSocket`));
    }, timeoutMs);

    function handler(data: unknown) {
      try {
        const parsed = JSON.parse(String(data));
        if (predicate(parsed)) {
          clearTimeout(timer);
          ws.off("message", handler);
          resolve(parsed as T);
        }
      } catch {
        // Ignorowanie ramek niepasujących do formatu podczas filtrowania
      }
    }

    ws.on("message", handler);
  });
}
```

W przypadku scenariuszy wieloklienckich krytyczne jest upewnienie się, że wszystkie gniazda testowe przeszły do stanu `WebSocket.OPEN` przed wyemitowaniem zdarzenia rozgłoszeniowego przez serwer. Do tego celu służy funkcja synchronizująca `waitForAllOpen`:

```typescript
export function waitForAllOpen(sockets: WebSocket[], timeoutMs = 1500): Promise<void> {
  return Promise.all(
    sockets.map((ws) => {
      if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Przekroczono limit czasu otwarcia gniazda WebSocket")),
          timeoutMs
        );
        ws.once("open", () => {
          clearTimeout(timer);
          resolve();
        });
        ws.once("error", reject);
      });
    })
  ).then(() => undefined);
}
```

---

## Rekomendacje Refaktoryzacji i Ekstrakcja Czystych Helperów

Obecna struktura pliku [`apps/server/src/transport/ws.ts`](../../../../apps/server/src/transport/ws.ts) charakteryzuje się bezpośrednim nagromadzeniem efektów ubocznych wewnątrz procedury instalacji `attachTransportWs` . Przeniesienie czystej logiki przetwarzania do odrębnych funkcji pomocniczych znacząco zwiększy testowalność kodu na poziomie jednostkowym.

### Ekstrakcja Logiki Parsowania Wiadomości Powitalnych

Mechanizm odczytu wiadomości `client_hello` łączy sprawdzenie długości ciągu, bezpieczne parsowanie struktury JSON oraz wstępną weryfikację pól . Wydzielenie tej logiki do czystej funkcji `parseClientHelloMessage` umożliwia jej bezpośrednie testowanie bez konieczności uruchamiania serwera HTTP i tworzenia gniazd sieciowych:

```typescript
export function parseClientHelloMessage(
  data: unknown,
  maxLength = 8192
): { displayName?: unknown; roles?: unknown; latencyMs?: unknown } | null {
  const text = String(data);
  if (text.length > maxLength) return null;
  try {
    const raw = JSON.parse(text);
    if (raw && typeof raw === "object" && raw.type === "client_hello") {
      return {
        displayName: raw.displayName,
        roles: raw.roles,
        latencyMs: raw.latencyMs,
      };
    }
  } catch {
    // Niepoprawny format JSON
  }
  return null;
}
```

### Ekstrakcja Generatora Ramek Handshake

Przygotowanie pakietu ramek powitalnych wysyłanych natychmiast po połączeniu klienta można odizolować do czystej funkcji `buildHandshakeMessages` . Wyeliminujemy w ten sposób ryzyko przeplatania operacji I/O z logiką decyzyjną dotyczącą tego, które huby są aktywne:

```typescript
export function buildHandshakeMessages(
  transport: TransportEngine,
  liveDesk?: LiveDeskStore,
  setlistHub?: SetlistHub,
  stageHub?: StageHub
): unknown[] {
  const messages: unknown[] = [transport.toTickMessage()];
  if (liveDesk) {
    messages.push(liveDesk.snapshotMessage());
  }
  const setlistSnap = setlistHub?.snapshotMessage();
  if (setlistSnap) {
    messages.push(setlistSnap);
  }
  if (stageHub) {
    messages.push(...stageHub.snapshotCues());
  }
  return messages;
}
```

### Zabezpieczenie Serializacji i Walidacji Zod

Wywołanie `TransportTickMessageSchema.parse(raw)` w obecnej wersji bezpośrednio rzuca wyjątek w przypadku niepoprawnej struktury danych . Zaleca się wprowadzenie bezpiecznego opakowania serializującego `safeSerializeTick`, które przechwytuje błędy walidacji i zapobiega załamaniu pętli rozgłoszeniowej:

```typescript
export function safeSerializeTick(raw: unknown): string | null {
  const result = TransportTickMessageSchema.safeParse(raw);
  if (!result.success) {
    console.error("[stagesync-server] Błąd walidacji schematu TransportTickMessage:", result.error);
    return null;
  }
  return JSON.stringify(result.data);
}
```

---

## Priorytetyzacja Wdrożenia i Wnioski Strategiczne

W celu zapewnienia najwyższej sprawności i niezawodności systemu StageSync podczas występów na żywo, prace wdrożeniowe zostały ustrukturyzowane według stopnia wpływu na ciągłość działania odtwarzacza scenicznego .

| Priorytet | Obszar Funkcjonalny | Uzasadnienie Biznesowe i Techniczne |
| :--- | :--- | :--- |
| **P0 (Krytyczny)** | Poprawność Rozgłaszania (Broadcast Correctness)  | Błędy w fanout zegara odtwarzacza lub zatrzymanie pętli rozgłoszeniowej na uszkodzonym gnieździe powodują natychmiastową utratę synchronizacji urządzeń na scenie . |
| **P1 (Wysoki)** | Bezpieczeństwo Handshake i Rejestracja Obecności  | Poprawna inicjalizacja gwarantuje, że podłączający się klienci natychmiast otrzymują aktualny stan sceny, a ich obecność jest widoczna w konsolecie Admina . |
| **P2 (Średni)** | Odporność na Błędy i Serwerowe Granice Danych  | Zabezpieczenie przed uszkodzonymi ramkami JSON, przekroczeniem limitu 8192 bajtów oraz błędami Zod chroni proces przed niekontrolowanym zatrzymaniem . |

Przedstawiona strategia testów integracyjnych w połączeniu z proponowaną refaktoryzacją czystych funkcji pomocniczych eliminuje dotychczasowe luki w pokryciu kodu modułu [`apps/server/src/transport/ws.ts`](../../../../apps/server/src/transport/ws.ts) . Wdrożenie opisanych wzorców asynchronicznych i atrap obiektowych zagwarantuje pełną deterministyczność zestawu testowego Vitest oraz wysoką odporność serwera StageSync w warunkach produkcyjnych .

---
Powered by [AI Exporter](https://saveai.net)
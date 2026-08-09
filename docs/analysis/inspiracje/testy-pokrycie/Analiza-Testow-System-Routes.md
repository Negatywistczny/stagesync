> From: https://gemini.google.com/app/78dcfd8f74672ac3

# you asked

message time: 2026-07-27 14:24:44

Jesteś ekspertem od testów Express w StageSync server. Przeanalizuj [`apps/server/src/routes/system.ts`](../../../../apps/server/src/routes/system.ts) — endpointy operatora: auth PIN, safety-net, logs SSE, network, settings, backup/restore, update status, lifecycle restart/shutdown.

CEL ANALIZY
Uzupełnić pokrycie tras systemowych poza istniejącymi [`system-routes.test.ts`](../../../../apps/server/src/system-routes.test.ts), [`system-router-unit.test.ts`](../../../../apps/server/src/system-router-unit.test.ts), [`system-lifecycle-routes.test.ts`](../../../../apps/server/src/system-lifecycle-routes.test.ts).

PYTANIA BADAWCZE
1. Które route handlers w `createSystemRouter` nie mają testów HTTP (GET/POST)?
2. `assertLifecycleAllowed`: loopback vs LAN + HOST_TOKEN — wszystkie kombinacje?
3. `fetchLatestReleaseVersion` / `isSemverNewer`: mock GitHub API — jakie statusy 401/403/404/timeout?
4. POST `/promote`: pause transport gdy PLAYING (ADR 0017) — test z mock `TransportEngine`?
5. Restore backup: `restoreFromBackup`, `restoreBulkFromBackups`, `restoreFromZipArchive` — error paths?
6. Settings PUT: `writeManagedSettings`, `listRestartRequiredKeys` — walidacja Zod body?
7. Diagnostics export / browse directory — 501 bez dataDir już testowane — co jeszcze?

KONTEKST
- Express router montowany pod `/api/system`.
- Env-driven: `STAGESYNC_HOST_TOKEN`, `STAGESYNC_ALLOW_REMOTE_LIFECYCLE`, update channel.
- Vitest + prawdziwy HTTP server na losowym porcie (wzorzec z istniejących testów).

OCZEKIWANY OUTPUT
1. Lista testów per endpoint (status code + body shape).
2. Mocki: `fetch` (GitHub), `fs`, `lifecycle`, `transport`, env vars (with cleanup).
3. Ryzyka flaky: SSE stream timing — jak testować bez race.
4. Fixtures: tmp dataDir, minimal backup zip.
5. Priorytety według ryzyka operatorskiego.

---

# gemini response

Oto ułożony plan działania. Jeśli chcesz go zmienić, poinformuj mnie o tym.
http://googleusercontent.com/deep_research_confirmation_content/0

---

# you asked

message time: 2026-07-27 14:27:52

Zacznij wyszukiwanie

---

# gemini response

I've completed your research. Feel free to ask me follow-up questions or request changes.

Plan Testów Express StageSync

# Analiza Pokrycia Testowego i Plan Rozbudowy Zestawu Testów Express dla Tras Systemowych StageSync Server

Moduł tras systemowych [`apps/server/src/routes/system.ts`](../../../../apps/server/src/routes/system.ts) w serwerze StageSync stanowi krytyczny komponent zarządzający infrastrukturą operacyjną aplikacji . Odpowiada on za autoryzację operatorską, sterowanie rolami w klastrze bezpieczeństwa (Safety Net), zarządzanie plikami konfiguracyjnymi `.env`, inspekcję i czyszczenie logów, odzyskiwanie stanów z kopii zapasowych, kontrolę cyklu życia procesu (restart oraz shutdown) oraz komunikację z zewnętrznym API w celu weryfikacji aktualizacji .

Mimo że w repozytorium istnieją pakiety testowe [`system-routes.test.ts`](../../../../apps/server/src/system-routes.test.ts), [`system-router-unit.test.ts`](../../../../apps/server/src/system-router-unit.test.ts) oraz [`system-lifecycle-routes.test.ts`](../../../../apps/server/src/system-lifecycle-routes.test.ts), analiza kodu źródłowego wykazała szereg nieprzetestowanych ścieżek wykonania i warunków brzegowych . Wypełnienie tych luk jest kluczowe dla zagwarantowania stabilności serwera w warunkach produkcji scenicznej, gdzie awaria węzła lub nieoczekiwana zmiana stanu może doprowadzić do przerwania transmisji danych MIDI i sygnałów zegarowych .

---

## Analiza Pokrycia Testowego i Identyfikacja Handlerów

Obecne pokrycie testowe koncentruje się na podstawowych scenariuszach wywołania funkcji oraz wybranych stanach błędu . W pakiecie [`system-router-unit.test.ts`](../../../../apps/server/src/system-router-unit.test.ts) przetestowano brak konfiguracji katalogu danych (`dataDir`) przy eksporcie diagnostyki, zachowanie flagi PM2 podczas wyłączania serwera oraz podstawowe odczyty sieciowe . Z kolei [`system-routes.test.ts`](../../../../apps/server/src/system-routes.test.ts) weryfikuje nagłówki w odpowiedziach `/network`, czyszczenie bufora logów, wywołania aktualizacyjne Watchtower oraz filtrowanie rozszerzeń logów . Pakiet [`system-lifecycle-routes.test.ts`](../../../../apps/server/src/system-lifecycle-routes.test.ts) skupia się na podstawowym wywołaniu procedur restartu i zamknięcia procesu z poziomu pętli zwrotnej .

Wiele punktów końcowych montowanych w ramach `createSystemRouter` pod ścieżką `/api/system` nie posiada jednak pełnych integracyjnych testów HTTP sprawdzających kompletny cykl żądania i odpowiedzi (statusy HTTP, nagłówki, struktury JSON) . Szególnie istotne braki obejmują endpointy autoryzacji PIN, ręcznego promowania węzła Safety Net z uwzględnieniem sprzęgu z silnikiem transportu (ADR 0017), walidację schematów Zod dla zarządzanych ustawień, przeglądanie katalogów systemowych, awaryjne przywracanie projektów z archiwów ZIP oraz skrajne odpowiedzi interfejsu API serwisu GitHub .

| Endpoint HTTP | Metoda | Stan Pokrycia | Zidentyfikowane Luki do Uzupełnienia |
| :--- | :--- | :--- | :--- |
| `/operator-auth` | `GET` / `POST` | Brak testów HTTP | Brak weryfikacji flaga `required`, walidacji niepoprawnego kodu PIN oraz obsługi pustego korpusu żądania . |
| `/safety-net` | `GET` | Brak testów HTTP | Brak weryfikacji nagłówka `Cache-Control: no-store` oraz struktury roli w odpowiedzi JSON . |
| `/promote` | `POST` | Brak testów HTTP | Brak integracji z `TransportEngine` — weryfikacji automatycznego wstrzymania odtwarzania (`pause`) w stanie `PLAYING` wg ADR 0017 §3 . |
| `/logs` | `GET` | Pokryte ([`system-routes.test.ts`](../../../../apps/server/src/system-routes.test.ts)) | Zweryfikowano odczyt linii z bufora logów . |
| `/logs/stream` | `GET` | Częściowy | Przetestowano nagłówek `Content-Type`; brak testów odpornych na wyścigi (race conditions) i wycieki pamięci przy nagłym rozłączeniu klienta . |
| `/logs/clear` | `POST` | Pokryte ([`system-router-unit.test.ts`](../../../../apps/server/src/system-router-unit.test.ts)) | Zweryfikowano czyszczenie pierścieniowego bufora logów . |
| `/network` | `GET` | Pokryte ([`system-routes.test.ts`](../../../../apps/server/src/system-routes.test.ts)) | Pokryto podstawowe pola; brak weryfikacji parametrów `bindHost`, `updateChannel` oraz `autoUpdateDisabled` . |
| `/settings` | `GET` / `PUT` | Brak testów HTTP | Brak walidacji schematu Zod `PutServerSettingsBodySchema`, braku kontroli ACL z sieci LAN, weryfikacji kluczy `restartRequired` oraz odświeżania mDNS . |
| `/browse` | `GET` | Brak testów HTTP | Brak weryfikacji trybów `file` i `dir`, filtrowania po rozszerzeniu `ext`, zapobiegania wychodzeniu poza dozwolone ścieżki oraz obsługi błędów 400 . |
| `/restore` | `POST` | Brak testów HTTP | Brak testowania walidacji Zod `RestoreBackupBodySchema`, przywracania pojedynczych i hurtowych `.bak`, rozpakowywania archiwów `.zip` oraz wykrywania ataków Directory Traversal . |
| `/update-status` | `GET` | Częściowy | Pokryto przypadek z wyłączoną auto-aktualizacją; brak atrapowania GitHub API (401, 403, 404, timeout), weryfikacji kanałów (`beta`/`rc`) oraz trybów `desktop`/`console` . |
| `/apply-update` | `POST` | Pokryte ([`system-routes.test.ts`](../../../../apps/server/src/system-routes.test.ts)) | Zweryfikowano błędny korpus (400), brak środowiska (501) oraz odpowiedź Watchtower (200/502) . |
| `/restart` | `POST` | Pokryte ([`system-lifecycle-routes.test.ts`](../../../../apps/server/src/system-lifecycle-routes.test.ts)) | Pokryto wykonanie lifecycle; brak weryfikacji pełnej macierzy ACL dla adresów spoza loopbacku . |
| `/shutdown` | `POST` | Pokryte ([`system-lifecycle-routes.test.ts`](../../../../apps/server/src/system-lifecycle-routes.test.ts)) | Pokryto wykonanie lifecycle i flagę PM2; brak weryfikacji odmowy dostępu ACL z sieci LAN . |
| `/diagnostics/export`| `GET` | Częściowy | Pokryto przypadek braku `dataDir` (501) oraz odrzucanie plików spoza wzorca `.log`; brak weryfikacji powstawania poprawnego pliku ZIP, nagłówka `Content-Disposition` i dołączania `meta.json` . |

---

## Szczegółowa Specyfikacja Testów HTTP i Macierze Kontroli Dostępów

Zapewnienie bezpieczeństwa wykonywania operacji na serwerze opiera się na dwóch mechanizmach ochronnych: funkcji `assertLifecycleAllowed` chroniącej operacje restartu, zamknięcia, zmiany ustawień i przywracania danych, oraz funkcji `assertOperatorPinAllowed` wymagającej podania nagłówka z kodem PIN w przypadku żądań modyfikujących .

Funkcja `assertLifecycleAllowed` weryfikuje adres IP klienta HTTP . Adresy pętli zwrotnej (loopback: `127.0.0.1`, `::1`, `::ffff:127.0.0.1`) są uznawane za zaufane i przepuszczane automatycznie . W przypadku żądań pochodzących z sieci LAN dostęp jest przyznawany wyłącznie wtedy, gdy zmienna środowiskowa `STAGESYNC_ALLOW_REMOTE_LIFECYCLE` jest ustawiona na `1`, lub gdy żądanie zawiera poprawny token autoryzacyjny zgodny ze `STAGESYNC_HOST_TOKEN` (przekazany w nagłówku `Authorization: Bearer <token>` lub `x-stagesync-host-token`) . Brak spełnienia tych warunków musi skutkować odrzuceniem żądania z kodem odpowiedzi `403 Forbidden` .

| Adres IP Klienta | `STAGESYNC_ALLOW_REMOTE_LIFECYCLE` | `STAGESYNC_HOST_TOKEN` | Nagłówek Autoryzacji w Żądaniu | Oczekiwany Status HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `127.0.0.1` | `0` | Brak | Brak | `200 OK`  |
| `::1` | `0` | `token-123` | Brak | `200 OK`  |
| `192.168.1.100` | `0` | Brak | Brak | `403 Forbidden`  |
| `192.168.1.100` | `1` | Brak | Brak | `200 OK`  |
| `192.168.1.100` | `0` | `secret-token` | `Authorization: Bearer secret-token` | `200 OK`  |
| `192.168.1.100` | `0` | `secret-token` | `x-stagesync-host-token: secret-token` | `200 OK`  |
| `192.168.1.100` | `0` | `secret-token` | `Authorization: Bearer błędny-token` | `403 Forbidden`  |
| `192.168.1.100` | `0` | `secret-token` | `x-stagesync-host-token: błędny-token` | `403 Forbidden`  |

Drugim poziomem ochrony jest autoryzacja PIN operatora, obsługiwana przez endpointy `/operator-auth` oraz middleware dla operacji modyfikujących . Weryfikacja kodów PIN oraz parametryzacja pozostałych tras systemowych wymagają precyzyjnych testów uwzględniających oczekiwane statusy HTTP oraz kształt zwracanych obiektów JSON .

| Endpoint | Metoda | Warunek Wejściowy / Konfiguracja | Oczekiwany Status | Kształt Odpowiedzi JSON / Nagłówki |
| :--- | :--- | :--- | :--- | :--- |
| `/operator-auth` | `GET` | `STAGESYNC_OPERATOR_PIN` nieustawiony | `200 OK` | `{ "required": false }`  |
| `/operator-auth` | `GET` | `STAGESYNC_OPERATOR_PIN="1234"` | `200 OK` | `{ "required": true }`  |
| `/operator-auth` | `POST` | Body `{ "pin": "9999" }`, PIN="1234" | `403 Forbidden` | `{ "ok": false, "error": "Nieprawidłowy PIN operatora." }`  |
| `/operator-auth` | `POST` | Body `{ "pin": "1234" }`, PIN="1234" | `200 OK` | `{ "ok": true, "required": true }`  |
| `/safety-net` | `GET` | `STAGESYNC_SAFETY_ROLE="spare"` | `200 OK` | `{ "role": "spare", "midiOutAllowed": false }`  |
| `/promote` | `POST` | Transport w stanie `STOPPED` | `200 OK` | `{ "ok": true, "role": "master", "midiOutAllowed": true, "transportPaused": false }`  |
| `/promote` | `POST` | Transport w stanie `PLAYING` | `200 OK` | `{ "ok": true, "role": "master", "midiOutAllowed": true, "transportPaused": true }`  |
| `/settings` | `GET` | Dostęp autoryzowany | `200 OK` | `{ "values": {...}, "envExists": boolean, "schema": {...}, "restartRequired": true, "resolved": {...} }`  |
| `/settings` | `PUT` | Błędne typy danych w body Zod | `400 Bad Request` | `{ "ok": false, "error": "Invalid body", "details": [...] }`  |
| `/settings` | `PUT` | Zmiana `STAGESYNC_HOST_DISPLAY_NAME` | `200 OK` | `{ "ok": true, "values": {...}, "restartRequired": false, "restartKeys": [] }`  |
| `/settings` | `PUT` | Zmiana `PORT` oraz `LOG_LEVEL` | `200 OK` | `{ "ok": true, "restartRequired": true, "restartKeys": ["PORT", "LOG_LEVEL"] }`  |
| `/browse` | `GET` | Query `?mode=dir&path=/tmp` | `200 OK` | Obiekt struktury katalogu z polem `items`  |
| `/browse` | `GET` | Query `?mode=file&ext=.json` | `200 OK` | Listowanie plików skrojone do rozszerzenia `.json`  |
| `/browse` | `GET` | Ścieżka nieistniejąca lub niepoprawna | `400 Bad Request` | `{ "ok": false, "error": "..." }`  |
| `/restore` | `POST` | Brak konfiguracji `dataDir` | `500 Internal Error`| `{ "ok": false, "error": "Katalog danych hosta nie jest skonfigurowany" }`  |
| `/restore` | `POST` | Body `{ "path": "/tmp/test.bak" }` | `200 OK` | `{ "ok": true, "bakPath": "...", "targetPath": "...", "count": 1 }`  |
| `/restore` | `POST` | Body `{ "paths": ["/tmp/a.bak", "/tmp/b.bak"] }`| `200 OK` | `{ "ok": true, "restored": [...], "count": 2 }`  |
| `/restore` | `POST` | Body `{ "path": "/tmp/archive.zip" }` | `200 OK` | `{ "ok": true, "restored": [...], "count": N }`  |
| `/restore` | `POST` | ZIP z plikiem `../../etc/passwd` | `400 Bad Request` | `{ "ok": false, "error": "Niedozwolona ścieżka w ZIP: ..." }`  |
| `/update-status`| `GET` | `STAGESYNC_SHELL="desktop"` | `200 OK` | `{ "current": "...", "latest": null, "updateMode": "desktop" }`  |
| `/update-status`| `GET` | GitHub API zwraca HTTP 401 | `200 OK` | `{ "latest": null, "updateAvailable": false, "error": "..." }`  |
| `/update-status`| `GET` | GitHub API zgłasza timeout | `200 OK` | `{ "latest": null, "error": "GitHub Releases API nieosiągalne (sieć / timeout)" }`  |
| `/diagnostics/export`| `GET` | Prawidłowy `dataDir` z logami | `200 OK` | Binarny bufor ZIP, nagłówek `Content-Type: application/zip`, `Content-Disposition: attachment; filename="stagesync-diagnostics-*.zip"`  |

---

## Architektura Mocków i Izolacja Środowiska Testowego

Prawidłowa izolacja zestawu testowego wymaga przygotowania wysoce deterministycznych atrap dla zewnętrznych połączeń sieciowych, silnika odtwarzania, procedur cyklu życia oraz zmiennych środowiskowych . Testy muszą być uruchamiane z wykorzystaniem instancji prawdziwego serwera HTTP na losowym porcie (`127.0.0.1:0`), co eliminuje konflikty portów w środowiskach wielowątkowych Vitest .

To podejście zapobiega wyciekom pamięci oraz międzystanowym zanieczyszczeniom obiektów globalnych. Implementacja atrap obejmuje cztery kluczowe obszary wywołań.

```typescript
import { vi } from "vitest";
import type { TransportEngine } from "../transport/engine.js";
import type { Lifecycle } from "../lifecycle.js";

/**
 * Atrapa globalnej funkcji fetch do obsługi API GitHub oraz Watchtower.
 */
export function setupFetchMock(options: {
  githubStatus?: number;
  githubData?: unknown;
  githubDelayMs?: number;
  watchtowerStatus?: number;
}) {
  const realFetch = globalThis.fetch;

  return vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("api.github.com")) {
        if (options.githubDelayMs) {
          await new Promise((resolve) => setTimeout(resolve, options.githubDelayMs));
        }

        if (init?.signal?.aborted) {
          throw new DOMException("The operation was aborted", "AbortError");
        }

        if (options.githubStatus && options.githubStatus !== 200) {
          return new Response(
            JSON.stringify({ message: "GitHub API Error" }),
            {
              status: options.githubStatus,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return new Response(JSON.stringify(options.githubData ?? []), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/v1/update")) {
        const status = options.watchtowerStatus ?? 200;
        return new Response(status === 200 ? "ok" : "error", { status });
      }

      return realFetch(input, init);
    }),
  );
}

/**
 * Atrapa silnika transportu do weryfikacji wymogów ADR 0017 (§3).
 */
export function createMockTransportEngine(initialPlaying = false): {
  transport: TransportEngine;
  pauseSpy: ReturnType<typeof vi.fn>;
} {
  let isPlaying = initialPlaying;
  const pauseSpy = vi.fn(() => {
    isPlaying = false;
  });

  const transport = {
    getState: () => ({
      playing: isPlaying,
      timeMs: 0,
      tempo: 120,
      loopEnabled: false,
    }),
    pause: pauseSpy,
    play: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
  } as unknown as TransportEngine;

  return { transport, pauseSpy };
}

/**
 * Atrapa kontrolera cyklu życia procesu (Lifecycle).
 */
export function createMockLifecycle(isShuttingDown = false): {
  lifecycle: Lifecycle;
  gracefulShutdownSpy: ReturnType<typeof vi.fn>;
  scheduleProcessRestartSpy: ReturnType<typeof vi.fn>;
} {
  const gracefulShutdownSpy = vi.fn();
  const scheduleProcessRestartSpy = vi.fn();

  const lifecycle: Lifecycle = {
    isShuttingDown: () => isShuttingDown,
    gracefulShutdown: gracefulShutdownSpy,
    scheduleProcessRestart: scheduleProcessRestartSpy,
  };

  return { lifecycle, gracefulShutdownSpy, scheduleProcessRestartSpy };
}

/**
 * Zarządzanie stanem zmiennych środowiskowych z czyszczeniem po teście.
 */
const MANAGED_ENV_KEYS = [
  "STAGESYNC_HOST_TOKEN",
  "STAGESYNC_ALLOW_REMOTE_LIFECYCLE",
  "STAGESYNC_OPERATOR_PIN",
  "STAGESYNC_SAFETY_ROLE",
  "STAGESYNC_UPDATE_CHANNEL",
  "STAGESYNC_DISABLE_AUTO_UPDATE",
  "STAGESYNC_DISABLE_MDNS",
  "STAGESYNC_SHELL",
  "STAGESYNC_GITHUB_TOKEN",
  "STAGESYNC_UPDATER_URL",
  "STAGESYNC_UPDATER_TOKEN",
] as const;

type EnvSnapshot = Partial<Record<(typeof MANAGED_ENV_KEYS)[number], string | undefined>>;

export function createEnvSanitizer() {
  const snapshot: EnvSnapshot = {};

  return {
    stash() {
      for (const key of MANAGED_ENV_KEYS) {
        snapshot[key] = process.env[key];
      }
    },
    restore() {
      for (const key of MANAGED_ENV_KEYS) {
        if (snapshot[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = snapshot[key];
        }
      }
    },
  };
}
```

---

## Eliminacja Niestabilności w Testach Strumieniowych SSE (`/logs/stream`)

Niestabilność (flakiness) testowania punktów końcowych opartych na strumieniowaniu zdarzeń Server-Sent Events (SSE) wynika bezpośrednio ze specyfiki ciągłych połączeń HTTP . Serwer Express nie zamyka gniazda po wysłaniu nagłówków, lecz utrzymuje je w stanie otwartym i rejestruje klienta w obiekcie `LogBuffer` . 

Główne przyczyny awarii testów strumieniowych obejmują:
1.  **Wiszące połączenia i blokada serwera HTTP**: Brak jawnego wywołania zamknięcia połączenia przez klienta testowego powoduje, że metoda `server.close()` w bloku `afterEach` zawiesza się, oczekując na zwolnienie aktywnych gniazd .
2.  **Wyścigi zdarzeń (Race Conditions)**: Próba odczytu z wejścia strumieniowego tuż po wywołaniu `fetch` bez odczekania na spłukanie nagłówków HTTP (`res.flushHeaders()`) skutkuje błędem braku danych lub przekroczeniem limitu czasu .
3.  **Błędy podwójnego czyszczenia**: Nieprawidłowa obsługa zdarzenia `req.on("close", remove)` w kodzie serwera może prowadzić do nieobsłużonych wyjątków przy nagłym przerwaniu pętli zdarzeń .

Aby zagwarantować pełną stabilność i natychmiastowe zwalnianie zasobów, testy strumienia logów powinny stosować wzorzec `AbortController` z natychmiastowym przerwaniem po odebraniu prawidłowych nagłówków, eliminując potrzebę sztucznych opóźnień czasowych .

```typescript
import { describe, expect, it } from "vitest";

it("GET /logs/stream nawiązuje połączenie SSE i poprawnie czyści zasoby po rozłączeniu", async () => {
  const abortController = new AbortController();

  const streamPromise = fetch(`${baseUrl}/api/system/logs/stream`, {
    signal: abortController.signal,
  });

  const response = await streamPromise;

  // Weryfikacja nagłówków protokołu SSE
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toMatch(/text\/event-stream/i);
  expect(response.headers.get("cache-control")).toMatch(/no-cache/i);
  expect(response.headers.get("connection")).toMatch(/keep-alive/i);

  // Bezpieczne i natychmiastowe odłączenie klienta bez oczekiwania na timeout
  abortController.abort();

  // Weryfikacja, czy obietnica odczytu zgłasza oczekiwany błąd przerwania
  await expect(response.body?.getReader().read()).rejects.toThrow();
});
```

---

## Fixtures Testowe i Walidacja Granic Bezpieczeństwa

Instancje testowe wymagają izolowanych struktur w systemie plików do weryfikacji operacji na plikach konfiguracyjnych, tworzenia wyciągów diagnostycznych oraz odzyskiwania danych . Wykorzystanie unikalnych katalogów tymczasowych zapobiega zanieczyszczaniu środowiska uruchomieniowego .

Archiwa ZIP wykorzystywane do testowania odzyskiwania danych (za pomocą `restoreFromZipArchive`) muszą obsługiwać zarówno format bez kompresji (STORE), jak i skompresowany (DEFLATE) . Szczególną uwagę należy poświęcić weryfikacji odporności parsera na ataki typu Directory Traversal (rekurencyjne wychodzenie poza katalog docelowy za pomocą sekwencji `../`) oraz odrzucaniu ścieżek bezwzględnych .

```typescript
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildStoreZip, type ZipEntry } from "../diagnostics-zip.js";

/**
 * Tworzy tymczasową strukturę katalogu dataDir dla testów systemowych.
 */
export async function createTestFixtureDataDir(): Promise<{
  dataDir: string;
  projectsDir: string;
  backupsDir: string;
  logsDir: string;
  cleanup: () => Promise<void>;
}> {
  const dataDir = await mkdtemp(join(tmpdir(), "ss-fixture-datadir-"));
  const projectsDir = join(dataDir, "projects");
  const backupsDir = join(dataDir, "backups");
  const logsDir = join(dataDir, "logs");

  await mkdir(projectsDir, { recursive: true });
  await mkdir(backupsDir, { recursive: true });
  await mkdir(logsDir, { recursive: true });

  // Utworzenie przykładowych plików logów
  await writeFile(join(logsDir, "stagesync.log"), "INFO Server started\n");
  await writeFile(join(logsDir, "sidecar.log"), "DEBUG Sidecar active\n");

  const cleanup = async () => {
    await rm(dataDir, { recursive: true, force: true });
  };

  return { dataDir, projectsDir, backupsDir, logsDir, cleanup };
}

/**
 * Generator poprawnego archiwum ZIP ze strukturą projektu StageSync.
 */
export function createValidBackupZipBuffer(): Buffer {
  const entries: ZipEntry[] = [
    {
      name: "projects/show-2026.json",
      data: Buffer.from(
        JSON.stringify({ version: 1, title: "Main Stage Show" }),
        "utf8",
      ),
    },
    {
      name: "projects/show-2026.bak",
      data: Buffer.from("BACKUP_CONTENT", "utf8"),
    },
  ];
  return buildStoreZip(entries);
}

/**
 * Generator złośliwego archiwum ZIP zawierającego ścieżkę Directory Traversal.
 */
export function createMaliciousTraversalZipBuffer(): Buffer {
  const entries: ZipEntry[] = [
    {
      name: "../../../etc/cron.d/malicious_job",
      data: Buffer.from("* * * * * root reboot\n", "utf8"),
    },
  ];
  return buildStoreZip(entries);
}

/**
 * Generator złośliwego archiwum ZIP ze ścieżką bezwzględną.
 */
export function createAbsolutePathZipBuffer(): Buffer {
  const entries: ZipEntry[] = [
    {
      name: "/etc/shadow",
      data: Buffer.from("root:*:18000:0:99999:7:::", "utf8"),
    },
  ];
  return buildStoreZip(entries);
}
```

---

## Hierarchia Priorytetów Według Ryzyka Operatorskiego

Kolejność wdrożenia poszczególnych pakiety testowych została ustalona w oparciu o poziom zagrożenia dla ciągłości trwania spektaklu scenicznego . W środowisku produkcji na żywo dowolny niekontrolowany restart, przerywanie transmisji MIDI lub uszkodzenie pliku konfiguracyjnego w trakcie trwania koncertu generuje bezpośrednią stratę operacyjną .

```
 [ Priorytet P1: Krytyczny ] ──► Autoryzacja LAN (ACL) i PIN Operatora
                                 Sprzęg Safety Net z Transportem (ADR 0017)
                                       │
                                       ▼
 [ Priorytet P2: Wysoki ]    ──► Walidacja Zod dla Zapisywania Ustawień
                                 Odtwarzanie Kopii Zapasowych i Blokada Traversal
                                       │
                                       ▼
 [ Priorytet P3: Średni ]    ──► Sprawdzanie Wersji z API GitHub i Kanały
                                 Przeglądanie Katalogów Systemowych
                                       │
                                       ▼
 [ Priorytet P4: Niski ]     ──► Eksport Archiwum Diagnostycznego (ZIP)
                                 Stabilność Strumieniowania Logów SSE
```

| Priorytet | Moduł / Endpoint | Kategoria Ryzyka | Scenariusz Zagrożenia Operatorskiego | Działanie Prewencyjne |
| :--- | :--- | :--- | :--- | :--- |
| **P1 (Krytyczny)** | `assertLifecycleAllowed` & PIN Auth | Bezpieczeństwo / Dostęp | Nieautoryzowany wywołanie `POST /restart` lub `POST /shutdown` z poziomu sieci LAN przez podłączone urządzenie klienckie powoduje wyłączenie serwera w trakcie trwania widowiska . | Weryfikacja odrzucania żądań bez tokena `HOST_TOKEN` oraz bez poprawnego PIN-u z kodem HTTP 403 . |
| **P1 (Krytyczny)** | `POST /promote` (Safety Net) | Ciągłość transmisji MIDI | Promowanie zapasowego hosta (`spare`) do roli `master` bez wstrzymania transportu w stanie `PLAYING` powoduje jednoczesną transmisję komend MIDI z dwóch serwerów (podwójny zegar MIDI, nakładanie komunikatów Program Change) . | Test integracyjny z atrapą `TransportEngine` weryfikujący automatyczne wywołanie `pause()` . |
| **P2 (Wysoki)** | `POST /restore` | Spójność Danych | Próba odzyskania projektu ze złośliwego pliku ZIP nadpisuje pliki systemowe poza katalogiem `dataDir` (Directory Traversal) lub uszkadza bazę projektów . | Walidacja odrzucania ścieżek `../` i ścieżek bezwzględnych z kodem 400 Bad Request . |
| **P2 (Wysoki)** | `PUT /settings` | Konfiguracja Środowiska | Przekazanie błędnych typów wartości w żądaniu modyfikacji `.env` powoduje unieruchomienie serwera po restarcie . | Testy walidacji schematu Zod `PutServerSettingsBodySchema` oraz weryfikacja flagi `restartRequired` . |
| **P3 (Średni)** | `GET /update-status` | Dostępność Usług zewnętrznych | Błędy API serwisu GitHub (brak autoryzacji, limity zapytań HTTP 403, timeouty) zawieszają odpowiedź serwera lub generują fałszywe alerty o aktualizacji . | Atrapowanie odpowiedzi GitHub API dla stanów 401, 403, 404, przekroczenia czasu reakcji oraz izolacja trybów `desktop` i `console` . |
| **P3 (Średni)** | `GET /browse` | Bezpieczeństwo Systemu | Użytkownik przegląda niedozwolone katalogi systemowe lub podaje niepoprawne rozszerzenia, co wywołuje nieschwycone błędy serwera . | Testy weryfikujące poprawność filtrowania plików po rozszerzeniu `ext` oraz obsługę błędnych ścieżek . |
| **P4 (Niski)** | `GET /diagnostics/export` & SSE | Diagnostyka / Stabilność | Eksport pliku ZIP zawiesza się lub pętla strumieniowania SSE nie zwalnia połączeń HTTP po rozłączeniu klienta . | Weryfikacja generowania poprawnej nagłówków `Content-Disposition`, pakowania logów do ZIP oraz testy SSE z `AbortController` . |

---

## Podsumowanie Planu Wdrożenia

Rozbudowa zestawu testowego wymaga utworzenia nowego pliku integracyjnego `apps/server/src/routes/system-extended-routes.test.ts`. Wykorzystanie opracowanych atrap oraz fixture'ów pozwoli na pełną weryfikację skrajnych ścieżek wykonania bez konieczności modyfikacji istniejących plików testowych .

Wdrożenie testów według zaproponowanej hierarchii priorytetów (od zabezpieczeń cyklu życia i interblokady Safety Net po diagnostykę ZIP i strumienie SSE) zagwarantuje odporność serwera StageSync na błędy operatorskie oraz nieprzewidziane warunki w sieci LAN podczas pracy produkcyjnej .

---
Powered by [AI Exporter](https://saveai.net)
# Evidence fala 10 — Security (trusted LAN)

**Data:** 2026-07-21 ~01:45 Europe/Warsaw  
**Założenie produktu:** booth / trusted LAN (konstytucja; auth → 5.1+)

---

## Werdykt

Model **świadomie bez auth** — OK dla alpha booth **tylko** gdy sieć jest zaufana.  
Kod **nasłuchuje na wszystkich interfejsach** (domyślny `server.listen(PORT)`) + **niechronione** endpointy destrukcyjne.

| Powierzchnia | Ryzyko | Notatka |
|--------------|--------|---------|
| Bind `0.0.0.0`/`::` | Wysokie na open Wi‑Fi | `index.ts` `server.listen(PORT)` bez hosta |
| `POST /api/system/restart\|shutdown` | **High na LAN** | zero auth / secret |
| `GET /api/system/logs` (+ SSE) | Medium | wyciek ścieżek / błędów |
| `GET /api/system/network` | Low–Med | info o IP/port |
| CRUD projects / transport | High jeśli wrog LAN | zgodne z modelem trusted |
| ProjectId path traversal | **FIXED** | F02 |
| Asset `..` w storageName | **FIXED** | paths.ts |

---

## Cytaty

### Listen bez hosta (all interfaces)

```64:72:apps/server/src/index.ts
  server.once("error", onError);
  server.listen(PORT, () => {
    server.off("error", onError);
    logBuffer.push("info", `listening on http://localhost:${PORT}`);
    console.log(`[stagesync-server] listening on http://localhost:${PORT}`);
```

(Node: brak `host` → akceptuje połączenia zewnętrzne.)

### Restart / shutdown bez auth

```46:81:apps/server/src/routes/system.ts
  router.post("/restart", (_req, res) => {
    ...
    res.json({ ok: true, action: "restart" });
    setImmediate(() => {
      lifecycle.scheduleProcessRestart();
      lifecycle.gracefulShutdown("admin_restart", { restart: true });
    });
  });

  router.post("/shutdown", (_req, res) => {
    ...
    res.json({ ok: true, action: "shutdown", pm2: underPm2 });
    setImmediate(() => {
      lifecycle.gracefulShutdown("admin_shutdown");
    });
  });
```

### Brak CORS / helmet / rate limit

`app.ts` — tylko `express.json()` + routery. Brak middleware bezpieczeństwa (świadome alpha).

### Testy bindują localhost

`library-crud.test.ts` itd. — `listen(0, "127.0.0.1")` — **bezpieczniej niż prod entrypoint**.

---

## Findings

| ID | Sev | Opis |
|----|-----|------|
| **A21-H02** | **H** (warunkowy) | Unauth `restart`/`shutdown` przy bind all-interfaces — DoS / kill show na open Wi‑Fi |
| **A21-M10** | M | Brak opcji `STAGESYNC_BIND=127.0.0.1` udokumentowanej / wymuszanej |
| **A21-M11** | M | Logi systemowe bez auth na LAN |
| **A21-L15** | L | Komunikat logu mówi `localhost` mimo listen all |

**Klasyfikacja:** High **warunkowy** — w true trusted LAN = accepted risk; na festival Wi‑Fi = krytyczne. ROADMAP auth 5.1+ nie chroni α8.

## Remediacje

1. Domyślnie bind `127.0.0.1`; opt-in `STAGESYNC_BIND=0.0.0.0` z ostrzeżeniem.  
2. Shared secret / token na `/api/system/*` destrukcyjne (nawet przed pełnym auth).  
3. Docs: „nie wystawiaj na public Wi‑Fi bez firewalla”.

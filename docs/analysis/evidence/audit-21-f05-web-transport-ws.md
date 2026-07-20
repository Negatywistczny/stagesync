# Evidence fala 5 — Web transport / WS races (M12)

**Data:** 2026-07-21 ~01:43 Europe/Warsaw  
**Obszar:** `apps/web/src/transport/TransportProvider.tsx`, `api.ts`, soft-clock shared

---

## Werdykt

| Temat overnight | Status dziś |
|-----------------|-------------|
| Soft-clock między tickami | **OK** — `getDisplayTicks` + rAF |
| Drop stale WS po `serverTimeMs` | **OK** w `applyAnchor` |
| M12 REST vs WS ordering | **NADAL OPEN** — REST `applyAnchor` **bez** `serverTimeMs` |
| M1 client Zod play | **FIXED** — `TransportPlayBodySchema.parse` |

---

## Cytaty

### Drop stale WS

```78:88:apps/web/src/transport/TransportProvider.tsx
  const applyAnchor = useCallback(
    (next: TransportState, receiptMs: number, serverTimeMs?: number) => {
      if (
        serverTimeMs !== undefined &&
        serverTimeMs < lastServerTimeMsRef.current
      ) {
        return;
      }
      if (serverTimeMs !== undefined) {
        lastServerTimeMsRef.current = serverTimeMs;
      }
```

### WS path przekazuje `serverTimeMs`

```194:198:apps/web/src/transport/TransportProvider.tsx
          applyAnchor(
            transportStateFromTick(msg),
            performance.now(),
            msg.serverTimeMs,
          );
```

### REST command — **brak** monotonicznego zegara

```261:271:apps/web/src/transport/TransportProvider.tsx
  const runCommand = useCallback(
    async (fn: () => Promise<TransportState>) => {
      setCommandPending(true);
      setError(null);
      try {
        const next = await fn();
        applyAnchor(next, performance.now());
        if (next.playing) {
          startRaf();
        } else {
          stopRaf();
        }
```

`applyAnchor(next, performance.now())` — trzeci argument `undefined` → **zawsze** nadpisuje stan, nawet gdy nowszy tick WS już jest w UI.

### Initial GET też bez serverTime

```227:231:apps/web/src/transport/TransportProvider.tsx
    void (async () => {
      try {
        const initial = await getTransport();
        if (cancelled) return;
        applyAnchor(initial, performance.now());
```

### Zod na ticku

```188:188:apps/web/src/transport/TransportProvider.tsx
          const msg = TransportTickMessageSchema.parse(raw);
```

### Silnik emituje oba zegary

```89:96:apps/server/src/transport/engine.ts
  function tickMessage(): TransportTickMessage {
    const state = snapshot();
    return {
      type: "transport_tick",
      ...state,
      serverTimeMs: now(),
      sentAtMs: Date.now(),
    };
  }
```

---

## Scenariusz residual M12 (logiczny)

1. Klient: Play → REST w locie.  
2. WS tick N (`serverTimeMs=100`) już applied; playhead idzie.  
3. Równolegle pause z innego klienta → tick N+1 (`serverTimeMs=200`, `playing:false`).  
4. Opóźniona odpowiedź REST play (`playing:true`, pozycja stara) woła `applyAnchor` **bez** `serverTimeMs` → **nadpisuje** świeższy pause.  
5. UI gra mimo że SSOT serwera stoi (do następnego ticka WS).

Odwrotność (stary WS po REST) jest chroniona tylko gdy REST też by ustawił `lastServerTimeMs` — dziś nie ustawia.

---

## Findings

| ID | Sev | Opis |
|----|-----|------|
| **A21-M08** (= M12) | M | REST transport commands clobber nowszy WS state |
| **A21-L08** | L | `commandPending` globalny — równoległe play+seek serializowane w UI, ale nie na serwerze per-client |

## Remediacje

1. REST responses: dołączyć `serverTimeMs: performance.now()`-równoważnik **z silnika** (np. pole w JSON state lub osobny header) i przekazać do `applyAnchor`.  
2. Albo: po REST nie wołać `applyAnchor` — czekać na WS tick (prostsze, +latency).  
3. Test integracyjny: mock WS tick nowszy → late REST → stan = tick.

# Evidence fala 1 — Transport engine (H1 / H5 / M15)

**Data:** 2026-07-21 ~01:39 Europe/Warsaw  
**Repo:** `stagesync` @ `5.0.0-alpha.8`  
**Obszar:** `apps/server/src/transport/engine.ts` + `engine.test.ts`  
**Cel:** weryfikacja overnight H1 (mid-play BPM jump), H5 (partial apply), M15 (clock skew)

---

## Werdykt fali

| ID overnight | Temat | Status 2026-07-21 |
|--------------|-------|-------------------|
| **H1** | `play()` mid-BPM / mid-meter skok pozycji | **FIXED** |
| **H5** | invalid meter mutuje BPM przed throw | **FIXED** (assert przed mutate + test) |
| **M15** | ujemny elapsed → cofnięcie playhead | **FIXED** (`Math.max(0, …)`) |

---

## Cytaty (kod)

### 1. Kolejność `play()` — sample **przed** zmianą BPM (H1 fix)

```160:189:apps/server/src/transport/engine.ts
    play(
      opts: TransportPlayBody = {},
      project?: Project,
    ): TransportState {
      if (opts.timeSignature !== undefined) {
        assertValidTimeSignature(opts.timeSignature, ppq);
      }

      positionTicks = samplePosition();

      if (opts.projectId !== undefined) {
        activeProjectId = opts.projectId;
      }

      if (project && opts.bpm === undefined && opts.timeSignature === undefined) {
        applyMapsFromProject(project, positionTicks);
      } else {
        if (opts.bpm !== undefined) {
          bpm = opts.bpm;
        }
        if (opts.timeSignature !== undefined) {
          timeSignature = { ...opts.timeSignature };
        }
      }

      playing = true;
      reanchor();
      startTimer();
      notify();
      return snapshot();
    },
```

**Różnica vs overnight:** dawniej `bpm = opts.bpm` **przed** `samplePosition()` → elapsed × nowe BPM. Dziś sample przy starych parametrach, potem assign, potem `reanchor()`.

### 2. Clamp elapsed (M15)

```56:67:apps/server/src/transport/engine.ts
  function samplePosition(): number {
    if (!playing) return positionTicks;
    const elapsedMs = Math.max(0, now() - originMs);
    let ticks = originTicks + elapsedToTicks(elapsedMs, bpm, timeSignature, ppq);
    const wrap = loopWrapTicks(ticks, loop);
    if (wrap != null) {
      ticks = wrap;
      positionTicks = wrap;
      reanchor();
    }
    return ticks;
  }
```

### 3. H5 — assert metrum przed mutate

```164:166:apps/server/src/transport/engine.ts
      if (opts.timeSignature !== undefined) {
        assertValidTimeSignature(opts.timeSignature, ppq);
      }
```

Invalid `denominator: 0` rzuca **zanim** `bpm`/`timeSignature` się zmienią.

### 4. Test regresji H1

```94:104:apps/server/src/transport/engine.test.ts
  it("mid-play bpm change does not jump position (H1)", () => {
    let t = 0;
    const engine = createTransportEngine({ now: () => t });
    engine.play({ bpm: 120 });
    t = 1000;
    const before = engine.getState().positionTicks;
    expect(before).toBe(2 * DEFAULT_PPQ);
    engine.play({ bpm: 60 });
    expect(engine.getState().positionTicks).toBe(before);
    engine.dispose();
  });
```

### 5. Test M15

```82:92:apps/server/src/transport/engine.test.ts
  it("clamps negative elapsed on clock skew (M15)", () => {
    let t = 2000;
    const engine = createTransportEngine({ now: () => t });
    engine.play();
    t = 1000;
    const p1 = engine.getState().positionTicks;
    t = 2000;
    const p2 = engine.getState().positionTicks;
    expect(p2).toBeGreaterThanOrEqual(p1);
    engine.dispose();
  });
```

### 6. Test H5

```106:117:apps/server/src/transport/engine.test.ts
  it("invalid meter on play does not mutate bpm (H5)", () => {
    const engine = createTransportEngine();
    engine.play({ bpm: 100 });
    expect(() =>
      engine.play({
        bpm: 80,
        timeSignature: { numerator: 4, denominator: 0 },
      }),
    ).toThrow(RangeError);
    expect(engine.getState().bpm).toBe(100);
    engine.dispose();
  });
```

---

## Reprodukcja in-process (2026-07-21 01:39)

Skrypt `pnpm exec tsx` w `apps/server` z injectable `now`:

```json
{
  "before": 1920,
  "after": 1920,
  "expectedContinuous": 1920,
  "wrongIfNewBpm": 960,
  "h1Fixed": true,
  "rewound": false
}
```

Mid-play meter `{ numerator: 5, denominator: 8 }` po 1000 ms @ 120:

```json
{ "meterMidPlay": { "before": 1920, "after": 1920, "continuous": true } }
```

Clock skew `t: 5000 → 4000` po play:

```json
{ "m15_clockSkew": { "positionTicks": 0, "nonNegative": true } }
```

---

## Residual / uwagi (nie High)

1. **Loop wrap w `samplePosition`** woła `reanchor()` przy wrap — OK semantycznie; warto mieć test edge przy change BPM+loop jednocześnie (coverage gap, Low).
2. **`applyMapsFromProject` przy play z `project`** bez override BPM — resolve przy `positionTicks` po sample; ścieżka inna niż explicit `opts.bpm` — pokryta częściowo przez `loadProject` test, nie przez mid-play map jump.
3. Soft-clock klienta / WS ordering = osobna fala (priorytet #7), nie silnik.

---

## Remediacje (tylko propozycje — poza zakresem audytu)

- Brak obowiązkowej remediacji H1/H5/M15.
- Opcjonalnie: test `play(project)` mid-tempoMap boundary; test loop+BPM.

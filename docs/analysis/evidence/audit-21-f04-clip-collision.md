# Evidence fala 4 — `clip-collision.ts` + wiring Timeline

**Data:** 2026-07-21 ~01:42 Europe/Warsaw  
**Obszar:** `packages/shared/src/clip-collision.ts` (+ testy) · konsumenci `apps/web/src/lib/{formaEdit,contentLaneEdit,timelineClipboard,formaCanvas}.ts`  
**ADR:** 0008

---

## Werdykt

| Temat | Status |
|-------|--------|
| API no-overlap (place/move/resize/insert/split/rigid) | **Solidne** — 15/15 testów PASS |
| Countdown immutable | **OK** (testy + kod) |
| Wiring UI | przez `formaEdit` / `contentLaneEdit` / clipboard — **nie** bezpośredni import w TimelineShell |
| Residual | deterministyczne id `${id}-r`; `resolveSplitParentId` stripuje suffixy |

---

## Cytaty

### Kontrakt pliku

```1:6:packages/shared/src/clip-collision.ts
/**
 * No-overlap clip geometry for Timeline lanes ([ADR 0008](...)).
 *
 * Pure functions — no DOM / clock. Countdown clips are immutable.
 * Section (content) clips never start before `contentFloorTicks` (default 0).
 */
```

### Split id mint

```93:107:packages/shared/src/clip-collision.ts
    if (keepRight) {
      const offset = end - clip.startTicks;
      const remapped = (clip.subsections ?? [])
        .map((s) => s - offset)
        .filter((s) => s > 0);
      kept.push(
        clampFormaSubsections({
          ...clip,
          // Split: left keeps id; right gets a fresh suffix. Trim-from-left: same id.
          id: keepLeft ? `${clip.id}-r` : clip.id,
          startTicks: end,
          lengthTicks: cEnd - end,
          subsections: remapped.length ? remapped : undefined,
        }),
      );
    }
```

### Rigid multi-move

```164:203:packages/shared/src/clip-collision.ts
export function moveClipsRigidDelta(
  clips: FormaClip[],
  moveIds: string[],
  deltaTicks: number,
  opts?: CollisionOpts,
): FormaClip[] {
  ...
  let result = nonMovers;
  for (const m of sortClips(movers)) {
    ...
    result = placeClipNoOverlap(result, placed);
  }
  return sortClips(result);
}
```

Komentarz: „Movers do not trim each other” — zachowane bo wspólny Δ nie tworzy overlap między moverami (przy wejściu bez overlap).

### Insert chroni CD

```281:288:packages/shared/src/clip-collision.ts
  const countdown = clips.find(isCountdown);
  if (countdown) {
    const cdEnd = clipEnd(countdown);
    const end = start + length;
    if (start < cdEnd && end > countdown.startTicks) {
      return clips;
    }
  }
```

### Web: świadomość `-r`

```67:77:apps/web/src/lib/contentLaneEdit.ts
/**
 * `placeClipNoOverlap` may mint `${id}-r` for the right remnant of a split.
 * Resolve payload from the parent id so symbols/text are not lost → default "C".
 */
export function resolveSplitParentId(id: string): string {
  let cur = id;
  while (cur.endsWith("-r")) {
    cur = cur.slice(0, -2);
  }
  return cur;
}
```

### Export shared

`packages/shared/src/index.ts` eksportuje pełny zestaw collision helpers.

---

## Reprodukcja / probe 01:42

| Case | Wynik |
|------|-------|
| Overwrite mid → `a-r` | ids unikalne |
| Drugi overwrite | `a-r` nie zduplikowany; dalszy trim OK |
| Clip już nazwany `sec-r` | remnant `sec-r-r` — unikalne |
| resize end 10000 | neighbor `b` start=10000 length=5360 |

**Brak duplikatów id** w probe; ryzyko semantyczne: `resolveSplitParentId("sec-r")` → `"sec"` (fałszywy parent jeśli ktoś nazwał id z `-r`).

---

## Coverage gaps (testy)

Brak / słabe:
1. Remap `subsections` po split (jest w formaEdit.test, nie w clip-collision.test).
2. `moveClipsRigidDelta` gdy delta wjeżdża w countdown (tylko happy path).
3. Stres wielu kolejnych `-r` / kolizja gdy `${id}-r` już istnieje jako **osobny** clip (nie probe’owane jako fail).
4. `minLengthTicks` custom ≠ 1.

---

## Findings

| ID | Sev | Opis |
|----|-----|------|
| **A21-M07** | M | Deterministic `${id}-r` zamiast UUID — kruche przy ręcznych id / `resolveSplitParentId` |
| **A21-L06** | L | Brak unit testów subsections remap w `clip-collision.test.ts` |
| **A21-L07** | L | TimelineShell 5056 LOC — logika edycji wyjęta do lib (dobrze), ale shell nadal monolitem UI |

## Remediacje

1. Mint `randomUUID()` (lub nanoid) dla prawego remnantu; payload copy bez heurystyki `-r`.
2. Dodać test: istniejący clip id `foo-r` + split `foo` → brak kolizji / poprawny parent map.
3. Test rigid+countdown intrusion.

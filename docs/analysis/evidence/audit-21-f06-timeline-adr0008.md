# Evidence fala 6 — TimelineShell + ADR 0008

**Data:** 2026-07-21 ~01:43 Europe/Warsaw  
**Obszar:** `apps/web/src/shells/TimelineShell.tsx` (~5056 LOC) + `lib/formaEdit|contentLaneEdit|…`  
**ADR:** 0008 · parity blocker α8/P8

---

## Werdykt vs ADR 0008

| Wymaganie ADR 0008 | Stan kodu α8 |
|--------------------|--------------|
| No-overlap Forma move/resize/pencil | **OK** — gesty + shared collision |
| Countdown immutable | **OK** |
| Smart ≈ Pointer zones | **OK** (tool `smart` w TOOLS) |
| Scissors subsections / content split | **OK** (tool + formaEdit) |
| Audio trim/move pencil zakaz | **OUT β2** — schema audio jest; playback/edit UI nie |
| Wand | **Ukryta** świadomie (komentarz PO smoke) |
| beforeunload dirty | **OK** (grep L642) |
| Monolit shell | **Debt** — 5k LOC UI; logika w `lib/` |

---

## Cytaty

### Tools (bez wand)

```245:291:apps/web/src/shells/TimelineShell.tsx
type ToolId = FormaToolId;

const TOOLS: {
  id: ToolId;
  ...
}[] = [
  { id: "pointer", ... },
  { id: "smart", ... },
  { id: "pencil", ... },
  { id: "eraser", ... },
  { id: "scissors", ... },
  // Różdżka (wand) — ukryta do naprawy zachowania (PO smoke); core `wandContentToForma` zostaje.
];
```

### MIDI overlay OUT

```1128:1129:apps/web/src/shells/TimelineShell.tsx
  // v4: cyan MIDI overlay only when external clock is live and Timeline is not the
  // transport source. Alpha: server Timeline owns play → no separate MIDI overlay (β2).
```

### Dirty guard

```642:643:apps/web/src/shells/TimelineShell.tsx
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
```

### Window-level gesture (v4 pattern)

```1565:1589:apps/web/src/shells/TimelineShell.tsx
  // Window-level move/up — survives clip reflow under the pointer (v4 pattern).
  ...
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
```

### Collision nie w shellu — w lib

`formaEdit.ts` woła `insertSpanOverwrite` / `moveClipNoOverlap` / `moveClipsRigidDelta`.  
`TimelineShell` importuje `deleteClipsOnLane` z clipboard.

### Transport chrome

Play/pause/stop pod `commandPending` (L3441+); Stop **nie** disabled-na-stałe (regresja α4 naprawiona w torze α5+).

---

## Gaps / residual (nie bloker P8 wg parity-blocker)

| ID | Sev | Opis |
|----|-----|------|
| **A21-M09** | M | Shell 5k LOC — ryzyko regresji; brak testów komponentu TimelineShell (tylko lib) |
| **A21-L09** | L | Wand ukryta mimo `wand.test.ts` w shared — drift inventarz vs core |
| **A21-L10** | L | Audio lanes w schemacie bez edit path (świadome β2) |

## Remediacje

1. Dzielić TimelineShell na `TimelineToolbar` / `TimelineCanvas` / `TimelineInspector` (refactor-only).  
2. Co najmniej 1 smoke test Playwright gest pencil+save (obecnie e2e?).  
3. Wand: albo przywrócić UI po fix, albo usunąć z inventarza docs.

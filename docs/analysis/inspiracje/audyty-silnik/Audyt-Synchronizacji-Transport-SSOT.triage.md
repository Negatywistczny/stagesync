# Triage: Audyt synchronizacji transportu / SSOT

**Źródło:** [Audyt-Synchronizacji-Transport-SSOT.md](./Audyt-Synchronizacji-Transport-SSOT.md) (Gemini Deep Search)  
**Status:** `open`
**Obszar:** Transport SSOT / WS / pause-at-end / auto-advance  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Najwyższy priorytet wśród inspiracji silnikowych** — race’y live-show (FOH vs scena, reconnect, I/O w `onChange`). Tabela BUG-SSV5-* jest actionable; etykiety „code-confirmed” i tak wymagać **repro w repo**. BUG-08 (StrictMode) = hypothesis.

## Priorytet weryfikacji

| ID | Temat | Impact | Stan |
|----|--------|--------|------|
| BUG-SSV5-02 | `pause-at-end` / `auto-advance` await I/O nadpisuje Seek/Pause FOH | Krytyczny | `hypothesis` |
| BUG-SSV5-01 / 06 | `getTransport` HTTP vs świeży tick WS przy `onopen` / mount | Wysoki (jump playhead) | `hypothesis` |
| BUG-SSV5-05 | pause-at-end bez twardego cut audio na `endTicks` | Wysoki (overshoot) | `hypothesis` |
| BUG-SSV5-03 | optimistic `applyAnchor` + tick = jitter | Średni | `hypothesis` |
| BUG-SSV5-04 | `samplePosition` side-effect przy loop wrap | Średni | `hypothesis` |
| BUG-SSV5-07 | ciche drop ticków wstecznych | Średni | `hypothesis` |
| BUG-SSV5-08 | StrictMode podwójny WS | DX | `hypothesis` |

## Kontekst

- [ADR 0002](../../../adr/0002-timebase-ssot.md) — serwer SSOT; client tylko wygładzanie między tickami.
- Po potwierdzeniu: TODO Must + testy sekwencji Play→Seek→Stop / reconnect — nie CHANGELOG bez fixa.

## Następny krok eng

1. Testy `pause-at-end` / `auto-advance` z opóźnionym store + równoległy seek.
2. Client: kolejność tick WS vs `getTransport` przy reconnect.

# ADR 0002 — Timebase SSOT

- **Status:** Accepted
- **Date:** 2026-07-19

## Context

Live performance clients need a smooth playhead, but competing clocks (browser vs server vs MIDI) cause drift and desync. Domain time math must stay testable and shared across packages.

## Decision

1. **Pure time** — beat/bar/tick helpers live in `@stagesync/shared` as pure functions (no I/O, no DOM).
2. **Server SSOT** — `@stagesync/server` owns authoritative transport position and tempo/meter state; clients consume ticks/updates from the server.
3. **Playhead smoothing** — `@stagesync/web` may interpolate/smooth the displayed playhead **between server ticks only**. It must not become the source of truth for musical time.

## Consequences

- Tests for time live next to shared helpers (Vitest).
- UI animations stay cosmetic; seeking/transport commands go through the server.
- MIDI / external clock integration (future) plugs into the server, not the client playhead smoother.

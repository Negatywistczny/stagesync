# RFC — v5.1+ proposals (parking lot)

Non-blocking ideas collected during hygiene night-shifts. **Not** committed product scope.
See [ROADMAP.md](./ROADMAP.md) / [TODO.md](./TODO.md) for active Must items.

## Perf (observe first)

- Profile Client Grid chord-hero animations under `prefers-reduced-motion` (already gated; measure paint on low-end tablets).
- Mixer meter rAF: batch DOM writes when many strips visible (note only — no API change).
- OSMD: avoid full re-render on every measure cursor tick if library allows cursor-only updates.

## DX / types

- Reduce `any` at OSMD / WebMidi boundary with narrow adapters (keep fail-soft).
- JSDoc on `@stagesync/shared` public wand / ug-import result types for IDE consumers.

## Product (5.2+ only — do not start in 5.1 hygiene)

- Mixer physical outs 3–4 / bus→bus (needs model + WebAudio support; no UI stubs).
- Themes / auth / multi-user.
- Cues Sampler (#430), Safety Net (#437).

## A11y follow-ups

- Full pass: Timeline map segments + context menus announce selection count.
- Launcher (desktop): audit return-to-host control names in Tauri shell (outside web bundle).

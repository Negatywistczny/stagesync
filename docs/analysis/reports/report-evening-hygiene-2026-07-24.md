# Evening hygiene — 2026-07-24 (Option C)

**Agent:** Auto (Composer evening audit)  
**Window:** ~18:10–21:20 Europe/Warsaw  
**Scope:** parity / tech debt only (no 5.2+ features; no transport/timebase math; no Docker/Tauri packaging)

## Open PRs (ready / near-ready)

| PR | Title | Scope |
|---|---|---|
| [#496](https://github.com/Negatywistyczny/stagesync/pull/496) | OSMD cursor CSS tokens | `scoreOsmd` reads `--ss-color-primary` / focus-ring / paper |
| [#497](https://github.com/Negatywistyczny/stagesync/pull/497) | ClickStrip Mute PL | State-dependent PL aria-label parity with titles |
| [#498](https://github.com/Negatywistyczny/stagesync/pull/498) | Shell dialog focus trap | jsdom Tab wrap + Escape + focus restore |
| [#499](https://github.com/Negatywistyczny/stagesync/pull/499) | Launcher a11y | Manual URL label, host tile labels, focus-visible |
| [#500](https://github.com/Negatywistyczny/stagesync/pull/500) | Timeline dock/eye/zoom | dock-add aria, eye menu name, Powiększenie labels |
| [#501](https://github.com/Negatywistyczny/stagesync/pull/501) | Dead CSS purge | Orphan Timeline help-* + Client welcome leftovers |
| [#502](https://github.com/Negatywistyczny/stagesync/pull/502) | Setlist validation edges | 400 bodies + empty/ghost projectIds |
| [#504](https://github.com/Negatywistyczny/stagesync/pull/504) | tempo-map ms edges | Reverse / equal / meter-split (pure helper) |
| [#505](https://github.com/Negatywistyczny/stagesync/pull/505) | Eye/tools aria-controls | Portal menu ids linked to icon triggers |
| [#506](https://github.com/Negatywistyczny/stagesync/pull/506) | Dialog title useId | Unique `aria-labelledby` targets |
| [#507](https://github.com/Negatywistyczny/stagesync/pull/507) | Mixer routing edges | Set busIds + nextBusName case/trim |
| [#508](https://github.com/Negatywistyczny/stagesync/pull/508) | Server Settings PL | MIDI/bind/auto-update + path browse `…` |
| [#509](https://github.com/Negatywistyczny/stagesync/pull/509) | Body schema edges | BatchMidiPc / ExportLibrary / PutMidiHostConfig |
| [#510](https://github.com/Negatywistyczny/stagesync/pull/510) | Admin DB popover controls | Zarządzaj bazą ↔ SettingsPopover id |
| [#511](https://github.com/Negatywistyczny/stagesync/pull/511) | Inspector PL aria | PC / tonika / gain / fade labels |
| [#512](https://github.com/Negatywistyczny/stagesync/pull/512) | Song + appearance controls | Song dialog + track color picker aria-controls |
| [#513](https://github.com/Negatywistyczny/stagesync/pull/513) | Mixer strip PL | Mikser / wyjście stereo / Balans / Szczyt |
| [#514](https://github.com/Negatywistyczny/stagesync/pull/514) | Library 400 edges | batch-PC range + export non-UUID |
| [#515](https://github.com/Negatywistyczny/stagesync/pull/515) | theme-color token | Meta from `--ss-color-bg` with fallbacks |
| [#516](https://github.com/Negatywistyczny/stagesync/pull/516) | Evening handoff report | This document (branch misnamed `chore/admin-dead-css`) |
| [#517](https://github.com/Negatywistyczny/stagesync/pull/517) | AdminShell dead CSS | Orphan about/split/stack/twoUp leftovers |
| [#518](https://github.com/Negatywistyczny/stagesync/pull/518) | Live-desk PATCH edges | Unknown field + empty body refine |
| [#519](https://github.com/Negatywistyczny/stagesync/pull/519) | Unexport deprecated CD helpers | Drop barrel exports; tests import module |
| [#520](https://github.com/Negatywistyczny/stagesync/pull/520) | Section-name edges | Diacritics + instrument solo display |
| [#521](https://github.com/Negatywistyczny/stagesync/pull/521) | Snap Off PL | Visible „Wyłącz” option label |
| [#522](https://github.com/Negatywistyczny/stagesync/pull/522) | mergePreserve edges | Empty-id skip + 1024 cap |
| [#523](https://github.com/Negatywistyczny/stagesync/pull/523) | Track appearance edges | Negative/NaN index + PL icon labels |
| [#524](https://github.com/Negatywistyczny/stagesync/pull/524) | projectEndTicks edges | Cue/akordy past forma; countdown-only fallback |
| [#525](https://github.com/Negatywistyczny/stagesync/pull/525) | Mixer Mono/Stereo PL | `Tryb mono` / `Tryb stereo` title+aria |
| [#526](https://github.com/Negatywistyczny/stagesync/pull/526) | Stage-cue banner edges | Blank text; NaN bpm; truncate 200 |
| [#527](https://github.com/Negatywistyczny/stagesync/pull/527) | Settings PUT body 400 | Missing / non-object `values` |
| [#528](https://github.com/Negatywistyczny/stagesync/pull/528) | Stage cue priority PL | State-dependent priority + TTL aria |
| [#529](https://github.com/Negatywistyczny/stagesync/pull/529) | Countdown digit edges | Clamp bars; case-id; akord synth |

Closed misfire: [#503](https://github.com/Negatywistyczny/stagesync/pull/503) (wrong branch name; content refiled as #504).

## Ranked backlog (next)

1. **Chord scenic relative `em` scales** — `ClientShell.module.css` chord superscripts (post-#478); keep relative to hero size unless PO wants `--ss-text-*` tokens (visual parity risk).
2. **prefsRange / zoomRange pattern** — already dual `:focus` + `:focus-visible`; document only if public/operator docs (skip CHANGELOG).
3. **Post-merge smoke** — SR pass on Mixer S/M + Click + Tryb mono/stereo, Server Settings, Admin Zarządzaj bazą / Scena priority, Timeline eye/tools/song picker.
4. **i18n residual** — Beat/Snap product terms; inspector leftovers until #511 lands (PC / tonika / fade).
5. **Codecov project** — continue server route unhappy paths; watch Codecov GPG flakes on upload.
6. **More shared edges** — `score-bar-map` normalizeAnchors / `library-import` / `ug-import` unhappy paths.

## Skipped / off-limits

- Transport engine, soft-clock, MIDI clock math, playhead interpolation
- Docker / Tauri packaging / MSI / release.yml
- 5.2+ features (Mixer Out 3–4, bus→bus, Sampler, Safety Net, themes/auth)
- Dual-write legacy 4.x; admin hygiene scrub APIs
- Stubbing missing v4 behaviors

## Notes

- Worked from `origin/main`; did not stage unrelated user WIP.
- One parallel checkout briefly misnamed a branch (#503 → closed; #504 correct).
- Most PRs are a11y/test/chore — **no CHANGELOG** per złota zasada (SR/label hygiene + tests).
- Mid-session: browse HTTP 400 is soft-fallback via `resolveBrowseStartPath`; unit coverage stays in `path-browser.test.ts`.

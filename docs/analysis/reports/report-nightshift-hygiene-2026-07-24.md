# Night-shift hygiene — 2026-07-24 (Option C)

**Agent:** Auto (replacement after Opus/Composer usage limits)  
**Window:** ~01:48–10:00 Europe/Warsaw  
**Scope:** parity / tech debt only (no 5.1+ features; no transport/timebase math; no Docker/Tauri packaging)

## Open PRs (ready / near-ready)

| PR | Title | Scope |
|---|---|---|
| [#480](https://github.com/Negatywistczny/stagesync/pull/480) | Solo/Mute + client chrome a11y | `aria-label` on mixer S/M, setlist next, Stage presence, ConnectionIndicator label, drums `focus-visible` |
| [#481](https://github.com/Negatywistczny/stagesync/pull/481) | Client stage `--ss-*` type tokens | New leading/tracking tokens; ClientShell weight/size/leading/tracking |
| [#482](https://github.com/Negatywistczny/stagesync/pull/482) | Edge test coverage | Presence limits, IPv6 loopback URLs, chord pass-through, `docsLinks` |
| [#483](https://github.com/Negatywistczny/stagesync/pull/483) | Timeline meta a11y | Tempo / meter / key transport meta `aria-label` |
| [#484](https://github.com/Negatywistczny/stagesync/pull/484) | Solo/Mute + OSMD paper tokens | `--ss-color-solo|mute|osmd-paper`; Timeline + Client score paper |
| [#485](https://github.com/Negatywistczny/stagesync/pull/485) | Rename `focus-visible` | Dock + mixer rename inputs |
| [#486](https://github.com/Negatywistczny/stagesync/pull/486) | Night-shift handoff + RFC | This report; parking lot `rfc-v5.1-proposals.md` later folded into [TODO.md](../../TODO.md) § Should / Higiena + § 5.2+ |
| [#487](https://github.com/Negatywistczny/stagesync/pull/487) | Map-lane segment a11y | Tempo / meter / key map segment `aria-label` |
| [#488](https://github.com/Negatywistyczny/stagesync/pull/488) | Connection-lost alert | `ConnectionLostBanner` `role="alert"` |
| [#489](https://github.com/Negatywistczny/stagesync/pull/489) | Residual `line-height: 1` → token | SetView + ChannelStripControls → `--ss-leading-none` |
| [#490](https://github.com/Negatywistczny/stagesync/pull/490) | MIDI PC handler edges | Unit tests for program-change handler |
| [#491](https://github.com/Negatywistyczny/stagesync/pull/491) | Set template menu a11y | `aria-controls` / menu wiring on SetView |
| [#492](https://github.com/Negatywistyczny/stagesync/pull/492) | MIDI PC OUT edges | Unit tests for program-change OUT |
| [#493](https://github.com/Negatywistczny/stagesync/pull/493) | Shell dialog Escape | Dismiss ShellBlockingDialog with Escape |

Merge order tip: **481 before 489/484** (tokens first); then a11y/tests; **#486 last**. Night-shift train landed #480–#485 and #487–#493 before this handoff.

## Ranked backlog (next)

1. **OSMD cursor hex in JS** — `scoreOsmd.ts` still needs concrete `#fbbf24` / `#22d3ee` for OSMD API.
2. **Dead CSS audit** — purge unused Timeline/Client module classes (knip/purify pass).
3. **Icon-only Timeline tool overflow** — verify tools-vis / eye / dock-add names on narrow widths.
4. **i18n consistency** — PL a11y strings vs EN storage IDs (audit only).
5. **Codecov gaps** — `apps/server` route handlers still thin outside happy-path API tests.
6. **ShellBlockingDialog** — unit-test focus trap Tab cycle (jsdom).
7. **Desktop Launcher shell** — audit return-to-host control names in Tauri (outside web bundle).
8. **ClickStrip Mute label** — already has aria-label; verify Polish parity with channel strips.
9. **prefsRange / zoomRange** — keep dual `:focus` + `:focus-visible` pattern documented.
10. **Post-merge smoke** — keyboard a11y on mixer S/M, Escape dialogs, Set template menu; Client stage type tokens.

## Skipped / off-limits

- Transport engine, soft-clock, MIDI clock math, playhead interpolation
- Docker / Tauri packaging / MSI / release.yml (except leaving user CI WIP alone)
- 5.2+ features (Mixer Out 3–4, bus→bus, Sampler, Safety Net, themes/auth)
- Dual-write legacy 4.x shapes; admin hygiene scrub APIs
- Stubbing missing v4 behaviors

## Notes

- Worked from `origin/main`; did **not** stage user WIP under `launch/scripts/*` (release-notes work landed separately as `6e5f3b5`).
- One short-lived branch required `push --force-with-lease` after rebase onto that main tip (`chore/daw-osmd-color-tokens`); no force on `main`.

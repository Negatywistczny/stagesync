# Evening hygiene — 2026-07-25

**Agent:** Auto (night-auditor / Composer)  
**Window:** 12:00–13:00 Europe/Warsaw (day session; evening naming per prompt)  
**Scope:** parity / tech debt only (no 5.2+; no transport/timebase math; no Docker/Tauri packaging)

## Open / merged PRs

| PR | Title | Scope |
|----|-------|-------|
| [#675](https://github.com/Negatywistyczny/stagesync/pull/675) | fix(a11y): announce Timeline map segment selection count | Map segment aria-labels + inspector live status; uses helpers |
| [#676](https://github.com/Negatywistyczny/stagesync/pull/676) | fix(a11y): announce clip context-menu selection count | Preserve multi on right-click; menu label count; multi cut/copy/delete |
| [#677](https://github.com/Negatywistyczny/stagesync/pull/677) | fix(a11y): name Launcher return and error action controls | Wróć / Anuluj / Ponów / force + local clear/log labels |
| [#678](https://github.com/Negatywistyczny/stagesync/pull/678) | docs(shared): JSDoc WandResult and UgImportResult contracts | DX fail-soft result docs |
| [#679](https://github.com/Negatywistyczny/stagesync/pull/679) | test(web): unit helpers for Timeline selection a11y labels | **Superseded** by #675/#676 (helpers cherry-picked) — close after either merges |
| [#680](https://github.com/Negatywistyczny/stagesync/pull/680) | test(server): presence remove and unknown-role edges | ClientPresence remove + role filter |
| [#681](https://github.com/Negatywistyczny/stagesync/pull/681) | test(server): hostname fallback and truncate edges | `HOSTNAME` blank → localhost; 64-char cap |
| [#682](https://github.com/Negatywistyczny/stagesync/pull/682) | test(server): stage-hub dismiss and unsubscribe edges | Empty dismiss; clearAll empty; listener off |
| [#683](https://github.com/Negatywistyczny/stagesync/pull/683) | test(shared): upgradeProjectV4ToV5 template and PC edges | Template omits PC; keyMap seed |
| [#684](https://github.com/Negatywistyczny/stagesync/pull/684) | fix(a11y): label Launcher manual connect submit | `Połącz z hostem StageSync` |
| [#685](https://github.com/Negatywistyczny/stagesync/pull/685) | test(shared): resolveMeterAtTicks empty and unsorted map edges | Default + last ≤ ticks |
| [#686](https://github.com/Negatywistyczny/stagesync/pull/686) | test(server): setlist-hub unsubscribe and store-failure edges | Null snapshot; swallow store errors |
| [#687](https://github.com/Negatywistyczny/stagesync/pull/687) | fix(a11y): announce multi-clip selection in inspector | Live status for N klipów + lane |
| (this) | chore(docs): evening hygiene handoff 2026-07-25 | Handoff report |

**Merge tip:** Prefer **#675** and **#676** before #679 (close #679 as duplicate). Launcher **#677** then **#684** (both touch `launcher/index.html` — rebase #684 if needed). Tests #680–#686 are independent.

## Ranked backlog (next)

1. **Wire / smoke** — after #675/#676/#687: keyboard multi-select map + clips; context menu count; Launcher return/connect labels (#677/#684).
2. **Close #679** once helpers land via #675 or #676.
3. **Clip multi inspector UX** — #687 announces count but primary-only editor remains; optional follow-up to grey-out conflicting fields when N>1.
4. **OSMD / WebMidi `any` adapters** — still deferred (fail-soft boundary); no safe thin PR this window.
5. **Dead CSS** — TimelineShell.module.css inventarz: 0 orphans; residual Client/Admin modules only if knip (#602) lands.
6. **HEX outside tokens** — only OSMD API fallbacks + theme-color meta + `tokens.css` (intentional); no residual product HEX purge.
7. **Perf observe-only** (TODO) — chord-hero reduced-motion; Mixer meter batch; OSMD cursor-only — skip until profiler.
8. **Codecov thin routes** — remaining unhappy paths are sparse; prefer targeted store-failure catches over volume.
9. **i18n residual** — keep English DAW jargon (Bus/Out/Snap/…); PL dialogs only.
10. **Tonika ≠ Tonacja** — preserve existing aria split; do not conflate in future map/inspector copy.

## Skipped / off-limits

- Transport engine, soft-clock, MIDI clock math, playhead interpolation
- Docker / Tauri packaging / MSI / release.yml
- 5.2+ features (Mixer Out 3–4, bus→bus, Sampler, Safety Net, themes/auth, mobile-client)
- Dual-write legacy; admin scrub APIs; stubs; G1–G10 claim green
- Ops jargon in CHANGELOG (no product CHANGELOG bullets this session — all a11y/test/docs)
- Heavy perf work from TODO § Should

## Notes

- Worked in an **isolated git worktree** from `origin/main` so local user WIP on main (`CHANGELOG.md`, `docs/DESKTOP.md`, `docs/TODO.md`, hygiene report edits, `.cursor/rules/changelog.mdc`) was never staged.
- **DAW jargon rule:** left Mixer/Out/Snap/Bus/Fade In/Out/Clip tool names in EN; PL used for dialogs (Wróć/Anuluj/Ponów), „klip(ów)” in inspector sentences, connection statuses, Launcher host copy.
- **Tonika ≠ Tonacja:** no conflation in this session’s strings (map lanes still Tempo / Metrum / Tonacja).
- No commits or pushes to `main`; no merges.

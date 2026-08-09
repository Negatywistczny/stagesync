# Evening hygiene — 2026-07-25

**Agent:** Auto (night-auditor / Composer)  
**Window:** 12:00–13:00 Europe/Warsaw (day session; evening naming per prompt)  
**Scope:** parity / tech debt only (no 5.2+; no transport/timebase math; no Docker/Tauri packaging)

## Open / merged PRs

| PR                                                           | Title                                                          | Scope                                                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [#675](https://github.com/Negatywistczny/stagesync/pull/675) | fix(a11y): announce Timeline map segment selection count       | Map segment aria-labels + inspector live status; uses helpers                      |
| [#676](https://github.com/Negatywistczny/stagesync/pull/676) | fix(a11y): announce clip context-menu selection count          | Preserve multi on right-click; menu label count; multi cut/copy/delete             |
| [#677](https://github.com/Negatywistczny/stagesync/pull/677) | fix(a11y): name Launcher return and error action controls      | Wróć / Anuluj / Ponów / force + local clear/log labels                             |
| [#678](https://github.com/Negatywistczny/stagesync/pull/678) | docs(shared): JSDoc WandResult and UgImportResult contracts    | DX fail-soft result docs                                                           |
| [#679](https://github.com/Negatywistczny/stagesync/pull/679) | test(web): unit helpers for Timeline selection a11y labels     | **Superseded** by #675/#676/#690 (helpers cherry-picked) — close after those merge |
| [#680](https://github.com/Negatywistczny/stagesync/pull/680) | test(server): presence remove and unknown-role edges           | ClientPresence remove + role filter                                                |
| [#681](https://github.com/Negatywistczny/stagesync/pull/681) | test(server): hostname fallback and truncate edges             | `HOSTNAME` blank → localhost; 64-char cap                                          |
| [#682](https://github.com/Negatywistczny/stagesync/pull/682) | test(server): stage-hub dismiss and unsubscribe edges          | Empty dismiss; clearAll empty; listener off                                        |
| [#683](https://github.com/Negatywistczny/stagesync/pull/683) | test(shared): upgradeProjectV4ToV5 template and PC edges       | Template omits PC; keyMap seed                                                     |
| [#684](https://github.com/Negatywistczny/stagesync/pull/684) | fix(a11y): label Launcher manual connect submit                | `Połącz z hostem StageSync`                                                        |
| [#685](https://github.com/Negatywistczny/stagesync/pull/685) | test(shared): resolveMeterAtTicks empty and unsorted map edges | Default + last ≤ ticks                                                             |
| [#686](https://github.com/Negatywistczny/stagesync/pull/686) | test(server): setlist-hub unsubscribe and store-failure edges  | Null snapshot; swallow store errors                                                |
| [#687](https://github.com/Negatywistczny/stagesync/pull/687) | fix(a11y): announce multi-clip selection in inspector          | Live status for N klipów + lane                                                    |
| [#688](https://github.com/Negatywistczny/stagesync/pull/688) | docs(analysis): evening hygiene handoff 2026-07-25             | This report                                                                        |
| [#689](https://github.com/Negatywistczny/stagesync/pull/689) | fix(a11y): sync Launcher local-host busy and retry labels      | aria-busy / retry label on local host button                                       |
| [#690](https://github.com/Negatywistczny/stagesync/pull/690) | fix(a11y): announce audio-track context-menu selection count   | Multi track menu label + helper                                                    |
| [#691](https://github.com/Negatywistczny/stagesync/pull/691) | test(server): system router network and logs/clear edges       | GET /network mdns off + logs/clear                                                 |

**Merge tip:** Prefer **#675**, **#676**, **#690** (include helpers) before closing **#679**. Launcher stack: **#677** → **#684** → **#689** (rebase if [`index.html`](../../../../apps/desktop/launcher/index.html) / [`app.js`](../../../../apps/desktop/launcher/app.js) conflicts). Tests #680–#686 / #691 independent.

## Ranked backlog (next)

1. **Post-merge smoke** — map/clip/track multi a11y (#675/#676/#687/#690); Launcher return/connect/local busy (#677/#684/#689).
2. **Close #679** once helpers land via #675/#676/#690.
3. **Clip multi inspector UX** — #687 announces count; optional grey-out of conflicting primary fields when N>1.
4. **OSMD / WebMidi `any` adapters** — still deferred (fail-soft boundary); no safe thin PR this window.
5. **Dead CSS** — TimelineShell.module.css inventarz: 0 orphans; residual Client/Admin only with knip (#602).
6. **HEX outside tokens** — only OSMD API fallbacks + theme-color meta + [`tokens.css`](../../../../apps/desktop/launcher/vendor/tokens.css) (intentional).
7. **Perf observe-only** (TODO) — chord-hero reduced-motion; Mixer meter batch; OSMD cursor-only — skip until profiler.
8. **Codecov thin routes** — store-failure catches preferred over volume; coverage already dense.
9. **i18n residual** — keep English DAW jargon (Bus/Out/Snap/…); PL dialogs only.
10. **Tonika ≠ Tonacja** — preserve existing aria split; do not conflate in future map/inspector copy.

## Skipped / off-limits

- Transport engine, soft-clock, MIDI clock math, playhead interpolation
- Docker / Tauri packaging / MSI / release.yml
- 5.2+ features (Mixer Out 3–4, bus→bus, Sampler, Safety Net, themes/auth, mobile-client)
- Dual-write legacy; admin scrub APIs; stubs; G1–G10 claim green
- Ops jargon in CHANGELOG (no product CHANGELOG bullets — all a11y/test/docs)
- Heavy perf work from TODO § Should

## Notes

- Worked in an **isolated git worktree** from `origin/main` so local user WIP on main ([`CHANGELOG.md`](../../../../CHANGELOG.md), `docs/DESKTOP.md`, [`docs/TODO.md`](../../../TODO.md), hygiene report edits, [`.cursor/rules/changelog.mdc`](../../../../.cursor/rules/changelog.mdc)) was never staged.
- **DAW jargon rule:** left Mixer/Out/Snap/Bus/Fade In/Out/Clip tool names in EN; PL used for dialogs (Wróć/Anuluj/Ponów), „klip(ów)” in inspector sentences, connection statuses, Launcher host copy.
- **Tonika ≠ Tonacja:** no conflation (map lanes still Tempo / Metrum / Tonacja).
- No commits or pushes to `main`; no merges.

---
name: night-audit
description: >-
  Run StageSync night/evening hygiene sessions — inventarz luk, małe PR-y
  (a11y/tokens/edge tests), handoff report. Use when the user runs /night-audit,
  asks for night-shift or evening hygiene, or launches the night-auditor subagent.
disable-model-invocation: true
---

# Night audit (hygiene)

Procedura sesji parity / tech-debt. Zakazy produktowe zostają w `.cursor/rules/` — tu tylko kolejność i stop.

## Preflight

1. `git status` — **nie** ruszaj niespokrewnionego WIP użytkownika.
2. Odczytaj [docs/TODO.md](../../../docs/TODO.md) i ostatni handoff w `docs/analysis/reports/hygiene/report-*-hygiene-*.md` (jeśli jest).
3. Jeśli brak deadline / okna — **zapytaj** (np. do 10:00 Europe/Warsaw) zanim zaczniesz edycje.

## Off-limits (hard)

- Transport / timebase math, soft-clock, MIDI clock, playhead interpolation
- Docker / Tauri packaging / MSI / release.yml (poza zostawieniem obcego WIP)
- Features **5.2+** (Mixer Out 3–4, bus→bus, Sampler, Safety Net, themes/auth)
- Dual-write legacy 4.x; admin scrub APIs; stuby brakujących zachowań v4
- Claim green **G1–G10** bez dowodu HW
- Żargon ops / residual / soft-gate w CHANGELOG
- **Nie „polonizuj” żargonu DAW** powszechnie używanego po angielsku w UI produktu.
  Zostaw m.in.: Bus / Busy, Out, Stereo Out, Snap, Beat, UI (zoom chrome),
  Locator, Countdown, Mixer, Pan, Balance, Peak Hold, Fade In/Out, Clip (gdy
  nazwa narzędzia). PL OK dla dialogów (Potwierdź / Rozumiem), odmiany „klip”
  w zdaniach PL, Importuj UG, statusów połączenia — nie tłumacz nazw stref
  miksera ani stopki Timeline.

## Fazy

1. **Inventarz** — luki a11y, tokeny `--ss-*`, edge coverage happy-path; rankuj backlog.
2. **Małe zmiany** — jedna spójna zmiana na PR/commit (a11y / tokens / edge tests). Commit/PR tylko gdy użytkownik prosi (trunk-based: domyślnie `main`).
3. **Handoff** — zawsze na koniec lub przy stop (patrz niżej).

Nie używaj nieskończonego `/loop`. Jedna fala → wynik → kolejna, aż deadline.

## Stop → handoff natychmiast

Wyzwalacze: limit użycia, deadline, użytkownik „stop”, utrata kontekstu.

**Nie** zaczynaj „jeszcze jednej fali”. Napisz raport.

### Handoff path

- Kanoniczny: `docs/analysis/reports/hygiene/report-{nightshift|evening}-hygiene-YYYY-MM-DD.md`
- Robocze notatki: tylko `docs/analysis/working/` (gitignore) — nie linkuj z zewnątrz

Nazewnictwo: [docs-analysis-naming.mdc](../../rules/docs-analysis-naming.mdc).

### Szablon handoff

```markdown
# {Night-shift|Evening} hygiene — YYYY-MM-DD

**Agent:** …
**Window:** … Europe/Warsaw
**Scope:** parity / tech debt only (no 5.2+; no transport/timebase math; no Docker/Tauri packaging)

## Open / merged PRs

| PR | Title | Scope |
|----|-------|-------|
| … | … | … |

## Ranked backlog (next)

1. …

## Skipped / off-limits

- …

## Notes

- …
```

## Done vs docs

- Nie oznaczaj Done / nie wypychaj do CHANGELOG bez realnego kodu + testów.
- Domknięcie chore/docs/ci/test **bez** wpisu CHANGELOG (złota zasada w [`changelog.mdc`](../../rules/changelog.mdc)).

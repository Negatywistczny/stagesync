# ADR 0001 — Storage layout

- **Status:** Accepted
- **Date:** 2026-07-19

## Context

StageSync v5 needs a clear on-disk layout for library index, per-project data, and logs, separate from the legacy single `database.json` blob. Validation must happen at I/O edges so corrupt or unknown shapes fail fast.

## Decision

Runtime / template data lives under repo `data/`:

```
data/
  library/
    library.template.json   # seed / template for library index
    …                       # runtime library index (user; gitignored where appropriate)
  projects/
    <projectId>/            # one directory per project
  logs/                     # server / app logs
```

- Empty directories are kept in git via `.gitkeep`.
- **Zod schemas** from `@stagesync/shared` validate at edges (load/save, HTTP). Invalid data is rejected — no silent repair in day-0.

## Consequences

- Migrators and CRUD can target paths by project id without a monolithic DB file.
- Legacy 4.x import belongs in a dedicated migrator later; do not dual-write legacy shapes into this layout.

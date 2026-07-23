# Standardy zewnętrzne

Nie kopiujemy pełnych specyfikacji do repo — **linki** + egzekucja narzędziami / regułami projektu.

| Standard | Jak u nas | Specyfikacja |
|----------|-----------|--------------|
| Conventional Commits | commitlint + husky; treść EN | [PL](https://www.conventionalcommits.org/pl/v1.0.0/) |
| Semantic Versioning | `package.json` + [versioning.mdc](../.cursor/rules/versioning.mdc) | [PL](https://semver.org/lang/pl/) |
| Keep a Changelog | [CHANGELOG.md](../CHANGELOG.md) | [PL](https://keepachangelog.com/pl/1.1.0/) |
| ADR | [Indeks](./adr/README.md) (`docs/adr/`) | [adr.github.io](https://adr.github.io/) |
| EditorConfig | [`.editorconfig`](../.editorconfig) | [editorconfig.org](https://editorconfig.org/) |
| TSDoc | Publiczne API w `@stagesync/shared` (gdy dojrzeje) | [tsdoc.org](https://tsdoc.org/) |
| JSON:API | **Nie** — [ADR 0006](./adr/0006-no-json-api.md); kształt: [docs/api/](./api/README.md) | [jsonapi.org/format](https://jsonapi.org/format/) |

## Coverage (Codecov)

Bramki są **per warstwa** ([`codecov.yml`](../codecov.yml) flags) — **nie** gonimy overall %.

| Flaga | Target (project) | Zakres |
|-------|------------------|--------|
| `shared` | ≥ 85% | `packages/shared` |
| `server` | ≥ 70% (→ 75%) | `apps/server` |
| `web` | ≥ 65% | `apps/web/src/lib` + `transport` |
| `ui` | (gdy CI upload) | `packages/ui` |

- `apps/web/src/shells/**` i `*.module.css` — **ignore** w statusie patch/project (shells → Playwright, nie Vitest line %).
- Overall / default Codecov status — **informational** only.

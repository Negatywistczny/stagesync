# ADR 0013 — Dokumentacja in-app vs GitHub

- **Status:** Zaakceptowany
- **Data:** 2026-07-21
- **Etap:** `5.0.0-beta.1`

## Kontekst

Operator na scenie potrzebuje **minimum operacyjnego** pod palec (skróty, tooltips, wersja).
Pełna instrukcja, ADR-y, audyty i schematy Zod żyją na **GitHubie** — nie w paczce `.dmg` / `.msi`.

Desktop bundle ([ADR 0010](./0010-desktop-shell-tauri.md)) zawiera runtime (sidecar Node, `web/dist`, seed),
nie repozytorium dokumentacji.

## Decyzja

### W aplikacji (bundle / UI)

Trafia **wyłącznie**:

| Element | Implementacja |
|---------|----------------|
| Ściągawka skrótów i gestów | [`TimelineHelp.tsx`](../../apps/web/src/shells/timeline/TimelineHelp.tsx) — overlay `?` / przycisk Pomoc |
| Podpowiedzi kontekstowe | `title` / `aria-label` przy kontrolkach shelli |
| O aplikacji | Admin → Host → sekcja „O aplikacji”: wersja, bilan hosta, **link** otwierający pełną instrukcję na GitHubie w przeglądarce systemowej (`open_external_url` w Tauri) |

Treść operatorska = **React / stringi w kodzie**, nie pliki `.md` w bundlu.

### Na GitHubie

| Zawartość | Lokalizacja |
|-----------|-------------|
| Instrukcje instalacji / Docker / desktop | [`INSTALL.md`](../INSTALL.md), [`DESKTOP.md`](../DESKTOP.md) |
| ADR, architektura, roadmap, audyty | [`docs/`](./), [`ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Kontrakt API (krótko) | [`docs/api/`](../api/README.md) |

### W bundle desktop (Tauri sidecar)

Dozwolone w `resources/sidecar/`:

- `web/` — Vite `dist`
- `server/dist/` — skompilowany host
- `seed/` — `library.template.json`
- `server/node_modules/` — zależności runtime (optymalizacja rozmiaru → osobny PR)

**Zakaz:** katalog `docs/` repo, ADR-y, raporty audytowe, `README.md` produktowy w `web/` lub `server/dist/`.
Build: [`launch/scripts/build-desktop-sidecar.mjs`](../../launch/scripts/build-desktop-sidecar.mjs) — assert po pakowaniu.

## Konsekwencje

- Nowe materiały dla operatora → komponent UI / tooltip; pełne tutoriale → `docs/` + link z About.
- PR review desktop: `tauri.conf.json` `bundle.resources`, skrypt sidecar — bez `docs/`.
- Release CI: krok `build-desktop-sidecar.mjs` przed `tauri build` ([`release.yml`](../../.github/workflows/release.yml)).
- Artefakty sidecar (`resources/`, `bin/`, `lib/`, `share/`) w `.gitignore` — build-only.

## Powiązane

- [ADR 0010](./0010-desktop-shell-tauri.md) — desktop shell
- [ARCHITECTURE.md](../ARCHITECTURE.md) — mapa dokumentacji repo

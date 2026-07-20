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
| JSON:API | **Nie** — [ADR 0006](./adr/0006-no-json-api.md) | [jsonapi.org/format](https://jsonapi.org/format/) |

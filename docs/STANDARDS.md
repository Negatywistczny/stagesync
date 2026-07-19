# Standardy zewnętrzne

Nie kopiujemy pełnych specyfikacji do repo — trzymamy **linki** i egzekwujemy je narzędziami / naszymi regułami.

| Standard | Jak u nas | Specyfikacja |
|----------|-----------|--------------|
| Conventional Commits | commitlint + husky (`commit-msg`); treść commitów po angielsku | [PL](https://www.conventionalcommits.org/pl/v1.0.0/) |
| Semantic Versioning | root `package.json` + [versioning.mdc](../.cursor/rules/versioning.mdc) | [PL](https://semver.org/lang/pl/) |
| Keep a Changelog | [CHANGELOG.md](../CHANGELOG.md) (nagłówki sekcji po polsku) | [PL](https://keepachangelog.com/pl/1.1.0/) |
| Architecture Decision Records | [docs/adr/](./adr/) | [adr.github.io](https://adr.github.io/) |
| EditorConfig | [`.editorconfig`](../.editorconfig) w root | [editorconfig.org](https://editorconfig.org/) |
| TSDoc | Doc comments przy publicznym API w `@stagesync/shared` (gdy API dojrzeje) | [tsdoc.org](https://tsdoc.org/) |
| JSON:API | **Nie stosujemy** (brak ADR). Proste REST / Socket — do decyzji później | [jsonapi.org/format](https://jsonapi.org/format/) |

Zobacz też [CONTRIBUTING.md](../CONTRIBUTING.md) (język docs vs commity) i [konstytucję](../.cursor/rules/constitution.mdc).

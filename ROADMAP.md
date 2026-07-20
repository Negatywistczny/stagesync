# StageSync — Roadmapa

Kierunek produktu (długoterminowy). **Bieżące zadania:** [docs/TODO.md](docs/TODO.md).  
Historia wydań: [CHANGELOG.md](CHANGELOG.md).

## Linie

| Linia | Cel |
|-------|-----|
| **5.0.0-alpha.*** | Wiring funkcji na szkielecie shelli; transport SSOT; biblioteka CRUD |
| **Przed 5.0.0** | Polish UI (typografia, proporcje, copy) na żywych kontrolkach; fundament density już w alphie |
| **5.0.0** | Stabilne wydanie + nazwa hero linii |
| **Audio 0…N** | Upload, odtwarzanie, sync z transportem (ACL → [ADR 0005](docs/adr/0005-domain-axioms.md)) |
| **MIDI I/O** | Clock / urządzenia po stronie serwera (ACL → ADR 0005) |
| **Migrator 4.x → v5** | Import legacy do `data/projects/<id>/` (ACL → ADR 0005) |
| **Docker Compose** | Lokalny / produkcyjny stack ([ADR 0004](docs/adr/0004-updates-docker.md)) |
| **Motywy** | `data-theme` na tokenach `--ss-*` + switcher |

## Granica 0

Zmiana aksjomatów czasu (takt 1 / pre-roll ≤ 0 / ticks) lub izolacji folderów
projektów = nowa edycja, nie pozycja roadmapy „feature”. Zob.
[ADR 0005](docs/adr/0005-domain-axioms.md).

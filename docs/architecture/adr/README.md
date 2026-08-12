> [📦 StageSync](../../../README.md) / [docs](../../README.md) / [architecture](../README.md)

# 💡 adr/ — Architecture Decision Records

Rejestr decyzji architektonicznych projektu StageSync v5. Dobre praktyki i specyfikacja formatu: [adr.github.io](https://adr.github.io/).

## 📊 Statusy decyzji

| Status                        | Znaczenie                                    |
| :---------------------------- | :------------------------------------------- |
| **Proponowany**               | W dyskusji; jeszcze nie obowiązuje           |
| **Zaakceptowany**             | Obowiązująca decyzja architektoniczna        |
| **Wycofany**                  | Nie obowiązuje; brak bezpośredniego następcy |
| **Zastąpiony przez ADR NNNN** | Superseded — zastąpiony przez nowszą decyzję |

## 📁 Indeks ADR

| Nr                                                    | Tytuł                                               | Status        |
| :---------------------------------------------------- | :-------------------------------------------------- | :------------ |
| [0001](./0001-storage-layout.md)                      | Układ storage                                       | Zaakceptowany |
| [0002](./0002-timebase-ssot.md)                       | Timebase SSOT                                       | Zaakceptowany |
| [0003](./0003-ui-direction-booth.md)                  | Kierunek wizualny UI                                | Zaakceptowany |
| [0004](./0004-updates-docker.md)                      | Aktualizacje przez Docker                           | Zaakceptowany |
| [0005](./0005-domain-axioms.md)                       | Granica 0 (Domain Axioms)                           | Zaakceptowany |
| [0006](./0006-no-json-api.md)                         | Bez JSON:API                                        | Zaakceptowany |
| [0007](./0007-snap-grid.md)                           | Snap / edit grid (kwantyzacja edycji)               | Zaakceptowany |
| [0008](./0008-timeline-clip-editing.md)               | Edycja klipów Timeline (Forma, audio, Smart Tool)   | Zaakceptowany |
| [0009](./0009-project-schema-v3.md)                   | Project schema v3 (pliki / audio refs)              | Zaakceptowany |
| [0010](./0010-desktop-shell-tauri.md)                 | Desktop shell (Tauri)                               | Zaakceptowany |
| [0011](./0011-ui-parity-behavior.md)                  | Parity behawioralna + IA (rebuild alpha)            | Zaakceptowany |
| [0012](./0012-user-data-location.md)                  | Lokalizacja danych użytkownika                      | Zaakceptowany |
| [0013](./0013-in-app-vs-github-docs.md)               | Dokumentacja in-app vs GitHub                       | Zaakceptowany |
| [0014](./0014-desktop-launcher.md)                    | Desktop Launcher (ekran startowy)                   | Zaakceptowany |
| [0015](./0015-daw-reference-and-product-decisions.md) | Referencja Logic + stałe decyzje PO                 | Zaakceptowany |
| [0016](./0016-android-performer-console.md)           | Android Performer + Console (Kotlin WebView)        | Zaakceptowany |
| [0017](./0017-live-show-control-contracts.md)         | Live Show Control — kontrakty produktowe 1–8        | Zaakceptowany |
| [0018](./0018-future-audio-architecture.md)           | Przyszła architektura audio (Live Processing, 6.0+) | Zaakceptowany |
| [0019](./0019-dual-engine-studio-live.md)             | Dual Engine: Studio vs Live (6.0+)                  | Zaakceptowany |

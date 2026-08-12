# Triage: Analiza Produktowo-Wdrożeniowa Roadmapy StageSync (v5.5 – v7.1)

**Źródło:** [analiza-produktowo-wdrozeniowa-stagesync-roadmap.md](./analiza-produktowo-wdrozeniowa-stagesync-roadmap.md) (Analiza strategiczna / Roadmap)  
**Status:** `open`  
**Obszar:** Architektura długofalowa · Dual Engine (Studio vs Live) · VST/MIDI · Workflow estradowy (v5.5 – v7.1)  
**Data triage:** 2026-08-06  
**Ostatnia aktualizacja:** 2026-08-09  
**Kąt:** strategiczna roadmapa rozwoju silnika i narzędzi FOH/scena

## Werdykt przydatności

**Wysoka wartość strategiczna dla architektury i roadmapy StageSync.** Dokument wyznacza spójną ścieżkę ewolucji od wersji 5.5. Kluczowe koncepcje Dual Engine (Studio vs Live) oraz Freeze przed Live są **SSOT w ADR** — dump nadal nie-SSOT. Operacyjne Must-Have (Solo/Mute Panic, Chase MIDI) pozostają w backlogu ([`docs/TODO.md`../../../../TODO.md)).

**SSOT po align 2026-08-09:** [ADR 0019../../../../architecture/adr/0019-dual-engine-studio-live.md) (Dual Engine), [ADR 0018../../../../architecture/adr/0018-future-audio-architecture.md) (Plugin Host sidecar + Freeze + prosta edycja). Raport: [report-adr-dual-engine-vst-align.md](../../reports/current/report-adr-dual-engine-vst-align.md).

## Epiki / tematy vs dysk (`main`)

| ID / temat                          | Stan         | Notatka                                                                                                                                                                                           |
| ----------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RM-01 Solo / Mute Panic Button      | `hypothesis` | Must-have dla linii 5.5.0; planowane w [`TODO.md`../../../../TODO.md)                                                                                                                             |
| RM-02 Audition / PFL Routing        | `hypothesis` | Dedykowana magistrala FOH w WebAudio                                                                                                                                                              |
| RM-03 Chase MIDI Notes              | `hypothesis` | Algorytm wstecznego skanowania nut na linii 5.5.0                                                                                                                                                 |
| RM-04 Multi-Window via Tauri        | `hypothesis` | Okna pomocnicze w shellu desktopowym (v5.6.0)                                                                                                                                                     |
| RM-05 Obsługa Pedałów Bluetooth     | `hypothesis` | Zdarzenia HID w Kliencie (v5.6.0)                                                                                                                                                                 |
| RM-06 Insert Silence / Delete Time  | `hypothesis` | Helpery manipulacji osią czasu po stronie serwera (v5.8.0)                                                                                                                                        |
| RM-07 Collect All and Save          | `hypothesis` | Kopiowanie zasobów do `data/projects/<id>/assets/` (v5.8.0)                                                                                                                                       |
| RM-08 Dual Engine (Studio vs Live)  | `adr`        | SSOT: [ADR 0019../../../../architecture/adr/0019-dual-engine-studio-live.md)                                                                                                                      |
| RM-09 VST Freeze Pipeline           | `adr`        | SSOT: [ADR 0018../../../../architecture/adr/0018-future-audio-architecture.md) §1 + [ADR 0019../../../../architecture/adr/0019-dual-engine-studio-live.md) §4 (sandbox sidecar; zakaz in-process) |
| RM-10 Rig Manager & MIDI Learn      | `hypothesis` | Abstrakcja portów MIDI (v6.2.0)                                                                                                                                                                   |
| RM-11 Setlist Pre-flight Check      | `hypothesis` | Automatyczny skaner gotowości projektu przed gigiem (v6.2.0)                                                                                                                                      |
| RM-12 Studio Notation Edit          | `hypothesis` | Edycja partytur MusicXML odroczona do linii 7.0.0                                                                                                                                                 |
| RM-13 Zero-Glitch HA (Master/Spare) | `hypothesis` | Protokoły wysokiej dostępności / Heartbeat (v7.1.0)                                                                                                                                               |

## Must / Should / Later (PO) — wynik

| Priorytet | ID                               | Wynik                                                       |
| --------- | -------------------------------- | ----------------------------------------------------------- |
| Must      | RM-01…03, RM-06…07, RM-09, RM-11 | **Włączone do strategicznego planu i TODO**; RM-08/09 = ADR |
| Should    | RM-04…05, RM-10                  | **Zatwierdzone jako kierunek**; RM-08 przeniesione do `adr` |
| Later     | RM-12, RM-13                     | **Odroczone do linii 7.x**                                  |

## Domknięcie

- Dual Engine + Freeze = **SSOT w ADR 0018/0019** (2026-08-09); dump pozostaje inspiracją.
- Residual: rozjazd numeracji **6.1 Karaoke (ADR / tabela ROADMAP)** vs **6.1 DMX (dolna ROADMAP/TODO z dumpa)** oraz linii 7.x — osobny align, nie mylić z Dual Engine.
- Elementy operacyjne (v5.5) nadal w [`docs/TODO.md`../../../../TODO.md).

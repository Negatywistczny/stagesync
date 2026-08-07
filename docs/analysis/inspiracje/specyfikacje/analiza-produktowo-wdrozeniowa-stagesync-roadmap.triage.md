# Triage: Analiza Produktowo-Wdrożeniowa Roadmapy StageSync (v5.5 – v7.1)

**Źródło:** [analiza-produktowo-wdrozeniowa-stagesync-roadmap.md](./analiza-produktowo-wdrozeniowa-stagesync-roadmap.md) (Analiza strategiczna / Roadmap)  
**Status:** `open`  
**Obszar:** Architektura długofalowa · Dual Engine (Studio vs Live) · VST/MIDI · Workflow estradowy (v5.5 – v7.1)  
**Data triage:** 2026-08-06  
**Ostatnia aktualizacja:** 2026-08-06  
**Kąt:** strategiczna roadmapa rozwoju silnika i narzędzi FOH/scena

## Werdykt przydatności

**Wysoka wartość strategiczna dla architektury i roadmapy StageSync.** Dokument wyznacza spójną ścieżkę ewolucji od wersji 5.5 aż do 7.1. Kluczowe koncepcje (w szczególności podział na *Dual Engine: Studio vs Live* w v6.0.0 oraz rygorystyczne podejście do zamrażania VST przed koncertem) są w pełni zgodne z Konstytucją projektową StageSync v5 (brak atrap, stabilność live, SSOT czasu). Wybrane elementy Must-Have (Solo/Mute Panic, Chase MIDI) trafiają do aktywnego backlogu (`docs/TODO.md`), zaś zaawansowane koncepcje stanowią bazę pod przyszłe ADR-y.

## Epiki / tematy vs dysk (`main`)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| RM-01 Solo / Mute Panic Button | `hypothesis` | Must-have dla linii 5.5.0; planowane w `TODO.md` |
| RM-02 Audition / PFL Routing | `hypothesis` | Dedykowana magistrala FOH w WebAudio |
| RM-03 Chase MIDI Notes | `hypothesis` | Algorytm wstecznego skanowania nut na linii 5.5.0 |
| RM-04 Multi-Window via Tauri | `hypothesis` | Okna pomocnicze w shellu desktopowym (v5.6.0) |
| RM-05 Obsługa Pedałów Bluetooth | `hypothesis` | Zdarzenia HID w Kliencie (v5.6.0) |
| RM-06 Insert Silence / Delete Time | `hypothesis` | Helpery manipulacji osią czasu po stronie serwera (v5.8.0) |
| RM-07 Collect All and Save | `hypothesis` | Kopiowanie zasobów do `data/projects/<id>/assets/` (v5.8.0) |
| RM-08 Dual Engine (Studio vs Live) | `hypothesis` | Kluczowy paradygram architektoniczny dla v6.0.0 |
| RM-09 VST Freeze Pipeline | `hypothesis` | Wymóg offline renderu WAV przed wejściem w tryb Live |
| RM-10 Rig Manager & MIDI Learn | `hypothesis` | Abstrakcja portów MIDI (v6.2.0) |
| RM-11 Setlist Pre-flight Check | `hypothesis` | Automatyczny skaner gotowości projektu przed gigiem (v6.2.0) |
| RM-12 Studio Notation Edit | `hypothesis` | Edycja partytur MusicXML odroczona do linii 7.0.0 |
| RM-13 Zero-Glitch HA (Master/Spare) | `hypothesis` | Protokoły wysokiej dostępności / Heartbeat (v7.1.0) |

## Must / Should / Later (PO) — wynik

| Priorytet | ID | Wynik |
|-----------|-----|--------|
| Must | RM-01…03, RM-06…07, RM-09, RM-11 | **Włączone do strategicznego planu i TODO** |
| Should | RM-04…05, RM-08, RM-10 | **Zatwierdzone jako kierunek architektoniczny** |
| Later | RM-12, RM-13 | **Odroczone do linii 7.x** |

## Domknięcie

- **Triage roadmapy w toku / open.** Kluczowe elementy operacyjne (v5.5) są zgłoszone do integracji z `docs/TODO.md`.
- Architektura Dual Engine (v6.0) stanowi oficjalny punkt odniesienia dla kolejnych ADR-ów.

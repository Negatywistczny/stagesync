# Triage: GPT — wczesna konstytucja projektu

**Źródło:** [GPT-Konstytucja-Projektu.md](./GPT-Konstytucja-Projektu.md)  
**Status:** `archive`
**Obszar:** Governance / reguły AI  
**Data triage:** 2026-07-24 (closeout vs SSOT)

## Werdykt przydatności

**Provenance governance.** Idea „konstytucji której nie wolno łamać” i mapy docs → wchłonięta do `.cursor/rules`, `docs/ARCHITECTURE.md`, CONTRIBUTING. Szczegóły dumpu (design-before-code zawsze, changelog w każdym PR) **nie** są aktualnym workflow.

## Rozstrzygnięte

| ID | Temat | Stan | Dowód |
|----|--------|------|--------|
| HB-GK-01 | Jedno źródło prawdy per typ docs | `fixed` | ARCHITECTURE mapa + changelog/todo-hygiene |
| HB-GK-02 | SSOT czasu / warstwy | `fixed` | ADR 0002, 0005, konstytucja |
| HB-GK-03 | „Najpierw projekt, potem kod” jako hard gate | `limit` | Trunk-based małe kroki na `main`; ADR gdy blast radius |
| HB-GK-04 | Changelog obowiązkowy w każdym PR | `rejected` | Złota zasada changelog.mdc |
| HB-GK-05 | Hermetyczne moduły „nie wiedzą o sobie” | `partial` | apps→packages OK; shelly łączą domeny celowo |

## Następny krok

Brak. Konflikt dump ↔ repo → **wygrywa SSOT**.

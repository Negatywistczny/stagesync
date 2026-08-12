# Triage: Ocena strategii produktu StageSync v5 (CRIT-ID-01)

**Źródło:** [Ocena-Strategii-Produktu-StageSync-v5.md](./Ocena-Strategii-Produktu-StageSync-v5.md) (Gemini / AI Exporter)  
**Status:** `open`  
**Obszar:** Tożsamość produktu · Logic-First · Console host · PIN · Sampler · Flex/Takes · menubar  
**Data triage:** 2026-07-26  
**Companion:** [ADR 0015../../../../architecture/adr/0015-daw-reference-and-product-decisions.md) · [ADR 0016../../../../architecture/adr/0016-android-performer-console.md) · [Krytyka-strategii-Mobile-for-Live.triage.md](./Krytyka-strategii-Mobile-for-Live.triage.md)

## Werdykt przydatności

**Średnia–wysoka jako esej strategiczny — nie implementacyjny SSOT.** KEEP: Performer read-only, PIN/OAuth OUT, Sampler CueClip, menubar OUT — zgodne z ADR/dyskiem. REVISE Logic-First → tylko gesty Timeline — **napięcie z ADR 0015** (Logic = pierwsza referencja po SSOT/stubs). REVERT Console local host — **odrzucone bez PO** (ADR IN; host on-tree). REVISE Flex/Takes „wykreślić ze strategii” — ADR mówi „nie permanent OUT / później”; dump chce twardsze OUT — tylko PO.

## Macierz

| ID  | Decyzja                         | Werdykt dumpu      | Stan                    | Notatka                                                                                        |
| --- | ------------------------------- | ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Logic Pro first (po SSOT/stubs) | REVISE             | `limit` (ADR KEEP)      | Re-open tylko PO; dump zawęża do gestów edycji                                                 |
| 2   | Console = full desktop + host   | REVERT             | `on-tree` / konflikt    | Jak Mobile critique — limity realne, OUT bez PO = nie                                          |
| 3   | Performer Client-only           | KEEP               | `confirmed`             |                                                                                                |
| 4   | OAuth OUT; PIN MVP; scenic lock | KEEP               | `partial`               | PIN on-tree; scenic lock **już usunięty** (dump może być stale na „scenic lock” jako aktywnym) |
| 5   | Sampler CueClip; Master\|Bus    | KEEP               | `on-tree` / residual HW | Sampler triage; HW sample = osobny REVISE                                                      |
| 6   | Flex/Takes/recording później    | REVISE → wykreślić | `hypothesis`            | ADR: nie permanent OUT                                                                         |
| 7   | Menubar OUT Audio/MIDI/…        | KEEP               | `confirmed`             | ADR 0015                                                                                       |

## Sprzeczność ADR 0015 × 0016 (sekcja C dumpu)

Dump: „pełny host” + MIDI none / 16KB / Doze = naruszenie „brak funkcji = brak UI”. **Częściowo trafne jako limity runtime** — ADR 0016 już dokumentuje MIDI N/A i statusy uczciwe. To nie jest automatyczny wymóg usunięcia hosta; to wymóg **uczciwego UI statusu** (już w ADR).

## Następny krok

1. Nie revert Console host / nie wykreślać Flex z ADR bez PO.
2. Przy Q&A: trzy pytania dumpu (host OUT? Flex OUT? multi-out hide?) — mapować na istniejące ADR, nie na nowy backlog.
3. Używać razem z Krytyka Mobile-for-Live.

# Triage: Motywy + Auth — bezpieczeństwo i Scenic UX (CRIT-THM-01)

**Źródło:** [MotywyAuth-Bezpieczenstwo-UX-Decyzje.md](./MotywyAuth-Bezpieczenstwo-UX-Decyzje.md) (Gemini / AI Exporter)  
**Status:** `partial`  
**Obszar:** Operator PIN · OAuth OUT · themeLock OUT · tokeny operacyjne · backlog ≠ OUT  
**Data triage:** 2026-07-26  
**Companion:** [Specyfikacja-Motywow-i-Autentykacji-DAW.triage.md](./Specyfikacja-Motywow-i-Autentykacji-DAW.triage.md) · [ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md)

## Werdykt przydatności

**Wysoka jako review decyzji już częściowo wdrożonych.** Dump potwierdza kierunek MVP (PIN, OAuth OUT, usunięcie scenic lock, residual 4 profili) — zgodny z companion Motywy i dyskiem. Nie SSOT; pytania PO (TTL PIN, panic override, HDMI theme, OSMD invert) = hipotezy.

## Macierz vs dysk / ADR

| ID / temat                                   | Werdykt dumpu | Stan              | Notatka                                                                                                  |
| -------------------------------------------- | ------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| OAuth / multi-user OUT w 5.2                 | KEEP          | `limit`           | Zgodne z Motywy AUTH-01 Option C — **skip** stubów logowania                                             |
| Operator PIN MVP                             | KEEP / REVISE | `on-tree`         | `STAGESYNC_OPERATOR_PIN` + gate mutacji; transport ungated — REVISE telemetry OK                         |
| Scenic Lock `themeLock`                      | REVERT        | `confirmed` / out | Usunięte post-`5.2.0`; zostaje host default + lokalny motyw                                              |
| Light + HC residual matrix                   | KEEP          | `hypothesis`      | TODO Motywy residual — [TODO 5.3+](../../../TODO.md)                                                     |
| Niezmienniki playhead/locator/solo/mute/OSMD | KEEP          | `partial`         | Semantyka OK; dump: locator=`warning` — **ADR 0015:** locator=`primary`, playhead=`info` → korekta dumpu |
| Motywy/Auth w backlogu ≠ permanent OUT       | KEEP          | `confirmed`       | ADR 0015 §0                                                                                              |

## Confirmed vs hypothesis

- **Confirmed:** PIN on-tree; scenic lock usunięty; OAuth OUT w 5.2.
- **Rejected (vs ADR):** locator jako `--ss-color-warning` w dumpu — kanon ADR = `primary`.
- **Open PO:** TTL sesji PIN; panic override; HDMI Out theme; OSMD invert w HC.

## Następny krok

1. Nie przywracać themeLock bez PO.
2. Residual 4-profile + THM-03 tokeny — companion Motywy / TODO.
3. Pytania PO (TTL / panic / HDMI / OSMD) — bez wpisu TODO aż do decyzji.

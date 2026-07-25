# Triage: Motywy wizualne (THM) + Host Operator PIN / ACL (AUTH) — intro 5.2+

**Źródło:** [Specyfikacja-Motywow-i-Autentykacji-DAW.md](./Specyfikacja-Motywow-i-Autentykacji-DAW.md) (Gemini / AI Exporter)  
**Status:** `partial`  
**Obszar:** Appearance (`data-theme` / kontrast) · scenic lock · Operator PIN · ACL na krawędziach  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (scenic lock on tree)  
**Kąt:** wprowadzenie feature 5.2+ (nie audyt HW G1–G10)

## Werdykt przydatności

**Wysoka jako macierz epików THM/AUTH + zakazy ADR 0011.** Dump rozdziela skin od auth (Pace Layering / Granica 0) — zgodne z konstytucją. Nie SSOT; nie claim Done. Cluster TODO: [TODO.md](../../../TODO.md) „Motywy” + „Operator PIN”; ROADMAP § Po 5.1.0.

## Epiki / tematy vs `main` (5.1.x)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| THM-01 light + high-contrast tokeny | `partial` | `tokens.css` + `appearance.ts` — light / `data-contrast` na `main`; pełna macierz 4 profili MVP z dumpu = hipoteza rozbudowy |
| THM-02 `localStorage` per urządzenie | `partial` | Klucze `stagesync-theme` / `stagesync-contrast` (nie monoklucz `stagesync-appearance`); brak `STAGESYNC_THEME_DEFAULT` z serwera |
| THM-02 Scenic Lock (`liveDesk.themeLock`) | `on-tree` | Live Desk SSOT + WS fanout; Admin Scena przełączniki; Client apply + disable local — **bez** claim HW green |
| THM-03 niezmienniki playhead ≠ locator / Solo·Mute / OSMD paper | `hypothesis` | Sprawdzić tokeny vs dump przed implementacją skinów |
| AUTH-01 Host Operator PIN (MVP) | `confirmed` | Grep: brak `STAGESYNC_OPERATOR_PIN` / nagłówka PIN w `apps/server` |
| AUTH-01 Option C OAuth/JWT | `limit` | Dump: Later / OUT w 5.2 |
| AUTH-02 ACL ról na REST/WS | `confirmed` | Brak PIN-gated destrukcyjnych komend; lokalne prefs Client już lokalne |

## Confirmed vs hypothesis

- **Confirmed gap (residual):** Operator PIN + ACL; host default theme.
- **On tree (nie „done 5.2”):** scenic lock + podstawowy light + high-contrast.
- **→ TODO:** Motywy (residual default) / Operator PIN w [TODO 5.2+](../../../TODO.md) (bez OAuth).

## Następny krok eng

1. Nie stubować „Zaloguj się” / OAuth.
2. Następny slice AUTH: opcjonalny `STAGESYNC_OPERATOR_PIN` + ACL destrukcyjnych krawędzi — osobno od skinu.
3. Cross-check `docs/ui/colors.md` / ADR 0003 booth vs THM-03.

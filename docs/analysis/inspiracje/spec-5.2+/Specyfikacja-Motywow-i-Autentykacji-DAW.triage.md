# Triage: Motywy wizualne (THM) + Host Operator PIN / ACL (AUTH) — intro 5.2+

**Źródło:** [Specyfikacja-Motywow-i-Autentykacji-DAW.md](./Specyfikacja-Motywow-i-Autentykacji-DAW.md) (Gemini / AI Exporter)  
**Status:** `open`  
**Obszar:** Appearance (`data-theme` / kontrast) · scenic lock · Operator PIN · ACL na krawędziach  
**Data triage:** 2026-07-25  
**Kąt:** wprowadzenie feature 5.2+ (nie audyt HW G1–G10)

## Werdykt przydatności

**Wysoka jako macierz epików THM/AUTH + zakazy ADR 0011.** Dump rozdziela skin od auth (Pace Layering / Granica 0) — zgodne z konstytucją. Nie SSOT; nie claim Done. Cluster TODO: [TODO.md](../../../TODO.md) „Motywy / auth / multi-user”; ROADMAP § Po 5.1.0.

## Epiki / tematy vs `main` (5.1.x)

| ID / temat | Stan vs dysk | Notatka |
|------------|--------------|---------|
| THM-01 light + high-contrast tokeny | `partial` | `tokens.css` + `appearance.ts` już mają light / `data-contrast`; pełna macierz 4 profili MVP z dumpu = hipoteza rozbudowy |
| THM-02 `localStorage` per urządzenie | `partial` | Lokalne klucze theme/contrast istnieją; brak `stagesync-appearance` monoklucza i `STAGESYNC_THEME_DEFAULT` z serwera |
| THM-02 Scenic Lock (`liveDesk.themeLock`) | `hypothesis` | Brak w kodzie — gap 5.2+ |
| THM-03 niezmienniki playhead ≠ locator / Solo·Mute / OSMD paper | `hypothesis` | Sprawdzić tokeny vs dump przed implementacją skinów |
| AUTH-01 Host Operator PIN (MVP) | `hypothesis` | Brak `STAGESYNC_OPERATOR_PIN` / nagłówka PIN — **confirmed gap** (brak auth) |
| AUTH-01 Option C OAuth/JWT | `limit` | Dump: Later / OUT w 5.2 |
| AUTH-02 ACL ról na REST/WS | `hypothesis` | Dziś brak PIN-gated destrukcyjnych komend; lokalne prefs Client już lokalne |

## Confirmed vs hypothesis

- **Confirmed gap:** brak Operator PIN / multi-user ACL; scenic lock nie istnieje.
- **Partial (nie „done 5.2”):** podstawowy light + high-contrast już na `main` — dump opisuje szerszy produkt (4 profile, lock, default hosta).
- **Nie → TODO** bez osobnego `confirmed` wiersza po repro; pozycja „Motywy / auth” już w [TODO 5.2+](../../../TODO.md).

## Następny krok eng

1. Nie stubować „Zaloguj się” / OAuth.
2. Przy planowaniu 5.2: najpierw THM switcher + tokeny; PIN opcjonalny flaga serwera — osobno od skinu.
3. Cross-check `docs/ui/colors.md` / ADR 0003 booth vs THM-03.

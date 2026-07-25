# Triage: Motywy wizualne (THM) + Host Operator PIN / ACL (AUTH) — intro 5.2+

**Źródło:** [Specyfikacja-Motywow-i-Autentykacji-DAW.md](./Specyfikacja-Motywow-i-Autentykacji-DAW.md) (Gemini / AI Exporter)  
**Status:** `partial`  
**Obszar:** Appearance (`data-theme` / kontrast) · scenic lock · Operator PIN · ACL na krawędziach  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (`STAGESYNC_THEME_DEFAULT` on tree; 4-profile matrix residual)  
**Kąt:** wprowadzenie feature 5.2+ (nie audyt HW G1–G10)

## Werdykt przydatności

**Wysoka jako macierz epików THM/AUTH + zakazy ADR 0011.** Dump rozdziela skin od auth (Pace Layering / Granica 0) — zgodne z konstytucją. Nie SSOT; nie claim Done. Cluster TODO: [TODO.md](../../../TODO.md) „Motywy”; ROADMAP § 5.2.

## Epiki / tematy vs `main` (5.2)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| THM-01 light + high-contrast tokeny | `partial` | `tokens.css` + `appearance.ts` — light / `data-contrast` na `main`; pełna macierz 4 profili MVP z dumpu = hipoteza rozbudowy |
| THM-02 `localStorage` per urządzenie | `on-tree` | Klucze `stagesync-theme` / `stagesync-contrast`; host default `STAGESYNC_THEME_DEFAULT` → health `themeDefault` gdy brak lokalnej preferencji |
| THM-02 Scenic Lock (`liveDesk.themeLock`) | `on-tree` | Live Desk SSOT + WS fanout; Admin Scena przełączniki; Client apply + disable local — **bez** claim HW green |
| THM-03 niezmienniki playhead ≠ locator / Solo·Mute / OSMD paper | `hypothesis` | Sprawdzić tokeny vs dump przed implementacją skinów |
| AUTH-01 Host Operator PIN (MVP) | `on-tree` | `STAGESYNC_OPERATOR_PIN` + middleware destrukcyjnych REST; `GET/POST /api/system/operator-auth`; Admin/Timeline gate + Client settings unlock; nagłówek `X-Stagesync-Operator-Pin` |
| AUTH-01 Option C OAuth/JWT | `limit` / **skip** | Dump: Later / OUT w 5.2 — **nie** stubować logowania |
| AUTH-02 ACL ról na REST/WS | `partial` | PIN-gated mutacje; transport play/stop + MIDI panic ungated; WS klient → serwer nadal tylko `client_hello` (brak destrukcyjnych komend WS) |

## Confirmed vs hypothesis

- **On tree:** scenic lock; Operator PIN; host theme default.
- **Residual / skip:** 4-profile matrix; OAuth.
- **→ TODO:** Motywy residual (macierz 4 profili) w [TODO 5.2+](../../../TODO.md); PIN + scenic lock + host default poza TODO; OAuth OUT.

## Następny krok eng

1. Nie stubować „Zaloguj się” / OAuth (**skip** uzasadniony).
2. Cross-check `docs/ui/colors.md` / ADR 0003 booth vs THM-03.
3. Kolejny epik 5.2: Mixer DAW (HW outs / bus→bus) albo Cues Sampler.

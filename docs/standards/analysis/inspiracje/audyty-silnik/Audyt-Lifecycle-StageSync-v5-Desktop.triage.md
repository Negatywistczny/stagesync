# Triage: Audyt lifecycle Desktop (Tauri launcher / sidecar)

**Źródło:** [Audyt-Lifecycle-StageSync-v5-Desktop.md](./Audyt-Lifecycle-StageSync-v5-Desktop.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** Tauri launcher / sidecar Node / mDNS / VERSION_MISMATCH / G1–G10  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (LIF-06/11/12 `confirmed` unit; reszta HW → `hypothesis`; G1–G10 ⬜)

## Werdykt przydatności

**Wysoka wartość operatorska** — mapa Idle→Connecting→In-session→Recovering oraz HW-LIF-01…12. Symbole w `apps/desktop` / `apps/server` istnieją. Fala kodowa rozstrzygnęła LIF-06 (pick_mdns_ipv4), LIF-11 (ACL remote lifecycle → 403), LIF-12 (debounce mDNS 400 ms). Pozostałe priorytetowe ID wymagają **HW / LIVE** — bez claim green G1–G10.

## Rozstrzygnięte

| ID        | Temat                                 | Stan        | Notatka                                                                                                                                                                                                                                                                                        |
| --------- | ------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HW-LIF-06 | mDNS vs Docker `172.17`               | `confirmed` | `cargo test pick_mdns_ipv4` — prywatny LAN przed mostem Docker; loopback/link-local tylko fallback. Smoke LAN na żywej sieci nadal opcjonalny.                                                                                                                                                 |
| HW-LIF-11 | Remote lifecycle bez tokena → 401/403 | `confirmed` | Vitest [`lifecycle-guard.test.ts`](../../../../../apps/server/src/security/lifecycle-guard.test.ts): remote IP bez tokena / ALLOW → **403** (nie 401); loopback OK; Bearer / `x-stagesync-host-token` / `ALLOW_REMOTE=1` OK. Brak LIVE cURL z drugiej maszyny LAN — ale ACL unit jest zielony. |
| HW-LIF-12 | mDNS debounce 400 ms przy Play/Pause  | `confirmed` | Vitest: 10× `refresh()` w <400 ms → 0 republish; po 400 ms → 1 ([`mdns-advertise.test.ts`](../../../../../apps/server/src/system/mdns-advertise.test.ts)).                                                                                                                                     |

## Otwarte (HW / LIVE)

| ID        | Temat                                 | Impact    | Stan         | Notatka                                                                                                              |
| --------- | ------------------------------------- | --------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| HW-LIF-01 | Double-click start — Mutex `starting` | Niski     | `hypothesis` | Kod: `start_local_host` odrzuca gdy `*starting`; brak dual-click HW / unit Tauri                                     |
| HW-LIF-02 | `kill -9` → orphan reclaim            | Wysoki    | `hypothesis` | Kod: `reclaim_ui_port_orphan` + unit `looks_like_stagesync_host`; pełny kill-9→restart = G4 HW                       |
| HW-LIF-03 | Port 4000 obcy proces                 | Wysoki    | `hypothesis` | Czytelny błąd vs biały ekran — G5 HW                                                                                 |
| HW-LIF-04 | Port 4000 stara wersja StageSync      | Wysoki    | `hypothesis` | Kod: mismatch `health.version` → `format_sidecar_failure`; unit `parse_health_version`; LIVE v5.0 vs v5.1 shell = HW |
| HW-LIF-05 | Sidecar `exit(1)` → launcher          | Krytyczny | `hypothesis` | Kod: `Terminated` → `pending_error` + `navigate_to_launcher`; brak automatycznego testu / HW                         |
| HW-LIF-07 | Utrata LAN remote                     | Wysoki    | `hypothesis` | Banner + `return_to_launcher` — HW                                                                                   |
| HW-LIF-08 | VERSION_MISMATCH + force              | Średni    | `hypothesis` | Prefiks Rust + UI `manualWarn` / `force: true` w kodzie; brak unit/LIVE mismatch                                     |
| HW-LIF-09 | Recent host probe 1500 ms             | Niski     | `hypothesis` | `RECENT_HEALTH_TIMEOUT_MS = 1500` w kodzie; brak repro timeoutu                                                      |
| HW-LIF-10 | MSI + Defender / SmartScreen          | Wysoki    | `hypothesis` | WinHW — G2                                                                                                           |

## Limity vs bugi (dump)

| Temat                           | Stan    | Notatka                                                       |
| ------------------------------- | ------- | ------------------------------------------------------------- |
| Failover multi-host / HA        | `limit` | Świadomie 5.2+ (#437 Safety Net) — ręczny powrót do Launchera |
| Auto-update w tle bez operatora | `limit` | Aktualizacja wymaga akcji w Adminie                           |
| Android shell                   | `limit` | 5.2+ w TODO                                                   |
| Orphan po Task Manager          | edge HW | = LIF-02 / G4 — nie „feature later”                           |

## Kontekst

- [TODO.md../../../../TODO.md) — G1–G10 Must residual po 5.1.0 (**⬜**, bez green z tej fali).
- [report-beta-gate.md](../../reports/current/report-beta-gate.md) — kanon bramek.

## Następny krok eng

1. **Nie** oznaczać G1–G10 green z tego pliku.
2. Priorytet HW smoke: LIF-02, LIF-05, LIF-04, potem G1/G2 instalatory; LIF-08 jeśli łatwy mismatch lokalny.
3. Do TODO tylko po `confirmed` na HW (bug) — LIF-06/11/12 to ochrona działająca, **bez** promocji backlogu.

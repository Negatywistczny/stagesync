# Triage: Audyt lifecycle Desktop (Tauri launcher / sidecar)

**Źródło:** [Audyt-Lifecycle-StageSync-v5-Desktop.md](./Audyt-Lifecycle-StageSync-v5-Desktop.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** Tauri launcher / sidecar Node / mDNS / VERSION_MISMATCH / G1–G10  
**Data triage:** 2026-07-25

## Werdykt przydatności

**Wysoka wartość operatorska** — mapa stanów Idle→Connecting→In-session→Recovering oraz HW-LIF-01…12. Symbole (`reclaim_ui_port_orphan`, `VERSION_MISMATCH`, `pick_mdns_ipv4`, `runtime.starting`) **istnieją** w `apps/desktop` — dump nie jest czystą fantazją. **G1–G10 = ⬜** bez claim green (już w [TODO.md](../../../TODO.md) Must residual). Checklist G w dumpie ≠ dowód.

## Hipotezy / scenariusze HW

| ID | Temat | Impact | Stan | Notatka |
|----|--------|--------|------|---------|
| HW-LIF-01 | Double-click start — Mutex `starting` | Niski | `hypothesis` | Kod ma lock; brak HW smoke w tej fali |
| HW-LIF-02 | `kill -9` → orphan reclaim | Wysoki | `hypothesis` | Krytyczne na Win/mac — bramka G4 |
| HW-LIF-03 / 04 | Port 4000 obcy / stara wersja | Wysoki | `hypothesis` | Czytelny błąd vs biały ekran (G5) |
| HW-LIF-05 | Sidecar `exit(1)` → powrót do launchera | Krytyczny | `hypothesis` | Recovering path |
| HW-LIF-06 | mDNS vs Docker `172.17` | Średni | `hypothesis` | Unit `pick_mdns_ipv4` w launcher.rs — smoke LAN |
| HW-LIF-07 | Utrata LAN remote | Wysoki | `hypothesis` | Banner + `return_to_launcher` |
| HW-LIF-08 | VERSION_MISMATCH + force | Średni | `hypothesis` | Prefiks w Rust + UI `manualWarn` |
| HW-LIF-09 | Recent host probe 1500 ms | Niski | `hypothesis` | |
| HW-LIF-10 | MSI + Defender / SmartScreen timeout | Wysoki | `hypothesis` | WinHW — G2 |
| HW-LIF-11 | Remote lifecycle bez tokena → 401 | Krytyczny | `hypothesis` | Security — nie claim bez cURL z LAN |
| HW-LIF-12 | mDNS debounce 400 ms przy Play/Pause | Średni | `hypothesis` | |

## Limity vs bugi (dump)

Failover multi-host, auto-update w tle, Android — **limit / 5.2+**, nie bug 5.1.x. Orphan po Task Manager = edge do HW (LIF-02), nie „feature later”.

## Kontekst

- [TODO.md](../../../TODO.md) — G1–G10 Must residual po 5.1.0.
- [report-beta-gate.md](../../reports/report-beta-gate.md) — kanon bramek; ten dump = inspiracja scenariuszy.

## Następny krok eng

1. **Nie** oznaczać G1–G10 green z tego pliku.
2. Priorytet smoke: LIF-02, LIF-05, LIF-04, LIF-11 (bezpieczeństwo), potem G1/G2 instalatory.
3. Do TODO tylko po `confirmed` na HW — nie cały katalog HW-LIF.

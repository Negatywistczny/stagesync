# Triage: Krytyka strategii Mobile-for-Live (ADR 0016)

**Źródło:** [Krytyka-strategii-Mobile-for-Live.md](./Krytyka-strategii-Mobile-for-Live.md) (Gemini / AI Exporter)  
**Status:** `partial`  
**Obszar:** Performer · Console host · sideload · Offline-First · Logic-First vs multi-out na Androidzie  
**Data triage:** 2026-07-26  
**Companion:** [Specyfikacja-Klienta-Mobile-StageSync-v5.2+.triage.md](./Specyfikacja-Klienta-Mobile-StageSync-v5.2+.triage.md) · [ADR 0016../../../../architecture/adr/0016-android-performer-console.md) · [#674](https://github.com/kacperczeczot/stagesync/issues/674)

## Werdykt przydatności

**Wysoka jako stress-test granic Console.** KEEP: Performer read-only, sideload APK, Offline-First Apply, brak audio/MIDI na Performerze — **zgodne** z ADR 0016 / dyskiem. REVISE Console local host → „awaryjny mono/stereo / Remote Shell default” — **koliduje** z ADR 0015/0016 (Console host = produkt IN). Nie revertować JNI/`libnode` bez PO; dump = argument do docs honesty (limit MIDI N/A, multi-out nie na Androidzie).

## Macierz

| Decyzja                        | Werdykt dumpu | Stan                     | Notatka                                                                                            |
| ------------------------------ | ------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| Performer Client-only          | KEEP          | `on-tree`                | ADR 0016                                                                                           |
| Console full UI + local host   | REVISE        | `on-tree` / konflikt ADR | Host JNI on-tree; native MIDI = N/A; HW smoke residual — dump ma rację o limitach, nie o OUT hosta |
| Sideload z hosta / Releases    | KEEP          | `on-tree`                | `/downloads/*.apk`                                                                                 |
| Offline-First + Zastosuj       | KEEP          | `on-tree`                | #692 MVP                                                                                           |
| Brak audio/MIDI na Performerze | KEEP          | `confirmed`              | SSOT server                                                                                        |
| Multi-out tylko desktop/rack   | REVISE scope  | `hypothesis` / `limit`   | Zgodne z praktyką WebAudio + TODO HW Out; nie wymaga OUT Console host                              |
| Block Apply gdy PLAYING        | —             | `hypothesis`             | Pytanie PO                                                                                         |
| iOS Performer (natywny)        | —             | `limit` / **OUT**        | Usunięte z TODO 5.3+; iOS = Safari/PWA `/client` (#809); natywne APK = Android only (ADR 0016)     |

## Confirmed vs hypothesis

- **Confirmed:** podział Performer/Console; sideload; Offline-First; limity MIDI na Android host.
- **Rejected jako wymóg eng:** revert local host bez PO (ADR IN).
- **Open:** pozycjonowanie produktowe „host awaryjny”; Ethernet rekomendacja FOH; Apply lock mid-PLAY.

## Następny krok

1. Residual #674 HW smoke — bez claim green.
2. Docs MOBILE: uczciwie opisać limity Android host (MIDI none, multi-out nie certyfikowane) — bez marketingu absencji w CHANGELOG.
3. Re-open Console host tylko jawnie PO.

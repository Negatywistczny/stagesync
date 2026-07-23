# ADR 0014 — Desktop Launcher (ekran startowy)

- **Status:** Zaakceptowany
- **Data:** 2026-07-23
- **Etap:** `5.1.0` — **Launch & Mix**

## Kontekst

Desktop ([ADR 0010](./0010-desktop-shell-tauri.md)) zawsze spawnował lokalny sidecar i od razu nawigował WebView do `http://127.0.0.1:4000/admin`. Błędy startu lądowały w data-URL `<pre>`. Operator nie mógł wybrać hosta w LAN ani dołączyć do zdalnego StageSync bez lokalnego Node.

SPA web jest **same-origin** — nie da się pokazać React Launchera *zanim* istnieje host.

## Decyzja

1. **Bundled Launcher** w `apps/desktop/launcher/` jako `frontendDist` Tauri — UI przed sidecarem.
2. **Lokalny host** tylko na żądanie (`start_local_host`) — health + nawigacja do `/admin`.
3. **Zdalny / LAN** — probe `GET /api/health`, potem nawigacja WebView na `{origin}/admin`.
4. **Discovery = mDNS** — serwer advertise `_stagesync._tcp` (gdy mDNS włączone i bind ≠ loopback); shell browse w Rust (`mdns-sd`).
5. **Diagnostyka** w Launcherze (status, log sidecara, Ponów) — bez whitescreen data-URL.
6. SSOT czasu / transport / MIDI **pozostają** w Node sidecarie / zdalnym hoście — shell nie staje się zegarem.
7. **Odporność:** health/probe z twardym timeoutem (~3 s); mDNS z budżetem ~4 s i preferencją IP LAN; uszkodzona lista „ostatnio” jest ignorowana; crash sidecara w trakcie sesji → powrót do Launchera; różnica wersji remote = ostrzeżenie (nie twardy blok).

## Konsekwencje

- Thin-shell / `STAGESYNC_URL`: Launcher z ręcznym URL (brak bundla sidecara).
- Invoke-only features (updater, …) pełne przy lokalnym `127.0.0.1:4000`; przy remote — soft-cap (Admin HTTP działa).
- Flaga `STAGESYNC_DISABLE_MDNS` wreszcie steruje prawdziwym advertise.
- Dokumentacja operatora: [DESKTOP.md](../DESKTOP.md).

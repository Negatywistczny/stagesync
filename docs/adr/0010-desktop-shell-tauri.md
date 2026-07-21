# ADR 0010 — Desktop shell (Tauri)

- **Status:** Zaakceptowany (plan β1)
- **Data:** 2026-07-20
- **Etap:** `5.0.0-beta.1`

## Kontekst

β1 dostarcza **dystrybucję hosta** głównie przez **desktop standalone (Tauri + Node sidecar)**, nie nowe ścieżki audio/MIDI
(→ [β2](../ROADMAP.md)). Operatorzy na Windows/macOS potrzebują ikony aplikacji
i okna Admin/Timeline bez ręcznego `pnpm dev`. Serwer pozostaje SSOT czasu
([ADR 0002](./0002-timebase-ssot.md)); klient nie może stać się zegarem muzycznym.

## Opcje rozważane

1. **Tylko przeglądarka + Docker** — wystarczy technicznie; słabe UX „produktu”.
2. **Electron** — dojrzały, ciężki; większy footprint.
3. **Tauri** — cienki shell (WebView) + mały runtime; pasuje do thin client.

## Decyzja

Przyjmujemy **Tauri** jako desktop shell w β1:

1. **Thin shell** — ładuje ten sam `apps/web` (Admin / Timeline / Client routes).
2. **SSOT poza shellem** — Tauri zarządza lokalnym procesem **Node sidecara** wystawiającym API/WS;
   thin-shell na `STAGESYNC_URL` jest **tylko dla dev**. Shell **nie** implementuje transportu
   muzycznego ani playhead autorytetu.
3. **Update aplikacji** — jak [ADR 0004](./0004-updates-docker.md): bump obrazu /
   wersji hosta; **bez** git-apply z UI.
   - **Amendement β1:** Tauri updater (`tauri-plugin-updater`) na żądanie z Admin — operator klika „Sprawdź aktualizacje", shell pobiera podpisany bundle (minisign) i restartuje się. **Bez** auto-poll w tle i bez sklepów OS.
   - Auto-update w tle / sklepy = OUT β1 (β2+).
4. **Android** — OUT β1 (PWA / Capacitor później).
5. **Nawigacja desktop (amendement):** chrome HTML bez zmian względem przeglądarki (`appJump` Admin/Timeline). Natywne menu OS: minimalne **StageSync** (Zakończ) + **Widok** (Admin / Timeline / Klient); ostatni utwór Timeline w `localStorage` + sync do menu natywnego.

## Konsekwencje

- Nowa appka monorepo (np. `apps/desktop`) albo katalog `src-tauri/` przy web —
  decyzja implementacyjna w scope report β1.
- CI β1: build Windows + macOS (przynajmniej jeden target smoke).
- Dokumentacja: „Docker = serwer na scenie”; „Tauri = okno operatora”. Podział in-app vs GitHub: [ADR 0013](./0013-in-app-vs-github-docs.md).
- Zakaz: MIDI device I/O wyłącznie w procesie Tauri z pominięciem `apps/server`.

# ADR 0017 — Live Show Control: kontrakty produktowe (pakiet 1–8)

- **Status:** Zaakceptowany
- **Data:** 2026-07-26
- **Etap:** `5.2+` (SSOT decyzji PO po sesji KEEP/REVISE; **kontrakt**, nie claim wdrożenia)
- **Uzupełnia / amenuje:** [ADR 0015](./0015-daw-reference-and-product-decisions.md), [ADR 0008](./0008-timeline-clip-editing.md), [ADR 0016](./0016-android-performer-console.md)

## Kontekst

Sesja PO (dumpy `docs/analysis/inspiracje/specyfikacje/`, konfrontacja z ADR) domknęła spory tożsamościowe i operatorskie dla linii **Playback & Show Control**. Ten ADR jest **zbiorczym kontraktem** — decyzja ≠ kod. Implementacja = backlog (ten ADR = SSOT decyzji; lokalny prompt scratch w `docs/analysis/working/` nie jest linkowany z zewnątrz).

**Tożsamość produktu:** StageSync 5.x = odtwarzanie, synchroniczny transport, sterowanie widowiskiem i niezawodność sceniczna. **Nie** jest wielośladem studyjnym / DAW-em rejestracji.

## Decyzja — matryca 1–8

| # | Obszar | Opcja | Kontrakt |
|---|--------|-------|----------|
| **1** | Console + lokalny host (Android) | **B** | Lokalny host **zostaje w APK** jako booth **awaryjny / terenowy**. Domyślna ścieżka UI = połączenie **LAN** z hostem desktop. Lokalny host = CTA wtórne (soft-C). Native MIDI na Androidzie = uczciwie N/A. |
| **2** | Storage Spare / Safety Net | **B** | Wspólny katalog / mirror = **dozwolony wzorzec operacyjny**. Oficjalna nazwa kontraktu: **Operator-Assisted Hot Standby**. **Zakaz** obietnic Zero-Glitch / seamless HA. Async sync storage = Later. |
| **3** | Transport po **Przejmij** (Spare → Master) | **D** | Gdy transport był `PLAYING` → po promote automatycznie **`PAUSE`** (zachowany playhead / tick). `IDLE` / `PAUSED` / `STOPPED` bez zmiany stanu. Toast + docs. |
| **4** | Logic-First | **B** | Logic Pro = referencja **wyłącznie** dla edycji Timeline / klipów / narzędzi. Sieć, Safety Net, mobile, PIN, panic, Apply UI = **domena sceniczna StageSync** (nie „jak Logic”). Amend [ADR 0015 §1](./0015-daw-reference-and-product-decisions.md). |
| **5** | Flex / Takes / Recording | **C** | Studio edit/record = **permanent OUT dla całej linii 5.x** (patrz cytat poniżej). Amend [ADR 0008](./0008-timeline-clip-editing.md) / [0015 §4](./0015-daw-reference-and-product-decisions.md). |
| **6** | Apply UI mid-PLAY (Offline-First) | **E** | **Performer:** twardy block **Zastosuj** gdy host `PLAYING`; dozwolone przy `PAUSED` / `STOPPED` / `IDLE`. **Console:** przy `PLAYING` soft-block — modal ostrzegawczy (utrata podglądu **oraz** Admina, jeśli to urządzenie napędza lokalny `:host`) + [Anuluj] / [Zastosuj mimo to]. Poza `PLAYING` = Apply od razu. |
| **7** | Sample / track → `hw_out` | **C** | Repatch fizycznych wyjść **zablokowany** przy `PLAYING`; dozwolony przy `PAUSED` / `STOPPED` / `IDLE`. |
| **8a** | Operator PIN — TTL | **D (+C)** | Sesja PIN **nie wygasa** podczas `PLAYING`. Poza show: hard lock przy locku ekranu OS / `onPause` appki + idle TTL **15 min** bezczynności. |
| **8b** | Panic vs PIN | **B (+ hold)** | Globalny **PANIC** (Mute/Stop All) **bez PIN** tylko na **Console / Admin**, z **hold-to-confirm ~1 s**. **Performer bez** globalnego Panic. |

### Cytat — permanent OUT (punkt 5)

> Funkcje studyjnej edycji i rejestracji audio/MIDI (w tym: Flex Time / time-stretching, nagrywanie wielościeżkowe, Take Folders, Join/Bounce) zostają oficjalnie uznane za **OUT** dla całej linii StageSync **5.x**. StageSync skupia się wyłącznie na odtwarzaniu, synchronicznym transporcie, sterowaniu i niezawodności scenicznej. Zmiana tego założenia wymaga osobiście podjętej decyzji PO i **osobnego ADR w ramach nowej wersji major**.

### Doprecyzowania operatorskie

- **§6 Console + lokalny `:host`:** copy ostrzeżenia musi nazwać też chwilowe odcięcie UI zarządczego przy żywym silniku na tym samym urządzeniu — nie tylko „blackout podglądu Client”.
- **§6 Performer:** blokuje **wyłącznie** `PLAYING` (nie `PAUSED`).
- **§8a:** podczas `PLAYING` ani idle TTL, ani inne timery nie mogą wymusić ponownego PIN; lock ekranu / `onPause` poza show czyści sesję od razu.
- **§8b:** hold ~1 s na Console eliminuje przypadkowy tap; PIN **nie** bramkuje Panic na Console (Panic z PIN przestaje być panic).

## Konsekwencje

- [ADR 0015](./0015-daw-reference-and-product-decisions.md): §1 Logic-First zawężone; §4 Flex = permanent OUT 5.x; §7 Console host = awaryjny + LAN primary.
- [ADR 0008](./0008-timeline-clip-editing.md): Flex / Takes / recording / join bounce = permanent OUT 5.x (nie „później wg Logic”).
- [ADR 0016](./0016-android-performer-console.md): pozycjonowanie hosta + reguły Apply mid-PLAY; PIN TTL / Panic — kontrakt tutaj, egzekucja w shellach + web.
- Docs operatorskie (`MOBILE.md`, `DESKTOP.md`, www): bez obietnic Zero-Glitch HA; Safety Net = Operator-Assisted Hot Standby; bez Flex/Takes/recording w komunikacji 5.x.
- **§5 vs major 6.0:** OUT pozostaje dla całej linii **5.x**; powrót rejestracji z prostymi narzędziami edycji = [ADR 0018](./0018-future-audio-architecture.md) (supersedes „permanent” poza 5.x).
- CHANGELOG **tylko** gdy zachowanie produktu się zmieni (złota zasada) — nie za sam ten ADR.

## Powiązane

- [ADR 0002](./0002-timebase-ssot.md), [0008](./0008-timeline-clip-editing.md), [0015](./0015-daw-reference-and-product-decisions.md), [0016](./0016-android-performer-console.md), [0018](./0018-future-audio-architecture.md)
- Inspiracje / triage: [`docs/analysis/inspiracje/specyfikacje/`](../analysis/inspiracje/specyfikacje/README.md)

# StageSync v5 — TODO

**Stan:** ostatni cut `5.2.2` (`v5.2.2`) — linia **5.2** = **Pocket Stage**; **5.1** = **Launch & Mix**; **5.0** = **Overture**. Lokalny host Console w `[Unreleased]`.  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md). Higiena: [todo-hygiene.mdc](../.cursor/rules/todo-hygiene.mdc).

**Polityka:** residual po Pocket Stage → 5.3+ / Later. Zakaz stubów. [ADR 0011](./adr/0011-ui-parity-behavior.md).  
**Decyzje PO ≠ backlog:** [ADR 0015](./adr/0015-daw-reference-and-product-decisions.md). Mobile: [ADR 0016](./adr/0016-android-performer-console.md) · [MOBILE.md](./MOBILE.md).  
**Specy 5.2+ (hipotezy):** [inspiracje/spec-5.2+/](./analysis/inspiracje/spec-5.2+/).

**Residuale operatorskie:** **G1–G10** — **bez claim green** ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)). G2 skip; G3 re-verify HW; G7–G9 Docker odłożone. P8 green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).

## Must (operator residual)

- [ ] **G1–G10** na instalatorach `v5.2.2` (mac/Win HW) — bez claim green; G2 skip; G3 re-verify HW; G7–G9 Docker deferred

## Should / Higiena (nie blokuje)

- [ ] **Perf (observe first):** profil animacji chord-hero w Client Grid przy `prefers-reduced-motion`; batch DOM meterów Mixer przy wielu stripach; OSMD — cursor-only update zamiast full re-render na tick (jeśli API pozwala)

## Etap 5.3+ (Przyszłość)

- [ ] **StageSync Performer (iOS):** natywna powłoka Client-only na iPhonie/iPadzie (WebView + launcher QR/URL/recent jak Android Performer) — dystrybucja poza Google Play (TestFlight / sideload wg decyzji); bez lokalnego hosta; decyzja stacku (Swift/WKWebView vs inny) + ADR przed implementacją ([ADR 0016](./adr/0016-android-performer-console.md) = Android SSOT; [MOBILE.md](./MOBILE.md))
- [ ] **Motywy (residual):** pełna macierz 4 profili skór / THM-03 niezmienniki ([triage](./analysis/inspiracje/spec-5.2+/Specyfikacja-Motywow-i-Autentykacji-DAW.triage.md))
- [ ] **Mixer — HW Out 3–4 (WebAudio multi-out):** UI + ChannelMerger przy realnym `maxChannelCount` ≥ 4 ([triage](./analysis/inspiracje/spec-5.2+/Specyfikacja-StageSync-dla-miksera-DAW.triage.md))
- [ ] **Client transport — H-01 (residual):** split context / throttle `displayTicks` pod profil Grid/Karaoke @ 90–120 Hz ([MOBILE.md](./MOBILE.md) § H-01; [ADR 0015](./adr/0015-daw-reference-and-product-decisions.md))
- [ ] **GUI mobile (responsive):** poprawa wszystkich powierzchni (Admin / Client / Timeline) pod wąskie viewporty, touch i Android WebView ([MOBILE.md](./MOBILE.md); [ADR 0016](./adr/0016-android-performer-console.md))
- [ ] [#674](https://github.com/Negatywistczny/stagesync/issues/674) **Performer + Console — residual:** smoke P-HW/C-HW na tablecie (w tym C-HW3 lokalny host) — **bez claim HW green**; native MIDI na Console host = niedostępne na Androidzie ([ADR 0016](./adr/0016-android-performer-console.md); [MOBILE.md](./MOBILE.md))
- [ ] [#692](https://github.com/Negatywistczny/stagesync/issues/692) **Offline-First UI — residual:** delta / CacheStorage per-asset po `ui-manifest`
- [ ] **Safety Net (residual):** auto-election / lease split-brain ([triage](./analysis/inspiracje/spec-5.2+/Safety-Net-dla-StageSync-v5.2.triage.md))
- [ ] **Parity residual (N/A v4 → opcjonalne):** Tab (nawigacja zaznaczenia); bare **S** = nożyczki (bez menu T); skala czcionki / autoscroll poza Karaoke; ukrywanie sekcji Formy w widoku roli Client

# Alpha.8 — code freeze (domknięcie cyklu α rebuild)

**Data:** 2026-07-20  
**Wersja w `package.json`:** `5.0.0-alpha.8` (bez bumpu / tagu w tej sesji)  
**Polityka:** [ADR 0011](../../adr/0011-ui-parity-behavior.md)  
**Bramka β:** [report-parity-blocker-alpha8.md](./report-parity-blocker-alpha8.md) — **nadal open**

---

## Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy cykl **α8 rebuild** (engineering) jest zamknięty? | **Tak — code freeze** |
| Czy α jest w całości skończona? | **Nie** — aktywny etap = **α9** |
| Czy można startować β? | **Nie** — zakaz do green **PO smoke** + CL-P0 + CI |

**α8 zamknięte jako:** must M1–M11 (oryginał) + fala rebuild TE-P0 / CD / chrome / Admin polish — **w kodzie**.  
**α8 nie zamknięte jako:** product sign-off (P8) — to wejście do α9 / β.

---

## Co weszło w code freeze α8

| Obszar | Stan |
|--------|------|
| Oryginał α8 (Akordy/Cue, scissors, Tap, UG, Undo, metronom, Client next) | code + CI (QA sign-off) |
| ADR 0011 rebuild: T-grid / T-zoom / T-maps / T-gest (incl. marquee/clipboard) / T-loc / T-chrome | **code** — czeka PO smoke |
| Countdown: długość + shift; cyfry ephemeral (TE-21) | **code** |
| Admin: Set+pick, Host restart/sieć/logi, import pack/legacy, lista `tytuł - artysta`, usunięte atrapy footer | **code** |
| Migrator MVP (`migrateLegacy*`, CLI) | **code** — hero α9; MVP już w drzewie |

## Residual → α9 (wejście / must)

| ID | Temat | Dlaczego nie w freeze |
|----|-------|------------------------|
| **P8** | PO smoke (T-* / A1 / C1) | Done = zachowanie, nie inventarz |
| **CL-01 / 04 / 05** | Karaoke beat; grid cycle; Forma bar progress | P0 Client — brak w kodzie |
| Migrator | Fixtures / utrzymanie MVP + Admin import polish | Hero α9 (MVP już ✓ w scope) |
| CI | Pełne `lint && check-types && test && build` na zmergowanym drzewie | Przed tagiem α9 / β |

## Residual → β (nie α)

| Etap | Temat |
|------|-------|
| **β1** | Docker + Tauri + host |
| **β2** | Audio playback; Host MIDI; Live Desk AD-01…03 (Transpozycja / Lead / Edycja — API) |

Świadome OUT α: git-apply; clone chrome; inventarz-first stubs.

---

## Procedura release (osobny commit — na prośbę)

1. Commit working tree (feat + docs freeze).
2. Opcjonalnie tag `v5.0.0-alpha.8` jeśli chcesz zamrozić punkt w historii **albo** od razu bump → `5.0.0-alpha.9` z Unreleased.
3. TODO już wskazuje **tylko α9** ([TODO.md](../../TODO.md)).
4. **Zakaz** `5.0.0-beta.*` do green P8 + CL-P0.

## Cross-link

- ROADMAP: [ROADMAP.md](../../ROADMAP.md)  
- Gap SSOT: [report-v4-v5-gap-audit.md](./report-v4-v5-gap-audit.md)  
- Scope α9: [report-scope-alpha9.md](./report-scope-alpha9.md)  
- QA α8: [report-qa-signoff-alpha8.md](./report-qa-signoff-alpha8.md)

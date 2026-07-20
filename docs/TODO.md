# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.2` — historia w [CHANGELOG.md](../CHANGELOG.md).  
Ten plik: **tylko przyszłe zadania** (po zrobieniu → wpis w CHANGELOG, pozycja znika stąd).

## Następne (produkt)

- [ ] Timeline editor / Live Desk / Client roles — pełna treść (szkielet IA v4 już w web)
- [ ] Silnik ścieżek Audio (0…N) — upload, odtwarzanie, sync z transportem SSOT
      (ACL → [ADR 0005](./adr/0005-domain-axioms.md))
- [ ] Motywy (light / dark + `data-theme` na tokenach `--ss-*`; switcher w UI)
- [ ] Warstwa MIDI I/O (clock / urządzenia po stronie serwera)
      (ACL → [ADR 0005](./adr/0005-domain-axioms.md))
- [ ] Migrator legacy 4.x → v5
      (ACL → [ADR 0005](./adr/0005-domain-axioms.md))
- [ ] Docker Compose pod lokalny stack ([ADR 0004](./adr/0004-updates-docker.md))
- [ ] Auth / multi-user (jeśli produkt tego wymaga)
- [ ] **Przed `5.0.0`:** polish UI (typografia, proporcje okien/kart, gęstość
      toolbarów, copy) na żywych kontrolkach — Admin / Client / Timeline —
      **na fundamencie** tokenów space/elevation/`ui-density` (już w alphie);
      nie blokuje dalszego wiring funkcji w alphie
- [ ] Stabilne wydanie `5.0.0` + nazwa hero (zob. [versioning](../.cursor/rules/versioning.mdc))

# Evidence fala 9 — Docs / ADR drift vs kod

**Data:** 2026-07-21 ~01:45 Europe/Warsaw

---

## Macierz drift

| Dokument | Twierdzi | Kod dziś | Drift |
|----------|----------|----------|-------|
| ADR 0009 filename `…-v3` | v3 assets | + nota: kanon **v5** | **Niski** (nota OK) |
| ADR 0008 | α7 Forma; audio β2 | Forma+content+maps w α8; audio nadal OUT | **OK** |
| ADR 0011 | parity before β | P8 green; β1 na prośbę | **OK** |
| `report-audit-alpha4.md` | must layout FAIL ~21% | historyczny — **nie** aktualny stan | **Stale** jeśli czytany jako „dziś” |
| `package.json` | `5.0.0-alpha.8` | zgodne | OK |
| overnight-audit H1–H5 | High open | większość FIXED | **Stale** — ten raport jest SSOT diff |
| Konstytucja „alpha” | bez dual-write 4.x | migrator CLI istnieje (`migrate:legacy`) | OK (import, nie dual-write) |

---

## Cytaty

### ADR 0009 ewolucja (już poprawione)

```26:35:docs/adr/0009-project-schema-v3.md
## Ewolucja formatVersion (nota 2026-07-20)
...
**Kanon runtime dziś:** `ProjectSchema = ProjectSchemaV5` (`formatVersion: 5`)
```

### Analysis README indeks

`docs/analysis/README.md` — α9 aktywny; brak jeszcze linku do `report-audit-2026-07-21` (do dopisania przy domknięciu).

---

## Findings

| ID | Sev | Opis |
|----|-----|------|
| **A21-L13** | L | Historyczne reporty α4/overnight bez banneru „superseded by …” |
| **A21-L14** | L | README analysis nie linkuje audytu 2026-07-21 (do update przy FINAL) |

## Remediacje

1. Banner na overnight + α4: „Status carry-over: zobacz report-audit-2026-07-21”.  
2. Dopisać wiersz w `docs/analysis/README.md`.

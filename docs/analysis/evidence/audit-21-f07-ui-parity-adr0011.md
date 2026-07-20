# Evidence fala 7 — UI parity vs ADR 0011

**Data:** 2026-07-21 ~01:44 Europe/Warsaw  
**Źródła:** ADR 0011 · `report-parity-blocker-alpha8.md` (P8 green) · shelle

---

## Werdykt

Parity **behawioralna** Timeline/Client/Admin oznaczona **P8 green** w blockerze (2026-07-21).  
Ten audyt **nie** powtarza pełnego inventarza UI-diff — sprawdza **dryf vs zasady ADR 0011** w kodzie.

| Zasada ADR 0011 | Obserwacja α8 |
|-----------------|---------------|
| Parity = gest, nie ikony | Zgodne z P8; wand świadomie OUT |
| Zakaz clone chrome v4 | Brak importów legacy HTML; `@stagesync/ui` + CSS modules |
| Zakaz disabled-for-inventory | Narzędzia Timeline bez atrap Tr/Lead; Admin bez footer stubów (blocker: AD deferred) |
| Locator ≠ playhead MIDI | Komentarz w TimelineShell; MIDI overlay → β2 |
| Auth / Docker OUT | ROADMAP 5.1+ / β1 |

---

## Cytaty

### ADR — zakaz atrap

```77:80:docs/adr/0011-ui-parity-behavior.md
- **Zakaz disabled-for-inventory:** nie wstawiać `disabled` kontrolek w
  status/toolbar „na zapas” (np. Tr./Lead/Edycja, MIDI bridge), gdy API /
  flow jeszcze nie istnieje. Brak funkcji = **brak UI**;
```

### Blocker P8

`report-parity-blocker-alpha8.md`: TE/CL P0 **PO verified**; AD-01…03 **deferred β2**.

### Tokeny — sample Timeline CSS

(bez deep HEX audit w tej fali — reguła `ui-density`; residual Low jeśli znajdzie się ad-hoc.)

---

## Findings

| ID | Sev | Opis |
|----|-----|------|
| **A21-L11** | L | Audyt HEX/ad-hoc typography w shellach — nie wyczerpany w tej sesji (follow-up fala) |
| **A21-L12** | L | AD Live Desk korekt — brak UI OK (ADR); upewnić się że docs nie mówią „parity Admin complete” bez β2 |

**Brak nowego High** z ADR 0011 przy założeniu P8 green nadal aktualnego.

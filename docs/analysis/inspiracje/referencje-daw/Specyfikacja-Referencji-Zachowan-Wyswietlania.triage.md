# Triage: Specyfikacja referencji wyświetlania (Client charts)

**Źródło:** [Specyfikacja-Referencji-Zachowan-Wyswietlania.md](./Specyfikacja-Referencji-Zachowan-Wyswietlania.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** Client Grid / Karaoke / Score — follow, override, storage vs display akordów  
**Data triage:** 2026-07-25

## Werdykt przydatności

**Solidna referencja produktowa Client** (vs OnSong / forScore / PCO) — dobrze trzyma ADR 0011 (zakaz chrome OnSong, Storage ASCII vs Display). Macierz CC-01…15 to checklist parity zachowań, nie lista bugów. Dump **twierdzi** większość `IN` — **bez** pełnego grepu/smoke w tej fali → dokument `open`.

## Priorytety weryfikacji

| ID | Temat | Impact | Stan | Dlaczego ciekawe |
|----|--------|--------|------|------------------|
| CC-04 / CC-05 | Storage ASCII vs scenic display + hybrid PL `B`→`H` | Wysoki (kontrakt) | `hypothesis` | Zgodne z konstytucją; warto smoke mid-edit + `Bb` vs `B` |
| CC-11 | User Override / Live Follow (scroll gest) | Wysoki (scena) | `hypothesis` | Karaoke/Score — re-sync po zmianie sekcji |
| CC-09 | Pickup lines → następna sekcja Formy | Średni | `hypothesis` | Edge wokalny; łatwy unit na `resolveFormaClipForLyric` |
| CC-01 / CC-02 / CC-03 | Karaoke sections, phrase carousel, Hero „nast.” | Średni | `hypothesis` | Core Grid/Karaoke — smoke PO |
| CC-08 | Score OSMD ↔ `displayTicks` | Średni | `hypothesis` | Pokrewne: [Audyt architektury Client](../audyty-silnik/Audyt-Architektury-StageSync-v5.triage.md) |
| CC-12 / CC-13 / CC-15 | PDF transpose, chrome OnSong, mic page-turn | — | `limit` | Dump: OUT — nie TODO |
| CC-14 | Motywy / sampler | — | `limit` | Dump: LATER → 5.2+ |

## Kontekst

- [ADR 0011](../../../adr/0011-ui-parity-behavior.md) — parity = zachowanie, nie clone UI.
- Pokrewne: Audyt architektury Client (H-01 rAF, H-04 syncLead — w ClientShell już `ticksFromSyncLeadMs`).

## Następny krok eng

1. Smoke Client: Live Follow → scroll Override → re-sync; Grid Hero + countdown; Karaoke empty Forma → progress bars.
2. Unit: `toLiteralStorage` / `formatChordParts` / hybrid PL (CC-04/05) — dopiero potem `confirmed`.
3. Nie przenosić CC OUT/LATER do TODO.

# Triage: Specyfikacja referencji wyświetlania (Client charts)

**Źródło:** [Specyfikacja-Referencji-Zachowan-Wyswietlania.md](./Specyfikacja-Referencji-Zachowan-Wyswietlania.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** Client Grid / Karaoke / Score — follow, override, storage vs display akordów  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (CC-09 unit istnieje; CC-11 gap; H-05/CC-04 mid-edit)

## Werdykt przydatności

Referencja produktowa vs OnSong. CC-09 już pokryte testami pickup. **CC-11** = potwierdzona luka (brak gestu scroll→override). OUT/LATER bez TODO.

## Priorytety

| ID                 | Temat                              | Stan         | Notatka                                                                                                              |
| ------------------ | ---------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| CC-04 / CC-05      | Storage vs display + hybrid PL     | `hypothesis` | Kontrakt OK; mid-edit `/` → `fixed` w chord-display                                                                  |
| CC-09              | Pickup → następna sekcja Formy     | `confirmed`  | [`clientKaraoke.test.ts`](../../../../../apps/web/src/lib/client/clientKaraoke.test.ts) (`resolveFormaClipForLyric`) |
| CC-11              | User Override / Live Follow scroll | `confirmed`  | **Gap:** tylko toggle `scoreFollowPlayhead` / setting autoscroll — brak gestu; osobny follow-up / 5.2+               |
| CC-01…03 / 08 / 10 | Core Grid/Karaoke/Score            | `hypothesis` | Smoke PO                                                                                                             |
| CC-12 / 13 / 15    | PDF / chrome OnSong / mic          | `limit`      | OUT                                                                                                                  |
| CC-14              | Motywy                             | `limit`      | LATER 5.2+                                                                                                           |

## Następny krok

1. CC-11 implementacja tylko po decyzji PO (nie w tej fali).
2. Smoke Follow/Override gdy PO wdroży gest.

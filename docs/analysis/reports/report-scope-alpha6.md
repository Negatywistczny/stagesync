# Scope alpha.6 — IN / OUT / ryzyka

**Wersja docelowa:** `5.0.0-alpha.6`  
**Podstawa:** hero Admin Live Desk — setlista, scena, pliki ([TODO.md](../../TODO.md), [ROADMAP.md](../../ROADMAP.md)).  
**Schema:** Project **v3** — assets + audio track/clip refs; setlista w `data/library/setlist.json`.

## Cel (jedno zdanie)

Admin **Set** i **inspector plików** są podłączone do serwera; użytkownik importuje audio do `data/projects/<id>/assets/`, widzi je w UI, a projekt zapisuje referencje w **schema v3** — bez odtwarzania audio i bez edycji clipów na Timeline.

## IN (must)

| # | Wycinek | Kryterium done |
|---|---------|----------------|
| 1 | **Schema v3 + migracja** | `formatVersion: 3`; upgrade v2→v3 przy odczycie; PUT/GET Zod; `projectEndTicks` z fallbackiem 2 taktów |
| 2 | **Import audio → projekt** | Multipart (mp3/wav/aiff/m4a) → `assets/`; wpis w `project.assets[]`; opcjonalnie auto-clip stub |
| 3 | **Lista plików w inspectorze** | Nazwa, kind, rozmiar; upload + usuń; bez fake „XML · audio” |
| 4 | **Setlista (Set tab)** | CRUD `{ enabled, projectIds[] }`; toggle, dodaj, drag, zapisz/wyczyść; footer **Dalej** z setu |
| 5 | **IA v5: Set ≠ Utwory** | Osobna zakładka Set; biblioteka nie miesza się z kolejnością koncertową |
| 6 | **Race PUT vs POST assets** | Merge-preserve na serwerze; refresh draft po upload; smoke #3 |

## IN (should — timebox)

| Wycinek | Uwagi |
|---------|--------|
| Admin „Teraz” vs `activeProjectId` | Footer = transport active, nie tylko selection |
| Auto-setlista | PATCH + load next @ `projectEndTicks` |
| Transport Stop | `pause` + `seek(0)`; clamp końca |
| Scena (minimal) | `POST /api/stage/message` + WS cue → Client toast |
| Client grid/score empty states | Jak karaoke — „α7”; bez treści |
| Timeline prev/next setlisty | Header wired |
| Host logi read-only | Cut first przy timebox |

## OUT (jawne)

| Temat | Powód |
|-------|--------|
| Silnik odtwarzania audio, waveform, `ticksToMs` sync | **β1** ([ADR 0008](../../adr/0008-timeline-clip-editing.md)) |
| Edycja geometryczna Forma / Smart Tool | **α7** |
| Pełna partytura OSMD / MusicXML ingest | **α7** |
| Paczki `.stagesync` / eksport ZIP | β1+ |
| MIDI PC / Batch PC | β1 |
| Migrator legacy 4.x | β1 |
| Rejestr klientów / mDNS | później |

## Smoke gate α6

1. Admin Utwory → Import audio → widoczny w „Pliki projektu”
2. Odśwież / GET → `assets[]` + plik na dysku
3. Race: import → Timeline Zapisz (PUT bez assetu w draft) → GET nadal ma asset
4. Set: 2+ utwory, włącz, zapisz → footer Dalej = next
5. Odtwórz → footer Teraz = `activeProjectId`
6. Timeline: lane audio placeholder (bez dźwięku)
7. *(Should)* Stop; Scena → Client toast
8. `pnpm lint && check-types && test && build`

## Definicja „alpha.6 gotowe”

- [ ] Must #1–#6
- [ ] Smoke #1–#6
- [ ] CI zielone
- [ ] Bump `5.0.0-alpha.6` + CHANGELOG + QA sign-off
- [ ] Tag `v5.0.0-alpha.6` (na prośbę)

## Kolejność PR

Zob. [report-implementation-plan-alpha6.md](./report-implementation-plan-alpha6.md).

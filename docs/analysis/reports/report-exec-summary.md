# exec-summary — StageSync 5.0.0-alpha.3 (po audycie dowodowym)

**Data:** 2026-07-20  
**Metoda:** audyt iteracyjny + synteza w raportach kanonicznych.  
**Hipoteza v0** skorygowana — patrz „Korekty” w [`report-scope-alpha3.md`](./report-scope-alpha3.md).

## Werdykt

Alpha.3 = **wąski pion treści w ticks**: Project v2 (Forma + tempo/meter) → dysk → Timeline z `projectId` → pencil+Zapisz → transport z map → aktywna sekcja.  
To **nie** zamyka TODO „pełna treść / Live Desk”. Inventarz v4 zostaje w DOM (ADR 0003); 91× `disabled` to OK.

## Top wnioski z evidence

1. **Brak `projectId` w route** — Admin link → `/timeline` (`App.tsx`, `AdminShell`) — bloker nawigacji.  
2. **Legacy CD@0 ≠ v5 CD≤0** — mapa wymaga **shift** o `songOriginAbs`; Template → CD **−7680** ticks (2 takty), nie −3840 z v0.  
3. **Play już działa** — brakuje resolve bpm/meter z projektu + reanchor przy zmianie tempa.  
4. **Zod bez `.strict()`** cicho stripuje treść — must-fix przy PUT v2.  
5. **Client α3 = rola `drums` (Forma)**, nie grid akordów.  
6. **tempoMap/meterMap nie istnieją w kodzie** — tylko docs; silnik map = nowa praca, math ticks gotowy.

## Top ryzyka

1. Scope creep Timeline  
2. PUT bez fail-fast na unknown keys  
3. Zła oś Countdown w seedzie / rulerze  
4. Drift BPM bez reanchor  

## Quick wins

- Dodać `projectId` do istniejącego linku Admin (1 linia + route)  
- Play już przyjmuje `bpm`/`timeSignature` — podpiąć resolve  
- `quartersToTicks` już w shared pod mapę legacy  
- Auto-upgrade project v1→v2 przy read  

## Następny branch

`feat/project-schema-v2` (schema + strict + seed −7680 + `resolveFormaClipAt` + testy).

## Decyzje właściciela (z rekomendacją)

| # | Pytanie | Rekomendacja audytu |
|---|---------|---------------------|
| 1 | PUT full vs patch | **Full document** v2 |
| 2 | `activeProjectId` w state? | **Tak** (alpha single-host) |
| 3 | Głębokość canvas | **Minimalny lane CSS**; geometria v4 później |
| 4 | Client w α3? | **Should** — cut first przy timebox |
| 5 | Seed CD | **2 takty (−7680)** jak legacy default |
| 6 | Wersja w shellach α1 | Przy release bump do α3 |

## Czego nadal nie wiemy

- Semantyka BPM w 5/8 (local beat vs quarter) — niedokumentowana w produkcie; α3 przy 4/4 OK.  
- Czy tempoMap eventy mają żyć na ujemnych ticks (CD) — przyjęto tak (jak legacy @0 przed shiftem).  
- Realny „I Will Survive” tylko lokalnie (gitignore) — mapa oparta o commitowany Template + kanon.

## Deliverables

| Plik | Rola |
|------|------|
| [report-scope-alpha3.md](./report-scope-alpha3.md) | **scope v1** |
| [report-exec-summary.md](./report-exec-summary.md) | ten plik |

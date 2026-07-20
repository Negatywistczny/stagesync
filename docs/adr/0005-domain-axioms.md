# ADR 0005 — Granica 0 (Domain Axioms)

- **Status:** Zaakceptowany
- **Data:** 2026-07-20

## Kontekst

Architektura StageSync leży na przecięciu dwóch osi: **poziomu abstrakcji**
(od infrastruktury do ścisłej domeny) oraz **zmienności / promienia rażenia**
(jak drogo kosztuje zmiana). Najbardziej specyficzne reguły domenowe bywają
jednocześnie najmniej zmiennymi fundamentami systemu — to **Granica 0**
(Immutable Core / Site w modelu Pace Layering).

Zmiana takiego aksjomatu nie jest SemVer patch/minor „feature”; to rewrite /
nowa edycja produktu. Szczegóły matematyki czasu i układu dysku pozostają w
ADR szczegółowych — ten dokument tylko **nazywa** niezmienniki i reguły ochrony.

## Decyzja

### Granica 0 — dwa aksjomaty

1. **Czas:** Takt 1 = start właściwego utworu; pre-roll / count-in ≤ 0;
   kanon pozycji = integer **ticks** + stałe **PPQ**. Szczegóły:
   [ADR 0002](./0002-timebase-ssot.md).
2. **Storage:** projekty = izolowane, przenośne foldery
   `data/projects/<id>/`, nie monolityczna globalna baza.
   Szczegóły: [ADR 0001](./0001-storage-layout.md).
3. **Zmiana któregoś aksjomatu** = nowa edycja produktu / major rewrite —
   nie zwykłe zadanie w alphie.

### Pace layers (mapa na StageSync)

| Warstwa | Przykłady u nas | Zmienność |
|---------|-----------------|-----------|
| Stuff | UI density, motywy, copy, polish przed 5.0.0 | często |
| Skin / Services | REST / WS, Docker, CI | średnio |
| Structure / Site | aksjomaty czasu + folder projects | **Granica 0** |

Stuff i Skin wolno zmieniać bez naruszania Site. Infrastruktura (CI, Docker)
nie jest fundamentem domeny — jest wymienną warstwą dostarczania.

### Ochrona ewolucji (checklist)

- **Zależności do wewnątrz:** `@stagesync/shared` bez FS / DOM; UI bez
  autorytetu czasu muzycznego (konstytucja).
- **Anti-Corruption Layer (ACL)** na krawędziach przy:
  - migratorze legacy 4.x → v5,
  - MIDI clock / urządzeniach,
  - audio (sample / ms tylko na krawędzi `tempoMap`),
  - przyszłym Ableton Link (lub podobnym sync sieciowym).
  Mapowanie obcego formatu → ticks / folder project **tylko na granicy**.
  Zakaz wciągania semantyki obcego formatu do `@stagesync/shared`.
- **Ports & adapters:** jawne porty storage / transport wyciągać dopiero gdy
  adapterów będzie więcej niż jeden (np. FS + paczka ZIP). Nie blokować
  alpha wiringu ceremonią heksagonu „na zapas”.

## Konsekwencje

- PR-y dla migratora / MIDI / audio muszą cytować ten ADR oraz 0001 / 0002
  i wykazać ACL na granicy importu / I/O.
- Agent egzekwuje Granicę 0 przez konstytucję (wskaźnik do tego ADR).
- UI polish, motywy, CI, Docker — warstwy Stuff / Skin; nie wymagają zmiany
  aksjomatów.

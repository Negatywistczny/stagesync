# `@stagesync/shared`

Wspólne schematy Zod i **czysty czas** (bez DOM, bez Node FS, bez zegara
wewnątrz konwersji domenowych).

## Kanon

- Pozycja: integer **ticks** + stałe **PPQ**
- BBT = widok / API, nie storage silnika
- Takt 1 = start utworu; pre-roll ≤ 0

Szczegóły: [ADR 0002](../../docs/adr/0002-timebase-ssot.md),
[ADR 0005](../../docs/adr/0005-domain-axioms.md) (Granica 0).

## Moduły

| Moduł | Rola |
|-------|------|
| `time` | `ticksToBbt` / `bbtToTicks`, display bar |
| `transport` | Schematy / helpery transportu |
| `soft-clock` | Interpolacja playhead między tickami (klient) |
| `schema` | Zod na krawędziach I/O |

Walidacja na krawędziach (HTTP, plik) — fail fast, bez cichej naprawy.

# Triage: Audyt i propozycje marketingowe `apps/www`

**Źródło:** [Audyt-i-propozycje-dla-StageSync.md](./Audyt-i-propozycje-dla-StageSync.md) (Gemini / AI Exporter)  
**Status:** `closed`  
**Obszar:** `apps/www` · SEO/OG · H1 · tokeny `--ss-*` · [`channels.json`](../../../../apps/www/public/config/channels.json) · download UX · copy użytkownika  
**Data triage:** 2026-07-26  
**Ostatnia aktualizacja:** 2026-07-26 (Must/Should on-tree; Later/limit świadomie odłożone)  
**Kąt:** audyt witryny marketingowej (nie silnik / nie G1–G10)

## Werdykt przydatności

**Wysoka jako polish `apps/www` — nie feature produktu scenicznego.** Must + Should z dumpu (po korekcie IA użytkownika: bez sekcji Docs/Config/Docker) **domknięte on-tree**. Later (WWW-09/10) i HEX w brand SVG = świadomy residual poza backlogiem produktu. **Nie** Lighthouse 100 / Facebook Debugger jako bramki.

Korekta dumpu: [`channels.json`](../../../../apps/www/public/config/channels.json) → [[`apps/www/public/config/channels.json`](../../../../apps/www/public/config/channels.json)](../../../../apps/www/public/config/channels.json) (nie root monorepo).

## Epiki / tematy vs dysk (`main`)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| WWW-01 H1 tekstowy w hero | `done` | `visually-hidden` + wordmark; ship w polish SEO |
| WWW-02 `og:*` / `twitter:*` | `done` | Pełny zestaw w `<head>` |
| WWW-03 HEX → tokeny w SVG | `done` / `limit` | **done:** inline hero SVG (`currentColor` / `--ss-*`). **limit:** HEX w `public/brand/*.svg` (asset marki) |
| WWW-04 [`channels.json`](../../../../apps/www/public/config/channels.json) → Releases | `done` | [[`channels.ts`](../../../../apps/www/src/channels.ts)](../../../../apps/www/src/channels.ts) + `loadChannels()` |
| WWW-05 linki pomocy przy kartach | `done` | „Jak zainstalować…” → DESKTOP/MOBILE (bez sekcji Docs na stronie) |
| WWW-06 marketing absencji + żargon | `done` | Copy użytkownika (bez transport/Timeline/host/LAN/„bez chmury”) |
| WWW-07 `aria-live` katalog | `done` | `#download-catalog` `aria-live="polite"` |
| WWW-08 nav &lt;28rem | `done` | Linki zostają widoczne (bez hamburgera) |
| WWW-09 build-time release fallback | `later` | Tylko gdy API/limit stanie się problemem operacyjnym |
| WWW-10 booth LED / redesign motion | `later` / `limit` | Tylko jawna decyzja PO; nie automatyczny backlog |
| Claim Safety §7 | `limit` | Checklist przy kolejnych rewrite; nie osobny issue |
| IA Docs / Docker / rack w Pobierz | `out` | Świadomie odrzucone — strona dla użytkowników, nie deweloperów |

## Must / Should / Later (PO) — wynik

| Priorytet | ID | Wynik |
|-----------|-----|--------|
| Must | WWW-01…04 | **on-tree** (WWW-03 brand = limit) |
| Should | WWW-05…08 | **on-tree** |
| Later | WWW-09, WWW-10 | **odłożone** — bez wpisu w [`TODO.md`](../../../TODO.md) |

## Domknięcie

- **Backlog polish `apps/www` z tego audytu = zamknięty.**
- Residual Later nie trafia do [`TODO.md`](../../../TODO.md) ani CHANGELOG.
- Kolejny ruch witryny (custom domain, OG PNG, WWW-09) = osobna decyzja PO, nie kontynuacja tego triage.

# Triage: Audyt i propozycje marketingowe `apps/www`

**Źródło:** [Audyt-i-propozycje-dla-StageSync.md](./Audyt-i-propozycje-dla-StageSync.md) (Gemini / AI Exporter)  
**Status:** `partial`  
**Obszar:** `apps/www` · SEO/OG · H1 · tokeny `--ss-*` · `channels.json` · download UX · copy Pocket Stage  
**Data triage:** 2026-07-26  
**Kąt:** audyt witryny marketingowej (nie silnik / nie G1–G10)

## Werdykt przydatności

**Wysoka jako backlog polish `apps/www` — nie feature produktu scenicznego.** Dump dobrze mapuje na realne pliki (`index.html`, `releases.ts`, `styles.css`, `main.ts`). Większość Must da się potwierdzić grepem; część Must z dumpu zawyża „krytyczność SEO” względem priorytetu Pocket Stage. **Nie** wrzucać claimów Lighthouse 100/100 ani Facebook Debugger do TODO jako bramek wydania.

Korekta dumpu: `channels.json` żyje w [`apps/www/public/config/channels.json`](../../../../apps/www/public/config/channels.json), **nie** w root monorepo.

## Epiki / tematy vs dysk (`main`)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| WWW-01 H1 tylko jako `<img>` w hero | `confirmed` | [`index.html`](../../../../apps/www/index.html) `#hero-title` = wordmark SVG z `alt="StageSync"`; brak tekstowego H1 / `.visually-hidden` |
| WWW-02 brak `og:*` / `twitter:*` | `confirmed` | Brak w `<head>` — tylko `description` + `theme-color` |
| WWW-03 HEX w SVG hero (`#fbbf24`, `#3f3f46`…) | `confirmed` | Inline SVG w `index.html` + brand SVG w `public/brand/` — poza `--ss-*` |
| WWW-04 hardcode GitHub API w `releases.ts` | `confirmed` | `RELEASES_API` / `RELEASES_PAGE` zahardkodowane; `channels.json` istnieje, ale **nie** jest czytany przez `releases.ts` |
| WWW-05 brak linków DESKTOP/MOBILE/INSTALL przy kartach | `confirmed` | Karty z `main.ts` / META bez docs; `channels.json` ma `docs.*` gotowe do podpięcia |
| WWW-06 marketing absencji („bez serwera… bez chmury”) | `confirmed` | Rola Performer w `index.html` — copy do przeredagowania (Should, nie blocker) |
| WWW-07 brak `aria-live` na `#download-catalog` | `confirmed` | Kontener bez `aria-live` |
| WWW-08 ukrywanie nav poniżej `28rem` bez menu | `confirmed` | `styles.css` `@media (max-width: 28rem)` — chowa linki poza `#download` |
| WWW-09 build-time release fallback JSON | `hypothesis` | Later — sensowne; nie Must |
| WWW-10 nowa IA (pillars / booth LED / playhead CTA) | `hypothesis` / `limit` | Duża przebudowa wizualna; trzymać w dumpie — nie automatyczny backlog; respektować reguły hero (brand-first, bez kart w hero) |
| Claim Safety §7 (Console/Performer/LAN) | `limit` | Checklist zgodności copy z 5.2 — używać przy rewrite; nie osobny issue silnika |

## Must / Should / Later (PO)

| Priorytet dumpu | ID | Rekomendacja eng |
|-----------------|----|------------------|
| Must | WWW-01, WWW-02, WWW-03, WWW-04 | Mały patch `apps/www`: tekstowy H1 + OG/Twitter + tokeny w SVG hero + fetch channels |
| Should | WWW-05, WWW-06, WWW-07, WWW-08 | Docs na kartach, copy korzyści, `aria-live`, nav mobilny |
| Later | WWW-09, WWW-10 | Prefetch releases przy buildzie; większy redesign IA/motion |

## Confirmed vs poza zakres

- **Confirmed na dysku:** WWW-01…08 (grep 2026-07-26).
- **Poza zakresem tego triage:** APK/host Console, Timeline, G1–G10 — dump ich nie dotyczy.
- **Nie** otwierać issue „Lighthouse 100” / „Facebook Debugger green” jako bramek cutu.

## Następny krok eng

1. Jeden PR `apps/www`: WWW-01 + WWW-02 + WWW-04 (H1 tekstowy, OG, `channels.json` → `releases.ts`) — szybki win SEO/utrzymanie.  
2. Drugi PR Should: WWW-05/06/07 (+ opcjonalnie WWW-08).  
3. WWW-03 (tokeny w SVG): albo `currentColor` / CSS variables w inline SVG, albo świadomy `limit` dla raster/brand assets.  
4. Dopiero potem rozważać WWW-09; WWW-10 tylko z osobną decyzją PO.

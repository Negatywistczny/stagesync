# Prompt wdrożenia — ADR 0017 (kontrakty Live Show Control 1–8)

**Źródło decyzji:** [ADR 0017](../adr/0017-live-show-control-contracts.md)  
**Cel:** egzekucja kontraktu w kodzie + docs operatorskich. **Nie** claim green bez testów / smoke.

Pracuj na `main`, małe kroki. Bez CHANGELOG za sam docs; CHANGELOG dopiero gdy zachowanie produktu się zmieni (złota zasada).

---

## A. Docs / copy (najpierw — zero ryzyka)

1. **`docs/MOBILE.md`**, **`docs/DESKTOP.md`** (i ewentualnie INSTALL):
   - Safety Net = **Operator-Assisted Hot Standby** (zakaz Zero-Glitch / seamless HA).
   - Po **Przejmij**: jeśli było `PLAYING` → `PAUSE` + zachowany playhead; toast opisany.
   - PIN: sesja nie wygasa w `PLAYING`; lock ekranu / `onPause` + 15 min idle poza show.
   - Apply UI: Performer hard-block / Console soft-block (jak ADR §6).
   - Panic: tylko Console/Admin, hold ~1 s; brak na Performerze.
2. **Launcher Console** (`apps/console`): LAN = primary CTA; „Uruchom lokalny host” = secondary; MIDI N/A uczciwie.
3. **WWW / marketing:** wytnij Flex / Takes / recording / time-stretch z obietnic 5.x; pozycjonuj Playback & Show Control.

## B. Server — Safety Net promote (§3)

- Przy `POST` promote (Spare → Master): jeśli transport `PLAYING` → przejdź w **`PAUSE`** (tick bez resetu).
- `IDLE` / `PAUSED` / `STOPPED` — bez zmiany stanu transportu.
- Toast / event dla UI (Admin + Console).
- Testy jednostkowe / integracyjne na ścieżce promote.

## C. Android shells — Apply UI mid-PLAY (§6)

- Źródło stanu: transport hosta (WS / health / istniejący bridge) — **nie** zgaduj lokalnie.
- **`apps/performer`:** przy `PLAYING` przycisk Zastosuj **disabled** + copy: *„Zatrzymaj odtwarzanie na hoście, aby zastosować nowy interfejs.”* (`PAUSED`/`STOPPED`/`IDLE` = OK).
- **`apps/console`:** przy `PLAYING` drugi modal ostrzegawczy (podgląd + Admin gdy lokalny `:host`) → [Anuluj] / [Zastosuj mimo to].

## D. Mixer / audio — `hw_out` (§7)

- Zmiana mapowania sample/track → `hw_out` **zablokowana** gdy transport `PLAYING`.
- Dozwolona przy `PAUSED` / `STOPPED` / `IDLE` (Pause wystarczy).
- UI: disabled + krótki powód; bez cichego no-op.

## E. PIN TTL (§8a)

- Sesja odblokowania: **nie** czyść podczas `PLAYING`.
- Poza show: clear na OS screen-lock / Activity `onPause` + idle **15 min**.
- Desktop Admin (jeśli ten sam kontrakt PIN): parity zachowania TTL względem transportu.

## F. Panic (§8b)

- Console / Admin: global Mute/Stop All **bez PIN**, **hold-to-confirm ~1 s**.
- Performer: **usuń / nie dodawaj** globalnego Panic (brak UI = brak funkcji).
- Upewnij się, że lokalne wyciszenie podglądu Client ≠ global Stop All.

## G. Weryfikacja

- [ ] Unit/integration: promote PLAYING→PAUSE
- [ ] Manual / instrumentation: Apply dialog Performer vs Console w PLAYING
- [ ] Manual: `hw_out` disabled w PLAYING, OK po Pause
- [ ] Manual: PIN nie wygasa w PLAYING; wygasa po lock / 15 min idle
- [ ] Manual: Panic hold na Console; brak na Performerze
- [ ] Docs zgodne z ADR 0017 (grep Zero-Glitch / Flex recording w docs publicznych)

## Poza zakresem tego promptu

- Async sync storage Spare (Later).
- Hot-patch `hw_out` z crossfadem (wymagałoby zmiany §7).
- Flex / Takes / recording (permanent OUT 5.x).
- Auto-failover Safety Net.

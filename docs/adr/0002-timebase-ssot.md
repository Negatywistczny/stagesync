# ADR 0002 — Timebase SSOT

- **Status:** Zaakceptowany
- **Data:** 2026-07-19

## Kontekst

Klienci na scenie potrzebują płynnego playhead, ale konkurujące zegary (przeglądarka vs serwer vs MIDI) powodują drift i desync. Matematyka czasu domenowego musi być testowalna i wspólna dla paczek.

## Decyzja

1. **Czysty czas** — helpery beat/bar/tick w `@stagesync/shared` jako czyste funkcje (bez I/O, bez DOM).
2. **SSOT serwera** — serwer (`apps/server`) jest właścicielem autorytatywnej pozycji transportu oraz tempa/metrum; klienci konsumują ticki / update’y z serwera.
3. **Wygładzanie playhead** — `apps/web` może interpolować / wygładzać wyświetlany playhead **wyłącznie między tickami serwera**. Nie może stać się źródłem prawdy dla czasu muzycznego.

## Konsekwencje

- Testy czasu żyją obok helperów w shared (Vitest).
- Animacje UI są kosmetyczne; seek / komendy transportu idą przez serwer.
- Integracja MIDI / zewnętrznego clocka (przyszłość) podłącza się do serwera, nie do wygładzacza playhead w kliencie.

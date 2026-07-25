---
name: turn-red
description: >-
  Find one happy-path coverage gap, write a failing test, apply a minimal fix,
  make the test pass — single-change scope. Use when the user runs /turn-red or
  asks for a Turn-Red / edge-coverage pass on a module.
disable-model-invocation: true
---

# Turn-Red

Jeden brakujący przypadek → czerwony test → minimalny fix → zielony test. Bez refaktorów pobocznych.

## Input

Zakres od użytkownika (moduł / plik / obszar), np. `apps/server` route, helper w `packages/shared`, UI shell. Brak zakresu → **zapytaj**.

## Kroki

1. Znajdź **jedną** lukę happy-path (brak 400/edge, race, clamp, empty body).
2. Napisz test, który **pada** na obecnym kodzie.
3. Minimalna zmiana produkcyjna, żeby test przeszedł.
4. Uruchom powiązane testy (`pnpm --filter … test` lub wąski plik Vitest).
5. Scope = **jedna** zmiana / jeden PR. Commit/PR tylko gdy użytkownik prosi.

## Off-limits (gdy zakres = silnik czasu)

Jak [night-audit](../night-audit/SKILL.md): nie ruszaj transport/timebase math, soft-clock, playhead interpolation, packaging Tauri/Docker, features 5.2+, stubów.

## Zakazy

- Nie rozszerzaj na „przy okazji” a11y / rename / dead CSS.
- Nie oznaczaj Done w TODO bez kodu + testu.
- Nie wpisuj tooling/test-only do CHANGELOG.

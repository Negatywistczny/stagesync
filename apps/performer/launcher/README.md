# Launcher UX notes (SSOT = desktop ADR 0014)

Native launcher UI lives in `../android` (Kotlin Activities).
This folder documents the shared product contract so Console can mirror without premature `packages/mobile-launcher`.

## Tories discovery

1. **QR** — scan Admin „Dołącz do hosta” (URL LAN), not the APK download QR.
2. **mDNS** — `_stagesync._tcp`
3. **Manual URL** + **recent**

## Entry

- Performer → health → `{origin}/client`
- Console → health → `{origin}/admin`

## Zakazy

- No secrets in APK
- Performer: no local host / sidecar / Timeline edit
- Console: local host button visible (Faza 4 eng; product IN) — Performer never gets this

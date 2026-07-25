# Launcher UX notes (SSOT = desktop ADR 0014)

Native launcher UI lives in `../android` (Kotlin Activities).
Mirrored from Performer with entry `/admin`.

## Tories discovery

1. **QR** — scan Admin „Dołącz do hosta”
2. **mDNS** — `_stagesync._tcp`
3. **Manual URL** + **recent**

## Entry

Console → health → `{origin}/admin`

## Lokalny host

Przycisk „Uruchom lokalny host” jest **ukryty / disabled** w MVP z notką OUT (Faza 4).
Thin-shell only — see docs/MOBILE.md.

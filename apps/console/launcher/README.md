# Launcher UX notes (SSOT = desktop ADR 0014)

Native launcher UI lives in `../android` (Kotlin Activities).
Entry after health: `/admin` (full SPA bundled — Admin + Timeline + Client).

## Tories discovery

1. **Lokalny host** — „Uruchom lokalny host” (Faza 4; fail-open gdy silnik niegotowy)
2. **QR** — scan Admin „Dołącz do hosta”
3. **mDNS** — `_stagesync._tcp`
4. **Manual URL** + **recent**

## Entry

Console → health → `{origin}/admin`

## Lokalny host

Przycisk **widoczny i aktywny**. Scaffold: `LocalHostService` + `prepare-local-host.mjs`.
Pełny Node (nodejs-mobile + JNI) = residual eng — [MOBILE.md](../../../docs/MOBILE.md) Faza 4.

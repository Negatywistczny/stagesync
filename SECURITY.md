# Bezpieczeństwo

## Zgłaszanie podatności

**Nie** otwieraj publicznych Issues z opisem exploita, payloadami ani krokami
ataku zero-day.

1. Preferowane: [GitHub Security Advisories](https://github.com/Negatywistczny/stagesync/security/advisories/new)
   (prywatny raport dla maintainerów).
2. Jeśli advisories nie są dostępne — skontaktuj się z właścicielem repozytorium
   przez prywatny kanał GitHub (bez publicznych szczegółów exploita).

Podaj: wersję StageSync (`package.json` / tag), zakres wpływu oraz minimalne
kroki reprodukcji. Oczekuj potwierdzenia odbioru; nie publikuj poprawki przed
uzgodnieniem z maintainerami.

## Zakres

Dotyczy aplikacji w tym monorepo (`apps/web`, `apps/server`, `packages/*`)
oraz domyślnego układu `data/`. Dane użytkownika i sekrety lokalne (`.env`)
nie powinny trafiać do gita — zob. `.gitignore`.

Kod objęty [LICENSE](LICENSE) (BSL 1.1); zgłaszanie podatności nie zmienia
warunków licencji.

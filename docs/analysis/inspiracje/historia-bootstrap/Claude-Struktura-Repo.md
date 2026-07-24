> **Repo:** surowy dump — nie SSOT. Triage: [Claude-Struktura-Repo.triage.md](./Claude-Struktura-Repo.triage.md). Konwencje: [README](../README.md).

# **Claude**

\# Struktura repozytorium dla aplikacji webowej

\#\# Foldery główne

\`\`\`  
project-root/  
├── src/                    \# kod źródłowy aplikacji  
│   ├── components/         \# komponenty UI (reużywalne)  
│   ├── pages/ (lub views/) \# widoki/strony  
│   ├── hooks/               \# logika wielokrotnego użytku (React itp.)  
│   ├── services/            \# komunikacja z API, warstwa danych  
│   ├── utils/               \# funkcje pomocnicze  
│   ├── styles/               \# design tokens, globalne style  
│   └── types/                 \# typy (TS)  
├── public/                  \# zasoby statyczne, favicon, manifest  
├── api/                      \# backend/endpointy (jeśli monorepo)  
├── scripts/                 \# skrypty devops, build, migracje, seed  
├── userdata/ lub .local/    \# pliki przetwarzane lokalnie przez usera (⚠️ w .gitignore\!)  
├── docs/                    \# dokumentacja projektowa  
│   ├── [architecture.md](http://architecture.md)  
│   ├── [design-system.md](http://design-system.md)  
│   ├── [api-reference.md](http://api-reference.md)  
│   └── adr/                  \# Architecture Decision Records  
├── tests/                   \# testy jednostkowe/integracyjne  
├── .github/  
│   ├── workflows/            \# CI/CD  
│   ├── ISSUE\_TEMPLATE/  
│   └── PULL\_REQUEST\_TEMPLATE.md  
└── dist/ lub build/          \# output builda (w .gitignore)  
\`\`\`

\*\*Zasada\*\*: nic „przejściowego" (build, dane lokalne, cache) nie trafia do repo — tylko \`.gitignore\`.

\#\# Standardowe pliki w root

| Plik | Cel |  
|---|---|  
| \`[README.md](http://readme.md)\` | wejście do projektu: co to jest, jak uruchomić, stack |  
| \`[CHANGELOG.md](http://changelog.md)\` | historia wersji (format Keep a Changelog) |  
| \`[CONTRIBUTING.md](http://contributing.md)\` | zasady współpracy, konwencje commitów |  
| \`LICENSE\` | licencja |  
| \`.env.example\` | wzór zmiennych środowiskowych (nigdy \`.env\` prawdziwy\!) |  
| \`[TODO.md](http://todo.md)\` lub GitHub Projects/Issues | zamiast pliku lepiej użyć Issues/Projects na dłuższą metę |  
| \`.gitignore\` | wykluczenia |  
| \`CODEOWNERS\` | kto odpowiada za które części kodu |

Uwaga: \`[TODO.md](http://todo.md)\` sprawdza się w małych projektach, ale przy dłuższym rozwoju \*\*GitHub Issues \+ Projects (kanban)\*\* skaluje się dużo lepiej niż plik tekstowy — unikniesz właśnie tego bałaganu, o którym piszesz.

\#\# Nazewnictwo

\- \*\*Pliki/foldery kodu\*\*: \`kebab-case\` (np. \`user-profile.tsx\`) lub \`PascalCase\` dla komponentów (\`UserProfile.tsx\`) — wybierz jedno i trzymaj się konsekwentnie.  
\- \*\*Branże\*\*: \`feature/nazwa\`, \`fix/nazwa\`, \`chore/nazwa\`, \`docs/nazwa\`  
\- \*\*Commity\*\*: Conventional Commits — \`feat:\`, \`fix:\`, \`docs:\`, \`refactor:\`, \`chore:\`, \`style:\`, \`test:\`. To ułatwia automatyczne generowanie CHANGELOG.

\#\# Wersjonowanie

\- \*\*Semantic Versioning\*\* (\`MAJOR.MINOR.PATCH\`): major \= breaking change, minor \= nowa funkcja kompatybilna wstecz, patch \= bugfix.  
\- Tagi Git odpowiadające wersjom (\`v1.2.0\`).  
\- CHANGELOG aktualizowany przy każdym release (można zautomatyzować przez \`changesets\` albo \`standard-version\`).

\#\# Aktualizacje / long-term maintenance

\- Cykliczny przegląd zależności (Dependabot/Renovate na GitHubie — ustawia się raz i pilnuje aktualizacji).  
\- ADR (Architecture Decision Records) w \`docs/adr/\` — krótkie notatki „dlaczego wybraliśmy X, a nie Y" — bezcenne po pół roku, gdy zapomnisz kontekstu decyzji.  
\- PR template wymuszający checklistę (testy, dokumentacja zaktualizowana, breaking change opisany).

\# Design system (spójność wizualna)

To jest kluczowe dla uniknięcia bałaganu — warto to zamknąć w jednym miejscu, nie rozrzucać po komponentach.

\#\# Kolory jako design tokens

Zamiast wpisywać hexy w kodzie, definiujesz tokeny semantyczne, nie tylko surowe kolory:

\`\`\`css  
/\* tokens.css lub tokens.json \*/  
\--color-primary: \#2563eb;  
\--color-primary-hover: \#1d4ed8;  
\--color-danger: \#dc2626;  
\--color-success: \#16a34a;  
\--color-text-primary: \#111827;  
\--color-text-secondary: \#6b7280;  
\--color-bg-surface: \#ffffff;  
\--color-bg-muted: \#f3f4f6;  
\`\`\`

I do tego \*\*dokument znaczeniowy\*\* w \`docs/[design-system.md](http://design-system.md)\`, np.:

| Token | Kiedy używać |  
|---|---|  
| \`primary\` | główne CTA, aktywne linki, focus states |  
| \`danger\` | błędy, akcje destrukcyjne (usuń, anuluj) |  
| \`success\` | potwierdzenia, statusy pozytywne |  
| \`text-secondary\` | opisy pomocnicze, placeholdery, disabled |

Zasada twarda: \*\*komponenty nigdy nie odwołują się do surowego hexa\*\*, tylko do tokenu. To jedna zmiana w jednym miejscu \= spójna zmiana w całej appce.

\#\# Komponenty UI — skończony zestaw wzorów

Zamiast generować przycisk/input od nowa za każdym razem:

\- Ustal skończoną listę \*\*wariantów\*\* komponentu (np. Button: \`primary\`, \`secondary\`, \`ghost\`, \`danger\` × rozmiary \`sm\`, \`md\`, \`lg\`) i \*\*zabroń\*\* tworzenia nowych wariantów ad hoc bez dopisania do systemu.  
\- Trzymaj je w \`src/components/ui/\` jako bibliotekę bazową (osobno od komponentów biznesowych w \`components/features/\`).  
\- Warto rozważyć narzędzie typu Storybook — katalogujesz każdy wariant wizualnie, więc i Ty, i ewentualny model AI pomagający Ci pisać kod, macie jeden punkt odniesienia zamiast zgadywania.

\#\# Praktyczna rada

Jeśli robisz to pod kątem współpracy z AI (kursor, Claude Code itp.) — warto dodać \`docs/[AGENTS.md](http://agents.md)\` albo sekcję w README z jawnymi zasadami dla asystenta: „nie twórz nowych wariantów przycisku", „kolory tylko przez tokeny", „nowe endpointy dokumentuj w [api-reference.md](http://api-reference.md)". To bardzo redukuje bałagan, bo narzędzie AI dostaje twarde ograniczenia zamiast improwizować za każdym razem.

Chcesz, żebym przygotował to jako gotowy szkielet repo (realne pliki) do pobrania?
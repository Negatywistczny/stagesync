> **Repo:** surowy dump — nie SSOT. Triage: [Gemini-Plan-Wdrozenia-Monorepo-V5.triage.md](./Gemini-Plan-Wdrozenia-Monorepo-V5.triage.md). Konwencje: [README](../README.md).

**Kompleksowy Plan Wdrożenia Architektury Monorepo dla StageSync (Edycja V5)**

### **FAZA 1: Zamknięcie Przeszłości i Inicjalizacja Środowiska (Działania Manualne)**

1. **Archiwizacja Długu Technicznego:** Wejdź w ustawienia dotychczasowego repozytorium na platformie GitHub i zmień jego nazwę na stagesync-legacy. W pliku README.md dodaj adnotację, że projekt został przepisany na architekturę Monorepo, a rozwój odbywa się w nowym miejscu.  
2. **Generowanie Nowej Bazy:** W lokalnym terminalu uruchom kreator Turborepo poleceniem npx create-turbo@latest. Nazwij docelowy folder stagesync.  
3. **Punkt Kontrolny (Save State):** Wejdź do nowo utworzonego katalogu i wykonaj pierwszy, surowy zapis stanu: git add . oraz git commit \-m "chore: initial turborepo setup".  
4. **Publikacja Repozytorium:** Utwórz nowe, puste repozytorium o nazwie stagesync na GitHubie i wypchnij do niego lokalny kod (git push).  
5. **Ustalenie Wersji Startowej:** Otwórz główny plik package.json i ustaw numer wersji na 5.0.0-alpha.1. Wersjonowanie musi być sterowane systemowo zgodnie ze standardem Semantic Versioning (SemVer).

### **FAZA 2: Ustanowienie "Konstytucji" (Wszczepienie Zasad dla AI)**

W głównym katalogu projektu utwórz plik .cursorrules. Zapisz w nim niezmienne aksjomaty systemowe, które stanowią absolutną "Granicę 0" nowej edycji. Jeśli jakakolwiek operacja wygenerowana przez AI złamie te zasady, kod musi zostać natychmiast odrzucony:

* **Fundament Domeny Czasu:** Takt 1 stanowi bezwzględny, stały punkt kotwiczenia układu współrzędnych (t \= 0), a odliczanie (pre-roll) oraz przedtakty muszą operować wyłącznie w ujemnych wartościach osi czasu.  
* **Autorytaryzm Serwera (SSOT):** Serwer jest jedynym "Źródłem Prawdy". Urządzenia docelowe (tablety) są wyłącznie terminalami renderującymi otrzymany stan i nie wyliczają własnej osi czasu.  
* **Atomowość Projektów:** Utwory to izolowane, przenośne foldery niezależne od globalnej bazy danych.  
* **Hermetyzacja Przestrzeni:** Obowiązuje ścisły podział na autonomiczne domeny (feature-based structure). Pakiety nie mogą współdzielić kodu na skróty.  
* **Determinizm Wizualny:** Kategoryczny zakaz stosowania twardych barw szesnastkowych (HEX) w widokach. Interfejs musi bazować na semantycznych tokenach projektowych (np. color-primary, color-error), a powtarzalne komponenty systemowe muszą obsługiwać 7 predefiniowanych stanów interakcji.

### **FAZA 3: Architektoniczne Sprzątanie (Praca z Cursorem)**

Wykorzystaj asystenta AI do przebudowy wygenerowanego szablonu zgodnie z zapisanymi przed chwilą regułami.

1. **Czyszczenie Szablonu:** Zleć Cursorowi usunięcie domyślnej aplikacji apps/docs oraz wyczyszczenie zawartości apps/web do pustego, gotowego do pracy szkieletu.  
2. **Budowa Klocków (Scaffolding):** Zleć utworzenie docelowej struktury katalogów:  
   * apps/server: Logika centralna i zarządzanie stanem.  
   * packages/shared: Wyizolowany silnik czasu oparty wyłącznie na czystych funkcjach matematycznych.  
   * packages/ui: Główny Design System zawierający scentralizowane, "głupie" komponenty interfejsu wizualnego.  
   * /docs/adr/: Ustrukturyzowany rejestr logów decyzyjnych (Architecture Decision Records) do dokumentowania ewolucji systemu.  
3. **Pliki Ustandaryzowane i Lokalne:** Wygeneruj wizytówkę projektu README.md oraz politykę CONTRIBUTING.md określającą konwencje programistyczne. Skonfiguruj pliki .gitignore oraz .gitkeep, aby dynamicznie generowane dane lokalne (jak logi serwera i foldery projektów audio) nie zanieczyszczały globalnego repozytorium.

### **FAZA 4: Codzienny Workflow i Rozwój (Trunk-Based Development)**

1. **Zablokowanie Głównej Osi:** Gałąź main traktuj jako świętość. Nowe funkcjonalności rozwijaj wyłącznie na odizolowanych gałęziach roboczych (np. feat/audio-engine).  
2. **Uruchomienie Środowiska:** Przestań ręcznie zarządzać powiązaniami. Uruchamiaj wszystkie aplikacje naraz komendą pnpm dev i pozwól maszynie zarządzać kompilacją.  
3. **Separacja Kompetencji (Smart/Dumb):** Przy dodawaniu nowych modułów (np. Karaoke) stosuj rygorystyczny rozdział. Logikę biznesową i obliczenia czasu umieszczaj w packages/shared, warstwę wizualną w packages/ui, a łączenie danych z interfejsem w "inteligentnych hakach" (Smart Hooks) wewnątrz apps/web.  
4. **Ochrona Krawędzi Systemu:** Wszystkie wchodzące ładunki danych, operacje odczytu z folderów projektowych oraz payloady sieciowe muszą przejść przez nienaruszalną walidację (np. schematy Zod), odrzucając błędne zapytania zamiast próbować je cicho naprawiać.
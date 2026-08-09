> From: https://gemini.google.com/app/b67e6cf37aa91a8f

Specyfikacja Motywów i Auth StageSync

# Specyfikacja Architektoniczna StageSync 5.2+: System Motywów Wizualnych (THM) oraz Izolacja Autoryzacji i Dostępów Multi-User (AUTH)

## Architektura Rozdzielenia Motywów i Autoryzacji w Linii 5.2+

Wprowadzenie elastyczności wizualnej oraz kontroli dostępów w systemie klasy live DAW wymaga rygorystycznej sekrecyjnej separacji warstw . Zgodnie z zasadami Pace Layering oraz aksjomatami architektonicznymi StageSync (Granica 0 / ADR 0005), warstwa prezentacji i stylizacji („Skin/Stuff”) musi pozostać całkowicie niezależna od mechanizmów autentykacji, autoryzacji oraz tożsamości sieciowej („Services/Structure”) . Ewolucja interfejsu w kierunku wydań 5.2+ nakłada wymóg bezwzględnego odprzęgnięcia preferencji wizualnych klienta od stanu uwierzytelnienia użytkownika, co zapobiega powstawaniu punktów blokujących podczas pracy na żywo .

Projektowanie motywów wizualnych (`data-theme`) nie może w żaden sposób ograniczać operacyjności systemu na scenie ani uzależniać wyboru preferencji ekranowych od zalogowania . Urządzenia klienckie, obejmujące tablety wykonawców, ekrany odsłuchowe oraz terminale techniczne, pracują w skrajnie odmiennych środowiskach oświetleniowych — od absolutnego zaciemnienia stanowiska reżyserskiego (booth), przez intensywne światło reflektorów estradowych, aż do pełnego słońca na scenach plenerowych . System wizualny musi umożliwiać natychmiastową zmianę kontrastu i palety bez konieczności przechodzenia przez bramki uwierzytelniania, podczas gdy architektura bezpieczeństwa sieci LAN chroni integralność sesji Live DAW bez wprowadzania zbędnego tarcia interfejsowego .

---

## Specyfikacja THM-01: Zestaw Motywów Wizualnych MVP i Mapowanie Tokenów (`--ss-*`)

Konstytucja Design Systemu StageSync zabrania wprowadzania surowych wartości HEX, RGB czy klas narzędziowych w komponentach UI i shellach aplikacji . Całość warstwy wizualnej opiera się na tokenach CSS `--ss-*` zlokalizowanych w pliku [`packages/ui/src/tokens.css`](../../../../packages/ui/src/tokens.css) . Zmiana motywu odbywa się poprzez modyfikację atrybutu `data-theme` oraz `data-contrast` w elemencie korzenia dokumentu (`:root` lub `html`), co gwarantuje natychmiastową przebudowę drzewa renderowania bez narzutu wydajnościowego w czasie wykonywania .

Zestaw motywów MVP obejmuje cztery predefiniowane profile adaptacyjne:

1. **Dark Default (Booth Dark):** Kanoniczna paleta v4 oparta na głębokiej czerni (`#000000`) oraz akcencie bursztynowym (`#fbbf24`), zoptymalizowana pod kątem reżyserek i stanowisk realizatorskich o niskim natężeniu światła .
2. **Light Booth (Stage Daylight):** Jasny motyw o wysokiej czytelności tekstu w warunkach silnego oświetlenia zewnętrznego, inspirowany estradowymi widokami OnSong oraz klasycznymi edytorami nutowymi .
3. **High-Contrast Dark:** Wariant o podwyższonym kontraście dla ciemnego tła, spełniający wymogi dostępności WCAG AAA oraz normy APCA dla operatorów z niedowidzeniem .
4. **High-Contrast Light:** Wariant o podwyższonym kontraście dla jasnego tła, maksymalizujący krawędzie elementów w pełnym słońcu .

| Token CSS                   | Dark Default (v4 Base)     | Light Booth               | High-Contrast Dark         | High-Contrast Light     |
| :-------------------------- | :------------------------- | :------------------------ | :------------------------- | :---------------------- |
| `color-scheme`              | `dark`                     | `light`                   | `dark`                     | `light`                 |
| `--ss-color-bg`             | `#000000`                  | `#f4f4f5`                 | `#000000`                  | `#ffffff`               |
| `--ss-color-surface`        | `#09090b`                  | `#ffffff`                 | `#000000`                  | `#ffffff`               |
| `--ss-color-elevated`       | `#18181b`                  | `#fafafa`                 | `#18181b`                  | `#f4f4f5`               |
| `--ss-color-text`           | `#fafafa`                  | `#18181b`                 | `#ffffff`                  | `#000000`               |
| `--ss-color-text-muted`     | `#a3a3a3`                  | `#52525b`                 | `#e4e4e7`                  | `#27272a`               |
| `--ss-color-primary`        | `#fbbf24`                  | `#d97706`                 | `#fde047`                  | `#b45309`               |
| `--ss-color-primary-hover`  | `#fcd34d`                  | `#f59e0b`                 | `#fef08a`                  | `#d97706`               |
| `--ss-color-primary-active` | `#f59e0b`                  | `#b45309`                 | `#eab308`                  | `#92400e`               |
| `--ss-color-on-primary`     | `#0a0a0a`                  | `#ffffff`                 | `#000000`                  | `#ffffff`               |
| `--ss-color-secondary`      | `#27272a`                  | `#e4e4e7`                 | `#3f3f46`                  | `#d4d4d8`               |
| `--ss-color-border`         | `#3f3f46`                  | `#a1a1aa`                 | `#a1a1aa`                  | `#52525b`               |
| `--ss-color-border-muted`   | `#1e1e22`                  | `#e4e4e7`                 | `#52525b`                  | `#71717a`               |
| `--ss-color-focus-ring`     | `#22d3ee`                  | `#0891b2`                 | `#67e8f9`                  | `#0e7490`               |
| `--ss-color-selected`       | `rgba(251, 191, 36, 0.16)` | `rgba(217, 119, 6, 0.14)` | `rgba(253, 224, 71, 0.25)` | `rgba(180, 83, 9, 0.2)` |
| `--ss-color-disabled-bg`    | `#09090b`                  | `#f4f4f5`                 | `#000000`                  | `#e4e4e7`               |
| `--ss-color-disabled-text`  | `#52525b`                  | `#a1a1aa`                 | `#71717a`                  | `#71717a`               |

---

## Specyfikacja THM-02: Persystencja i Dystrybucja Preferencji Wyglądu

Ustalenie miejsca przechowywania oraz zakresu propagacji preferencji motywu wizualnego opiera się na hierarchii trzech poziomów persystencji.

Podczas inicjalizacji interfejsu aplikacja w pierwszej kolejności sprawdza obecność sygnału wymuszenia scenicznego (`Scenic Lock`) nadawanego przez hosta przez gniazdo WebSocket . Jeśli blokada sceniczna jest aktywna, lokalny interfejs klientów zostaje przestawiony na wskazany motyw główny . W przypadku braku blokady scenicznej interfejs odczytuje preferencję zapisaną w lokalnym magazynie przeglądarki (`localStorage`) danego klienta . W sytuacji braku wpisu w magazynie lokalnym interfejs przyjmuje domyślną wartość startową zdefiniowaną w konfiguracji serwera (`ServerSettingsValues`), co zapobiega zjawisku niepożądanego błysku tła podczas ładowania .

| Poziom Persystencji                     | Mechanizm Przechowywania                              | Zakres Oddziaływania                                    | Przypadek Użycia i Uzasadnienie Architektoniczne                                                                                                                                                                                           |
| :-------------------------------------- | :---------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Klient Urządzenia (PWA / Mobile)**    | `localStorage` (`stagesync-appearance`)               | Wyłącznie lokalna instancja przeglądarki / stanowiska . | **Domyślny tryb pracy.** Tablet perkusisty zamontowany w ciemnym miejscu sceny wymaga trybu _Dark_, podczas gdy wokalista na przodzie sceny pod reflektorami potrzebuje trybu _Light_. Przełączanie nie propaguje się na inne urządzenia . |
| **Profil Stanowiska (Host Admin)**      | `ServerSettingsValues` (`STAGESYNC_THEME_DEFAULT`)    | Domyślna wartość początkowa dla nowych połączeń .       | Określa motyw startowy aplikowany w momencie pierwszego połączenia klienta, zanim zostanie odczytany stan z `localStorage`. Zapobiega efektowi błysku (FLASH/FOUT) .                                                                       |
| **Enforced Scenic Lock (Host Command)** | Flaga w stanie sesji WebSocket (`liveDesk.themeLock`) | Wszystkie połączone końcówki Client Shell .             | Awaryjne opcjonalne wymuszenie motywu przez realizatora (np. nakaz wygaszenia ekranów na scenie — _Blackout All_). Nadpisuje lokalne ustawienia klienta do momentu zdjęcia blokady.                                                        |

---

## Specyfikacja THM-03: Niezmienniki Domenowe Wizualnych Sygnałów Operacyjnych

Systemy klasy DAW opierają swoją ergonomię na natychmiastowo rozpoznawalnych sygnałach estradowych. Motyw wizualny ma prawo modyfikować tła, panele, obramowania oraz neutralne elementy interfejsu, lecz **kategorycznie nie może** zmieniać semantyki sygnałów operacyjnych Timeline oraz kontrolek DAW .

Minimalizm marki StageSync zakłada użycie jednej barwy akcentu interakcji CTA (`primary` / `selected`), jednak nie oznacza to scalania odrębnych wskaźników transportowych w jeden odcień . Wskaźnik odtwarzania MIDI (Playhead) oraz wskaźnik pętli/zaznaczenia (Locator) stanowią dwa odrębne sygnały operacyjne, których rozdzielenie kolorystyczne jest gwarantem poprawnej obsługi sekwencera w warunkach stresu koncertowego .

| Symbol / Wskaźnik          | Dedykowany Token CSS                     | Sztywna Wartość / Zachowanie                     | Uzgodnienie z ADR 0011 / ui-parity                                                                                                                     |
| :------------------------- | :--------------------------------------- | :----------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MIDI Playhead**          | `--ss-color-info` / Cyjan (`#38bdf8`)    | Wskaźnik odtwarzania w czasie rzeczywistym .     | **Playhead ≠ Locator.** Kategoryczny zakaz scalania wskaźnika odtwarzania z bursztynowym kolorem marki CTA (`primary`) .                               |
| **Timeline Locator**       | `--ss-color-warning` / Żółty (`#fb923c`) | Wskaźnik pozycji pętli / zaznaczenia roboczego . | Musi zachować odrębny odcień od wskaźnika Playhead, aby uniknąć pomyłek realizatorskich w trakcie wykonywania utworu .                                 |
| **Solo Status**            | `--ss-color-solo` (`#ffcc00`)            | Żółty jaskrawy / tekst `#0a0a0a` .               | Absolutny stały akcent przycisku Solo na mikserze i ścieżkach Timeline, niezależny od akcentu CTA .                                                    |
| **Mute Status**            | `--ss-color-mute` (`#ff3b30`)            | Czerwony estradowy / tekst `#ffffff` .           | Absolutny stały akcent wyciszenia ścieżki. Zgodny z normami fizycznych konsolet .                                                                      |
| **OSMD Score Paper**       | `--ss-color-osmd-paper` (`#ffffff`)      | Czysta biel .                                    | Tło tarczy nutowej OSMD / MusicXML pozostaje **zawsze białe**, niezależnie od motywu czerni/bieli shella, zapewniając czytelność tradycyjnego zapisu . |
| **Anti-halation Standard** | `--ss-color-text` (`#fafafa`)            | Zakaz `#ffffff` na czystym `#000000` .           | Zapobieganie powstawaniu powidoków (halation) w ciemnej reżyserce poprzez stosowanie złamanej bieli tekstu głównego .                                  |

---

## Specyfikacja AUTH-01: Threat Model LAN Show i Strategia Autoryzacji MVP

W warunkach koncertowych sieć operatorska (LAN/Wi-Fi) jest środowiskiem zaufanym, lecz podatnym na błędy ludzkie, przypadkowe dotknięcia ekranów tabletów przez muzyków oraz nieautoryzowane próby połączenia przez osoby postronne (np. widownia skanująca kod QR ze sceny) .

Aktorzy w modelu zagrożeń estrady dzielą się na trzy grupy: nieautoryzowanych widzów próbujących uzyskać dostęp do sieci Wi-Fi, muzyków na scenie wykonujących przypadkowe interakcje na ekranach dotykowych oraz realizatora głównego (Host Operator) posiadającego wyłączny autorytet nad zegarem muzycznym, transportem i konfiguracją urządzeń I/O .

| Model Autoryzacji                                  | Poziom Bezpieczeństwa                                         | Tarcie Operacyjne na Scenie                                                                         | Złożoność Implementacji                                                    | Rekomendacja Architektoniczna                                                                                                |
| :------------------------------------------------- | :------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **Option A: Brak Auth (Stan Dzisiejszy)**          | Bardzo niski (każdy klient w LAN ma dostęp do interfejsów) .  | Zero (brak haseł, natychmiastowe działanie PWA) .                                                   | Baza (brak kodu autoryzacji) .                                             | Dopuszczalne wyłącznie dla odizolowanych fizycznie sieci LAN bez dostępu Wi-Fi dla publiczności .                            |
| **Option B: Host Operator PIN (MVP 5.2)**          | Średni (ochrona węzłowych akcji edycji i sterowania) .        | Bardzo niskie (jednorazowy 4-cyfrowy PIN wklepywany na urządzeniu klienckim przy wejściu w edycję). | Niska (sztywna flaga w sesji WebSocket / nagłówek HTTP `X-StageSync-PIN`). | **Rekomendowane MVP dla 5.2.** Zapewnia ochronę przed przypadkową destrukcją koncertu bez narzucania uciążliwego logowania.  |
| **Option C: Pełne Konta Użytkowników (OAuth/JWT)** | Wysoki (pełna identyfikacja, tożsamość, role per użytkownik). | Ekstremalnie wysokie (konieczność pamiętania loginów, obsługa sesji przy braku internetu).          | Bardzo wysoka (baza użytkowników, szyfrowanie, zarządzanie tokenami).      | **Kategorycznie odroczone (Later / OUT w 5.2).** Wprowadza ryzyko braku możliwości zagrania koncertu przy awarii logowania . |

W linii 5.2 wdrożony zostaje **Host Operator PIN** (Option B) jako opcjonalna flaga w konfiguracji serwera (`STAGESYNC_OPERATOR_PIN`) . System domyślnie działa bez autentykacji w zaufanej sieci LAN . Włączenie kodu PIN przez realizatora blokuje możliwość wywoływania destrukcyjnych komend REST/WebSocket (np. zmiana projektu, czyszczenie setlisty, edycja mapy tempo) z nieuprawnionych tabletów . Pełne konta użytkowników, integracja z dostawcami tożsamości zewnętrznej oraz zarządzanie uprawnieniami OAuth zostają **jawnie przesunięte do dalszych wydań (5.x Later)**, chroniąc prostotę wdrożenia scenicznego .

---

## Specyfikacja AUTH-02: Multi-User ACL na Krawędziach Systemu (Granica 0)

Zgodnie z ADR 0005 (Granica 0 / Domain Axioms), silnik muzyczny (`@stagesync/shared`), struktura katalogów projektowych `data/projects/<id>/` oraz autorytet czasu są absolutnymi aksjomatami domeny . Model dostępu Multi-User nie może modyfikować tych aksjomatów, lecz działać jako Anti-Corruption Layer (ACL) wyłącznie na krawędziach transportowych (REST API / WebSocket Gateway) .

Aplikacja rozróżnia uprawnienia operacyjne od czysto lokalnych preferencji wyświetlania. Ustawienia takie jak transpozycja instrumentu (`instrumentPitch`), skala tekstu, czy wybór notacji akordów są przetwarzane wyłącznie w pamięci podręcznej klienta i nie wysyłają żądań modyfikacji struktury projektu do serwera .

| Akcja / Operacja Domenowa                  | Rola Host Operator (Desktop/Admin) | Rola Client Live Desk (z uprawnieniem)           | Rola Client Standard View (Tylko Odczyt)   | Miejsce Egzekwowania Reguły ACL                           |
| :----------------------------------------- | :--------------------------------- | :----------------------------------------------- | :----------------------------------------- | :-------------------------------------------------------- |
| **Start / Stop Transportu**                | Pełny dostęp .                     | Dostępne (jeśli włączone w Live Desk) .          | Zablokowane.                               | WebSocket Gateway (`broadcastTransportCommand`).          |
| **Zmiana Utworu w Setliście**              | Pełny dostęp .                     | Dostępne .                                       | Zablokowane .                              | REST API `/api/setlist/select` / WebSocket .              |
| **Edycja Notatek Perkusji (`drums`)**      | Pełny dostęp .                     | Dostępne (gdy `clientEditEnabled = true`) .      | Zablokowane .                              | REST API `PUT /api/projects/:id` .                        |
| **Tap Wokalu (Zapis znaczników)**          | Pełny dostęp .                     | Dostępne (gdy `clientEditEnabled = true`) .      | Zablokowane .                              | REST API `PUT /api/projects/:id` .                        |
| **Lokalna Transpozycja Instrumentu**       | Nie dotyczy.                       | Pełny dostęp lokalny (nie modyfikuje projektu) . | Pełny dostęp lokalny (`instrumentPitch`) . | Warstwa Klienta (`ClientDisplayPrefs` / `localStorage`) . |
| **Struktura Projektu / Dodawanie Ścieżek** | Pełny dostęp .                     | Zablokowane.                                     | Zablokowane.                               | REST API Middleware (`requireHostAuth`).                  |
| **Ustawienia Serwera / I/O Audio/MIDI**    | Pełny dostęp .                     | Zablokowane .                                    | Zablokowane .                              | REST API `/api/server/settings` .                         |

---

## Kryteria Akceptacji, Reguły NIE-ROBIĆ oraz Mapowanie Plików

Wdrożenie specyfikacji w linii 5.2+ wymaga spełnienia formalnych kryteriów akceptacji oraz bezwzględnego przestrzegania zakazów projektowych.

### Kryteria Akceptacji

| ID Zadania    | Opis Kryterium Akceptacji                                                                                                               | Metoda Weryfikacji                                | Moduły / Testy                                                                           |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------ | :--------------------------------------------------------------------------------------- |
| `THM-01-AC1`  | Zmiana atrybutu `data-theme="light"` w elemencie `<html>` przełącza paletę tła, powierzchni i tekstu bez modyfikacji kodu komponentów . | Test wizualny Playwright / Regresja screenshotów. | [`packages/ui/src/tokens.css`](../../../../packages/ui/src/tokens.css)                   |
| `THM-01-AC2`  | Wskazania Playhead (`--ss-color-info`) oraz Locator (`--ss-color-warning`) zachowują odrębne odcienie w każdym z motywów .              | Audyt tokenów CSS / Test spójności ADR 0011 .     | [`packages/ui/src/tokens.css`](../../../../packages/ui/src/tokens.css)                   |
| `THM-02-AC1`  | Zmiana motywu na tablecie klienta zapisuje wartość w `localStorage` i nie wpływa na wygląd szela na innych połączonych urządzeniach .   | Test integracyjny multi-browser w Playwright.     | [`apps/web/src/shells/ClientShell.tsx`](../../../../apps/web/src/shells/ClientShell.tsx) |
| `AUTH-01-AC1` | Przy ustawionej zmiennej `STAGESYNC_OPERATOR_PIN` próba wywołania edycji notatek bez prawidłowego nagłówka wywołuje błąd HTTP 403 .     | Testy jednostkowe REST API w Vitest.              | `apps/server/src/routes/`                                                                |
| `AUTH-02-AC1` | Własności edycji lokalnej (`instrumentPitch`, skala tekstu) działają płynnie w trybie offline bez połączonego gniazda WS .              | Test zachowania w stanie rozłączenia gniazda.     | `apps/web/src/lib/clientDisplayPrefs.ts`                                                 |

### Reguły Kategoryczne: NIE-ROBIĆ (Anti-Patterns)

1. **Zakaz Tęczy Ról (Role Rainbows):** Nie wolno przypisywać unikalnych kolorów akcentu dla ról klienta (`karaoke`, `grid`, `score`, `drums`) z tokenów statusu (`success`, `warning`, `info`) . Różnicowanie ról odbywa się **wyłącznie** poprzez etykietę, ikonę oraz specyficzną treść widoku scenicznego .
2. **Zakaz Sklonowanego Chrome z Legacy v4:** Zabrania się kopiowania paska narzędzi, ikon oraz struktury HTML z legacy `STAGESYNC-APP-LEGACY` . Wszystkie elementy interfejsu muszą korzystać ze spójnych komponentów `@stagesync/ui` na bazie CSS Modules i tokenów `--ss-*` .
3. **Zakaz Atrap Uwierzytelniania (Stub Login):** Nie wolno dodawać wygaszonych przycisków „Zaloguj się”, atrap formularzy podawania hasła ani sztucznych modułów Auth0/JWT w shellach 5.2 . Brak funkcji na scenie oznacza całkowity brak interfejsu .
4. **Zakaz Ad-hoc HEX w Shellach i Komponentach:** Kategoryczny zakaz wpisywania kodów kolorów w plikach widoków oraz w lokalnych plikach stylów CSS Modules . Używać należy wyłącznie zmiennych `--ss-color-*` .

### Mapowanie Plików w Repozytorium

| Ścieżka do Pliku                                                                                         | Rola / Opis Modułu                                | Zakres Modyfikacji w 5.2+                                                                  |
| :------------------------------------------------------------------------------------------------------- | :------------------------------------------------ | :----------------------------------------------------------------------------------------- |
| [`packages/ui/src/tokens.css`](../../../../packages/ui/src/tokens.css)                                   | Definicje kanonicznych tokenów Design Systemu .   | Dodanie reguł `[data-theme="light"]`, `[data-contrast="high"]` oraz delt kolorystycznych . |
| `packages/ui/src/colors.md`                                                                              | Dokumentacja semantyki kolorów .                  | Aktualizacja specyfikacji niezmienników sygnałów i akcentów .                              |
| `apps/web/src/lib/appearance.ts`                                                                         | Obsługa stosowania motywów w DOM i persystencji . | Rozbudowa funkcji `applyAppearance` o obsługę wariantów wysokiego kontrastu .              |
| [`apps/web/src/shells/ClientShell.tsx`](../../../../apps/web/src/shells/ClientShell.tsx)                 | Shell interfejsu klienta wykonawcy .              | Integracja przełącznika motywów w popoverze ustawień bez blokowania tożsamością .          |
| [`apps/web/src/shells/ServerSettingsModal.tsx`](../../../../apps/web/src/shells/ServerSettingsModal.tsx) | Modal ustawień serwera i preferencji globalnych . | Dodanie zakładek konfiguracji kodu PIN oraz domyślnego motywu stacji .                     |
| `apps/server/src/routes/settings.ts`                                                                     | Konfiguracja parametrów serwera w REST API .      | Obsługa flagi `STAGESYNC_OPERATOR_PIN` oraz walidacja ACL .                                |

---

Powered by [AI Exporter](https://saveai.net)

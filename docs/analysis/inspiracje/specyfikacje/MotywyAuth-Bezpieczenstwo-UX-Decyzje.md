> From: https://gemini.google.com/app/76ac1b4d84af32f2

Recenzja Security i Scenic UX

# Raport Przeglądu Bezpieczeństwa Produktowego i Scenic UX: System Motywów oraz Autentykacji StageSync v5.2+

## Kontekst Architektoniczny i Granice Zmienności

System StageSync operuje na styku dwóch krytycznych domen: bezwzględnego autorytetu czasu w czasie rzeczywistym oraz elastycznej prezentacji wizualnej na zróżnicowanych urządzeniach scenicznych . Zgodnie z zasadami *Pace Layering* oraz aksjomatami architektonicznymi opisanymi w ADR 0005 (Granica 0), najgłębsze reguły domenowe — obejmujące kanoniczny ciąg ticków, układ folderów `data/projects/<id>/` oraz izolację projektów — stanowią absolutnie niezmienny fundament systemu . 

Warstwa motywów wizualnych (`data-theme`) oraz mechanizmy kontroli dostępu (AUTH) przynależą do zewnętrznych warstw ewolucyjnych (*Stuff / Skin / Services*) . Taka separacja oznacza, że zmiany w zakresie stylizacji UI czy filtracji żądań na krawędziach sieciowych nie mogą naruszać stabilności zegara muzycznego ani wprowadzać opóźnień (jitteru) do pętli zdarzeń . Audyt decyzji dotyczących motywów i autentykacji w linii 5.2+ wymaga oceny pod kątem odporności na specyficzne zagrożenia występujące w warunkach koncertowych oraz spójności z dotychczasowymi ustaleniami architektonicznymi .

---

## Threat Model Estrady FOH: Zaufana Sieć LAN + Operator PIN vs OAuth

Środowisko koncertowe wymusza całkowicie odmienne podejście do architektury bezpieczeństwa niż standardowe aplikacje internetowe . Analiza modeli zagrożeń w reżyserce Front of House (FOH) oraz na scenie wskazuje na trzy główne czynniki ryzyka: brak gwarantowanego dostępu do zewnętrznej sieci Internet w obiektach widowiskowych , ryzyko nieświadomych lub przypadkowych interakcji na ekranach dotykowych tabletów przez muzyków w trakcie występów , oraz próby nieautoryzowanego połączenia z lokalną siecią Wi-Fi przez osoby z publiczności (np. po zeskanowaniu widocznego kodu QR) .

| Model Autentykacji | Odporność na Awarię Sieci | Tarcie Operacyjne na Scenie | Poziom Ochrony Koncertu | Ocena Decyzji Produktowej |
| :--- | :--- | :--- | :--- | :--- |
| **Brak Autentykacji** | Absolutna (100% offline)  | Zerowe (brak haseł)  | Nisko-średni (podatność na błędy)  | Nieodpowiednie dla otwartych sieci Wi-Fi . |
| **Host Operator PIN (MVP 5.2)** | Absolutna (100% offline)  | Minimalne (jednorazowy PIN w ustawieniach)  | Wysoki (blokada mutacji i destrukcji)  | **Rekomendowane MVP.** Optymalny kompromis . |
| **Pełny OAuth / JWT Multi-User** | Zależna od dostawcy IDP / tokenów | Ekstremalne (logowanie, re-auth)  | Bardzo wysoki (identyfikacja tożsamości)  | **Odroczone (OUT w 5.2).** Ryzyko paraliżu sceny . |

Odrzucenie OAuth i kont multi-user w wydaniu 5.2 jest decyzją w pełni uzasadnioną pod kątem bezpieczeństwa scenicznego . Wprowadzenie centralnej autentykacji opartej na zewnętrznych dostawcach tożsamości (OAuth/JWT) stwarza pojedynczy punkt awarii (*Single Point of Failure*). Wygaśnięcie tokena lub brak odświeżenia sesji w podziemnym klubie bez zasięgu GSM uniemożliwiłoby realizatorowi jakąkolwiek edycję setlisty lub sterowanie transportem .

Wdrożenie opcjonalnego kodu PIN operatora (`STAGESYNC_OPERATOR_PIN`) przenosi punkt egzekwowania uprawnień wyłącznie na krawędź transportową (REST API oraz WebSocket Gateway) . System pozwala na swobodne przesyłanie telemetrycznych sygnałów odczytu (stany playheadu, podgląd nut) , natomiast żądania o charakterze destrukcyjnym — takie jak usunięcie projektu, wyczyszczenie setlisty czy zmiana routingów I/O — wymagają nagłówka `X-Stagesync-Operator-Pin` . W zaufanej sieci LAN takie rozwiązanie skutecznie zabezpiecza przebieg koncertu przed błędem ludzkim bez wprowadzania niepotrzebnych opóźnień interfejsowych .

---

## Analiza Scenic UX: Władza Hosta (`liveDesk.themeLock`) vs Suwerenność Urządzenia

Wczesne założenia specyfikacji 5.2 zakładały wprowadzenie opcji twardego narzucania motywu wizualnego wszystkim połączonym klientom przez hosta (`liveDesk.themeLock`) . Pogłębiona analiza ergonomiczna wskazuje jednak, że koncepcja ta stanowiła poważny antywzorzec UX w warunkach pracy na żywo . Rzeczywistość sceniczna wymaga zachowania pełnej suwerenności preferencji wyświetlania po stronie pojedynczego urządzenia klienckiego .

Perkusista umieszczony w niedoświetlonym punkcie sceny wymaga ciemnego interfejsu (*Booth Dark*), aby ekran nie odciągał uwagi widowni i nie oślepiał samego wykonawcy . Z kolei wokalista na przedzie sceny plenerowej, pracujący w pełnym słońcu, potrzebuje jasnego motywu o wysokim kontraście (*Stage Daylight / High-Contrast Light*), aby zachować czytelność tekstu i akordów . Narzucenie jasnego motywu wszystkim wykonawcom w ciemnym teatrze wywołuje zjawisko rozświetlania twarzy (*White Face Syndrome*), powodując niepożądaną poświatę na twarzach artystów i psując reżyserię światła scenicznego .

Rynkowe wzorce odniesienia, takie jak aplikacja OnSong, rozwiązują ten problem poprzez odseparowanie globalnych ustawień od trybu niskiego oświetlenia (*Low Light Mode*) . OnSong pozwala na niezależne przełączanie trybu jasnego/ciemnego na poszczególnych ekranach odliczających, urządzeniach mobilnych lub monitorach scenicznych . Analogicznie, stacje pracy MainStage stosują stały, ciemny interfejs dla reżyserek przy jednoczesnej elastyczności konfiguracji widoków wykonawców.

Decyzja podjęta w triage po wydaniu `5.2.0`, polegająca na całkowitym usunięciu funkcji `liveDesk.themeLock` z produktu, była w pełni prawidłowa . Host powinien określać wyłącznie domyślną wartość startową dla nowych połączeń (`STAGESYNC_THEME_DEFAULT`), podczas gdy każde urządzenie klienckie zachowuje prawo do nadpisania motywu w swoim lokalnym magazynie (`localStorage`) .

---

## Niezmienniki Domenowe Sygnałów Operacyjnych i System Motywów

System tokenów CSS zawarty w `packages/ui/src/tokens.css` wprowadza ścisłą hierarchię zmiennych `--ss-*` . Upraszczanie warstwy wizualnej w kierunku dwóch głównych wariantów — ciemnego oraz jasnego z modyfikatorem wysokiego kontrastu (`data-contrast="high"`) — jest zgodne z zasadą minimalizmu marki StageSync . Zmiana motywu kolorystycznego nie może jednak w żadnym wypadku prowadzić do scalania lub zacierania odrębnych sygnałów operacyjnych DAW .

Zgodnie z ADR 0011 oraz ADR 0015, kluczowe wskaźniki operacyjne posiadają sztywno przypisaną semantykę kolorystyczną, która musi pozostać niezmienna niezależnie od aktywnej skórki . Wskaźnik odtwarzania MIDI (Playhead) jest powiązany z tokenem `--ss-color-info` (#38bdf8 / Cyjan) i reprezentuje pozycję odtwarzania w czasie rzeczywistym zarządaną przez serwer . Wskaźnik pętli i zaznaczenia (Locator) opiera się na tokenie `--ss-color-warning` (#fb923c / Żółty-Pomarańcz) i definiuje obszar roboczy edycji . Wyraźne rozróżnienie tych dwóch wskaźników zapobiega pomyłkom realizatorskim w trakcie trwania utworu .

Przycisk Solo w mikserze i na timeline korzysta ze stałego akcentu `--ss-color-solo` (#ffcc00 / Jaskrawy Żółty), natomiast przycisk Mute jest na stałe przypisany do tokena `--ss-color-mute` (#ff3b30 / Czerwony Estradowy) . Dodatkowo tło tarczy nutowej OSMD / MusicXML zachowuje stałą wartość `--ss-color-osmd-paper` (#ffffff / Czysta Biel), co gwarantuje prawidłowy kontrast tradycyjnego zapisu nutowego niezależnie od motywu otaczającego go panelu . Scalenie koloru wskaźnika odtwarzania (Playhead) z kolorem marki CTA lub kolorem locatora w celu osiągnięcia wizualnej jednolitości stanowiłoby krytyczny błąd UX, narażający realizatora na błędną interpretację stanu sekwencera pod presją czasu .

| Token CSS | Dark Default (v4) | Light Booth | High-Contrast Dark | High-Contrast Light | Rola w Systemie i Niezmiennik |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--ss-color-bg` | `#000000` | `#f4f4f5` | `#000000` | `#ffffff` | Tło ekranu (anti-halation w ciemności) . |
| `--ss-color-surface` | `#09090b` | `#ffffff` | `#000000` | `#ffffff` | Powierzchnia paneli i chrome . |
| `--ss-color-text` | `#fafafa` | `#18181b` | `#ffffff` | `#000000` | Tekst główny (złamana biel w dark) . |
| `--ss-color-primary` | `#fbbf24` | `#d97706` | `#fde047` | `#b45309` | Główny akcent CTA i interakcji . |
| `--ss-color-info` | `#38bdf8` | `#0284c7` | `#38bdf8` | `#0284c7` | **MIDI Playhead** (odrębny od amber) . |
| `--ss-color-warning` | `#fb923c` | `#d97706` | `#fb923c` | `#d97706` | **Timeline Locator** (pozycja pętli) . |
| `--ss-color-solo` | `#ffcc00` | `#ffcc00` | `#ffcc00` | `#ffcc00` | Stały akcent Solo na mikserze . |
| `--ss-color-mute` | `#ff3b30` | `#ff3b30` | `#ff3b30` | `#ff3b30` | Stały akcent Mute na mikserze . |
| `--ss-color-osmd-paper`| `#ffffff` | `#ffffff` | `#ffffff` | `#ffffff` | Niezmienne białe tło nut MusicXML . |

---

## Spójność Metodologiczna: Backlog vs Permanent OUT (ADR 0015)

Wokół ewolucji architektury StageSync powstały wątpliwości dotyczące spójności wpisów w dokumentacji w kontekście usuwania funkcji z wydań bieżących . Zgodnie z zasadą zawartą w ADR 0015 §0, samotny wpis w rejestrze zadań (backlog / TODO) nie stanowi trwałościowej decyzji o usunięciu funkcji z produktu (*Backlog ≠ Decyzja OUT*) .

Przeniesienie rozbudowanej macierzy motywów oraz zaawansowanych mechanizmów ACL Multi-User do zadań odłożonych (*Residual 5.3+*) jest w pełni spójne z przyjętą polityką zarządzania dławieniem zakresu prac . Trwałe wykluczenie funkcji z architektury (*Permanent OUT*) wymaga formalnego uzasadnienia i decyzji Product Ownera — tak jak w przypadku automatycznych aktualizacji bez wiedzy operatora czy mechanizmu `git-apply` na scenie . Trzymanie tematu motywów i autentykacji w backlogu bez nadawania mu statusu permanentnego wykluczenia zabezpiecza spójność planistyczną i umożliwia bezproblemowy powrót do tych funkcji w wydaniach dedykowanych dla dużych instalacji festiwalowych .

---

## Macierz Rekomendacji i Decyzji Operacyjnych

Poniższa tabela przedstawia zbiorczą ocenę architektoniczną oraz rekomendacje dla sześciu analizowanych decyzji produktowych w ramach identyfikatora CRIT-THM-01:

| Decyzja i Zakres | Ocena Architektoniczna | Ocena Scenic UX / Security | Rekomendowany Weryfikator | Rekomendowana Akcja |
| :--- | :--- | :--- | :--- | :--- |
| **1) OAuth / multi-user OUT w 5.2** | Zgodne z Granicą 0 i architekturą offline . | Eliminacja ryzyka paraliżu sceny przy braku Internetu . | **KEEP** | **Zatwierdzić.** Zachować prostotę wdrożenia scenicznego . |
| **2) Operator PIN jako MVP (env)** | Poprawna izolacja na krawędziach REST/WS . | Ochrona przed błędem ludzkim bez oporów w UX . | **KEEP / REVISE** | **Wdrożyć z korektą.** Upewnić się, że odczyt telemetryczny nie wymaga PIN-u . |
| **3) Scenic Lock theme (`liveDesk.themeLock`)** | Naruszenie suwerenności lokalnej klienta . | Krytyczny antywzorzec UX (oślepianie / brak czytelności) . | **REVERT** | **Potwierdzić usunięcie.** Zostawić wyłącznie `STAGESYNC_THEME_DEFAULT` . |
| **4) Light + High-Contrast (residual matrix)** | Wystarczające pokrycie norm APCA/WCAG AAA . | Wysoka czytelność w słońcu i reżyserce . | **KEEP** | **Zatwierdzić.** Przenieść pełne 4 profile do residual 5.3+ . |
| **5) Ochrona sygnałów operacyjnych (ADR 0011)** | Ochrona semantyki domenowej DAW . | Bezpieczeństwo wykonania — natychmiastowe rozpoznanie stanu . | **KEEP** | **Bezwzględnie egzekwować.** Sygnały Playhead/Locator/Solo/Mute są nietykalne . |
| **6) Motywy/Auth w backlogu (ADR 0015)** | Zgodność z higieną zarządzania produktem . | Brak fałszywych deklaracji o usunięciu funkcji . | **KEEP** | **Zatwierdzić.** Trzymać się rozróżnienia Backlog vs Decision OUT . |

---

## Pytania do Product Ownera (PO) i Rekomendacje Wdrożeniowe

Dla ostatecznego domknięcia obszaru funkcjonalnego przed kolejnym cyklem wydań, zaleca się przekazanie do Product Ownera następujących pytań precyzujących:

1. **Czas trwania sesji Operator PIN:** Czy rozblokowanie interfejsu klienta po podaniu prawidłowego kodu PIN ma wygasać automatycznie po określonym czasie bezczynności (np. 15 minut), czy zachowywać ważność do momentu odświeżenia przeglądarki lub wyłączenia aplikacji?
2. **Procedura awaryjna (Panic Override):** Czy na wypadki awaryjne w trakcie trwania koncertu należy przewidzieć skrót fizyczny na konsolek głównej (np. `Cmd+Opt+Shift+P`), który natychmiastowo zdejmuje wymaganie podawania kodu PIN dla wszystkich połączonych urządzeń w sieci LAN?
3. **Obsługa widoków zewnętrznych (Stage Display / HDMI Out):** Czy w przypadku podłączenia zewnętrznego monitora przez wyjście wideo, ekran ten ma dziedziczyć motyw urządzenia głównego, czy posiadać odrębną opcję wymuszenia trybu wysokiego kontrastu (wzorem ustawień monitora scenicznego w OnSong) ?
4. **Renderowanie kart nutowych OSMD w trybie High-Contrast:** Czy tło tarczy nutowej MusicXML ma bezwzględnie pozostawać białe (`#ffffff`) także w trybach wysokiego kontrastu , czy dopuszczamy opcjonalny tryb odwrócenia kolorów (negatyw) na jawne życzenie muzyka ?

---
Powered by [AI Exporter](https://saveai.net)
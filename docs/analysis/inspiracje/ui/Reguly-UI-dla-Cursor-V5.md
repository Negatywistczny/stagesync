> **Repo:** surowy dump — nie SSOT. Triage: [Reguly-UI-dla-Cursor-V5.triage.md](./Reguly-UI-dla-Cursor-V5.triage.md). Konwencje: [README](../README.md).

# **Matematyczny kaganiec UI dla Cursor V5: Kodyfikacja przemysłowych standardów gęstości, ergonomii operacyjnej i kontrastu percepcyjnego**

## **Faza I: Kwerenda standardów gęstości i ergonomii estradowej**

### **Siatki podwyższonej gęstości w profesjonalnych systemach desktopowych**

Wytwarzanie interfejsów graficznych dla profesjonalnych stacji roboczych audio (DAW), takich jak REAPER, Ableton Live czy Logic Pro, podlega rygorystycznym ograniczeniom przestrzennym, które wynikają z konieczności jednoczesnej prezentacji setek dynamicznie zmieniających się parametrów kontrolnych na ograniczonym obszarze roboczym1. Aby zminimalizować obciążenie pamięci roboczej operatora i zapobiec konieczności ciągłej nawigacji między wieloma oknami, systemy te stosują topologię opartą na siatkach o wysokiej gęstości informacji3. Dominującym paradygmatem w tym segmencie jest system siatki 4pt/8pt (4-point/8-point Grid System)7.  
Siatka 8pt definiuje wymiary zewnętrzne elementów, marginesy oraz odstępy między komponentami, wykorzystując wielokrotności liczby 8 jako jedyne dopuszczalne wartości7. Wybór ten jest uwarunkowany matematyczną podzielnością najpopularniejszych rozdzielczości ekranów desktopowych, co eliminuje błędy ułamkowego renderowania pikseli (subpixel rendering) przy skalowaniu interfejsów na wyświetlaczach o wysokiej gęstości (HiDPI/Retina)7. Jednak w mikrostrukturach komponentów – takich jak wewnętrzne marginesy przycisków, odstępy ikon w toolbarach czy gęsto rozmieszczone sloty wtyczek i wysyłek (inserts/sends) – skok o 8 pikseli okazuje się zbyt zgrubny2. W tych scenariuszach zastosowanie znajduje podsiatka 4pt7.

| Parametr przestrzenny | Wartość domyślna (SaaS/Web) | Wartość ultrakompaktowa (DAW / MCP / TCP) | Uzasadnienie projektowe i ergonomiczne |
| :---- | :---- | :---- | :---- |
| **Siatka bazowa (Grid Base)** | 8px \[cite: 7, 8\] | 4px (podsiatka komponentu)7 | Optymalizacja pozycjonowania mikrokontrolerów i etykiet parametrycznych4. |
| **Odstęp między kolumnami (*gap*)** | 16px lub 24px \[cite: 7, 9\] | 4px lub 8px \[cite: 5, 7\] | Maksymalizacja nasycenia przestrzennego; zapobieganie rozpadaniu się grup funkcjonalnych6. |
| **Wewnętrzny margines (*padding*)** | 16px \[cite: 8\] | 4px (pionowy) / 8px (poziomy)5 | Zapewnienie minimalnego światła wokół etykiet tekstowych przy zachowaniu zwartości pionowej7. |
| **Szerokość kanału miksera (MCP)** | Fluid (100%)13 | 72px (wąski) / 120px (szeroki)14 | Zachowanie stałego rytmu wizualnego niezależnie od liczby ścieżek w projekcie2. |
| **Wysokość wiersza tabeli danych** | 36px do 44px \[cite: 5, 6\] | 24px (Condensed)13 | Drastyczne zwiększenie współczynnika prezentacji danych (data-to-ink ratio)6. |

Standardy te są bezpośrednio widoczne w konfiguracjach silnika WALTER w programie REAPER, gdzie minimalizacja marginesów pionowych oraz wymuszenie stałej szerokości kanałów miksera zapobiega przesunięciom wizualnym przy dynamicznym dodawaniu nowych ścieżek2. Ponadto, IBM Carbon Design System implementuje tzw. "Condensed Mode" z odstępem rzędu 1px, co dedykowane jest wyłącznie dla paneli telemetrycznych i naukowych, gdzie priorytetem jest natychmiastowy podgląd maksymalnej liczby zmiennych13.

### **Standardy dotykowe w warunkach stresu, ruchu i wibracji**

Przeniesienie interfejsu o wysokiej gęstości na ekrany dotykowe urządzeń pracujących w środowiskach mobilnych (takich jak konsolety automatyki estradowej PWA używane na koncertach, ekrany w kokpitach lotniczych czy samochodowe systemy sterowania) wymaga redefinicji pojęcia minimalnej strefy interakcji17. Fizyczne wibracje podłoża oraz wysokie obciążenie psychofizyczne operatora w warunkach stresowych bezpośrednio degradują precyzję motoryczną człowieka, prowadząc do błędów typu *view-tap asymmetry* (element jest dobrze widoczny, lecz niemożliwy do bezbłędnego naciśnięcia)18.  
W takich warunkach klasyczny standard WCAG 2.2, określający minimalną wielkość celu dotykowego na poziomie ![][image1] (![][image2]), jest niewystarczający i stwarza wysokie ryzyko operacyjne12. Przeprowadzone badania nad optymalizacją ekranów dotykowych w kokpitach myśliwców oraz śmigłowców wykazują, że do bezbłędnej i szybkiej obsługi krytycznych funkcji w warunkach silnych wibracji konieczne jest stosowanie znacznie większych celów19.  
Zgodnie ze standardem wojskowym MIL-STD-1472H, rozmiar fizycznych celów dotykowych musi mieścić się w granicach od ![][image3] do ![][image4], a minimalna separacja między krawędziami sąsiadujących przycisków nie może być mniejsza niż ![][image5]17. Badania eksperymentalne dowodzą, że dla klawiatur ekranowych optymalny czas wprowadzania danych przy jednoczesnym minimalnym obciążeniu poznawczym uzyskuje się dla przycisków o boku ![][image6] z przerwą ![][image7]19. Piloci jednoznacznie preferują jednak przyciski o rozmiarze ![][image8]19. W systemach samochodowych (Android Auto / Android for Cars) minimalny rozmiar celu dotykowego został standaryzowany na poziomie ![][image9] ze względu na konieczność szybkiej interakcji kątem oka bez odwracania uwagi od drogi21.

| Środowisko i Standard | Minimalny rozmiar celu dotykowego | Minimalny odstęp ochronny | Zastosowanie w architekturze systemu |
| :---- | :---- | :---- | :---- |
| **Android Auto (Automotive)** | **![][image9]** \[cite: 21, 22\] | Brak (wykluczenie nakładania się)22 | Przyciski nawigacyjne, kontrola odtwarzacza, menu systemowe21. |
| **Fighter Aircraft (Aviation)** | **![][image10]** (fizycznie)19 | ![][image7] (fizycznie)19 | Klawiatury numeryczne wprowadzania współrzędnych, ekrany MFD19. |
| **Aviation (Aero-Preferred)** | **![][image11]** \[cite: 19\] | ![][image7] \[cite: 19\] | Preferowana przez pilotów wielkość dla krytycznych przełączników19. |
| **MIL-STD-1472H (Tactical)** | **![][image12]** \[cite: 17\] | ![][image13] \[cite: 17\] | Panele taktyczne, wojskowe terminale operatorskie17. |
| **Stage PWA (Emergency Buttons)** | **![][image14]** | **![][image15]** | Przyciski bezpieczeństwa: *Mute All*, *Blackout*, *Panic Restore*. |

W systemach PWA przeznaczonych do kontroli automatyki koncertowej i estradowej przyciski bezpieczeństwa (np. natychmiastowe wyciszenie toru audio lub wyłączenie laserów) muszą być zwymiarowane na minimum ![][image14] przy zachowaniu odstępu ![][image15]12. Dodatkowo czas latencji wyświetlacza nie może przekraczać ![][image16], aby operator otrzymał natychmiastową informację zwrotną o aktywacji procedury awaryjnej17.

### **standardy WCAG 2.2 / 3.0 AAA w warunkach skrajnego oświetlenia zewnętrznego**

Projektowanie ciemnych interfejsów (Dark Mode) na potrzeby zaciemnionych reżyserek teatralnych, kabin kontrolnych i scen koncertowych niesie ze sobą unikalne wyzwania percepcyjne23. Podstawowym błędem w projektowaniu ciemnych motywów jest bezpośrednia inwersja jaskrawej bieli na głęboką czerń (np. tekst \#FFFFFF na tle \#000000)24. Taka kombinacja generuje maksymalny matematyczny współczynnik kontrastu 21:124. Powoduje to powstawanie zjawiska halacji (light bleeding)17. W ciemnym otoczeniu źrenica operatora jest silnie rozszerzona; jaskrawe piksele białych znaków emitują strumień światła, który ulega rozproszeniu w soczewce oka, tworząc wokół liter rozmytą poświatę (halo)24. Zjawisko to uniemożliwia szybkie czytanie tekstu i drastycznie przyspiesza zmęczenie wzroku23.  
Standard WCAG 3.0 wdraża rewolucyjny algorytm APCA (Advanced Perceptual Contrast Algorithm), który rezygnuje ze statycznych proporcji na rzecz nieliniowego modelu ludzkiej percepcji23. APCA wyznacza wartość kontrastu jasności ![][image17] (Lightness Contrast) w przedziale od \-108 do 106, gdzie ujemne wartości określają tekst jasny na ciemnym tle, a dodatnie – tekst ciemny na jasnym tle29. Model ten uwzględnia polaryzację, ponieważ oko ludzkie inaczej reaguje na strumień światła z tła niż na strumień emitowany przez same znaki typograficzne23.  
Aby wyeliminować halację i spełnić wymagania poziomu AAA w skrajnie ciemnych środowiskach, system projektowania musi stosować poniższe zasady doboru kontrastu percepcyjnego24:

* **Unikanie czystej czerni jako tła:** Główna płaszczyzna tła musi być oparta na ciemnych odcieniach atramentowych lub grafitowych (Ink Gray np. \#050814 do \#121212)24.  
* **Stosowanie przygaszonego tekstu (Off-White):** Zamiast czystej bieli, główny tekst powinien być stylizowany barwą o obniżonej emisji (np. \#cbd5e2 lub \#E0E0E0), co pozwala uzyskać komfortowy i pozbawiony poświaty kontrast percepcyjny w granicach 15.8:1 \- 16:124.  
* **Kompensacja grubości znaków w trybie nocnym:** Zgodnie z MIL-STD-1472H, w trybie nocnym należy stosować kroje pisma o cieńszych pociągnięciach (pixel stroke width w przedziale 0.0834–0.1667 wysokości znaku), ponieważ naturalne rozproszenie światła optycznie pogrubia litery na ekranie17.  
* **Zależność kontrastu od rozmiaru czcionki:** Zgodnie z matrycą APCA, dla małych czcionek (![][image18]) o standardowej wadze wymagany jest kontrast ![][image19]23, podczas gdy dla dużych nagłówków (![][image20], Bold) wystarczająca jest wartość ![][image21]23.

Do prezentacji danych o najwyższym priorytecie oraz stanów ostrzegawczych stosuje się ściśle zdefiniowaną paletę barw funkcjonalnych o obniżonym o 10-20% nasyceniu, aby zapobiec wibracji chromatycznej na ciemnym tle24:

* **Atrament (Ink):** \#050814 jako tło absorbujące refleksy i światło zewnętrzne na scenie30.  
* **Morski (Teal):** \#20D0C2 lub \#00D3D6 – wysoka sprawność widzenia obwodowego; stosowany dla stanów aktywnych, prawidłowych połączeń i statusów operacyjnych "OK"30.  
* **Bursztyn (Amber):** \#ffb347 lub \#F4B860 – barwa ostrzegawcza o doskonałej widoczności w każdych warunkach, wolna od agresywnego charakteru czerwieni; stosowana do oznaczania parametrów zmodyfikowanych w programatorze oraz ostrzeżeń średniego stopnia30.

Wzorce te są tożsame z rozwiązaniami zaimplementowanymi w konsoletach sterowania oświetleniem grandMA3, gdzie statusy aktywne w programatorze sygnalizowane są czerwonym tłem ze śnieżnobiałym tekstem, natomiast wartości referencyjne i zmiany kierunkowe wartości natężenia światła rozróżnia się za pomocą kontrastu barwnego cyan (wzrost wartości) oraz zieleni (spadek wartości)34.

## **Faza II: Kodyfikacja matematyczna (Przeliczenie na logikę LLM)**

### **Skala typograficzna (Modular Scale)**

W celu wymuszenia na modelach językowych generowania rygorystycznego, spójnego matematycznie układu typograficznego, wyklucza się całkowicie ręczne dobieranie wartości wielkości czcionek. Wszystkie rozmiary muszą być obliczane w oparciu o geometryczną progresję modularną8.  
Wzór ogólny na rozmiar czcionki dla stopnia ![][image22] przyjmuje postać:  
![][image23]  
Gdzie:

* ![][image24] to bazowa wielkość czcionki, która w profesjonalnych interfejsach kontrolnych wynosi niezmiennie ![][image25]32. Wartość ta stanowi punkt wyjścia dla optymalnej czytelności na ekranach desktopowych32.  
* ![][image26] to współczynnik skali (Ratio). W interfejsach o wysokiej gęstości dopuszcza się wyłącznie dwa współczynniki: *Perfect Fourth* (![][image27]) dla układów zróżnicowanych dynamicznie oraz *Major Third* (![][image28]) dla interfejsów o ekstremalnym zagęszczeniu parametrów36.  
* ![][image29] oznacza operację zaokrąglenia wyniku matematycznego do najbliższej liczby całkowitej wyrażonej w pikselach36.

Poniższe tabele zawierają precyzyjnie wyliczone wartości kroków typograficznych dla obu dopuszczalnych współczynników36.

#### **Tabela skali Modularnej: Perfect Fourth (Ratio \= 1.333)**

| Krok skali (n) | Dokładna wartość obliczona (px) | Zaokrąglona wartość docelowa (px) | Zastosowanie w architekturze komponentów |
| :---- | :---- | :---- | :---- |
| **Step \-3** | **![][image30]** | 6px | Etykiety osi mikrometrycznych, bardzo małe indeksy dolne36. |
| **Step \-2** | **![][image31]** | 8px | Podziałka wskaźników VU-meter, mikro-znaczniki taktów36. |
| **Step \-1** | **![][image32]** | 11px | Nazwy parametrów efektów, metadane ścieżki w DAW2. |
| **Step 0** | **![][image33]** | 14px | **Baza:** Nazwy kanałów, etykiety faderów, wartości liczbowe16. |
| **Step 1** | **![][image34]** | 19px | Nagłówki sekcji bocznych, tytuły grup urządzeń36. |
| **Step 2** | **![][image35]** | 25px | Duże odczyty tempa (BPM), liczniki czasu rzeczywistego (SMPTE)16. |
| **Step 3** | **![][image36]** | 33px | Wyświetlacze wartości głównych (Main Time Counter)36. |
| **Step 4** | **![][image37]** | 44px | Ekrany powitalne, nakładki diagnostyczne (Crash overlay)36. |

#### **Tabela skali Modularnej: Major Third (Ratio \= 1.250)**

| Krok skali (n) | Dokładna wartość obliczona (px) | Zaokrąglona wartość docelowa (px) | Zastosowanie w architekturze komponentów |
| :---- | :---- | :---- | :---- |
| **Step \-3** | **![][image38]** | 7px | Mikro-odczyty wysyłek (Aux Sends) w wąskich kanałach15. |
| **Step \-2** | **![][image39]** | 9px | Małe statusy routingu, skróty nazw wejść/wyjść fizycznych36. |
| **Step \-1** | **![][image40]** | 11px | Wartości procentowe parametrów na enkoderach4. |
| **Step 0** | **![][image33]** | 14px | **Baza:** Listy plików w przeglądarce, nazwy wtyczek4. |
| **Step 1** | **![][image41]** | 18px | Tytuły zakładek, nagłówki kart instrumentów wirtualnych36. |
| **Step 2** | **![][image42]** | 22px | Nagłówki panów kontrolnych i paneli bocznych36. |
| **Step 3** | **![][image43]** | 27px | Główne cyfry telemetryczne w widgetach6. |
| **Step 4** | **![][image44]** | 34px | Tytuł aktualnie edytowanej sceny lub sekwencji oświetleniowej36. |

### **Algorytm anty-„Dead Space” (Zabezpieczenie przed pustą przestrzenią)**

W profesjonalnych interfejsach operacyjnych występowanie niekontrolowanych, pustych obszarów graficznych jest kategorycznym błędem projektowym5. Każda jednostka powierzchni ekranowej musi być optymalnie zagospodarowana i dociążona informacyjnie6. Aby zmusić silnik generatywny Cursora do równomiernego rozkładania elementów i eliminowania martwych stref, wprowadza się zestaw matematycznych reguł dla modułów CSS Grid oraz Flexbox39.

#### **1\. Reguła dynamicznego dociążania Flexbox**

Kontenery typu Flex pracujące w osi horyzontalnej lub wertykalnej nie mogą polegać na domyślnych mechanizmach rozpychania przeglądarki40. Model ma obowiązek jawnego deklarowania parametrów wzrostu, kurczenia i bazowej wielkości elementu przy użyciu trójskładnikowego zapisu skróconego:  
![][image45]

* **Główny panel roboczy (np. Oś czasu, Edytor siatki MIDI):** Musi przyjmować wartość flex: 1 1 auto; (lub flex: 1 1 0%;), co pozwala mu na nieograniczone asymilowanie wolnej przestrzeni ekranu przy jednoczesnym zachowaniu elastyczności kurczenia40.  
* **Panele kontrolne i boczne (Toolbary, Inspektorzy):** Muszą mieć zablokowaną możliwość wzrostu poprzez deklarację flex: 0 0 auto; (lub ścisłe określenie wartości bazowej w pikselach, np. flex: 0 0 240px;)38. Zapobiega to ich nienaturalnemu rozlewaniu się i powstawaniu pustki wokół kontrolek40.  
* **Zapobieganie nienaturalnemu rozciąganiu dzieci (Stretch-Prevention):** Domyślna wartość align-items: stretch w kontenerach Flexbox często prowadzi do nienaturalnego rozciągania przycisków i kontrolek w osi poprzecznej, co generuje pusty, nieaktywny obszar wewnątrz samego komponentu40. Model musi wymusić align-items: flex-start (lub align-items: center) na kontenerze rodzica40, bądź przypisać align-self: start bezpośrednio do elementu potomnego45.

#### **2\. Algorytm nasycenia przestrzennego CSS Grid**

W celu automatycznego układania komponentów (np. kart parametrów, slotów urządzeń) bez generowania pustych kolumn na szerokich ekranach, model musi wykorzystywać funkcję minmax() w połączeniu ze słowem kluczowym auto-fit (zakaz stosowania auto-fill, który rezerwuje miejsce na puste kolumny na końcu kontenera)41.  
Matematyczna definicja struktury kolumn kontenera:

CSS  
.dense-grid-container {  
  display: grid;  
  grid-template-columns: repeat(auto-fit, minmax(clamp(160px, 15vw, 280px), 1fr));  
  grid-auto\-flow: dense; /\* Wymusza algorytm wstecznego wypełniania luk przez mniejsze elementy potomne \*/  
  gap: var(--space-2);   /\* Ścisła zgodność z siatką 8pt \*/  
}

Użycie właściwości grid-auto-flow: dense instruuje silnik renderujący przeglądarki do zmiany kolejności wizualnej elementów w celu całkowitego wypełnienia wolnych oczek siatki, jeśli mniejsze komponenty mogą wpasować się w powstałe wcześniej luki41.  
Dodatkowo, aby zapobiec rozlewaniu się kontenerów tekstowych, które po przełamaniu wiersza automatycznie przyjmują domyślną szerokość 100% (generując martwą strefę po prawej stronie), należy wymusić na nich szerokość dopasowaną do rzeczywistej szerokości zawartości43:

CSS  
.text-container-no-dead-space {  
  max-width: max-content;  
  white-space: nowrap; /\* Zapobiega niekontrolowanemu łamaniu linii w ciasnych kontrolkach \*/  
}

## **Faza III: Szablon wyjściowy (Formatka konfiguracyjna dla Cursor V5)**

Poniższe sekcje stanowią gotowy komponent konfiguracyjny, przeznaczony do bezpośredniego wdrożenia w pliku .cursorrules lub jako systemowy system-prompt dla modeli LLM w środowisku projektowym Cursor.

### **Blueprint Zmiennych CSS**

CSS  
:root {  
  /\* \--- SPACING TOKENS (Strict 4pt/8pt Grid System) \--- \*/  
  \--space-1: 4px;   /\* Micro spacing: badge padding, small icon margins \*/  
  \--space-2: 8px;   /\* Default gap: spacing between elements in mixers, button padding \*/  
  \--space-3: 12px;  /\* Compact card inner padding, secondary labels gap \*/  
  \--space-4: 16px;  /\* Standard container margin, general-purpose padding \*/  
  \--space-5: 20px;  /\* Spacing between distinct functional units \*/  
  \--space-6: 24px;  /\* Main section gap, vertical table row height \*/  
  \--space-8: 32px;  /\* Panel boundary spacing, big cards padding \*/  
  \--space-10: 40px; /\* Header-to-content separation \*/  
  \--space-12: 48px; /\* Safe touch target boundary, primary toolbars height \*/  
  \--space-16: 64px; /\* Critical safety button height, icon rail width \*/  
  \--space-20: 80px; /\* Large telemetry card height \*/  
  \--space-24: 96px; /\* Absolute maximum container offset \*/

  /\* \--- TYPOGRAPHY (Base 14px, Perfect Fourth 1.333) \--- \*/  
  \--font-size\-step-min3: 6px;   /\* Micro scale: VU meter numeric labels \*/  
  \--font-size\-step-min2: 8px;   /\* Sub-labels: track numbers, slot types \*/  
  \--font-size\-step-min1: 11px;  /\* Labels: parameter names, metadata \*/  
  \--font-size\-base:      14px;  /\* Base: channel names, input values, table data \*/  
  \--font-size\-step-1:    19px;  /\* Sub-headers: panel section titles \*/  
  \--font-size\-step-2:    25px;  /\* Major values: BPM, Timecode, DB displays \*/  
  \--font-size\-step-3:    33px;  /\* Hero telemetry: main system counters \*/  
  \--font-size\-step-4:    44px;  /\* Crash state displays / overlay headers \*/

  /\* Line Heights strictly scaled for vertical rhythm \*/  
  \--line-height\-compact:  1.15; /\* Applied to high-density labels & controls \*/  
  \--line-height\-standard: 1.25; /\* Default body text and multi-line descriptions \*/

  /\* \--- BORDER RADII (Industrial Hard Edges) \--- \*/  
  \--radius-none:        0px; /\* Used for docked windows to prevent gaps \*/  
  \--radius-sharp:       2px; /\* Meter fill indicators, fader caps \*/  
  \--radius-subtle:      4px; /\* Inner control inputs, active slot selectors \*/  
  \--radius-component:   6px; /\* High-density cards, sidebars \*/  
  \--radius-interactive: 8px; /\* Touch buttons, safety controls \*/

  /\* \--- COLOR TOKENS (Desaturated Concert-Stage Safe Palette) \--- \*/  
  \--color\-ink-100:      \#050814; /\* Deepest background: absorbs ambient stage reflections \*/  
  \--color\-ink-200:      \#0b1320; /\* Primary surface: main mixer & timeline canvas \*/  
  \--color\-ink-300:      \#15263c; /\* Elevated cards: active panels, sidebars \*/  
  \--color\-ink-400:      \#234666; /\* Interactive borders, inactive state backgrounds \*/  
  \--color\-ink-500:      \#4d7598; /\* Muted borders, inactive icon state \*/  
  \--color\-ink-text:     \#cbd5e2; /\* Standard body text: optimized to prevent halation \*/  
  \--color\-ink-text-mut: \#7689a0; /\* Secondary text: disabled states, background labels \*/

  \--color\-teal-base:    \#20d0c2; /\* Functional active: system OK, connection established \*/  
  \--color\-teal-dim:     \#123a5d; /\* Active background: subtle button state indicator \*/  
  \--color\-teal-bright:  \#00e5e8; /\* High priority active: primary selected track \*/

  \--color\-amber-base:   \#ffb347; /\* Primary action: active controls, warning state \*/  
  \--color\-amber-dim:    \#b37a2d; /\* Off-state: parameter altered but inactive \*/  
  \--color\-amber-bright: \#ffeeda; /\* Light background for warning overlays \*/

  /\* \--- INDUSTRIAL LIGHTING CODES (grandMA3 Reference) \--- \*/  
  \--color\-ma-selected:  \#ffff00; /\* Active fixture selection \*/  
  \--color\-ma-active:    \#ff3333; /\* Red: Programmer active values \*/  
  \--color\-ma-tracked:   \#ff00ff; /\* Magenta: Tracked cue parameters \*/

  /\* \--- DARK MODE OPACITY LAYERS (Material Design Compliant) \--- \*/  
  \--opacity\-text-primary:   0.87; /\* Eliminates light bleeding for high-contrast text \*/  
  \--opacity\-text-secondary: 0.60; /\* Used for auxiliary labels & descriptors \*/  
  \--opacity\-text-disabled:  0.38; /\* Used for blocked actions and bypassed slots \*/

  /\* White overlay percentage on dark surfaces to denote elevation \*/  
  \--overlay-elevation-0dp: rgba(255, 255, 255, 0.00);  
  \--overlay-elevation-1dp: rgba(255, 255, 255, 0.05);  
  \--overlay-elevation-2dp: rgba(255, 255, 255, 0.07);  
  \--overlay-elevation-3dp: rgba(255, 255, 255, 0.08);  
  \--overlay-elevation-4dp: rgba(255, 255, 255, 0.09);  
  \--overlay-elevation-6dp: rgba(255, 255, 255, 0.11);  
  \--overlay-elevation-8dp: rgba(255, 255, 255, 0.12);  
  \--overlay-elevation-24dp: rgba(255, 255, 255, 0.16);  
}

### **Katalog zakazanych praktyk (Anti-Patterns)**

Wytworzenie nieprawidłowych struktur stylizacyjnych przez model Cursor V5 bezpośrednio uszkadza spójność geometryczną i kontrastową systemu. Kategorycznie zabrania się generowania kodu zawierającego następujące antywzorce:

#### **1\. Zakaz stosowania wartości numerycznych (Magic Numbers) i niespójnych jednostek spacingu**

* **Błędny zapis:** margin: 15px;, padding-left: 5px;, gap: 13px;  
* **Zasada bezwzględna:** Wszystkie marginesy, paddingi i odstępy muszą być mapowane do zdefiniowanych tokenów \--space-1 do \--space-24. Dopuszcza się bezpośrednie wartości pikselowe wyłącznie wtedy, gdy są one wielokrotnościami liczby 4 (np. 4px, 8px, 12px, 16px, 24px).

#### **2\. Zakaz osadzania surowych kodów HEX poza plikiem tokenów**

* **Błędny zapis:** background-color: \#121212;, color: \#ffffff;, border: 1px solid \#333;  
* **Zasada bezwzględna:** Kod komponentu musi być całkowicie uniezależniony od twardo zakodowanych barw. Dozwolone jest wyłącznie użycie semantycznych zmiennych kolorystycznych (np. var(--color-ink-200)).

#### **3\. Zakaz wywoływania efektu halacji poprzez twarde inwersje kolorów**

* **Błędny zapis:** background-color: \#000000; color: \#ffffff; font-weight: 100;  
* **Zasada bezwzględna:** Zabrania się łączenia czystej czerni jako tła z czystą bielą jako tekstu. Tekst główny musi posiadać jasność ograniczoną do poziomu \--color-ink-text i opacisity na poziomie var(--opacity-text-primary) (87%).

#### **4\. Zakaz używania niekontrolowanego pozycjonowania absolutnego do wyrównywania kontrolek**

* **Błędny zapis:** position: absolute; top: 12px; right: 8px; (wewnątrz małych kart lub wierszy tabeli).  
* **Zasada bezwzględna:** Mikro-elementy sterujące (takie jak ikony wewnątrz przycisków, odznaki statusu, wskaźniki) muszą być układane wyłącznie za pomocą pozycjonowania elastycznego Flexbox z jawną deklaracją align-items: center; i gap: var(--space-1);.

#### **5\. Zakaz stosowania width: 100% na panelach bocznych i oknach dokowalnych**

* **Błędny zapis:** width: 100%; (na kontenerze inspektora lub bocznej przeglądarki).  
* **Zasada bezwzględna:** Panele te muszą mieć twardo zdefiniowany fizyczny zakres szerokości przy użyciu min-width oraz max-width w pikselach (np. width: 240px; min-width: 240px; max-width: 280px;), co zapobiega rozciąganiu interfejsu na monitorach ultra-szerokich (Ultrawide).

#### **6\. Zakaz uzależniania krytycznych akcji wyłącznie od zdarzenia najechania myszą (:hover)**

* **Błędny zapis:** .action-button { display: none; } .card:hover .action-button { display: block; }  
* **Zasada bezwzględna:** W środowisku dotykowym lub w warunkach wibracji estradowych, zdarzenie hover nie istnieje lub jest niemożliwe do precyzyjnego wywołania. Wszystkie elementy sterujące muszą być stale widoczne fizycznie lub wywoływane dedykowanym, dużym przyciskiem menu.

### **Matryca kompozycji komponentów (Component Blueprint Matrix)**

Podczas generowania kodu komponentów interfejsu model Cursor V5 musi bezwzględnie realizować następujące algorytmy kompozycyjne:

#### **Komponent 1: Toolbar (Główny panel narzędziowy)**

* **Zastosowanie:** Górny pas kontrolny wyboru narzędzi edycyjnych, przełączania siatek i sterowania transportem.  
* **Algorytm wymiarowania:** Wysokość fizyczna zablokowana na poziomie dokładnie 48px (--space-12)38. Odstępy wewnętrzne (padding) ustawione na 0 var(--space-2)5.  
* **Układ wewnętrzny:** display: flex; flex-direction: row; align-items: center; justify-content: space-between;40.  
* **Wymiarowanie ikon i celów dotykowych:** Każda ikona narzędziowa musi mieć fizyczną wielkość wektora wynoszącą dokładnie 20x20px, lecz musi być zamknięta wewnątrz kontenera przycisku o wielkości minimum 36x36px (poprzez padding: var(--space-2)), co gwarantuje poprawną wielkość celu dotykowego zgodnie ze standardem ergonomicznym12. Odległość między kontenerami przycisków w toolbarze musi wynosić dokładnie 8px (--space-2)7.

#### **Komponent 2: Mixer Strip (MCP \- Mixer Control Panel Channel)**

* **Zastosowanie:** Pionowy kanał kontrolny ścieżki dźwiękowej w mikserze DAW2.  
* **Szerokość fizyczna:** Stała wartość zablokowana za pomocą width: 120px; min-width: 120px; max-width: 120px;14.  
* **Wewnętrzne odstępy:** padding: var(--space-2); z każdej strony5.  
* **Układ sekcji wewnętrznych:**  
  * Górna strefa (Routing i Wtyczki): display: grid; grid-template-columns: 1fr; gap: var(--space-1);39. Każdy wiersz slotu wtyczki (Plugin Slot) ma wysokość dokładnie 16px i zaokrąglenie krawędzi var(--radius-sharp)4.  
  * Środkowa strefa (VU-meter poziomu sygnału): Wysokość elastyczna dociążająca wolne miejsce (flex: 1 1 auto;)40. Szerokość fizyczna słupka wskaźnika ustawiona na 12px37.  
  * Dolna strefa (Sterowanie fizyczne): Wysokość zablokowana na 120px. Zawiera odczyt numeryczny poziomu w decybelach (czcionka font-size-step-min1 o stałej szerokości znaków) oraz horyzontalny rząd przycisków Solo i Mute o wysokości dokładnie 24px42.

TypeScript  
// Precyzyjna implementacja TSX komponentu Mixer Strip (MCP)  
import React from 'react';

interface MixerStripProps {  
  trackId: number;  
  trackName: string;  
  volumeDb: string;  
  isMuted: boolean;  
  isSoloed: boolean;  
  onMuteToggle: () \=\> void;  
  onSoloToggle: () \=\> void;  
  signalLevel: number; // Wartość od 0.0 do 1.0  
}

export const MixerStrip: React.FC\<MixerStripProps\> \= ({  
  trackId,  
  trackName,  
  volumeDb,  
  isMuted,  
  isSoloed,  
  onMuteToggle,  
  onSoloToggle,  
  signalLevel,  
}) \=\> {  
  return (  
    \<div className="flex flex-col h-full w-\[120px\] min-w-\[120px\] max-w-\[120px\] bg-\[var(--color-ink-200)\] border-r border-\[var(--color-ink-400)\] p-\[var(--space-2)\] select-none"\>  
      {/\* NAGŁÓWEK KANAŁU \*/}  
      \<div className="flex flex-col gap-\[var(--space-1)\] mb-\[var(--space-2)\]"\>  
        \<span className="text-\[var(--font-size-step-min2)\] text-\[var(--color-ink-text-mut)\] font-mono font-bold leading-none"\>  
          {String(trackId).padStart(2, '0')}  
        \</span\>  
        \<div className="h-\[18px\] bg-\[var(--color-ink-100)\] rounded-\[var(--radius-sharp)\] flex items-center px-1 border border-\[var(--color-ink-400)\]"\>  
          \<span className="text-\[var(--font-size-step-min2)\] text-\[var(--color-teal-base)\] font-mono truncate"\>  
            INPUT\_1  
          \</span\>  
        \</div\>  
      \</div\>

      {/\* SLOTY EFEKTÓW (HIGH-DENSITY GRID) \*/}  
      \<div className="grid grid-cols-1 gap-\[var(--space-1)\] mb-\[var(--space-2)\]"\>  
        {\['EQ', 'COMP', 'LIMIT'\].map((fx, idx) \=\> (  
          \<div   
            key={idx}   
            className="h-\[16px\] bg-\[var(--color-ink-300)\] rounded-\[var(--radius-sharp)\] flex items-center justify-between px-1 border border-\[var(--color-ink-400)\] cursor-pointer hover:bg-\[var(--color-ink-400)\] transition-colors"  
          \>  
            \<span className="text-\[var(--font-size-step-min3)\] text-\[var(--color-ink-text)\] font-mono truncate"\>  
              {fx}  
            \</span\>  
            \<div className="w-\[4px\] h-\[4px\] rounded-full bg-\[var(--color-teal-base)\]" /\>  
          \</div\>  
        ))}  
      \</div\>

      {/\* DYNAMICZNY VU METER \*/}  
      \<div className="flex-1 flex justify-center py-\[var(--space-2)\] bg-\[var(--color-ink-100)\] rounded-\[var(--radius-subtle)\] border border-\[var(--color-ink-400)\] relative mb-\[var(--space-2)\]"\>  
        \<div className="w-\[12px\] h-full bg-black rounded-\[var(--radius-sharp)\] overflow-hidden relative"\>  
          \<div   
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-\[var(--color-teal-dim)\] to-\[var(--color-teal-bright)\] transition-all duration-75"  
            style={{ height: \`${Math.min(100, Math.max(0, signalLevel \* 100))}%\` }}  
          /\>  
        \</div\>  
      \</div\>

      {/\* STEROWANIE FADEREM I PRZYCISKAMI \*/}  
      \<div className="flex flex-col gap-\[var(--space-2)\] mt-auto"\>  
        \<div className="text-center font-mono text-\[var(--font-size-step-min1)\] text-\[var(--color-ink-text)\] font-bold"\>  
          {volumeDb}  
        \</div\>  
          
        {/\* DUO CONTROL ROW \*/}  
        \<div className="grid grid-cols-2 gap-\[var(--space-1)\]"\>  
          \<button  
            onClick={onMuteToggle}  
            className={\`h-\[24px\] rounded-\[var(--radius-sharp)\] font-mono text-\[var(--font-size-step-min1)\] font-bold transition-colors ${  
              isMuted   
                ? 'bg-\[var(--color-ma-active)\] text-white'   
                : 'bg-\[var(--color-ink-300)\] text-\[var(--color-ink-text)\] hover:bg-\[var(--color-ink-400)\]'  
            }\`}  
          \>  
            M  
          \</button\>  
          \<button  
            onClick={onSoloToggle}  
            className={\`h-\[24px\] rounded-\[var(--radius-sharp)\] font-mono text-\[var(--font-size-step-min1)\] font-bold transition-colors ${  
              isSoloed   
                ? 'bg-\[var(--color-amber-base)\] text-black'   
                : 'bg-\[var(--color-ink-300)\] text-\[var(--color-ink-text)\] hover:bg-\[var(--color-ink-400)\]'  
            }\`}  
          \>  
            S  
          \</button\>  
        \</div\>

        {/\* NAZWA ŚCIEŻKI \*/}  
        \<div className="h-\[20px\] bg-\[var(--color-ink-300)\] rounded-\[var(--radius-sharp)\] flex items-center justify-center border border-\[var(--color-ink-400)\] px-1"\>  
          \<span className="text-\[var(--font-size-step-min1)\] font-bold text-\[var(--color-ink-text)\] truncate font-mono"\>  
            {trackName}  
          \</span\>  
        \</div\>  
      \</div\>  
    \</div\>  
  );  
};

#### **Komponent 3: Sidebar Control Panel (Inspektor parametrów)**

* **Algorytm wymiarowania:** Szerokość fizyczna zablokowana na przedziale od 240px do 280px38. Wysokość wynosi 100% wysokości rzutni (viewport)44.  
* **Architektura elastyczna (Responsive Collapse):** W przypadku zmniejszenia szerokości ekranu poniżej 1024px, panel musi automatycznie przejść w stan zwinięty (Icon Rail Mode) o szerokości dokładnie 64px (--space-16)38. Tekst nagłówków i opisy są ukrywane (display: none;), a widoczne pozostają wyłącznie ikony wyśrodkowane w strefach 44x44px21.

#### **Komponent 4: KPI Metric Card (Karta parametrów kluczowych)**

* **Zastosowanie:** Odczyty master-clock, wskaźniki błędów synchronizacji, statusy bufora38.  
* **Szerokość:** Dynamiczna, zdefiniowana regułą minmax(200px, 1fr) w wierszu siatki CSS Grid38. Wysokość zablokowana na dokładnie 80px (--space-20).  
* **Wewnętrzne odstępy:** 12px (--space-3) ze wszystkich stron6.  
* **Hierarchia informacji:**  
  * Górny wiersz (Etykieta pomocnicza): Nazwa parametru (np. *LTC FRAME RATE*) o rozmiarze 11px (--font-size-step-min1) w kolorze \--color-ink-text-mut38.  
  * Dolny wiersz (Wartość dominująca): Zmienna dynamiczna (np. *29.97 FPS*) o rozmiarze 25px (--font-size-step-2)38 z grubością pisma 700 (Bold)6, wykonana przy użyciu czcionki typu monospace w kolorze \--color-teal-base6.

#### **Komponent 5: Data Sheet / Table (Matryca danych automatyki)**

* **Zastosowanie:** Listy zdarzeń czasowych, arkusze urządzeń (fixture sheets)34.  
* **Wysokość wiersza:** Dokładnie 24px (--space-6) dla zapewnienia ekstremalnej koncentracji danych (wysokość oparta na standardzie Carbon Design System Condensed Mode)13.  
* **Czcionka:** Bezwzględnie czcionka o stałej szerokości znaków (monospace) o rozmiarze 11px (--font-size-step-min1)6.  
* **Nagłówek tabeli (Sticky Header):** Zablokowany na górnej krawędzi kontenera (position: sticky; top: 0; z-index: 10;)6, wysokość 24px, tło ciemniejsze od głównego korpusu tabeli o 5% (--color-ink-100) w celu wyraźnego odcięcia optycznego bez konieczności stosowania grubych linii obramowania24.  
* **Wyrównanie danych liczbowych:** Wszystkie kolumny przechowujące wartości liczbowe (częstotliwości, opóźnienia, poziomy dB) muszą posiadać wyrównanie do prawej krawędzi (text-align: right; font-variant-numeric: tabular-nums;)6. Zapobiega to drganiu tekstu podczas dynamicznych zmian wartości6.

## **Podsumowanie i wytyczne wykonawcze**

Implementacja powyższego systemu reguł matematycznych jako nadrzędnego zestawu instrukcji dla Cursor V5 gwarantuje eliminację błędów kompozycyjnych u samej części generatywnej kodu. Wymuszenie rygorystycznego mapowania każdego piksela w oparciu o siatki 4pt/8pt7 oraz stałe powiązanie skali typograficznej z geometryczną progresją ciągu ![][image46]36 powoduje, że tworzony kod jest przewidywalny, wysoce semantyczny i odporny na dezintegrację przy zmianach rozdzielczości ekranowych. System ten zabezpiecza stabilność pracy realizatorów i inżynierów obsługujących krytyczne systemy kontrolno-estradowe w skrajnych warunkach oświetleniowych oraz w warunkach stresu fizycznego17.

#### **Cytowane prace**

1. Top 10 Best New Beat Making Software of 2026 \- Gitnux, [https://gitnux.org/best/new-beat-making-software/](https://gitnux.org/best/new-beat-making-software/)  
2. Concept Six Themes for REAPER DAW | PDF | Icon (Computing) | Mac Os \- Scribd, [https://www.scribd.com/document/542054412/CONCEPT-SIX-GUIDE](https://www.scribd.com/document/542054412/CONCEPT-SIX-GUIDE)  
3. The Design of Audio Mixing Software Displays to Support Critical Listening \- QMRO Home, [https://qmro.qmul.ac.uk/xmlui/bitstream/handle/123456789/44047/MYCROFT\_Josh\_PhD\_Final\_230718.pdf?isAllowed=y\&sequence=1](https://qmro.qmul.ac.uk/xmlui/bitstream/handle/123456789/44047/MYCROFT_Josh_PhD_Final_230718.pdf?isAllowed=y&sequence=1)  
4. My favourite productivity add-ons & tweaks for Live—What are yours? : r/ableton \- Reddit, [https://www.reddit.com/r/ableton/comments/sx1omk/my\_favourite\_productivity\_addons\_tweaks\_for/](https://www.reddit.com/r/ableton/comments/sx1omk/my_favourite_productivity_addons_tweaks_for/)  
5. UI Density — Skills Registry \- Truefoundry, [https://www.truefoundry.com/skills-registry/skill/dembrandt-dembrandt-skills-ui-density](https://www.truefoundry.com/skills-registry/skill/dembrandt-dembrandt-skills-ui-density)  
6. Data-Dense Dashboard — DESIGN.md | designmd.app, [https://designmd.app/library/data-dense-dashboard](https://designmd.app/library/data-dense-dashboard)  
7. The 8-Point Grid System: A Practical Guide \- Breakdance, [https://breakdance.com/the-8-point-grid-system-a-practical-guide/](https://breakdance.com/the-8-point-grid-system-a-practical-guide/)  
8. 8px Grid Spacing System Explained for Web Designers \- The Hangline, [https://www.thehangline.com/8px-grid-spacing-system-explained-for-web-designers/](https://www.thehangline.com/8px-grid-spacing-system-explained-for-web-designers/)  
9. Web Design Spacing and Sizing Best Practices \- Concept Fusion, [https://www.conceptfusion.co.uk/post/web-design-spacing-and-sizing-best-practices](https://www.conceptfusion.co.uk/post/web-design-spacing-and-sizing-best-practices)  
10. Types of grids: the evolution toward the 4-Point Grid System \- GammaUX, [https://www.gammaux.com/en/blog/types-of-grids-the-evolution-toward-the-4-point-grid-system/](https://www.gammaux.com/en/blog/types-of-grids-the-evolution-toward-the-4-point-grid-system/)  
11. Everything you should know about 8 point grid system in UX design, [https://uxplanet.org/everything-you-should-know-about-8-point-grid-system-in-ux-design-b69cb945b18d](https://uxplanet.org/everything-you-should-know-about-8-point-grid-system-in-ux-design-b69cb945b18d)  
12. Accessible tap targets \- web.dev, [https://web.dev/articles/accessible-tap-targets](https://web.dev/articles/accessible-tap-targets)  
13. 2x Grid \- Carbon Design System, [https://carbondesignsystem.com/elements/2x-grid/usage/](https://carbondesignsystem.com/elements/2x-grid/usage/)  
14. New to Reaper. How do I make the mixer tracks wider to utilize all my screen real estate? Making an 8 track specific template. Can't figure it out. Manual does not say much. \- Reddit, [https://www.reddit.com/r/Reaper/comments/2no7tf/new\_to\_reaper\_how\_do\_i\_make\_the\_mixer\_tracks/](https://www.reddit.com/r/Reaper/comments/2no7tf/new_to_reaper_how_do_i_make_the_mixer_tracks/)  
15. Auto-resize mixer width to single track : r/Reaper \- Reddit, [https://www.reddit.com/r/Reaper/comments/y5a5b2/autoresize\_mixer\_width\_to\_single\_track/](https://www.reddit.com/r/Reaper/comments/y5a5b2/autoresize_mixer_width_to_single_track/)  
16. How to customize size of BPM and Time Signature text. : r/Reaper \- Reddit, [https://www.reddit.com/r/Reaper/comments/18oq0s0/how\_to\_customize\_size\_of\_bpm\_and\_time\_signature/](https://www.reddit.com/r/Reaper/comments/18oq0s0/how_to_customize_size_of_bpm_and_time_signature/)  
17. MIL-STD-1472H UI/UX Guidelines \- KIWI Flight Systems, [https://docs.kiwidrone.com.ua/mil-std-1472h-uiux.html](https://docs.kiwidrone.com.ua/mil-std-1472h-uiux.html)  
18. Touch Targets on Touchscreens \- NN/G, [https://www.nngroup.com/articles/touch-target-size/](https://www.nngroup.com/articles/touch-target-size/)  
19. (PDF) Optimal Touchscreen Button Size and Button Spacing for Next Generation Fighter Aircrafts \- ResearchGate, [https://www.researchgate.net/publication/361339263\_Optimal\_Touchscreen\_Button\_Size\_and\_Button\_Spacing\_for\_Next\_Generation\_Fighter\_Aircrafts](https://www.researchgate.net/publication/361339263_Optimal_Touchscreen_Button_Size_and_Button_Spacing_for_Next_Generation_Fighter_Aircrafts)  
20. Understanding Success Criterion 2.5.5: Target Size (Enhanced) | WAI \- W3C, [https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced)  
21. Sizing | Design for Driving \- Google for Developers, [https://developers.google.com/cars/design/automotive-os/design-system/sizing](https://developers.google.com/cars/design/automotive-os/design-system/sizing)  
22. Sizing | Design for Driving \- Google for Developers, [https://developers.google.com/cars/design/android-auto/design-system/sizing](https://developers.google.com/cars/design/android-auto/design-system/sizing)  
23. Understanding the APCA Advanced Perceptual Contrast Algorithm \- Accessibility Checker, [https://www.accessibilitychecker.org/blog/apca-advanced-perceptual-contrast-algorithm/](https://www.accessibilitychecker.org/blog/apca-advanced-perceptual-contrast-algorithm/)  
24. Dark Mode: Color Palettes \+ Free Converter — UI Design Guide 2026 | PaletaColor Pro, [https://paletacolorpro.com/en/dark-mode-guide](https://paletacolorpro.com/en/dark-mode-guide)  
25. WCAG Color Contrast: AA vs AAA Explained in 60 Seconds (with Examples) \- Tooloogle, [https://www.tooloogle.com/blogs/wcag-color-contrast-aa-vs-aaa-explained-in-60-seconds](https://www.tooloogle.com/blogs/wcag-color-contrast-aa-vs-aaa-explained-in-60-seconds)  
26. Too much contrast: halation, overstimulation, and the APCA · Issue \#221 · w3c/wcag3 \- GitHub, [https://github.com/w3c/wcag3/issues/221](https://github.com/w3c/wcag3/issues/221)  
27. WCAG 3 and APCA | Dan Hollick \- Typefully, [https://typefully.com/DanHollick/wcag-3-and-apca-sle13GMW2Brp](https://typefully.com/DanHollick/wcag-3-and-apca-sle13GMW2Brp)  
28. WCAG 3.0 introduces a new contrast method \- Designsystemet, [https://designsystemet.no/en/best-practices/accessibility/contrast](https://designsystemet.no/en/best-practices/accessibility/contrast)  
29. Color Contrast Checker & Calculator | WCAG 2.2 \+ APCA \- InnoviCat Tools, [https://innovicat.com/tools/dev/color-contrast-checker/](https://innovicat.com/tools/dev/color-contrast-checker/)  
30. Bright Turquoise Color Palette Combinations (22 Picks) \- Media.io, [https://www.media.io/color-palette/bright-turquoise-color-palette.html](https://www.media.io/color-palette/bright-turquoise-color-palette.html)  
31. The Best 15 Ink Blue Color Palette Ideas for Video & Design \- Filmora \- Wondershare, [https://filmora.wondershare.com/video-creative-tips/ink-blue-color-palette.html](https://filmora.wondershare.com/video-creative-tips/ink-blue-color-palette.html)  
32. APCA and WCAG 3.0 \- Contrast tools, [https://contrast.tools/?tab=apca\&text=636b74\&background=fdf8ed](https://contrast.tools/?tab=apca&text=636b74&background=fdf8ed)  
33. Dark Mode UI: Principles & 5 Real Product Examples \- Eleken, [https://www.eleken.co/blog-posts/dark-mode-ui](https://www.eleken.co/blog-posts/dark-mode-ui)  
34. System Colors \- MA Lighting, [https://help.malighting.com/grandMA3/2.0/HTML/ws\_colors\_system.html](https://help.malighting.com/grandMA3/2.0/HTML/ws_colors_system.html)  
35. Clarify use of user interface colors in fixture sheets \- MA Lighting Forum, [https://forum.malighting.com/forum/thread/8190-clarify-use-of-user-interface-colors-in-fixture-sheets/](https://forum.malighting.com/forum/thread/8190-clarify-use-of-user-interface-colors-in-fixture-sheets/)  
36. [unknown\_url](http://docs.google.com/unknown_url)  
37. Old Versions \- REAPER, [https://www.reaper.fm/download-old.php](https://www.reaper.fm/download-old.php)  
38. Dashboard Design Patterns for Modern Web Apps 2026 \- Art of Styleframe, [https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/](https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/)  
39. CSS grid layout \- MDN Web Docs, [https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid\_layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout)  
40. A Complete CSS Flexbox Layout Guide, [https://css-tricks.com/snippets/css/a-guide-to-flexbox/](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)  
41. 10 Little-Known CSS Grid Tricks to Gain Ultimate Layout Flexibility | by CodeOrbit \- Medium, [https://medium.com/@theabhishek.040/10-little-known-css-grid-tricks-to-gain-ultimate-layout-flexibility-476209f226e7](https://medium.com/@theabhishek.040/10-little-known-css-grid-tricks-to-gain-ultimate-layout-flexibility-476209f226e7)  
42. Your customized Reaper \- Reddit, [https://www.reddit.com/r/Reaper/comments/1qhud31/your\_customized\_reaper/](https://www.reddit.com/r/Reaper/comments/1qhud31/your_customized_reaper/)  
43. How can I minimise dead space within a flex box? : r/css \- Reddit, [https://www.reddit.com/r/css/comments/1mqb1mw/how\_can\_i\_minimise\_dead\_space\_within\_a\_flex\_box/](https://www.reddit.com/r/css/comments/1mqb1mw/how_can_i_minimise_dead_space_within_a_flex_box/)  
44. How to prevent Flexbox item from filling parent \[duplicate\] \- Stack Overflow, [https://stackoverflow.com/questions/39312496/how-to-prevent-flexbox-item-from-filling-parent](https://stackoverflow.com/questions/39312496/how-to-prevent-flexbox-item-from-filling-parent)  
45. Preventing items in a css grid from stretching to fill space \- Stack Overflow, [https://stackoverflow.com/questions/62588122/preventing-items-in-a-css-grid-from-stretching-to-fill-space](https://stackoverflow.com/questions/62588122/preventing-items-in-a-css-grid-from-stretching-to-fill-space)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIkAAAAZCAYAAAAFQg2KAAAFY0lEQVR4Xu2Zd4glRRCHy+yZc5Yzo5gQc8CEoqAicmIO+MepKGIWRRBMiCCI6J0i4p2ohzkLillMiAEUA5izopgT5t9nTb/p6Z2ZnXe3s9we/cGPfdNdb6a3u7qqep5ZJpPJZDKZTGYisIi0s7SftErUvkxyDQtK20hrR21rSotF1wG+u6O0aNS2YfR5roeJeUCanHYkHCxdlDaOM32NdSnpSukb6WVppnSzdKm0onS/dFAwFttKX5iPZZr0kHS69Kq0cWSHI10vfSxdId0i3SedJt0e2c31MBH/ShulHRGrSd9Jt6Yd40wfY11felt6V9op6ZsifW3+zOAk60g/m0ebwOLSw+Z2sZNcLb0oLRC17Sv9ZhPISQiXv9joE3+n9Ld1n/g+6GOsC0mvSX9adXFjjrKqk5wqfSnNP7BwSCn/WHkfHONb6cSBRcl0myBOQuh+SrrM2if+COkC6VfrNvEQ5+k6Vrfq7hqNvsZ6jvn9SDVNLGG+84OT3FBcTxpYlDxjpZMwB9z7/LJ7wB42QZzkYukw6SxrnviVzRdnYes+8UDuPSRtLNhaesLqC7wm+hrr6+b3IwW0QXQKToIj8h1qi5UGFg7/29LRNSmM1HSAVSMPEYwCuQmi0nbSPubOhqOSCklxS0Z2bB7SHwUzG29y0b6q+T2YkzWKtqHZwvwfh7aJZ6L5x6HrxAMLda/5hMaQMp6WVkja2+hrrEwk92q6XwzOEBafv6Qbvkd6wdEulzYp+mPOtvIZ35s71nE2ehQ9Q/rc/HuPSg+aR73bpJ+sdNj1in7SGrafFu3Yc/279FjRNhRU3OxkCjxomvgDzQvFQJeJj8HLORUcWVzjIIRjTgtd6XOsm1u5gOzUYWCHhkI1iHqJaJdCTcPCxrYs7PKxUQ1bmdsSlWOnusu85tosaqP45hmcpIA66B4bLlpXOFc6Jrqum/jlzEN3fK7vMvEpwVEulJ61keF5NPocKyE6LFpwwmFhcaZKd1h5L3Z3Cou1p3na5DiM3Y0Vi5HwHgW7U5J2ogjt1EYxbEbamaPnbA4chMkl5MXUTfxM85c/MV0mvg6KNHYZ7waGYTzG+pb5/YhybbAAuxefN5Xmi/oC7F7udXJxzSKtW3YPIJK+af5Opi3t4IB1TsJGo533OSkzzPv2TjuG4QTpI+lD6f1CP5jf+BPphcLuncLug8IGe2wowrg+tLAbDYotvJqdym47utrdyniMlZMQtkS6Nhh7iBC8QKuLFtRhhPxZxTXp4qayu0I4VW2QdkQ0OQn1HO0vJe0w3bw+ed48VY8ZHP94aJrnY8if2HTZnYHgIKEGoaLn2BdqlNlhrMfKbucEwq5uek2+pVUXhKKQ4rOOz6RLis8U0TguKTflWOkva08JTU6yV9F+UtJOPURNwnP/sHIcY8I15g+lkGuC4xQ2d6cdDWxv9acYHIUK/fCkvSt9jJXTE4vLyYCFieEk84i0Q9SGk3BSSVMUIZ7FCVGGxWIcLNykYGS+wyngZ0RtdQQnedw8SgH3ecV8vOEozCbEYXjLHArw88xPXhyh5wg87z3zf/hHK8NUCm0c+bBBFF5tIRx4Hb1s2ljAJF1l/ntJV/ocK+BYRB5qGRaBl3aM8Ulpl9Lsf3ASFoFimc/sWIpQoiabI4CT8DaX4vsN6Vrz35O4PwVsWxSB4CScUqjNpklfmTt/2Hy7Wjkn1H1Ti3bmitRHeuYzvzVlxgh+7d3f/NiKc6Sv3iGecIpYjt9TbGQRyqkrRBU2zG7mNVlbHRITpxvGwb1m9xSWmUcJR2B+K8pkRrCWdKa5k1DDkboymQrHmxe215kXvhxtM5lMJpOZV/gPAeBwquOqDRMAAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAZCAYAAABzVH1EAAACcUlEQVR4Xu2VTUhVURSFt0lBkNagiSVNDIygSRBRYJkQpUXQoKJoULMiCyJrFJQUgtGgP7WiBg2CaBAFjXIS9AP9mGWIDgpRQiEVKgvCiFyrvU/se+57LwcNlO6CD+5d7+xzzr5nn/1EMmXK9N+pCGwBZ8ARMC/58/TQbNBubACHwRCo8IOmgy6Br5I8hZvguXuf8poJxsGbyD8IfoHKyJ+y4ka54WeRv8f8A5EfxHJcDtaDVeaVg01gURjkvIXOo+aDlaAOLBa9o0vBRklWxjJQC0qcl1NlohuOT4QJ0D8d+UFM4rXomLvgHLgGToieMOOPgXvgKBgALb8jVXtBv2h8o+gcp8AN8B2stuer4CT4BnYxsJDei07qdVl0kbbIj/UO/AQ7nXdbNBm/8UPgh+gJBfGZa3Dj4RRniDYaxm8zj7oDetx7TvHouRmWCcVJmRwXaQqD8oin8gEUO48JMJYlE8RE6a11HkuI3i3nUd2iH5ZJBV0RHftXsVZfgAfgumg5MHCfH5RDr8DLyLsoGjvLeTvMq3ZeqXlnnUe9BU8jj5UxqURisdYZyMtWSB2SbhTnRWPZEYNYJvTWOY8XmF6z8yje18eRF06ZTSGv+LXuS7IzPASP3Hs+dUo6kQuSTmS7eTXOm2tenEgXeBJ5raJjfbmlxFLgHVli71vBZ7Diz4jc4r3gBeTCfoHQKHwb3W3eZuctMM83BapX9KT9nOyIHDvHeSnxv4SbOS5aix9BVWJEWvyd3eWLwWd+bXaxT+aNgHrRFjxsHj8Q22oDGDVvTPRyM77PPDJoXjznfikg/sHxwq+RZAfKlClTpkz/XBPgkpSEILnD7gAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAZCAYAAABtnU33AAACqklEQVR4Xu2WWYiNYRzGHzu5sKWImJDiaqJEZIsLuwtLthlxQUhSuCRF7myJC4q40OSCC1u2gxJlSyFbSpYwst4gy/P4v5/zP68z3zlTc3P0/erXzDzne8/3/t91gIyMjIwKp4rWxmFgAZ1B+9D2dDhdRXv5hyqBAXQLvUF/0uOFH//lIv0VuZu29g9VAkPoIjqYfkXDBefoFXoVVui0gk8rlLSCz8OW/H9FWsHn0PiCq+gI2GroQNvQoXQU8luhFew8GElbhky0o4PoeDosZD3pJBSeG0nWw2Vlk1bwWbqMnqbX6Q5Yp9LYSd/D9vtCeoaupZfpE1pNT9GN9CD9QPuqIazY27C2R+k2upeup9/octh3HaNr6DO660/LRpBWsArdB5sRzcRWeh+lZ30+rNN3abOQDQzZF+RnpgV9AzsfPI/pDzrHZXWwon2BK+l32IyXjQo+EYeB/rS5+7s3rNP7XVaM6bDnlrqsa8gOuUw8oBeiTLP8HDYgCSpU7fu5TAOiTNulbFTwyTgMJLOToJnWC7SU0pgKe26yy7qEbLPLhFZMLspuwraQR1tF7f2VODtko11WkoYKVme1v2a6TCOue7veZcWYAuvIBJd1Ctkmlwkte933Hv1/cC3KtsPaa9AT1DdlY1xWEhWsQyRmCWwf1bisO+wFOojS0AkdF9w5ZHHB9+ilKLuFfwvWgRkXPCtkY12WihrrINAL/fUg1EFdS/4Fq2GDoGsnjbmwjvjV0S1kOnk9OqBUXHJWaBVpmd9xmdgDa9/RZcnh6LdOUSbSR/Ql/RR8TR/C7s4EnYI5ugF2Pbyj89znxTiC/HfKw3QdfRH+/kyf0nHhZ/Kc+rKYvnKZftfsaVC0vZRpO62AXU1vQ/aRHkAT0RY2glqemvWMjIyMjIwm4jftWqlJ9gYQngAAAABJRU5ErkJggg==>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAZCAYAAABtnU33AAADD0lEQVR4Xu2WWahNURjHP/P0gHsjGW+mB7ldRJlyEUnGF0SuFA9XpiIkpBQepIyR4UGERPEm1DUUyZgyhW5kyDxHJP7/vrXu/s4629HJyz21fvXr3v3fa++z19prfWuLRCKRSIFSB46F6+FU2CHzdA3t4Gy4AvYOzhUMbeEZuBIOgbvgN9GOW/rCK3AuHAAPweMZLQqETfAN7O+OG8Kf8D1s4huBatjJHBMOQEWQ1Xo2wN+SPHhj+AN+gU1d1t61GeSOPRys7UFW66kLu5njgaKd45T1sA1nwQNJZgIH457oMvgbJXAwnACbw0ai15eLziTSQHQgeZ/6LiOcXX3gSNElRDjwY2BH38hkrC95w47fgJdFH9ayWnQgfsHN8CScn9Eim62iS4PXzYSn4VJ4AT6CvUTvswbuhx9gF14o2tmboteyVnA27RF9Ds5A1hLe6wRcAp9InrNtB7wNX8HS4JyHbfgA9CUcnnk6lemi7Xlv7gakh8u4bPybqSf62/wNy0PRQbZF9Ihop20HF4jWHr7xvBgBP8NVQc41fh2OghdFH5g/yumZi4mibStN1splB0xG7sOqIONbfio6IB52lNd3NRkHhNm/nicV3yG+CdJPdGq2dsdc04vgd9GHzMV40Xtxn/cUu2ydychdeDbIOMhXg4xLhdf7OkCmuGyoyVJZCOcF2T7Ri/khQnbDvcnpGrj22K4oPGEYJ9pmtMlaumytyQin/bkguyZaUyysIbyeBc8zyWXDTJZFiWgjyg8QT5XL5rhjFoy0DpeJfqTY6hrCCh12mAOU1uE78HyQ+SJq2SLZHZ7sspx1hdvEY3jQZM3gW6cvKOXwnSQV1LNRsotMyDTRB+Eb8LRxGQfSwgLFznHJEK5bTvNbJiM7Ra9vYTJfHO3SSaW76H66DS6Gl0TXJbcMywz4FR6Dy+EpeFiSj5M0jsJPRrZfBp+5YxbHatFCyb++3XM4C74wGf/n2+OgcPtixm8DLkduTa9d9lF0SeaE2wW3Ila6zsE5Cz8e+HB8az2Dc5FIJBKJ/Ad/AIKwuFGqOgGwAAAAAElFTkSuQmCC>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAZCAYAAABzVH1EAAACXElEQVR4Xu2WS0hVURiFfzMDodJBSGQUQiEEQUSQPTQLgl7TEsUGNYuiJtXEQS8cFA3UUCuCbBYNpBoIDZpVkKhlIjYIxOgBvdAkCE1qrf59YLG9XhOaXDwffHDvOnufe/brP9csJSVlXrEanoLb4GJYBg/Bw9ooF9gJf0e+hxXaKBeohu9gN3wIG+BybZArVMGOOMxFKm3uAymEG+FuuCVkK+F+uCppJFmpZGQZ3Az3wTUwD66De2CxtFsP98Ilks3IdvgAtsDHsNd8cNngIF6an6f7sAnegufgBDwOz5rf9wx8C1v/9nSOwBHz/hfM73EJ3oE/4dbw+SY8D3/AOnbMBmf0G9wUvpfDT+ZnZTbewClYK9k988Hog5+Ek+YrlMDPHAgfPFnFBfCjef+DISOdcEi+Z4TbhCVYuQ1/mS97NrgqLBT5knEAfEDty4Ey2yEZtxCzu5KRQfPV4qASbpi3nTON5h2Pxhci+mBPlF0z77tIspqQVUu2NGRXJSMD8FmUtds/DOSJ+cPoDFw073hCskzwPD2PsmbzvgWScZsw4zsrgQeY2WXJSL/5MynJKrMoZIQX+PJ7DRdKft28I9/22Xhh0wfCohEPhP8UmO2SrChk8UBewadR1mbeVid7GlfMy2AC9y6rzCPJMsFzwQPIH9YfSCZBy2h9yA5ItiJkWhQIJ5UrrfdkRWRb/oWaEb7FWXY7zMsn92gXLJE2MSzPrC7fg/zM2WYVGw3ZF/OtyRL8OWRj5mX1NPwasnHzw83+wyGjH0IW3/OYzcJa81q9Ib6QkpKSkvI/+QOgf44vSaBEAAAAAABJRU5ErkJggg==>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEwAAAAZCAYAAACb1MhvAAADNElEQVR4Xu2XWchNURTHl5kyJVGmPHgwvhij8FFkevFgVj6UiHgwvCAkMj0YMqYkL5LxwVSGEkqZh4wlQySUIWXI8P+39vYtyzn3u+dBupxf/XL9zz7nO2fds9feVyQnJycn57+mNZzgQ0NvuCQ4xB1Loxk8AAfDzrAT7Ag7BBtVDC0N2sEV8BL8Bg//evgna+AuOA6uhV/hCVjbDkpgAPxewNEVQ0uD7nAS7AI/SXLByuBVWN9k60QfeJXJkpgh+mVsgxvhetFzz8DjsErF0NIjrWALRIuzxWR9QvbUZEmwQF1dxml4ETZ1ecmRVrBu8AIcbrImogV7bLIkBsJaLtsb8jTqiPY7TueeIWsBh8JWcZDJmpuMNIY9RPtsG9G3uD0cBBuaceyn7K31TJaJtIIlwRtlwfgGZaEc7vChg8ViC+D1D4r2zO1wEfwMp8N58BCcK/qlcbpHJsJHoudzgeI1lsKd8CPsFT6zTSyGH+BYnpiVLAU7B9+JLhrFwjfnheg3WwwPRBeXMSbbI1o0W6CZ8IvoGxfhZxaMBYpvZVX4XPT8ESEj++Ft8/+iYcGO+DCBKfA97O8PVMJUeN+HBeBbxh5ZzWQsFAvBqRZhQZn1NRmnHrPdJiO3RN8+Fi+yVXRsZliwoz509IPPRPtaVu6KTo9iuSy6OFg2iD5cTZONClmZybiiM+N2yHIDnnfZZvlDBeNU4h9sa7JZ5nMhOC14U6v9gQJwO8LFxhK3MzVMxunFjF9mhI2c2UqTkWvwrMviW5t5i8OCHfNhoCU8Ff6N8Kb9A3E/Zx8mEqfNQn+gAFfk9+tzkfEFGxky2yIahMwX7Lpo/7VsEh1rp2ml8AbYDLmhrO6OsR9w7t+EJ+Fp0XFslPvMuHLRP8wVzbNM9NhsfyAF9i1enw9oH4R7QV7Hbg/Gh2yYyfiTjJldHMgd0TfXXpP3y7F1TZYK9ypsxOxLXPUoV7J7ot8SiQ+b5PIwhnC5fgKnmSwyX3T8ZH8gAf5m5WoW74ef+fZw1XwTsleivyK4tXgZsrei24U58HXIuDixyfP8hyGjfN6kaybd+1+BPYUbX9usc3JycnJycv4JfgByN84xJT0gIQAAAABJRU5ErkJggg==>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAAAWCAYAAACbiSE3AAADVUlEQVR4Xu2WR4hUQRRFrxEFE6JgZgwoiAEVFAWZURBMCzELghHBvDGgGHFlwIhZEReKKIguDCtzwJxRMaGIARXMiPnefv87r2u6e3rQxSB94TC/b1X9X/Pq1asCcsopp5xy+mtVJ+PJUjKF1E1uTqsCMoq0JZVIGzKG5Ls+qbSY9A/N0qDm5DyZTMaRm+Qj6ec7pdFC8ivgFDIHsxesn4Jf6nSMjHC/a5Pv5FP0nEkLYMG7QHaQCaSC7xBIGXgfpTQYZclX8pPUc/4R2ITHOi+V5pGRoZlBm8lslNJgSOvIAVI+8DTh0c5LpbnIPhg9yEbSEcUHozJpDxvTOfIakD6kUdzJefWdJ9UinUhv0oyUIS1JT1LD9WsN27ZVnVdESnttleK2yRxYMdxDTpKDpGFSD1MVWHs1ZBcMBeIqrN8+spJsIfNhmTyRzCD7yXTyhKxNjDSpqD+GjVdd0zsWke3kC+kSPW+CbXWVhJTSaugl+nhxmkUuwVZCGkjewlbAaw1slaRsghFL9eUHGea83bCA+H9eJ+A3WKbE0rO+o38+ziaVheew8YMiT9rrnv9I6XIH1lgxaEulOkhOO+kReQD7sNSVbCtsLlEwlB1PSTnnKQgar/SPpWDJy3ee5iVvl/OkW7CsiecnafsmSTXjENmK5I9nkvZiqNOwSTSB3T2Ok5quvSTBuEwuBp6yTOP9Yg2JvALnaUvKW+Y86QY5E3jrg9+JIGj/x1Jx6eZ+h9Lp85KsCPwTsEm0Iu1gqyCUMQ9hY9T+Ovrd2IallLbgucBbBRvvj3ClvDw/X2W5PP8/SddgdyEvv+USRWamN2BHoGpALBVTn5otYB8La8td8hnp7xsDkH1mXEHRYKxG0WAMjrzuztOdJlUwrsOy10unZ0K6dX4gR2H3i2OwNHoHy45YWlkVqTznHUZy0eoAm4AKazoNhfWZGjYE0la9DZu8398bYON9rRoeeX2dp8yVl7TqsJqojPPvTCyoznMdoRoUoiquPR9rJ+y2qWMylorjWbKcLCEvor/+zhKrKblH3pD3sGCn2yZ6r6q++gk9a9V1uui0kqdtNgl2vL6KPL1TR+Y0FH5HC61tqvFa0PidzyIvfuc/kYqoLkbat3nJTTnllNN/pN/Y6dOakkI79gAAAABJRU5ErkJggg==>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFYAAAAZCAYAAACrWNlOAAAEEUlEQVR4Xu2YaciUVRTHT7tRqClZUelbQVlpBoqErUQpRplLUmalRFBmtJfkhzYs+tDmQllUCEUERl/EFsx8KwttMREsso0WAyvbvxRk/X+ce5sz952ZZqQvI88PfrwzZ+7zzPOcufec+7xmFRUVFRUVuwA9clYZTFwqL5BHyv3kyfJ6OTQOasFIeauca42PeV7OkGPkCXJE8nh5eBjXNRwr75Pvyx1yZf3H//K6/LvwUbl3HNSEOXKVnCYnynfkDeHzfvIv63v+7NLa0O5hrLxcjpZ/WPPE9sq35TrzhJ5f92lzjpYfyt1CbJD8OX0GzMxv5JPyEblYLpTPym/lgWlc19Iqsa+Zl4pOuUT+IPsX8Y1yeno9Vd4cPgN+iBXyzCLelbRK7GrbucSOMl/OL8tDU+wY+Z3Vks2M7UmvM9fKe4pYSY88xXz1DJD7yJPk6VYrUXuZ94PT5J4plqHunyHPTe8HyrPNa3xeYZx3vPnYnaZVYl+VV8tX5Htykdy3bkRzmO0k9xd5m/nxp9aNqGe43GR9E1FCyfjJ/Nyzzes4DfJN+Zk80fwHvVs+bV5+juJA83OvNb9nVhRNmxVyi/xSLpcTzO+bc75lvsr24OBOaZVYEkoNZAZwUQ/Jj6zvTGsEM+kDqzUjmtcRdSPq4QavKYNNoNRwzs1Wm2XHpdjvVlslJIRVQn+IPGHetGODZAJx/AarnZNZTOzCPKgTSOyLZTBBo9k9vB9m/kXLQqwRHENDes58u/a1+XHMioPCuAxJ4UZzQv6LyebnuyrEaHbEngkx+FiuKWIPm49llWSo/cSuCLFDUuyOEGsbEvtSGUzErg7MXL7oqyJecpP5MsrHU1efMj/2sTwoQIzl3S6TzM+V6yQMTrF7QwxYYb1F7EHzsfuHGNtCYtTWDJOA2J0h1jbNEstFU59yFweWFjOL+tSKLeYPFyVvmNfRks/lu2WwBeeZ3zD748wBKVY2P8oF+/HIA+ZjY7+YkmI0skxeBXeFWNuQWIp9yZXmG/jLQiwvDRpGhP0wszlDwW+U2Ous77H5nOxA2oUdQZlY9smNEst+mh80Qq8oE8v2r0zskBSjEXYEyfjT/IvLbsyFcrMxYTeaJ5vtTma2+ZfTEDK3y/VWf+G8piOXjYAb4XiaV7tcbH5MXE0Hpxj1M/Kp+bXEXvG4+dj4EHJRilG/M4el2P0h1pJz5CfmTzi/JreZL2H2cBn2lb3mNYbEbZczw+cwzrw58Qib4SboxD/KJXKB+ePz/DAmw36Ti2dr1A78fyFfM9Ig58mt6f1v8gt5Vvqbx3GvPHHSQBlDjPvhfx8vyO/DWBog15rzw3h+oP8Vnumptyw7ZnEn0OWpXciv3wgaHOdn2VVUVFRUVFRUdDn/APoS81ttv+v3AAAAAElFTkSuQmCC>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFMAAAAWCAYAAAC8J6DfAAACA0lEQVR4Xu2XO0hcURCGJz5BiBAwIj5YJBCCRlSMgqKkSYogprAIMb5QU1mJ2PioIjYiiOIrWMRSjSAiplAhEGKKpNXGB4KFBAs7qwj6j3PP7t3Bu4tV8Oz54CvuP7PFDueecy6Rw+FwOBz/kXo4DV/CMlgCn8Niz/RI6w2ZsAkOwCJVS3hG4FWA/2BBpJXewmPYAV/DI/jCV094VuAGnINTcBJOkAxq0NdXCs/hE++ZVzIPfDzc4aAdmKSyGrjpy1PgCVwKdxA9hKOw3JcFUagDRR5M1uF9pEE98574G+b6Ml6VvAp74AMYorv9+UX4XocelfA7zNAFG1iA7SrrIhnmJ/gNfoFnsNvfFIM0uAZbVF4Ff8AslVtBBTwl+fN+ZkiGuU+R092s1nemKQ78u3XY6j3zIH/Cx+EOy+DXcV6H4CvJ4IZU/hf+UVkszECHSfbq7OiyPeTDS5J9UcP3UB7mB5UfevldVtcreAF7dcEm2kgGw5d4TR9JrVHlB16eo/IgauEvksONr2R6b7aGzySDqdMF8Iyk9lHlvL/ukZzw8TCDNKs4lWT7MHuoVfAexgPjQ+g2tkku94anJP1vfFkQ1XT7qc0DXYbNKr/3bJEMx3zhaPhV3oWrcIxkVfZHdQQzCx/p0IM/CPjLi++31hAi+d6OBb/O3NNJcmA5HA5HonANKRBZr2QI9c0AAAAASUVORK5CYII=>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHoAAAAWCAYAAAAPb4jFAAACV0lEQVR4Xu2YS0hVURSGl6lpA60caBpWw6KHkOUgKDRIqEbOigaJQQ8oTBxqAxEjNHqBYBEUFY4Sm1QGVtBDLAqCiqhmFUFTHRWk/Yt1zr3b5T73nGNYQeuDD/Xf+yL433v2chMZhmEYhmEY/xSr4H4dOmyFXYG71FoUVXAY7oQb4Xq4Dq4NLMtuNeaTNfAUfAmn4O2ZyxlOw+twHzwHf8JRWOxu8rADTudwT3arMZ/UwRZYC7+Tv+h6+AqWOtl5kqJ6nczHUZI30SXYDy+QvPYRvAfzsluNP0VU0Z0kpQ442bYg++JkPrjYTSrjx/ULWKFyzUK4XIeKlTow4okqejN8BpucrJyk6E9O5qMRFqnsZpDHsRQ+JjnLfRyEF3VoxBNVtI/dJEXzJzYNzfCKDnNQDcfhBpUfgtfgApUbCUhT9FM4QTLMJWUR/EYyeadhBXwOa4KfD8MbMD+zw0gFF31Hhx74kTkJt+uFGLigjzpMSFj2SThIVvJvwUXf1aGiAX4lObfT8h7e0mEKukneYHP53YZDXNH8yH0NVztZq/N9LvgTyWd6n15ISBvJ45rP7DHKPsaNOcBFj+gwgP/AD4KvIYUk07gL/z/OuWYvSdEn9EICjtPMM5lv23hG0AOakQAu5wfJRUaBWlsC38I38D58SLLvHRxy9jWTlHnZyUJ6SNba9UIMx+BVmj1dV8InlH6w+2/hO2sekPjc5Sma5cn4A1wc7AlL8snDUcgW+BkecbKQDpL9B/RCDvhC5SzNLjlkGTyjQ+PvUkJy4cK3XYZhGIZhRPMLv011uPymGswAAAAASUVORK5CYII=>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIwAAAAWCAYAAAASPXQbAAADJElEQVR4Xu2ZWahOURTHl3kqIkPmy4N5eDCU6UU8kJIpboYrLzJkTvEghfImQ4ZCSkl4kUyZLiFj5IGilCFF5vJAGf7/9tm+fdZ3zrmO+3GV9atffXftvc93u3vdvffaR8QwDMMwDMMw/kPKYIUORsyEk2FX2AQOg0tgp7BTBn3hSrhAksccgeVwIOwH+0T2hh2DfkYN0xNuhLfhN3g83vyTi/C7cgesH3ZKYR48AyfBMfAGXBq0N4Rfpfj53p2FrkZNMxjOgQPgZ0lPmEp4FV4TlyjjY63pdIP3Ya0g1gK+j9oIV5LncA/cDrfCzfAAfAFbRf2Mf4yshDkvbsvKywz4GjZV8btwSvR5IlwRtBEm2DE4UsWT6KIDivawjg4a1ScrYc7J7yVMf3HbyilxE0e6w1dSSCKuMGXRZ88iuEHF0jgIp+lgxCB4ATbWDUb1yUqYs3A+PA1vwS2wUaxHOlydmDQf4Cpx40fEesTpAe/BurohBZ6jjopbzUK43V6CLVXcKBFZCcNE4RmjnriJ3AQfSPHKkEQDeEcKh1geerO2EW5FC3WwCvgdHMdqjjBZLoudf/4oTJgTOhjBA2rt4OfO4iZ/XxBLgmN4kOW2wbL8mbhxT2CboJ+nl7hqzW9fefBJsw5ega3jzUapYcKc1MGIsMohXGk48U9VXLNc3OT58Ty37BU3dpfvFMDYOx3MwSj4CS7TDUbpSUuYceLKYF/VEFYdXAlYAWXxUArbRAjPFjynaB7Dmzr4iwwXV/q3E3cRWBFvNkoNE4bVjGauuIu1WUGsrbhVghdyIbzP4erjYfmclDCLpXisfyYrsrz4ZPFnFv4OhyX5u40SwD/wF3H/+bo64UUbJzFMBC75TCJOlGe2uAnfHcTWwOsSr6j4mQfSqUGMjBY3nueQPAyR5GqIv+8hOF3FjWowFj4Sd6P6MfKluK2kWdCP9yKVcK24hHgjxRMxVNyhlq8CPDz08mb4LdwG14t7DbE66OPh+ykmzH7dUAV8fnMdjGDy83v1xaHxF+A7H55n+D6Iq04eWPVMiOyg2jw8GPP5Vt0YhmEYhpHGD4XwmufAcXGJAAAAAElFTkSuQmCC>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF0AAAAWCAYAAACi7pBsAAABvUlEQVR4Xu2XyytFURTGl/eriFAor4EyFiWGJqRMKOVVJspA8hcoEzMlZUIZChPJK28hA8aKmYFSlJQB5fGt9jnXPivnnNvNQM761W9wv727g+/su+86RIqiKIqi/CqVcECGDn2wE1bDHNgER2G5vUmJj1o4CS/hB1z3Lsc4gp/CWZhub1LiowEOwjr4Sv6lH8IzeE6m7A7PqpIwQaXvk7l+EqFKBoIymCLDqBBU+h4lXvoi7JahQz08gNlyISoElb4Lh+E2vIDTMMuzwx++91dhr8j5ajuGhSKPFEGlc9nzMA2mwil4RfGf/gy4RmYKYrjwE1gU2xFRuPQNGTrUwGTrcwWZCWbBysJwi5+Ap7DYuxxNuPRNGTokic984rn0W5GH0QJf4JhciCp+pbfDJ9hlZTxt8Fz/YGVhNJMZO0vhCvm/iEUKLn1LhmAIvsN+Kyshc9J3rCwIt3D3DudfyjJ93/GRhEt4IzNN8B+lTQGZkZH3uPD1wA+CywyjkX6eUvj7lmCPyP89bfAG3sFnx3t4DfOsfSNk3krH4Rx8pPjL4jfYfBk68AOegblyQTFkkrnfW8mcfkVRFOVv8AW/mVDaKgSjUQAAAABJRU5ErkJggg==>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAAWCAYAAAB3/EQhAAAAwElEQVR4Xu3VqwoCQRSA4eMFL4gIFi0Gg9Vs0hewWK2CmAQFi8UoWAWLj2AyWWyi6Hv4IP7DbJlNW51zfvjCcpiynNkVsSzLsvQ0wg0T5FMzFTWxwwszlMKxjmpY44NV8qyuMubiX4LbCLcZ6ipgiicOaIdjHblvwAVf8VuhoiqW4td/g3o4jrMGtnhjgUo4jrMW9niIv+vuzkdfB0fcMUYuHMfbAFcM0wPLijf3D+9l1E3ORFMf54xOKPpj1t/2A4UOGoMRKH2yAAAAAElFTkSuQmCC>

[image14]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF4AAAAZCAYAAAC4j5m6AAADMklEQVR4Xu2YWahNURjHP7NknkMkxKWEooSUoYQHSYZMUaQ8EF6IF7MQD6ZkuInMJM+S2YNSpITMD1IyE5n+/7617117dfbe66q9ObV+9eue9a11zv722mvaVyQQCAQCgUDu9IOr4CTYyKlzmQLXusECKadcE2kAL8JKOBJuhOftBg4d4Ft43K0ogHLKNZNDcL9V5o39hC2smM1p0fp/cTPllGsq8+FvWGHFxotO41LMgKvhF/G/ma5uwKEjrOMGS1BEroVxFr4zn5vB1ladSzt4CdaXmt3MMTjVDRoGio7arHWa5JlrDzgMToCNRb8/Go6Q+KBoLjqQOhnbw1qws/lM21S1TuEFvA/XiU7j2/A6bGs3MjB5dhTxuZkI3vw50RFoMwhelvQOtMkz16Pwo+iMOmPKy+At+Bj2Nu0mij7Q76btYdF9540pc2CsN20TYcJs/APOMzE+PV74LqxtYoSnh01W2edmbJgcN8GZpsxOvyqeo0OKyZUdzWsstGJN4DPRh97Qik8TbTvLlE/B5aI5ZdJH9MvfJD6dFpj4OFNuKfqU7Qv73oxN1Plr4DUpPVKTKCLX6Ld4VLXZZeJznDg3+feiD6wyXpUORxt/8IET55LA+E5TroRDqmoV35txGQU/wyVuRQZF5MqZVKrjJ5v4VifOfeke/Cq69nvD6fkB3nHi00UvtMeUH4pOtyei691TU//JlDntfBgquibzbM2pOTtenUoRuSZ1PJcuxrc4cc6qK6KzcLNTlwlPHC+dWHRs45MuRSvRep9RFBF1erSm14MnpXrN9yHvXJM6foOJ93Xie0XX+MXwFxwTr05nuOgLBje7iCPwpiRvFDwyMREe73wYLKVPL+z8E6Kj1oe8c4063v73QnfR2WK/HfeE2+ANK3YBvoZdrFgmS0WnITc9Th2OzF6xFtXwYq9Epz19LunTl+yW5DfLunAHbOpWJJBnrlHH7xN94z0o2um8FvMkK0SPnfw97h18CJQxymPlI9PWC46MuXCsJI+e/4W8crWXGp7AKqSGm2bg74iOk/3dikB+DBB9C2XHr4Td4tWBvNgOD4iu7/y7KF4dCAQCZcUff6D1TcDy68cAAAAASUVORK5CYII=>

[image15]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAZCAYAAABdEVzWAAACLklEQVR4Xu2WTUhVURSFl6SVhKWGSGVRZKhYCCJBkzKCgoKaFTkJahjYyAgcOdJqlBOhFKVGDUJDiECQILFRUBr9EllRhGBIRT/Q31rs8/Tcc+99zt4b+BZ8PN46+52779n7nPOAggoqCMWklXSRE2RdZDRPKiLXySDZT06TN2S3H5QPnSHXAu8IeUZKAj+n6idjgVdO/pGqwM+pzsGSuERWO0/lHF+IiKuMtJCDsJKvIM3kGNnsxUnbyBayyY3pGZVkA6l2/sqFaE8aeA9L7iW5QCadn6YD5CnsN4/JXdJNLpPv7lO9K43AelaxP8gu0uG+/4XNo+QTtZ18hQWLIbLGD0iQVmmePCfrPb8dNsdZz9MqPYIlsYrsJK9gK5mqCjIBe4vzsDfWxHdgD8+mT7AV8aXy6PdvA7+efCNXyT3SGBlN0CisDBntIA9gk5/0/CR9QDwxKVPmtYF/yvk9gR9TDazOYcNqV34hvYEfKi2xJ+Q34gf1cTJHPiP+zIi0O/4gOWiYdIZmoKTEtEo/ya3Ar4NVYiOZIfexRKvoWLiCxV0kbYX1iDZFNimxj1h8Mc3RR36RPc5T42ulXpBDztsLK+lFRJ8bkVZNb/IadleqfNPksB+UIiX2kNyEJTQFK2OTGy8ls7C20K6/4fwh2EaQ/w62kxOlrBtIG+zQDJs2TX4pVaJaLFGeXEnHxe3QzKd0oB6FlUOl002Quc7yqn2wPhlw6G9TtiusoOWp/wxccULbNG+RAAAAAElFTkSuQmCC>

[image16]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAAZCAYAAACCXybJAAADIklEQVR4Xu2WWahPURTGP3PJnDImhMwPlClxDWWKJ/OLeCJKJPKgSIQoKfMsYyTJnCQZnigkQl3KkKJEMiR8X+ts/3W2/7n3Surf7Xz1q3O+s86w9l577QPkypUrVzVUezIjNp06knlkNRkXXQuqScaTVWQBaZW+XBrqRtaQ2+QHOZu+/FvDyHMynwwnV8ixVARQl5yAPWMIWUxekoE+qBTUj8wifclXFE+6FnlBFjmvGfmIdGXMJm9Ifedpxp+Q2s4rKWUlPYH8JH0i/zq57M7vkNPuXBoJu3dw5JeMspLeCPvwDpGvBHWPZrEJLGZ/KsIGSv6yyA9qTvqTsaQTqUG6k9GwZwb1ImNIQ+cF6Z6hZC4ZBIurl4qoQFlJH4J9eNyUjid+C9I5Od6eigB6JP7WyA+aCesVillBTpGVsMH7AktCxzvIcvKJTNeNibTM7sOW2QiyE/YsDWaVlJX0RRSS81Ijk69mqGZVLDldkx83Pa+2sBgl2S7xtAu8Jt/IpMSTTpKH7lyNVQMVpFkvx18mfS42qQuwj2oZ+SHpLmRAcrwtFVFI+nDke4WlcTTyH8CqQAMQpEpSbJCWjXYdLUHtKtpBusKab5WkpM/HJnUQ9qI2ka/tSb5KTOtRxyovr56JvynyvRrBYtZHvsr2ZuSpknzSTcm1xBPaUfR/UGVlJb0W9kDNmtcl2BpTSTUg3/FnGWtN6t4lke+l5qQYvcfrLmyH8NoMi9U7Jc2sKkFb71JyL7lellyvVEpapRyrDPagUZH/CLbGgq6SW+5cmgq7t3fkezVG8aSVwI3I2wKLDSW/G9bAgrSTlMOaYqWqA2saKpX4R0LrQ6WmdROkdfwZtg8HTYHNfGvnHYANRkVSvBLRLHppUPWn6Nf0LlisKkvaR86gEKMKeEomJudFpf1Rf0yvyIcE/VU9hs1AkLrqM7KHLIQ9eJq7HqTtRt1VXVW9QGtSazZL+st7B3uv1qMalxqSZit8j75Nnt75PvHekjmwpNVb9pIN5AhZh0L5/7NUAdqatIXEe7aXuvxkWKwq6H/Kb6Nxo82VK1euXNVCvwAdz7sVMDDWqAAAAABJRU5ErkJggg==>

[image17]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAaCAYAAABYQRdDAAABEUlEQVR4Xu2TzSqFURSG36JDOWLEBYgUExEzAzfgAowMmJpIzsTMZThGMqX8pVyJ/zIwIfkbCc9u7bJbJx3tzUCdp5769np3q/3tb31Si3/JDJ7jJZ7G5zM8SjflsosfOOuDEm7xEdt9kMuQ7JT7PihhQdZ02QclbMmaTvighBt8wDYf5DIoO+WeDyK9WPHFZizKmq74ILKDfb7YjG1Z0ykfwCge+OJPCPP5pMb57MBjnHP1EVzHNX1zLWOyU/pfchxP8Bm7knoYvTp24yHOJ5mm8QJfZE1f8Qqv8Q7f8Q034/7AMN5jNa7DgTq/4jxW1fhGxSzhRrIewMlknUWPbBLCCIaPVJPd7a/QL5uMFn/MJxvZMY9IrvEXAAAAAElFTkSuQmCC>

[image18]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEYAAAAZCAYAAACM9limAAACuElEQVR4Xu2X2atNURzHv+YhSpmnDFE8IGUshReUeJIH8qAoGQqhpPAiKbzIUETKg8yElCnJ8IB/wBAZyoM5JWX4fvutfc/eP/vcs+49p+7B/tSnzv79Vnvv+1t7/da6QEFBQUHBP0lrupj294kcOtCLdJBP1DPd6CZ6m3Z0uTyW0pP0Hf1Fx2fTueyAjR3pE/VIH9gL36ELaZtsuiyr6Gy6C3GFmUC/4i8ozFC6n96kc2mrbDqajahcGC2hW3Qn6rgwo+gxeplOd7nmEFOYbXQB3YDKhdEXPAn2NQ6hXegUOod2TY1TsTW5A2H9LelbfWH36E0HhFijTKbn6Sk6zuWqoVJhxtLT4XdMYdbRN7Bx1+gl2DNO0C90fhg3LOTfh7GvQlzjdf2NXg+xskyl3+kSn6gBjRWmLWyp9gvXMYURmjiNO45szztDf9DRqdhwWMEOh+sV9Bzt3DCiArrBIXqVznS5akgKo+bq0S6nrTwhtjAjYONWu7i+FsWPuviiENf976IJRUmj9bgb1gznwc4h1ZAUZqKL64+/4GKxhdEk5hWmV4g/dHFxBJab5RNNpTvdCquwZrVdJhtPucIspy/oc/os+Ak29iW93zDyT8oVpkeIP3BxsQ/Wb+7BlnDVqOuvhRVoJeIOd2mSwmgnqcQeVPfFqAUorjNUGu146jHqc+ql27Pp6mgPa87axvU7li2wl53hEzkcgI0d4xOOpDA3UHqXTvQRfY3Stt0TVqQPsAkWm+lP2HbfIlyhT+hH2BLRzvAY9mIezehT2NjPKH3y5UgKo91FfWovfUvPwpaTmIbS/XSi1r8oQs/Ru+id9Nsv8b+a9FLS5qAzS7Ll1xR9jnpYjDpttjTJdr3GJ2qNDkQHI1V3r0lXbyaD6XpYYXTazTs4/pcsg51JdBjVTqOJKigoqE9+A0qEonhUlDoKAAAAAElFTkSuQmCC>

[image19]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEUAAAAaCAYAAADhVZELAAADBklEQVR4Xu2XWahNYRTH/2ZCJOHFAyIhJcKDkKRIGUoyPBjiehCReY5kKArxItODFCnKlCEPMr1IhsxTGTOPEeH/b3332medc+7Z95x7Lzf7V7/yrW+fbe9vr+9b6wIJCQkJCZVKP3qPPqB3wr/v0mPRi/4xGtLxdD0dS2umTpfQgy6ki2gXNxeLg/QXHeInCqAPPUqH0epuLl/awT7cZtqLbqfnaZ3oRWQWvU6H01H0Np2ackUMntMPyL7q+dKELqXn6ERaO3W6TOi3l+jZSEzP+4iujcTawz5wt0hsAP0GW9RY6ELd5LCfKEfq05n0Ip0RxmWlL+w5N7j4fvqEVgtjbSt94Cha0J+wrRSLSbD/TClX0SjNJ8MWRxmkTIpLEew517j4zhDvGMaXYdnj0UKd8sFs7EZ6ulU0Neho2FZQ6rdInc6IzoZMmbIvxPuHsbLm1p/pEl7SGz6Yjcf0HexBKxultV5Kz+APS09r+p3ucvGbsEUZGcY6OzK9/ItgTtrCbnjITwQao7DDMRv16DTYNpoNK7NxWE3f06ZhPJi+hb2DDlPxFbZQHi3IUx/MhPa3bjjHTwQO0GY+WACN6AJ6gU6hdVOnYzGXXoE922K6F/YOqjpCWaeey/MK9ruc7IHdUI2OpxM94oN50pyuomdgZ0l5btXTsJaiVhgr+/w2UWXStlLflBPd7CPS+xPt7+N0jIvrhF9JlyDetmpJN9GTsFQvLpv5ou2zMTJuAHv+FZHYMlj5jWahDnJ9fG3ZUlHrqwt9S98VVro+IbWfUOlWB6n9rxVXq10aPWGdcm8/UQBXYdVFqEteR68htbS3gS3U0EhsAiwBslY5PeR9+hm2KF/oQ1htfw1b5R90R7heaL++gX0ZoQXN5zwolHGwrNPhfALWk2R60YH0GV0Oyy79aVDcx5Qb85CeUX8LVZ4RtIOfcOgDDoItUNzqViam022RsVK0e2ScCZ05KvlxbBV+U6VQKVUlUgnXITsfuVe/M90a0y1IP+yrDCqtuTrPhISEhP+a35nFnz8rVITNAAAAAElFTkSuQmCC>

[image20]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEYAAAAZCAYAAACM9limAAAC9klEQVR4Xu2XWahNURjH/+Z5SOYhQxQPSJkeDJcXMjx48UAebiKRMZQh8oDIgyFS5CYvImPkBTdkKqSQJzKXF2NKyvD/963lrLM659rnnMs9XftXv+7Z31p3n72+vda31gFSUlJSUuodY+km55SoLRfN6DnaO26oK8bTC3QGbRi1FcsOeoTOpjvpd3qRNg87RWyjP+mguKEu6UA30ht0Lm2a3VwQFfQ+bRvEdsEGvT2IhYykX1CGifG0oivobbrcXRfKetgA9wexcS72Koh5tISuwGZZ2SbGo4edD0uQZpJmVFJGwP5PS9PTGTboF0HMs5nOoqvx58R0paPpVNqXtqZj6HTaJuin5+9He9EeyNStbrB7dKE9XawoGsEe+jpsGeimxaCBaNC7o/gwesJ9TpKYlfQNrJ9q1nm6hh6jn+lM16+/a3/n+vqZqv66/kovuVhJqOYch32B3kahKLGfkD3oxrSadnfXSRIjhsP6HYW9OM9JWJEfEsQGwBJ2yF0voqdpy989iqQFXQJbGquQPV2ToiWph5sYxdfRyuA6aWIGwvoti+KaLYofjuJzXFz31+ZSUlLa0bX0Fl2AmrfZmpgAm/qqOyEa/NkoljQxmgW5EuPr2N0oLqpgbZPjhqSoKG2l12C1JZyqhTKYPoC9Yc9S93chfU6f0afOj7CHfwl7IfnIl5iOLn4niot9sHpzE7aEE6PqvQdWsKbRBtnNBaP7XXZ/PU1gSzIf+v5SZswkF18cxfWCVWM0a7/BXnwitP2dgZ01aoP29BF9CKv81fQqfYzMDpQLnXs0sKFxQ4RPjBLvD6Kqhffoa2TqYCdYkt7DtnWxgf6A7ZL/HJ1L9OC53BL08+iNPqEfYDuXn/L58InR7qI6tZe+padgy0lUIHM/najnubi+RxuBlq0+j3LxekG4lPTbTmcWv+XXKpqO+rIk6rRZ1/jtWj9Z/io6EB1IqKp7QVW9lukDO08pMTrtxseA/xadqaroQdhOoxeVkpJSnvwCZ7Wt5KTju+oAAAAASUVORK5CYII=>

[image21]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEUAAAAaCAYAAADhVZELAAADEElEQVR4Xu2XWahNURjH/+Z5yANSlERCSoQnSlGkDEWGPJhuioiQKVPJ8OCB8mBMmeKFMiWeRJQikXnMmDGzEv5/39r37r3OPuPd93Kzf/Wrs761zj7rrPWtYQMpKSkpKdXKIHqPPqB33Oe79GS40T9IXTqYrqIDae1o9R/60aV0Ge3l1RXEEfqLjvArKoE6e4KOQnynS6UjbBL1ZwfQ43R+pIWVr9PRdDy9TWdFWhTAC/oBNgNJ0oquoOfpVFo/Wl00zek1OsmV69Hv9HJ5C6ArbIL7hGJDYO26hGI5UUM95JhfkSBN6Dx6kc515VLYR58gOnnKijGh8kbYBIfRZPyEZVdBTIcNip+CVUEDWgYbHGWQMqkY3tHD7nM72jhUF3CFPvKDsIE64wezsReZ6VbV1KET6Dm6gbaNVsfSCdZP9Xc/3UYf052w5wU8pbdC5YBX9IYfzIbS8T2iD64ulNaHYH1QFuViLGxQvtJuLtYINghbgkawvSPuz7905qUz7IeO+hWOlqj85hiH/sxs2DJaQJtFq2OZCevraS9+gH5DxVLU55sV1eVoQJ75wTi0vvVDC/0Kh9Zvaz9YCVrQJfQCnUEbRqtzos1Ufd3qxbe7eLDZKut05/J5Ta/6wTi0NvVAXXR8esDuAEnQhq6lZ2F7SSlLVXue+rrJi2tvUXycKyv7/GVSC7asdG/Ki+4nH5F5P9H6PkUnevHudA1djsKWVXu6GZbyw2GdKxV9V+m/x4trYrVkOrjyStjxG85CbeQaOC3ZnOjqq4b+lb437Oj6hOh9Qke3dnqtf4345FBdHP1hN2XdOpNC9wwNjJah0GQ+pOuDBrBTShM9MhSbAkuArKecOnmffoYNyhfYg3W2v4GN8g+6y7UXuiW+pU1dWQNazH6QFHpdOEgvwd579K62G5kb9VD6nK6m62DtlOWJsgiZGfU36UmnwbI6G5rAYbAB8gctEebQHaGyUrRvqByH9hwd+YWol7wah9awTiId4dpkFyP/6Gs2dTIUoi5f/mZfY9DRmu/mmZKSkvJf8xtOYZ6jUnGALQAAAABJRU5ErkJggg==>

[image22]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAbCAYAAABIpm7EAAAAzElEQVR4Xu3QLw+BURTH8eNvMDY2wcY0ZDTFBM10EwTBiDRB9RZskqAIJgiaF6HYBNMFb8D4Pu7F2dNsis1v+4T7O/c823NF/vnp+FBDSp0LqCDwvKSzxAIXVLHCEBOcEXtfFSlhhCxuOCJuZ2Hbde35kTYyaNphWc2c3uk6qvt84ZmpmH/wqq4nZiGnulcOWLu6LXau7pGkmC8NVJfAVcxr+TFTM2mIWcirrm67Ilroq5mMsYdHdVGcsMEcQTWTCEK6sHEeIO0u//l67mJwI5PxqupnAAAAAElFTkSuQmCC>

[image23]: <data:image/png;base64,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>

[image24]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAZCAYAAADXPsWXAAAA+0lEQVR4Xu2Su2oCYRCFT8QmWHkB01hZiYXEQvIYKcROawlW1nkOQazEwoCWtjZ5A1OkCHhJo4IELdRO9AyzsOuwazqr/eBr5hyGZfYHQu5CiU7piq7pki7ojP7SCW3QmNO/SY+eacHMy858bOa+/EC/xI8v6KKcDbw8QUsfNiBRuqMnmjLZFRXokroNyDs0a9rA0oIWX2icJmmRdug3rbnVYKS4hR636zikc/pKI27VnzSC7/EMzfo2sLShxbwNHOSPSZ6xgRf5tRv6YANShS4Y2cBLFloamPkjfaNH+kkT17Eil5dnvYcuOUCfuMzEP+gLlUX/HjUkJIgL3RU4G0Yx2W0AAAAASUVORK5CYII=>

[image25]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAZCAYAAAB3oa15AAACJklEQVR4Xu2WT0hVQRjFj2QWYhRFJCJaVEgtQg3dRJtACFcSUgRiFARBC1u0KVqpmFFSqxZR5kKIIHUhqRsX5sJNLd1YZH9ALBDtD0VB5fn45uncz3ffGwl6GvfAj/fmfHPfzLkzd+4DEiVK9N9pNzljzRidIu3WzIUOkE7ygvwmT6PltCoh8+SxLeRCteQcOUx+ICxAH/mFNRLAV0iAJtJKvmEdBthFxkgBwgLsJ0dJAymCXl9HjpENXr9tZA8pdRSTPFLmvgs7l3pnULYAMuEa9z0kwCPyhfwh/a59mTwnr8lB1+8E9Mb8dH17ySYy59oLpMP1zahMARrJDa8dEkAkE5ZJXPS8LeQteU82e/5paN9m135CrkBXI0gSYMia1HboHfIHCw1wATqpSuPfdf5Z4z8gn6DBe6Kl7JIAw9aE/tAR44UGOI/0AU46v8v4hWSSfIc+G6tSXICX0CWfhu7dN9DBv7q2LH2c4gLIlhT/lvFllcehc7lpalklF41YM412QAf/mxW47vxDxr8HfQYuQV+sx6PleG2EngLPSL6pWcmxJoMP2EIapQL4fzv2QVdv0PMqyG0y4Xmj5CMp97wVqodukRny2fGBTJGtXr+UZIBZLPd9h7AtdB/6Bn8InXwblm/UVehxK78nz5aEEcQT5Dh95fr+c/lbSM52+e+16oczl0odo1W2sB5UDX2rSoBrZG+0vPZ1h3RD9798tkTLiRLlVIuLtIfwwrQp4wAAAABJRU5ErkJggg==>

[image26]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAaCAYAAAC+aNwHAAABFUlEQVR4Xu2SvUoDQRRGL/EpNAZLbbUR7QKCNkoaK61jq7VdGgsfwZ9C8acRRNCQMnkA2xRBxUK0UkEIYgQ9w52V691dsbARcuAU8313h53ZFenz50zjFd7jA97F9S22cRcnv6Z/4Bg/cCquB3AEj/Ad52OeyzU+iz5oGRPduOXybwyLDp35AsqiXccXliXRoTVfwLZot+gLy5bo0LjJhvAAn7Bq8kzC6/XwAut4ia94iINmLpPk/KcmCxe5j484avJMliX7/HMxX3d5ih3RwQmXr8a85vIUN6Lfv+DyE9ENwka5hPOFoXNfQFO0W4nrPSwmZfi3w82HS+rii+i/P5sMwAK+YQM3cNN0v6aEFZzxRZ9/zyfRLTyAaqhwqAAAAABJRU5ErkJggg==>

[image27]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC8AAAAZCAYAAAChBHccAAACmUlEQVR4Xu2WWahNYRTH/6bIPEQp6iqFUhQJqWseMzygvLjxYHpQokxFKVNJPHoQL8Z3s7olJRmiUAhXMj+QUmb+/9b+9ln7u+dsd/Mgtf/16/Sttc7+1vnOWuvbQKlSpf5r1ZGG2PgbdSTLyVYym3TLulMNJzvIMjIs8gX1JZvJWjKetM14q2gI2UVukB/kVNadq8nkHFlBJpDL5BkZ6mLakGNkH5lCVpPvydprPSxuAZlLXsOe19kHxRpFlpIR5DOKJX+L3EXltCeSn+RsGgHMI1/IKme7BIsbk6x7wg7uSBoBbIPFbHS2XBVN/hrsFOuSdUi+MQRQsxLbQWcLydcnayWvvR+lEZXktzhbroom34n0c+tNsA3VA14DUalffX4kz0nrNMLqvatbn4c9a5Cz5apo8l4zyFtyGNbE1dQFVtcvyaTIF9QKVv/6gWsiX67+JHkldJE8JtdJ96w7lZpaQ+EDWRz5gsbCmlTNegDW7C2Wkj8dGwtI9amN58QOp/6kiZxE7UnSHtb0N8ngyFdTSv5MbCwglcs3WD3nzWjNe9XzytjhNBUWcyJ21FKR5NVcO2GbeD2FbTotWU8n22HlFbQEFnMlWet09yDbnANgMcrJf7emFOhntFdv2NQIaoA9/L6ztYPNdNl1+UlPkvWiEAS7jf2pHkrWqvOg+sT2CtbEuQobawZX+8uVxFdUZrqu+E+wRgwaDdvwqrMdJ7dJH2fTAel+0B0g6RnvYRdm0AbYs3Y7WzPNJA/JC9gkEGq6B8i+pxwld5BtsvnkHqyGNeObyAXSw8WoDxphp7wONirfoPk71F7YwendRgm/I/vRglP/G2kyjIP9kF6Rz0tTZiEZiezl5KUxq39DfdQh8pUqVarUP9AvzsCQW9zZe0YAAAAASUVORK5CYII=>

[image28]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC8AAAAZCAYAAAChBHccAAACfElEQVR4Xu2W3YtOURTGHxlFiZLPJpOvxI1CKeXCGNOIUkRRyoRcKZK4cCnizl+giJlEMuQzkY8kNTdIvocScaPI1xCex9qbfda7x7wvF5M6v/rV2evsM7PO3uus/QIlJSX/NePoah/shUl0K90De3Zg8fZPttEFdCQdHq4V80ygG+guusjdyzKV7qad9Bs9Vbz9R5bRi7QV9gJv6DM6MZnTj353fqLrkjmiEfbsRjoP9ncPF2ZkmEXX0Jn0M6pPfgh9CXv5yBJYcjeTmPhAr9JLsB2aXryN/vQ53ZLEhtF3qKESakl+DizRe0lsEH0f4iqnSFdynWMx7JkZLn6NXnCxHqklea28tnaHi9+FJaL6jTxOrnPshT0z3sVPwHKqc/EstSSfQy/0ld5y8ad0E2wVdW994S5wCJb8GBc/EuKjXDzLvya/E/bPVrn4R7o2XKuWr9CT+L2i55BPUh+s4ul31SNK/rQPVsk0WJLqOp4pbqyPUEm1hvHZMB4dJwRi8pNdPIuSP+ODVaDtfoLK9hdRu0xphiV1IIwPhnH9rxnG0RDXbvXK3ySvOr9BlyYxXY8N1yql1yh+wOrjSkrJCbXPXHmch3Uv//JZlLy2MMcIFNufGECP0yYX1z/VSSraYf06LZ0VsGS3h/HcMG6JEwJqw8dcLIsS6YZ9TLnW1EW/wH5CCK2GtluHi1qmvAw7oLTSER3zWtmInuuAHXCxHHRI3Ya1zIjqXN/Q/CRWwUL6kL6gb4Ov6AM6NJnXRu/QwWEc6zbn9TBHKLH9sB3SSqss78NO9JQGWEvdRzfTR3RlOqEvURmpXHQy5368Ce34bLoclT2/pKSkpA/4AS48kkz4HvQ9AAAAAElFTkSuQmCC>

[image29]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAAZCAYAAACRiGY9AAACm0lEQVR4Xu2VR4gUURCGfyNmVw8GTAMGWAMYQBDxIpizIOLiQcSAIHjx4EH0YEJFTIhZBBVBMIE3EfQoZi9eFEGMoJjFrP9PVe+8qR3ZHTzt0j98zNT/qt/r6n6vGsiVK1cuoC2pimZj1WzyhfwhJ8JYo1Z38glNrCjpGZpgUU9RT1E9yBgynfQkfcl40jpNojqR+WQ5GRXGCmQsmQGbQ+pGRpPJZJh7OuAjyQTYmlJvMoV09bicCrC5dW0zNKCo1eQ57PAdJ4dhh3F3kjOLPIYVpMmvktOkvY8fIl9hc6gIaSl54t4m93RTd927QHaRI2Q9+UwWeV6mduQoeUk2knXkLHmPeoqStJgWugF7EufJVh8bQX6SiR5LegsvyP7Eq0FpUVIf97KiMj0kv8iCxDvjfqp95C1K32KBfEMDihoIW3xDHKAukg+kRfC3wa7p57HabSyqi3uxKL0tbaF0ThWg3MzTNv4Ne1NRH1FBUcviAGxxEbUWds0cj2d6rPOR6V9F3SY3g7cXltvS40kex2uliopaEgdg5+JNNGGL6Zp5Hk/zWL+ZtG3K3dgtcj14OsPKbeWxHpbiLbUZRVVU1OI4QJ2E7f+Owb9GXqHYLLTtNIcaSaYh7m1OPOkO6ha1B6VF6S1/hzWkKBV1KppRagaacEUcoPrDtt+axNNDULdbFbwfsIaRaQds3vRc6Mw8IPdJ88Q/AMvtnHjbYV1RDSfTQthZu5x4daQu9w7WDLTN1IGGl2TYQgfJFXKJPCJzSzJMarn3YDejNj8VdqNC3XKc/2otof/6JmrN7B5ek5Uw6QHs9LFj5BxsK6tQzalcfWf/S5pgEIpbpJx0IwNg3xhpKKyTtanNqFwdSDXs4y0NJr2SOFeuXLly4S/7pJ93FcGSDwAAAABJRU5ErkJggg==>

[image30]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAWCAYAAACCAs+RAAAC90lEQVR4Xu2WWaiNURiGX3MyZB4ixzwr4cLskKFw3CEy37ghMkRJighFiCLFVsgcisxKpISEC4UMIbkgZFa87/n2Otb+9r+3zsmd/dRT+//W+te/xm9toECBAv8VRXQeHUBr0zZ0Ap0aV8pDHTqTbqRTaNXM4gxq0YU+GNGWzqFr6BhXJhTbRofQnrQH7R4Kh9Jfzpe0b6iQh470MazxgXQXvU5rRHXq06X0Av1KP0VlMerHM9ikDqOX6MGMGsBqZPdVllJMX9Ab9CRdRpuFwjxUp7fptSim1VBn1kexJnQubBavIHkgVWB9WBTFGtCPdHoUO0JP0e10K91CN4fCwTQVHspBMWw2yhpKcxS2opVcXJxF8kDGwdrq5eJXYSsZ0KRVjp5F//BjECo2kNmwj69z8VQ63s3FRa6BbIK9o/MZox3yDX/OXUlUJurCdlIp2tsnYMt0kd6CDe5vTELyihxOx4e7uMg1kH2wd5q7eGirqYsHUoi2Xj/6lvZJP3eib2BnJR/KMD/oHhd/APv4RBcXuQaieFKHddgV7+Liojd9BTurpdSEpeCY3fQnbe/inrX0PW2Ufh5L38E+PjJUilCHP/sgOQN7xyeZMBBlR88ButMHPSHNzfIFCSyhd+lxupwegr3bOa6URgP54oNkL+ydFi6uLKW4MlhMS9hEz4+Dygw3kZkNVsIa0OVUXi7T17SaL0DugShhJG2hc7Ct6DPgNFj9sktTFZQqta/jG1l5WhV12wcaI3uraWspSQT0z0C5f1UUi9FAdCl6imHfG+Xi6tcxFxM7YPUzkpIur9HRcz36HPbRmCeww906it2DTYTQim6g95G9FQJare+wAcfoQlRbSsMBnQutXlL2032igejAl6EDprSboitgDZ6G3cgx+2GdjDsxA3ZhLabn6R1kH9iG9CFsIj6kVULQbMcr0Io+hf3NWUAfwVJ8EvqWBtLOF4gOdDLsz1h5UMYaT7v6ggqg7a3rQO35OyWmiI7wwQIF/jG/AcQHr1tq5TXyAAAAAElFTkSuQmCC>

[image31]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAWCAYAAACCAs+RAAADLUlEQVR4Xu2WWahOURiGX3NkSiHjUYhC5jlOyRAiw4UpnOJCGTKkyFTkhpQxUyIyXBAXlOFGRBmLCKGTC2MyhMzD+55vrfOvvfY+B+XO/9RTew3/+tdae33f2kCePHn+K4bTLbSQdqIdaHvazlkt1zWTWnQMXUUH0irJZjSmR+lQ2gXp8evluqIJnU6X0M5BfUgFOpKuoQtoXd+wmv4sw6+0me+YgSZxHjZGT9hi7tI6QZ9BSI8bOt7160av0Jm0Nz1Ij7k2T3V6xjmEzqNPfeNheoJuo5vpRrqBPoTtTHnso5OiurV0V1CeRa/RHbA378c/R0/BdlgU0wL37NHCJgdlze89grdA9vuHC7Ri0CD60NMZ9TEPkF7sKHo7KGvi2u0QvcmrtKErN4W9nb6lPYz1sMULHdkv9EauuYTZ/mFEWEtq08uws/07dPbf0alB3V66PCgPRjrOdApU79GGvaT3aS9XVwN2TPu7chvYYi+5sqcoKpeyB8mJlYcm8xn2BzomOjI6blXDThFFdHdcSVbAxvkOG+ckgt0mjVx7/EYUUym60icofyIx45ALXE1iTrI5gYL1OSxzZbEVubHUb0CyuSRuH0V1iu0Uh+jOuLIclK7vwNKvdtlPYnHYKWAG7PhkoaC+DstGF2HjKCYKgz66KrRZyoSiOWxxCRRw3+jcuKEMtLsvYH/s0fNj+gN2J8TcQzqliu70NW3gyoqZ+fQT7Dchw2DZTMlI2XFhshmYAtsFrfpPmIiM3YAdB42jtxSi3VO90nOMTkGYsj0rYb8JL80YxVaC7bAf9YsbHPVpq6CsNJu1EPEK6VQ6ATb+sqheKM1mLaQj/Ugru7Li8Tjsa8JzNnguQfeJ/kgBn0Ux7KZv4co16Rs61ndwKJ0rs8QJw39B6LMiRnGgxbeM6tfBEoBnEyxG2rryaPo212zo2tcfxYN5DtBbsAV49D30DLYJi2B3iPJ866CPRxenxp8WNzh0tD/QI7BkoRhQ8tF94tFdcpMuhS1QMZo6QQXIZYO/QZddD9hEdJz8MYjRcdAOxm8qRN9o+vBU/OnDMgslGQW8LspKUVuePP+SX5ifrtcv/mNZAAAAAElFTkSuQmCC>

[image32]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAADMUlEQVR4Xu2XWahOURTHl5kHlMxkLKEklCLlEhElicLLvYYUmZKS4YUi04MXngwRSWTMmNwb8kBe8GDMmOlBmYdM//9Ze99vn/V959xz732i869ffWvts9fZ++y199qfSK5cuXL94+oByq0zUC+wEGwAE01bmlaA8aA9aOt+02eVJX5rMB9sAYtBp3hzTK3ADLAK9PfOfmAjuAl+g9O+wWgUeAqWgNHgEjgUe6K0GoA/hm9gbviQZIvfB1wHi8A8cAd8ApPDh5wmgcdgFhgLHvmGoWA2GAK+S+kJNwIvwPLA1wZ8lPSM8PoCroBKsAkMijdnjl9l7HbgJ/jsfnsNBO9Ab2ePFP3QRUqaML8WOww2/qvgovGVEr90mrLEbwh+iGZh5+onNBPY12dMY/BM4tnREmwO7GolTXibaNCexn9StA9fkqbqdEpQ1vg7RMcXvo8+9mWWUlxd2ktFt1N30QwqqaQJHxANYg+Iw87fwfitnogOgKt1S3T/hapP/Buiae1Teo5on3XgDNgD3oIFrj2mpAmfl9IvZtrQz4MvTV9FB0Jxb14Gp6SwUnWNz8OI7TsDn1/x+6CZ8/lVLxInzK9idU60Q0fj9wPi6ZmmvsYuF+1X4ey6xOe+vAuOgqaB32fFmsBHvTZ2JE74rHVC+0WDdDH+I87PVUsT91IovzL7nF3b+MwMjnOXFO/P7aJ9Zhr/Q2NHSpowSwmD2NS6IFoS7IRCrRfdQ7xUeLHOMh4nRNU2PifKPl4DROs4xdLGWFMKzZEeGDsSJ8z0sioTDTLO+H1KhWI9bxLYB0XraZjW00XjrXZ2mbOzxF8rxbc03qSmut98D2PZi81LY0eDZJ3jgWLLDNPmtmj58OK+4mE0JvBViL4sPER4RQxXg6t1ArySQqpmjc/TnR+vUrT+VoFr4L3oKnuxGoSHL2NxXJEmiC43v8AHxxvRU473Vq9uouVlN1gmuid4Tw01HDwXvet6cTJ7wXHRFeWWuSeaCaFqit9CtPxw4JZfoHnh0ejw47XzGNgqOreVQXtmceWHgWlSXDNrEv80MJVHSHxwoeoT34qZxMORF5Kupi1Xrv9BfwFFN99yKMDK/wAAAABJRU5ErkJggg==>

[image33]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAADKklEQVR4Xu2WWchNURTHlzHJFA+mkjkiZR7TRyJEkukrRZ4oEYkHlEz5XiQviIRQMpUyhpDIA4lknucoZSbT/3/X2vfss8+9554XD1/df/1qr7X3WXetffckUlZZZZVVzdUWzAidRTQVrA6dKeoPloJloGfQ59QezAVrwdigz6kmGAfWgAWgZbw7r6KxuoJ14Cr4A476nUXUCnwA+8KOIloEboGJoBLcE03G1zDwFMwHw8FZScavCw6I5jgULAYvwUB/kJSI1Q/MAr3BD8lW8EHwW5IJFVIX8Bf08XwjRX+rs9m1wAvRiXFqCj5JfMXNBm9Bfc/Hf/o+qG12WqyEshQ8HawEXyVbwevBx8DHf4qricubGi86Kb3yI1QXwWnPvgaOeDY1QvTbIWanxUqoVMHNwXnRhLMWfF10eYXiJJyx9gbRJNtF3TmxOObEf6+J6JidsRFaGP3LzU6LlVCpgllgX2tnLZh77G7ohN6B29beI5pkeADtNz8nupO1t8RGiHQz/yaz02IllFbwJFDl2VkLZkxXmC/uRUKdlKgwX4xPPw9WHkx+YU7so9/lkhYrISZ3LHSKbnou5XqeL2vB38Gd0Cla7CtrnxBNskXUnZMrmIfbAGtvjo2ICt5rdlqshFjw8dAJ7QCDA1/Wgnli8hQN9R7csPZu0SRbR9058QqinxPe0dpbYyNEupt/o9lpsRIqVjAT5sHzGDwCT0SDfja7Mj8yqSsSLV2nGhL/rSqJlq6vU+CL6PgG4JckJ3mQ6LdLzE6LlRCT4JIopWYS3ze+eJ/X8ewVoleQvx243Pj9PLMrzB7lBpi4FQ559jlw2bOpaaLf9jC7wuxCsWJikj/BBYku8WJyCR8O/DPNv83zdRC99Cd4Pj503ki0z/hYuCl6pThx334TvWed+JzlP86XntMu0YlwSouV0xjRJcsDhHcj4RLk86+xG+SJM8xk3dhnEi1pLq/nYI7ZTqPBa9EHC5+xD0WvE19tRLfKdrAQPJDCW2WV6KnPZyP36yXQKDYie6z/Ku5BTi6Lbxj0OXFl8fqZLMl71BdXxhTRsf728ZU1VlllVVf9A1Kx3kgNhEn2AAAAAElFTkSuQmCC>

[image34]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAAD10lEQVR4Xu2WaaxOVxSG3xpbCRKqap6aoiFUS0xxESKGqDRFLlHUEHOlIWJIhB9mQWL4YYqUlJilpRXRG8EP0v4pQhFjmhpCTDHE9L7fOvvYZ9/vuFf8It+bPMm3117fPntYa+0N5JRTTjm946pLBodGTzXIcDKdfBn0FUc1yQQymlQN+pwqkHwyjXwR9EkVYf9fCBurWrI7Vn0yjswhPf2OxmQe+Ys8J7/5nZ6+JsfJWNKG/EJ2JTxer7nkCOlDvieXyIcJD6A3uUCGkq7kPOy7Tp+TY2Q8GUlOkPuwMX11go3/I+lMDpItrrMV+YF8RR4jfcGaSJ3Apg0YFNiyaRg5iVcLnElekG9iD6AZuUUaRO08mM+S2AMoQDICq5Cn5EH0WypJrpJJzomqRO557VhpC1Yo6uPtAvtSsiKwhWpCnsDC0EmhqpD8OGqXIpfhnQJVnizAq9QpARtHUVjdOcFOT3NTqkmKErVbxB6mw0E7o7QF62M3yVnSOrKVI6dJB+eUIoWVJtCclCG1kt0Z6XTlM5F8AIsknVSolbD5aYN8m/6rKJV0CGrXiz1Me4J2RmkLllwYPiPLyO+wXCpKP8P+J9/dsA/rNN3GSQp5+cwme8l6cp2M8XzSpLRSWLuQ3gQbKyxmW4N2Rq9bsLQKNpi4BisIRekUzH+DZ9OpK6dcvrpT+peUjWzu1PtF7WxSYZPPGs/2R2QLbwE/XWJpwdrhbFJx+pt0I0dhgyqn8nynLLoB823v2RpFNuWxpN1Xe0bsYfofdoLZpBxXSu2ApYqTIk9jferZpNQF7wuNVEtym3wStZXTP5FH5IxzSpGqsybgFxpXBNUnqfCpPSD2MJ2L7C5cnZTDmudaFM71jbD/6M3ga1vQzihtwathg4dSzmlwlf00/YrCPpqMbDohSVeI2t/GHiYVyWynpbnM99pNYXevJLv+o/eFr/1BOyMtWCERSpUv24KVZw+RrJq6z0t77VGwCXzm2RpGNuWu5ELcXS1O/8GiQJXbaRaZ4rUlvcq+i353hI2l1PPlNjeWJqmcPITkAqQ8JB8FTothhcxpCOxjfhGpDMvFyZ5tBLmLZGE5gGTB1KtKY3X3bHpdqdj9Cbt/C2D15A7slCWF+D+wQ3LSWDqYjHrAQke7qUkIVWBVTL1bnfQcfEC2k6mwENkMu4+d2pIrSD4yJIWbrqLlsBy7QHolPCxs9VTcSRbB5qPvOH0Eu360CSG6Kv1nam1ykayD1RrVgnyvv9jSBnSBFRe9oN5EmnB/MhDJTfKl0NVVo0eECtvbSFGqN39fFL6Tc8rpfdBLEJDhKYiz2oEAAAAASUVORK5CYII=>

[image35]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAADVElEQVR4Xu2WWehNURTGl3koZJ7Fi3kqwwNJyIPhwSwhEiJTIqIoU5EnmQv9I6IMDxIl/M1zhCTKnCSZKTJ9X2tvd511z/27XhTdr351zrf32WedvddZe4sUVFBBBf2jqgamgtVgJqifbE7VSLDcmyWoHZgHpoEmro3aC0aBzqA9aBtoAxqbflEdwSIwDFR2bV6JWJuDS2AGmAxugQ9gUOyQogbgNdjjG3KIk3kUDAX9RN8327RXBN/AjxxsynSVCuAEKAJ9wEpw0LR7ZcVaDMbFG6g2+Ao+hus07RMNMJ8P5oTeBqWMVwO8CW0UV/Ip2Ao2gLVgDdgFnkkyju2hXxQ/nrFUN55VItbS4Av4LjoTUcdFZ3ai8aLGgKXgk+T3wez/ElR1/nUwPFwPAXNNG8UJ4sr1Nh4zkHG1Mt5A0dROU2qsnNFDoGw0gseBJxiPqgtOgvKS/wd3EB3rCGgYvBbghWQmgSvcNFxHsZascN4B0cygWHdqmTavP4r1smha+5TmQ13C9W8HMYoZ8xYsAFdAj0SPpFqCG5JcBOoJuCM6EUzta+AcqGM7BeUda1/R4LY4n9VwlbkvcRAnFhoGF4sQi1azRI+kmMrTnceP4rNciEnBY9rvBzdFf8+ovGOtIjqDHISpEMUiw/RgNY3KOYgTA+Evsls0EK4SA38kmnZerUVrSkz/KG5PfO4zKGP8KcEfEO7zjpXpc1i0AtoBqSLQ3Xmpg6RoDjgrmSrN/3abaJCbYycjetxGvPh78Zm7zmdhor8+3BdJnrHyQ20a8KDQK1zfE12RB+A+eCj6Eu7XvOeBIZcY4FhvQqdE/1Mvjsca4sVMeSfZz4wWjSXu1SXF+ktLwHxrQAtFUzBNNUUHyZo1qBMoZ+65/aR98CzRw4gVT3gc95jzo/hbcL+2ilvVCOdHZcXKB96LbuCspsWilY8Vlaucpnqig3CbsBoffFvwFoOLoJLxeH1G9MhnFQtmrpNTT9FDRFfj7QQXJHmwsUrEyhez6tHwcGD740edB89F04s8lkxKdxMtSlPDPcVU3AhegXWiZ9qrohnkxX+P797hG4xYE5iqy8Bp0cXhNpYmH+tfFavu4EAj1xbFVeLJKW1fteKq8VDUX3KvbEEF/e/6CUxX3usYe6lVAAAAAElFTkSuQmCC>

[image36]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAADf0lEQVR4Xu2WaciOWRjHL/syQ5bINo1930ea0eT1wZJspSyvUrYPiBDhtX0gaRBDGFu9kSVRShFSJJEUX8jeGyJkkHXMaPj/7+uc57nu8z73/VIk9fzqV8+5znnOfZ373GcRyZMnT57vlHJwMFwBC+FP8eoMDeFCOBv2gRVjtWXzg+h/06gpmsMC2D6oI+XhELgczhLNKReJuTaCJ+Ai2BtuhW9FH2qZB/fCEXAYfATPwB9toxzUhvNFn/EPfB2vjjEUlsDxsB+8DXuY+srwADwsmutceB/+ZtqQpFwj/oRP4K+uzE7/g89gNRerA/+Hu12ZLIUfYJGJ5aI+nA4L4GlJHnAX+BS2cGW2Z/9rMy1EJosmX93EONM3JTuDablGrHKFsa5cFf4LX0m2Y3byTvSNe3wnS0ysLI5J7gEz2btwn4nVgCthNxO7CA+ZMukrmsfvrpyWawTXRKtsnfQSreQnYeGa4PryHBdt18bEyiJpwJxd9jVTdD/5GVaItRCpJdpmRxDv7uKLTSwp11Jw4Jfgedg0XpWBCXGNMHFuGp9D0oAniibEmTgCi+FjONW0YW5ss8XESAcX/yuIk9Rc+Ycrog/qFNR5OPtc/FxHfHA4C2WRNOBNoknfgFVczM/6SFfmxpRrYO1c3C4H8sm5ck28lPgnEsKkjoquqbZBXRoc8JswCPaLJs2TwvIQXnC/uamyzeZsdYQf8J4g7rG5JnJWtJNc56Cnv+R+s2lwwDzyQjaK9jUmiN9y8Xqwpfu9LdZCpKOLrw/iFp9rxAw4LVsXwY2BDXgRIZzF1RLfoJqJtuGOyB31U0ga8BzRvoYHcR43jDcQPe/fS+kX7DdZrlWSlmu0MfEH5QXEc9LFprhysSvbDaPAxfjZcXPw/AIrmbKFA+blI4RJsq9JQfyB6L7i+z8Fz2VqldGi/+3symm5Rt/3HYl//7z+/e1s7GI88J/Dnr6R6O2JnfxhYuNcbLuJWfgiecbnup3xJsYblKe1aF8DTWyU6KZnJ2en6IvwpOUawY6vwQ2i906+weuwq2/gWCN6U+L9lIPkTWydxGeXn9c9yX4ZpK7op1kCXzj5Xz5zgGnHz/YyPCj6SXJ2i0y9Zxm8KroUd4nuN/bMJUm5ZmDSPIoKYXNbEcDDf5DoJsAb2ZeGefAOPQE2CeosfDk8rnhUJS2fr51rnjzfmo8Wl95i4l7R0gAAAABJRU5ErkJggg==>

[image37]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAADX0lEQVR4Xu2WWahNURjH/2YepMgs04OQIWPhBRkKSTJHF0ldGUqiKJlLPBCJDMlUMpUhQ7hXxngRHpR5Kk/mITL9/7619l1nnX3Pve6TbudXvzprOHvtb+9vfWsDefLkyVMJqEVP0lbxQMR4uiruLIWqsPlr6SLaLXM4oS2dTdfQ4dGYpx4tpOvoXNo0c/gvh+lE2pN2oZ2cqeimftMO8UBAM/qWHowHUqhNL9CVdAo9Tn/BggoZQJ/ReXQgvYjs67ejN+kcOpPeo5/oqGCO1vsJiyE2i970M8oO+AjsovENpbGMbqfVgr7bsDWGubbGXtIFyQygPv1IC4K+4qjdkP6A3bN+C71JXWsn3UI30Y30gBtPUCpfouuRO+DJdAX9gvIFfB52vQlB31LXt8+1R7p292SGcQX2f6Ft8R2WHcowjzJB/53h2qOR+eBEFXoi6sNqOokuROkBN4Y9lJoof8DT6XVYOnrGwdbY49obXLtNMsNQ+n+j1V1bb+xU0PZ9+q/WEXrDrZNRQ3td8SWoiChNRa6AFWAv97u8AaehgqM19DbEfteOC9Ah168HXRq3YGntUzqmPb2D4CHpRxFK0qS0gMfACpqnogHrxt7Ru7SO6zuL9MB0/bR78QyGje+IBwKUyqr8CUvotKCdFrAKiFJZFdBT0YBVPO7TFkHfGdiaTYI+4QMOt4OnLuw6R2FbLI2OsD3f3HcoKO2TkLSAd9N+QVtUJGA9XKVgnH4qXlozuTGHzlP164GHKCtPwypxWP1jtsGOz4RZsLPvKX3sfA9b5AW94eY9cPOeuDmarzk6A9XWIV8WBbCKqzcjlM46S4W2SvyQxTnYkaMqG6JAw+3VGXaOx+je9IBzonMrbfGQBrA5aW+4B60R9Q2FFSAdfZ6+dLP73R92Pc0L8Skbshz2tRayGFZjQlQAdU199ORkK2xi13ggQHtNc45F/VNdf1hEdLZ+gJ2pWryYXqavYF9MQmmpIqbjyaN9+5UOCvqUEfoYKYKdv8X0Giwr9ZZDfEHLOn89OoMfwSqobvAN7PyMUd9r2Bz5HCUprbemrVDo2uIqbOE0hwTzWsK2yi46nz5E5lbRFtDxE19D6qsvLKhCNUdje6P+/woVoz50LLLP5H9F+34EbRQP5MlTSfgDSC3cXVRh8HQAAAAASUVORK5CYII=>

[image38]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAWCAYAAACCAs+RAAAC80lEQVR4Xu2WWchNURiG32ROyDz2K2TOXOY/IheIUohwgSIZy5QLIbmQQsakTBmKQpS4cYOiXBmT/igiIiQyxPueb62z115n/9uvuHKeeuqs71trn73WXt/aGyhTpsx/xQS6h1bSfrQP7U17OeslXXPReJlHB7qULqKto5xoT+fT9bR/lPPUopPoFrqCtvUJBX5W4zfa0XfMYBw9QKtg/Vel0ym20ut0Cp1Dn9L6QX4QvU0X06H0JD0X5EVdeoZeoqPoavrcJ31iP91Nd9Gd9AlsZfKYSqfRWcifyDx6D8mNb4D1n1zsYYtREbSFJjY7aC+kr2jDIKYHUUCrpMcVMoxeyYhXh1awuolom36FbSdPT7qNtnBtbTmNH17sYeyAbXvPHXohaIux/of2W0hjeou2i+J55E1kGSyn+tPWyNqqWrA39DEd4mJa9YewLSSawq5zxLU9A6J2kcN0bhz8DXkTOQbLLaHnYSv6DMkNe/x2+wHb2pdhYzxdXV41GaIDqYSB9AVs5f6EvIncR+lK6il9pJ2DmNiH5KBRLYwJcv4/1CekR9QucIoejIM1wP+JTpGY17DciCDW3cVUJx4VtWpgPL3h8qqtSpfXE1RMh1JIyURUcN/p8jhRA/xE1sQJ2GmlXFhzvriVE4PpO9rKtVUzK+kX+sjFusDGxAutwySFznZ11AvyT8mbyEVYrlkQ04tPMRWz0M0dStJFNiEZ2wi20KdTPeyETaEi0qCRccLRErYqWfiJrI0TsLNfuXBsNxfb69o6ZrMm0pd+prVd+xq9WcwaM6J24X2ii6vgs6iCvek7RXFRCRtbfDkFNKcvkT4IFtAPSD5TNP4tSot/O9LFPZ1+QnqbHg1+F7gKu5n4Yp4T9C7sEXs2ws5+FfR72M3p00PbKWQ07MjVl8Nx2KJMTPWwra2bPEvXwV7IOnzCt7jYTB/ATj5dSwdDigrYt9O/ogFsRfU5E9+cpwnsTT0TGUUc0Ab2aaQtXSfKlSnzt/gFQVep+oZujrsAAAAASUVORK5CYII=>

[image39]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAWCAYAAACCAs+RAAADd0lEQVR4Xu2WWaiNURTHl3meySzz/CAPQtIlUeYXs4wJZYhMJekmc4SMEddY5lmm8GB4k8yJrrHIgxAy+//PWvucdb5zfZRH51+/01lrr29/+1t777W3SFZZZfXfqSjIAblgEKiQ1hqvcmA0WAmGi/b1O9UBU8BEUD3SRjUEk8Ai0CvSFlQY9AELwTRQMzQUAjvANtAFjAH5oF0IiFFT8AisA53AVnANlPBBpsXgCugPRoAnoKRr57vpmwq6ggtgr2unioMD4CToDGaBF6FxLNgcDBOzcQ8Ui/i92Ol10cEFcTY4mGXOR/EddyQ18PngJ+hndhHwHMwwm6oM3oORzjcBvAKlnY8zk9AWcM41UBVFX1Qt4vfKEY1ZHfEfFM0SZ5pqDb6ILqeglmA5qGp2X9G+2iYjVJfBeWczccecTXULfziV7IRZDBnj8uLUxmm86HNLI/4887cyO/TfRnQW65rfa5VoTIOIn4P+LDrTIbnb0yLcx9cGz0SDHoA54Kr54zRECp6R/eYPmdpp9mRwVHRwT0F7a6d2W0xy45pCXywMTez/prSIVMISaiS6HhlI8kAZH1CAWGG+SmaG7ov2wepH3TXbx3GW+D6+lzojqQF7cbPT3wJ0sP8b0iK0LaFKomtxpmgV+Cj6wCnRTRinJeCtpNZ6b/BG9Pnu5nttNqtaUHPzcZ9Qp82ukYxQhQ9hdeQM8v/GtAj3IcdFS2MQp5AllA9x+fxJs8FNcATMA/tEn+VgKVYr2rXMpnie0Mc2apfZ0eXMUks/K1hj+x+tsCwmiQ5/SOYG5MZ6B9ZE/H+ji+ClpEr3CUkNJogDpo/LkGLBoJ3Mruks+CBaAcuCb5J5tnTkDzv/LpkfQh0Gc53NUsyseHFp+Y/ly7j2Fzgfaz8H6Z9tZr71ZueY3SMEmPihh5x9SXS1eA0Of1hmWXlC3afqix5sYTNS+aKbm21BtyR1svLqsALclvTsVxGdIe7BoHGiMx42N/ci+2IZDuK++CTunBAtIJwhv0x5K0mIL+VX8qqRK5phdtozBJj2iA6SWQ8aJXpgcZA8VG9I5oaleP1gyV0ruh+YFBYGr3rgseg1Zzp4KAXvUc42bx2sfOyLR0VSnA2uz6Gi1aa8b/yDWLEGiJ7WcSolmtFhkn7F8OLBxzLL/qJniheTNVA0Nu4alVVW/6Jf/8HDvIYwpnQAAAAASUVORK5CYII=>

[image40]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAADAUlEQVR4Xu2WWchNURTHl3nIlJIxIZRIIWPSR6KIB2V60IciikQiyVAikpIUIkUokQdlDN2MDyLlgfBAhvKgDEkk/P/W2vdbZ597j/upS1+df/3qrLX3Xvesu/dZe4nkypUrVwNXL1AbOyM1BgtA93ggQ1wzG+wAa8GQ5HBRfcAysA1MjcaCGGsa2ApWgq7J4aLKxhoAtoN74Ac45wedFoFT4B34CYYnh8uqJbgKtoB54Kzo7/BFvMaDF2AFmACugZOJGSLNwWnRdxwH1oDXYLSfJH+INQIsBMPAVymf8HLRf2qX1C/hzeAgaOJ8D0RjTDGbY6/A6uIMkY7gkyRP3BLwFrR2Pu70U9DU7KxYKWUlHLRO6pfwFdH5c5xvo/mOmT3d7KHFGaqbouuD7oueEK+JomvHmp0VK6VqJMzTcwf0d75ZojGOmr3b7N7FGSomx3fi7nUQnXMkMUMTo3+D2VmxUqpGwqW0UzTGDLOPmx0XINYM+juDfvZ8IDFDZKD595mdFSulf5FwJ/AePAStzHdJ6hLzYqGhn4WVhcknFsQx+kNRyoqVEhM+HzsjhYRZ7P5GJ8Bj0MP5LorG7OJ8VEiYn8Moe96fmFGXMONSWbFSYsIXYmekkPDIeKACrQd3RXfZi8WLMeO7nVcQ/ayyfe2ZFd9rkPn3mJ0VK6VqJlwrWnHbms3jvNie2ZAwJnfL6zL4DBqBNuC7pHdqjOhaNjRUVqyUmDCPRJZCwjxipcT7vFnkmyxaNFo4H190rz3XiMbkPC8e/TPOLohWfC9ed1w72Owas0vFSogv+Q1cl7pLvJQ2iQacFA9A80XHDjkfr42PovcgO64CuCHaIbGZodgssIjxSgnid/tF9J4NYnvKHe/mfLzaCs7OivVb7HbYqbwRfTHCbuYJaB8mie78M9EK+0G0c+E6NhFB3LWXYKnz3RL9E0rh/7Se4Dk4DFaJ/tZcNx7EFvWRaNvI7/U2aJeYUXms/y6eLF4/MyV9j3qxArN54dz48wmqNFauXA1VvwBUmNNWp2igMAAAAABJRU5ErkJggg==>

[image41]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAADOklEQVR4Xu2XWahOURTHlzFJSK4xuoRMKUMypUtEpgdlerq3S6JkSjzIk4g3QxkylDmRDBkz3BAP4oEH85QpXhQZM/3/1t6+dfb5zvmOx1vnX786a+31rfY6e5+19yeSK1euXLVc5aAydDodBjPAANAH9Hb0Ah1MXDEtA2NBK9DSPdMXqjOYB1aD8cGYV10wEawCi0Db6PA/JebqAdaAm+AXOGkHnRqBn+B3AlsKoTHVkXj8VzDLBkEjwHOwAIwEF8HBSIRIQ9EXzzkOB0vBKzDYBkmJXANBNegPvknxgrmSL8EOsAlsBOvBfvAalBVCi+ozuAIugbWgb3RY6onmX2J8LcBHie64OeAtaGx8XOmHoL6z03LFlFTwZIkmoLhyJ0TfYCk9DR2BJomufL/AfxWcN/YtcNzY1CjR3w5zdlqumJIK5gqXB775om83ix6HjkDrRCfZKfCzOM6Jq9dcNGZXJEILo3+Fs9NyxZRUcKju4LYUtlEpPQMLRVeLv5sdGRXZJzrJsAEdcv7WoKt73hqJ0KZJ/2Znp+WKKWvB3MrsgFn1Bcx0z/yeLovm8C/srBQKs2KjoZ+NlY3JFubFMfp9U0rLFRMLPhU6A/UU7ebtw4EUcUdYVYpOqsrZZ5zdxgc4+YK7gUHuOTwRfMFsoFRarphY8OnQGYhb6n3oLCE2OKvRopPa7ey9zg5fIo8g+rkrurjnbZEI7S/0b3B2Wq6YshT8BNwInSliY3snehHwYmfnpPwkeFTR5mpZnQOfRF9YE/BD4is1RPS3/iKTlismFswtkSQ2Aia7EA4Y8TxvYOwDomeg3dbTRfMsd3aFs8f4AKd74Iixa8B1Y1M+F29/VIWzi+WKiJP8LtpQkrqv34psOMVUJTq+3fh4reNb9+JqHQNvRLcqxcvCHdEjxYvfLZsdz1mvaaIr3s74+FnUGDst11+NE72p8Mb0wcHbzAPQzAc5DRUtaE/g9+L2egHmGh8nwLPzqOiK8pO5L7oTrDqKHl87wWLwSPTuHmoluCt6beT3eg00jURkz1VSXJ0Jon8C/lf808DtxxsR7+bFxJ3F42eKxM9RK3bgqaKx9vOxyporV67aqj8oGNOKiiLRiAAAAABJRU5ErkJggg==>

[image42]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAADiUlEQVR4Xu2WaaiNQRjHHztlS9l32ffse5dClmTXFVlCyZYlQhGhkLJlKcstS0QK2cNNKFuEJCT7B1lDSrb//z7z3DNnznvu7fig6PzqV+/MM+8y8848MyJp0qRJ849SBk6Gq+F0WDk+HEdBOA5WDQP50AzOhVNgjSBGDsJM2AY2h02dTWB116YmnAE7w5KwNhwOR7u4Tx04Fa6A/fxAfXgVToOT4F34GQ70G4GJ8AB8C3/BtvHhPOFgnoFDYB/R98304sXhD9HnRrnFteseEXsJO7i4wXZPRQenBzwH91swG46xAigPv8Mv7trggHCk1khqHeaA3oMFvLpy8IOLEf7JF3A73AQ3wHVwL3wlse/IcO04YEfgQljJxYxCom3meHV83ydecHp+gz9hFa8BR4SdmuDVGfMltQ6Pgm9g6aD+FhzmrgdL/AcSDtBR0T9kdINZXjmKAaLf1yqov2gXHNFjsHAsllPHm8Z7dUaqHW4h2v6kxNZ9A/haYoPAP1zLXRvMJcuDuq6Sf4fXir6P69uHMyIp10SntT+ljVQ7TGzGfBS9/7roxyejIbwt8T+BdIGH4Xp4Ft6QxOfsEX1XmHiZfyLpKXrDtjDg+JMOF4M3JZZouAbDP+DDqcwMG9IRvhPN5MRmCteycUr0HRW9OpKbtHxKwfvwECwaxAzrcLswkATmCS6RfXAofC56P7No+FGksWhOidr2SohuTT47RWdjXVfm0uHzw2SW0GFOnxOimZKZLhnW4fZhIAmz4SWJZWmu2x2iz9hqjTxY9z6szAOucz7L8s1uVw4HjPt8HOzoSq/MgwL3s5BUO/xAog8GF0TXachj0RwSBTMt1z9njbFU9HtsCbAPLDfKbaGc9gtL4Dy/AiwQnYIh1uFwszdawyJemdtPVId5KOBhxIeJhs9mQgrhDOEhg0vOT2Y8lPAenr5Ihiv3tgYO3pcDT1fclM+LZtNseFk0o/IvhywWfWCvMADGisb8hLcIXhFdfwav+bdGeHXEEiaTVhSrYF+vXBY+E01UBpfjHdHtyeAB5ysv+GIueL4klEc9HvkMJoNHoickDgYH6aFoh4xOokmJR0mD02+zaHbdCJeJbiecQSH8S3z3rjDgYCLi388SHXh27Dis4LUhPKs/Ec0Vs0S/O9Nv8DdgEhnkrBbEDE7b/pLYgZB6cCRsGQY8OO25jfE0F+7JadL8D/wGYeDQJxFNyPEAAAAASUVORK5CYII=>

[image43]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAADoklEQVR4Xu2XaYjNURiHX/ueIjuZbMkulKVMtig+SCLCIMmuULIlsiQpIrsiZctWEskyfCCEiCLF2Jcs2WX//eY95953zv3/xx0+0X3qMXOWe+cs73nPIZIhQ4YM/yiV4Xi4HE6BtQo257MXDoHtYSvYwtkc1jP94mgDl8CxsHXQFsVguCisBMVgP7hUdDxxf7sOHAPnwLa2oQm8ACeLDuY6fA/7mz5l4Xf4M8b1ya4plIA74UrYS3RB+V0sx1Ebvoa7I+qPw7mwK9wIP4lO3MJNuQgnwk6if/+gb8yFOb4AqsFv8IP7nXAnH8ItcC1cDVfBHfCx6RcFF+4LnGDqzoguFAcTxT7RRQknzEV6ATu6cmn4VXRxyvlO4C6sb8qECyDFRQfzQ3T1PCdFB8SQIAPgjGRzPgytQ7B7UB/SV/S7uFgeP+FsU+cZBhfCj5I6YR45fm64KzPyOH5GZHlXV9f16eLKnkREcccOw5LJtvw6fmi0K3OHsxKtCkNzcVAXRyNJfj9/MnoeiS64pQY8LbpzURNm/8am3Fl0nAxZD/swCm5LMhK4GDcTPSLg9jOs40K1KbwmBRcpHSqJDu4J7BG0EU6wg/s9asIWTvwKPC+pmzFfdCF4LHj0jormqEiYWNh5c9hgYChPCit/wzh4Cb6FI4I2MhAuM+XCJrwO3oDPYcugzcM+nAd9JjFHjzvArd8vGlZRNBM980z7fwKvkTy4B1Z0dVVEQ5ln0lPYhD094Ts4L6jnGb8Me8OzopPmWS8Aw/OIaHLhVRLHBtGs+DfwPuYgePeTrZKaZNKZMPET4kYQHgmOr7or80xPg59dOQEnakOKodLNlD13xKX4NOkjmtwYPZ5RooM858pMMPdErxN+f55rZ/Zl2d+zUyX1KG0T7cuHCNkkBW8EDzN/ggVwpq0As0XPlYUvMH75iaDe0g6WMmVOgp+xjwOfVOJ2sKqktme5Omqv0FOuzkcLr5+oCSded3xd8Rzwg7x/c0XD5I2kJgSf0Ji0ohgp2m4T3i54VZIhRpg1mUF5R0dRU/R7Dpi6MqJRwMeOpwJ86fQ5JRu+gg19J8cK/sPXCa8fv3JWDsgmEcJzxrbtQb2H9+IDSa424R3IxeRu8fHCa4nZNcf0sTDMn4pmc3pfktHBZzCT6ho43fW9JfpOt/AW4F3PF9sseEx04YuMf7jb3UoXZudBou/c8MFRFDgGRh4XoUHQZuF/iJjFh4o+nDJk+N/4BSD02vxz8UewAAAAAElFTkSuQmCC>

[image44]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAADB0lEQVR4Xu2XaagPURiHX/teluzRP7JkS6FEKJFCipQUdT+SLaF8ICVL+EJkiyIhRT7wxZatCB9EKZJdSCS7yPL7zXvOzJlzz4zpdqlb89RT97xn5v2fd+bMOeeKlJSUlNRR6sHJcD2cCbulu4PMgGv84F9oAZf4QcNR0d8eCgfBAcb+kh4PxzoFbhTN1drps2TliugCz8IVcDTcDb+aG7LgPe/gEb8jQBu4XPQ3vsHP6e6IpvAn/J3hTnNdM3jGOAEuhi9hT9NP8nJFbIZv4HDTbgx/iBbEHwhxTDRpkYI7wAVwDLwk4YL59J/DvXA73Aq3wEPwBWxvrtsGP0n6rR6E1512Xq6ITaLVzzZtPqHvoomb24scZsHV8IsUK9jllIQLngaXejFO3RNwrGk3Eh3XrfgKhQ+T4+9j2nm5IurDXkmfjBBNcNiJWTrCi6KzoDYL5lupeLGFcK3TZkEc1zUnRqpMfJ5pF8kVw8JviiatpLsiWOAw83dtFuzTF96GDZ1YZ9HC/DfMQhnPWkBDuSJ2wDvwNRzo9ZHpcIPT/pcFc/rN94PgAXzixbigsWCOP0RWrphx8CNc6cTaik5lft+WmhbM+/LoB3/Brn4HmCS6WI437e6iD4EFr7MXOeTlSnFFNAlvIPvgyLhXqWnB3PLy2CW6Q2QxEd6Ap0VX4mWiY53jXmQI5lok1V/5ftEkPIiQ+6JT6RF8CB+bfq7kbOft2S5FCmY+FlSUVaJjCX2G1XJVJNmUeZiwnDexuU7MpZ1of+gNDxHdQkKwYB4+srAL0zm/w8DT3UnYyoldgJedtiWYq4nom4s3ZdHj31tj1tzvJJrsuBevMvE9XtzCB8m9tKXfYeC3yfvjPdODhwh+w1x5yVT4XpKdwyUzV294V/QUw7PpVXgPDnYvcmD/K/jB+FSSKc09/JmkZwZnAz8Jfg72Hn5X/E0eD124TnCQB7y4hXsxtxgeg7kqc0cZlboiITcXTyL8BjjwHl7f/8T+E8PjaBY87nLh4rm/gdfnUiRXSUld5g8nEsu7muoi7QAAAABJRU5ErkJggg==>

[image45]: <data:image/png;base64,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>

[image46]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHUAAAAaCAYAAACJphMzAAAD/UlEQVR4Xu2YaahVVRTH/2VmpomIqTkiGCURUQ6Vw4cnTihqX6oPhvgQzFJBMSJIP5hEkKI4z4pDlqAgoklY+rIiP+T0IUvEfGbSBBUkKs7/v+ucd/fd3uc7577znufB/sGfe+9aZ9h3D2utvYFAIBAIBAINzQPUYOoF6pHI1plqWXNFoEkxifqKWkrtof6gXqdOU4851+WJaVQ1rK3Sb9RZ6hfqV+oANY56MLq+MRlAnaF+h7XtQvT7HPUTtYF6seZqYAQ1l+pAvUktoIY7/tS8S31PtXVsT1I3qR8cW145T/1FNXdsD1ELqVvUHMfe2HwGa8PL0e9mVA/qU+o6NYZqQb1PLaOOwaLjs7BJWhbPUDdgD/H5FjZj8ow6QJ223XeQdjCfVopSy/1AUeM/2GC6PA1r2yGqPdU9+q7IIrTST0bfU6NVqoe39h2wUDzaN+YMpQi1f4rvIH1hvhO+owQ9fYOHUpAmSRq6wt6/23eQCphP6U2obrmEQrT8mPoo+p6a5bCHz8PducctmPLKClj7NfNdFIr3URdhxV9dTKeWoPSK1kqqgkW1NIyHtW2m7yDrYL5Xo98a5CMF9528q5Bd6t46GQt7uPQ3LIxVwuJ8U0AhSu3WKpIep0bCiqQvUchlSVBeW4XigdWAKiz2d2xJWQvr1+cdm9LFJ9S/1GTH/h6sUIpR6vsQdUeQkugPaDZcRmFwpf2wYqO+rKG+rkVV1MFIGgRV3xN1U0I6wtr6M7WZ2hR96jnfwcJvWlRUrYb1iwb0GxRXqWlQaL1GfQ6LGkepK9Q26gnnOvEoiieTvrdxfpdFK2oUtQj2YnWWZnyeuVc+1USVT9uDtGhgN8JWy0ueLylxPt3l2FQsbaH+oZ5y7JnynG+IeAvWIH3mmZWwdvb2HbD9nnynfEcCOsH2kxoQd/Wk4Q2UzqdaKLIr1GeOQpfCVCmUh/TiPr6jDPSMYSnUy25LhAZM+9NSxFsGbfjToAE9DAu578DyYjkDux72fhWbLjMi+weePRNeg/1hf/8kFsNOZuJquD6nHbp+dgoNsdvqpAusc3b4joi4UzUwSXEHNGYWCjk2Deo/7U/9HcVOWLs0uJkTbwUmePaBsMosnmGZn3ZkhI411f6pnl3Vb7xNU5uTDoYmrIqrfr4DNrAK9UmfpXyp9+/1HbACUb4416uw0wTNBFVi2pv9CBus+dRW6jiKC6TMTzvqiYoi5bursM5R0VENO7nR55+w1aDokgZtKdyth8/b1CDf6KEVropXbdJBwv+wtrpt0RZSbf8Cdrigfs+MOMQ8DNucV6L20JfpaUcA3ahXqKG+ozGpQIanHYF8kOlpRyAfNMhpRyAQCAQCgUDeuA2QiObZnn0RIwAAAABJRU5ErkJggg==>
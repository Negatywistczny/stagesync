# 🗺️ Długoterminowa Roadmapa StageSync (5.5 – 7.1)

- [ 5.4.5 Smart Tempo ] (Wydane / Stan obecny)
- [ 5.5.0 Desk & Audio Polish ] - Szybkie usprawnienia sceniczne i odsłuch realizatora
- [ 5.6.0 Studio Shell & Multi-Window ] - Wieloekranowość desktopu, wsparcie dla pedałów i ZAiKS
- [ 5.7.0 Extended Notation & Chords ] - Notacja, elastyczność partytur i zapisu akordów
- [ 5.8.0 Advanced Timeline Editing ] - Głęboka edycja osi czasu, Nudge, Insert Silence i zbieranie zasobów
- [ 6.0.0 Dual Engine: Studio vs Live ] - MAJOR: Wtyczki VST/AU z trybem Freeze, bezpieczeństwo Live
- [ 6.1.0 Live Show Automation & DMX ] - Automatyzacja DMX/Art-Net na osi czasu, Track Delays
- [ 6.2.0 Pre-flight & Hardware Setup ] - Rig Manager, weryfikacja setlisty, stroik Performera
- [ 6.3.0 Karaoke & Jukebox ] - Ekosystem LAN, widoki `/karaoke` i `/request`
- [ 7.0.0 Integrated Notation Studio ] - MAJOR: Wbudowana lekka edycja partytur MusicXML
- [ 7.1.0 Enterprise Rig & OSC ] - Podgląd logów live, OSC Matrix i Redundancja Zero-Glitch

📦 Linia 5.x — Usprawnienia Silnika i Powierzchni (UX & Shell)

5.5.0 — Desk & Audio Polish
Hero: Szybka organizacja miksu scenicznego, odsłuch realizatora i płynny transport.

- Solo / Mute Off for All: Globalny przycisk resetujący wszystkie wyciszenia i solowania w Mikserze (Panic w mikserze).
- Odsłuch podglądowy realizatora (Audition Window / PFL): Odsłuchanie pojedynczej ścieżki, klipu lub metronomu na lokalnym wyjściu słuchawkowym realizatora, z pominięciem wyjść scenicznych (HW Out).
- Kopiowanie właściwości klipów (Paste Properties): Kopiowanie samych parametrów routingu, głośności, fade'ów i wyjść HW Out z jednego klipu i wklejanie ich na inne z pominięciem pliku audio.
- Śledzenie trwających nut MIDI po skoku (Chase MIDI Notes): Mechanizm odczytywania i wyzwalania nut MIDI, które rozpoczęły się przed nową pozycją playheada po wykonaniu skoku (Seek).
- Szybkie przełączanie / rozłączanie Hostów: Dedykowana opcja w menu pozwalająca na natychmiastowe rozłączenie z obecnym serwerem i wybór nowego hosta w sieci LAN.

5.6.0 — Studio Shell & Multi-Window
Hero: Ergonomia pracy na wielu monitorach, wygoda muzyków i raportowanie.

- Obsługa wielu okien na Desktopie (Multi-Window): Odpinanie modułów (Timeline, Mikser, Klient) do osobnych natywnych okien w Tauri na stanowiskach multi-monitor.
- Synchronizacja nieaktywnych okien/kart przeglądarki: Zapewnienie ciągłego odświeżania transportu SSOT w tle we wszystkich otwartych oknach i kartach przeglądarki.
- Obsługa pedałów Bluetooth (AirTurn / PageFlip): Dedykowany profil obsługi bezprzewodowych kontrolerów nożnych do przewijania tekstu, przełączania stron i odpalania transportu.
- Generowanie raportów odtworzeń dla ZAiKS (Setlist History): Moduł rejestrujący historię odtworzonych utworów z czasem i opcją eksportu zestawienia do celów prawno-autorskich.

5.7.0 — Extended Notation & Chords
Hero: Personalizacja widoków partytur i tekstu na ekranach wykonawców.

- Filtry widoczności w Partyturze (Selection Filter): Opcja ukrywania wybranych warstw partytury (np. artykulacji, palcowania) na tabletach w widoku Klienta.
- Wybór notacji akordów (English / German / Solfege): Przełącznik wyświetlania akordów (B vs H / Do-Re-Mi) indywidualny dla każdego urządzenia w Kliencie.
- Dwukolumnowy układ tekstu (Two Column Layout): Opcja wyświetlania tekstu utworu w dwóch pionowych kolumnach na szerokich ekranach tabletów.
- Litery orientacyjne na osi czasu i partyturze (Rehearsal Marks): Obsługa znaczników w postaci liter ([A], [B], [C]) na warstwie Forma i w partyturach MusicXML.

5.8.0 — Advanced Timeline Editing
Hero: Szybkie i bezpieczne zarządzanie zawartością osi czasu.

- Globalne wstawianie ciszy i wycinanie czasu (Insert Silence / Delete Time): Rozpychanie lub usuwanie określonej liczby taktów na wszystkich warstwach osi czasu jednocześnie.
- Szturchanie klipów i sylab z klawiatury (Nudge): Skróty klawiszowe do przesuwania elementów o małe wartości (np. 1 uderzenie, 10 ticków).
- Zaznaczanie ciągłe od kursora (Select All Following): Błyskawiczne zaznaczanie wszystkich klipów na prawo od wskaźnika na danej ścieżce lub całym Timeline.
- Rozcinanie klipów pod playheadem (Split at Playhead): Dedykowany skrót klawiszowy dzielący aktywne klipy dokładnie w miejscu wskaźnika odtwarzania.
- Wyszukiwarka i zamiana fraz (Find & Replace): Moduł wyszukiwania i masowej zamiany słów oraz akordów na osi czasu.
- Pakowanie projektu i zbieranie zasobów (Collect All and Save): Automatyczne kopiowanie wszystkich zewnętrznych plików audio bezpośrednio do folderu data/projects/<id>/assets/.

🚀 Linia 6.x — Dual Engine, VST Freeze & Automation
6.0.0 — Dual Engine: Studio vs Live (MAJOR RELEASE)
Hero: Bezpieczny podział na pancerną Scenę i produkcyjne Studio z obsługą VST.

- Dwa tryby pracy aplikacji – Live (Scena) vs Studio (Edycja): Podział na zablokowany, pancerny tryb sceniczny z blokadą PIN oraz elastyczny tryb przygotowywania projektu w Studio.
- Wtyczki VST/AU z funkcją automatycznego "Freeze": Użycie wtyczek VST/AU w trybie Studio z wymogiem zamrożenia ich (render do .wav) przed wyjściem w tryb Live.
- Blokowanie warstw kłódką (Toggle Lock Lane): Opcja zablokowania kłódką poszczególnych ścieżek przed przypadkową edycją lub przesunięciem na próbie.

6.1.0 — Live Show Automation & DMX
Hero: Pełna kontrola nad światłem i czasową mikro-synchronizacją.

- Kompensacja opóźnień na pojedynczych ścieżkach (Track Delays): Dodanie mikro-przesunięć czasowych (ms) indywidualnie dla każdej ścieżki audio/MIDI w celu wyrównania fazy.
- Dedykowana warstwa sterowania oświetleniem DMX / Art-Net: Dodanie warstwy DMX na Timeline do wysyłania komend oświetleniowych bezpośrednio z osi czasu.

6.2.0 — Pre-flight & Hardware Setup
Hero: Pewność przed wejściem na scenę, uniwersalne mapowanie i wsparcie wykonawcy.

- Warstwa abstrakcji sprzętu MIDI (Rig Manager): Globalna mapa przypisań sterowników sprzętowych, oddzielająca wirtualne aliasy od fizycznych wejść.
- Tryb przypisywania kontrolerów (MIDI Learn): Narzędzie do szybkiego mapowania fizycznych pokręteł i przycisków MIDI do akcji w programie.
- Tuner instrumentalny w widoku Performera: Wbudowany stroik gitarowy/instrumentalny w widoku Klienta wykorzystujący wejście audio tabletu.
- Globalne nadpisania wysyłek sygnałów (Override Controls): Panel do czasowego, globalnego zablokowania wysyłania konkretnych sygnałów (np. Mute PC).
- Zbiorczy raport gotowości setlisty (Setlist Pre-flight Check): Panel agregujący wszystkie potencjalne błędy i braki w plikach przed rozpoczęciem występu.

6.3.0 — Karaoke & Jukebox
Hero: Ekosystem rozrywkowy w lokalnej sieci Wi-Fi.

- Moduł publiczny LAN: Dedykowane widoki publiczne /karaoke, moduł zamawiania piosenek /request na lokalnym Wi-Fi, tryby Gig vs Jukebox oraz moderacja kolejki odtwarzania.
  🚀 Linia 7.x — Integrated Notation & Enterprise Rig
  7.0.0 — Integrated Notation Studio (MAJOR RELEASE)
  Hero: Wbudowany, lekki edytor partytur nutowych MusicXML.
- Podstawowa edycja i korekta nut (Studio Notation Edit): Wbudowany lekki tryb wprowadzania szybkich poprawek w załadowanych plikach MusicXML bezpośrednio w aplikacji, bez konieczności wychodzenia do MuseScore czy Sibeliusa.
  7.1.0 — Enterprise Rig & OSC
  Hero: Zaawansowany podgląd sygnałów, pełna diagnostyka i redundancja.
- Podgląd logów MIDI / OSC w czasie rzeczywistym: Okno konsoli logującej na żywo wysyłane i odbierane zdarzenia MIDI oraz komunikaty OSC.
- Redundancja i integracja mikserów: Pełna automatyzacja redundancji Zero-Glitch HA (Master/Spare) oraz obsługa pełnych siatek matrycowych OSC dla konsolet cyfrowych (X32/M32/SQ).

---

# Raport Produktowo-Wdrożeniowy StageSync: Głęboka Analiza Architektoniczna i Inspiracyjna Roadmapy 5.5.0 – 7.1.0

## Architektoniczna Zmiana Paradygmatu: Dual Engine (Studio vs Live)

Rozwój ekosystemu StageSync osiąga krytyczny punkt zwrotny w wersji 6.0.0, wprowadzając podział silnika na dwa odrębne tryby wykonawcze: **Tryb Studio (Produkcyjny)** oraz **Tryb Live (Pancerna Scena)** . Decyzja ta wynika bezpośrednio ze specjalistycznej praktyki estradowej i inżynierii oprogramowania czasu rzeczywistego . Środowisko produkcyjne wymaga maksymalnej elastyczności, dostępu do dynamicznej edycji, rozproszonej Notacji MusicXML oraz zewnętrznych wtyczek VST/AU . Z kolei środowisko sceniczne bezwzględnie wymaga deterministycznego zużycia zasobów, pancernej stabilności, zerowego ryzyka awarii (zero-crash) oraz pełnej izolacji od wywołań blokujących wątek audio .

| Wymiar architektoniczny          | Tryb Studio (Edycja i Przygotowanie)                      | Tryb Live (Pancerna Scena)                                                    |
| :------------------------------- | :-------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **Zarządzanie Wtyczkami VST/AU** | Aktywne hostingowanie C++/JUCE, dynamiczny proces DSP     | Bezwzględny zakaz aktywnych VST/AU; wymóg zamrożenia (Freeze) do audio WAV    |
| **UI i Interfejs Użytkownika**   | Pełna edycja drag-and-drop, multi-window, edytor MusicXML | Interfejs zablokowany kodem PIN, brak opcji edycji, widok czytelny z 5 metrów |
| **Alokacja Pamięci (RAM)**       | Dynamiczna alokacja buforów na żądanie przy imporcie      | Statyczna, pre-alokowane bufory audio, zlimitowany cache PCM                  |
| **Synchronizacja Czasu (SSOT)**  | Podatna na pauzy edycyjne, przeliczanie grida na żywo     | Pancerny zegar master, priorytet procesowy, zablokowane unikanie jittera      |
| **Izolacja Błędów i Crash**      | Ostrzeżenia, miękkie wyjątki w interfejsie użytkownika    | System izolacji, unikanie jakichkolwiek wywołań blokujących proces            |

Paradygmat Dual Engine definiuje każdą funkcję w roadmapie 5.5.0 – 7.1.0 . Wszelkie narzędzia edycyjne, wyszukiwarki i integracje notacyjne projektowane są z myślą o pełnym wykorzystaniu mocy w Trybie Studio, podczas gdy mechanizmy automatyzacji, sterowania sprzętowego i redundancji stanowią opancerzoną otulinę dla Trybu Live .

---

## 1. Linia 5.x — Usprawnienia Silnika i Powierzchni (UX & Shell)

### 5.5.0 — Desk & Audio Polish

#### Globalny Reset Wyciszeń i Solowania (Solo / Mute Off for All)

- **Problem i cel:** Podczas próby dźwięku lub skomplikowanego soundchecku realizator FOH lub odsłuchowy często soluje pojedyncze ścieżki (np. stopę perkusji, wokal podkładu) lub wycisza sekcje . W warunkach stresu scenicznego szukanie pojedynczego przycisku Solo zakopanego na podrzędnej szynie miksera prowadzi do sytuacji, w której kluczowy podkład nie trafia na przód podczas startu utworu . Cel to błyskawiczny przycisk "Panic" miksera, przywracający nominalny odsłuch całej setlisty .
- **Wartość produktowa:** Must-Have. Krytyczne zabezpieczenie sceniczne dla realizatora miksu. Eliminacja błędu ludzkiego przed odpaleniem utworu.
- **Inspiracje rynkowe:** Konsole cyfrowe Behringer X32 / Midas M32 posiadają dedykowany fizyczny przycisk "Solo Clear". W Ableton Live dostępny jest globalny wskaźnik Solo. W StageSync funkcja ta zostaje zaprojektowana jako jaskrawy przycisk w nagłówku Miksera oraz zmapowana pod globalny skrót klawiszowy .
- **Pułapki i ryzyka:** Błyskawiczne odblokowanie wyciszonych ścieżek audio jednocześnie może wywołać skokowy impuls napięciowy (trzask/click) w torze audio oraz nagłe obciążenie magistrali WebAudio. Występuje też ryzyko desynchronizacji stanu między serwerem SSOT a podłączonymi klientami LAN .
- **Pragmatyczne wdrożenie w StageSync:** Utworzenie komendy w stanie miksera `mixerState.clearAllSoloMute()`. Zastosowanie mikro-rampy głośności (5 ms fade via `linearRampToValueAtTime` w WebAudio) podczas masowego odtworzenia stanów, zapobiegające trzaskom cyfrowym . Stan rozsyłany jest jednym pakietem WebSocket.

#### Odsłuch Podglądowy Realizatora (Audition Window / PFL)

- **Problem i cel:** Realizator musi odsłuchać nowo załadowaną ścieżkę audio, sprawdzić klik lub zweryfikować barwę klipu bez wysyłania sygnału na główne wyjścia sceniczne (FOH) oraz do monitorów muzyków .
- **Wartość produktowa:** Must-Have dla profesjonalnej obsługi reżyserskiej.
- **Inspiracje rynkowe:** QLab oferuje dedykowane okno Audition routingujące dźwięk do lokalnego wyjścia słuchawkowego. W DAW odpowiada temu szyna PFL (Pre-Fader Listen).
- **Pułapki i ryzyka:** Przekierowanie sygnału na osobne urządzenie wyjściowe audio (HW Out) może prowadzić do dryfu latencji między interfejsem głównym a wyjściem odsłuchowym realizatora .
- **Pragmatyczne wdrożenie w StageSync:** Wykorzystanie silnika multi-out StageSync . Dodanie dedykowanego toru magistrali PFL, który przechwytuje sygnał pre-fader z wybranego klipu lub ścieżki i kieruje go wyłącznie na parę wyjściową zapisaną w preferencjach lokalnych realizatora (np. HW Out 3-4 lub druga karta dźwiękowa w Tauri) .

#### Kopiowanie Właściwości Klipów (Paste Properties)

- **Problem i cel:** Podczas aranżacji setlisty realizator dopracowuje obwiednie głośności (gain), punkty wcięcia (fade-in, fade-out) oraz routing wyjść fizycznych na jednym klipie audio . Ponowne ręczne wprowadzanie tych parametrów dla kilkudziesięciu innych klipów jest powolne i podatne na pomyłki.
- **Wartość produktowa:** Should-Have. Znaczące przyspieszenie przygotowania materiału w studiu .
- **Inspiracje rynkowe:** Funkcja "Paste Attributes" z programów Pro Tools, Logic Pro oraz edytorów wideo (Final Cut Pro).
- **Pułapki i ryzyka:** Przypadkowe nadpisanie ścieżki pliku źródłowego (audio asset ID) lub wklejenie niekompatybilnych parametrów między klipem audio a klipem tekstu/akordów .
- **Pragmatyczne wdrożenie w StageSync:** Wprowadzenie struktury DTO `ClipPropertiesDTO` w `@stagesync/shared` . Polecenie w menu kontekstowym kopiuje metadane (`gain`, `fadeIn`, `fadeOut`, `hwOut`, `loop`) do schowka aplikacji z wykluczeniem identyfikatora zasobu pliku `assetPath` . Wklejenie wykonuje zwalidowany atomiczny patch na zaznaczonych obiektach osi czasu .

#### Śledzenie Trwających Nut MIDI Po Skoku (Chase MIDI Notes)

- **Problem i cel:** Podczas przesunięcia wskaźnika odtwarzania (Seek) w środek taktu, nuty MIDI (np. długie pady syntezatorowe, komendy Program Change lub automatyka DMX), które rozpoczęły się przed nową pozycją playheada, nie zostają wyzwolone . Muzycy słyszą ciszę zamiast akompaniamentu syntezatora.
- **Wartość produktowa:** Must-Have przy pracy z sekwencjami MIDI i automatyzacją instrumentów .
- **Inspiracje rynkowe:** Dedykowane mechanizmy "Note Chase" w Cubase, Reaper i Logic Pro.
- **Pułapki i ryzyka:** Wyzwolenie nuty Note-On bez wysłania odpowiedniego Note-Off prowadzi do efektu "wiszącej nuty" (stuck note) . Wysyłanie masowych komunikatów CC po skoku może zatkać fizyczny interfejs MIDI .
- **Pragmatyczne wdrożenie w StageSync:** Podczas wykonania komendy Seek serwer analizuje warstwy MIDI wstecz od `targetTicks` do początku sekcji . Jeśli nuta straddle'uje (rozciąga się nad) `targetTicks`, serwer natychmiast wysyła komunikaty Note-On z odpowiednio przeliczonym czasem trwania oraz przesyła ostatnie znane wartości CC/PC .

#### Szybkie Przełączanie / Rozłączanie Hostów

- **Problem i cel:** W rozbudowanych konfiguracjach scenicznych (lub podczas prób w różnych salach) realizator musi szybko przełączyć się między serwerem głównym a zapasowym bez konieczności restartu aplikacji Tauri lub launchera Android .
- **Wartość produktowa:** Should-Have (Must-Have w instalacjach redundancji enterprise) .
- **Inspiracje rynkowe:** Dedykowane przełączniki serwerów w aplikacjach rozproszonych DAW control (np. Avid Control, V-Control).
- **Pułapki i ryzyka:** Pozostawienie otwartych połączeń WebSocket, wycieki pamięci wskutek niesprzątanych event listenerów Reacta oraz stan zawieszenia UI w trakcie reconnectu .
- **Pragmatyczne wdrożenie w StageSync:** Wbudowanie akcji "Rozłącz z hostem" w menu głównym shella . Wywołanie akcji natychmiast czyści lokalny magazyn `TransportProvider`, wycisza syntezę WebAudio, zamyka gniazdo WS i bezpiecznie przekierowuje użytkownika do widoku Launchera .

---

### 5.6.0 — Studio Shell & Multi-Window

#### Obsługa Wielu Okien na Desktopie (Multi-Window via Tauri)

- **Problem i cel:** Na stanowisku FOH lub w studiu praca na jednym ekranie ogranicza widoczność. Realizator potrzebuje osi czasu na jednym monitorze, miksera na drugim, a podglądu wyjścia dla muzyków (Client) na trzecim ekranie .
- **Wartość produktowa:** Must-Have dla zaawansowanych stanowisk reżyserskich.
- **Inspiracje rynkowe:** Rozpięcie okien Mikser/Aranżacja w Pro Tools, Ableton Live (Dual Monitor Support), QLab Multi-Display.
- **Pułapki i ryzyka:** Wysokie zużycie CPU/GPU wynikające z uruchomienia kilku niezależnych instancji renderowania WebGL/Canvas; opóźnienia inter-process communication (IPC) przy przekazywaniu playheada między oknami w Tauri .
- **Pragmatyczne wdrożenie w StageSync:** Wykorzystanie natywnego API `WebviewWindowBuilder` w Tauri . Okno główne z wbudowanym serwerem stanowi jedyne źródło prawdy (SSOT) . Okna podrzędne (Detached Mikser, Detached Klient) łączą się z serwerem via WebSocket (lokalne pętle IPC), działając jako reaktywne widoki bez dublowania silnika audio .

#### Synchronizacja Nieaktywnych Okien i Kart Przeglądarki

- **Problem i cel:** Przeglądarki internetowe drastycznie ograniczają wykonanie timerów JS (`setTimeout`, `requestAnimationFrame`) w nieaktywnych kartach w celu oszczędzania energii . Jeśli StageSync działa w tlenowej karcie przeglądarki, zegar transportu zaczyna dryfować lub ulega zamrożeniu .
- **Wartość produktowa:** Must-Have przy pracy przeglądarkowej w sieci LAN .
- **Inspiracje rynkowe:** Web Audio API Keep-Alive hacki, Web Workers z niezależnym pętlami zegarowymi, Web Locks API .
- **Pułapki i ryzyka:** Utrata płynności odświeżania pozycji wskaźnika po powrocie użytkownika do karty .
- **Pragmatyczne wdrożenie w StageSync:** Zastosowanie dedykowanego Web Workera utrzymującego precyzyjny czas `performance.now()`, połączonego z odtwarzaniem bezgłośnego bufora w Web Audio API oraz Web Locks API . Zapobiega to przechodzeniu wątku transportu w stan uśpienia przez system operacyjny .

#### Obsługa Pedałów Bluetooth (AirTurn / PageFlip)

- **Problem i cel:** Muzycy (klawiszowcy, gitarzyści, wokalistki) potrzebują bezprzewodowego, nożnego przewijania tekstu utworu, przełączania stron nut lub wyzwalania startu/stopu bez odrywania rąk od instrumentu .
- **Wartość produktowa:** Must-Have dla wykonawców scenicznych.
- **Inspiracje rynkowe:** Dedykowane profile nożne w Stage Traxx 3, OnSong, ForScore.
- **Pułapki i ryzyka:** Podwójne wyzwolenie komendy (key-repeat flooding) przy przytrzymaniu pedału; wywoływanie klawiatury ekranowej (IME) na urządzeniach mobilnych powodujące przysłonięcie ekranu .
- **Pragmatyczne wdrożenie w StageSync:** Utworzenie warstwy przechwytującej zdarzenia `keydown` na poziomie aplikacji, wyłapującej standardowe kody pedałów HID (PageUp/PageDown, Arrows, 'b') . Dodanie konfiguracji mapowania w preferencjach Klienta z wbudowanym debouncem (200 ms) chroniącym przed wielokrotnym kliknięciem .

#### Generowanie Raportów Odtworzeń dla ZAiKS (Setlist History)

- **Problem i cel:** Zespoły i obiekty koncertowe mają prawny obowiązek dostarczania zestawień wykonanych utworów do organizacji zarządzających prawami autorskimi (ZAiKS, BMI, ASCAP) . Ręczne spisywanie setlist po koncertach jest uciążliwe i omylne.
- **Wartość produktowa:** Should-Have. Automatyzacja formalności po-koncertowych.
- **Inspiracje rynkowe:** Historia odtworzeń w oprogramowaniu DJ-skim (Traktor, Rekordbox Export).
- **Pułapki i ryzyka:** Logowanie utworów, które zostały tylko przeskoczone lub odtworzone przez 2 sekundy podczas soundchecku, co fałszuje raporty .
- **Pragmatyczne wdrożenie w StageSync:** Serwer automatycznie dopisuje zdarzenie do pliku `data/logs/play_history.json` tylko wtedy, gdy dany utwór znajdował się w stanie `PLAYING` przez ponad 30 sekund ciągłego odtwarzania . W panelu Admin udostępniony zostaje moduł eksportu do pliku CSV z polami zgodnymi z wymogami ZAiKS (Tytuł, Wykonawca, Kompozytor, Czas trwania, Data) .

---

### 5.7.0 — Extended Notation & Chords

#### Filtry Widoczności w Partyturze (Selection Filter)

- **Problem i cel:** Pliki MusicXML często zawierają kompletne opracowania ze skomplikowaną artykulacją, palcowaniem, dynamicznymi znacznikami i ukżytymi głosami . Na małym ekranie tabletu scenicznego zaciemnia to czytelność notacji dla muzyka grającego żywy gig .
- **Wartość produktowa:** Should-Have. Poprawa przejrzystości widoku nutowego w warunkach scenicznych.
- **Inspiracje rynkowe:** Filtry widoczności warstw w Sibelius, Dorico, MobileSheets.
- **Pułapki i ryzyka:** Kosztowne procesowo przeładowywanie całego pliku MusicXML w silniku OpenSheetMusicDisplay (OSMD) podczas grania na żywo .
- **Pragmatyczne wdrożenie w StageSync:** Zastosowanie lekkiego filtra klas CSS nakładanego na wyrenderowane elementy wektorowe SVG z biblioteki OSMD (ukrywanie węzłów z klasami `.vf-articulation`, `.vf-fingering`) bez konieczności ponownego parsowania pliku XML w pamięci .

#### Wybór Notacji Akordów (English / German / Solfege)

- **Problem i cel:** Muzycy z różnych tradycji muzycznych inaczej odczytują zapis akordowy . Klawiszowiec preferuje zapis niemiecki (H, B), basista angielski (B, Bb), a wokalista z Europy Południowej Solfeż (Do-Re-Mi) .
- **Wartość produktowa:** Should-Have. Personalizacja widoku dla każdego członka zespołu .
- **Inspiracje rynkowe:** iReal Pro, Chordify (przełączniki systemów notacji).
- **Pułapki i ryzyka:** Uszkodzenie zapisów akordów złożonych (np. `Bbm7(b5)` lub `C#/G#`) przy niepoprawnym parsowaniu tekstowym; desynchronizacja projektu przechowywanego na hoście .
- **Pragmatyczne wdrożenie w StageSync:** Zapis akordów w projekcie pozostaje bezwzględnie w kanonicznym formacie angielskim (`B`, `Bb`) . Konwersja zachodzi wyłącznie po stronie klienta HTML (`/client`) za pomocą czystej funkcji transformującej `formatChordSymbol(chord, preference)` bezpośrednio przed wyrenderowaniem widoku Grid/Karaoke .

#### Dwukolumnowy Układ Tekstu (Two Column Layout)

- **Problem i cel:** Na szerokich ekranach tabletów w orientacji poziomej jednokolumnowy tekst piosenki pozostawia połowę ekranu pustą, wymagając ciągłego przewijania pionowego w trakcie utworu .
- **Wartość produktowa:** Should-Have dla wokalistów i lektorów .
- **Inspiracje rynkowe:** Stage Traxx 3, OnSong (wielokolumnowy render tekstu).
- **Pułapki i ryzyka:** Sztuczne przełamywanie strofek w połowie wersu na granicy kolumn; rozbieżność w automatycznym przewijaniu tekstu (auto-scroll) .
- **Pragmatyczne wdrożenie w StageSync:** Zastosowanie natywnego układu CSS Multi-column (`column-count: 2`, `break-inside: avoid`) dla widoku tekstu w module Karaoke przy wykryciu szerokości ekranu powyżej 1024px w orientacji poziomej .

#### Litery Orientacyjne na Osi Czasu i Partyturze (Rehearsal Marks)

- **Problem i cel:** Podczas prób zespół potrzebuje błyskawicznie orientować się w strukturze utworu ("Zacznijmy od litery B") . Numery taktów są trudniejsze do szybkiego przekazania ustnego niż wyraziste znaki formy ([A], [B], [C]) .
- **Wartość produktowa:** Must-Have dla sprawnej komunikacji w zespole.
- **Inspiracje rynkowe:** Oznaczenia Rehearsal Marks w DAWs (Logic, Pro Tools) oraz standardzie MusicXML.
- **Pułapki i ryzyka:** Konflikt między ręcznie dodanymi literami orientacyjnymi a automatycznie generowanymi nazwami sekcji Formy (Intro, Chorus) .
- **Pragmatyczne wdrożenie w StageSync:** Rozszerzenie schematu warstwy `Forma` o opcjonalny atrybut `mark: string` . Renderowanie wyrazistego plakietkowego znacznika na osi czasu oraz przekazywanie znacznika do widoku partytury MusicXML nad odpowiednią kreskę taktową .

---

### 5.8.0 — Advanced Timeline Editing

#### Globalne Wstawianie Ciszy i Wycinanie Czasu (Insert Silence / Delete Time)

- **Problem i cel:** Aranżer musi wstawić dodatkowe 8 taktów na solo gitary lub wyciąć 4 takty z drugiej zwrotki w gotowym projekcie . Ręczne przesuwanie setek klipów audio, akordów, tekstu i punktów automatyzacji na wielu ścieżkach prowadzi do rozjechania synchronizacji .
- **Wartość produktowa:** Must-Have dla szybkiej edycji struktury utworu w Studio .
- **Inspiracje rynkowe:** Ableton Live ("Insert Silence" / "Cut Time"), Logic Pro ("Insert Silence at Playhead").
- **Pułapki i ryzyka:** Rozcięcie klipów audio bez zastosowania mikro-crossfade'ów powodujące trzaski; rozsynchronizowanie znaczników tempa (Tempo Map) i kadrów DMX .
- **Pragmatyczne wdrożenie w StageSync:** Pomocniczy helper stanowy na serwerze `shiftTimelineContent(startTicks, deltaTicks)` . Wszystkie klipy i znaczniki zaczynające się od pozycji `>= startTicks` zostają przesunięte o `deltaTicks` . Klipy przecinające pozycję `startTicks` zostają podzielone niedestrukcyjnie z automatycznym podcięciem `trimIn`/`trimOut` .

#### Szturchanie Klipów i Sylab z Klawiatury (Nudge)

- **Problem i cel:** Precyzyjne wyrównanie klipów audio lub sylab tekstu za pomocą myszy lub ekranu dotykowego jest trudne przy wysokim powiększeniu .
- **Wartość produktowa:** Should-Have dla realizatorów i edytorów tekstu.
- **Inspiracje rynkowe:** Pro Tools Nudge (klawisze `+` / `-`), Logic Pro (Alt + Strzałki).
- **Pułapki i ryzyka:** Szturchanie elementów na zakładkę (overlapping) prowadzące do nakładania się głosów audio lub nakładania sylab w interfejsie Klienta .
- **Pragmatyczne wdrożenie w StageSync:** Przypisanie skrótów `Alt + Left/Right` (przesunięcie o 10 ticków) oraz `Alt + Shift + Left/Right` (przesunięcie o 1 uderzenie/beat) dla zaznaczonych klipów . Walidacja `quantizeTicks` dba o brak kolizji na warstwie .

#### Zaznaczanie Ciągłe od Kursora (Select All Following)

- **Problem i cel:** Zaznaczenie całej zawartości projektu na prawo od playheada w celu zrobienia miejsca na nowy fragment piosenki .
- **Wartość produktowa:** Must-Have. Standard ergonomii edycji w DAW.
- **Inspiracje rynkowe:** Logic Pro ("Select All Following"), Pro Tools (Option + Shift + Click).
- **Pułapki i ryzyka:** Pominięcie ukrytych lub zablokowanych ścieżek, co skutkuje ich rozsynchronizowaniem z resztą materiału .
- **Pragmatyczne wdrożenie w StageSync:** Skrót `Shift + F` . Przechwytuje pozycję `playheadTicks` i dodaje do tablicy zaznaczenia wszystkie klipy, których `startTicks >= playheadTicks` na wszystkich widocznych warstwach .

#### Rozcinanie Klipów pod Playheadem (Split at Playhead)

- **Problem i cel:** Błyskawiczne dzielenie klipów audio lub bloku tekstu dokładnie w miejscu kursora odtwarzania bez konieczności przełączania narzędzia na nożyczki (Scissors Tool) .
- **Wartość produktowa:** Must-Have.
- **Inspiracje rynkowe:** Ableton Live (`Cmd+E`), Logic Pro (`Cmd+T`).
- **Pułapki i ryzyka:** Tworzenie miniaturowych klipów o długości 0 ticków; powstawanie klików cyfrowych na krawędzi rozcięcia audio .
- **Pragmatyczne wdrożenie w StageSync:** Skrót `Cmd/Ctrl + S` (lub `Cmd/Ctrl + E`). Wywołuje funkcję dzielącą aktywne zaznaczone klipy pod pozycją `playheadTicks`, wyliczając podcięcia `trimIn`/`trimOut` z zachowaniem oryginalnego pliku źródłowego i nakładając 2 ms crossfade .

#### Wyszukiwarka i Zamiana Fraz (Find & Replace)

- **Problem i cel:** Masowa korekta powtarzających się błędów w tekście lub akordach (np. zamiana wszystkich `H7` na `B7` lub zmiana pisowni wokalnej) w całym utworze lub setliście .
- **Wartość produktowa:** Should-Have.
- **Inspiracje rynkowe:** Edytory tekstowe, moduły podmieniania w MuseScore.
- **Pułapki i ryzyka:** Przypadkowa zamiana ciągów znaków wewnątrz innych słów (np. zamiana "C" na "D" psująca "Cmaj7" na "Dmaj7" bez uwzględnienia granic słów) .
- **Pragmatyczne wdrożenie w StageSync:** Okno modalne z obsługą Wyrażeń Regularnych (RegEx) przeszukujące warstwy `tekst` oraz `akordy` . Podmiana odbywa się w ramach jednej atomicznej transakcji na stanie projektu .

#### Pakowanie Projektu i Zbieranie Zasobów (Collect All and Save)

- **Problem i cel:** Projekt odwołujący się do plików audio rozsianych po dysku (np. w folderze Downloads) ulega uszkodzeniu (brakujące pliki) po przeniesieniu na inny komputer sceniczny .
- **Wartość produktowa:** Must-Have dla niezawodności scenicznej i przenośności .
- **Inspiracje rynkowe:** Ableton Live ("Collect All and Save"), Logic Pro ("Consolidate Project").
- **Pułapki i ryzyka:** Niepotrzebne duplikowanie wielogigabajtowych archiwów audio; błędy uprawnień przy zapisie na napędach zewnętrznych .
- **Pragmatyczne wdrożenie w StageSync:** Uruchamiana z menu operacja serwerowa, która skanuje ścieżki plików w `audioClips` . Wszystkie pliki spoza katalogu `data/projects/<id>/assets/` są kopiowane do wewnątrz folderu projektu, a ścieżki w pliku [`project.json`](../../../../../apps/desktop/src-tauri/resources/sidecar/seed/seed-projects/00000000-0000-4000-8000-000000000001/project.json) zostają zaktualizowane do względnych .

---

## 2. Linia 6.x — Dual Engine, VST Freeze & Automation

### 6.0.0 — Dual Engine: Studio vs Live (MAJOR RELEASE)

#### Dwa Tryby Pracy Aplikacji – Live (Scena) vs Studio (Edycja)

- **Problem i cel:** Eliminacja ryzyka awarii oprogramowania podczas koncertu na żywo . W studiu potrzebujemy pełnej edycji i wtyczek. Na scenie aplikacja ma działać jak pancerny sprzętowy procesor (zero crash, zero UI misclick) .
- **Wartość produktowa:** Must-Have (Fundament Nowej Architektury). Bezpieczeństwo wykonania scenicznego .
- **Inspiracje rynkowe:** MainStage (Perform vs Edit Mode), Gig Performer, QLab (Lock Show).
- **Pułapki i ryzyka:** Wycieki pamięci przy przełączaniu trybów; próba wywołania dynamicznych alokacji pamięci na scenie .
- **Pragmatyczne wdrożenie w StageSync:** Wdrożenie globalnej maszyny stanów `ENGINE_MODE: 'STUDIO' | 'LIVE'` .
  - **Tryb Studio:** Odblokowane widoki edycyjne, obsługa VST/AU, edycja partytur, zmiana widoków multi-window .
  - **Tryb Live:** Zablokowany PIN-em interfejs, wyłączony silnik renderowania wtyczek VST (działają tylko zamrożone pliki audio WAV), pre-alokowane bufory audio, wyłączone niebezpieczne metody DOM .

#### Wtyczki VST/AU z Funkcją Automatycznego "Freeze"

- **Problem i cel:** Wtyczki VST/AU pozwalają na świetne brzmienie syntezatorów i efektów w studiu, ale ich uruchamianie na żywo grozi skokami CPU, wyciekami pamięci C++ i crashami całego procesu .
- **Wartość produktowa:** Must-Have. Umożliwia użycie dowolnych wtyczek w fazie aranżu bez ryzyka estradowego .
- **Inspiracje rynkowe:** Zamrażanie ścieżek (Track Freeze) w Ableton Live i Logic Pro.
- **Pułapki i ryzyka:** Nieaktualne pliki freeze po zmianie nut w studiu; długi czas renderowania paraliżujący pracę .
- **Pragmatyczne wdrożenie w StageSync:** W trybie Studio realizator może nakładać wtyczki VST/AU (poprzez natywny sidecar C++/JUCE) . Wyjście do **Trybu Live** jest twardo blokowane przez walidator systemowy, dopóki wszystkie ścieżki z VST nie zostaną wyrenderowane offline do 24-bitowych plików PCM WAV (`renderTrackToAudioBuffer()`) umieszczonych w assets . W trybie Live odtwarzane są wyłącznie powstałe pliki audio WAV .

#### Blokowanie Warstw Kłódką (Toggle Lock Lane)

- **Problem i cel:** Ochrona wybranych ścieżek (np. dopracowanego podkładu audio lub zsynchronizowanego tekstu) przed przypadkowym przesunięciem lub skasowaniem podczas pracy z innymi warstwami na próbie .
- **Wartość produktowa:** Must-Have dla bezpieczeństwa edycji.
- **Inspiracje rynkowe:** Kłódki ścieżek w Pro Tools, Logic Pro, QLab.
- **Pułapki i ryzyka:** Pozwolenie na modyfikację zablokowanej ścieżki przez komendy zbiorcze (np. Delete Time) .
- **Pragmatyczne wdrożenie w StageSync:** Dodanie flagi `locked: boolean` do schematu ścieżki (`TrackSchema`) . Gdy kłódka jest aktywna, UI odrzuca wszelkie zdarzenia wskaźnika (drag, split, delete), a mutations serwerowe odrzucają próby edycji danego ID ścieżki .

---

### 6.1.0 — Live Show Automation & DMX

#### Kompensacja Opóźnień na Pojedynczych Ścieżkach (Track Delays)

- **Problem i cel:** Różne tory audio (np. bezprzewodowe odsłuchy douszne IEM, cyfrowe przetworniki DAC, wyjścia sprzętowe) oraz wtyczki posiadają różną latencję fizyczną . Niektóre ścieżki lub klik mogą grać o kilka milisekund z przodu lub z tyłu, niszcząc osadzenie rytmiczne (groove) .
- **Wartość produktowa:** Should-Have / Must-Have w profesjonalnych systemach estradowych.
- **Inspiracje rynkowe:** Ableton Live Track Delay (regulacja w ms lub próbkach).
- **Pułapki i ryzyka:** Ujemne opóźnienia wymagające przetwarzania z wyprzedzeniem (lookahead); trzaski przy regulacji wartości w trakcie odtwarzania .
- **Pragmatyczne wdrożenie w StageSync:** Dodanie parametru `delayMs` (-100 ms do +500 ms) w koncepcji ścieżki . W silniku WebAudio parametr ten jest aplikowany bezpośrednio do przesunięcia czasowego w wywołaniu `bufferSourceNode.start(when + delayMs)` lub przez linie opóźniające `DelayNode` .

#### Dedykowana Warstwa Sterowania Oświetleniem DMX / Art-Net

- **Problem i cel:** Zespoły występujące bez własnego oświetleniowca potrzebują automatycznej synchronizacji światła (zmiany scen, strobo, stroboskopy, dimmery) z ośią czasu utworu i podkładem audio .
- **Wartość produktowa:** Must-Have dla zautomatyzowanych widowisk.
- **Inspiracje rynkowe:** Cues DMX w QLab, Ableton Live + Lightkey/Beam, Showtacle.
- **Pułapki i ryzyka:** Gwałtowny spadek wydajności sieci Wi-Fi/LAN z powodu nadmiernego wysyłania ramek Art-Net (standardowo 44 Hz na uniwersum); opóźnienia w klatkach światła względem dźwięku .
- **Pragmatyczne wdrożenie w StageSync:** Dodanie dedykowanej warstwy `dmx` na osi czasu . Serwer Node uruchamia natywny, lekki proces UDP wysyłający pakiety Art-Net do skonfigurowanych adresów IP uniwersów z częstotliwością 30 Hz, zsynchronizowany ściśle z zegarem SSOT bez obciążania głównego wątku UI .

---

### 6.2.0 — Pre-flight & Hardware Setup

#### Warstwa Abstrakcji Sprzętu MIDI (Rig Manager)

- **Problem i cel:** Przeniesienie projektu ze studia (gdzie sterownik nazywa się np. "Keyboard Korg") na scenę (gdzie używana jest konsoleta "iConnectivity PlayAUDIO12") zrywa wszystkie przypisania MIDI w projekcie .
- **Wartość produktowa:** Must-Have dla mobilnych i koncertowych zestawów sprzętowych.
- **Inspiracje rynkowe:** MainStage Concert Aliases, Gig Performer Rig Manager.
- **Pułapki i ryzyka:** Brak ostrzeżenia o braku fizycznego urządzenia wyjściowego skutkujący cichym niepowodzeniem wysyłki komend PC/CC na koncertach .
- **Pragmatyczne wdrożenie w StageSync:** Wprowadzenie aliasów sprzętowych (np. Alias `STAGE_KEYS` przypisany do fizycznego portu `iConnect MIDI 1`) . Projekty odwołują się wyłącznie do aliasów . Zmiana fizycznego urządzenia w panelu Rig Manager przepina routing dla wszystkich projektów jednocześnie .

#### Tryb Przypisywania Kontrolerów (MIDI Learn)

- **Problem i cel:** Ręczne wpisywanie numerów kanałów i kontrolerów CC dla pokręteł miksera lub przycisków nożnych jest powolne i omylne .
- **Wartość produktowa:** Must-Have dla szybkiej konfiguracji sprzętu.
- **Inspiracje rynkowe:** Ableton Live MIDI Map Mode, MainStage MIDI Learn.
- **Pułapki i ryzyka:** Przypadkowe przechwycenie niepożądanych komunikatów (np. zegara MIDI Clock lub Pitch Bend) podczas próby mapowania pokrętła .
- **Pragmatyczne wdrożenie w StageSync:** Aktywacja stanu `MIDI_LEARN` . Kliknięcie parametru UI (np. Fader Głośności) oraz poruszenie fizycznym kontrolerem MIDI automatycznie przypisuje kanał i numer CC do danej kontrolki, po czym system wychodzi z trybu nauki .

#### Tuner Instrumentalny w Widoku Performera

- **Problem i cel:** Muzycy na scenie (gitarzyści, smyczkowcy) muszą szybko i cicho zestroić instrumenty między utworami, bez konieczności korzystania z osobnych urządzeń podłogowych czy aplikacji na telefonie .
- **Wartość produktowa:** Should-Have. Wygoda dla wykonawców scenicznych na tabletach (`/client`) .
- **Inspiracje rynkowe:** MainStage Tuner Display, Pinguin Tuner.
- **Pułapki i ryzyka:** Obciążenie procesora tabletu ciągłym wyliczaniem FFT; brak dostępu do mikrofonu/wejścia audio w przeglądarce mobilnej przez brak uprawnień .
- **Pragmatyczne wdrożenie w StageSync:** Wbudowany w `/client` moduł WebAudio `AnalyserNode` z szybkim algorytmem detekcji częstotliwości (Autocorrelation/YIN) uruchamianym w `AudioWorklet` . Czytelny wskaźnik wizualny aktywuje się automatycznie podczas pauzy w setliście .

#### Globalne Nadpisania Wysyłek Sygnałów (Override Controls)

- **Problem i cel:** Podczas próby lub awarii konkretnego syntezatora realizator potrzebuje czasowo zablokować wysyłanie komend Program Change (PC) lub sygnałów DMX, aby nie zmieniać brzmień w sprzęcie bez modyfikacji samych projektów .
- **Wartość produktowa:** Should-Have dla bezpieczeństwa reżyserii show.
- **Inspiracje rynkowe:** QLab Override Controls, MainStage Global Mute.
- **Pułapki i ryzyka:** Zapomnienie o aktywnym nadpisaniu przed startem koncertu (muzyk gra na złym brzmieniu) .
- **Pragmatyczne wdrożenie w StageSync:** Panel "Override Matrix" w Admin Host . Włączenie nadpisania (np. `Mute Outgoing PC`) stawia globalną bramkę filtrującą w wyjściowych sterownikach serwera, sygnalizowaną czerwoną ikoną ostrzegawczą na wszystkich ekranach .

#### Zbiorczy Raport Gotowości Setlisty (Setlist Pre-flight Check)

- **Problem i cel:** Wyjście na scenę z niekompletnym projektem (brakujące pliki audio, niezamrożone wtyczki VST, brak mapowania MIDI) grozi kompromitacją w trakcie koncertu .
- **Wartość produktowa:** Must-Have dla pancernej niezawodności scenicznej .
- **Inspiracje rynkowe:** Procedury Pre-flight w lotnictwie i systemach nadawczych (Broadcast), QLab Warnings Panel.
- **Pułapki i ryzyka:** Fałszywe alarmy blokujące możliwość odtworzenia koncertu w warunkach awaryjnych .
- **Pragmatyczne wdrożenie w StageSync:** Zbiór automatycznych testów wykonywanych przed wejściem w Tryb Live :
  1. Weryfikacja obecności wszystkich plików WAV na dysku w `data/projects/<id>/assets/` .
  2. Weryfikacja zamrożenia (Freeze) wszystkich ścieżek VST .
  3. Sprawdzenie obecności urządzeń w Rig Managerze .
  4. Walidacja poprawności map tempa i metrum .
     Wynik wyświetla zielony status "READY" lub listę krytycznych braków z przyciskami naprawczymi .

---

### 6.3.0 — Karaoke & Jukebox

#### Moduł Publiczny LAN (`/karaoke` & `/request`)

- **Problem i cel:** Lokale rozrywkowe, imprezy firmowe i koncerty interaktywne wymagają możliwości zamawiania piosenek przez publiczność z własnych telefonów oraz podglądu tekstu bez dostępu do sieci Internet .
- **Wartość produktowa:** Nice-to-Have / Should-Have (Ekspansja w rynek komercyjny Jukebox/Event) .
- **Inspiracje rynkowe:** KaraFun public request system, TouchTunes.
- **Pułapki i ryzyka:** Ataki Denial of Service (spamowanie zamówień) w lokalnej sieci Wi-Fi; przypadkowe przejęcie kontroli nad transportem przez osoby z widowni .
- **Pragmatyczne wdrożenie w StageSync:** Dedykowane publiczne widoki `/karaoke` i `/request` serwowane przez lokalny serwer Web . Publiczność ma dostęp wyłącznie do odseparowanego API z ograniczeniem przepustowości (Rate-Limiting) . Zamówienia trafiają do bufora moderacji w panelu Admina, skąd realizator jednym kliknięciem zatwierdza ich dodanie do setlisty .

---

## 3. Linia 7.x — Integrated Notation & Enterprise Rig

### 7.0.0 — Integrated Notation Studio (MAJOR RELEASE)

#### Podstawowa Edycja i Korekta Nut (Studio Notation Edit)

- **Problem i cel:** Wykrycie drobnego błędu w partyturze MusicXML na próbie (np. zła nuta w partii dęciaków, zły znak chromatyczny) wymaga zamknięcia programu, otwarcia Sibeliusa/MuseScore, edycji, eksportu i ponownego importu .
- **Wartość produktowa:** Must-Have (Dla pracujących z partyturami w trybie Studio) .
- **Inspiracje rynkowe:** Wbudowany edytor w MuseScore, Dorico, Sibelius.
- **Pułapki i ryzyka:** Budowa edytora nut jest skomplikowana; uszkodzenie struktury XML może uniemożliwić wyrenderowanie partytury przez OpenSheetMusicDisplay (OSMD) .
- **Pragmatyczne wdrożenie w StageSync:** Lekki edytor strukturalny działający na drzewie XML DOM w **Trybie Studio** . Umożliwia prostą korektę wysokości nut (strzałki góra/dół), czas trwania, dodawanie akcentów oraz zmianę akordów tekstowych . Zmiany zapisują się bezpośrednio do pliku MusicXML i od razu odświeżają wyrenderowany SVG w oknie partytury .

---

### 7.1.0 — Enterprise Rig & OSC

#### Podgląd Logów MIDI / OSC w Czasie Rzeczywistym

- **Problem i cel:** Diagnozowanie problemów z komunikacją między kontrolerami, mikserami cyfrowymi a StageSync na scenie wymaga instalowania zewnętrznych narzędzi (MIDI Monitor, Wireshark) .
- **Wartość produktowa:** Should-Have dla inżynierów systemowych i techników sceny .
- **Inspiracje rynkowe:** QLab OSC Console, Gig Performer MIDI Log.
- **Pułapki i ryzyka:** Zalewanie interfejsu użytkownika tysiącami komunikatów (np. z zegara MIDI Clock lub pedału ekspresji) powodujące zamrożenie przeglądarki DOM .
- **Pragmatyczne wdrożenie w StageSync:** Okno diagnostyczne z wirtualizowaną listą renderowania (`react-window`) . Podgląd przechwytuje zdarzenia bezpośrednio ze sterowników serwera via WebSocket, oferując filtrowanie według typu (PC, CC, OSC, Clock) oraz możliwość wstrzymania (Pause) i eksportu logów do pliku tekstowego .

#### Redundancja i Integracja Mikserów (OSC Matrix & Zero-Glitch HA)

- **Problem i cel:** Na dużych koncertach awaria głównego komputera (Master) nie może spowodować przerwania dźwięku . System wymaga bezszwowego przełączenia na komputer zapasowy (Spare) oraz automatycznego sterowania mikserami cyfrowymi (X32/M32/SQ) .
- **Wartość produktowa:** Must-Have dla rynku koncertowego Enterprise .
- **Inspiracje rynkowe:** Autorskie systemy redundancji PlayAUDIO12, QLab Redundancy, Mixing Station OSC integration.
- **Pułapki i ryzyka:** Sytuacja typu Split-Brain (obydwa komputery uważają się za Mastera i wysyłają sprzeczne komendy do mikserów); mikro-rozszerzenia czasowe przy przełączaniu .
- **Pragmatyczne wdrożenie w StageSync:**
  1. **OSC Matrix:** Moduł wysyłający natywne pakiety UDP OSC (`/ch/01/mix/fader`, `/scene/recall`) do mikserów cyfrowych zmapowane pod sekcje utworu lub setlistę .
  2. **Zero-Glitch HA:** Dwukierunkowy protokół heartbeat po dedykowanej krosowanej skrętce Ethernet między serwerami Master i Spare . Serwer Spare znajduje się w stanie ciągłej synchronizacji pasywnej (wyjścia audio/MIDI wyciszone) . W przypadku zaniku sygnału heartbeat z Mastera przez ponad 50 ms, Spare błyskawicznie aktywuje swoje wyjścia fizyczne bez zatrzymywania zegara transportu .

---

## Podsumowanie i Wskazówki Wdrożeniowe dla Zespołu Inżynieryjnego

Przedstawiona roadmapa 5.5.0 – 7.1.0 stanowi przemyślany ciąg ewolucyjny: od szlifowania ergonomii interfejsu i stabilizacji WebAudio w linii 5.x, przez fundamentalną zmianę architektoniczną w wersji 6.0.0 (Dual Engine z nakazem zamrażania VST/AU), aż po zaawansowane funkcje automatyzacji DMX, edycji nut i redundancji enterprise w linii 7.x .

| Etap Ewolucyjny           | Główny Cel Architektoniczny                                 | Kluczowe Zależności Technologiczne                                                     |
| :------------------------ | :---------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **Linia 5.x (5.5 – 5.8)** | Ergonomia interfejsu i stabilizacja silnika osi czasu       | Web Workers, multi-window w Tauri, Web Locks API, parsowanie RegEx                     |
| **Linia 6.x (6.0 – 6.3)** | Dual Engine (Studio vs Live), VST Freeze, DMX i Rig Manager | Sidecar C++/JUCE, WebAudio offline PCM render, Art-Net UDP 30Hz, MIDI Aliases          |
| **Linia 7.x (7.0 – 7.1)** | Zintegrowany edytor MusicXML i automatyzacja Zero-Glitch HA | OpenSheetMusicDisplay (OSMD) XML DOM patcher, OSC UDP Sockets, Ethernet Heartbeat 50ms |

Wdrożenie każdego modułu powinno być rygorystycznie weryfikowane na testowym stoisku scenologicznym pod kątem zużycia pamięci RAM, latencji oraz zachowania spójności pojedynczego źródła prawdy czasowej (SSOT) . Zapewni to oprogramowaniu StageSync pozycję lidera na rynku nowoczesnych systemów estradowo-muzycznych .

---

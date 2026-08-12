> From: https://gemini.google.com/app/b16203d408888e91

Specyfikacja StageSync Mobile Client

# Specyfikacja Architektoniczna „Mobile Client” StageSync v5.2+ (#674)

## Kontekst Systemowy i Założenia Architektoniczne

Podsystem „Mobile Client” w architekturze StageSync v5.2+ stanowi dedykowany, lekki interfejs przeznaczony dla urządzeń mobilnych (ze szczególnym uwzględnieniem tabletów estradowych z systemem Android) używanych na scenie oraz w reżyserkach FOH . Klient mobilny realizuje wyłączną funkcję pasywnego widoku roli (Grid / Akordy, Karaoke / Tekst, Score / Partytura, Drums / Forma) . System przypisuje poszczególne identyfikatory wymagań do kluczowych obszarów funkcjonalnych architektury:

| Identyfikator | Obszar Architektury | Opis Wymagania                                                                      |
| :------------ | :------------------ | :---------------------------------------------------------------------------------- |
| **MOB-01**    | Model Widoku        | Pasywne renderowanie ról estradowych z odcięciem lokalnego syntezatora audio/MIDI . |
| **MOB-02**    | Transport SSOT      | Pobieranie pojedynczego źródła prawdy czasu wyłącznie z serwera po WebSocket .      |
| **MOB-03**    | Izolacja Powłoki    | Cienki shell mobilny pozbawiony funkcji zarządczych i sidecara lokalnego .          |
| **MOB-04**    | Dystrybucja MVP     | Hybryda PWA (`apps/web`) oraz natywnej powłoki Android bez udziału Google Play .    |

Jedynym autorytetem czasu muzycznego (Timebase SSOT) w całym systemie pozostaje serwer (`apps/server` lub proces sidecar hosta) . Klient mobilny nie generuje sygnałów metronomu, zegara MIDI ani strumieni audio . Zadaniem interfejsu mobilnego jest wyłącznie synchronizacja lokalnego wskaźnika odtwarzania (playhead) na podstawie ramek `transport_tick` przesyłanych przez serwer z wygładzaniem pozycji pomiędzy cyklami zegara przy użyciu pętli `requestAnimationFrame` (rAF) .

Aplikacja desktopowa (Tauri shell) odpowiada za cykl życia hosta, dystrybucję sygnałów mDNS oraz serwowanie kodu PWA . Klient mobilny jest w pełni odseparowany od mechanizmów wykonawczych hosta i działa w trybie końcowego odbiorcy danych wyjściowych .

## Podział Odpowiedzialności Warstwowej

Architektura klienta mobilnego opiera się na trójwarstwowym podziale odpowiedzialności, gdzie każda warstwa posiada ściśle zdefiniowane kompetencje oraz granice technologiczne . Wyklucza się stosowanie ciężkich frameworków pośrednich, opierając integrację na natywnym powiązaniu JavaScript-WebView oraz standardowych interfejsach Web API .

| Warstwa                    | Technologia                                 | Zbiór Odpowiedzialności                                                                                                                                                                                                                                                                                                 |
| :------------------------- | :------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A: Przeglądarka (PWA)**  | `apps/web` (React, CSS Modules, Canvas/SVG) | Logika widoków ról (Grid, Karaoke, Score, Drums) . Rejestracja Service Workera, cache zasobów aplikacji, wygładzanie rAF . Dekodowanie protokołu WebSocket, obsługa stanów połączenia . Wywoływanie standardowego W3C Screen Wake Lock API .                                                                            |
| **B: Powłoka WebView**     | Android `WebView` (`apps/mobile-client`)    | Kontener uruchomieniowy PWA, obsługa izolacji sesji . Przechwytywanie zdarzeń nawigacji i błędów sieciowych . Wymuszenie sprzętowej akceleracji renderowania HTML5/Canvas . Przekazywanie komend do natywnego bridge'a Androida .                                                                                       |
| **C: Natywne API Android** | Kotlin / Natywne API Android SDK            | Ustawienie flagi `FLAG_KEEP_SCREEN_ON` na poziomie okna (`Window`) . Wymuszenie trybu pełnoekranowego (Immersive Sticky Mode) . Wymuszenie blokady orientacji ekranu (Landscape / Portrait Lock) . Konfiguracja trybu Kiosk (Lock Task Mode / Android MDM patterns) . Skanowanie kodów QR i natywne rozdzielanie mDNS . |

Sprzętowa blokada wygaszania ekranu na scenie wymaga dwupoziomowego zabezpieczenia . W pierwszej kolejności warstwa PWA próbuje uzyskać blokadę za pomocą W3C Screen Wake Lock API . Jeżeli przeglądarka lub system operacyjny zwolni blokadę (np. w wyniku spadku poziomu naładowania baterii), natywna powłoka Android aktywuje trwale flagę `FLAG_KEEP_SCREEN_ON` w konfiguracyjnym obiekcie `LayoutParams` okna aplikacji . Zapewnia to odporność interfejsu na uśpienie w trakcie trwania koncertu .

Obsługa orientacji oraz blokady gestów systemowych (Kiosk Mode) inspirowana jest rozwiązaniami estradowymi takimi jak OnSong, forScore czy MobileSheets oraz aplikacjami klasy MDM (Fully Kiosk Browser) . Powłoka mobilna wymusza ukrycie paska nawigacji i paska stanu oraz blokuje gest powrotu, zapobiegając przypadkowemu zamknięciu widoku przez muzyka na scenie .

## Odkrywanie Hosta i Łączność w Sieci Estradowej

W warunkach koncertowych sieć LAN na scenie często pozbawiona jest dostępu do zewnętrznego Internetu, a punkt dostępowy Wi-Fi FOH może podlegać zakłóceniom falowym . System discovery opiera się na trzech niezależnych mechanizmach połączeniowych :

- **Skanowanie QR Code:** Powłoka natywna skanuje kod QR wyświetlony na ekranie hosta lub wydrukowany na stanowisku FOH, uzyskując natychmiastowy adres URL ze skrojonym tokenem dostępowym .
- **Rozpoznawanie mDNS:** Powłoka przegląda serwis `_stagesync._tcp` w lokalnej podsieci, automatycznie identyfikując dostępne instancje serwera .
- **Ręczny URL / IP:** Direct URL Fallback pozwalający na ręczne wpisanie adresu IP oraz portu (np. `http://192.168.1.50:4000`), zapewniający łączność w przypadku awarii usług multicastowych .

| Kryterium / Scenariusz              | Skanowanie QR Code                        | Wykrywanie mDNS                              | Ręczny URL / IP                        |
| :---------------------------------- | :---------------------------------------- | :------------------------------------------- | :------------------------------------- |
| **Wymóg natywnej powłoki**          | Kamera natywna lub WebCam API .           | Natywny resolver mDNS lub mDNS browser PWA . | Brak (działa w czystej przeglądarce) . |
| **Działanie bez WAN (Offline LAN)** | Pełne (kod QR zawiera lokalny IP) .       | Pełne (wymaga obsługi multicast w AP) .      | Pełne (bezpośredni ruch IP) .          |
| **Odporność na izolację AP**        | Wysoka .                                  | Średnia (niektóre AP blokują Multicast) .    | Bardzo wysoka .                        |
| **Czas nawiązania połączenia**      | Poniżej 2 sekund .                        | Od 1 do 4 sekund .                           | Zależny od czasu wpisania adresu .     |
| **Obsługa w czystym PWA**           | Wymaga dostępu do kamery w przeglądarce . | Ograniczona do odpowiedzi z serwera .        | Pełna .                                |

W przypadku utraty połączenia WebSocket klient automatycznie przechodzi w tryb ponawiania połączenia (wykorzystując algorytm opóźnienia ponowień z ograniczeniem górnym) oraz wyświetla ostrzegawczy baner stanu łączności . Interfejs widoku zachowuje ostatnio odebraną pozycję utworu, unikając zerowania widoku akordów czy partytury .

## Granice Funkcjonalne MVP i Wykluczenia

Zakres wydania MVP dla klienta mobilnego (etap 5.2+) został poddany rygorystycznemu ograniczeniu funkcji w celu zagwarantowania maksymalnej stabilności i niskiemu zużyciu zasobów .

Do zakresu MVP wchodzą wyłącznie pasywne widoki ról (Grid, Karaoke, Score, Drums), odbiór transportu SSOT z serwera, ekran wyboru roli i nazwy klienta, powłoka Android Kiosk z obsługą QR/mDNS oraz podstawowe konfiguracyjne ustawienia wyglądu, stroju instrumentu i transpozycji .

Z zakresu MVP wyklucza się całkowicie edycję osi czasu (Timeline) i ścieżek, mikser audio oraz zarządcze sterowanie miksem odsłuchów, natywny Host MIDI i generowanie zegara muzycznego, procesor aktualizacji Tauri Updater na urządzeniu mobilnym, lokalny silnik syntezy audio oraz architekturę pełnego węzła z procesem sidecar Node.js .

Wykluczenie edycji osi czasu oraz miksera audio zapobiega przypadkowemu zaburzeniu parametrów koncertowych z poziomu tabletów muzyków . Klient mobilny w MVP posiada wyłączone uprawnienia edycji struktury, zachowując jedynie opcję przekazywania sygnałów obecności (`client_hello`) i notatek podręcznych (np. notatki perkusyjne lub znaczniki Tap Wokalu, o ile włączono edycję w opcjach Live Desk) .

Host MIDI, routing wyjść audio oraz automatyczne aktualizacje natywnego kodu (Tauri/Android updater) pozostają wyłączną domeną stacji centralnej oraz konsoli operatora .

## Wydajność Renderowania, rAF i Optymalizacja Zasilania

Jednym z kluczowych wyzwań wydajnościowych zidentyfikowanych w audycie architektury jest problem wywoływania stanu `setDisplayTicks` co klatkę pętli `requestAnimationFrame` (tzw. problem H-01) . W urządzeniach mobilnych z ekranami o częstotliwości odświeżania 90 Hz lub 120 Hz, powiadamianie całego drzewa Reacta o zmianie pozycji w cyklu 120 FPS prowadzi do przeciążenia procesora, utraty klatek oraz przyspieszonego drenażu baterii .

W celu wyeliminowania wąskiego gardła wydajności na urządzeniach mobilnych wprowadza się odseparowaną architekturę subskrypcji pozycji odtwarzania :

- **Rozdzielenie Kontekstu Transportu (Split Context):** Pętla rAF w `TransportProvider` nie modyfikuje globalnego stanu Reacta (`useState`) co klatkę renderingu . Zamiast tego wartość wygładzonej pozycji zapisu zapisywana jest w mutowalnym obiekcie referencji `useRef`, a komponenty wymagające płynnego przesunięcia (np. kursor partytury OSMD lub paski postępu) subskrybują bezpośrednio zdarzenie renderowania pętli .
- **Throttling Stanu Ogólnego:** Aktualizacja stanu `displayTicks` w drzewie komponentów Reacta zostaje ograniczona (throttled) do częstotliwości odpowiadającej pojedynczemu tyknięciu metronomu lub do wartości 15–30 FPS dla elementów tekstowych widoku Grid i Karaoke .
- **Optymalizacja Renderowania Partytury (OSMD):** W widoku `ScorePane` całkowity re-render SVG (`osmd.render()`) jest zabroniony podczas zwykłego upływu czasu odtwarzania . Pozycjonowanie odbywa się wyłącznie poprzez modyfikację transformacji CSS elementu HTML kursora (`cursorElement.style.transform`), natomiast pełne przeliczenie układu nut jest opóźniane (debounce 120 ms) i wykonywane jedynie przy zmianie współczynnika powiększenia (zoom) lub transpozycji .
- **Obsługa `prefers-reduced-motion`:** W przypadku wykrycia w systemie flagi ograniczenia ruchu, animacje przejścia akordów w widoku Grid oraz płynne przewijanie widoku Karaoke są wyłączane na rzecz natychmiastowych skoków pozycji .
- **Zarządzanie Termiką i Baterią:** Podczas pracy na zasilaniu akumulatorowym przy wykryciu wzrostu temperatury urządzenia, częstotliwość odświeżania pętli interpolacji zostaje automatycznie zredukowana do stałych 30 FPS, co zapobiega zjawisku dławienia termicznego procesora (thermal throttling) pod oświetleniem scenicznym .

## Model Bezpieczeństwa i Zaufania w Sieci LAN

Aplikacja mobilna przeznaczona do pracy estradowej zapewnia pełną izolację sekretów oraz deterministyczny model zaufania w lokalnym środowisku sieciowym .

Komunikacja opiera się na bezpośrednim połączeniu klienta mobilnego z serwerem hosta w lokalnej podsieci LAN . Klient nie przechowuje kluczy API, a host weryfikuje nagłówki pod kątem rozbieżności wersji oprogramowania .

| Element Bezpieczeństwa          | Mechanizm Realizacji                                                                                                                                                                                                             |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Brak Sekretów w APK**         | Plik `.apk` zawiera wyłącznie skompilowany kod natywnej powłoki Android oraz statyczne zasoby PWA. Wszystkie dane dostępowe i tokeny autoryzacyjne są przydzielane dynamicznie podczas parowania z hostem .                      |
| **Zaufanie w Podsieci LAN**     | Komunikacja opiera się na protokołach HTTP oraz WebSocket. W strefie zamkniętej sieci estradowej nie wymaga się certyfikatów CA dla HTTPS, zapobiegając błędom wygaśnięcia certyfikatu bez dostępu do Internetu .                |
| **Kontrola Wersji (Handshake)** | Podczas nawiązywania połączenia WS klient wysyła nagłówek wersji. W przypadku wykrycia rozbieżności wersji (`VERSION_MISMATCH`), aplikacja wyświetla ostrzeżenie dla operatora, lecz nie blokuje wyświetlania widoku pasywnego . |
| **Izolacja Uprawnień**          | Klient mobilny nie posiada możliwości wykonania poleceń zamknięcia hosta (`shutdown`) ani przeładowania systemu (`restart`), które są zastrzeżone dla wywołań lokalnych lub autoryzowanych tokenem Bearer .                      |

## Pakietowanie, Dystrybucja i Ścieżka Aktualizacji

Dystrybucja aplikacji mobilnej StageSync w wydaniu MVP całkowicie omija oficjalny sklep Google Play Store, co pozwala na niezależność od procesów weryfikacji oraz pracę w środowiskach zamkniętych .

Proces kompilacji w repozytorium GitHub uruchamia automatyczne przepływy CI, budując plik instalacyjny APK z modułu `apps/mobile-client` . Gotowe pliki są przekazywane do serwera hosta oraz publikowane w GitHub Releases .

Zasoby instalacyjne pakietu Android (`.apk`) są serwowane bezpośrednio przez wbudowany serwer HTTP hosta ze ścieżki `/downloads/stagesync-client.apk` oraz publikowane w sekcji GitHub Releases danego wydania . Urządzenie mobilne po połączeniu z punktem dostępowym hosta może pobrać i zainstalować pakiet poprzez zeskanowanie kodu QR wyświetlanego w sekcji Host aplikacji desktopowej .

Proces aktualizacji oprogramowania na tabletach estradowych odbywa się w trybie ręcznym lub półautomatycznym. Podczas nawiązania połączenia z serwerem, klient mobilny sprawdza sumę kontrolną pakietu oferowanego przez host. W przypadku dostępności nowszej wersji na ekranie ustawień pojawia się przycisk bezpośredniego pobrania pliku APK, eliminując potrzebę korzystania ze zewnętrznych sklepów z aplikacjami .

## Akceptacja Operatorska, Zasadnicze Zakazy i Mapowanie Plików

Proces weryfikacji oprogramowania opiera się na precyzyjnych kryteriach odbioru przez operatora FOH, wyeliminowaniu błędów konstrukcyjnych oraz dokładnym mapowaniu struktur plików .

### Kryteria Akceptacji Operatorskiej

1. **Stabilność Połączenia FOH:** Tablet połączony przez Wi-Fi z serwerem zachowuje ciągłość odczytu playhead przy opóźnieniach sieciowych do 150 ms, bez widocznych skoków tekstu lub akordów .
2. **Odporność na Uśpienie:** Ekran tabletu pozostaje nieprzerwanie włączony w pełnej jasności przez co najmniej 4 godziny ciągłej pracy w widoku roli .
3. **Szybkie Re-Connection:** Po wymuszonym rozłączeniu Wi-Fi i ponownym połączeniu, widok klienta powraca do stanu synchronizacji w czasie poniżej 1,5 sekundy od odzyskania pakietów IP .
4. **Poprawność Transpozycji:** Zmiana stroju instrumentu (np. B♭ lub E♭) lub transpozycji zespołu w ustawieniach globalnych jest aplikowana w widokach Grid i Score w czasie mniejszym niż 200 ms .

### Zasadnicze Zakazy Architektoniczne (NIE-ROBIĆ)

- Zakaz stosowania obudów hybrydowych typu Capacitor/Cordova z domyślnym przeświadczeniem, że rozwiązują one problemy dostępu do natywnego API .
- Zakaz uruchamiania syntezatorów audio, zegara muzycznego ani instancji wyjść MIDI w procesie klienta mobilnego .
- Zakaz uzależniania procesu dystrybucji lub aktualizacji powłoki Android od usług Google Play Services lub sklepu Google Play Store .
- Zakaz zezwalania na modyfikację struktury Timeline, parametrów miksera lub globalnych ustawień routingu z poziomu pasywnego widoku klienta mobilnego w MVP .
- Zakaz wykonywania pełnego re-renderu struktury SVG partytury OSMD na każdą ramkę animacji interpolacji playhead .

### Mapowanie Plików Monorepo

| Ścieżka Pliku / Modułu                                                                                        | Opis Roli i Odpowiedzialności w Architekturze Mobilnej                                           |
| :------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------- |
| `apps/web/src/components/ClientShell.tsx`                                                                     | Główna powłoka PWA klienta mobilnego; logika wyboru ról, nagłówek statusu, obsługa preferencji . |
| [`apps/web/src/transport/TransportProvider.tsx`](../../../../../apps/web/src/transport/TransportProvider.tsx) | Dostawca kontekstu transportu; obsługa pętli rAF, odbiór ramek WS i kalkulacja latency .         |
| `apps/web/src/lib/scoreOsmd.ts`                                                                               | Pomocnicze funkcje renderowania i kontroli kursora partytury OpenSheetMusicDisplay .             |
| [`apps/desktop/launcher/app.js`](../../../../../apps/desktop/launcher/app.js)                                 | Logika discovery mDNS, obsługa list ostatnich hostów i prezentacja kodów QR .                    |
| `apps/mobile-client/`                                                                                         | Dedykowany projekt natywnej powłoki Android (Kotlin, Android WebView Wrapper, Kiosk Mode) .      |
| `packages/shared/`                                                                                            | Schematy Zod protokołu transportu, typy ról, przeliczniki pozycji BBT i transpozycji .           |
| `packages/ui/`                                                                                                | Wspólne komponenty interfejsu użytkownika (przyciski, przełączniki, wskaźniki połączenia) .      |

## Podsumowanie Architektoniczne

Specyfikacja oprogramowania „Mobile Client” StageSync v5.2+ (#674) tworzy spójne i bezpieczne środowisko dla pasywnych widoków estradowych na urządzeniach mobilnych . Rozdzielenie autorytetu czasu na serwerze od wygładzania obrazu na tablecie gwarantuje bezawaryjność operacyjną nawet w trudnych warunkach łączności bezprzewodowej na scenie . Odrzucenie zewnętrznych sklepów z aplikacjami na rzecz bezpośredniej dystrybucji z hosta czyni ze StageSync w pełni samowystarczalny system dla profesjonalnych zastosowań koncertowych .

---

Powered by [AI Exporter](https://saveai.net)

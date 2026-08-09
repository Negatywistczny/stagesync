> From: https://gemini.google.com/app/827bda85b026a841

Ocena Modelu Cues Sampler

# Ocena Architektoniczna i Raport Przeglądu Modelu Cues Sampler w Systemie StageSync (CRIT-CSMP-01)

## Wstęp i Kontekst Dziedzinowy

Wprowadzenie modułu Cues Sampler w linii rozwojowej StageSync v5.2+ (zagadnienie #430) stanowi kluczowy krok w ewolucji platformy z prostego odtwarzacza wielościeżkowego do zintegrowanego środowiska automatyki koncertowej FOH (Front of House) . Dotychczasowa rola ścieżki Cues w systemie ograniczała się do funkcji wizualno-komunikacyjnych, polegających na generowaniu banerów oraz ostrzeżeń tekstowych na pulpitach wykonawczych muzyków (widoki Karaoke, Grid, Score, Drums) . Wzbogacenie tej warstwy o możliwość odpalania próbkowego materiału audio, takiego jak efekty one-shot, jingle, zliczenia akustyczne czy zapowiedzi lektorskie, nakłada na architekturę wymóg bezwzględnej spójności z przyjętym aksjomatem pojedynczego źródła prawdy czasowej (Timebase SSOT) opartym na liczbach całkowitych ticków i stałej rozdzielczości PPQ .

Przeprowadzona ewaluacja decyzji projektowych bazuje na rygorystycznych zasadach architektury systemu StageSync:

1. Brak atrap i stubów w interfejsie użytkownika: Zgodnie z ADR 0011, funkcje nieposiadające pełnego wsparcia w silniku nie mogą posiadać atrapy w UI (brak kontrolek oznaczonych jako `disabled` na zapas, nieaktywnych przycisków czy fikcyjnych szyn wyjściowych) .
2. Referencja DAW i stałość decyzji produktowych: Według ADR 0015, pierwszym punktem referencyjnym dla mechanik edycji jest Logic Pro, a decyzją produktową przyjętą jako wiążącą jest wprowadzenie fizycznych wyjść wielokanałowych Multi-out (Out 3–4+) .
3. Priorytet FOH i determinizm: System sceniczny musi zapobiegać sytuacjom wyścigu (race conditions) i bezwzględnie przedkładać intencję operatora nad automatykę sceniczna .

## Analiza Abstrakcji: Cue + Sample vs QLab Audio Cue

Podstawowym pytaniem architektonicznym przy projektowaniu modułu #430 jest wybór właściwej abstrakcji dla zdarzenia dźwiękowego. W środowiskach estradowych i stacjach DAW stosuje się odmienne modele odtwarzania próbek . QLab opiera się na pływających zdarzeniach audio powiązanych z czasem zegarowym (wall-clock) oraz matrycami wyjść . Ableton Live wykorzystuje kwantyzowane wyzwalanie klipów w widoku Session, powiązane z siatką tempa utworu . MainStage przypisuje wyzwalacze próbek bezpośrednio do sekcji patcha lub markerów .

| Cecha / Wymiar           | QLab (Audio Cue)                                | Ableton Live (Clip Launch)               | MainStage (Playback / Trigger)         | StageSync (CueClip + Sample)                       |
| ------------------------ | ----------------------------------------------- | ---------------------------------------- | -------------------------------------- | -------------------------------------------------- |
| **Oś czasu / Czas**      | Bezkwantowy czas zegarowy (wall-clock, sekundy) | Siatka takty/miary (Tempo Map / Warp)    | Sekcje patcha / Markery utworu         | **Integer Ticks SSOT + PPQ** (Siatka utworu)       |
| **Relacja tekst-dźwięk** | Rozdzielona (Text Cue vs Audio Cue w grupie)    | Brak natywnego tekstu (Etykieta klipu)   | Brak natywnego tekstu (Notatki patcha) | **Zespolona** (Opis tekstowy + `CueSampleConfig`)  |
| **Topologia struktur**   | Drzewiasta (Nested Groups, Target Links)        | Macierzowa (Ścieżki x Sceny)             | Hierarchiczna (Set > Patch > Strip)    | **Liniowa** (Jednowymiarowa ścieżka Cues)          |
| **Targeting wyjść**      | Matryca audio (Matrix Routing n x m)            | Track / Bus / Master / Direct HW Out     | Auxiliary Busses / Direct HW Out       | **Master / Bus** (Obecny model) / _HW Out (Wymóg)_ |
| **Profil zastosowania**  | Teatr, widowiska stochastyczne, muzea           | Studio, live looping, produkcja muzyczna | Koncerty, instrumenty wirtualne        | **Koncerty estradowe z podkładami (FOH)**          |

QLab traktuje Audio Cue jako niezależny obiekt czasowy oderwany od siatki metrycznej utworu, co sprawdza się w teatrze, gdzie muzyka i efekty muszą elastycznie reagować na akcję sceniczną . W warunkach koncertowych zespołów grających z podkładami (klik, podkłady, automatyka sceniczna) taka decoupling-abstrakcja wprowadza niepotrzebny chaos operacyjny . Rozszerzenie istniejącego schematu `CueClip` o opcjonalne pole `sample?: CueSampleConfig` zamiast tworzenia osobnego `SamplerClip` jest wyjątkowo zdrową abstrakcją domeny koncertowej .

Na scenie komunikat tekstowy widoczny dla muzyka (na przykład baner „Wejście Wokal” na ekranie Karaoke/Grid) oraz akustyczne zliczenie lub impuls efekciarski pojawiają się dokładnie w tym samym punkcie czasowym (`startTicks`) . Rozdzielenie baneru i sampla na dwa osobne obiekty osi czasu wymuszałoby synchronizację dwóch niezależnych klipów przy każdym przesunięciu edycyjnym, generując ryzyko błędu desynchronizacji . Ponadto ograniczenie liczby dedykowanych ścieżek na Timeline zapobiega tłokowi wizualnemu, co jest kluczowe na ekranie roboczym FOH, a klipy Cue pozbawione sekcji `sample` zachowują się w 100% identycznie jak w wersjach wcześniejszych .

## Szczegółowa Ewaluacja Decyzji Architektonicznych

### Decyzja 1: Sample jako Atrybut CueClip

Rekomendacja dotycząca pierwszej decyzji to **KEEP**. Decyzja o przypisaniu sampla bezpośrednio do `CueClip` jest w pełni uzasadniona merytorycznie. Model danych w [`schema.ts`](../../../../packages/shared/src/schema.ts) poprawnie zagnieżdża `CueSampleConfigSchema` jako opcjonalny atrybut klipu Cue . Uniknięto w ten sposób sztucznego mnożenia warstw osi czasu i skomplikowanych mechanizmów grupowania znanych z oprogramowania teatralnego . Zarówno funkcje edycyjne (`setCueClipSample` w [`cueEdit.ts`](../../../../apps/web/src/lib/timeline-edit/cueEdit.ts)), jak i logiki prezentacyjne na scenie operują na wspólnym identyfikatorze `startTicks` .

### Decyzja 2: Zakres MVP (One-shot / Gated) vs Funkcje Odłożone

Rekomendacja dla zakresu funkcjonalnego to **KEEP** dla granic MVP oraz **REVISE** dla struktury schematu w kontekście polifonii. Granica funkcjonalna MVP została wyznaczona prawidłowo pod kątem potrzeb koncertowych. Tryby `one-shot` (odtworzenie pełnego pliku audio od `startTicks`) oraz `gated` (przycięcie wybrzmiewania do długości klipu `lengthTicks`) pokrywają przeważającą większość zastosowań estradowych . Odłożenie zaawansowanej transpozycji (`pitch`), pętli (`loop`) oraz natywnego sterowania wielogłosowością do późniejszych wydań jest racjonalne z punktu widzenia dojrzałości silnika .

Wykryto jednak pewną niespójność na poziomie kodu. Mimo że triage określa polifonię jako zakres odłożony , pole `polyphony: z.enum(["retrigger", "choke"])` zostało już wprowadzone do schematu Zod `CueSampleConfigSchema` oraz wsparte w helperze edycyjnym `setCueClipSample` . Jest to właściwe działanie na poziomie schematu danych (zabezpieczenie kontraktu), lecz w interfejsie użytkownika Inspectora funkcja ta nie może tworzyć atrap ani zablokowanych kontrolek przed pełnym wdrożeniem w silniku WebAudio, co bezpośrednio nakazuje ADR 0011 .

### Decyzja 3: Routing Sampla Wyłącznie do Master | Bus

Rekomendacja w kwestii routingu to **REVISE** (krytyczna zmiana architektoniczna). Decyzja o stałym ograniczeniu routingu samplera wyłącznie do sumy `Master` lub szyny grupy `Bus` (`CueSampleOutputSchema`) pozostaje w bezpośredniej sprzeczności z oficjalną decyzją produktową zawartą w ADR 0015, która jednoznacznie nakazuje wprowadzenie fizycznych wyjść wielokanałowych Multi-out (Out 3–4+) .

W praktyce koncertowej próbki wyzwalane ze ścieżki Cues bardzo często pełnią rolę krotek odsłuchowych (akustyczne odliczanie kierowane wyłącznie do uszu muzyków na fizyczny Out 3–4) lub niezależnych sygnałów dla realizatora z pominięciem sumy głównej . Wymuszanie przepięcia sampla przez szynę grupy (`AudioBus`), która następnie musiałaby zostać skierowana na fizyczne wyjście, tworzy niepotrzebne skomplikowanie miksera i marnuje dostępne szyny grupowe .

Zapewnienie spójności modelu wymaga, aby `CueSampleOutputSchema` przyjmował dokładnie tę samą unię celów wyjściowych co ścieżki audio (`AudioTrackSchema`), to jest wspierał `{ kind: "hw_out", hwOutputId: string }` . Zgodnie z ADR 0011 oraz wnioskami z triage miksera, ochrona przed błędem powinna być realizowana na poziomie runtime w UI Inspectora: opcja wyboru wyjścia fizycznego HW Out w interfejsie musi aktywować się wyłącznie wtedy, gdy podłączony interfejs audio zwraca w profilu `destination.maxChannelCount >= 4` (`hwOutputUiAllowed`) . Blokada w samym schemacie danych jest sztucznym ograniczeniem i błędem projektowym .

### Decyzja 4: Synchronizacja Czasowa i Tryby Wyzwalania

Rekomendacja dotycząca timingu to **KEEP**. Wyznaczony tryb synchronizacji czasowej doskonale łączy dwa kluczowe obszary sterowania estradowego :

- Automatyczne wyzwalanie na osi czasu w trakcie odtwarzania utworu dokładnie na ticku `startTicks` klipu (Tick SSOT) .
- Ręczny impuls FOH (GO Pad) z obsługą kwantyzacji do najbliższej miary taktu (`next-beat`) na podstawie `meterMap` dla płynnego dogrywania efektów w tempie utworu oraz tryb natychmiastowy (`immediate`) dla bezkwantowych wyzwoleń hot-key czy procedur awaryjnych .

Model poprawnie operuje na konwersji jednostek czasu i zapobiega niepożądanemu ponownemu wyzwalaniu jednorazowych próbek one-shot przy operacjach seek/scrubbing po osi czasu .

### Decyzja 5: Obsługa Zachowania Post-stop oraz Procedury Panic

Rekomendacja dla zachowania post-stop i panic to **KEEP**. Opcja `playPostStop: true` (fire-and-forget) jest niezbędnym narzędziem na scenie, pozwalającym na wybrzmienie efektu lub zapowiedzi po zatrzymaniu transportu głównego utworu przez realizatora FOH . Procedura PANIC (wyzwalana komendą z konsoli FOH lub podwójnym wciśnięciem STOP) bezwarunkowo wycisza i rozłącza wszystkie odtwarzane próbki, w tym obiekty z flagą `playPostStop` . Specyfikacja prawidłowo wymaga zastosowania 5-milisekundowej liniowej rampy wyciszającej przed odłączeniem węzłów WebAudio, co eliminuje groźne dla systemu nagłośnieniowego kliknięcia i trzaski cyfrowe .

## Macierz Podsumowująca Decyzje i Rekomendacje

| Nr    | Decyzja Modelowa                | Status     | Rekomendowany Kierunek Architektoniczny                                                                                                                                   | Wpływ na Kod i Schemat                                                                                                     | Zgodność z ADR                                    |
| ----- | ------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **1** | Sample w `CueClip`              | **KEEP**   | Zachować jednolitą strukturę `CueClipSchema` z opcjonalnym polem `sample` . Brak osobnych ścieżek samplera .                                                              | Baza danych V5/V6 spójna; brak architektury dual-write .                                                                   | Zgodne z ADR 0011 (prosta struktura IA) .         |
| **2** | MVP One-shot/Gated              | **KEEP**   | Ograniczyć interfejs użytkownika w 5.2 do trybów `one-shot` i `gated` . Polifonię `retrigger`/`choke` ukryć lub wdrożyć w silniku bez pokazania zablokowanych kontrolek . | Zachowane pola Zod; brak zablokowanych kontrolek w UI .                                                                    | Zgodne z ADR 0011 (zakaz stubów UI) .             |
| **3** | Routing tylko Master\|Bus       | **REVISE** | Odblokować modelowo routing HW Out. Unifikacja `CueSampleOutputSchema` z `MixerOutputDestSchema` . Wprowadzić bramkowanie warunkiem `hwOutputUiAllowed` w UI .            | Rozszerzenie Zod `CueSampleOutputSchema` o `{ kind: "hw_out" }` .                                                          | **Naprawia konflikt z ADR 0015** (Multi-out IN) . |
| **4** | Timing: Tick / Beat / Immediate | **KEEP**   | Zachować pełną obsługę trzech trybów wyzwalania w silniku i interfejsie Inspectora/GO Pad .                                                                               | Spójna obsługa w `syncAudioPlayback()` i [`stage-hub.ts`](../../../../apps/server/src/transport/stage-hub.ts) .            | Zgodne z ADR 0002 (Timebase SSOT) .               |
| **5** | Post-stop & Panic               | **KEEP**   | Bezwarunkowe zachowanie funkcji fire-and-forget z obligatoryjną rampą wyciszania 5 ms przy komendzie PANIC .                                                              | Poprawka w [`audioPlayback.ts`](../../../../apps/web/src/lib/audio/audioPlayback.ts) dla natychmiastowej rampy głośności . | Zgodne z rygorem bezpieczeństwa estradowego FOH . |

## Pytania Decyzyjne do Product Ownera

W celu domknięcia specyfikacji produktowej Cues Sampler w linii 5.2+, należy zadać Product Ownerowi następujące pytania decyzyjne:

1. Routing na wyjścia fizyczne (Multi-out vs Sampler): Czy potwierdzasz zmodyfikowanie schematu `CueSampleOutputSchema`, aby w momencie wykrycia wielokanałowej karty dźwiękowej ($maxChannelCount \ge 4$) operator FOH mógł skierować próbkę Cue bezpośrednio na fizyczne wyjście HW Out (na przykład Out 3–4 dla metronomu lub akustycznego zliczenia), bez konieczności marnowania dedykowanej szyny grupy `AudioBus` ?
2. Zachowanie ręcznego przycisku FOH GO Pad przy zatrzymanym odtwarzaniu: Czy wciśnięcie ręcznego wyzwalacza GO Pad w stanie spoczynku transportu (`Idle` / `Stop`) ma uruchamiać wyłącznie wybraną próbkę Cue w trybie fire-and-forget, czy powinno automatycznie startować główny transport utworu na osi czasu ? _(Rekomendacja architektoniczna: Uruchamiać wyłącznie próbkę bez startu głównego transportu, zapobiegając przypadkowemu ruszeniu utworu na scenie)_ .
3. Sygnatura wizualna aktywności samplera na pulpitach scenicznych: Czy w momencie odtwarzania samplera o wysokim priorytecie (`priority: "alert"`), baner tekstowy wyświetlany na ekranach muzyków (widok Client) powinien zmieniać swój stan wizualny (na przykład poprzez dedykowaną obramówkę lub pulsację), czy ma pozostać statycznym komunikatem tekstowym zgodnym z dotychczasowym `stage-cue-banner` ?
4. Strategia pre-bufferingu zasobów audio na urządzeniach mobilnych: Czy dla lżejszych urządzeń klienckich (aplikacja Performer na systemie Android) próbki audio podpięte do ścieżki Cues mają być pobierane i dekodowane w pamięci RAM w całości podczas ładowania projektu (wymóg do 256 MB RAM na projekt) , czy też odtwarzanie dźwięku samplera powinno być zarezerwowane wyłącznie dla węzła konsoli FOH / Host Desktop ?

## Wnioski i Rekomendacje Wdrożeniowe

Model Cues Sampler (#430) oparty na rozszerzeniu struktury `CueClip` o opcjonalną konfigurację `sample` jest wysoce dojrzałą i przemyślaną koncepcją architektoniczną . Rozwiązanie to w pełni odpowiada realiom pracy koncertowej, eliminując ryzyko desynchronizacji komunikatów wizualnych i akustycznych sygnałów wyzwalających .

Kluczowym zaleceniem poprawek przed zamknęciem etapu wdrożeniowego jest zniesienie twardej blokady wyjść fizycznych HW Out w schemacie danych samplera . Zapewni to pełną spójność z dyrektywą ADR 0015 dotyczącą miksera wielokanałowego oraz zapobiegnie powstawaniu długu technologicznego . Ochrona przed prezentowaniem nieaktywnych opcji wyjściowych użytkownikowi musi odbywać się dynamicznie na poziomie interfejsu użytkownika (UI Inspector) w oparciu o rzeczywisty profil sprzętowy interfejsu audio, chroniąc system przed naruszeniem pryncypium braku atrap kontrolek zawartego w ADR 0011 .

---

Powered by [AI Exporter](https://saveai.net)

> **Repo:** surowy dump — nie SSOT. Triage: [GPT-Konstytucja-Projektu.triage.md](./GPT-Konstytucja-Projektu.triage.md). Konwencje: [README](../README.md).

# **GPT**

Po przejrzeniu dokumentacji i changeloga widzę jedną rzecz: problemem StageSync nie był kod, tylko brak warstw architektonicznych i brak zasad rozwoju projektu. Dokumentacja jest bardzo szczegółowa, ale opisuje głównie co aplikacja potrafi, a znacznie słabiej jak ma być rozwijana. Widać też, że projekt bardzo szybko ewoluował (3.x → 4.x), a wiele decyzji było podejmowanych w trakcie prac.  

Gdybym zaczynał StageSync od nowa, ustaliłbym konstytucję projektu. To byłby dokument, którego nie wolno łamać bez świadomej decyzji.

1\. Najważniejsza zasada

Najpierw projektujemy, później programujemy.

Żadna nowa funkcja nie może powstać, dopóki nie ma:

opisu problemu,

projektu interfejsu,

opisu modelu danych,

wpływu na API,

wpływu na pozostałe moduły.

Dzięki temu nie powstają rozwiązania "na szybko".

\---

2\. Jedno źródło prawdy

W poprzednim projekcie informacje były rozsiane pomiędzy README, DOKUMENTACJĄ, TODO, changelogiem i kodem. 

Nowa zasada:

Każda informacja ma dokładnie jedno miejsce.

Na przykład:

README → tylko uruchomienie

CHANGELOG → tylko historia zmian

TODO → tylko przyszłe zadania

ROADMAP → kierunek rozwoju

API → tylko API

UI → tylko design system

ARCHITECTURE → architektura

Nigdy nie kopiujemy tych samych informacji do kilku plików.

\---

3\. Dokumentacja jest częścią kodu

Kod bez dokumentacji uznajemy za nieukończony.

Każdy Pull Request kończy się dopiero wtedy, gdy:

kod działa,

testy przechodzą,

dokumentacja została zaktualizowana,

changelog został uzupełniony.

\---

4\. Projekt modułowy

Żaden moduł nie powinien wiedzieć o istnieniu innych modułów.

Na przykład:

Timeline

↓

API

↓

Model danych

↓

Synchronizacja

↓

Klient

Nigdy odwrotnie.

\---

5\. Nie ma "magicznych" plików

Każdy folder posiada README.

Przykład

src/api/

[README.md](http://readme.md)

Opisuje

do czego służy

co wolno tam dodawać

czego nie wolno

Po roku nie trzeba zgadywać.

\---

6\. Każdy komponent ma właściciela

Przykład

Button

Input

Dialog

Tooltip

Nie tworzymy drugiego Button2.

Rozbudowujemy istniejący.

\---

7\. Design System jest święty

To był chyba największy problem.

Nie można projektować interfejsu "na bieżąco".

Najpierw powstaje Design System.

Dopiero potem aplikacja.

\---

Design System powinien zawierać:

kolory

typografię

odstępy

animacje

ikony

komponenty

formularze

tabele

okna dialogowe

powiadomienia

menu

tooltipy

skróty klawiaturowe

\---

8\. Żadnych kolorów wpisanych w kod

Nigdy

\#00AAFF

Zawsze

color.primary

color.warning

color.success

To samo z:

spacing

radius

shadow

animation

font

icon size

\---

9\. Każdy ekran jest projektowany

Najpierw powstaje:

Wireframe

↓

Makieta

↓

Opis zachowania

↓

Kod

Nigdy odwrotnie.

\---

10\. Jedna odpowiedzialność

Folder

timeline

nie może zawierać

API

CSS

logiki serwera

parserów

Każdy folder ma jedną odpowiedzialność.

\---

11\. Funkcjonalności są niezależne

Na przykład

Import Ultimate Guitar

nie powinien znać

Timeline.

Powinien jedynie zwrócić dane.

\---

12\. Dokumentacja decyzji

To coś, czego bardzo brakowało.

Każda większa decyzja dostaje własny plik.

Przykład

ADR-0007

Dlaczego Timeline działa na absBeat?

Alternatywy

Konsekwencje

Po dwóch latach wiadomo dlaczego coś powstało.

\---

13\. Roadmapa

Nie rozwijamy projektu według pomysłów.

Rozwijamy według roadmapy.

Każda funkcja przechodzi etapy:

Pomysł

↓

Analiza

↓

Projekt

↓

Implementacja

↓

Testy

↓

Dokumentacja

↓

Release

\---

14\. Każdy Release ma definicję

Przykład

Wersja 0.6

Cel

Import MusicXML

Nie wolno dodawać niczego innego.

\---

15\. Stabilność architektury

Model danych zmieniamy wyłącznie wtedy, gdy naprawdę jest to konieczne.

Migracje powinny być rzadkie.

\---

16\. Brak długu technicznego

Jeżeli podczas implementacji pojawia się

TODO:

FIXME:

TEMP

to zadanie trafia natychmiast do backlogu.

Nie zostaje w kodzie przez rok.

\---

17\. Git

Nigdy

Update

Fix

Poprawki

Zawsze

feat:

fix:

docs:

refactor:

test:

perf:

build:

\---

18\. Każdy komponent ma dokumentację

Przykład

Button

Przeznaczenie

Props

Kolory

Przykłady

Nie używać gdy...

\---

19\. Zero duplikacji

Jeżeli coś kopiujesz drugi raz

↓

tworzysz funkcję.

Trzeci raz

↓

tworzysz moduł.

\---

20\. Projekt ma własny standard jakości

Przed każdym wydaniem sprawdzamy listę kontrolną:

Czy dokumentacja jest aktualna?

Czy CHANGELOG został uzupełniony?

Czy README nadal odpowiada rzeczywistości?

Czy Design System nie został złamany?

Czy nie powstały nowe komponenty dublujące istniejące?

Czy nazwy plików i folderów są zgodne ze standardem?

Czy nie ma nieużywanego kodu?

Czy nie ma TODO pozostawionych bez zadania?

Czy wszystkie nowe funkcje mają testy?

Czy każda zmiana ma uzasadnienie w dokumentacji decyzji (ADR), jeśli wpływa na architekturę?

Moja najważniejsza rekomendacja

Patrząc na StageSync, nie budowałbym od razu aplikacji. Najpierw stworzyłbym osobne repozytorium, np. stagesync-project-standard. Zawierałoby ono wyłącznie standardy: strukturę katalogów, szablony dokumentacji, Design System, zasady nazewnictwa, workflow Git, checklisty i szablony nowych modułów. Dopiero na podstawie tego szablonu powstałoby właściwe repozytorium aplikacji.

To oznacza nie tylko rozpoczęcie projektu od nowa, ale również stworzenie procesu, który utrzyma porządek przez kolejne lata rozwoju.
import type { IconName } from "../icons.js";

/**
 * Release spotlights — friendly highlights for the marketing site.
 * Current line: named 5.x minors. Archive: legacy majors only.
 * Not a changelog / commit feed. Link out to GitHub for full notes.
 */

export type ReleaseEra = "current" | "archive";

export interface ReleaseHighlight {
  label: string;
  icon: IconName;
}

export interface ReleaseSpotlight {
  /** Line id, e.g. "5.2" or "4" */
  line: string;
  /** Badge text, e.g. "v5.2" */
  badge: string;
  name: string;
  date: string;
  /** ISO date for <time datetime> */
  dateIso: string;
  summary: string;
  highlights: ReleaseHighlight[];
  /** GitHub tag / changelog URL (omit when target is not public). */
  releaseUrl?: string;
  era: ReleaseEra;
  /** CTA under the card (defaults by era). */
  linkLabel?: string;
}

export const RELEASE_SPOTLIGHTS: ReleaseSpotlight[] = [
  {
    line: "5.2",
    badge: "v5.2",
    name: "Pocket Stage",
    date: "lipiec 2026",
    dateIso: "2026-07-25",
    era: "current",
    summary:
      "StageSync w kieszeni: Console i Performer na telefonie lub tablecie, PIN operatora oraz spokojniejsza praca na scenie i w reżyserii.",
    highlights: [
      { icon: "tablet", label: "Console i Performer na Androidzie" },
      { icon: "sliders", label: "PIN operatora i Safety Net Master/Spare" },
      { icon: "music", label: "Sampler Cue oraz Mixer bus→bus" },
      { icon: "download", label: "Jawne aktualizacje APK i interfejsu" },
    ],
    releaseUrl: "https://github.com/Negatywistczny/stagesync/releases/tag/v5.2.0",
  },
  {
    line: "5.1",
    badge: "v5.1",
    name: "Launch & Mix",
    date: "lipiec 2026",
    dateIso: "2026-07-24",
    era: "current",
    summary:
      "Szybki start hosta i mocniejszy warsztat miksu: Launcher, pełny Mixer oraz narzędzia Timeline pod próbę i koncert.",
    highlights: [
      { icon: "laptop", label: "Launcher — lokalny host i LAN" },
      { icon: "sliders-horizontal", label: "Mixer z busami, Click i Master" },
      { icon: "list-music", label: "Narzędzia Timeline pod live-show" },
      { icon: "wifi", label: "Wykrywanie StageSync w sieci" },
    ],
    releaseUrl: "https://github.com/Negatywistczny/stagesync/releases/tag/v5.1.0",
  },
  {
    line: "5.0",
    badge: "v5.0",
    name: "Overture",
    date: "lipiec 2026",
    dateIso: "2026-07-23",
    era: "current",
    summary:
      "Pierwsze stabilne StageSync 5: odświeżony interfejs, wspólny punkt w utworze dla całego zespołu i aplikacja na komputer.",
    highlights: [
      { icon: "refresh-cw", label: "Pełny przebieg próby i koncertu" },
      { icon: "mic-2", label: "Partytura, akordy i Live Desk na scenie" },
      { icon: "music", label: "Audio z fade, loop i płynnym transportem" },
      { icon: "laptop", label: "Desktop na Windows i Mac" },
    ],
    releaseUrl: "https://github.com/Negatywistczny/stagesync/releases/tag/v5.0.0",
  },
  {
    line: "4",
    badge: "v4",
    name: "Timeline",
    date: "lipiec 2026",
    dateIso: "2026-07-17",
    era: "archive",
    summary:
      "Edytor Timeline jak DAW — Forma, Tekst i Akordy na wspólnej osi czasu; treść utworu w jednym miejscu pod próbę i koncert.",
    highlights: [
      { icon: "list-music", label: "Timeline z narzędziami DAW" },
      { icon: "music", label: "Wspólna oś czasu Formy, Tekstu i Akordów" },
      { icon: "file-text", label: "Wzory utworów i biblioteka" },
      { icon: "sliders", label: "Transport lokalny i tryb jasny" },
    ],
  },
  {
    line: "3",
    badge: "v3",
    name: "Sieć i paczki",
    date: "lipiec 2026",
    dateIso: "2026-07-14",
    era: "archive",
    summary:
      "Host w sieci lokalnej, paczki .stagesync oraz utrzymanie: aktualizacje, kopie zapasowe i logi serwera.",
    highlights: [
      { icon: "download", label: "Import i eksport paczek .stagesync" },
      { icon: "wifi", label: "Wykrywanie hosta w LAN" },
      { icon: "refresh-cw", label: "Aktualizacje i kopie zapasowe" },
      { icon: "file-text", label: "Logi serwera w panelu" },
    ],
  },
  {
    line: "2",
    badge: "v2",
    name: "Clock i role",
    date: "lipiec 2026",
    dateIso: "2026-07-13",
    era: "archive",
    summary:
      "Pełna przebudowa pod koncert — MIDI Clock, role na tablecie, partytury MusicXML i wspólna transpozycja.",
    highlights: [
      { icon: "music", label: "MIDI Clock i Song Position" },
      { icon: "mic-2", label: "Role: tekst, akordy, partytura, perkusja" },
      { icon: "list-plus", label: "Import Ultimate Guitar" },
      { icon: "file-text", label: "Partytury MusicXML" },
    ],
  },
  {
    line: "1",
    badge: "v1",
    name: "Prototyp",
    date: "lipiec 2026",
    dateIso: "2026-07-11",
    era: "archive",
    summary:
      "Pierwszy działający StageSync — wspólny host, panel admina i ekrany dla muzyków na żywo.",
    highlights: [
      { icon: "laptop", label: "Host i panel Admin" },
      { icon: "tablet", label: "Ekrany klienta na scenie" },
      { icon: "wifi", label: "Synchronizacja na żywo" },
      { icon: "list-music", label: "Podstawa pod kolejne linie" },
    ],
  },
];

export function spotlightsByEra(era: ReleaseEra): ReleaseSpotlight[] {
  return RELEASE_SPOTLIGHTS.filter((item) => item.era === era);
}

export function spotlightsNewestFirst(): ReleaseSpotlight[] {
  return [...RELEASE_SPOTLIGHTS];
}

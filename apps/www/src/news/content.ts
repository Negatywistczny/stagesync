import type { IconName } from "../icons.js";

/**
 * Release spotlights — friendly minor-line highlights for the marketing site.
 * Not a changelog / commit feed. Link out to GitHub for full notes.
 */

export interface ReleaseHighlight {
  label: string;
  icon: IconName;
}

export interface ReleaseSpotlight {
  /** Line id, e.g. "5.2" */
  line: string;
  /** Badge text, e.g. "v5.2" */
  badge: string;
  name: string;
  date: string;
  /** ISO date for <time datetime> */
  dateIso: string;
  summary: string;
  highlights: ReleaseHighlight[];
  /** GitHub Releases tag URL for the line cut. */
  releaseUrl: string;
}

export const RELEASE_SPOTLIGHTS: ReleaseSpotlight[] = [
  {
    line: "5.2",
    badge: "v5.2",
    name: "Pocket Stage",
    date: "lipiec 2026",
    dateIso: "2026-07-25",
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
];

export function spotlightsNewestFirst(): ReleaseSpotlight[] {
  return [...RELEASE_SPOTLIGHTS];
}

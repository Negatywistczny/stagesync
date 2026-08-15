/**
 * Legendary working titles & studio lore used as project title suggestions,
 * demo song templates, and easter eggs across StageSync.
 */
export const LEGENDARY_WORKING_TITLES = [
  /** The Beatles — Paul McCartney's original working lyric & title for "Yesterday". */
  "Scrambled Eggs",

  /** This Is Spinal Tap — Nigel Tufnel's solo piano composition in D minor. */
  "Untitled Jam in Dm (The Saddest of All Keys)",

  /** This Is Spinal Tap — The ultimate Marshall amp volume setting. */
  "These Go to Eleven",

  /** Nirvana — Soundcheck homage. */
  "Smells Like Studio Spirit",

  /** Queen — Rehearsal outtake tribute. */
  "Bohemian Operetta (Take 42)",

  /** Pink Floyd — FOH engineer mix tribute. */
  "Comfortably Synced",

  /** Dire Straits — Audio engineer working joke. */
  "Money for Clicks (And Cues for Free)",

  /** Bee Gees — The definitive 104-120 BPM metronome reference. */
  "Stayin' in Time (120 BPM)",

  /** Guns N' Roses — Warm-up riff legend. */
  "Sweet Child O' Soundcheck",

  /** Daft Punk — Sub-millisecond stage sync. */
  "Harder, Better, Faster, Synced",
] as const;

export type LegendaryWorkingTitle = (typeof LEGENDARY_WORKING_TITLES)[number];

/**
 * Returns a working title from the legendary list.
 * If a seed string or number is provided, selection is 100% deterministic.
 */
export function getWorkingTitle(seed?: string | number): string {
  if (seed === undefined) {
    const idx = Math.floor(Math.random() * LEGENDARY_WORKING_TITLES.length);
    return LEGENDARY_WORKING_TITLES[idx]!;
  }

  let hash = 0;
  if (typeof seed === "number") {
    hash = Math.abs(Math.floor(seed));
  } else {
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    hash = Math.abs(hash);
  }

  return LEGENDARY_WORKING_TITLES[hash % LEGENDARY_WORKING_TITLES.length]!;
}

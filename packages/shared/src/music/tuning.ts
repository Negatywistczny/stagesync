/**
 * Concert pitch reference frequencies & Cosmic Tuning easter egg (432 Hz vs 440 Hz).
 */
export const CONCERT_PITCH_STANDARD_HZ = 440;
export const CONCERT_PITCH_COSMIC_HZ = 432;

export interface TuningDescriptor {
  readonly freqHz: number;
  readonly name: string;
  readonly isCosmic: boolean;
  readonly description: string;
}

export const TUNING_PRESETS: ReadonlyArray<TuningDescriptor> = [
  {
    freqHz: 440,
    name: "Concert Pitch (ISO 16)",
    isCosmic: false,
    description: "Standard worldwide modern concert pitch since 1955.",
  },
  {
    freqHz: 432,
    name: "Cosmic Pitch (Verdi / Sacred Geometry 🛸)",
    isCosmic: true,
    description:
      "Historical Italian/Verdi tuning, harmonic resonance with the universe, beloved by audio theorists and cosmic synthesizers.",
  },
  {
    freqHz: 442,
    name: "European Orchestral Pitch",
    isCosmic: false,
    description:
      "Commonly used by Berlin, Vienna, and European symphony orchestras for increased brightness.",
  },
  {
    freqHz: 415,
    name: "Baroque Pitch",
    isCosmic: false,
    description:
      "Historical baroque performance pitch (~1 semitone flat relative to modern A=440).",
  },
] as const;

/**
 * Returns a full descriptor for a reference pitch frequency in Hz.
 */
export function getTuningDescriptor(freqHz: number): TuningDescriptor {
  const rounded = Math.round(freqHz * 10) / 10;
  const match = TUNING_PRESETS.find((p) => Math.abs(p.freqHz - rounded) < 0.1);
  if (match) return match;

  const isCosmic = Math.abs(rounded - CONCERT_PITCH_COSMIC_HZ) < 0.1;
  return {
    freqHz: rounded,
    name: `Custom Pitch (${rounded} Hz)`,
    isCosmic,
    description: isCosmic
      ? "🛸 Cosmic alignment frequency engaged! Harmonic resonance with the universe active."
      : `Custom reference pitch tuned to ${rounded} Hz.`,
  };
}

/**
 * Checks if frequency matches the 432 Hz cosmic tuning easter egg.
 */
export function isCosmicTuning(freqHz: number): boolean {
  return Math.abs(freqHz - CONCERT_PITCH_COSMIC_HZ) < 0.1;
}

/**
 * StageSync DevTools & Client-side Easter Eggs 🎸🎷🕺
 *
 * Includes:
 * 1. ASCII Art banner in browser DevTools.
 * 2. "The Lick" Web Audio synthesizer (`window.playLick()`).
 * 3. "Rickroll" Web Audio synthesizer (`window.playRickRoll()`).
 * 4. Konami Code listener (`↑ ↑ ↓ ↓ ← → ← → B A`) with Disco Glow Mode.
 */

declare global {
  interface Window {
    playLick?: () => string;
    playRickRoll?: () => string;
    __stagesync_disco?: boolean;
  }
}

/** "The Lick" note frequencies (D4, E4, F4, G4, E4, C4, D4). */
export const THE_LICK_NOTES: ReadonlyArray<{
  note: string;
  freq: number;
  duration: number;
}> = [
  { note: "D4", freq: 293.66, duration: 0.2 },
  { note: "E4", freq: 329.63, duration: 0.2 },
  { note: "F4", freq: 349.23, duration: 0.2 },
  { note: "G4", freq: 392.0, duration: 0.2 },
  { note: "E4", freq: 329.63, duration: 0.4 },
  { note: "C4", freq: 261.63, duration: 0.2 },
  { note: "D4", freq: 293.66, duration: 0.6 },
];

/** "Never Gonna Give You Up" (Rickroll) chorus intro notes. */
export const RICKROLL_NOTES: ReadonlyArray<{
  note: string;
  freq: number;
  duration: number;
}> = [
  { note: "G4", freq: 392.0, duration: 0.2 },
  { note: "A4", freq: 440.0, duration: 0.2 },
  { note: "C5", freq: 523.25, duration: 0.2 },
  { note: "A4", freq: 440.0, duration: 0.2 },
  { note: "E5", freq: 659.25, duration: 0.4 },
  { note: "E5", freq: 659.25, duration: 0.35 },
  { note: "D5", freq: 587.33, duration: 0.6 },
  { note: "G4", freq: 392.0, duration: 0.2 },
  { note: "A4", freq: 440.0, duration: 0.2 },
  { note: "C5", freq: 523.25, duration: 0.2 },
  { note: "A4", freq: 440.0, duration: 0.2 },
  { note: "D5", freq: 587.33, duration: 0.4 },
  { note: "D5", freq: 587.33, duration: 0.35 },
  { note: "C5", freq: 523.25, duration: 0.6 },
];

function playNotesSequence(
  notes: ReadonlyArray<{ note: string; freq: number; duration: number }>,
  oscType: OscillatorType,
  audioCtx?: AudioContext,
): void {
  const AudioCtx =
    audioCtx ??
    new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();

  if (AudioCtx.state === "suspended") {
    void AudioCtx.resume();
  }

  let startTime = AudioCtx.currentTime + 0.05;

  for (const { freq, duration } of notes) {
    const osc = AudioCtx.createOscillator();
    const gain = AudioCtx.createGain();

    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, startTime);

    // ADSR Envelope
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.02);

    osc.connect(gain);
    gain.connect(AudioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    startTime += duration;
  }
}

/**
 * Plays "The Lick" via Web Audio API.
 */
export function playTheLick(audioCtx?: AudioContext): string {
  try {
    playNotesSequence(THE_LICK_NOTES, "triangle", audioCtx);
    return "🎷 The Lick played! You're officially a jazz legend.";
  } catch (err) {
    return `Could not play audio: ${String(err)}`;
  }
}

/**
 * Plays "Rickroll" via Web Audio API.
 */
export function playRickRoll(audioCtx?: AudioContext): string {
  try {
    playNotesSequence(RICKROLL_NOTES, "sawtooth", audioCtx);
    return "🕺 Never gonna give you up, never gonna let you down! 🎶";
  } catch (err) {
    return `Could not play audio: ${String(err)}`;
  }
}

export const KONAMI_CODE_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

/**
 * Attaches the Konami code listener to window with Disco Mode toggle.
 */
export function attachKonamiCodeListener(onActivate?: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let cursor = 0;

  const handler = (e: KeyboardEvent) => {
    const expected = KONAMI_CODE_SEQUENCE[cursor];
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (key === expected) {
      cursor++;
      if (cursor === KONAMI_CODE_SEQUENCE.length) {
        cursor = 0;
        window.__stagesync_disco = true;
        if (typeof document !== "undefined" && document.body) {
          document.body.classList.toggle("stagesync-disco-active");
        }
        console.log(
          "%c🕺 STAGESYNC DISCO MODE ACTIVATED! 🎸✨\n%cKonami Code recognized! Rock on!",
          "color: #ff007f; font-size: 16px; font-weight: bold;",
          "color: #00e5ff; font-size: 12px;",
        );
        window.dispatchEvent(new CustomEvent("stagesync:disco"));
        if (onActivate) onActivate();
      }
    } else {
      cursor = key === KONAMI_CODE_SEQUENCE[0] ? 1 : 0;
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}

/**
 * Initializes all DevTools and client-side easter eggs.
 */
export function initClientEasterEggs(): void {
  if (typeof window === "undefined") return;

  // 1. Expose audio synths on window
  window.playLick = () => playTheLick();
  window.playRickRoll = () => playRickRoll();

  // 2. Attach Konami Code listener
  attachKonamiCodeListener();

  // 3. Print DevTools banner
  const banner = `  ____  _                    ____                    
 / ___|| |_ __ _  __ _  ___ / ___| _   _ _ __   ___  
 \\___ \\| __/ _\` |/ _\` |/ _ \\\\___ \\| | | | '_ \\ / __| 
  ___) | || (_| | (_| |  __/ ___) | |_| | | | | (__  
 |____/ \\__\\__,_|\\__, |\\___||____/ \\__, |_| |_|\\___| 
                 |___/             |___/             `;

  const isBrowser =
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    !(
      "process" in globalThis &&
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node
    );

  if (isBrowser) {
    console.log(
      `%c${banner}\n%c⚡ StageSync Live Engine — Sub-millisecond Stage Synchronization\n🎹 Try %cwindow.playLick()%c or %cwindow.playRickRoll()%c in this console!`,
      "color: #3b82f6; font-family: monospace; font-weight: bold;",
      "color: #10b981; font-size: 12px; font-weight: 600;",
      "color: #f59e0b; font-weight: bold; background: #1e293b; padding: 2px 4px; border-radius: 3px;",
      "color: #10b981; font-size: 12px; font-weight: 600;",
      "color: #ec4899; font-weight: bold; background: #1e293b; padding: 2px 4px; border-radius: 3px;",
      "color: #10b981; font-size: 12px; font-weight: 600;",
    );
  } else {
    console.log(
      `${banner}\n⚡ StageSync Live Engine — Sub-millisecond Stage Synchronization\n🎹 window.playLick() / window.playRickRoll() available.`,
    );
  }
}

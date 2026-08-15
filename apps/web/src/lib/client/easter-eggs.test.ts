// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  KONAMI_CODE_SEQUENCE,
  RICKROLL_NOTES,
  THE_LICK_NOTES,
  attachKonamiCodeListener,
  initClientEasterEggs,
  playRickRoll,
  playTheLick,
} from "./easter-eggs.js";

describe("Client Easter Eggs (DevTools, The Lick, Rickroll & Konami)", () => {
  it("defines THE_LICK_NOTES with expected 7 jazz notes", () => {
    expect(THE_LICK_NOTES).toHaveLength(7);
    const noteNames = THE_LICK_NOTES.map((n) => n.note);
    expect(noteNames).toEqual(["D4", "E4", "F4", "G4", "E4", "C4", "D4"]);
  });

  it("defines RICKROLL_NOTES with expected 14 melody notes", () => {
    expect(RICKROLL_NOTES).toHaveLength(14);
    expect(RICKROLL_NOTES[0]?.note).toBe("G4");
    expect(RICKROLL_NOTES[1]?.note).toBe("A4");
  });

  it("handles playTheLick gracefully with mock Web Audio context", () => {
    const mockOsc = {
      type: "triangle",
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    const mockCtx = {
      state: "running",
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn().mockReturnValue(mockOsc),
      createGain: vi.fn().mockReturnValue(mockGain),
      resume: vi.fn(),
    } as unknown as AudioContext;

    const res = playTheLick(mockCtx);
    expect(res).toContain("The Lick played");
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(7);
    expect(mockCtx.createGain).toHaveBeenCalledTimes(7);
  });

  it("handles playRickRoll gracefully with mock Web Audio context", () => {
    const mockOsc = {
      type: "sawtooth",
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    const mockCtx = {
      state: "running",
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn().mockReturnValue(mockOsc),
      createGain: vi.fn().mockReturnValue(mockGain),
      resume: vi.fn(),
    } as unknown as AudioContext;

    const res = playRickRoll(mockCtx);
    expect(res).toContain("Never gonna give you up");
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(14);
  });

  it("triggers Konami Code callback and toggles disco class on body", () => {
    const onActivate = vi.fn();
    const cleanup = attachKonamiCodeListener(onActivate);

    // Simulate key presses
    for (const key of KONAMI_CODE_SEQUENCE) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key }));
    }

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(window.__stagesync_disco).toBe(true);
    expect(document.body.classList.contains("stagesync-disco-active")).toBe(
      true,
    );

    cleanup();
  });

  it("initializes client easter eggs and defines window functions", () => {
    initClientEasterEggs();
    expect(typeof window.playLick).toBe("function");
    expect(typeof window.playRickRoll).toBe("function");
  });
});

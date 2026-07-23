import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HERO_CHORD_EXIT_MS,
  HERO_CHORD_FLY_MS,
  prefersReducedMotion,
  runHeroChordTransition,
} from "./gridHeroMotion.js";

const CLASS = {
  exit: "exit",
  fly: "fly",
  heroName: "heroName",
  countdown: "countdown",
  slotHidden: "slotHidden",
  enterPrep: "enterPrep",
  entering: "entering",
  transitioning: "transitioning",
  flySource: "flySource",
  nextHidden: "nextHidden",
};

describe("gridHeroMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("prefersReducedMotion reads matchMedia", () => {
    expect(prefersReducedMotion()).toBe(false);
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: true }),
    });
    expect(prefersReducedMotion()).toBe(true);
  });

  it("runHeroChordTransition no-ops without hero name handles", () => {
    const cancel = runHeroChordTransition(
      {
        heroRoot: null,
        heroName: null,
        heroNameWrap: null,
        heroNext: null,
        heroNextName: null,
      },
      {
        nextHeroText: "C",
        nextPreviewText: null,
        fromNext: false,
        isCountdown: false,
        classNames: CLASS,
      },
    );
    expect(typeof cancel).toBe("function");
    cancel();
  });

  it("runs slide exit path and cancel cleans timers", () => {
    vi.useFakeTimers();
    const removed: string[] = [];
    const heroName = {
      innerHTML: "Am",
      textContent: "Am",
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: () => false,
      },
      style: { transform: "", opacity: "" },
      offsetWidth: 10,
    };
    const heroNameWrap = {
      appendChild: vi.fn((el: { getAttribute: (k: string) => string | null }) => {
        removed.push(el.getAttribute("data-grid-hero-exit") ?? "");
      }),
      querySelectorAll: () => [],
    };
    const heroNext = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: () => false,
      },
      style: { transform: "", opacity: "" },
    };
    const heroNextName = {
      textContent: "",
      classList: { add: vi.fn(), remove: vi.fn() },
      style: { transform: "", opacity: "" },
    };
    const heroRoot = {
      classList: { add: vi.fn(), remove: vi.fn() },
      querySelectorAll: () => [],
    };

    vi.stubGlobal("window", {
      setTimeout: (fn: () => void, ms: number) =>
        setTimeout(fn, ms) as unknown as number,
      clearTimeout: (id: number) => clearTimeout(id),
      matchMedia: () => ({ matches: false }),
    });
    vi.stubGlobal("document", {
      createElement: (tag: string) => {
        const attrs = new Map<string, string>();
        return {
          tagName: tag,
          className: "",
          innerHTML: "",
          textContent: "",
          style: {} as Record<string, string>,
          setAttribute: (k: string, v: string) => attrs.set(k, v),
          getAttribute: (k: string) => attrs.get(k) ?? null,
          classList: { add: vi.fn() },
          remove: vi.fn(),
        };
      },
    });
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    const cancel = runHeroChordTransition(
      {
        heroRoot: heroRoot as unknown as HTMLElement,
        heroName: heroName as unknown as HTMLElement,
        heroNameWrap: heroNameWrap as unknown as HTMLElement,
        heroNext: heroNext as unknown as HTMLElement,
        heroNextName: heroNextName as unknown as HTMLElement,
      },
      {
        nextHeroText: "C",
        nextPreviewText: "G",
        fromNext: false,
        isCountdown: false,
        classNames: CLASS,
      },
    );

    expect(heroRoot.classList.add).toHaveBeenCalledWith("transitioning");
    expect(heroNameWrap.appendChild).toHaveBeenCalled();
    cancel();
    expect(HERO_CHORD_EXIT_MS).toBeGreaterThan(0);
    expect(HERO_CHORD_FLY_MS).toBeGreaterThan(0);
  });
});

/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HERO_CHORD_EXIT_MS,
  HERO_CHORD_FLY_MS,
  HERO_CHORD_GAP_MS,
  HERO_CHORD_NEXT_DELAY_MS,
  HERO_CHORD_NEXT_ENTER_MS,
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

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {},
  } as DOMRect;
}

function el(tag = "div"): HTMLElement {
  return document.createElement(tag);
}

describe("gridHeroMotion", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it("prefersReducedMotion reads matchMedia / missing window", () => {
    expect(prefersReducedMotion()).toBe(false);
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: true }),
    });
    expect(prefersReducedMotion()).toBe(true);
  });

  it("no-ops without hero name handles", () => {
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

  it("runs slide exit path, reveals next preview, and cancel cleans", () => {
    vi.useFakeTimers();
    const heroRoot = el();
    const heroNameWrap = el();
    const heroName = el();
    heroName.innerHTML = "Am";
    const heroNext = el();
    const heroNextName = el();
    heroNameWrap.appendChild(heroName);
    heroRoot.append(heroNameWrap, heroNext);
    heroNext.appendChild(heroNextName);
    document.body.appendChild(heroRoot);

    const cancel = runHeroChordTransition(
      { heroRoot, heroName, heroNameWrap, heroNext, heroNextName },
      {
        nextHeroText: "C",
        nextPreviewText: "G",
        fromNext: false,
        isCountdown: true,
        classNames: CLASS,
      },
    );

    expect(heroRoot.classList.contains(CLASS.transitioning)).toBe(true);
    expect(heroNameWrap.querySelector("[data-grid-hero-exit]")).toBeTruthy();

    vi.advanceTimersByTime(HERO_CHORD_EXIT_MS + HERO_CHORD_GAP_MS + 1);
    expect(heroName.textContent).toBe("C");

    vi.advanceTimersByTime(
      HERO_CHORD_NEXT_DELAY_MS + HERO_CHORD_NEXT_ENTER_MS + 30,
    );
    expect(heroNextName.textContent).toBe("G");

    cancel();
    expect(heroRoot.classList.contains(CLASS.transitioning)).toBe(false);
    expect(heroNameWrap.querySelector("[data-grid-hero-exit]")).toBeNull();
  });

  it("hides next preview when nextPreviewText is null", () => {
    vi.useFakeTimers();
    const heroRoot = el();
    const heroNameWrap = el();
    const heroName = el();
    heroName.innerHTML = "Am";
    const heroNext = el();
    const heroNextName = el();
    heroNameWrap.appendChild(heroName);
    heroRoot.append(heroNameWrap, heroNext);
    heroNext.appendChild(heroNextName);

    runHeroChordTransition(
      { heroRoot, heroName, heroNameWrap, heroNext, heroNextName },
      {
        nextHeroText: "D",
        nextPreviewText: null,
        fromNext: false,
        isCountdown: false,
        classNames: CLASS,
      },
    );

    vi.advanceTimersByTime(
      HERO_CHORD_EXIT_MS +
        HERO_CHORD_GAP_MS +
        HERO_CHORD_NEXT_DELAY_MS +
        HERO_CHORD_NEXT_ENTER_MS +
        40,
    );
    expect(heroNext.classList.contains(CLASS.nextHidden)).toBe(true);
    expect(heroNextName.textContent).toBe("—");
  });

  it("runs fly morph when fromNext and layout metrics exist", () => {
    vi.useFakeTimers();
    const layout = el();
    layout.setAttribute("data-grid-hero-layout", "");
    layout.getBoundingClientRect = () => rect(0, 0, 400, 200);

    const heroRoot = el();
    const heroNameWrap = el();
    heroNameWrap.getBoundingClientRect = () => rect(100, 40, 80, 40);
    const heroName = el();
    heroName.innerHTML = "Am";
    Object.defineProperty(heroName, "style", {
      value: { transform: "", opacity: "" },
      writable: true,
    });
    // fontSize via getComputedStyle is hard to stub; rely on height fallback
    heroName.getBoundingClientRect = () => rect(100, 40, 80, 40);

    const heroNext = el();
    const heroNextName = el();
    heroNextName.getBoundingClientRect = () => rect(300, 40, 40, 20);
    heroNextName.textContent = "C";

    heroNameWrap.appendChild(heroName);
    layout.append(heroRoot, heroNameWrap, heroNext);
    heroNext.appendChild(heroNextName);
    heroRoot.appendChild(heroNameWrap);
    // closest looks up from heroNameWrap — put wrap inside layout
    layout.appendChild(heroNameWrap);
    document.body.appendChild(layout);

    // Ensure closest finds layout
    expect(heroNameWrap.closest("[data-grid-hero-layout]")).toBe(layout);

    const rafCbs: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCbs.push(cb);
      return rafCbs.length;
    });

    const cancel = runHeroChordTransition(
      { heroRoot, heroName, heroNameWrap, heroNext, heroNextName },
      {
        nextHeroText: "C",
        nextPreviewText: "G",
        fromNext: true,
        isCountdown: false,
        classNames: CLASS,
      },
    );

    expect(layout.querySelector("[data-grid-hero-fly]")).toBeTruthy();
    expect(heroNext.classList.contains(CLASS.flySource)).toBe(true);

    // flush nested rAF
    rafCbs.shift()?.(0);
    rafCbs.shift()?.(0);

    vi.advanceTimersByTime(HERO_CHORD_FLY_MS + 16 + HERO_CHORD_NEXT_DELAY_MS + 1);
    expect(heroName.textContent).toBe("C");

    cancel();
    expect(layout.querySelector("[data-grid-hero-fly]")).toBeNull();
  });

  it("falls back to slide when fromNext but metrics missing", () => {
    vi.useFakeTimers();
    const heroRoot = el();
    const heroNameWrap = el(); // no layout ancestor → metrics null
    const heroName = el();
    heroName.innerHTML = "Am";
    const heroNext = el();
    const heroNextName = el();
    heroNameWrap.appendChild(heroName);
    heroRoot.append(heroNameWrap, heroNext);
    heroNext.appendChild(heroNextName);

    runHeroChordTransition(
      { heroRoot, heroName, heroNameWrap, heroNext, heroNextName },
      {
        nextHeroText: "E",
        nextPreviewText: "F",
        fromNext: true,
        isCountdown: false,
        classNames: CLASS,
      },
    );

    expect(heroRoot.querySelector("[data-grid-hero-fly]")).toBeNull();
    expect(heroNameWrap.querySelector("[data-grid-hero-exit]")).toBeTruthy();
    vi.advanceTimersByTime(HERO_CHORD_EXIT_MS + HERO_CHORD_GAP_MS + 1);
    expect(heroName.textContent).toBe("E");
  });
});

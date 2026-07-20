/**
 * Hero chord motion — port of legacy grid-cycle.js fly / exit / next-panel.
 * Imperative DOM layers (fly + exit) so React can keep owning text content.
 */

export const HERO_CHORD_EXIT_MS = 100;
export const HERO_CHORD_GAP_MS = 30;
export const HERO_CHORD_FLY_MS = 130;
export const HERO_CHORD_NEXT_DELAY_MS = 16;
export const HERO_CHORD_NEXT_ENTER_MS = 95;

export const PHRASE_CAROUSEL_MS = 450;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type FlyMetrics = {
  layout: HTMLElement;
  heroCenterX: number;
  heroCenterY: number;
  dx: number;
  dy: number;
  scale: number;
};

function measureHeroFlyMetrics(
  heroNextName: HTMLElement,
  heroNameWrap: HTMLElement,
  heroName: HTMLElement,
): FlyMetrics | null {
  const layout = heroNameWrap.closest("[data-grid-hero-layout]") as
    | HTMLElement
    | null;
  if (!layout) return null;

  const layoutRect = layout.getBoundingClientRect();
  const nextRect = heroNextName.getBoundingClientRect();
  const heroRect = heroNameWrap.getBoundingClientRect();

  const nextCenterX = nextRect.left + nextRect.width / 2 - layoutRect.left;
  const nextCenterY = nextRect.top + nextRect.height / 2 - layoutRect.top;
  const heroCenterX = heroRect.left + heroRect.width / 2 - layoutRect.left;
  const heroCenterY = heroRect.top + heroRect.height / 2 - layoutRect.top;

  const nextFontSize =
    parseFloat(getComputedStyle(heroNextName).fontSize) || nextRect.height;
  const heroFontSize =
    parseFloat(getComputedStyle(heroName).fontSize) || nextFontSize * 2.5;
  const scale = heroFontSize > 0 ? nextFontSize / heroFontSize : 0.4;

  return {
    layout,
    heroCenterX,
    heroCenterY,
    dx: nextCenterX - heroCenterX,
    dy: nextCenterY - heroCenterY,
    scale: Math.max(0.15, Math.min(1, scale)),
  };
}

function clearLayers(heroNameWrap: HTMLElement | null, heroRoot: HTMLElement | null) {
  heroNameWrap
    ?.querySelectorAll("[data-grid-hero-exit]")
    .forEach((el) => el.remove());
  heroRoot
    ?.querySelectorAll("[data-grid-hero-fly]")
    .forEach((el) => el.remove());
}

export type HeroMotionHandles = {
  heroRoot: HTMLElement | null;
  heroName: HTMLElement | null;
  heroNameWrap: HTMLElement | null;
  heroNext: HTMLElement | null;
  heroNextName: HTMLElement | null;
};

/**
 * Run one hero chord transition. Returns a cancel function.
 * `fromNext` when the new hero text matches the visible “nast.” preview → fly morph.
 */
export function runHeroChordTransition(
  handles: HeroMotionHandles,
  opts: {
    nextHeroText: string;
    nextPreviewText: string | null;
    fromNext: boolean;
    isCountdown: boolean;
    classNames: {
      exit: string;
      fly: string;
      heroName: string;
      countdown: string;
      slotHidden: string;
      enterPrep: string;
      entering: string;
      transitioning: string;
      flySource: string;
      nextHidden: string;
    };
  },
): () => void {
  const {
    heroRoot,
    heroName,
    heroNameWrap,
    heroNext,
    heroNextName,
  } = handles;
  if (!heroName || !heroNameWrap) return () => undefined;

  let cancelled = false;
  const timers: number[] = [];
  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      if (!cancelled) fn();
    }, ms);
    timers.push(id);
  };

  const finish = () => {
    clearLayers(heroNameWrap, heroRoot);
    heroName.classList.remove(
      opts.classNames.slotHidden,
      opts.classNames.enterPrep,
      opts.classNames.entering,
    );
    heroName.style.transform = "";
    heroName.style.opacity = "";
    heroNext?.classList.remove(
      opts.classNames.enterPrep,
      opts.classNames.entering,
      opts.classNames.flySource,
    );
    heroNextName?.classList.remove(
      opts.classNames.enterPrep,
      opts.classNames.entering,
    );
    if (heroNext) {
      heroNext.style.transform = "";
      heroNext.style.opacity = "";
    }
    if (heroNextName) {
      heroNextName.style.transform = "";
      heroNextName.style.opacity = "";
    }
    heroRoot?.classList.remove(opts.classNames.transitioning);
  };

  const applyNextPreview = () => {
    if (!heroNext || !heroNextName) return;
    if (opts.nextPreviewText) {
      heroNext.classList.remove(opts.classNames.nextHidden);
      heroNextName.textContent = opts.nextPreviewText;
    } else {
      heroNext.classList.add(opts.classNames.nextHidden);
      heroNextName.textContent = "—";
    }
  };

  const revealNextPanel = () => {
    if (!heroNext || !heroNextName || !opts.nextPreviewText) {
      applyNextPreview();
      return;
    }
    heroNext.classList.remove(
      opts.classNames.nextHidden,
      opts.classNames.entering,
      opts.classNames.flySource,
    );
    heroNext.classList.add(opts.classNames.enterPrep);
    heroNextName.classList.add(opts.classNames.enterPrep);
    heroNextName.textContent = opts.nextPreviewText;
    void heroNext.offsetWidth;
    heroNext.classList.remove(opts.classNames.enterPrep);
    heroNextName.classList.remove(opts.classNames.enterPrep);
    heroNext.classList.add(opts.classNames.entering);
    heroNextName.classList.add(opts.classNames.entering);
  };

  clearLayers(heroNameWrap, heroRoot);
  heroRoot?.classList.add(opts.classNames.transitioning);

  const prevHtml = heroName.innerHTML;

  if (
    opts.fromNext &&
    heroNext &&
    heroNextName &&
    !heroNext.classList.contains(opts.classNames.nextHidden)
  ) {
    const metrics = measureHeroFlyMetrics(heroNextName, heroNameWrap, heroName);
    if (metrics) {
      heroNext.classList.add(opts.classNames.flySource);

      const exitLayer = document.createElement("div");
      exitLayer.setAttribute("data-grid-hero-exit", "");
      exitLayer.className = `${opts.classNames.exit} ${opts.classNames.heroName}${
        opts.isCountdown ? ` ${opts.classNames.countdown}` : ""
      }`;
      exitLayer.innerHTML = prevHtml;
      exitLayer.setAttribute("aria-hidden", "true");
      heroNameWrap.appendChild(exitLayer);
      heroName.classList.add(opts.classNames.slotHidden);

      const fly = document.createElement("div");
      fly.setAttribute("data-grid-hero-fly", "");
      fly.className = `${opts.classNames.fly} ${opts.classNames.heroName}${
        opts.isCountdown ? ` ${opts.classNames.countdown}` : ""
      }`;
      fly.textContent = opts.nextHeroText;
      fly.setAttribute("aria-hidden", "true");
      fly.style.left = `${metrics.heroCenterX}px`;
      fly.style.top = `${metrics.heroCenterY}px`;
      fly.style.transform = `translate(calc(-50% + ${metrics.dx}px), calc(-50% + ${metrics.dy}px)) scale(${metrics.scale})`;
      metrics.layout.appendChild(fly);

      requestAnimationFrame(() => {
        if (cancelled) return;
        exitLayer.classList.add("is-active");
        requestAnimationFrame(() => {
          if (cancelled) return;
          fly.style.transition = `transform ${HERO_CHORD_FLY_MS}ms cubic-bezier(0.15, 0.85, 0.25, 1)`;
          fly.style.transform = "translate(-50%, -50%) scale(1)";
        });
      });

      schedule(() => {
        fly.remove();
        heroName.textContent = opts.nextHeroText;
        heroName.classList.remove(opts.classNames.slotHidden);
        schedule(() => {
          revealNextPanel();
          schedule(finish, HERO_CHORD_NEXT_ENTER_MS + 24);
        }, HERO_CHORD_NEXT_DELAY_MS);
      }, HERO_CHORD_FLY_MS + 16);

      return () => {
        cancelled = true;
        timers.forEach((t) => window.clearTimeout(t));
        finish();
      };
    }
  }

  // Slide exit → enter (fallback / forceSlide).
  if (heroNext && opts.nextPreviewText) {
    heroNext.classList.remove(opts.classNames.nextHidden);
    heroNext.classList.add(opts.classNames.enterPrep);
    if (heroNextName) {
      heroNextName.classList.add(opts.classNames.enterPrep);
      heroNextName.textContent = opts.nextPreviewText;
    }
  }

  const exitLayer = document.createElement("div");
  exitLayer.setAttribute("data-grid-hero-exit", "");
  exitLayer.className = `${opts.classNames.exit} ${opts.classNames.heroName}${
    opts.isCountdown ? ` ${opts.classNames.countdown}` : ""
  }`;
  exitLayer.innerHTML = prevHtml;
  exitLayer.setAttribute("aria-hidden", "true");
  heroNameWrap.appendChild(exitLayer);
  heroName.classList.add(opts.classNames.slotHidden);

  requestAnimationFrame(() => {
    if (!cancelled) exitLayer.classList.add("is-active");
  });

  schedule(() => {
    exitLayer.remove();
    heroName.textContent = opts.nextHeroText;
    heroName.classList.remove(
      opts.classNames.slotHidden,
      opts.classNames.enterPrep,
      opts.classNames.entering,
    );
    void heroName.offsetWidth;
    heroName.classList.add(opts.classNames.entering);
    schedule(() => {
      revealNextPanel();
      schedule(finish, HERO_CHORD_NEXT_ENTER_MS + 24);
    }, HERO_CHORD_NEXT_DELAY_MS);
  }, HERO_CHORD_EXIT_MS + HERO_CHORD_GAP_MS);

  return () => {
    cancelled = true;
    timers.forEach((t) => window.clearTimeout(t));
    finish();
  };
}

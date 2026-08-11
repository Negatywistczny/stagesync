import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import styles from "../ClientShell.module.css";
import { type GridCycleStep } from "@lib/timeline/clientGrid.js";
import {
  PHRASE_CAROUSEL_MS,
  prefersReducedMotion,
  runHeroChordTransition,
} from "@lib/timeline/gridHeroMotion.js";
import { css } from "../gridPaneUtils.js";

export type CarouselDisplay = {
  key: string;
  cycle: GridCycleStep[];
  nextCycle: GridCycleStep[];
  countdownPreview: boolean;
};

export type UseGridCarouselMotionParams = {
  carouselKey: string;
  cycle: GridCycleStep[];
  nextCycle: GridCycleStep[];
  countdownPreview: boolean;
  gridAnimations: boolean;
  trackRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  currentRowRef: RefObject<HTMLDivElement | null>;
};

export function useGridCarouselMotion({
  carouselKey,
  cycle,
  nextCycle,
  countdownPreview,
  gridAnimations,
  trackRef,
  viewportRef,
  currentRowRef,
}: UseGridCarouselMotionParams) {
  const [display, setDisplay] = useState<CarouselDisplay>(() => ({
    key: carouselKey,
    cycle,
    nextCycle,
    countdownPreview,
  }));
  const [carouselAnimating, setCarouselAnimating] = useState(false);
  const [highlightNextRow, setHighlightNextRow] = useState(false);

  const displayKeyRef = useRef(carouselKey);
  displayKeyRef.current = display.key;

  const liveRef = useRef({
    carouselKey,
    cycle,
    nextCycle,
    countdownPreview,
  });
  liveRef.current = {
    carouselKey,
    cycle,
    nextCycle,
    countdownPreview,
  };

  const carouselBusy = useRef(false);
  const motionEpochRef = useRef(0);
  const animRafRef = useRef(0);
  const animRaf2Ref = useRef(0);
  const animFallbackRef = useRef(0);

  const commitDisplay = (snap: CarouselDisplay) => {
    displayKeyRef.current = snap.key;
    setDisplay(snap);
  };

  const resetTrackTransform = (track: HTMLDivElement | null) => {
    if (!track) return;
    track.style.transition = "";
    track.style.transform = "";
  };

  // Keep cycle cell active highlight live within the same carousel row.
  useEffect(() => {
    if (carouselBusy.current) return;
    if (display.key !== carouselKey) return;
    setDisplay({
      key: carouselKey,
      cycle,
      nextCycle,
      countdownPreview,
    });
  }, [cycle, nextCycle, carouselKey, countdownPreview, display.key]);

  // Phrase-row carousel swap (translateY) when subsection / section key changes.
  useLayoutEffect(() => {
    if (displayKeyRef.current === carouselKey) return;

    const epoch = ++motionEpochRef.current;

    const reduced =
      !gridAnimations || prefersReducedMotion() || document.hidden;
    if (reduced) {
      commitDisplay({
        key: carouselKey,
        cycle: liveRef.current.cycle,
        nextCycle: liveRef.current.nextCycle,
        countdownPreview: liveRef.current.countdownPreview,
      });
      setCarouselAnimating(false);
      setHighlightNextRow(false);
      carouselBusy.current = false;
      resetTrackTransform(trackRef.current);
      return;
    }

    const track = trackRef.current;
    const viewport = viewportRef.current;
    const currentRow = currentRowRef.current;
    const hasNextContent = display.nextCycle.length > 0;

    if (!track || !viewport || !currentRow || !hasNextContent) {
      carouselBusy.current = false;
      setCarouselAnimating(false);
      setHighlightNextRow(false);
      commitDisplay({
        key: carouselKey,
        cycle: liveRef.current.cycle,
        nextCycle: liveRef.current.nextCycle,
        countdownPreview: liveRef.current.countdownPreview,
      });
      resetTrackTransform(track);
      return;
    }

    carouselBusy.current = true;
    setHighlightNextRow(true);
    setCarouselAnimating(true);
    viewport.style.setProperty(
      "--phrase-carousel-ms",
      `${PHRASE_CAROUSEL_MS}ms`,
    );

    let finished = false;
    const finish = () => {
      if (finished || epoch !== motionEpochRef.current) return;
      finished = true;
      window.clearTimeout(animFallbackRef.current);
      cancelAnimationFrame(animRafRef.current);
      cancelAnimationFrame(animRaf2Ref.current);
      track.removeEventListener("transitionend", onEnd);

      const snap: CarouselDisplay = {
        key: liveRef.current.carouselKey,
        cycle: liveRef.current.cycle,
        nextCycle: liveRef.current.nextCycle,
        countdownPreview: liveRef.current.countdownPreview,
      };
      track.style.transition = "none";
      flushSync(() => {
        commitDisplay(snap);
        setCarouselAnimating(false);
        setHighlightNextRow(false);
      });
      carouselBusy.current = false;
      track.style.transform = "translateY(0)";
      void track.offsetHeight;
      resetTrackTransform(track);
    };

    const onEnd = (e: TransitionEvent) => {
      if (e.target !== track || e.propertyName !== "transform") return;
      finish();
    };

    track.addEventListener("transitionend", onEnd);
    animFallbackRef.current = window.setTimeout(
      finish,
      PHRASE_CAROUSEL_MS + 100,
    );

    animRafRef.current = requestAnimationFrame(() => {
      if (finished || epoch !== motionEpochRef.current) return;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      const offset = currentRow.offsetHeight + gap;
      if (offset <= 0) {
        finish();
        return;
      }
      track.style.transition = "none";
      track.style.transform = "translateY(0)";
      animRaf2Ref.current = requestAnimationFrame(() => {
        if (finished || epoch !== motionEpochRef.current) return;
        track.style.transition = `transform ${PHRASE_CAROUSEL_MS}ms ease-in-out`;
        track.style.transform = `translateY(-${offset}px)`;
      });
    });

    return () => {
      if (epoch === motionEpochRef.current) {
        motionEpochRef.current += 1;
      }
      finished = true;
      window.clearTimeout(animFallbackRef.current);
      cancelAnimationFrame(animRafRef.current);
      cancelAnimationFrame(animRaf2Ref.current);
      track.removeEventListener("transitionend", onEnd);
      carouselBusy.current = false;
      setCarouselAnimating(false);
      setHighlightNextRow(false);
      track.style.transition = "none";
      track.style.transform = "translateY(0)";
      void track.offsetHeight;
      resetTrackTransform(track);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselKey, gridAnimations]);

  useLayoutEffect(() => {
    if (carouselBusy.current) return;
    if (displayKeyRef.current === carouselKey) return;
    commitDisplay({
      key: carouselKey,
      cycle: liveRef.current.cycle,
      nextCycle: liveRef.current.nextCycle,
      countdownPreview: liveRef.current.countdownPreview,
    });
  }, [carouselKey, display.key]);

  return {
    display,
    carouselAnimating,
    highlightNextRow,
  };
}

export type UseGridHeroMotionParams = {
  heroRaw: string;
  heroNextRaw: string | null;
  hero: string;
  heroNext: string | null;
  heroHtml: string;
  heroNextHtml: string | null;
  gridAnimations: boolean;
  isCountdown: boolean;
  heroRootRef: RefObject<HTMLDivElement | null>;
  heroNameRef: RefObject<HTMLDivElement | null>;
  heroNameWrapRef: RefObject<HTMLDivElement | null>;
  heroNextRef: RefObject<HTMLElement | null>;
  heroNextNameRef: RefObject<HTMLDivElement | null>;
};

export function useGridHeroMotion({
  heroRaw,
  heroNextRaw,
  hero,
  heroNext,
  heroHtml,
  heroNextHtml,
  gridAnimations,
  isCountdown,
  heroRootRef,
  heroNameRef,
  heroNameWrapRef,
  heroNextRef,
  heroNextNameRef,
}: UseGridHeroMotionParams) {
  const prevHeroRaw = useRef(heroRaw);
  const prevHeroNextRaw = useRef(heroNextRaw);
  const cancelHeroRef = useRef<(() => void) | null>(null);

  const syncHeroDom = useCallback(
    (
      nextHeroHtml: string,
      nextPreviewHtml: string | null,
      nextRaw: string | null,
    ) => {
      if (heroNameRef.current) heroNameRef.current.innerHTML = nextHeroHtml;
      if (heroNextNameRef.current) {
        heroNextNameRef.current.innerHTML = nextPreviewHtml ?? "—";
        heroNextNameRef.current.dataset.chordDisplay = nextRaw ?? "";
      }
      if (heroNextRef.current) {
        heroNextRef.current.classList.toggle(
          css(styles.heroNextHidden),
          !nextPreviewHtml,
        );
      }
    },
    [heroNameRef, heroNextNameRef, heroNextRef],
  );

  useLayoutEffect(() => {
    syncHeroDom(heroHtml, heroNextHtml, heroNextRaw);
  }, [heroHtml, heroNextHtml, heroNextRaw, isCountdown, syncHeroDom]);

  useEffect(() => {
    const heroChanged = prevHeroRaw.current !== heroRaw;
    const nextChanged = prevHeroNextRaw.current !== heroNextRaw;
    const prevNextRaw = prevHeroNextRaw.current;
    prevHeroRaw.current = heroRaw;
    prevHeroNextRaw.current = heroNextRaw;

    if (!heroChanged && !nextChanged) {
      if (heroNameRef.current?.textContent !== hero) {
        syncHeroDom(heroHtml, heroNextHtml, heroNextRaw);
      } else if (
        heroNextNameRef.current &&
        heroNextNameRef.current.textContent !== (heroNext ?? "—")
      ) {
        syncHeroDom(heroHtml, heroNextHtml, heroNextRaw);
      }
      return;
    }

    const reduced =
      !gridAnimations || prefersReducedMotion() || document.hidden;

    if (reduced || !heroChanged) {
      cancelHeroRef.current?.();
      cancelHeroRef.current = null;
      syncHeroDom(heroHtml, heroNextHtml, heroNextRaw);
      return;
    }

    const morphFromNext =
      prevNextRaw != null && prevNextRaw !== "—" && prevNextRaw === heroRaw;

    cancelHeroRef.current?.();

    cancelHeroRef.current = runHeroChordTransition(
      {
        heroRoot: heroRootRef.current,
        heroName: heroNameRef.current,
        heroNameWrap: heroNameWrapRef.current,
        heroNext: heroNextRef.current,
        heroNextName: heroNextNameRef.current,
      },
      {
        nextHeroHtml: heroHtml,
        nextPreviewHtml: heroNextHtml,
        fromNext: morphFromNext,
        isCountdown,
        classNames: {
          exit: css(styles.heroChordExit),
          fly: css(styles.heroChordFly),
          heroName: css(styles.heroName),
          countdown: css(styles.heroCountdownNumber),
          slotHidden: css(styles.heroSlotHidden),
          enterPrep: css(styles.heroEnterPrep),
          entering: css(styles.heroEntering),
          transitioning: css(styles.heroTransitioning),
          flySource: css(styles.heroFlySource),
          nextHidden: css(styles.heroNextHidden),
        },
      },
    );

    return () => {
      cancelHeroRef.current?.();
      cancelHeroRef.current = null;
    };
  }, [
    heroRaw,
    heroNextRaw,
    hero,
    heroNext,
    heroHtml,
    heroNextHtml,
    gridAnimations,
    isCountdown,
    heroRootRef,
    heroNameRef,
    heroNameWrapRef,
    heroNextRef,
    heroNextNameRef,
    syncHeroDom,
  ]);
}

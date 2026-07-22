import {
  Component,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { flushSync } from "react-dom";
import styles from "../ClientShell.module.css";
import {
  applyInstrumentPitchToChord,
  formatChordForDisplay,
  formatSectionNameForDisplay,
  resolveKeyAt,
  type Project,
} from "@stagesync/shared";
import {
  buildGridLiveContext,
  cycleTotalBars,
  type GridCycleStep,
} from "../../lib/clientGrid.js";
import type { ClientDisplayPrefs } from "../../lib/clientDisplayPrefs.js";
import {
  PHRASE_CAROUSEL_MS,
  prefersReducedMotion,
  runHeroChordTransition,
} from "../../lib/gridHeroMotion.js";

/** v4 `--slot-bar-units`: 1-bar = square; N-bar = N× square width. */
function slotBarUnitsStyle(bars: number): CSSProperties {
  return {
    ["--slot-bar-units" as string]: String(Math.max(1, Math.round(bars))),
  };
}

function css(mod: string | undefined): string {
  return mod ?? "";
}

/**
 * Freeze React reconciliation after mount so tick re-renders cannot wipe
 * imperative motion classes / textContent (fly, exit, slotHidden).
 */
class StaticDomAnchor extends Component<{
  domRef: Ref<HTMLDivElement>;
  className: string;
  initialText: string;
  datasetChord?: string;
}> {
  override shouldComponentUpdate() {
    return false;
  }
  override render(): ReactNode {
    const { domRef, className, initialText, datasetChord } = this.props;
    return (
      <div
        ref={domRef}
        className={className}
        data-chord-display={datasetChord ?? ""}
      >
        {initialText}
      </div>
    );
  }
}

type Props = {
  project: Project | null;
  displayTicks: number;
  loading: boolean;
  hasActiveProjectId: boolean;
  prefs: ClientDisplayPrefs;
  teamSemitones?: number;
};

export function GridPane({
  project,
  displayTicks,
  loading,
  hasActiveProjectId,
  prefs,
  teamSemitones = 0,
}: Props) {
  if (!hasActiveProjectId) {
    return <p className={styles.empty}>Oczekiwanie na utwór…</p>;
  }
  if (loading && !project) {
    return <p className={styles.empty}>Wczytywanie utworu…</p>;
  }
  if (!project) {
    return <p className={styles.empty}>Nie udało się wczytać utworu.</p>;
  }

  const ctx = buildGridLiveContext(project, displayTicks);
  if (ctx.emptyReason) {
    return <p className={styles.empty}>{ctx.emptyReason}</p>;
  }

  const key = resolveKeyAt(project, displayTicks);
  const fmt = (symbol: string) =>
    formatChordForDisplay(
      applyInstrumentPitchToChord(
        symbol,
        prefs.instrumentPitch,
        prefs.instrumentPitchManual,
        key,
        teamSemitones,
      ),
      {
        literalQuality: prefs.literalQuality,
        hybridPolishB: prefs.hybridPolishB,
      },
    );

  const sectionDisplay =
    ctx.sectionName == null
      ? null
      : formatSectionNameForDisplay(ctx.sectionName, {
          polish: prefs.sectionNamesPolish,
        });
  const subsectionLabel =
    sectionDisplay != null &&
    ctx.subsectionCount != null &&
    ctx.subsectionCount > 1 &&
    ctx.subsectionIndex != null
      ? `${sectionDisplay} · ${ctx.subsectionIndex + 1}/${ctx.subsectionCount}`
      : sectionDisplay;

  return (
    <GridPaneBody
      subsectionLabel={subsectionLabel}
      cycle={ctx.cycle}
      nextCycle={ctx.nextCycle}
      carouselKey={ctx.carouselKey}
      countdownPreview={ctx.countdownPreview}
      heroRaw={ctx.hero}
      heroNextRaw={ctx.heroNext}
      isCountdown={ctx.isCountdown}
      fmt={fmt}
      gridAnimations={prefs.gridAnimations}
    />
  );
}

type BodyProps = {
  subsectionLabel: string | null;
  cycle: GridCycleStep[];
  nextCycle: GridCycleStep[];
  carouselKey: string;
  countdownPreview: boolean;
  heroRaw: string;
  heroNextRaw: string | null;
  isCountdown: boolean;
  fmt: (symbol: string) => string;
  gridAnimations: boolean;
};

type CarouselDisplay = {
  key: string;
  cycle: GridCycleStep[];
  nextCycle: GridCycleStep[];
  countdownPreview: boolean;
};

/** Inner body so hooks stay after early returns in GridPane. */
function GridPaneBody({
  subsectionLabel,
  cycle,
  nextCycle,
  carouselKey,
  countdownPreview,
  heroRaw,
  heroNextRaw,
  isCountdown,
  fmt,
  gridAnimations,
}: BodyProps) {
  const hero = fmt(heroRaw);
  const heroNext = heroNextRaw ? fmt(heroNextRaw) : null;

  const [display, setDisplay] = useState<CarouselDisplay>(() => ({
    key: carouselKey,
    cycle,
    nextCycle,
    countdownPreview,
  }));
  const [carouselAnimating, setCarouselAnimating] = useState(false);
  const [highlightNextRow, setHighlightNextRow] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLDivElement>(null);

  const heroRootRef = useRef<HTMLDivElement>(null);
  const heroNameRef = useRef<HTMLDivElement>(null);
  const heroNameWrapRef = useRef<HTMLDivElement>(null);
  const heroNextRef = useRef<HTMLElement>(null);
  const heroNextNameRef = useRef<HTMLDivElement>(null);

  const prevHeroRaw = useRef(heroRaw);
  const prevHeroNextRaw = useRef(heroNextRaw);
  const cancelHeroRef = useRef<(() => void) | null>(null);

  const displayKeyRef = useRef(carouselKey);
  displayKeyRef.current = display.key;

  /** Latest live props — finish must not close over a stale tick. */
  const liveRef = useRef({
    carouselKey,
    cycle,
    nextCycle,
    countdownPreview,
    hero,
    heroNext,
    heroRaw,
    heroNextRaw,
  });
  liveRef.current = {
    carouselKey,
    cycle,
    nextCycle,
    countdownPreview,
    hero,
    heroNext,
    heroRaw,
    heroNextRaw,
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

  const syncHeroDom = (
    nextHero: string,
    nextPreview: string | null,
    nextRaw: string | null,
  ) => {
    if (heroNameRef.current) heroNameRef.current.textContent = nextHero;
    if (heroNextNameRef.current) {
      heroNextNameRef.current.textContent = nextPreview ?? "—";
      heroNextNameRef.current.dataset.chordDisplay = nextRaw ?? "";
    }
    if (heroNextRef.current) {
      heroNextRef.current.classList.toggle(
        css(styles.heroNextHidden),
        !nextPreview,
      );
    }
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
  // Depend ONLY on carouselKey (+ animations): cycle ticks must not restart the slide
  // (that cancelled nested rAF / left carouselBusy stuck — broken karuzela).
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
    // Preview row must already hold the incoming phrase (built while on previous key).
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
      // Keep final translateY until React commits the promoted row, then snap
      // to 0 in the same turn — otherwise translateY(0) + old row paints (flicker).
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
    // Fallback before RAF — hidden tabs pause rAF (v4 grid-cycle.js).
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: key-only trigger
  }, [carouselKey, gridAnimations]);

  // If key advanced while a slide was aborted, hard-commit on next paint.
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

  // Seed / re-seed when Countdown mode remounts frozen anchors.
  useLayoutEffect(() => {
    syncHeroDom(hero, heroNext, heroNextRaw);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- anchor remount / mount
  }, [isCountdown]);

  // Hero + nast. — StaticDomAnchor freezes className/text; effects own updates.
  useEffect(() => {
    const heroChanged = prevHeroRaw.current !== heroRaw;
    const nextChanged = prevHeroNextRaw.current !== heroNextRaw;
    const prevNextRaw = prevHeroNextRaw.current;
    prevHeroRaw.current = heroRaw;
    prevHeroNextRaw.current = heroNextRaw;

    if (!heroChanged && !nextChanged) {
      // Display-prefs / format-only updates (raw symbols unchanged).
      if (heroNameRef.current?.textContent !== hero) {
        syncHeroDom(hero, heroNext, heroNextRaw);
      } else if (
        heroNextNameRef.current &&
        heroNextNameRef.current.textContent !== (heroNext ?? "—")
      ) {
        syncHeroDom(hero, heroNext, heroNextRaw);
      }
      return;
    }

    const reduced =
      !gridAnimations || prefersReducedMotion() || document.hidden;

    if (reduced || !heroChanged) {
      cancelHeroRef.current?.();
      cancelHeroRef.current = null;
      syncHeroDom(hero, heroNext, heroNextRaw);
      return;
    }

    const morphFromNext =
      prevNextRaw != null &&
      prevNextRaw !== "—" &&
      prevNextRaw === heroRaw;

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
        nextHeroText: hero,
        nextPreviewText: heroNext,
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
      // Do not syncHeroDom here — that would write the new hero before the
      // next transition reads prevHtml for the exit layer.
    };
  }, [
    heroRaw,
    heroNextRaw,
    hero,
    heroNext,
    gridAnimations,
    isCountdown,
  ]);

  const heroNameClass = [
    styles.heroName,
    isCountdown ? styles.heroCountdownNumber : "",
  ]
    .filter(Boolean)
    .join(" ");
  const heroNextNameClass = [
    styles.heroNextName,
    isCountdown && heroNextRaw && /^\d+$/.test(heroNextRaw)
      ? styles.heroCountdownNumber
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showCurrent = !display.countdownPreview && display.cycle.length > 0;
  const showNext = display.nextCycle.length > 0 || highlightNextRow;
  const singleRow = !(
    showCurrent && (display.nextCycle.length > 0 || highlightNextRow)
  );

  // During promote, paint incoming cycle (live active cell) on the next row.
  const promotingCycle = highlightNextRow ? cycle : display.nextCycle;

  return (
    <div
      className={[
        styles.gridPane,
        gridAnimations ? "" : styles.gridAnimationsOff,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
    >
      {subsectionLabel ? (
        <p className={styles.gridSectionLabel}>{subsectionLabel}</p>
      ) : null}

      <div ref={heroRootRef} className={styles.chordHero}>
        <div
          className={[
            styles.chordHeroLayout,
            isCountdown ? styles.chordHeroCountdown : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-grid-hero-layout=""
        >
          <div className={styles.chordHeroMain}>
            <div ref={heroNameWrapRef} className={styles.heroNameWrap}>
              <StaticDomAnchor
                key={`hero-${isCountdown ? "cd" : "ch"}`}
                domRef={heroNameRef}
                className={heroNameClass}
                initialText={hero}
              />
            </div>
          </div>
          {/*
            className must stay stable — React would wipe flySource / enterPrep /
            heroNextHidden if those were toggled via the className prop each tick.
          */}
          <aside
            ref={heroNextRef}
            className={styles.heroNext}
            aria-label="Następny akord"
          >
            <span className={styles.heroNextLabel}>nast.</span>
            <StaticDomAnchor
              key={`next-${isCountdown ? "cd" : "ch"}`}
              domRef={heroNextNameRef}
              className={heroNextNameClass}
              initialText={heroNext ?? "—"}
              datasetChord={heroNextRaw ?? ""}
            />
          </aside>
        </div>
      </div>

      {(showCurrent || showNext) && (
        <div
          ref={viewportRef}
          className={[
            styles.phraseCarouselViewport,
            display.countdownPreview ? styles.countdownPreviewViewport : "",
            carouselAnimating ? styles.phraseCarouselAnimating : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div
            ref={trackRef}
            className={[
              styles.phraseCarouselTrack,
              singleRow ? styles.phraseCarouselTrackSingle : "",
            ]
              .filter(Boolean)
              .join(" ")}
            id="chord-phrases-track"
          >
            <div
              ref={currentRowRef}
              className={[
                styles.phraseRowWrap,
                styles.phraseRowCurrent,
                display.countdownPreview ? styles.phraseRowCollapsed : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {showCurrent ? (
                <CycleRow
                  cycle={display.cycle}
                  fmt={fmt}
                  active={!highlightNextRow}
                />
              ) : null}
            </div>
            <div
              className={[
                styles.phraseRowWrap,
                styles.phraseRowNext,
                !(display.nextCycle.length > 0 || highlightNextRow)
                  ? styles.phraseRowSpacer
                  : "",
                highlightNextRow ? styles.phraseRowPromoting : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {(display.nextCycle.length > 0 || highlightNextRow) &&
              (highlightNextRow ? promotingCycle : display.nextCycle).length >
                0 ? (
                <CycleRow
                  cycle={
                    highlightNextRow ? promotingCycle : display.nextCycle
                  }
                  fmt={fmt}
                  active={highlightNextRow}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CycleRow({
  cycle,
  fmt,
  active,
}: {
  cycle: GridCycleStep[];
  fmt: (symbol: string) => string;
  active: boolean;
}) {
  const totalBars = cycleTotalBars(cycle);
  if (cycle.length === 0 || totalBars <= 0) return null;

  const hasActiveStep = cycle.some((s) => s.active);

  return (
    <div className={styles.cycleRow} aria-label="Cykl akordów">
      {cycle.map((step, i) => {
        const display = fmt(step.symbol);
        const isCdDigit = /^\d+$/.test(step.symbol.trim());
        const cellActive =
          active && (step.active || (!hasActiveStep && i === 0));
        return (
          <div
            key={`${step.symbol}-${i}`}
            className={[
              styles.cycleCell,
              cellActive ? styles.cycleCellActive : "",
              isCdDigit ? styles.cycleCellCountdown : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={slotBarUnitsStyle(step.bars)}
            data-chord={step.symbol}
            title={
              step.bars > 1
                ? `${display} · ${step.bars} takty`
                : display
            }
          >
            <span className={styles.cycleCellSymbol}>{display}</span>
          </div>
        );
      })}
    </div>
  );
}

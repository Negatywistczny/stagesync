import { useRef } from "react";
import styles from "./ClientShell.module.css";
import type { ChordNameParts } from "@stagesync/shared";
import { type GridCycleStep } from "@lib/timeline/clientGrid.js";
import { CycleRow } from "./CycleRow.js";
import { partsToInlineHtml } from "./gridPaneUtils.js";
import { StaticDomAnchor } from "./StaticDomAnchor.js";
import {
  useGridCarouselMotion,
  useGridHeroMotion,
} from "./grid/useGridPaneMotion.js";

export type GridPaneBodyProps = {
  subsectionLabel: string | null;
  cycle: GridCycleStep[];
  nextCycle: GridCycleStep[];
  carouselKey: string;
  countdownPreview: boolean;
  heroRaw: string;
  heroNextRaw: string | null;
  isCountdown: boolean;
  fmtParts: (symbol: string) => ChordNameParts;
  gridAnimations: boolean;
};

/** Inner body so hooks stay after early returns in GridPane. */
export function GridPaneBody({
  subsectionLabel,
  cycle,
  nextCycle,
  carouselKey,
  countdownPreview,
  heroRaw,
  heroNextRaw,
  isCountdown,
  fmtParts,
  gridAnimations,
}: GridPaneBodyProps) {
  const heroParts = fmtParts(heroRaw);
  const heroNextParts = heroNextRaw ? fmtParts(heroNextRaw) : null;
  const hero = heroParts.plain;
  const heroNext = heroNextParts?.plain ?? null;
  const heroHtml = partsToInlineHtml(heroParts);
  const heroNextHtml = heroNextParts ? partsToInlineHtml(heroNextParts) : null;

  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLDivElement>(null);

  const heroRootRef = useRef<HTMLDivElement>(null);
  const heroNameRef = useRef<HTMLDivElement>(null);
  const heroNameWrapRef = useRef<HTMLDivElement>(null);
  const heroNextRef = useRef<HTMLElement>(null);
  const heroNextNameRef = useRef<HTMLDivElement>(null);

  const { display, carouselAnimating, highlightNextRow } =
    useGridCarouselMotion({
      carouselKey,
      cycle,
      nextCycle,
      countdownPreview,
      gridAnimations,
      trackRef,
      viewportRef,
      currentRowRef,
    });

  useGridHeroMotion({
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
  });

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
    showCurrent &&
    (display.nextCycle.length > 0 || highlightNextRow)
  );

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
                initialHtml={heroHtml}
              />
            </div>
          </div>
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
              initialHtml={heroNextHtml ?? "—"}
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
                  fmtParts={fmtParts}
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
                  cycle={highlightNextRow ? promotingCycle : display.nextCycle}
                  fmtParts={fmtParts}
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

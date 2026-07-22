import {
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import {
  formatSectionNameForDisplay,
  type Project,
} from "@stagesync/shared";
import { buildFormaLiveContext } from "../../lib/clientForma.js";
import styles from "../ClientShell.module.css";

type DrumsPaneProps = {
  project: Project;
  displayTicks: number;
  notesEdit?: boolean;
  sectionNamesPolish?: boolean;
  onNoteChange?: (clipId: string, note: string) => void;
};

/**
 * Forma / drums stage — v4 `drums-view.js` DOM hierarchy (hero + horizontal strip).
 * Shell chrome (header / settings) stays v5.
 */
export function DrumsPane({
  project,
  displayTicks,
  notesEdit = false,
  sectionNamesPolish = false,
  onNoteChange,
}: DrumsPaneProps) {
  const ctx = buildFormaLiveContext(project, displayTicks);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeSegRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const scroll = scrollRef.current;
    const active = activeSegRef.current;
    if (!scroll || !active) return;
    const targetLeft =
      active.offsetLeft - (scroll.clientWidth - active.offsetWidth) / 2;
    scroll.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [ctx?.activeClipId, ctx?.segments.length]);

  if (!ctx) {
    return <p className={styles.empty}>Oczekiwanie na utwór…</p>;
  }

  const fmtName = (name: string) =>
    formatSectionNameForDisplay(name, { polish: sectionNamesPolish });
  const heroTitle = ctx.countdownNumber
    ? ctx.heroTitle
    : fmtName(ctx.heroTitle);

  return (
    <div
      className={[
        styles.drumsView,
        notesEdit ? styles.drumsEditMode : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header
        className={[
          styles.drumsHero,
          ctx.isCountdown ? styles.drumsHeroCountdown : "",
          ctx.countdownNumber ? styles.drumsHeroCountdownNumber : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <p className={styles.drumsHeroEyebrow}>{ctx.heroEyebrow}</p>
        <h2
          className={styles.drumsHeroSection}
          style={
            {
              ["--hero-name-ch" as string]: String(
                Math.max(heroTitle.length, 4),
              ),
            } as CSSProperties
          }
        >
          {heroTitle}
        </h2>
        <p className={styles.drumsHeroMeta}>{ctx.heroMeta}</p>
        {notesEdit && ctx.activeClipId && onNoteChange ? (
          <textarea
            className={`${styles.drumsNoteInput} ${styles.drumsHeroNoteInput}`}
            rows={2}
            placeholder="Notatka perkusji (fill, crash, ride…)"
            aria-label="Notatka aktywnej sekcji"
            value={ctx.activeNote ?? ""}
            maxLength={500}
            onChange={(e) => onNoteChange(ctx.activeClipId!, e.target.value)}
          />
        ) : ctx.activeNote ? (
          <p className={styles.drumsHeroNote}>{ctx.activeNote}</p>
        ) : null}
        <div
          className={styles.drumsMetronome}
          aria-label={`Metronom — beat ${ctx.currentBeat} / ${ctx.beatsPerBar}`}
        >
          {Array.from({ length: ctx.beatsPerBar }, (_, i) => {
            const n = i + 1;
            return (
              <span
                key={n}
                className={[
                  styles.drumsBeatDot,
                  n === 1 ? styles.drumsBeatDotDownbeat : "",
                  n < ctx.currentBeat ? styles.drumsBeatDotPassed : "",
                  n === ctx.currentBeat ? styles.drumsBeatDotActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-beat={n}
              >
                <span className={styles.drumsBeatNum}>{n}</span>
              </span>
            );
          })}
        </div>
      </header>

      <div
        ref={scrollRef}
        className={styles.drumsFormScroll}
        aria-label="Forma utworu"
      >
        <div className={styles.drumsFormStrip} role="list">
          {ctx.segments.map((seg) => {
            const isCd = seg.kind === "countdown";
            return (
              <section
                key={seg.id}
                ref={seg.active ? activeSegRef : undefined}
                role="listitem"
                className={[
                  styles.drumsFormSeg,
                  seg.active ? styles.drumsFormSegActive : "",
                  seg.past ? styles.drumsFormSegPast : "",
                  isCd ? styles.drumsFormSegCountdown : "",
                  seg.note ? styles.drumsFormSegHasNote : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  {
                    ["--seg-bars" as string]: String(Math.max(1, seg.barCount)),
                  } as CSSProperties
                }
              >
                <div className={styles.drumsFormSegHead}>
                  <span className={styles.drumsFormSegName}>
                    {fmtName(seg.name)}
                  </span>
                  <span className={styles.drumsFormSegMeta}>
                    {seg.barCount} takt{seg.barCount === 1 ? "" : "ów"}
                  </span>
                </div>
                <div className={styles.drumsFormSegBars}>
                  {seg.cells.map((cell, i) => {
                    const isLast = i === seg.cells.length - 1;
                    return (
                      <span
                        key={`${seg.id}-${cell.index}`}
                        className={[
                          styles.drumsBarCell,
                          cell.past ? styles.drumsBarCellPast : "",
                          cell.current ? styles.drumsBarCellCurrent : "",
                          isLast ? styles.drumsBarCellLast : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        title={
                          cell.barDisplay > 0
                            ? `Takt ${cell.barDisplay}`
                            : `CD ${cell.index}`
                        }
                      />
                    );
                  })}
                </div>
                {notesEdit &&
                seg.kind === "section" &&
                onNoteChange ? (
                  <textarea
                    className={`${styles.drumsNoteInput} ${styles.drumsFormSegNoteInput}`}
                    rows={2}
                    placeholder="Notatka perkusji…"
                    aria-label={`Notatka: ${seg.name}`}
                    value={seg.note ?? ""}
                    maxLength={500}
                    onChange={(e) => onNoteChange(seg.id, e.target.value)}
                  />
                ) : seg.note ? (
                  <p className={styles.drumsFormSegNote}>{seg.note}</p>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

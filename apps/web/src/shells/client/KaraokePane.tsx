import {
  applyInstrumentPitchToChord,
  formatChordForDisplay,
  formatSectionNameForDisplay,
  resolveKeyAt,
  type Project,
} from "@stagesync/shared";
import {
  buildKaraokeLiveContext,
  type KaraokeSectionGroup,
} from "../../lib/clientKaraoke.js";
import { resolveAkordClipAt } from "../../lib/akordyEdit.js";
import type { ClientDisplayPrefs } from "../../lib/clientDisplayPrefs.js";
import { isEditableKeyboardTarget } from "../../lib/isEditableKeyboardTarget.js";
import styles from "../ClientShell.module.css";
import { Button } from "@stagesync/ui";
import { useEffect, useRef, type CSSProperties } from "react";

type KaraokePaneProps = {
  project: Project | null;
  displayTicks: number;
  loading: boolean;
  hasActiveProjectId: boolean;
  prefs: ClientDisplayPrefs;
  vocalTapOn?: boolean;
  vocalTapIndex?: number;
  onVocalTap?: () => void;
};

function readAutoScroll(): boolean {
  try {
    return localStorage.getItem("stagesync-client-autoscroll") !== "0";
  } catch {
    return true;
  }
}

function applyStoredTextScale(): void {
  try {
    const n = Number(localStorage.getItem("stagesync-client-text-scale"));
    if (Number.isFinite(n) && n >= 80 && n <= 200) {
      document.documentElement.style.setProperty(
        "--ss-client-text-scale",
        `${n / 100}`,
      );
    }
  } catch {
    /* ignore */
  }
}

/** Center active line — v4 `scrollToActiveLine` (smooth scrollTo, not scrollIntoView). */
function scrollLineIntoCenter(
  container: HTMLElement,
  target: HTMLElement,
): void {
  const lineRect = target.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const lineTopInContainer =
    lineRect.top - containerRect.top + container.scrollTop;
  const idealScroll =
    lineTopInContainer + lineRect.height / 2 - container.clientHeight / 2;
  const maxScroll = Math.max(
    0,
    container.scrollHeight - container.clientHeight,
  );
  container.scrollTo({
    top: Math.max(0, Math.min(idealScroll, maxScroll)),
    behavior: "smooth",
  });
}

function SectionProgressBars({
  section,
  displayName,
}: {
  section: KaraokeSectionGroup;
  displayName: string;
}) {
  if (!section.useProgress || section.bars.length === 0) return null;
  return (
    <div
      className={styles.karaokeSectionProgress}
      aria-label={`Postęp sekcji ${displayName}`}
    >
      <div className={styles.karaokeProgressBars}>
        {section.bars.map((cell, i) => {
          const isLast = i === section.bars.length - 1;
          return (
            <div
              key={cell.index}
              className={[
                styles.karaokeProgressCell,
                cell.past ? styles.karaokeProgressCellPast : "",
                cell.current ? styles.karaokeProgressCellCurrent : "",
                isLast ? styles.karaokeProgressCellLast : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                cell.current
                  ? ({
                      ["--beat-progress" as string]: String(cell.beatProgress),
                    } as CSSProperties)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}

export function KaraokePane({
  project,
  displayTicks,
  loading,
  hasActiveProjectId,
  prefs,
  vocalTapOn = false,
  vocalTapIndex = 0,
  onVocalTap,
}: KaraokePaneProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLElement | null>(null);
  /** v4 `karaokeScrollKey` — scroll only when the active line/section id changes. */
  const scrollKeyRef = useRef<string | null>(null);

  const bindActiveRef = (isTarget: boolean) =>
    isTarget
      ? (el: HTMLElement | null) => {
          activeRef.current = el;
        }
      : undefined;

  useEffect(() => {
    applyStoredTextScale();
  }, []);

  useEffect(() => {
    if (!vocalTapOn || !onVocalTap) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (isEditableKeyboardTarget(e.target)) return;
      e.preventDefault();
      onVocalTap();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vocalTapOn, onVocalTap]);

  const ctx =
    project != null ? buildKaraokeLiveContext(project, displayTicks) : null;

  const activeLineId = ctx?.lines.find((l) => l.active)?.id ?? null;
  const activeSectionId = ctx?.sections.find((s) => s.active)?.id ?? null;
  /** Prefer line scroll; fall back to section card (progress-only sections). */
  const scrollKey =
    activeLineId != null
      ? `line-${activeLineId}`
      : activeSectionId != null
        ? `section-${activeSectionId}`
        : null;

  useEffect(() => {
    scrollKeyRef.current = null;
  }, [project?.id]);

  // v4: scroll only when karaokeScrollKey changes (active line or section).
  useEffect(() => {
    if (!scrollKey || !readAutoScroll()) return;
    if (scrollKeyRef.current === scrollKey) return;
    scrollKeyRef.current = scrollKey;

    const container = scrollRef.current;
    const target = activeRef.current;
    if (!container || !target) return;

    let cancelled = false;
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        scrollLineIntoCenter(container, target);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outer);
    };
  }, [scrollKey, project?.id]);

  if (!hasActiveProjectId) {
    return <p className={styles.empty}>Oczekiwanie na utwór…</p>;
  }

  if (loading && !project) {
    return <p className={styles.empty}>Wczytywanie utworu…</p>;
  }

  if (!project) {
    return <p className={styles.empty}>Nie udało się wczytać utworu.</p>;
  }

  if (!ctx) {
    return <p className={styles.empty}>Oczekiwanie na utwór…</p>;
  }

  const key = resolveKeyAt(project, displayTicks);
  const fmtChord = (symbol: string) =>
    formatChordForDisplay(
      applyInstrumentPitchToChord(
        symbol,
        prefs.instrumentPitch,
        prefs.instrumentPitchManual,
        key,
      ),
      {
        literalQuality: prefs.literalQuality,
        hybridPolishB: prefs.hybridPolishB,
      },
    );
  const activeChord = resolveAkordClipAt(project, displayTicks);
  const chordDisplay = activeChord ? fmtChord(activeChord.symbol) : null;

  const hasContent =
    ctx.sections.length > 0 &&
    (ctx.hasLyricLines || ctx.sections.some((s) => s.useProgress));

  return (
    <div className={styles.karaokePane}>
      {vocalTapOn ? (
        <div className={styles.vocalTapBar}>
          <span className={styles.muted}>
            Tap wokalu · linia {vocalTapIndex + 1}
          </span>
          <Button variant="primary" onClick={() => onVocalTap?.()}>
            Tap
          </Button>
        </div>
      ) : null}
      {chordDisplay ? (
        <p className={styles.karaokeChordNow} aria-live="polite">
          {chordDisplay}
        </p>
      ) : null}
      {hasContent ? (
        <div
          ref={scrollRef}
          className={styles.karaokeScroll}
          aria-label="Tekst pogrupowany w sekcje Formy"
        >
          {ctx.sections.map((sec) => {
            const isActive = sec.active;
            const sectionRefTarget =
              isActive && activeLineId == null ? true : false;
            const displayName =
              sec.name === "—"
                ? sec.name
                : formatSectionNameForDisplay(sec.name, {
                    polish: prefs.sectionNamesPolish,
                  });
            return (
              <section
                key={sec.id}
                ref={bindActiveRef(sectionRefTarget)}
                className={[
                  styles.karaokeSection,
                  isActive ? styles.karaokeSectionActive : "",
                  sec.useProgress ? styles.karaokeSectionProgressMode : "",
                  sec.kind === "countdown" ? styles.karaokeSectionCountdown : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-section-id={sec.id}
              >
                <h3 className={styles.karaokeSectionTitle}>{displayName}</h3>
                <SectionProgressBars
                  section={sec}
                  displayName={displayName}
                />
                {sec.lines.length > 0 ? (
                  <div className={styles.karaokeSectionLines}>
                    {sec.lines.map((line) => (
                      <p
                        key={line.id}
                        ref={bindActiveRef(line.active)}
                        className={[
                          styles.karaokeLine,
                          line.active ? styles.karaokeLineActive : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {line.text}
                      </p>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <div className={styles.karaokePlaceholder}>
          <p className={styles.karaokePlaceholderTitle}>Brak linii tekstu</p>
          <p className={styles.muted}>
            Dodaj clipy na lane Tekst w Timeline (Pencil).
          </p>
        </div>
      )}
    </div>
  );
}

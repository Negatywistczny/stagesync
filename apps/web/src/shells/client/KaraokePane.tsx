import {
  formatSectionNameForDisplay,
  type Project,
  type TekstBlockRole,
} from "@stagesync/shared";
import {
  buildKaraokeLiveContext,
  TEKST_BLOCK_ROLE_LABELS,
  type KaraokeLine,
  type KaraokeSectionGroup,
} from "@lib/client/clientKaraoke.js";
import type { ClientDisplayPrefs } from "@lib/client/clientDisplayPrefs.js";
import { isEditableKeyboardTarget } from "@lib/client/isEditableKeyboardTarget.js";
import styles from "../ClientShell.module.css";
import { Button } from "@stagesync/ui";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type KaraokePaneProps = {
  project: Project | null;
  displayTicks: number;
  loading: boolean;
  hasActiveProjectId: boolean;
  prefs: ClientDisplayPrefs;
  vocalTapOn?: boolean;
  vocalTapIndex?: number;
  onVocalTap?: () => void;
  onVocalTapStep?: (dir: -1 | 1) => void;
};

const ROLE_FILTER_KEY = "stagesync-karaoke-role-filter";

function readStoredRoleFilter(): TekstBlockRole | null {
  try {
    const v = localStorage.getItem(ROLE_FILTER_KEY);
    if (v === "vocal_1" || v === "vocal_2" || v === "backing" || v === "all") {
      return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredRoleFilter(role: TekstBlockRole | null): void {
  try {
    if (role == null) localStorage.removeItem(ROLE_FILTER_KEY);
    else localStorage.setItem(ROLE_FILTER_KEY, role);
  } catch {
    /* ignore */
  }
}

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

function KaraokeLineText({ line }: { line: KaraokeLine }) {
  const blocks = line.blocks;
  if (blocks == null || blocks.length === 0) {
    return <>{line.text}</>;
  }
  return (
    <>
      {blocks.map((block) => (
        <span
          key={block.id}
          data-block-id={block.id}
          data-block-active={block.active ? "true" : undefined}
          data-block-past={block.past ? "true" : undefined}
          className={[
            styles.karaokeBlock,
            block.active ? styles.karaokeBlockActive : "",
            !block.active && block.past ? styles.karaokeBlockPast : "",
            !block.active && !block.past ? styles.karaokeBlockUpcoming : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {block.text}
        </span>
      ))}
    </>
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
  onVocalTapStep,
}: KaraokePaneProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLElement | null>(null);
  /** v4 `karaokeScrollKey` — scroll only when the active line/section id changes. */
  const scrollKeyRef = useRef<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<TekstBlockRole | null>(() =>
    readStoredRoleFilter(),
  );

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
      if (isEditableKeyboardTarget(e.target)) return;
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        onVocalTap();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        onVocalTapStep?.(e.key === "ArrowUp" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vocalTapOn, onVocalTap, onVocalTapStep]);

  const ctx =
    project != null
      ? buildKaraokeLiveContext(project, displayTicks, { roleFilter })
      : null;

  const showRoleFilter = ctx != null && ctx.availableRoles.length >= 2;

  const activeLineId = ctx?.lines.find((l) => l.active)?.id ?? null;
  const activeSection = ctx?.sections.find((s) => s.active) ?? null;
  /**
   * v4: scroll to line when lit; during lyric-section rests keep scroll (no
   * jump to section). Section scroll only for progress / empty-line cards.
   */
  const scrollKey =
    activeLineId != null
      ? `line-${activeLineId}`
      : activeSection != null &&
          (activeSection.useProgress || activeSection.lines.length === 0)
        ? `section-${activeSection.id}`
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
    return (
      <p className={styles.empty} role="status" aria-live="polite">
        Oczekiwanie na utwór…
      </p>
    );
  }

  if (loading && !project) {
    return (
      <p className={styles.empty} role="status" aria-live="polite">
        Wczytywanie utworu…
      </p>
    );
  }

  if (!project) {
    return (
      <p className={styles.empty} role="status" aria-live="polite">
        Nie udało się wczytać utworu.
      </p>
    );
  }

  if (!ctx) {
    return (
      <p className={styles.empty} role="status" aria-live="polite">
        Oczekiwanie na utwór…
      </p>
    );
  }

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
      {showRoleFilter ? (
        <label className={styles.karaokeRoleFilter}>
          Rola wokalu
          <select
            className={styles.karaokeRoleSelect}
            aria-label="Filtr roli wokalu"
            data-testid="karaoke-role-filter"
            value={
              roleFilter != null && ctx.availableRoles.includes(roleFilter)
                ? roleFilter
                : ""
            }
            onChange={(e) => {
              const v = e.target.value;
              const next =
                v === "vocal_1" ||
                v === "vocal_2" ||
                v === "backing" ||
                v === "all"
                  ? v
                  : null;
              setRoleFilter(next);
              writeStoredRoleFilter(next);
            }}
          >
            <option value="">Wszystkie</option>
            {ctx.availableRoles.map((role) => (
              <option key={role} value={role}>
                {TEKST_BLOCK_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {hasContent ? (
        <div
          ref={scrollRef}
          className={styles.karaokeScroll}
          aria-label="Tekst pogrupowany w sekcje Formy"
        >
          {/* v4: `.view-scroll` > `.karaoke-scroll-pad` (pad owns 50vh room) */}
          <div className={styles.karaokeScrollPad}>
            {ctx.sections.map((sec) => {
              const isActive = sec.active;
              const sectionRefTarget =
                scrollKey === `section-${sec.id}` ? true : false;
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
                    sec.kind === "countdown"
                      ? styles.karaokeSectionCountdown
                      : "",
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
                      {sec.lines.map((line) => {
                        const hasBlocks =
                          line.blocks != null && line.blocks.length > 0;
                        return (
                          <p
                            key={line.id}
                            ref={bindActiveRef(line.active)}
                            data-line-id={line.id}
                            data-line-active={line.active ? "true" : undefined}
                            className={[
                              styles.karaokeLine,
                              line.active && !hasBlocks
                                ? styles.karaokeLineActive
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <KaraokeLineText line={line} />
                          </p>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className={styles.karaokePlaceholder}
          role="status"
          aria-live="polite"
        >
          <p className={styles.karaokePlaceholderTitle}>Brak linii tekstu</p>
          <p className={styles.muted}>
            Dodaj clipy na lane Tekst w Timeline (Ołówek).
          </p>
        </div>
      )}
    </div>
  );
}

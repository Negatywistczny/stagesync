import type { Project } from "@stagesync/shared";
import { buildKaraokeLiveContext } from "../../lib/clientKaraoke.js";
import styles from "../ClientShell.module.css";
import { Button } from "@stagesync/ui";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type KaraokePaneProps = {
  project: Project | null;
  displayTicks: number;
  loading: boolean;
  hasActiveProjectId: boolean;
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

export function KaraokePane({
  project,
  displayTicks,
  loading,
  hasActiveProjectId,
  vocalTapOn = false,
  vocalTapIndex = 0,
  onVocalTap,
}: KaraokePaneProps) {
  const activeRef = useRef<HTMLParagraphElement | null>(null);
  const [pulse, setPulse] = useState(false);
  const prevBeat = useRef<number | null>(null);

  useEffect(() => {
    if (!vocalTapOn || !onVocalTap) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        onVocalTap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vocalTapOn, onVocalTap]);

  const ctx =
    project != null ? buildKaraokeLiveContext(project, displayTicks) : null;

  const activeLineId = ctx?.lines.find((l) => l.active)?.id ?? null;
  const currentBeat = ctx?.currentBeat ?? null;

  useEffect(() => {
    if (!activeLineId || !readAutoScroll()) return;
    activeRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [activeLineId, displayTicks, project?.id]);

  useEffect(() => {
    if (currentBeat == null) return;
    if (prevBeat.current != null && prevBeat.current !== currentBeat) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 120);
      prevBeat.current = currentBeat;
      return () => window.clearTimeout(t);
    }
    prevBeat.current = currentBeat;
  }, [currentBeat]);

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
      {ctx.sectionBars.length > 0 ? (
        <div className={styles.barStrip} aria-label="Postęp sekcji">
          {ctx.sectionBars.map((cell) => (
            <div
              key={cell.index}
              className={[
                styles.barCell,
                cell.past ? styles.barCellPast : "",
                cell.current ? styles.barCellCurrent : "",
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
          ))}
        </div>
      ) : null}
      {ctx.hasLyricLines ? (
        <div className={styles.karaokeLines} aria-label="Linie tekstu">
          {ctx.lines.map((line) => (
            <p
              key={line.id}
              ref={line.active ? activeRef : undefined}
              className={[
                styles.karaokeLine,
                line.active ? styles.karaokeLineActive : styles.karaokeLineDim,
                line.active && pulse ? styles.karaokeBeatPulse : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {line.text}
            </p>
          ))}
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

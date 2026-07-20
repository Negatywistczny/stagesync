import type { Project } from "@stagesync/shared";
import { buildKaraokeLiveContext } from "../../lib/clientKaraoke.js";
import styles from "../ClientShell.module.css";
import { Button } from "@stagesync/ui";
import { useEffect, useRef } from "react";

type KaraokePaneProps = {
  project: Project | null;
  displayTicks: number;
  loading: boolean;
  hasActiveProjectId: boolean;
  vocalTapOn?: boolean;
  vocalTapIndex?: number;
  onVocalTap?: () => void;
};

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

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [displayTicks, project?.id]);

  if (!hasActiveProjectId) {
    return <p className={styles.empty}>Oczekiwanie na utwór…</p>;
  }

  if (loading && !project) {
    return <p className={styles.empty}>Wczytywanie utworu…</p>;
  }

  if (!project) {
    return <p className={styles.empty}>Nie udało się wczytać utworu.</p>;
  }

  const ctx = buildKaraokeLiveContext(project, displayTicks);
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
      {ctx.hasLyricLines ? (
        <div className={styles.karaokeLines} aria-label="Linie tekstu">
          {ctx.lines.map((line) => (
            <p
              key={line.id}
              ref={line.active ? activeRef : undefined}
              className={[
                styles.karaokeLine,
                line.active ? styles.karaokeLineActive : styles.karaokeLineDim,
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

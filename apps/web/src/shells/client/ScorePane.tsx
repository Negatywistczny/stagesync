/**
 * Client MusicXML score (OSMD) — playhead sync + click-to-seek.
 * Zoom / follow / octave / parts live in Client „Partytura” settings popover.
 */

import { useEffect, useRef, useState } from "react";
import type { Project } from "@stagesync/shared";
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { assetFileUrl } from "../../lib/audioPlayback.js";
import {
  applyOsmdZoom,
  applyScorePartVisibility,
  applyScoreSheetTranspose,
  createOsmd,
  fetchScoreBlob,
  goToScoreBar,
  listScoreParts,
  renderOsmd,
  scoreBarFromClientPoint,
  scoreOctaveToSemitones,
  scrollCursorIntoView,
  type ScoreOctave,
  type ScorePartInfo,
} from "../../lib/scoreOsmd.js";
import {
  scoreBarFromDisplayTicks,
  seekTicksFromScoreBar,
} from "../../lib/scorePlayhead.js";
import styles from "../ClientShell.module.css";

type Props = {
  project: Project | null;
  loading: boolean;
  hasActiveProjectId: boolean;
  displayTicks: number;
  scoreZoom: number;
  followPlayhead: boolean;
  scoreOctave: ScoreOctave;
  hiddenPartIds: readonly string[];
  onPartsChange: (parts: ScorePartInfo[]) => void;
  onSeek: (ticks: number) => void;
  /** Live Desk team transpose (semitones). */
  teamSemitones?: number;
};

export function ScorePane({
  project,
  loading,
  hasActiveProjectId,
  displayTicks,
  scoreZoom,
  followPlayhead,
  scoreOctave,
  hiddenPartIds,
  onPartsChange,
  onSeek,
  teamSemitones = 0,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const lastBarRef = useRef<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const xmlAsset = (project?.assets ?? []).find((a) => a.kind === "musicxml");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !project || !xmlAsset) {
      osmdRef.current = null;
      setReady(false);
      onPartsChange([]);
      return;
    }

    let cancelled = false;
    const osmd = createOsmd(host);
    osmdRef.current = osmd;
    setLoadError(null);
    setReady(false);
    lastBarRef.current = null;
    onPartsChange([]);

    const url = assetFileUrl(project.id, xmlAsset.id);
    void (async () => {
      try {
        const blob = await fetchScoreBlob(url);
        if (cancelled) return;
        await osmd.load(blob);
        if (cancelled) return;
        osmd.Zoom = Math.max(0.4, Math.min(2.5, scoreZoom / 100));
        applyScorePartVisibility(osmd, hiddenPartIds);
        applyScoreSheetTranspose(
          osmd,
          teamSemitones + scoreOctaveToSemitones(scoreOctave),
        );
        renderOsmd(osmd);
        if (cancelled) return;
        onPartsChange(listScoreParts(osmd));
        setReady(true);
        const bar = scoreBarFromDisplayTicks(project, displayTicks);
        goToScoreBar(osmd, bar);
        lastBarRef.current = bar;
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Nie można załadować MusicXML",
        );
        setReady(false);
        onPartsChange([]);
      }
    })();

    return () => {
      cancelled = true;
      osmdRef.current = null;
      try {
        osmd.clear();
      } catch {
        /* ignore */
      }
      host.replaceChildren();
    };
    // Reload only when project / asset identity changes — zoom/ticks sync separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [project?.id, xmlAsset?.id]);

  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !ready) return;
    applyOsmdZoom(osmd, scoreZoom);
    if (lastBarRef.current != null) {
      goToScoreBar(osmd, lastBarRef.current);
    }
  }, [scoreZoom, ready]);

  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !ready || !project) return;
    const bar = scoreBarFromDisplayTicks(project, displayTicks);
    if (bar === lastBarRef.current) return;
    lastBarRef.current = bar;
    goToScoreBar(osmd, bar);
    if (followPlayhead && scrollRef.current) {
      scrollCursorIntoView(scrollRef.current, osmd);
    }
  }, [displayTicks, project, ready, followPlayhead]);

  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !ready) return;
    applyScorePartVisibility(osmd, hiddenPartIds);
    applyScoreSheetTranspose(
      osmd,
      teamSemitones + scoreOctaveToSemitones(scoreOctave),
    );
    if (lastBarRef.current != null) {
      goToScoreBar(osmd, lastBarRef.current);
    }
  }, [hiddenPartIds, scoreOctave, teamSemitones, ready]);

  if (!hasActiveProjectId) {
    return <p className={styles.empty}>Oczekiwanie na utwór…</p>;
  }
  if (loading && !project) {
    return <p className={styles.empty}>Wczytywanie utworu…</p>;
  }
  if (!project) {
    return <p className={styles.empty}>Nie udało się wczytać utworu.</p>;
  }

  return (
    <div className={styles.scorePane}>
      <div className={styles.scoreWrap}>
        {!xmlAsset ? (
          <div className={styles.scoreEmptyCard}>
            <p className={styles.scoreEmptyTitle}>Partytura</p>
            <p className={styles.scoreEmptyText}>
              Brak pliku MusicXML w projekcie — dodaj w Admin → Utwory → Wybrany
              (XML / Pliki projektu).
            </p>
          </div>
        ) : loadError ? (
          <div className={styles.scoreEmptyCard}>
            <p className={styles.scoreEmptyTitle}>Błąd partytury</p>
            <p className={styles.scoreEmptyText}>{loadError}</p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className={styles.scoreScroll}
            onClick={(e) => {
              const osmd = osmdRef.current;
              const host = hostRef.current;
              if (!osmd || !host || !ready) return;
              const bar = scoreBarFromClientPoint(
                osmd,
                host,
                e.clientX,
                e.clientY,
              );
              if (bar == null) return;
              onSeek(seekTicksFromScoreBar(project, bar, displayTicks));
            }}
          >
            <div ref={hostRef} className={styles.scoreHost} />
            {!ready ? (
              <p className={styles.scoreLoading} role="status">
                Wczytywanie MusicXML…
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Client MusicXML score (OSMD) — playhead sync + click-to-seek + parts/octave.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@stagesync/ui";
import type { Project } from "@stagesync/shared";
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { assetFileUrl } from "../../lib/audioPlayback.js";
import {
  applyOsmdZoom,
  applyScorePartVisibility,
  applyScoreSheetTranspose,
  clampScoreOctave,
  createOsmd,
  goToScoreBar,
  listScoreParts,
  loadScoreHiddenParts,
  loadScoreOctave,
  renderOsmd,
  saveScoreHiddenParts,
  saveScoreOctave,
  scoreBarFromClientPoint,
  scoreOctaveToSemitones,
  scrollCursorIntoView,
  type ScoreOctave,
  type ScorePartInfo,
} from "../../lib/scoreOsmd.js";
import {
  SCORE_ZOOM_DEFAULT,
  SCORE_ZOOM_MAX,
  SCORE_ZOOM_MIN,
  SCORE_ZOOM_STEP,
  clampScoreZoom,
  scoreBarFromDisplayTicks,
  seekTicksFromScoreBar,
} from "../../lib/scorePlayhead.js";
import { ShellSwitchRow } from "../ShellSwitchRow.js";
import styles from "../ClientShell.module.css";

type Props = {
  project: Project | null;
  loading: boolean;
  hasActiveProjectId: boolean;
  displayTicks: number;
  scoreZoom: number;
  onScoreZoomChange: (percent: number) => void;
  followPlayhead: boolean;
  onFollowPlayheadChange: (on: boolean) => void;
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
  onScoreZoomChange,
  followPlayhead,
  onFollowPlayheadChange,
  onSeek,
  teamSemitones = 0,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const lastBarRef = useRef<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [parts, setParts] = useState<ScorePartInfo[]>([]);
  const [hiddenPartIds, setHiddenPartIds] = useState<string[]>([]);
  const [scoreOctave, setScoreOctave] = useState<ScoreOctave>(0);

  const xmlAsset = (project?.assets ?? []).find((a) => a.kind === "musicxml");
  const projectId = project?.id;

  useEffect(() => {
    if (!projectId) {
      setHiddenPartIds([]);
      setScoreOctave(0);
      return;
    }
    setHiddenPartIds(loadScoreHiddenParts(projectId));
    setScoreOctave(loadScoreOctave(projectId));
  }, [projectId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !project || !xmlAsset) {
      osmdRef.current = null;
      setReady(false);
      setParts([]);
      return;
    }

    let cancelled = false;
    const osmd = createOsmd(host);
    osmdRef.current = osmd;
    setLoadError(null);
    setReady(false);
    lastBarRef.current = null;

    const url = assetFileUrl(project.id, xmlAsset.id);
    const hidden = loadScoreHiddenParts(project.id);
    const octave = loadScoreOctave(project.id);
    void (async () => {
      try {
        await osmd.load(url);
        if (cancelled) return;
        osmd.Zoom = Math.max(0.4, Math.min(2.5, scoreZoom / 100));
        applyScorePartVisibility(osmd, hidden);
        applyScoreSheetTranspose(
          osmd,
          teamSemitones + scoreOctaveToSemitones(octave),
        );
        renderOsmd(osmd);
        if (cancelled) return;
        setParts(listScoreParts(osmd));
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
        setParts([]);
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

  const bumpZoom = (delta: number) => {
    onScoreZoomChange(clampScoreZoom(scoreZoom + delta));
  };

  const setPartVisible = (partId: string, visible: boolean) => {
    setHiddenPartIds((prev) => {
      let next = visible
        ? prev.filter((id) => id !== partId)
        : prev.includes(partId)
          ? prev
          : [...prev, partId];
      if (parts.length > 0 && next.length >= parts.length) {
        next = parts.filter((p) => p.id !== partId).map((p) => p.id);
      }
      if (projectId) saveScoreHiddenParts(projectId, next);
      return next;
    });
  };

  const onOctaveChange = (raw: string) => {
    const next = clampScoreOctave(raw);
    setScoreOctave(next);
    if (projectId) saveScoreOctave(projectId, next);
  };

  return (
    <div className={styles.scorePane}>
      <div className={styles.scoreToolbar} data-ss-level="2" role="toolbar" aria-label="Partytura">
        <div className={styles.scoreZoomRow}>
          <Button
            variant="ghost"
            aria-label="Pomniejsz partyturę"
            onClick={() => bumpZoom(-SCORE_ZOOM_STEP)}
            disabled={scoreZoom <= SCORE_ZOOM_MIN}
          >
            −
          </Button>
          <span className={styles.scoreZoomLabel}>{scoreZoom}%</span>
          <Button
            variant="ghost"
            aria-label="Powiększ partyturę"
            onClick={() => bumpZoom(SCORE_ZOOM_STEP)}
            disabled={scoreZoom >= SCORE_ZOOM_MAX}
          >
            +
          </Button>
          <Button
            variant="ghost"
            onClick={() => onScoreZoomChange(SCORE_ZOOM_DEFAULT)}
          >
            Reset
          </Button>
        </div>
        <label className={styles.scoreOctaveField}>
          Oktawa
          <select
            className={styles.scoreOctaveSelect}
            aria-label="Transpozycja oktawy partytury"
            value={String(scoreOctave)}
            disabled={!ready}
            onChange={(e) => onOctaveChange(e.target.value)}
          >
            <option value="-1">−1</option>
            <option value="0">0</option>
            <option value="1">+1</option>
          </select>
        </label>
        <ShellSwitchRow
          checked={followPlayhead}
          onChange={(e) => onFollowPlayheadChange(e.target.checked)}
        >
          Śledź wskaźnik odtwarzania
        </ShellSwitchRow>
      </div>

      {ready && parts.length > 1 ? (
        <div
          className={styles.scoreParts}
          role="group"
          aria-label="Widoczne partie"
        >
          {parts.map((part) => {
            const on = !hiddenPartIds.includes(part.id);
            return (
              <label key={part.id} className={styles.scorePartItem}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => setPartVisible(part.id, e.target.checked)}
                />
                <span>{part.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}

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

import { Link } from "react-router";
import {
  applyTimelineNudge,
  nudgeShowsLeftEdge,
  shouldShowTouchNudge,
} from "@lib/timeline/timelineTouchNudge.js";
import { TimelineStatusFooter } from "./components/TimelineStatusFooter.js";
import { TouchNudgeBar } from "./components/TouchNudgeBar.js";
import { TimelineAudioFileInput } from "./components/TimelineAudioFileInput.js";
import { TimelineHeaderContainer } from "./containers/TimelineHeaderContainer.js";
import { TimelineDialogsContainer } from "./containers/TimelineDialogsContainer.js";
import { TimelineCanvasViewport } from "./containers/TimelineCanvasViewport.js";
import { useTimelineShellState } from "./hooks/useTimelineShellState.js";
import styles from "./TimelineShell.module.css";

export function TimelineShell() {
  const shell = useTimelineShellState();

  if (!shell.projectId) {
    return (
      <div className={styles.shell}>
        <p className={styles.muted}>Brak identyfikatora projektu.</p>
        <Link to="/admin">Admin</Link>
      </div>
    );
  }

  if (shell.loading && !shell.draftProject) {
    return (
      <div className={styles.shell}>
        <p className={styles.muted}>Wczytywanie projektu…</p>
      </div>
    );
  }

  if (shell.loadError && !shell.draftProject) {
    return (
      <div className={styles.shell}>
        <p className={styles.muted}>{shell.loadError}</p>
        <Link to="/admin">Admin</Link>
      </div>
    );
  }

  return (
    <div
      className={shell.rootClassName}
      data-tl-tier={shell.touchTier}
      data-tl-touch-pan={shell.touchPanAttr}
    >
      <TimelineAudioFileInput
        laneAudioFileRef={shell.laneAudioFileRef}
        audioUploadPending={shell.audioUploadPending}
        laneImportTrackIdRef={shell.laneImportTrackIdRef}
        laneImportStartTicksRef={shell.laneImportStartTicksRef}
        onUploadAudioToTrack={shell.onUploadAudioToTrack}
      />

      <TimelineHeaderContainer {...shell.headerContainerProps} />

      <TimelineCanvasViewport {...shell.canvasViewportProps} />

      <TimelineStatusFooter
        wsStatus={shell.wsStatus}
        isMobilePreview={shell.isMobilePreview}
        snapMode={shell.snapMode}
        setSnapMode={shell.setSnapMode}
        zoomUi={shell.zoomUi}
        setZoomUi={shell.setZoomUi}
        zoomH={shell.zoomH}
        setZoomH={shell.setZoomH}
        zoomV={shell.zoomV}
        setVerticalZoom={shell.setVerticalZoom}
        timelineSurface={shell.timelineSurface}
      />

      {shouldShowTouchNudge(
        shell.touchTier,
        shell.selectionLane,
        shell.primaryId,
        shell.draftProject,
      ) &&
      shell.draftProject &&
      shell.selectionLane &&
      shell.primaryId ? (
        <TouchNudgeBar
          clipId={shell.primaryId}
          lane={shell.selectionLane}
          showLeftEdge={nudgeShowsLeftEdge(
            shell.draftProject,
            shell.selectionLane,
            shell.primaryId,
          )}
          onAction={(action) => {
            shell.commitDraft(
              applyTimelineNudge(
                shell.draftProject!,
                shell.selectionLane!,
                shell.primaryId!,
                action,
              ),
            );
          }}
        />
      ) : null}

      {shell.canvasNotice ? (
        <p className={styles.canvasNotice} role="status" aria-live="polite">
          {shell.canvasNotice}
        </p>
      ) : null}

      {shell.touchTier === "mobile" ? (
        <p className={styles.touchTierNote} role="status">
          Tryb odtwarzacza
        </p>
      ) : null}

      <TimelineDialogsContainer {...shell.dialogsContainerProps} />
    </div>
  );
}

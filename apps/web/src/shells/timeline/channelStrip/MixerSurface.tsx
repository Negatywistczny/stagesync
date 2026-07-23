/**
 * Thin Mixer surface — vertical channel strips reusing shared controls.
 * Architecture foundation for a full Mixer; controls are live (not stubs).
 */

import type { MouseEvent } from "react";
import type { Project } from "@stagesync/shared";
import type { TrackSelection } from "../../../lib/timelineSelection.js";
import { ChannelStripControls } from "./ChannelStripControls.js";
import type { ChannelStripCallbacks } from "./channelStripTypes.js";
import styles from "./MixerSurface.module.css";

export type MixerSurfaceProps = {
  project: Project;
  trackSelection: TrackSelection;
  soloAudioTrackIds: readonly string[];
  renamingTrackId: string | null;
  renameValue: string;
  buildCallbacks: (trackId: string) => ChannelStripCallbacks;
  onEmptyDoubleClick?: (e: MouseEvent) => void;
};

export function MixerSurface({
  project,
  trackSelection,
  soloAudioTrackIds,
  renamingTrackId,
  renameValue,
  buildCallbacks,
  onEmptyDoubleClick,
}: MixerSurfaceProps) {
  return (
    <div
      className={styles.root}
      role="region"
      aria-label="Mixer"
      onDoubleClick={onEmptyDoubleClick}
    >
      <div className={styles.strips}>
        {project.audioTracks.map((track) => {
          const callbacks = buildCallbacks(track.id);
          return (
            <ChannelStripControls
              key={track.id}
              layout="mixer"
              strip={{
                trackId: track.id,
                name: track.name,
                muted: Boolean(track.muted),
                gainDb: track.gainDb ?? 0,
                soloed: soloAudioTrackIds.includes(track.id),
                selected: trackSelection.ids.includes(track.id),
              }}
              callbacks={callbacks}
              renaming={renamingTrackId === track.id}
              renameValue={
                renamingTrackId === track.id ? renameValue : track.name
              }
            />
          );
        })}
      </div>
      {project.audioTracks.length === 0 ? (
        <p className={styles.empty}>
          Brak ścieżek audio — dwuklik albo „+ Dodaj Ścieżkę” na Timeline.
        </p>
      ) : null}
    </div>
  );
}

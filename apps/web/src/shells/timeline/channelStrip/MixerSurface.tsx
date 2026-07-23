/**
 * Mixer surface — 4 zones L→R: Audio | Busses | Click | Master.
 */

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { Project } from "@stagesync/shared";
import type { TrackSelection } from "../../../lib/timelineSelection.js";
import {
  getMetronomePrefs,
  METRONOME_PREFS_CHANGED_EVENT,
  setMetronomePrefs,
  type MetronomePrefs,
} from "../../../lib/metronomePrefs.js";
import { ChannelStripControls } from "./ChannelStripControls.js";
import type {
  ChannelStripCallbacks,
  ClickStripCallbacks,
  MasterStripCallbacks,
} from "./channelStripTypes.js";
import { ClickStrip } from "./ClickStrip.js";
import { MasterStrip } from "./MasterStrip.js";
import {
  serializeOutputDest,
  type OutputSelectorOption,
} from "./OutputSelector.js";
import { useMixerMeterLevels } from "./useMixerMeterLevels.js";
import styles from "./MixerSurface.module.css";

export type MixerSurfaceProps = {
  project: Project;
  trackSelection: TrackSelection;
  soloAudioTrackIds: readonly string[];
  soloBusIds: readonly string[];
  renamingTrackId: string | null;
  renameValue: string;
  renamingBusId: string | null;
  busRenameValue: string;
  buildCallbacks: (trackId: string) => ChannelStripCallbacks;
  buildBusCallbacks: (busId: string) => ChannelStripCallbacks;
  masterCallbacks: MasterStripCallbacks;
  clickCallbacks: ClickStripCallbacks;
  clickMuted: boolean;
  playing: boolean;
  onAddBus: () => void;
  onEmptyDoubleClick?: (e: MouseEvent) => void;
};

export function MixerSurface({
  project,
  trackSelection,
  soloAudioTrackIds,
  soloBusIds,
  renamingTrackId,
  renameValue,
  renamingBusId,
  busRenameValue,
  buildCallbacks,
  buildBusCallbacks,
  masterCallbacks,
  clickCallbacks,
  clickMuted,
  playing,
  onAddBus,
  onEmptyDoubleClick,
}: MixerSurfaceProps) {
  const trackIds = project.audioTracks.map((t) => t.id);
  const busses = project.audioBusses ?? [];
  const busIds = busses.map((b) => b.id);
  const meters = useMixerMeterLevels(trackIds, true, { playing, busIds });
  const [metroPrefs, setMetroPrefs] = useState<MetronomePrefs>(() =>
    getMetronomePrefs(),
  );

  const trackOutputOptions: OutputSelectorOption[] = useMemo(() => {
    return [
      { value: "master", label: "Master" },
      ...busses.map((b) => ({
        value: `bus:${b.id}`,
        label: b.name,
      })),
    ];
  }, [busses]);

  const busOutputOptions: OutputSelectorOption[] = useMemo(
    () => [{ value: "master", label: "Master" }],
    [],
  );

  useEffect(() => {
    function onPrefs(e: Event) {
      const detail = (e as CustomEvent<MetronomePrefs>).detail;
      if (detail) setMetroPrefs(detail);
      else setMetroPrefs(getMetronomePrefs());
    }
    window.addEventListener(METRONOME_PREFS_CHANGED_EVENT, onPrefs);
    return () =>
      window.removeEventListener(METRONOME_PREFS_CHANGED_EVENT, onPrefs);
  }, []);

  return (
    <div
      className={styles.root}
      role="region"
      aria-label="Mixer"
      onDoubleClick={onEmptyDoubleClick}
    >
      <div className={styles.bank}>
        {/* Scrollable Audio + Busy; Click/Master pinned as sibling (not sticky-in-overflow). */}
        <div className={styles.scrollBank}>
          {/* Zone 1 — Audio tracks */}
          <section className={styles.zone} aria-label="Ścieżki audio">
            <div className={styles.zoneHead}>
              <span className={styles.zoneTitle}>Audio</span>
            </div>
            <div className={styles.strips}>
              {project.audioTracks.map((track) => {
                const callbacks = buildCallbacks(track.id);
                const reading = meters.tracks[track.id];
                const channelMode =
                  track.channelMode === "mono" ? "mono" : "stereo";
                return (
                  <ChannelStripControls
                    key={track.id}
                    layout="mixer"
                    strip={{
                      trackId: track.id,
                      name: track.name,
                      muted: Boolean(track.muted),
                      gainDb: track.gainDb ?? 0,
                      pan: track.pan ?? 0,
                      channelMode,
                      soloed: soloAudioTrackIds.includes(track.id),
                      selected: trackSelection.ids.includes(track.id),
                      meterDb: reading?.liveDb,
                      meterDbR: reading?.liveDbR,
                      hold: reading?.hold,
                      color: track.color,
                      icon: track.icon,
                      kind: "track",
                      outputValue: serializeOutputDest(track.output),
                      outputOptions: trackOutputOptions,
                    }}
                    callbacks={{
                      ...callbacks,
                      onHoldClear: () => meters.clearTrackHold(track.id),
                    }}
                    renaming={renamingTrackId === track.id}
                    renameValue={
                      renamingTrackId === track.id ? renameValue : track.name
                    }
                  />
                );
              })}
              {project.audioTracks.length === 0 ? (
                <p className={styles.empty}>
                  Brak ścieżek — dwuklik albo „+ Dodaj Ścieżkę” na Timeline.
                </p>
              ) : null}
            </div>
          </section>

          {/* Zone 2 — Busses */}
          <section
            className={[styles.zone, styles.busZone].join(" ")}
            aria-label="Busy"
          >
            <div className={styles.zoneHead}>
              <span className={styles.zoneTitle}>Busy</span>
              <button
                type="button"
                className={styles.addBusBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddBus();
                }}
              >
                + Dodaj Bus
              </button>
            </div>
            <div className={styles.strips}>
              {busses.map((bus) => {
                const callbacks = buildBusCallbacks(bus.id);
                const reading = meters.busses[bus.id];
                const channelMode =
                  bus.channelMode === "mono" ? "mono" : "stereo";
                return (
                  <ChannelStripControls
                    key={bus.id}
                    layout="mixer"
                    strip={{
                      trackId: bus.id,
                      name: bus.name,
                      muted: Boolean(bus.muted),
                      gainDb: bus.gainDb ?? 0,
                      pan: bus.pan ?? 0,
                      channelMode,
                      soloed: soloBusIds.includes(bus.id),
                      selected: false,
                      meterDb: reading?.liveDb,
                      meterDbR: reading?.liveDbR,
                      hold: reading?.hold,
                      kind: "bus",
                      outputValue: "master",
                      outputOptions: busOutputOptions,
                    }}
                    callbacks={{
                      ...callbacks,
                      onHoldClear: () => meters.clearBusHold(bus.id),
                    }}
                    renaming={renamingBusId === bus.id}
                    renameValue={
                      renamingBusId === bus.id ? busRenameValue : bus.name
                    }
                  />
                );
              })}
            </div>
          </section>
        </div>

        {/* Zone 3+4 — Click + Master (pinned right sibling) */}
        <div className={styles.masterRail}>
          <ClickStrip
            state={{
              muted: clickMuted,
              gainDb: metroPrefs.masterGainDb,
              meterDb: meters.click.liveDb,
              hold: meters.click.hold,
            }}
            callbacks={{
              onMuteClick: clickCallbacks.onMuteClick,
              onGainChange: (gainDb) => {
                setMetronomePrefs({ masterGainDb: gainDb });
              },
              onGainReset: () => {
                setMetronomePrefs({ masterGainDb: 0 });
              },
              onHoldClear: () => meters.clearClickHold(),
            }}
          />
          <MasterStrip
            state={{
              gainDb: project.masterGainDb ?? 0,
              meterL: meters.master.liveL,
              meterR: meters.master.liveR,
              holdL: meters.master.holdL,
              holdR: meters.master.holdR,
            }}
            callbacks={{
              ...masterCallbacks,
              onHoldClear: () => meters.clearMasterHold(),
            }}
          />
        </div>
      </div>
    </div>
  );
}

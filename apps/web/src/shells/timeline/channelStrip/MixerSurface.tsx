/**
 * Mixer surface — zones L→R: Audio | Busses | HW | Click | Master.
 */

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { emptyPeakHold, type Project } from "@stagesync/shared";
import type { TrackSelection } from "../../../lib/timelineSelection.js";
import {
  AUDIO_HW_CAPABILITY_EVENT,
  getAudioHwCapability,
  refreshAudioHwCapability,
  type AudioHwCapability,
} from "../../../lib/audioHwCapability.js";
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
import { HwOutStrip } from "./HwOutStrip.js";
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
  onAddHwOut?: () => void;
  onHwGainChange?: (hwOutputId: string, gainDb: number) => void;
  onHwMuteToggle?: (hwOutputId: string) => void;
  onHwRemove?: (hwOutputId: string) => void;
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
  onAddHwOut,
  onHwGainChange,
  onHwMuteToggle,
  onHwRemove,
  onEmptyDoubleClick,
}: MixerSurfaceProps) {
  const trackIds = project.audioTracks.map((t) => t.id);
  const busses = useMemo(() => project.audioBusses ?? [], [project.audioBusses]);
  const busIds = busses.map((b) => b.id);
  const hwOuts = useMemo(
    () => project.audioHardwareOutputs ?? [],
    [project.audioHardwareOutputs],
  );
  const hwIds = hwOuts.map((h) => h.id);
  const meters = useMixerMeterLevels(trackIds, true, {
    playing,
    busIds,
    hwIds,
  });
  const [metroPrefs, setMetroPrefs] = useState<MetronomePrefs>(() =>
    getMetronomePrefs(),
  );
  const [hwCap, setHwCap] = useState<AudioHwCapability>(() =>
    getAudioHwCapability(),
  );

  useEffect(() => {
    refreshAudioHwCapability();
    setHwCap(getAudioHwCapability());
    function onCap(e: Event) {
      const detail = (e as CustomEvent<AudioHwCapability>).detail;
      if (detail) setHwCap(detail);
      else setHwCap(getAudioHwCapability());
    }
    window.addEventListener(AUDIO_HW_CAPABILITY_EVENT, onCap);
    return () => window.removeEventListener(AUDIO_HW_CAPABILITY_EVENT, onCap);
  }, []);

  const hwOptions: OutputSelectorOption[] = useMemo(() => {
    if (!hwCap.uiAllowed) return [];
    return hwOuts.map((h) => ({
      value: `hw:${h.id}`,
      label: h.name,
    }));
  }, [hwCap.uiAllowed, hwOuts]);

  const trackOutputOptions: OutputSelectorOption[] = useMemo(() => {
    return [
      { value: "master", label: "Master" },
      ...busses.map((b) => ({
        value: `bus:${b.id}`,
        label: b.name,
      })),
      ...hwOptions,
    ];
  }, [busses, hwOptions]);

  const busOutputOptionsFor = (busId: string): OutputSelectorOption[] => [
    { value: "master", label: "Master" },
    ...busses
      .filter((b) => b.id !== busId)
      .map((b) => ({
        value: `bus:${b.id}`,
        label: b.name,
      })),
    ...hwOptions,
  ];

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
        <div className={styles.scrollBank}>
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
                const outVal = serializeOutputDest(track.output);
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
                      outputValue: outVal,
                      outputOptions: trackOutputOptions,
                      outputDisabled:
                        playing &&
                        (outVal.startsWith("hw:") || hwOptions.length > 0),
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
                <p className={styles.empty} role="status" aria-live="polite">
                  Brak ścieżek — dwuklik albo „+ Dodaj Ścieżkę” na Timeline.
                </p>
              ) : null}
            </div>
          </section>

          <section
            className={[styles.zone, styles.busZone].join(" ")}
            aria-label="Busy"
          >
            <div className={styles.zoneHead}>
              <span className={styles.zoneTitle}>Busy</span>
              <button
                type="button"
                className={styles.addBusBtn}
                aria-label="Dodaj Bus"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddBus();
                }}
              >
                + Dodaj Bus
              </button>
            </div>
            <div className={styles.strips}>
              {busses.length === 0 ? (
                <p className={styles.empty} role="status" aria-live="polite">
                  Brak busów — użyj „+ Dodaj Bus”.
                </p>
              ) : null}
              {busses.map((bus) => {
                const callbacks = buildBusCallbacks(bus.id);
                const reading = meters.busses[bus.id];
                const channelMode =
                  bus.channelMode === "mono" ? "mono" : "stereo";
                const outVal = serializeOutputDest(bus.output);
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
                      outputValue: outVal,
                      outputOptions: busOutputOptionsFor(bus.id),
                      outputDisabled:
                        playing &&
                        (outVal.startsWith("hw:") || hwOptions.length > 0),
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

          {hwCap.uiAllowed ? (
            <section
              className={[styles.zone, styles.busZone].join(" ")}
              aria-label="Wyjścia HW"
            >
              <div className={styles.zoneHead}>
                <span className={styles.zoneTitle}>HW Out</span>
                {onAddHwOut ? (
                  <button
                    type="button"
                    className={styles.addBusBtn}
                    aria-label="Dodaj wyjście HW"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddHwOut();
                    }}
                  >
                    + Dodaj HW
                  </button>
                ) : null}
              </div>
              <div className={styles.strips}>
                {hwOuts.length === 0 ? (
                  <p className={styles.empty} role="status" aria-live="polite">
                    Brak patchy HW — „+ Dodaj HW” (kanały {hwCap.maxChannelCount}
                    ).
                  </p>
                ) : null}
                {hwOuts.map((row) => {
                  const reading = meters.hwOuts?.[row.id];
                  return (
                    <HwOutStrip
                      key={row.id}
                      id={row.id}
                      name={row.name}
                      channelOffset={row.channelOffset}
                      channelMode={
                        row.channelMode === "mono" ? "mono" : "stereo"
                      }
                      gainDb={row.gainDb ?? 0}
                      muted={Boolean(row.muted)}
                      meterDb={reading?.liveDb}
                      meterDbR={reading?.liveDbR}
                      hold={reading?.hold ?? emptyPeakHold()}
                      onGainChange={(v) => onHwGainChange?.(row.id, v)}
                      onGainReset={() => onHwGainChange?.(row.id, 0)}
                      onMuteClick={(e) => {
                        e.stopPropagation();
                        onHwMuteToggle?.(row.id);
                      }}
                      onHoldClear={() => meters.clearHwHold?.(row.id)}
                      onRemove={() => onHwRemove?.(row.id)}
                    />
                  );
                })}
              </div>
            </section>
          ) : (
            <section className={styles.zone} aria-label="Wyjścia HW">
              <div className={styles.zoneHead}>
                <span className={styles.zoneTitle}>HW Out</span>
              </div>
              <p className={styles.empty} role="status">
                Multi-out wymaga urządzenia z ≥ 4 kanałami (teraz{" "}
                {hwCap.maxChannelCount}). Ustaw Quad/5.1 w systemie audio.
              </p>
            </section>
          )}
        </div>

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

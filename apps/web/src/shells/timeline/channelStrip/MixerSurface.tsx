/**
 * Mixer surface — zones L→R: Audio | Busses | HW | Click | Master.
 */

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  emptyPeakHold,
  resolveMasterOutputRouting,
  type Project,
} from "@stagesync/shared";
import type { TrackSelection } from "@lib/timeline/timelineSelection.js";
import {
  AUDIO_HW_CAPABILITY_EVENT,
  getAudioHwCapability,
  refreshAudioHwCapability,
  type AudioHwCapability,
} from "@lib/audio/audioHwCapability.js";
import { canAddHardwareOutput } from "@lib/audio/audioHwEdit.js";
import {
  getMetronomePrefs,
  METRONOME_PREFS_CHANGED_EVENT,
  setMetronomePrefs,
  type MetronomePrefs,
} from "@lib/audio/metronomePrefs.js";
import {
  loadMixerZoneVisibility,
  saveMixerZoneVisibility,
  toggleMixerZoneVisibility,
  type MixerZoneId,
  type MixerZoneVisibility,
} from "@lib/client/mixerZoneVisibility.js";
import { ChannelStripControls } from "./ChannelStripControls.js";
import type {
  ChannelStripCallbacks,
  ClickStripCallbacks,
  MasterStripCallbacks,
} from "./channelStripTypes.js";
import { ClickStrip } from "./ClickStrip.js";
import { HwOutStrip } from "./HwOutStrip.js";
import { MasterStrip } from "./MasterStrip.js";
import { MixerZoneHeader } from "./MixerZoneHeader.js";
import {
  buildHwOptions,
  buildMasterOutOptions,
  buildTrackOutputOptions,
  busOutputOptionsFor,
} from "./mixerOutputOptions.js";
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
  selectedBusId?: string | null;
  selectedHwOutputId?: string | null;
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
  onAddAudioTrack: () => void;
  onAddBus: () => void;
  onAddHwOut?: () => void;
  onHwSelect?: (hwOutputId: string, e: MouseEvent) => void;
  onHwContextMenu?: (hwOutputId: string, e: MouseEvent) => void;
  onHwGainChange?: (hwOutputId: string, gainDb: number) => void;
  onHwMuteToggle?: (hwOutputId: string) => void;
  onHwChannelModeChange?: (hwOutputId: string, mode: "mono" | "stereo") => void;
  onEmptyDoubleClick?: (e: MouseEvent) => void;
};

export function MixerSurface({
  project,
  trackSelection,
  soloAudioTrackIds,
  soloBusIds,
  selectedBusId = null,
  selectedHwOutputId = null,
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
  onAddAudioTrack,
  onAddBus,
  onAddHwOut,
  onHwSelect,
  onHwContextMenu,
  onHwGainChange,
  onHwMuteToggle,
  onHwChannelModeChange,
  onEmptyDoubleClick,
}: MixerSurfaceProps) {
  const trackIds = project.audioTracks.map((t) => t.id);
  const busses = useMemo(
    () => project.audioBusses ?? [],
    [project.audioBusses],
  );
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
  const [zoneVis, setZoneVis] = useState<MixerZoneVisibility>(() =>
    loadMixerZoneVisibility(),
  );
  const canAddHw = canAddHardwareOutput(
    hwOuts,
    hwCap.maxChannelCount,
    "stereo",
    project.masterOutput,
  );

  const masterOutOptions: OutputSelectorOption[] = useMemo(
    () =>
      buildMasterOutOptions(
        hwCap.uiAllowed,
        hwCap.maxChannelCount,
        hwOuts,
        project.masterOutput,
      ),
    [hwCap.uiAllowed, hwCap.maxChannelCount, hwOuts, project.masterOutput],
  );

  const masterOutValue = `ch:${resolveMasterOutputRouting(project.masterOutput).channelOffset}`;

  function setZoneVisible(zoneId: MixerZoneId) {
    setZoneVis((prev) => {
      const next = toggleMixerZoneVisibility(prev, zoneId);
      saveMixerZoneVisibility(next);
      return next;
    });
  }

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

  const hwOptions: OutputSelectorOption[] = useMemo(
    () => buildHwOptions(hwCap.uiAllowed, hwOuts),
    [hwCap.uiAllowed, hwOuts],
  );

  const trackOutputOptions: OutputSelectorOption[] = useMemo(
    () => buildTrackOutputOptions(busses, hwOptions),
    [busses, hwOptions],
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
        <div className={styles.scrollBank}>
          <section
            className={[styles.zone, zoneVis.audio ? "" : styles.zoneCollapsed]
              .filter(Boolean)
              .join(" ")}
            aria-label="Ścieżki audio"
          >
            <MixerZoneHeader
              title="Audio"
              visible={zoneVis.audio}
              onToggle={() => setZoneVisible("audio")}
              addAriaLabel="Dodaj Ścieżkę"
              addTitle="Dodaj ścieżkę"
              onAdd={onAddAudioTrack}
            />
            {zoneVis.audio ? (
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
              </div>
            ) : null}
          </section>

          <section
            className={[
              styles.zone,
              /* Flush right only when Busy is last scroll zone (no HW). */
              hwCap.uiAllowed ? "" : styles.busZone,
              zoneVis.bus ? "" : styles.zoneCollapsed,
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Busy"
          >
            <MixerZoneHeader
              title="Busy"
              visible={zoneVis.bus}
              onToggle={() => setZoneVisible("bus")}
              addAriaLabel="Dodaj Bus"
              addTitle="Dodaj bus"
              onAdd={onAddBus}
            />
            {zoneVis.bus ? (
              <div className={styles.strips}>
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
                        selected: selectedBusId === bus.id,
                        meterDb: reading?.liveDb,
                        meterDbR: reading?.liveDbR,
                        hold: reading?.hold,
                        kind: "bus",
                        outputValue: outVal,
                        outputOptions: busOutputOptionsFor(
                          bus.id,
                          busses,
                          hwOptions,
                        ),
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
            ) : null}
          </section>

          {hwCap.uiAllowed ? (
            <section
              className={[
                styles.zone,
                styles.busZone,
                zoneVis.hw ? "" : styles.zoneCollapsed,
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label="Wyjścia HW"
            >
              <MixerZoneHeader
                title="HW Out"
                visible={zoneVis.hw}
                onToggle={() => setZoneVisible("hw")}
                addAriaLabel="Dodaj wyjście HW"
                addTitle={
                  canAddHw
                    ? "Dodaj wyjście HW"
                    : `Brak wolnych kanałów (max ${hwCap.maxChannelCount})`
                }
                onAdd={onAddHwOut}
                addDisabled={!canAddHw}
              />
              {zoneVis.hw ? (
                <div className={styles.strips}>
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
                        selected={selectedHwOutputId === row.id}
                        meterDb={reading?.liveDb}
                        meterDbR={reading?.liveDbR}
                        hold={reading?.hold ?? emptyPeakHold()}
                        onSelect={(e) => onHwSelect?.(row.id, e)}
                        onContextMenu={(e) => onHwContextMenu?.(row.id, e)}
                        onChannelModeChange={(mode) =>
                          onHwChannelModeChange?.(row.id, mode)
                        }
                        onGainChange={(v) => onHwGainChange?.(row.id, v)}
                        onGainReset={() => onHwGainChange?.(row.id, 0)}
                        onMuteClick={(e) => {
                          e.stopPropagation();
                          onHwMuteToggle?.(row.id);
                        }}
                        onHoldClear={() => meters.clearHwHold?.(row.id)}
                      />
                    );
                  })}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <div
          className={[
            styles.masterRail,
            zoneVis.master ? "" : styles.zoneCollapsed,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <MixerZoneHeader
            title="Master"
            visible={zoneVis.master}
            onToggle={() => setZoneVisible("master")}
          />
          {zoneVis.master ? (
            <div className={styles.masterRailStrips}>
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
                  outputValue: masterOutValue,
                  outputOptions: masterOutOptions,
                  outputDisabled: playing && masterOutOptions.length > 0,
                }}
                callbacks={{
                  ...masterCallbacks,
                  onHoldClear: () => meters.clearMasterHold(),
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Mixer surface — zones L→R: Audio | Busses | HW | Click | Master.
 */

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Button } from "@stagesync/ui";
import { emptyPeakHold, listMasterStereoPairOptions, resolveMasterOutputRouting, type Project } from "@stagesync/shared";
import type { TrackSelection } from "../../../lib/timelineSelection.js";
import {
  AUDIO_HW_CAPABILITY_EVENT,
  getAudioHwCapability,
  refreshAudioHwCapability,
  type AudioHwCapability,
} from "../../../lib/audioHwCapability.js";
import { canAddHardwareOutput } from "../../../lib/audioHwEdit.js";
import {
  getMetronomePrefs,
  METRONOME_PREFS_CHANGED_EVENT,
  setMetronomePrefs,
  type MetronomePrefs,
} from "../../../lib/metronomePrefs.js";
import {
  loadMixerZoneVisibility,
  saveMixerZoneVisibility,
  toggleMixerZoneVisibility,
  type MixerZoneId,
  type MixerZoneVisibility,
} from "../../../lib/mixerZoneVisibility.js";
import { IconEye, IconEyeOff } from "../../icons.js";
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
  onHwChannelModeChange?: (
    hwOutputId: string,
    mode: "mono" | "stereo",
  ) => void;
  onEmptyDoubleClick?: (e: MouseEvent) => void;
};

function ZoneEyeToggle({
  zoneLabel,
  visible,
  onToggle,
}: {
  zoneLabel: string;
  visible: boolean;
  onToggle: () => void;
}) {
  const label = visible
    ? `Ukryj strefę ${zoneLabel}`
    : `Pokaż strefę ${zoneLabel}`;
  return (
    <Button
      type="button"
      variant="ghost"
      iconOnly
      className={styles.zoneEye}
      aria-label={label}
      title={label}
      aria-pressed={visible}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {visible ? <IconEye /> : <IconEyeOff />}
    </Button>
  );
}

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
  const [zoneVis, setZoneVis] = useState<MixerZoneVisibility>(() =>
    loadMixerZoneVisibility(),
  );
  const canAddHw = canAddHardwareOutput(
    hwOuts,
    hwCap.maxChannelCount,
    "stereo",
    project.masterOutput,
  );

  const masterOutOptions: OutputSelectorOption[] = useMemo(() => {
    if (!hwCap.uiAllowed) return [];
    return listMasterStereoPairOptions(hwCap.maxChannelCount, hwOuts)
      .filter((o) => !o.blocked || o.channelOffset === resolveMasterOutputRouting(project.masterOutput).channelOffset)
      .map((o) => ({
        value: `ch:${o.channelOffset}`,
        label: o.blocked ? `${o.label} (zajęte)` : o.label,
      }));
  }, [hwCap.uiAllowed, hwCap.maxChannelCount, hwOuts, project.masterOutput]);

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
          <section
            className={[
              styles.zone,
              zoneVis.audio ? "" : styles.zoneCollapsed,
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Ścieżki audio"
          >
            <div className={styles.zoneHead}>
              <div className={styles.zoneHeadStart}>
                <span className={styles.zoneTitle}>Audio</span>
                <ZoneEyeToggle
                  zoneLabel="Audio"
                  visible={zoneVis.audio}
                  onToggle={() => setZoneVisible("audio")}
                />
              </div>
              {zoneVis.audio ? (
                <button
                  type="button"
                  className={styles.addBusBtn}
                  aria-label="Dodaj Ścieżkę"
                  title="Dodaj ścieżkę"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAudioTrack();
                  }}
                >
                  + Dodaj
                </button>
              ) : null}
            </div>
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
            <div className={styles.zoneHead}>
              <div className={styles.zoneHeadStart}>
                <span className={styles.zoneTitle}>Busy</span>
                <ZoneEyeToggle
                  zoneLabel="Busy"
                  visible={zoneVis.bus}
                  onToggle={() => setZoneVisible("bus")}
                />
              </div>
              {zoneVis.bus ? (
                <button
                  type="button"
                  className={styles.addBusBtn}
                  aria-label="Dodaj Bus"
                  title="Dodaj bus"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddBus();
                  }}
                >
                  + Dodaj
                </button>
              ) : null}
            </div>
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
              <div className={styles.zoneHead}>
                <div className={styles.zoneHeadStart}>
                  <span className={styles.zoneTitle}>HW Out</span>
                  <ZoneEyeToggle
                    zoneLabel="HW Out"
                    visible={zoneVis.hw}
                    onToggle={() => setZoneVisible("hw")}
                  />
                </div>
                {zoneVis.hw && onAddHwOut ? (
                  <button
                    type="button"
                    className={styles.addBusBtn}
                    aria-label="Dodaj wyjście HW"
                    title={
                      canAddHw
                        ? "Dodaj wyjście HW"
                        : `Brak wolnych kanałów (max ${hwCap.maxChannelCount})`
                    }
                    disabled={!canAddHw}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canAddHw) return;
                      onAddHwOut();
                    }}
                  >
                    + Dodaj
                  </button>
                ) : null}
              </div>
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
          <div className={styles.zoneHead}>
            <div className={styles.zoneHeadStart}>
              <span className={styles.zoneTitle}>Master</span>
              <ZoneEyeToggle
                zoneLabel="Master"
                visible={zoneVis.master}
                onToggle={() => setZoneVisible("master")}
              />
            </div>
          </div>
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

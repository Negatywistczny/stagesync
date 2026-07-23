/**
 * rAF polling of WebAudio analyser taps (Mixer meters) + peak-hold latch.
 * Hold auto-resets on Play rising edge only (not Stop); manual clear via API.
 * Stereo tracks/busses expose L+R; hold latches max(L,R).
 */

import { useEffect, useRef, useState } from "react";
import {
  emptyPeakHold,
  linearPeakToMeterDb,
  updatePeakHold,
  type PeakHoldState,
} from "@stagesync/shared";
import {
  readGroupBusMeterDb,
  readMasterMeterDb,
  readTrackMeterDb,
} from "../../../lib/audioPlayback.js";
import { readClickMeterDb } from "../../../lib/metronome.js";

const FLOOR = linearPeakToMeterDb(0);

export type ChannelMeterReading = {
  liveDb: number;
  /** Stereo second channel; omit for mono. */
  liveDbR?: number;
  hold: PeakHoldState;
};

export type MixerMeterLevels = {
  tracks: Record<string, ChannelMeterReading>;
  busses: Record<string, ChannelMeterReading>;
  master: {
    liveL: number;
    liveR: number;
    holdL: PeakHoldState;
    holdR: PeakHoldState;
  };
  click: ChannelMeterReading;
};

export type UseMixerMeterLevelsOptions = {
  /** Transport playing — rising edge clears all peak holds. */
  playing?: boolean;
  busIds?: readonly string[];
};

function floorReading(): ChannelMeterReading {
  return { liveDb: FLOOR, hold: emptyPeakHold() };
}

function readingFromPeaks(
  peaks: { l: number; r?: number },
  prevHold: PeakHoldState,
): ChannelMeterReading {
  let hold = updatePeakHold(prevHold, peaks.l);
  if (peaks.r != null) hold = updatePeakHold(hold, peaks.r);
  return {
    liveDb: peaks.l,
    liveDbR: peaks.r,
    hold,
  };
}

export function useMixerMeterLevels(
  trackIds: readonly string[],
  enabled: boolean,
  options: UseMixerMeterLevelsOptions = {},
): MixerMeterLevels & {
  clearTrackHold: (trackId: string) => void;
  clearBusHold: (busId: string) => void;
  clearMasterHold: () => void;
  clearClickHold: () => void;
} {
  const playing = Boolean(options.playing);
  const busIds = options.busIds ?? [];
  const wasPlayingRef = useRef(playing);

  const [levels, setLevels] = useState<MixerMeterLevels>(() => ({
    tracks: Object.fromEntries(trackIds.map((id) => [id, floorReading()])),
    busses: Object.fromEntries(busIds.map((id) => [id, floorReading()])),
    master: {
      liveL: FLOOR,
      liveR: FLOOR,
      holdL: emptyPeakHold(),
      holdR: emptyPeakHold(),
    },
    click: floorReading(),
  }));

  const idsKey = trackIds.join(",");
  const busKey = busIds.join(",");

  useEffect(() => {
    const rising = playing && !wasPlayingRef.current;
    wasPlayingRef.current = playing;
    if (!rising) return;
    setLevels((prev) => ({
      tracks: Object.fromEntries(
        Object.keys(prev.tracks).map((id) => [
          id,
          {
            liveDb: prev.tracks[id]?.liveDb ?? FLOOR,
            liveDbR: prev.tracks[id]?.liveDbR,
            hold: emptyPeakHold(),
          },
        ]),
      ),
      busses: Object.fromEntries(
        Object.keys(prev.busses).map((id) => [
          id,
          {
            liveDb: prev.busses[id]?.liveDb ?? FLOOR,
            liveDbR: prev.busses[id]?.liveDbR,
            hold: emptyPeakHold(),
          },
        ]),
      ),
      master: {
        liveL: prev.master.liveL,
        liveR: prev.master.liveR,
        holdL: emptyPeakHold(),
        holdR: emptyPeakHold(),
      },
      click: { liveDb: prev.click.liveDb, hold: emptyPeakHold() },
    }));
  }, [playing]);

  useEffect(() => {
    if (!enabled) {
      setLevels({
        tracks: Object.fromEntries(trackIds.map((id) => [id, floorReading()])),
        busses: Object.fromEntries(busIds.map((id) => [id, floorReading()])),
        master: {
          liveL: FLOOR,
          liveR: FLOOR,
          holdL: emptyPeakHold(),
          holdR: emptyPeakHold(),
        },
        click: floorReading(),
      });
      return;
    }

    let raf = 0;
    const tick = () => {
      setLevels((prev) => {
        const tracks: Record<string, ChannelMeterReading> = {};
        for (const id of trackIds) {
          tracks[id] = readingFromPeaks(
            readTrackMeterDb(id),
            prev.tracks[id]?.hold ?? emptyPeakHold(),
          );
        }
        const busses: Record<string, ChannelMeterReading> = {};
        for (const id of busIds) {
          busses[id] = readingFromPeaks(
            readGroupBusMeterDb(id),
            prev.busses[id]?.hold ?? emptyPeakHold(),
          );
        }
        const masterLive = readMasterMeterDb();
        const clickLive = readClickMeterDb();
        return {
          tracks,
          busses,
          master: {
            liveL: masterLive.l,
            liveR: masterLive.r,
            holdL: updatePeakHold(prev.master.holdL, masterLive.l),
            holdR: updatePeakHold(prev.master.holdR, masterLive.r),
          },
          click: {
            liveDb: clickLive,
            hold: updatePeakHold(prev.click.hold, clickLive),
          },
        };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey/busKey
  }, [enabled, idsKey, busKey]);

  function clearTrackHold(trackId: string) {
    setLevels((prev) => {
      const cur = prev.tracks[trackId];
      if (!cur) return prev;
      return {
        ...prev,
        tracks: {
          ...prev.tracks,
          [trackId]: { ...cur, hold: emptyPeakHold() },
        },
      };
    });
  }

  function clearBusHold(busId: string) {
    setLevels((prev) => {
      const cur = prev.busses[busId];
      if (!cur) return prev;
      return {
        ...prev,
        busses: {
          ...prev.busses,
          [busId]: { ...cur, hold: emptyPeakHold() },
        },
      };
    });
  }

  function clearMasterHold() {
    setLevels((prev) => ({
      ...prev,
      master: {
        ...prev.master,
        holdL: emptyPeakHold(),
        holdR: emptyPeakHold(),
      },
    }));
  }

  function clearClickHold() {
    setLevels((prev) => ({
      ...prev,
      click: { ...prev.click, hold: emptyPeakHold() },
    }));
  }

  return {
    ...levels,
    clearTrackHold,
    clearBusHold,
    clearMasterHold,
    clearClickHold,
  };
}

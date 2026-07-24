/**
 * rAF polling of WebAudio analyser taps (Mixer meters) + peak-hold latch.
 * Hold auto-resets on Play rising edge only (not Stop); manual clear via API.
 * Stereo tracks/busses expose L+R; hold latches max(L,R).
 *
 * Holds live in a ref so clear (click / Play edge) cannot lose a race against
 * a concurrent rAF `setLevels` that still had the pre-clear latch in `prev`.
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

type HoldLatchStore = {
  tracks: Record<string, PeakHoldState>;
  busses: Record<string, PeakHoldState>;
  masterL: PeakHoldState;
  masterR: PeakHoldState;
  click: PeakHoldState;
};

function emptyHoldStore(): HoldLatchStore {
  return {
    tracks: {},
    busses: {},
    masterL: emptyPeakHold(),
    masterR: emptyPeakHold(),
    click: emptyPeakHold(),
  };
}

function floorReading(hold: PeakHoldState = emptyPeakHold()): ChannelMeterReading {
  return { liveDb: FLOOR, hold };
}

/**
 * Pure latch step — used by the hook and unit-tested for clear-vs-tick ordering.
 * Clear must write the store *before* the next tick reads it.
 */
export function latchChannelPeaks(
  prevHold: PeakHoldState,
  peaks: { l: number; r?: number },
): ChannelMeterReading {
  let hold = updatePeakHold(prevHold, peaks.l);
  if (peaks.r != null) hold = updatePeakHold(hold, peaks.r);
  return {
    liveDb: peaks.l,
    liveDbR: peaks.r,
    hold,
  };
}

/** Clear wins: empty store, then tick may re-latch only from *new* live peaks. */
export function clearThenLatch(
  peaks: { l: number; r?: number },
): ChannelMeterReading {
  return latchChannelPeaks(emptyPeakHold(), peaks);
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
  const holdsRef = useRef<HoldLatchStore>(emptyHoldStore());

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
    const store = holdsRef.current;
    for (const id of Object.keys(store.tracks)) {
      store.tracks[id] = emptyPeakHold();
    }
    for (const id of Object.keys(store.busses)) {
      store.busses[id] = emptyPeakHold();
    }
    store.masterL = emptyPeakHold();
    store.masterR = emptyPeakHold();
    store.click = emptyPeakHold();
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
      holdsRef.current = emptyHoldStore();
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
      const store = holdsRef.current;
      const tracks: Record<string, ChannelMeterReading> = {};
      for (const id of trackIds) {
        const reading = latchChannelPeaks(
          store.tracks[id] ?? emptyPeakHold(),
          readTrackMeterDb(id),
        );
        store.tracks[id] = reading.hold;
        tracks[id] = reading;
      }
      const busses: Record<string, ChannelMeterReading> = {};
      for (const id of busIds) {
        const reading = latchChannelPeaks(
          store.busses[id] ?? emptyPeakHold(),
          readGroupBusMeterDb(id),
        );
        store.busses[id] = reading.hold;
        busses[id] = reading;
      }
      const masterLive = readMasterMeterDb();
      const clickLive = readClickMeterDb();
      store.masterL = updatePeakHold(store.masterL, masterLive.l);
      store.masterR = updatePeakHold(store.masterR, masterLive.r);
      store.click = updatePeakHold(store.click, clickLive);
      setLevels({
        tracks,
        busses,
        master: {
          liveL: masterLive.l,
          liveR: masterLive.r,
          holdL: store.masterL,
          holdR: store.masterR,
        },
        click: {
          liveDb: clickLive,
          hold: store.click,
        },
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey/busKey
  }, [enabled, idsKey, busKey]);

  function clearTrackHold(trackId: string) {
    holdsRef.current.tracks[trackId] = emptyPeakHold();
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
    holdsRef.current.busses[busId] = emptyPeakHold();
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
    holdsRef.current.masterL = emptyPeakHold();
    holdsRef.current.masterR = emptyPeakHold();
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
    holdsRef.current.click = emptyPeakHold();
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

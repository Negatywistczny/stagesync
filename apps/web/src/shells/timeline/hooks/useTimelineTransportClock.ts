import { useEffect, useState } from "react";
import { type SnapMode } from "@stagesync/shared";
import {
  CLOCK_DISPLAY_CHANGED_EVENT,
  formatClockDisplay,
  getStoredClockDisplayFormat,
  type ClockDisplayFormat,
} from "@lib/client/clockDisplayPrefs.js";
import {
  loadSessionSnapModeFromStorage,
  persistSessionSnapMode,
} from "@lib/timeline/timelineGesture.js";
import { useTransport } from "../../../transport/useTransport.js";

export function useTimelineTransportClock() {
  const transport = useTransport();
  const { state, displayTicks } = transport;

  const [clockFormat, setClockFormat] = useState<ClockDisplayFormat>(() =>
    getStoredClockDisplayFormat(),
  );

  const clockLabel = formatClockDisplay({
    ticks: displayTicks,
    bpm: state.bpm,
    timeSignature: state.timeSignature,
    ppq: state.ppq,
    format: clockFormat,
  });

  useEffect(() => {
    const onClock = () => {
      setClockFormat(getStoredClockDisplayFormat());
    };
    window.addEventListener(CLOCK_DISPLAY_CHANGED_EVENT, onClock);
    return () => {
      window.removeEventListener(CLOCK_DISPLAY_CHANGED_EVENT, onClock);
    };
  }, []);

  const [snapMode, setSnapMode] = useState<SnapMode>(() =>
    loadSessionSnapModeFromStorage(),
  );

  useEffect(() => {
    persistSessionSnapMode(snapMode);
  }, [snapMode]);

  return {
    ...transport,
    clockFormat,
    setClockFormat,
    clockLabel,
    snapMode,
    setSnapMode,
  };
}

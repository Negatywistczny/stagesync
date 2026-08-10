import { linearPeakToMeterDb } from "@stagesync/shared";
import { state } from "./state.js";
import type { ChannelMeterPeaks } from "./types.js";

function peakDbFromAnalyser(analyser: AnalyserNode): number {
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = Math.abs(buf[i]!);
    if (v > peak) peak = v;
  }
  return linearPeakToMeterDb(peak);
}

/** Live peak dB per track (−60 floor). Missing bus → floor. */
export function readTrackMeterDb(trackId: string): ChannelMeterPeaks {
  const bus = state.trackBuses.get(trackId);
  const floor = linearPeakToMeterDb(0);
  if (!bus) return { l: floor };
  if (bus.mode === "mono") return { l: peakDbFromAnalyser(bus.analyser) };
  return {
    l: peakDbFromAnalyser(bus.analyserL),
    r: peakDbFromAnalyser(bus.analyserR),
  };
}

/** Live peak dB per hardware output patch. */
export function readHwOutMeterDb(hwOutputId: string): ChannelMeterPeaks {
  const bus = state.hwOutBuses.get(hwOutputId);
  const floor = linearPeakToMeterDb(0);
  if (!bus) return { l: floor };
  if (bus.mode === "mono" || !bus.analyserR) {
    return { l: peakDbFromAnalyser(bus.analyserL) };
  }
  return {
    l: peakDbFromAnalyser(bus.analyserL),
    r: peakDbFromAnalyser(bus.analyserR),
  };
}

/** Live peak dB per group bus. */
export function readGroupBusMeterDb(busId: string): ChannelMeterPeaks {
  const bus = state.groupBuses.get(busId);
  const floor = linearPeakToMeterDb(0);
  if (!bus) return { l: floor };
  if (bus.mode === "mono") return { l: peakDbFromAnalyser(bus.analyser) };
  return {
    l: peakDbFromAnalyser(bus.analyserL),
    r: peakDbFromAnalyser(bus.analyserR),
  };
}

/** Stereo Out L/R peak dB. */
export function readMasterMeterDb(): { l: number; r: number } {
  if (!state.masterBus) {
    const floor = linearPeakToMeterDb(0);
    return { l: floor, r: floor };
  }
  return {
    l: peakDbFromAnalyser(state.masterBus.analyserL),
    r: peakDbFromAnalyser(state.masterBus.analyserR),
  };
}

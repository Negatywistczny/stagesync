/**
 * @stagesync/shared — Time, meter map, MIDI clock, soft clock, snap grid.
 *
 * Explicit named re-exports only (no `export *` from source modules).
 */

export {
  DEFAULT_PPQ,
  assertValidTimeSignature,
  ticksPerBar,
  localTicksPerBeat,
  ticksPerMs,
  elapsedToTicks,
  ticksToMs,
  ticksToBbt,
  bbtToTicks,
  toDisplayBar,
  fromDisplayBar,
  quartersToTicks,
  ticksToQuarters,
  absBeatToTicks,
  parseMeterString,
  type TimeSignature,
  type Bbt,
} from "../time-tempo/time.js";

export {
  resolveMeterAtTicks,
  ticksToBbtAlongMeterMap,
  bbtToTicksAlongMeterMap,
  type MeterMapEvent,
} from "../time-tempo/meter-map-bbt.js";

export {
  MIDI_CLOCK_PPQN,
  MIDI_SPP_PER_QUARTER,
  ticksPerMidiClock,
  ticksToMidiClockIndex,
  midiClockIndexToTicks,
  ticksToSpp,
  sppToTicks,
  midiClockIntervalMs,
  elapsedMsToMidiClocks,
} from "../time-tempo/midi-clock.js";

export {
  getDisplayTicks,
  wrapDisplayTicks,
  type TransportAnchor,
} from "../time-tempo/soft-clock.js";

export {
  quantizeTicks,
  snapTicksToBarStart,
  snapTicksToBarStartAlongMeterMap,
  snapTicksToBeatGrid,
  snapTicksToBeatGridAlongMeterMap,
  snapTicksToSubdivision,
  DEFAULT_SNAP_MODE,
  type SnapMode,
  type SnapContext,
  type SnapSubdivisionParts,
} from "../time-tempo/snap-grid.js";

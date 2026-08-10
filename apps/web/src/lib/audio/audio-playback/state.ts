/**
 * Single module-level mutable playback singleton.
 * All other audio-playback modules import this — never duplicate Maps/flags.
 */
import type {
  ActiveCueSample,
  ActiveSource,
  DestGraph,
  GroupBusNode,
  HwOutBus,
  LastSyncArgs,
  MasterBus,
  TrackBus,
} from "./types.js";

export const SEEK_JUMP_TICKS = 480;
/**
 * Hard cap on retained decoded PCM — entry count alone was unsafe
 * (32 × ~3–8 min stereo @ 48 kHz ≈ multi-GB).
 */
export const MAX_BUFFER_CACHE = 8;
/** Soft RAM budget for decoded AudioBuffers (~float32 PCM). */
export const MAX_BUFFER_CACHE_BYTES = 384 * 1024 * 1024;
export const ANALYSER_FFT = 256;
/** Short linear ramp — avoids zipper clicks on live fader / mute / solo. */
export const GAIN_DEZIPPER_SEC = 0.012;

export const state = {
  bufferCache: new Map<string, AudioBuffer>(),
  inflight: new Map<string, Promise<AudioBuffer | null>>(),
  /** Keys (`projectId:assetId`) that failed fetch/decode — UI warning until cleared. */
  failedAssets: new Set<string>(),
  /** Bumped on full cache clear — invalidates in-flight decode for all projects. */
  bufferCacheGlobalGen: 0,
  /** Per-project clear generation — late decode must not re-pollute after switch. */
  bufferCacheProjectGen: new Map<string, number>(),
  active: [] as ActiveSource[],
  activeCues: [] as ActiveCueSample[],
  /** Cue clip ids fired this play-through (reset on seek / hard stop). */
  firedCueIds: new Set<string>(),
  lastDisplayTicks: null as number | null,
  lastGraphKey: "",
  /** Last sync args — cold-buffer load completion may re-trigger under playhead. */
  lastSyncArgs: null as LastSyncArgs | null,
  /** Local halt while pause/stop RTT still has `playing: true` from SSOT. */
  playbackSuppressed: false,
  stopEpoch: 0,
  trackBuses: new Map<string, TrackBus>(),
  groupBuses: new Map<string, GroupBusNode>(),
  hwOutBuses: new Map<string, HwOutBus>(),
  masterBus: null as MasterBus | null,
  destGraph: null as DestGraph | null,
  /** Last wired track output: `"master"` | `bus:<id>` | `hw:<id>`. */
  trackWiredDest: new Map<string, string>(),
  /** Last wired group-bus output: `"master"` | `bus:<id>` | `hw:<id>`. */
  groupWiredDest: new Map<string, string>(),
  /** Last scheduled dezipper target — avoids re-ramping every transport tick. */
  dezipperTargets: new WeakMap<AudioParam, number>(),
  /** Tiny silent buffer assigned after stop — releases decoded PCM (Safari/WebKit scratch). */
  emptyBufferByCtx: new WeakMap<BaseAudioContext, AudioBuffer>(),
};

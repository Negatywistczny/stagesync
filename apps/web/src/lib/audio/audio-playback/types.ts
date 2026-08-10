import type { ChannelMode, Project } from "@stagesync/shared";

export type AudioPlaybackInput = {
  project: Project;
  playing: boolean;
  displayTicks: number;
  /**
   * When true, do not soft-stop at song end (transport loop wraps;
   * pause-at-end / auto-advance stay off on the server).
   */
  loopEnabled?: boolean;
  /** When non-empty, only these audio track ids are audible (client Solo). */
  soloTrackIds?: readonly string[];
  /**
   * When non-empty **and no track solo**, only tracks feeding these busses.
   * Product rule (DEF-BUG-04): track solo wins — bus solo is ignored for
   * audibility while any track is soloed (typical DAW; avoids silent dead state).
   */
  soloBusIds?: readonly string[];
};

export type ActiveSource = {
  clipId: string;
  trackId: string;
  source: AudioBufferSourceNode;
  /** Fade envelope 0…1 (scheduled ramps). */
  fadeGain: GainNode;
  /** Clip `gainDb` level — updated live without graph restart. */
  levelGain: GainNode;
  /** Extra nodes for stereo→mono downmix (disconnected on stop). */
  extras: AudioNode[];
};

export type ActiveCueSample = {
  clipId: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
  playPostStop: boolean;
};

export type TrackBusMono = {
  mode: "mono";
  gain: GainNode;
  pan: StereoPannerNode;
  analyser: AnalyserNode;
  /** Reconnected to Master / bus; meters stay upstream. */
  route: GainNode;
};

export type TrackBusStereo = {
  mode: "stereo";
  gain: GainNode;
  splitter: ChannelSplitterNode;
  gainL: GainNode;
  gainR: GainNode;
  merger: ChannelMergerNode;
  meterSplit: ChannelSplitterNode;
  analyserL: AnalyserNode;
  analyserR: AnalyserNode;
  route: GainNode;
};

export type TrackBus = TrackBusMono | TrackBusStereo;
export type GroupBusNode = TrackBus;

export type MasterBus = {
  gain: GainNode;
  splitter: ChannelSplitterNode;
  analyserL: AnalyserNode;
  analyserR: AnalyserNode;
  /** Device channel offset for L (R = offset+1 when stereo multi-out). */
  channelOffset: number;
  /** Present when multi-out is active — feeds destination merger. */
  toMergerSplit?: ChannelSplitterNode;
};

export type HwOutBus = {
  id: string;
  mode: ChannelMode;
  channelOffset: number;
  gain: GainNode;
  splitter?: ChannelSplitterNode;
  analyserL: AnalyserNode;
  analyserR?: AnalyserNode;
};

export type DestGraph = {
  channelCount: number;
  merger: ChannelMergerNode;
};

export type LoadAudioBufferOptions = {
  /**
   * When false, decode for meta/waveform without pinning into the playback cache
   * (still reuses a cache hit if present). Default true.
   */
  cache?: boolean;
};

export type AudioBufferCacheStats = {
  entries: number;
  approxBytes: number;
  maxEntries: number;
  maxBytes: number;
};

export type AudioBufferCacheEntry = {
  key: string;
  approxBytes: number;
  durationSec: number;
  channels: number;
};

export type ChannelMeterPeaks = {
  l: number;
  /** Present for stereo buses; omit for mono. */
  r?: number;
};

export type LastSyncArgs = {
  projectId: string;
  input: AudioPlaybackInput;
  ctx: AudioContext;
};

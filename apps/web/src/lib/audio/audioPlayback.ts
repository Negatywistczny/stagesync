/**
 * Client WebAudio playback synced to server transport ticks ([ADR 0008]).
 *
 * Graph (Track → Master | Bus | HW-failsoft-Master; Bus → Master | Bus DAG):
 *
 * Mono track:
 *   BufferSource → [stereo→mono −3 dB downmix?] → fadeGain → levelGain → trackGain
 *     → analyser (pre-pan meter) + StereoPanner → route → (master | bus)
 *
 * Stereo track (True Balance — not StereoPanner):
 *   BufferSource → fadeGain → levelGain → trackGain (explicit 2-ch upmix)
 *     → ChannelSplitter → gainL / gainR → ChannelMerger → meterSplit → analyserL/R
 *     merger → (masterGain | groupBusGain)
 *
 * Mono file on a stereo bus is upmixed on trackGain before the splitter (otherwise L-only).
 * Bus may feed Master, another bus (acyclic), or HW out when
 * `maxChannelCount ≥ 4` **and** HW outs / remapped Master are active
 * (discrete ChannelMerger). Otherwise Master connects speakers-stereo to
 * destination; HW fail-softs to Master when multi-out is inactive.
 * Click / metronome stays on a separate Direct Cue path (never through Master).
 *
 * Thin barrel: public API re-exports. Implementation lives in `./audio-playback/`.
 */

export type {
  AudioPlaybackInput,
  LoadAudioBufferOptions,
  AudioBufferCacheStats,
  AudioBufferCacheEntry,
  ChannelMeterPeaks,
} from "./audio-playback/types.js";

export {
  estimateAudioBufferBytes,
  getAudioBufferCacheStats,
  getAudioBufferCacheEntries,
  getAudioBufferInflightCount,
  assetFileUrl,
  isAudioAssetDecodeFailed,
  getFailedAudioAssetIds,
  loadAudioBuffer,
  ensureAudioBuffered,
  clearAudioBufferCache,
  ensureAudioMemoryContributor,
} from "./audio-playback/buffer-cache.js";

export { busSoloMutesBus } from "./audio-playback/graph-routing.js";

export {
  readTrackMeterDb,
  readHwOutMeterDb,
  readGroupBusMeterDb,
  readMasterMeterDb,
} from "./audio-playback/meters.js";

export {
  panicCueSamples,
  fireCueSampleGo,
} from "./audio-playback/cue-samples.js";

export {
  suppressAudioPlayback,
  allowAudioPlayback,
  getAudioPlaybackDebugState,
  shouldSoftStopPastSongEnd,
  syncAudioPlayback,
  stopAudioPlayback,
  resumeAndSyncAudioPlayback,
  restartAudioPlayback,
} from "./audio-playback/sync-engine.js";

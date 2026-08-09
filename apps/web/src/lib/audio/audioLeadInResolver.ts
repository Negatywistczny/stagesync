/**
 * audioLeadInResolver.ts — Robust Format-Native Lead-In & Encoder Delay Resolver
 * Handles Sample-Exact Priming Delays across Audio Containers:
 *   - WAV / AIFF / FLAC : Always 0 ms (Lossless studio alignment preserved)
 *   - AAC / M4A         : 2112 samples (~47.89 ms @ 44.1kHz) or iTunSMPB atom
 *   - MP3               : Xing/LAME encoder delay or PCM SNR threshold scan (> -60 dBFS)
 */

export type AudioLeadInResolveOptions = {
  /** File format extension or mime type hint (e.g. 'wav', 'mp3', 'm4a', 'aac', 'flac'). */
  formatHint?: string;
  /** Optional raw file binary bytes for parsing container metadata tags (Xing / iTunSMPB). */
  rawBytes?: Uint8Array;
};

/**
 * Resolves the initial encoder priming delay or lead-in padding in milliseconds.
 *
 * @param buffer - Decoded Web Audio AudioBuffer or PCM Float32Array channel data.
 * @param options - Format hint and optional raw byte metadata.
 * @returns Initial lead-in delay offset in milliseconds (>= 0).
 */
export function resolveAudioLeadInDelayMs(
  buffer: AudioBuffer | { channelData: Float32Array; sampleRate: number },
  options: AudioLeadInResolveOptions = {},
): number {
  const format = (options.formatHint ?? "").toLowerCase().trim();

  // 1. Lossless formats (WAV, AIFF, FLAC) have ZERO encoder priming delay
  if (
    format === "wav" ||
    format === "wave" ||
    format === "aiff" ||
    format === "aif" ||
    format === "flac" ||
    format === "audio/wav" ||
    format === "audio/x-wav" ||
    format === "audio/flac"
  ) {
    return 0;
  }

  const sampleRate = "sampleRate" in buffer ? buffer.sampleRate : 44100;
  const channelData =
    "getChannelData" in buffer ? buffer.getChannelData(0) : buffer.channelData;

  // 2. AAC / M4A Containers (CoreAudio / iTunes / QuickTime default priming delay: 2112 samples)
  if (
    format === "m4a" ||
    format === "aac" ||
    format === "mp4" ||
    format === "audio/mp4" ||
    format === "audio/aac"
  ) {
    // If raw bytes provided, try parsing iTunSMPB atom string
    if (options.rawBytes) {
      const parsedDelay = parseITunSmpbDelay(options.rawBytes, sampleRate);
      if (parsedDelay !== null) {
        return parsedDelay;
      }
    }
    // Default CoreAudio / QuickTime AAC priming delay: 2112 samples
    return Math.round((2112 / sampleRate) * 1000 * 10) / 10;
  }

  // 3. MP3 Container (LAME / Xing encoder delay parsing)
  if (format === "mp3" || format === "audio/mpeg" || format === "audio/mp3") {
    if (options.rawBytes) {
      const parsedDelay = parseMp3XingDelay(options.rawBytes, sampleRate);
      if (parsedDelay !== null) {
        return parsedDelay;
      }
    }
  }

  // 4. Fallback: PCM Silence Threshold Scan (Scanning first 150ms for signal > -60 dBFS = 0.001 amplitude)
  return detectPcmSilenceThresholdMs(channelData, sampleRate);
}

/**
 * Scans PCM channel data for the first sample exceeding the -60 dBFS threshold (0.001 amplitude).
 */
export function detectPcmSilenceThresholdMs(
  channelData: Float32Array,
  sampleRate: number,
  thresholdAmplitude: number = 0.001, // -60 dBFS
  maxScanMs: number = 150,
): number {
  if (!channelData || channelData.length === 0) return 0;

  const maxScanSamples = Math.min(
    channelData.length,
    Math.round((maxScanMs / 1000) * sampleRate),
  );

  for (let i = 0; i < maxScanSamples; i++) {
    if (Math.abs(channelData[i]!) >= thresholdAmplitude) {
      return Math.round((i / sampleRate) * 1000 * 10) / 10;
    }
  }

  return 0;
}

/**
 * Helper: Parses iTunes iTunSMPB meta atom from raw M4A/AAC bytes.
 * Format: " 00000000 00000840 00000000 ..." where 0x840 = 2112 samples.
 */
function parseITunSmpbDelay(
  bytes: Uint8Array,
  sampleRate: number,
): number | null {
  try {
    const text = new TextDecoder("ascii").decode(
      bytes.subarray(0, Math.min(bytes.length, 16384)),
    );
    const match = text.match(
      /iTunSMPB[\s\S]*?\s([0-9A-Fa-f]{8})\s([0-9A-Fa-f]{8})/,
    );
    if (match && match[2]) {
      const primingSamples = parseInt(match[2], 16);
      if (
        !isNaN(primingSamples) &&
        primingSamples > 0 &&
        primingSamples < 10000
      ) {
        return Math.round((primingSamples / sampleRate) * 1000 * 10) / 10;
      }
    }
  } catch {
    // Ignore decode errors
  }
  return null;
}

/**
 * Helper: Parses LAME / Xing encoder delay from MP3 header.
 */
function parseMp3XingDelay(
  bytes: Uint8Array,
  sampleRate: number,
): number | null {
  try {
    const text = new TextDecoder("ascii").decode(
      bytes.subarray(0, Math.min(bytes.length, 4096)),
    );
    const xingIdx = text.indexOf("Xing");
    const infoIdx = text.indexOf("Info");
    const headerIdx = xingIdx !== -1 ? xingIdx : infoIdx;

    if (headerIdx !== -1 && headerIdx + 140 < bytes.length) {
      // LAME offset in Xing header is usually +140 bytes
      const delayHigh = bytes[headerIdx + 141] ?? 0;
      const delayLow = bytes[headerIdx + 142] ?? 0;
      const encDelaySamples = ((delayHigh << 4) | (delayLow >> 4)) + 529; // Add MDCT decoder delay 529
      if (encDelaySamples > 0 && encDelaySamples < 5000) {
        return Math.round((encDelaySamples / sampleRate) * 1000 * 10) / 10;
      }
    }
  } catch {
    // Ignore decode errors
  }
  return null;
}

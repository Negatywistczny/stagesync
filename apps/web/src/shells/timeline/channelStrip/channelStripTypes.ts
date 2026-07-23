/** Shared channel-strip model for dock (horizontal) and Mixer (vertical). */

import type { MouseEvent } from "react";
import type {
  ChannelMode,
  MixerOutputDest,
  PeakHoldState,
  TrackColor,
  TrackIcon,
} from "@stagesync/shared";
import type { OutputSelectorOption } from "./OutputSelector.js";

export type ChannelStripState = {
  trackId: string;
  name: string;
  muted: boolean;
  gainDb: number;
  /** Stereo pan / balance −1…+1. */
  pan: number;
  /** Mono = PAN; stereo = BAL + dual meters. Default stereo. */
  channelMode?: ChannelMode;
  soloed: boolean;
  selected: boolean;
  /** Live peak dB for meter (−60 floor when idle). */
  meterDb?: number;
  /** Stereo R channel; omit for mono. */
  meterDbR?: number;
  /** Peak hold latch (Mixer). */
  hold?: PeakHoldState;
  color?: TrackColor | string;
  icon?: TrackIcon | string;
  /** `track` (default) or group `bus`. */
  kind?: "track" | "bus";
  /** Mixer output selector. */
  outputValue?: string;
  outputOptions?: readonly OutputSelectorOption[];
};

export type ChannelStripCallbacks = {
  onSelect: (e: MouseEvent) => void;
  onContextMenu?: (e: MouseEvent) => void;
  onSoloClick: (e: MouseEvent) => void;
  onMuteClick: (e: MouseEvent) => void;
  onGainChange: (gainDb: number) => void;
  onGainReset: () => void;
  onPanChange?: (pan: number) => void;
  onPanReset?: () => void;
  onChannelModeChange?: (mode: ChannelMode) => void;
  onHoldClear?: () => void;
  onColorChange?: (color: TrackColor) => void;
  onIconChange?: (icon: TrackIcon) => void;
  onOutputChange?: (output: MixerOutputDest) => void;
  onNameDoubleClick?: () => void;
  onRenameChange?: (name: string) => void;
  onRenameCommit?: () => void;
  onRenameCancel?: () => void;
};

export type MasterStripState = {
  gainDb: number;
  meterL: number;
  meterR: number;
  holdL: PeakHoldState;
  holdR: PeakHoldState;
};

export type MasterStripCallbacks = {
  onGainChange: (gainDb: number) => void;
  onGainReset: () => void;
  onHoldClear?: () => void;
};

export type ClickStripCallbacks = {
  /** Mute Click ↔ metronomeOn toggle. */
  onMuteClick: () => void;
};

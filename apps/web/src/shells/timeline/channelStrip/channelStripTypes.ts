/** Shared channel-strip model for dock (horizontal) and Mixer (vertical). */

import type { MouseEvent } from "react";

export type ChannelStripState = {
  trackId: string;
  name: string;
  muted: boolean;
  gainDb: number;
  soloed: boolean;
  selected: boolean;
};

export type ChannelStripCallbacks = {
  onSelect: (e: MouseEvent) => void;
  onContextMenu?: (e: MouseEvent) => void;
  onSoloClick: (e: MouseEvent) => void;
  onMuteClick: (e: MouseEvent) => void;
  onGainChange: (gainDb: number) => void;
  onGainReset: () => void;
  onNameDoubleClick?: () => void;
  onRenameChange?: (name: string) => void;
  onRenameCommit?: () => void;
  onRenameCancel?: () => void;
};

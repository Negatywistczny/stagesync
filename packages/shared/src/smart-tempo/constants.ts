/** Min |ΔBPM| to emit a Logic-like sparse tempo node (smoothed local tempo). */
export const SMART_TEMPO_SPARSE_MIN_BPM_DELTA = 0.0;
/** Median window in beats for local tempo (~2 bars in 4/4 — resists IBI blips). */
export const SMART_TEMPO_SPARSE_WINDOW_BEATS = 4;
/** Minimum bars between sparse tempo nodes (Logic ~1–2). */
export const SMART_TEMPO_SPARSE_MIN_BAR_GAP = 1;
/** Cap |ΔBPM| vs previous sparse segment (rejects onset-snap spikes). */
export const SMART_TEMPO_SPARSE_MAX_BPM_STEP = 5;

/** Canonical import backing track — one clip per project on re-import. */
export const US_UG_BACKING_TRACK_NAME = "US+UG Backing";
export const US_UG_BACKING_TRACK_ID = "us-ug-backing-track";
export const US_UG_BACKING_CLIP_ID = "us-ug-backing-clip";

/** Max beats used for Smart Tempo grid / refine (~8 min @ 120 BPM). */
export const SMART_TEMPO_MAX_BEATS = 2048;
/** Max bar-boundary nodes for Beat Mapper UI markers. */
export const SMART_TEMPO_MAX_UI_NODES = 256;
/** Max ms of audio used when synthesizing a fallback beat grid. */
export const SMART_TEMPO_MAX_GRID_MS = 600_000;

/** YouTube video id (11 chars). */
export const YOUTUBE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

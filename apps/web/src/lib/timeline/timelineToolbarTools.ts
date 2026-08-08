/**
 * Which Timeline tools appear on the compact toolbar (localStorage).
 * Full set stays available via T-chord menu; this only filters the L2 strip.
 */

export const TOOLBAR_TOOLS_STORAGE_KEY = "stagesync-timeline-toolbar-tools";

/** Canonical order for toolbar + picker (matches TOOLS in TimelineShell). */
export const TOOLBAR_TOOL_ORDER = [
  "pointer",
  "pencil",
  "eraser",
  "scissors",
  "join",
  "mute",
  "solo",
  "fade",
  "gain",
  "marquee",
  "zoom",
] as const;

export type ToolbarToolId = (typeof TOOLBAR_TOOL_ORDER)[number];

const TOOL_ID_SET = new Set<string>(TOOLBAR_TOOL_ORDER);

/** Always shown; cannot be toggled off. */
export const TOOLBAR_ALWAYS_VISIBLE: ReadonlySet<ToolbarToolId> = new Set([
  "pointer",
]);

/** Default compact set: Pointer, Pencil, Eraser, Scissors. */
export const DEFAULT_TOOLBAR_VISIBLE: readonly ToolbarToolId[] = [
  "pointer",
  "pencil",
  "eraser",
  "scissors",
];

export function isToolbarToolId(id: string): id is ToolbarToolId {
  return TOOL_ID_SET.has(id);
}

/** Stable order, unknown ids dropped, pointer always included. */
export function normalizeToolbarVisible(
  ids: readonly string[],
): ToolbarToolId[] {
  const wanted = new Set<string>();
  for (const id of ids) {
    if (isToolbarToolId(id)) wanted.add(id);
  }
  wanted.add("pointer");
  return TOOLBAR_TOOL_ORDER.filter((id) => wanted.has(id));
}

export function loadToolbarVisibleTools(
  storage: Pick<Storage, "getItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): ToolbarToolId[] {
  if (!storage) return [...DEFAULT_TOOLBAR_VISIBLE];
  try {
    const raw = storage.getItem(TOOLBAR_TOOLS_STORAGE_KEY);
    if (raw == null || raw === "") return [...DEFAULT_TOOLBAR_VISIBLE];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_TOOLBAR_VISIBLE];
    return normalizeToolbarVisible(
      parsed.filter((x): x is string => typeof x === "string"),
    );
  } catch {
    return [...DEFAULT_TOOLBAR_VISIBLE];
  }
}

export function saveToolbarVisibleTools(
  ids: readonly string[],
  storage: Pick<Storage, "setItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): void {
  if (!storage) return;
  try {
    storage.setItem(
      TOOLBAR_TOOLS_STORAGE_KEY,
      JSON.stringify(normalizeToolbarVisible(ids)),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function toggleToolbarVisibleTool(
  current: readonly ToolbarToolId[],
  id: ToolbarToolId,
): ToolbarToolId[] {
  if (TOOLBAR_ALWAYS_VISIBLE.has(id)) {
    return normalizeToolbarVisible(current);
  }
  const set = new Set(current);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return normalizeToolbarVisible([...set]);
}

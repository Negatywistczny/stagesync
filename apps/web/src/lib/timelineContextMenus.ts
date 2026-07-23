/**
 * Pure builders for Timeline context-menu item lists.
 * Shells supply callbacks; this module never touches React or DOM.
 */

import type { ContextMenuItem } from "@stagesync/ui";

export type ClipMenuLane =
  | "forma"
  | "tekst"
  | "akordy"
  | "cue"
  | "audio";

export type EmptyLaneMenuKind =
  | "forma"
  | "tekst"
  | "akordy"
  | "cue"
  | "audio";

export type AudioTrackMenuCallbacks = {
  canDuplicate: boolean;
  onRename: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

export function buildAudioTrackContextMenuItems(
  cb: AudioTrackMenuCallbacks,
): ContextMenuItem[] {
  return [
    {
      id: "rename",
      label: "Zmień nazwę",
      onSelect: cb.onRename,
    },
    {
      id: "duplicate",
      label: "Duplikuj ścieżkę",
      disabled: !cb.canDuplicate,
      onSelect: cb.onDuplicate,
    },
    { type: "separator" },
    {
      id: "remove",
      label: "Usuń ścieżkę",
      danger: true,
      onSelect: cb.onRemove,
    },
  ];
}

export type ClipMenuCallbacks = {
  lane: ClipMenuLane;
  canPaste: boolean;
  canSplit: boolean;
  /** Audio only — current mute state for label. */
  clipMuted?: boolean;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMuteToggle?: () => void;
  onFocusInspector: () => void;
  onSplit?: () => void;
};

export function buildClipContextMenuItems(
  cb: ClipMenuCallbacks,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: "cut",
      label: "Wytnij",
      shortcut: "⌘X",
      onSelect: cb.onCut,
    },
    {
      id: "copy",
      label: "Kopiuj",
      shortcut: "⌘C",
      onSelect: cb.onCopy,
    },
    {
      id: "paste",
      label: "Wklej",
      shortcut: "⌘V",
      disabled: !cb.canPaste,
      onSelect: cb.onPaste,
    },
    {
      id: "duplicate",
      label: "Duplikuj",
      shortcut: "⌘D",
      onSelect: cb.onDuplicate,
    },
  ];

  if (cb.canSplit && cb.onSplit) {
    items.push({
      id: "split",
      label: "Rozdziel w miejscu kursora",
      onSelect: cb.onSplit,
    });
  }

  if (cb.lane === "audio" && cb.onMuteToggle) {
    items.push({
      id: "mute",
      label: cb.clipMuted ? "Włącz klip (Unmute)" : "Wycisz klip (Mute)",
      onSelect: cb.onMuteToggle,
    });
  }

  items.push(
    {
      id: "inspector",
      label: "Pokaż w Inspectorze",
      onSelect: cb.onFocusInspector,
    },
    { type: "separator" },
    {
      id: "delete",
      label: "Usuń",
      shortcut: "⌫",
      danger: true,
      onSelect: cb.onDelete,
    },
  );

  return items;
}

export type EmptyLaneMenuCallbacks = {
  lane: EmptyLaneMenuKind;
  canPaste: boolean;
  onPaste: () => void;
  onImportAudio?: () => void;
  onAddClip?: () => void;
};

export function buildEmptyLaneContextMenuItems(
  cb: EmptyLaneMenuCallbacks,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: "paste",
      label: "Wklej klip",
      shortcut: "⌘V",
      disabled: !cb.canPaste,
      onSelect: cb.onPaste,
    },
  ];

  if (cb.lane === "audio" && cb.onImportAudio) {
    items.push({
      id: "import-audio",
      label: "Importuj plik audio…",
      onSelect: cb.onImportAudio,
    });
  }

  if (cb.onAddClip) {
    const label =
      cb.lane === "forma"
        ? "Dodaj sekcję"
        : cb.lane === "tekst"
          ? "Dodaj tekst"
          : cb.lane === "akordy"
            ? "Dodaj akord"
            : cb.lane === "cue"
              ? "Dodaj cue"
              : null;
    if (label) {
      items.push({
        id: "add-clip",
        label,
        onSelect: cb.onAddClip,
      });
    }
  }

  return items;
}

/** True when clipboard lane matches empty-lane paste target. */
export function clipboardMatchesEmptyLane(
  clipboardLane: string | null | undefined,
  emptyLane: EmptyLaneMenuKind,
): boolean {
  if (!clipboardLane) return false;
  if (emptyLane === "audio") {
    return clipboardLane.startsWith("audio:");
  }
  return clipboardLane === emptyLane;
}

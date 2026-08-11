import React, { type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  IconChecked,
  IconUnchecked,
} from "../../components/icons.js";
import {
  isTrackVisible,
  TRACKS,
  type TrackVisibilityMap,
} from "@lib/timeline/timelineTracks.js";
import {
  isToolbarToolId,
  TOOLBAR_ALWAYS_VISIBLE,
  toggleToolbarVisibleTool,
  saveToolbarVisibleTools,
  type ToolbarToolId,
} from "@lib/timeline/timelineToolbarTools.js";
import {
  TOOLS,
  type ToolId,
} from "../timelineToolsData.js";
import type { WandMode } from "@stagesync/shared";
import styles from "../TimelineShell.module.css";

export type TimelinePortalsProps = {
  eyeOpen: boolean;
  eyeMenuPos: { top: number; left: number } | null;
  eyeMenuRef: RefObject<HTMLDivElement | null>;
  eyeMenuId: string;
  trackVisibility: TrackVisibilityMap;
  toggleTrack: (id: string) => void;
  toolsVisOpen: boolean;
  toolsVisMenuPos: { top: number; left: number } | null;
  toolsVisMenuRef: RefObject<HTMLDivElement | null>;
  toolsVisMenuId: string;
  toolbarVisibleSet: Set<string>;
  setToolbarVisibleTools: (
    fn: (prev: ToolbarToolId[]) => ToolbarToolId[],
  ) => void;
  toolMenu: { top: number; left: number } | null;
  toolMenuRef: RefObject<HTMLDivElement | null>;
  tool: ToolId;
  onTool: (id: ToolId) => void;
  wandMenu: { top: number; left: number } | null;
  wandMenuRef: RefObject<HTMLDivElement | null>;
  applyWand: (mode: WandMode) => void;
};

export function TimelinePortals({
  eyeOpen,
  eyeMenuPos,
  eyeMenuRef,
  eyeMenuId,
  trackVisibility,
  toggleTrack,
  toolsVisOpen,
  toolsVisMenuPos,
  toolsVisMenuRef,
  toolsVisMenuId,
  toolbarVisibleSet,
  setToolbarVisibleTools,
  toolMenu,
  toolMenuRef,
  tool,
  onTool,
  wandMenu,
  wandMenuRef,
  applyWand,
}: TimelinePortalsProps) {
  return (
    <>
      {eyeOpen && eyeMenuPos
        ? createPortal(
            <div
              ref={eyeMenuRef}
              id={eyeMenuId}
              className={[styles.eyeMenu, styles.eyeMenuFixed]
                .filter(Boolean)
                .join(" ")}
              style={{ top: eyeMenuPos.top, left: eyeMenuPos.left }}
              role="menu"
            >
              {TRACKS.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isTrackVisible(trackVisibility, track)}
                  className={[
                    styles.eyeItem,
                    track.locked ? styles.eyeItemLocked : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={track.locked}
                  onClick={() => toggleTrack(track.id)}
                >
                  <span aria-hidden>
                    {isTrackVisible(trackVisibility, track) ? (
                      <IconChecked />
                    ) : (
                      <IconUnchecked />
                    )}
                  </span>
                  {track.label}
                  {track.locked ? " (zawsze)" : ""}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}

      {toolsVisOpen && toolsVisMenuPos
        ? createPortal(
            <div
              ref={toolsVisMenuRef}
              id={toolsVisMenuId}
              className={[styles.eyeMenu, styles.eyeMenuFixed]
                .filter(Boolean)
                .join(" ")}
              style={{ top: toolsVisMenuPos.top, left: toolsVisMenuPos.left }}
              role="menu"
              aria-label="Widoczne narzędzia na pasku"
            >
              {TOOLS.map(({ id, label }) => {
                if (!isToolbarToolId(id)) return null;
                const locked = TOOLBAR_ALWAYS_VISIBLE.has(id);
                const checked = toolbarVisibleSet.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    className={[
                      styles.eyeItem,
                      locked ? styles.eyeItemLocked : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={locked}
                    onClick={() => {
                      if (locked) return;
                      setToolbarVisibleTools((prev) => {
                        const next = toggleToolbarVisibleTool(prev, id);
                        saveToolbarVisibleTools(next);
                        return next;
                      });
                    }}
                  >
                    <span aria-hidden>
                      {checked ? <IconChecked /> : <IconUnchecked />}
                    </span>
                    {label}
                    {locked ? " (zawsze)" : ""}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}

      {toolMenu
        ? createPortal(
            <div
              ref={toolMenuRef}
              className={styles.toolMenu}
              style={{ top: toolMenu.top, left: toolMenu.left }}
              role="menu"
              aria-label="Wybór narzędzia"
            >
              {TOOLS.map(({ id, label, key, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className={[
                    styles.toolMenuItem,
                    tool === id ? styles.toolMenuItemActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onTool(id)}
                >
                  <Icon />
                  <span>{label}</span>
                  <span className={styles.toolMenuKey}>
                    {key ? key.toUpperCase() : "—"}
                  </span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}

      {wandMenu
        ? createPortal(
            <div
              ref={wandMenuRef}
              className={styles.toolMenu}
              style={{ top: wandMenu.top, left: wandMenu.left }}
              role="menu"
              aria-label="Różdżka — wybór źródła"
            >
              {(
                [
                  ["tekst", "Tekst → Forma", "1"],
                  ["akordy", "Akordy → Forma", "2"],
                  ["both", "Tekst + Akordy → Forma", "3"],
                ] as const
              ).map(([mode, label, keyHint]) => (
                <button
                  key={mode}
                  type="button"
                  role="menuitem"
                  className={styles.toolMenuItem}
                  onClick={() => applyWand(mode)}
                >
                  <span>{label}</span>
                  <span className={styles.toolMenuKey}>{keyHint}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

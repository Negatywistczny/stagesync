import type { CSSProperties } from "react";
import styles from "./ClientShell.module.css";
import type { ChordNameParts } from "@stagesync/shared";
import {
  serializeChordNameHtml,
  type ChordNameClassNames,
} from "./ChordName.js";

/** v4 `--slot-bar-units`: 1-bar = square; N-bar = N× square width (fractional OK). */
export function slotBarUnitsStyle(barUnits: number): CSSProperties {
  const units = Number.isFinite(barUnits) && barUnits > 0 ? barUnits : 1;
  return {
    ["--slot-bar-units" as string]: String(units),
  };
}

export function css(mod: string | undefined): string {
  return mod ?? "";
}

export const CHORD_NAME_CLASSES: ChordNameClassNames = {
  top: css(styles.chordNameTop),
  root: css(styles.chordNameRoot),
  sup: css(styles.chordNameSup),
  bass: css(styles.chordNameBass),
  stack: css(styles.chordNameStack),
};

export function partsToInlineHtml(parts: ChordNameParts): string {
  return serializeChordNameHtml(parts, CHORD_NAME_CLASSES, "inline");
}

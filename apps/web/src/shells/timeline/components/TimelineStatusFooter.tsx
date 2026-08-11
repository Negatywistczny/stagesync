import React from "react";
import { Select } from "@stagesync/ui";
import { ConnectionIndicator } from "../../client/ConnectionIndicator.js";
import {
  snapModeFromStorageKey,
  snapModeToStorageKey,
} from "@lib/timeline/timelineGesture.js";
import type { SnapMode } from "@stagesync/shared";
import {
  clampZoomUi,
  ZOOM_H_MAX,
  ZOOM_H_MIN,
  ZOOM_UI_MAX,
  ZOOM_UI_MIN,
} from "@lib/timeline/timelineZoomPrefs.js";
import {
  MAX_LANE_PX as ZOOM_V_MAX,
  MIN_LANE_PX as ZOOM_V_MIN,
} from "@lib/timeline/timelineLaneHeights.js";
import type { TimelineSurface } from "@lib/timeline/timelineSelection.js";
import styles from "../TimelineShell.module.css";

export type TimelineStatusFooterProps = {
  wsStatus: "connected" | "connecting" | "disconnected";
  isMobilePreview: boolean;
  snapMode: SnapMode;
  setSnapMode: (m: SnapMode) => void;
  zoomUi: number;
  setZoomUi: (z: number) => void;
  zoomH: number;
  setZoomH: (z: number) => void;
  zoomV: number;
  setVerticalZoom: (z: number) => void;
  timelineSurface: TimelineSurface;
};

export function TimelineStatusFooter({
  wsStatus,
  isMobilePreview,
  snapMode,
  setSnapMode,
  zoomUi,
  setZoomUi,
  zoomH,
  setZoomH,
  zoomV,
  setVerticalZoom,
  timelineSurface,
}: TimelineStatusFooterProps) {
  return (
    <footer className={styles.status} aria-label="Status osi czasu">
      <div className={styles.statusLeft}>
        <ConnectionIndicator status={wsStatus} variant="dot" />
        <span className={styles.statusConnLab}>
          {wsStatus === "connected"
            ? "Połączony"
            : wsStatus === "connecting"
              ? "Łączenie…"
              : "Rozłączony"}
        </span>
      </div>
      <div className={styles.zooms} role="group" aria-label="Zoom i snap">
        {!isMobilePreview ? (
          <label className={styles.snapPicker}>
            <span className={styles.snapPickerLab}>Snap</span>
            <Select
              className={styles.snapPickerSelect}
              aria-label="Tryb snap"
              value={snapModeToStorageKey(snapMode)}
              onChange={(e) => {
                const next = snapModeFromStorageKey(e.target.value);
                if (next) setSnapMode(next);
              }}
            >
              <option value="off">Wyłącz</option>
              <option value="bar">Takt</option>
              <option value="beat">Beat</option>
              <option value="subdivision:2">1/2</option>
              <option value="subdivision:4">1/4</option>
              <option value="subdivision:8">1/8</option>
              <option value="subdivision:16">1/16</option>
            </Select>
          </label>
        ) : null}
        {!isMobilePreview ? (
          <label className={styles.zoomLab}>
            UI
            <input
              className={styles.zoomRange}
              type="range"
              min={ZOOM_UI_MIN}
              max={ZOOM_UI_MAX}
              value={zoomUi}
              onChange={(e) => setZoomUi(clampZoomUi(Number(e.target.value)))}
              title="Zoom UI — gęstość chrome Timeline / Mixer (85–125%)"
              aria-label="Zoom UI"
            />
          </label>
        ) : null}
        <label
          className={styles.zoomLab}
          title={
            timelineSurface === "mixer"
              ? "Zoom poziomy dotyczy osi czasu (niedostępny w Mixerze)"
              : "Zoom poziomy (oś czasu)"
          }
        >
          H
          <input
            className={styles.zoomRange}
            type="range"
            min={ZOOM_H_MIN}
            max={ZOOM_H_MAX}
            value={zoomH}
            disabled={timelineSurface === "mixer"}
            onChange={(e) => setZoomH(Number(e.target.value))}
            aria-label="Zoom poziomy"
          />
        </label>
        <label
          className={styles.zoomLab}
          title={
            timelineSurface === "mixer"
              ? "Zoom pionowy dotyczy wysokości ścieżek (niedostępny w Mixerze)"
              : "Zoom pionowy (wysokość ścieżek)"
          }
        >
          V
          <input
            className={styles.zoomRange}
            type="range"
            min={ZOOM_V_MIN}
            max={ZOOM_V_MAX}
            value={zoomV}
            disabled={timelineSurface === "mixer"}
            onChange={(e) => setVerticalZoom(Number(e.target.value))}
            aria-label="Zoom pionowy"
          />
        </label>
      </div>
    </footer>
  );
}

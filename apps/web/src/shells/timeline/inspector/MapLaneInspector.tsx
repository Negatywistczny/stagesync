import React from "react";
import type { MapLaneId } from "@lib/timeline/mapLaneEdit.js";
import styles from "../TimelineShell.module.css";

export function MapLaneInspector({
  selectedMapLane,
  selectedMapIds,
  primaryMapId,
}: {
  selectedMapLane: MapLaneId;
  selectedMapIds: string[];
  primaryMapId: string | null;
}) {
  return (
    <div className={styles.inspBody}>
      <p className={styles.inspMulti} role="status" aria-live="polite">
        Zaznaczono {selectedMapIds.length} ·{" "}
        {selectedMapLane === "tempo"
          ? "Tempo"
          : selectedMapLane === "metrum"
            ? "Metrum"
            : "Tonacja"}
        {selectedMapIds.length > 1
          ? " · edycja: klik bez multi / Delete"
          : " · klik = edycja wartości"}
      </p>
      {primaryMapId ? (
        <p>
          Aktywny event: <span className={styles.metaRead}>{primaryMapId}</span>
        </p>
      ) : null}
    </div>
  );
}

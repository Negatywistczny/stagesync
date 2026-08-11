import { useEffect, useState } from "react";
import { Button } from "@stagesync/ui";
import { ensureAudioMemoryContributor } from "@lib/audio/audioPlayback.js";
import {
  getLastElevatedMemoryPressure,
  startMemoryPressureMonitor,
  stopMemoryPressureMonitor,
  subscribeMemoryPressure,
  userFacingMemoryPressureMessage,
  type MemoryPressureSnapshot,
} from "@lib/client/memoryPressure.js";
import styles from "./MemoryPressureBanner.module.css";

/**
 * Warns the operator when the browser JS heap / StageSync-owned PCM grows large.
 * Details always go to the console under `[stagesync-mem]` for the next investigation.
 */
export function MemoryPressureBanner() {
  const [snapshot, setSnapshot] = useState<MemoryPressureSnapshot | null>(() =>
    getLastElevatedMemoryPressure(),
  );
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    ensureAudioMemoryContributor();
    const unsub = subscribeMemoryPressure((next) => {
      if (next.level === "ok") {
        setSnapshot(null);
        return;
      }
      setSnapshot(next);
    });
    startMemoryPressureMonitor();
    const elevated = getLastElevatedMemoryPressure();
    if (elevated) setSnapshot(elevated);
    return () => {
      unsub();
      stopMemoryPressureMonitor();
    };
  }, []);

  if (!snapshot || snapshot.level === "ok") return null;

  const dismissKey = `${snapshot.level}:${snapshot.causes[0] ?? snapshot.reason}`;
  if (dismissedKey === dismissKey) return null;

  const critical = snapshot.level === "critical";

  return (
    <div
      className={
        critical ? `${styles.banner} ${styles.critical}` : styles.banner
      }
      role="alert"
    >
      <p className={styles.text}>{userFacingMemoryPressureMessage(snapshot)}</p>
      <Button
        type="button"
        variant="ghost"
        className={styles.action}
        aria-label="Ukryj ostrzeżenie o pamięci"
        onClick={() => setDismissedKey(dismissKey)}
      >
        Ukryj
      </Button>
    </div>
  );
}

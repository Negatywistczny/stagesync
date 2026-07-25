import { useState, type FormEvent } from "react";
import { Button } from "@stagesync/ui";
import {
  DEVICE_DISPLAY_NAME_MAX,
  getStoredDeviceDisplayName,
  setStoredDeviceDisplayName,
} from "../lib/deviceNamePrefs.js";
import styles from "./DeviceNameFields.module.css";

/** Secondary rename control for Client / Admin settings. */
export function DeviceNameFields() {
  const [draft, setDraft] = useState(() => getStoredDeviceDisplayName() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const name = setStoredDeviceDisplayName(draft);
      setDraft(name);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu");
    }
  }

  return (
    <form className={styles.wrap} onSubmit={onSubmit}>
      <p className={styles.lab}>Nazwa urządzenia</p>
      <input
        className={styles.input}
        maxLength={DEVICE_DISPLAY_NAME_MAX}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        aria-label="Nazwa urządzenia"
      />
      <div className={styles.row}>
        <Button type="submit" variant="ghost">
          Zapisz nazwę
        </Button>
        {saved ? (
          <span className={styles.ok} role="status">
            Zapisano
          </span>
        ) : null}
      </div>
      {error ? (
        <p className={styles.err} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

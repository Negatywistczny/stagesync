import { useState, type FormEvent } from "react";
import { Button } from "@stagesync/ui";
import {
  DEVICE_DISPLAY_NAME_MAX,
  getStoredDeviceDisplayName,
  setStoredDeviceDisplayName,
} from "../lib/deviceNamePrefs.js";
import styles from "./DeviceNameFields.module.css";

type Props = {
  /** Controlled draft (Preferences). When set with onChange, does not persist. */
  value?: string;
  onChange?: (next: string) => void;
  /** Validation message from parent (Preferences sticky Zapisz). */
  error?: string | null;
};

/** Secondary rename control for Client / Admin settings. */
export function DeviceNameFields({
  value,
  onChange,
  error: controlledError = null,
}: Props = {}) {
  const controlled = value !== undefined && onChange !== undefined;
  const [uncontrolled, setUncontrolled] = useState(
    () => getStoredDeviceDisplayName() ?? "",
  );
  const [saved, setSaved] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const draft = controlled ? value : uncontrolled;
  const error = controlled ? controlledError : localError;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (controlled) return;
    setLocalError(null);
    setSaved(false);
    try {
      const name = setStoredDeviceDisplayName(uncontrolled);
      setUncontrolled(name);
      setSaved(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Błąd zapisu");
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
          const next = e.target.value;
          if (controlled) {
            onChange(next);
            return;
          }
          setUncontrolled(next);
          setSaved(false);
        }}
        aria-label="Nazwa urządzenia"
        aria-invalid={error ? true : undefined}
      />
      {controlled ? null : (
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
      )}
      {error ? (
        <p className={styles.err} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

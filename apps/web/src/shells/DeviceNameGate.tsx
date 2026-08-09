import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button, Input } from "@stagesync/ui";
import {
  DEVICE_DISPLAY_NAME_MAX,
  getStoredDeviceDisplayName,
  setStoredDeviceDisplayName,
} from "@lib/client/deviceNamePrefs.js";
import { useKeepTileAboveIme } from "@lib/client/useKeepTileAboveIme.js";
import { BrandName } from "./BrandName.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";
import { useTransport } from "../transport/useTransport.js";
import styles from "./DeviceNameGate.module.css";

/**
 * Blocks all shells until this browser/device has a display name in localStorage.
 * Presence hello is sent by shells via useAnnounceDevicePresence / ClientShell.
 */
export function DeviceNameGate({ children }: { children: ReactNode }) {
  const [name, setName] = useState(() => getStoredDeviceDisplayName());
  const [draft, setDraft] = useState(() => getStoredDeviceDisplayName() ?? "");
  const [error, setError] = useState<string | null>(null);
  const { wsStatus, latencyMs } = useTransport();
  const pageRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useKeepTileAboveIme(pageRef, modalRef, !name);

  if (name) {
    return children;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const stored = setStoredDeviceDisplayName(draft);
      setName(stored);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się zapisać nazwy",
      );
    }
  }

  return (
    <div ref={pageRef} className={styles.page}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal
        aria-labelledby="device-name-title"
      >
        <div className={styles.modalConn}>
          <ConnectionIndicator status={wsStatus} latencyMs={latencyMs} />
        </div>
        <ConnectionLostBanner status={wsStatus} />
        <h1 id="device-name-title" className={styles.modalTitle}>
          Witaj w <BrandName />
        </h1>
        <p className={styles.muted}>Podaj swoje imię lub nazwę urządzenia.</p>
        <form className={styles.form} onSubmit={onSubmit}>
          <Input
            maxLength={DEVICE_DISPLAY_NAME_MAX}
            placeholder="np. Ania · saksofon"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            aria-label="Imię lub nazwa urządzenia"
          />
          {error ? (
            <p className={styles.err} role="alert">
              {error}
            </p>
          ) : null}
          <Button variant="primary" type="submit">
            Dalej
          </Button>
        </form>
      </div>
    </div>
  );
}

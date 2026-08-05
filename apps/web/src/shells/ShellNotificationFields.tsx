import { useCallback, useEffect, useState } from "react";
import { Button, Field } from "@stagesync/ui";
import {
  getWebNotificationPermission,
  readPushEnabledPreference,
  requestNotificationPermission,
  setPushEnabledPreference,
  syncPushRegistration,
} from "@lib/client/pushNotifications.js";
import styles from "./ShellNotificationFields.module.css";

/**
 * Contextual opt-in for system notifications (#810).
 * Never forced on cold start — user enables here.
 */
export function ShellNotificationFields() {
  const [enabled, setEnabled] = useState(() => readPushEnabledPreference());
  const [permission, setPermission] = useState(() =>
    getWebNotificationPermission(),
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setPermission(getWebNotificationPermission());
  }, [enabled]);

  const onEnable = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const perm = await requestNotificationPermission();
      setPermission(
        perm === "native-pending"
          ? getWebNotificationPermission()
          : perm === "unsupported"
            ? "unsupported"
            : perm,
      );
      if (perm === "denied") {
        setPushEnabledPreference(false);
        setEnabled(false);
        setStatus("Odmówiono uprawnień systemowych — powiadomienia wyłączone.");
        return;
      }
      setPushEnabledPreference(true);
      setEnabled(true);
      const synced = await syncPushRegistration();
      setStatus(
        synced
          ? "Powiadomienia włączone; token zarejestrowany u hosta."
          : "Powiadomienia lokalne włączone (rejestracja Push opcjonalna / brak VAPID lub FCM).",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const onDisable = useCallback(() => {
    setPushEnabledPreference(false);
    setEnabled(false);
    setStatus("Powiadomienia wyłączone.");
  }, []);

  return (
    <Field label="Powiadomienia systemowe">
      <div className={styles.stack}>
        <p className={styles.meta} data-testid="push-permission">
          Uprawnienie: {permission}
          {enabled ? " · włączone w StageSync" : " · wyłączone"}
        </p>
        <div className={styles.actions}>
          {enabled ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onDisable}
            >
              Wyłącz
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              disabled={busy || permission === "unsupported"}
              onClick={() => void onEnable()}
            >
              Włącz powiadomienia
            </Button>
          )}
        </div>
        {status ? (
          <p className={styles.status} role="status">
            {status}
          </p>
        ) : null}
      </div>
    </Field>
  );
}

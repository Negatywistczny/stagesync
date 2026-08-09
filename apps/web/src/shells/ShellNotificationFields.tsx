import { useCallback, useEffect, useState } from "react";
import { Button, Field } from "@stagesync/ui";
import {
  getWebNotificationPermission,
  readPushEnabledPreference,
  requestNotificationPermission,
  setPushEnabledPreference,
  syncPushRegistration,
} from "@lib/client/pushNotifications.js";

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

  useEffect(() => {
    setPermission(getWebNotificationPermission());
  }, [enabled]);

  const onEnable = useCallback(async () => {
    setBusy(true);
    try {
      const perm = await requestNotificationPermission();
      setPermission(
        perm === "native-pending"
          ? getWebNotificationPermission()
          : perm === "unsupported"
            ? "unsupported"
            : perm,
      );
      if (perm === "denied" || perm === "unsupported") {
        setPushEnabledPreference(false);
        setEnabled(false);
        return;
      }
      setPushEnabledPreference(true);
      setEnabled(true);
      await syncPushRegistration();
    } finally {
      setBusy(false);
    }
  }, []);

  const onDisable = useCallback(() => {
    setPushEnabledPreference(false);
    setEnabled(false);
  }, []);

  const unsupported = permission === "unsupported";

  return (
    <Field label="Powiadomienia">
      <Button
        type="button"
        variant="ghost"
        selected={enabled}
        disabled={busy || unsupported}
        data-testid="push-permission"
        aria-pressed={enabled}
        title={
          unsupported
            ? "Powiadomienia niedostępne w tej przeglądarce"
            : enabled
              ? "Wyłącz powiadomienia systemowe"
              : "Włącz powiadomienia systemowe"
        }
        onClick={() => {
          if (enabled) onDisable();
          else void onEnable();
        }}
      >
        {enabled ? "Włączone" : "Wyłączone"}
      </Button>
    </Field>
  );
}

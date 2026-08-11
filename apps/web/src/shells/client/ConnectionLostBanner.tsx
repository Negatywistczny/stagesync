import { useEffect } from "react";
import { Button } from "@stagesync/ui";
import {
  canReturnToLauncher,
  returnToLauncher,
} from "@lib/client/desktopBridge.js";
import {
  canChangeServer,
  requestNativeChangeServer,
} from "@lib/client/nativeShell.js";
import { maybeNotifyHostDisconnect } from "@lib/client/pushNotifications.js";
import { clearOperatorSession } from "@lib/shell-operator/operatorSession.js";
import type { WsStatus } from "../../transport/transportContext.js";
import styles from "./ConnectionLostBanner.module.css";

export type ConnectionLostBannerProps = {
  status: WsStatus;
};

/**
 * Mid-session transport drop: reconnect copy + optional return to host picker
 * (Desktop Launcher via Tauri, or Android Console/Performer via native bridge).
 * Also fires a local scenic notification when the page is backgrounded (#810).
 */
export function ConnectionLostBanner({ status }: ConnectionLostBannerProps) {
  useEffect(() => {
    maybeNotifyHostDisconnect(status);
  }, [status]);

  if (status === "connected") return null;

  const showReturn = canReturnToLauncher() || canChangeServer();
  const text =
    status === "connecting"
      ? "Łączenie z hostem…"
      : "Utracono połączenie. Próba ponownego łączenia…";

  return (
    <div className={styles.banner} role="alert">
      <p className={styles.text}>{text}</p>
      {showReturn ? (
        <Button
          type="button"
          variant="ghost"
          className={styles.action}
          aria-label="Wróć do wyboru hosta w launcherze"
          onClick={() => {
            clearOperatorSession();
            if (requestNativeChangeServer()) return;
            void returnToLauncher().catch(() => {
              /* best-effort — user can quit/reopen */
            });
          }}
        >
          Wróć do wyboru hosta
        </Button>
      ) : null}
    </div>
  );
}

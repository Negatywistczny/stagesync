import { Button } from "@stagesync/ui";
import {
  canReturnToLauncher,
  returnToLauncher,
} from "../lib/desktopBridge.js";
import type { WsStatus } from "../transport/transportContext.js";
import styles from "./ConnectionLostBanner.module.css";

export type ConnectionLostBannerProps = {
  status: WsStatus;
};

/**
 * Mid-session transport drop: reconnect copy + optional return to Desktop Launcher.
 * Return button only when Tauri IPC is available (local 127.0.0.1:4000).
 */
export function ConnectionLostBanner({ status }: ConnectionLostBannerProps) {
  if (status !== "disconnected") return null;

  const showReturn = canReturnToLauncher();

  return (
    <div className={styles.banner} role="status">
      <p className={styles.text}>
        Utracono połączenie. Próba ponownego łączenia…
      </p>
      {showReturn ? (
        <Button
          type="button"
          variant="ghost"
          className={styles.action}
          onClick={() => {
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

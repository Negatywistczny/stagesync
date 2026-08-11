import { Button } from "@stagesync/ui";
import { BridgeModal } from "./BridgeModal.js";
import styles from "./DesktopMenuBridge.module.css";

export function RestartConfirmModal({
  onClose,
  onConfirm,
  pending,
  error,
}: {
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <BridgeModal title="Restart hosta" onClose={onClose}>
      <div className={styles.body}>
        <p className={styles.muted}>
          Serwer lokalny zostanie zrestartowany. Klienci na scenie mogą się
          rozłączyć na chwilę.
        </p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Anuluj
          </Button>
          <Button onClick={onConfirm} loading={pending} disabled={pending}>
            Restart
          </Button>
        </div>
      </div>
    </BridgeModal>
  );
}

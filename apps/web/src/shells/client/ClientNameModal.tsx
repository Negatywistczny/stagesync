import type { FormEvent } from "react";
import { Button, Input } from "@stagesync/ui";
import { DEVICE_DISPLAY_NAME_MAX } from "@lib/client/deviceNamePrefs.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import type { WsStatus } from "../../transport/transportContext.js";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";
import styles from "./ClientShell.module.css";

export function ClientNameModal({
  wsStatus,
  latencyMs,
  nameDraft,
  setNameDraft,
  onSubmit,
}: {
  wsStatus: WsStatus;
  latencyMs: number | null;
  nameDraft: string;
  setNameDraft: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <div className={styles.page}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal
        aria-labelledby="name-title"
      >
        <div className={styles.modalConn}>
          <ConnectionIndicator status={wsStatus} latencyMs={latencyMs} />
        </div>
        <ConnectionLostBanner status={wsStatus} />
        <h1 id="name-title" className={styles.modalTitle}>
          Zmień nazwę
        </h1>
        <p className={styles.modalHint}>
          Podaj swoje imię lub nazwę urządzenia.
        </p>
        <form className={styles.modalForm} onSubmit={onSubmit}>
          <Input
            maxLength={DEVICE_DISPLAY_NAME_MAX}
            placeholder="np. Ania · saksofon"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            autoFocus
            aria-label="Imię lub nazwa urządzenia"
          />
          <Button variant="primary" type="submit">
            Zapisz
          </Button>
        </form>
      </div>
    </div>
  );
}

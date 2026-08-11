import { type FormaClip } from "@stagesync/shared";
import type { WsStatus } from "../../transport/transportContext.js";
import { connectionStatusLabel } from "../client/ConnectionIndicator.js";
import styles from "./AdminShell.module.css";

interface AdminFooterProps {
  nowName: string;
  nextName: string;
  selectedId: string | null;
  activeProjectId: string | undefined | null;
  selectedName: string | undefined | null;
  activeSection: FormaClip | null;
  clockLabel: string;
  bpm: number;
  timeSignature: { numerator: number; denominator: number };
  wsStatus: WsStatus;
}

export function AdminFooter({
  nowName,
  nextName,
  selectedId,
  activeProjectId,
  selectedName,
  activeSection,
  clockLabel,
  bpm,
  timeSignature,
  wsStatus,
}: AdminFooterProps) {
  return (
    <footer className={styles.status} aria-label="Status koncertu">
      <div className={styles.statusGroup}>
        <span className={styles.statusLab}>Teraz</span>
        <span
          className={styles.statusVal}
          title={
            selectedId && activeProjectId && selectedId !== activeProjectId
              ? `Zaznaczony: ${selectedName ?? "—"}`
              : undefined
          }
        >
          {nowName}
        </span>
      </div>
      <div className={styles.statusGroup}>
        <span className={styles.statusLab}>Sekcja</span>
        <span className={styles.statusVal}>{activeSection?.name ?? "—"}</span>
      </div>
      <div className={[styles.statusGroup, styles.statusOptional].join(" ")}>
        <span className={styles.statusLab}>Pozycja</span>
        <span className={[styles.statusVal, styles.statusMono].join(" ")}>
          <span>{clockLabel}</span>
          <span className={styles.statusInlineSep} aria-hidden>
            |
          </span>
          <span>{bpm} BPM</span>
          <span className={styles.statusInlineSep} aria-hidden>
            |
          </span>
          <span>
            {timeSignature.numerator}/{timeSignature.denominator}
          </span>
        </span>
      </div>
      <div className={[styles.statusGroup, styles.statusOptional].join(" ")}>
        <span className={styles.statusLab}>Dalej</span>
        <span className={[styles.statusVal, styles.statusMuted].join(" ")}>
          {nextName}
        </span>
      </div>
      <div className={styles.statusGroup}>
        <span className={styles.statusLab}>Połączenie</span>
        <span className={styles.statusVal}>
          {connectionStatusLabel(wsStatus)}
        </span>
      </div>
    </footer>
  );
}

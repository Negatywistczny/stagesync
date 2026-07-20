import type { WsStatus } from "../transport/transportContext.js";
import styles from "./ConnectionIndicator.module.css";

const STATUS_LABEL: Record<WsStatus, string> = {
  connected: "Połączony",
  disconnected: "Rozłączony",
  connecting: "Łączenie…",
};

export type ConnectionIndicatorProps = {
  status: WsStatus;
  /** `status` = dot + label (+ optional latency); `label` = text only; `dot` = icon only. */
  variant?: "status" | "label" | "dot";
  /** One-way transport latency (ms); shown when connected and finite. */
  latencyMs?: number | null;
  title?: string;
};

function formatLatency(latencyMs: number | null | undefined): string | null {
  if (latencyMs == null || !Number.isFinite(latencyMs) || latencyMs < 0) {
    return null;
  }
  return `${Math.round(latencyMs)} ms`;
}

export function ConnectionIndicator({
  status,
  variant = "status",
  latencyMs,
  title,
}: ConnectionIndicatorProps) {
  const label = STATUS_LABEL[status];
  const connected = status === "connected";
  const latencyText =
    connected && variant !== "dot" ? formatLatency(latencyMs) : null;
  const titleText =
    title ??
    (latencyText ? `WS: ${status} · ${latencyText}` : `WS: ${status}`);

  if (variant === "dot") {
    return (
      <span
        className={[styles.dot, connected ? styles.on : ""].filter(Boolean).join(" ")}
        title={titleText}
        aria-label={label}
      />
    );
  }

  if (variant === "label") {
    return (
      <span
        className={[styles.label, connected ? styles.on : ""].filter(Boolean).join(" ")}
        title={titleText}
      >
        {label}
        {latencyText ? (
          <span className={styles.latency}> · {latencyText}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={[styles.status, connected ? styles.on : ""].filter(Boolean).join(" ")}
      title={titleText}
      role="status"
      aria-live="polite"
    >
      <span
        className={[styles.dot, connected ? styles.on : ""].filter(Boolean).join(" ")}
        aria-hidden
      />
      <span className={styles.statusText}>
        {label}
        {latencyText ? (
          <span className={styles.latency}> · {latencyText}</span>
        ) : null}
      </span>
    </span>
  );
}

export function connectionStatusLabel(status: WsStatus): string {
  return STATUS_LABEL[status];
}

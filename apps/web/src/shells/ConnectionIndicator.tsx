import type { WsStatus } from "../transport/transportContext.js";
import styles from "./ConnectionIndicator.module.css";

const STATUS_LABEL: Record<WsStatus, string> = {
  connected: "Połączony",
  disconnected: "Rozłączony",
  connecting: "Łączenie…",
};

export type ConnectionIndicatorProps = {
  status: WsStatus;
  variant?: "label" | "dot";
  title?: string;
};

export function ConnectionIndicator({
  status,
  variant = "label",
  title,
}: ConnectionIndicatorProps) {
  const label = STATUS_LABEL[status];
  const connected = status === "connected";

  if (variant === "dot") {
    return (
      <span
        className={[styles.dot, connected ? styles.on : ""].filter(Boolean).join(" ")}
        title={title ?? `WS: ${status}`}
        aria-label={label}
      />
    );
  }

  return (
    <span
      className={[styles.label, connected ? styles.on : ""].filter(Boolean).join(" ")}
      title={title}
    >
      {label}
    </span>
  );
}

export function connectionStatusLabel(status: WsStatus): string {
  return STATUS_LABEL[status];
}

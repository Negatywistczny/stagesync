import { Button } from "@stagesync/ui";
import { isRouteErrorResponse } from "react-router-dom";
import styles from "./AppCrashFallback.module.css";

export type AppCrashFallbackProps = {
  error: unknown;
  /** Override default Polish title. */
  title?: string;
};

function describeError(error: unknown): { message: string; detail?: string } {
  if (isRouteErrorResponse(error)) {
    const statusLine = `${error.status} ${error.statusText}`.trim();
    const data =
      typeof error.data === "string"
        ? error.data
        : error.data != null
          ? JSON.stringify(error.data)
          : undefined;
    return {
      message: data || statusLine || "Nieoczekiwany błąd trasy.",
      detail: import.meta.env.DEV ? statusLine : undefined,
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message || "Nieoczekiwany błąd.",
      detail: import.meta.env.DEV ? error.stack : undefined,
    };
  }
  if (typeof error === "string" && error.length > 0) {
    return { message: error };
  }
  return { message: "Nieoczekiwany błąd." };
}

export function AppCrashFallback({
  error,
  title = "Coś poszło nie tak",
}: AppCrashFallbackProps) {
  const { message, detail } = describeError(error);

  return (
    <main className={styles.page} role="alert">
      <p className={styles.brand}>
        Stage<span className={styles.brandMark}>Sync</span>
      </p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <Button type="button" onClick={() => window.location.reload()}>
          Odśwież
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.location.assign("/")}
        >
          Client
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => window.location.assign("/admin")}
        >
          Admin
        </Button>
      </div>
      {detail ? <pre className={styles.detail}>{detail}</pre> : null}
    </main>
  );
}

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
    const message = (data || statusLine || "Nieoczekiwany błąd trasy.").slice(
      0,
      500,
    );
    return {
      message,
      detail: import.meta.env.DEV ? statusLine.slice(0, 500) : undefined,
    };
  }
  if (error instanceof Error) {
    return {
      message: (error.message || "Nieoczekiwany błąd.").slice(0, 500),
      detail: import.meta.env.DEV
        ? error.stack?.slice(0, 4000)
        : undefined,
    };
  }
  if (typeof error === "string" && error.length > 0) {
    return { message: error.slice(0, 500) };
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
        <Button
          type="button"
          aria-label="Odśwież stronę"
          onClick={() => window.location.reload()}
        >
          Odśwież
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label="Przejdź do Client"
          onClick={() => window.location.assign("/")}
        >
          Przejdź do Client
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Przejdź do Admin"
          onClick={() => window.location.assign("/admin")}
        >
          Przejdź do Admin
        </Button>
      </div>
      {detail ? <pre className={styles.detail}>{detail}</pre> : null}
    </main>
  );
}

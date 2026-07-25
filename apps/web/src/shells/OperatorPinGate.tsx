import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@stagesync/ui";
import {
  fetchOperatorPinRequired,
  getStoredOperatorPin,
  unlockOperatorPin,
} from "../lib/operatorPin.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";
import { useTransport } from "../transport/useTransport.js";
import styles from "./DeviceNameGate.module.css";

type Mode = "loading" | "open" | "unlocked";

/**
 * Blocks Admin / Timeline until Operator PIN is unlocked when
 * `STAGESYNC_OPERATOR_PIN` is configured on the host.
 * Client read-only shells should not wrap with this gate.
 */
export function OperatorPinGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { wsStatus, latencyMs } = useTransport();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const required = await fetchOperatorPinRequired();
        if (cancelled) return;
        if (!required) {
          setMode("unlocked");
          return;
        }
        if (getStoredOperatorPin()) {
          setMode("unlocked");
          return;
        }
        setMode("open");
      } catch {
        if (!cancelled) {
          // Fail-open to UI when status endpoint is unreachable — mutations
          // still get 403 from the host if PIN is set.
          setMode("unlocked");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await unlockOperatorPin(draft);
      setMode("unlocked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się odblokować");
    } finally {
      setPending(false);
    }
  }

  if (mode === "unlocked") {
    return children;
  }

  if (mode === "loading") {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Sprawdzanie ochrony hosta…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal
        aria-labelledby="operator-pin-title"
      >
        <div className={styles.modalConn}>
          <ConnectionIndicator status={wsStatus} latencyMs={latencyMs} />
        </div>
        <ConnectionLostBanner status={wsStatus} />
        <h1 id="operator-pin-title" className={styles.modalTitle}>
          PIN operatora
        </h1>
        <p className={styles.muted}>
          Host wymaga PIN-u do edycji projektu, setlisty i ustawień. Transport
          Play/Stop działa bez PIN-u.
        </p>
        <form className={styles.form} onSubmit={(e) => void onSubmit(e)}>
          <input
            className={styles.input}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={32}
            placeholder="PIN"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            aria-label="PIN operatora"
          />
          {error ? (
            <p className={styles.err} role="alert">
              {error}
            </p>
          ) : null}
          <Button variant="primary" type="submit" disabled={pending || !draft.trim()}>
            {pending ? "Sprawdzanie…" : "Odblokuj"}
          </Button>
        </form>
      </div>
    </div>
  );
}

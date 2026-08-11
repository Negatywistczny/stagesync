import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button, Input } from "@stagesync/ui";
import {
  fetchOperatorPinRequired,
  getStoredOperatorPin,
  unlockOperatorPin,
} from "@lib/shell-operator/operatorPin.js";
import {
  createOperatorPinIdleWatchdog,
  lockOperatorPinSession,
  shouldClearOperatorPinOnHide,
} from "@lib/shell-operator/operatorPinSession.js";
import { useKeepTileAboveIme } from "@lib/client/useKeepTileAboveIme.js";
import { ConnectionIndicator } from "../client/ConnectionIndicator.js";
import { ConnectionLostBanner } from "../client/ConnectionLostBanner.js";
import { useTransport } from "../../transport/useTransport.js";
import styles from "./DeviceNameGate.module.css";

type Mode = "loading" | "open" | "unlocked";

/**
 * Blocks Admin / Timeline until Operator PIN is unlocked when
 * `STAGESYNC_OPERATOR_PIN` is configured on the host.
 * Client read-only shells should not wrap with this gate.
 * ADR 0017 §8a: session does not expire during PLAYING; idle 15 min + hide lock outside show.
 */
export function OperatorPinGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { state, wsStatus, latencyMs } = useTransport();
  const playing = state.playing;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const syncPlayingRef = useRef<(() => void) | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useKeepTileAboveIme(pageRef, modalRef, mode === "open");

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

  useEffect(() => {
    if (mode !== "unlocked") {
      syncPlayingRef.current = null;
      return;
    }
    if (!getStoredOperatorPin()) return;

    const lock = () => {
      lockOperatorPinSession();
      setMode("open");
      setDraft("");
    };

    const watchdog = createOperatorPinIdleWatchdog({
      getPlaying: () => playingRef.current,
      onExpire: lock,
    });
    syncPlayingRef.current = () => watchdog.syncPlaying();
    watchdog.touch();
    watchdog.syncPlaying();

    const onActivity = () => watchdog.touch();
    const activityEvents = [
      "pointerdown",
      "keydown",
      "touchstart",
      "mousemove",
    ] as const;
    for (const ev of activityEvents) {
      window.addEventListener(ev, onActivity, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (shouldClearOperatorPinOnHide(playingRef.current)) lock();
      }
    };
    const onHide = () => {
      if (shouldClearOperatorPinOnHide(playingRef.current)) lock();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);

    return () => {
      syncPlayingRef.current = null;
      watchdog.dispose();
      for (const ev of activityEvents) {
        window.removeEventListener(ev, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, [mode]);

  useEffect(() => {
    syncPlayingRef.current?.();
  }, [playing]);

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
    <div ref={pageRef} className={styles.page}>
      <div
        ref={modalRef}
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
          <Input
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
          <Button
            variant="primary"
            type="submit"
            disabled={pending || !draft.trim()}
          >
            {pending ? "Sprawdzanie…" : "Odblokuj"}
          </Button>
        </form>
      </div>
    </div>
  );
}

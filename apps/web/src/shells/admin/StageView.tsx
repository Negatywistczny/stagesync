import { useState } from "react";
import { Button } from "@stagesync/ui";
import { sendStageMessage } from "../../lib/setlistApi.js";
import styles from "../AdminShell.module.css";

export function StageView() {
  const [text, setText] = useState("");
  const [ttlMs, setTtlMs] = useState(6000);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      await sendStageMessage({
        text: trimmed,
        ttlMs: ttlMs > 0 ? ttlMs : undefined,
      });
      setStatus("Wysłano.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wysyłka nieudana");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.twoUp}>
      <section className={styles.card} aria-label="Komunikat">
        <div className={styles.cardHead}>
          <div>
            <h1 className={styles.cardTitle}>Komunikat</h1>
            <p className={styles.cardHint}>Na ekrany klientów</p>
          </div>
        </div>
        <div className={styles.cardBody}>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {status ? <p className={styles.muted}>{status}</p> : null}
          <textarea
            className={styles.textarea}
            maxLength={200}
            placeholder="Treść…"
            value={text}
            disabled={pending}
            onChange={(e) => setText(e.target.value)}
          />
          <div className={styles.actions}>
            <select
              className={styles.select}
              value={String(ttlMs)}
              disabled={pending}
              onChange={(e) => setTtlMs(Number(e.target.value))}
            >
              <option value="6000">TTL 6 s</option>
              <option value="10000">10 s</option>
              <option value="0">∞ (UI)</option>
            </select>
            <Button
              variant="primary"
              disabled={pending || !text.trim()}
              loading={pending}
              onClick={() => void onSend()}
            >
              Wyślij
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setText("");
                setStatus(null);
              }}
            >
              Wyczyść
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.card} aria-label="Klienci">
        <div className={styles.cardHead}>
          <div>
            <h1 className={styles.cardTitle}>Klienci</h1>
            <p className={styles.cardHint}>Sieć i role</p>
          </div>
        </div>
        <div className={styles.cardBody}>
          <p className={styles.muted}>mDNS / IP — później</p>
          <p className={styles.muted}>Lista urządzeń i ról — shell.</p>
          <Button variant="ghost" disabled>
            Odśwież
          </Button>
        </div>
      </section>
    </div>
  );
}

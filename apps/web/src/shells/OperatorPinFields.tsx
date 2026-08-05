import { useEffect, useState, type FormEvent } from "react";
import { Button, Input } from "@stagesync/ui";
import {
  clearStoredOperatorPin,
  fetchOperatorPinRequired,
  getStoredOperatorPin,
  unlockOperatorPin,
} from "@lib/shell-operator/operatorPin.js";
import styles from "./DeviceNameFields.module.css";

/**
 * Optional unlock for Client when host has `STAGESYNC_OPERATOR_PIN`
 * (notes / form edit hit gated PUT /api/projects).
 */
export function OperatorPinFields() {
  const [required, setRequired] = useState(false);
  const [unlocked, setUnlocked] = useState(() => !!getStoredOperatorPin());
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchOperatorPinRequired()
      .then((on) => {
        if (!cancelled) setRequired(on);
      })
      .catch(() => {
        if (!cancelled) setRequired(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!required) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await unlockOperatorPin(draft);
      setUnlocked(true);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się odblokować");
    } finally {
      setPending(false);
    }
  }

  if (unlocked) {
    return (
      <div className={styles.wrap}>
        <p className={styles.lab}>PIN operatora</p>
        <div className={styles.row}>
          <span className={styles.ok}>Sesja odblokowana</span>
          <Button
            type="button"
            variant="secondary"
            aria-label="Zablokuj sesję PIN operatora"
            onClick={() => {
              clearStoredOperatorPin();
              setUnlocked(false);
            }}
          >
            Zablokuj
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.wrap} onSubmit={(e) => void onSubmit(e)}>
      <p className={styles.lab}>PIN operatora</p>
      <p className={styles.ok}>
        Wymagany do zapisu notatek i form. Podgląd bez PIN-u.
      </p>
      <Input
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={32}
        placeholder="PIN"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label="PIN operatora"
      />
      {error ? (
        <p className={styles.err} role="alert">
          {error}
        </p>
      ) : null}
      <Button variant="primary" type="submit" disabled={pending || !draft.trim()}>
        {pending ? "Sprawdzanie…" : "Odblokuj edycję"}
      </Button>
    </form>
  );
}

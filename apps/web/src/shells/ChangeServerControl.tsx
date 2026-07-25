import { useState, type FormEvent } from "react";
import { Button, Input } from "@stagesync/ui";
import {
  canChangeServer,
  requestNativeChangeServer,
} from "../lib/nativeShell.js";
import styles from "./ChangeServerControl.module.css";

/**
 * Secondary host-switch control for Client / Admin settings.
 * Native Android: returns to launcher. Browser: optional URL navigate (hidden by default until expanded).
 */
export function ChangeServerControl({
  entryPath = "/client",
}: {
  /** Path appended after origin when navigating in browser (`/client` or `/admin`). */
  entryPath?: "/client" | "/admin";
}) {
  const native = canChangeServer();
  const [open, setOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (native) {
    return (
      <div className={styles.wrap}>
        <p className={styles.lab}>Host</p>
        <Button
          type="button"
          variant="ghost"
          aria-label="Zmień serwer StageSync"
          onClick={() => {
            requestNativeChangeServer();
          }}
        >
          Zmień serwer
        </Button>
      </div>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const raw = urlDraft.trim();
    if (!raw) {
      setError("Podaj adres hosta");
      return;
    }
    try {
      const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
      const u = new URL(withScheme);
      if (!u.hostname) throw new Error("bad");
      window.location.assign(`${u.origin}${entryPath}`);
    } catch {
      setError("Niepoprawny adres");
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.lab}>Host</p>
      {!open ? (
        <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
          Dodaj serwer…
        </Button>
      ) : (
        <form className={styles.form} onSubmit={onSubmit}>
          <Input
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="http://192.168.x.x:4000"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            aria-label="Adres serwera StageSync"
          />
          <div className={styles.row}>
            <Button
              type="submit"
              variant="primary"
              aria-label="Połącz z hostem StageSync"
            >
              Połącz
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              Anuluj
            </Button>
          </div>
          {error ? (
            <p className={styles.err} role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}

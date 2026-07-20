import { useCallback, useEffect, useState } from "react";
import { Button } from "@stagesync/ui";
import {
  fetchStageClients,
  sendStageMessage,
  type PresenceClient,
} from "../../lib/setlistApi.js";
import styles from "../AdminShell.module.css";

const ROLE_OPTIONS = [
  { id: "karaoke", label: "Tekst" },
  { id: "grid", label: "Akordy" },
  { id: "score", label: "Partytura" },
  { id: "drums", label: "Forma" },
] as const;

type RoleId = (typeof ROLE_OPTIONS)[number]["id"];

export function StageView() {
  const [text, setText] = useState("");
  const [ttlMs, setTtlMs] = useState(6000);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleId[]>([]);
  const [clients, setClients] = useState<PresenceClient[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [clientsLoading, setClientsLoading] = useState(false);

  const refreshClients = useCallback(async () => {
    setClientsLoading(true);
    setClientsError(null);
    try {
      setClients(await fetchStageClients());
    } catch (err) {
      setClientsError(
        err instanceof Error ? err.message : "Nie udało się pobrać klientów",
      );
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshClients();
    const id = window.setInterval(() => void refreshClients(), 4000);
    return () => window.clearInterval(id);
  }, [refreshClients]);

  function toggleRole(id: RoleId) {
    setRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

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
        roles: roles.length > 0 ? roles : undefined,
      });
      setStatus(
        roles.length > 0
          ? `Wysłano do: ${roles.join(", ")}.`
          : "Wysłano do wszystkich.",
      );
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
          <p className={styles.muted}>Role (puste = wszyscy)</p>
          <div className={styles.chips}>
            {ROLE_OPTIONS.map((r) => {
              const on = roles.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  className={on ? styles.chipOn : styles.chip}
                  disabled={pending}
                  aria-pressed={on}
                  onClick={() => toggleRole(r.id)}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
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
          <Button
            variant="ghost"
            loading={clientsLoading}
            onClick={() => void refreshClients()}
          >
            Odśwież
          </Button>
        </div>
        <div className={styles.cardBody}>
          {clientsError ? (
            <p className={styles.error} role="alert">
              {clientsError}
            </p>
          ) : null}
          {clients.length === 0 ? (
            <p className={styles.muted}>Brak połączonych klientów.</p>
          ) : (
            <ul className={styles.list}>
              {clients.map((c) => (
                <li key={c.id} className={styles.songRow}>
                  <span className={styles.songName}>
                    {c.displayName ?? "Anonim"}
                  </span>
                  <span className={styles.songMeta}>
                    {c.roles.length > 0 ? c.roles.join(", ") : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

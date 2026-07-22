import { useCallback, useEffect, useRef, useState } from "react";
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

/** Match v4 `CLIENT_STALE_MS` — no fresh hello/latency within this window. */
const CLIENT_STALE_MS = 10_000;

type RoleId = (typeof ROLE_OPTIONS)[number]["id"];
type ClientPhase = "awaiting-data" | "awaiting-role" | "stale" | "ready";
type HeaderPresence = "online" | "empty" | "error";

function resolveClientPhase(
  client: PresenceClient,
  now = Date.now(),
): ClientPhase {
  if (now - client.updatedAt > CLIENT_STALE_MS) return "stale";
  if (!client.displayName && client.roles.length === 0) return "awaiting-data";
  if (client.roles.length === 0) return "awaiting-role";
  return "ready";
}

function presenceDotClass(phase: ClientPhase): string {
  if (phase === "ready") return styles.presenceDotOn ?? "";
  return styles.presenceDotPending ?? "";
}

function presenceTitle(phase: ClientPhase): string {
  switch (phase) {
    case "awaiting-data":
      return "Połączony — brak informacji od klienta";
    case "stale":
      return "Połączony — brak świeżych danych od klienta";
    case "awaiting-role":
      return "Połączony — oczekuje na wybór roli";
    default:
      return "Połączony — rola wybrana";
  }
}

export function StageView() {
  const [text, setText] = useState("");
  const [ttlMs, setTtlMs] = useState(6000);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
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
    if (!trimmed || pendingRef.current) return;
    pendingRef.current = true;
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
      pendingRef.current = false;
      setPending(false);
    }
  };

  const headerPresence: HeaderPresence = clientsError
    ? "error"
    : clients.length > 0
      ? "online"
      : "empty";
  const headerDotClass =
    headerPresence === "online"
      ? (styles.presenceDotOn ?? "")
      : headerPresence === "error"
        ? (styles.presenceDotPending ?? "")
        : (styles.presenceDotOff ?? "");
  const headerCountLabel =
    headerPresence === "online"
      ? clients.length === 1
        ? "1 online"
        : `${clients.length} online`
      : headerPresence === "error"
        ? "Błąd"
        : "Brak";
  const headerDotTitle =
    headerPresence === "online"
      ? `Połączono: ${clients.length}`
      : headerPresence === "error"
        ? "Problem z pobraniem listy klientów"
        : "Brak podłączonych klientów";

  return (
    <div className={[styles.twoUp, styles.twoUpStage].join(" ")}>
      <section className={styles.card} aria-label="Komunikat">
        <div className={styles.cardHead}>
          <h1 className={styles.cardTitle}>Komunikat</h1>
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
          <div className={styles.clientsHeadLead}>
            <span
              className={[styles.presenceDot, headerDotClass].join(" ")}
              title={headerDotTitle}
              aria-hidden
            />
            <h1 className={styles.cardTitle}>Klienci</h1>
            <span className={styles.clientsHeadCount}>{headerCountLabel}</span>
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
            <ul className={styles.list} aria-live="polite">
              {clients.map((c) => {
                const phase = resolveClientPhase(c);
                const title = presenceTitle(phase);
                const name =
                  phase === "awaiting-data"
                    ? "Łączenie…"
                    : (c.displayName ?? "Anonim");
                return (
                  <li
                    key={c.id}
                    className={[styles.songRow, styles.songRowPair].join(" ")}
                  >
                    <span className={styles.clientMain}>
                      <span
                        className={[
                          styles.presenceDot,
                          presenceDotClass(phase),
                        ].join(" ")}
                        title={title}
                        aria-label={title}
                      />
                      <span className={styles.songName}>{name}</span>
                    </span>
                    <span className={styles.songMeta}>
                      {[
                        phase === "awaiting-data"
                          ? "brak danych"
                          : phase === "stale"
                            ? "brak sygnału"
                            : c.roles.length > 0
                              ? c.roles.join(", ")
                              : "—",
                        phase === "ready" || phase === "awaiting-role"
                          ? c.latencyMs != null
                            ? `${c.latencyMs} ms`
                            : null
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

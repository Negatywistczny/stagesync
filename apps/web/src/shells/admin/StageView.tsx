import { useCallback, useEffect, useState } from "react";
import { MessageSquare, MonitorSmartphone } from "lucide-react";
import { Button, Select, Textarea } from "@stagesync/ui";
import {
  clearStageMessages,
  dismissStageMessage,
  fetchLiveDesk,
  fetchStageClients,
  fetchStageMessages,
  patchLiveDesk,
  sendStageMessage,
  type LiveDeskSettingsDto,
  type PresenceClient,
  type SessionStageMessage,
} from "../../lib/setlistApi.js";
import { useMqMobileCompact } from "../../lib/useMqMobileCompact.js";
import shell from "../AdminShell.module.css";
import { ShellSwitchRow } from "../ShellSwitchRow.js";
import { AdminAccordionCard } from "./AdminAccordionCard.js";
import styles from "./StageView.module.css";

type StageCardId = "korekta" | "messages" | "clients";

const ROLE_OPTIONS = [
  { id: "karaoke", label: "Tekst" },
  { id: "grid", label: "Akordy" },
  { id: "score", label: "Partytura" },
  { id: "drums", label: "Forma" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  karaoke: "Tekst",
  grid: "Akordy",
  score: "Partytura",
  drums: "Forma",
  timeline: "Timeline",
};

/** Match v4 `CLIENT_STALE_MS` — no fresh hello/latency within this window. */
const CLIENT_STALE_MS = 10_000;

type RoleId = (typeof ROLE_OPTIONS)[number]["id"];
type ClientPhase = "awaiting-data" | "awaiting-role" | "stale" | "ready";
type HeaderPresence = "online" | "empty" | "error";
type CuePriority = "normal" | "alert";

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
  if (phase === "ready") return shell.presenceDotOn ?? "";
  return shell.presenceDotPending ?? "";
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

function connectionStatusLabel(phase: ClientPhase): string {
  switch (phase) {
    case "awaiting-data":
      return "Łączenie";
    case "stale":
      return "Brak sygnału";
    case "awaiting-role":
      return "Bez roli";
    default:
      return "Online";
  }
}

function formatRoleLabels(roles: string[]): string {
  if (roles.length === 0) return "";
  return roles.map((role) => ROLE_LABELS[role] ?? role).join(", ");
}

function formatSessionRoles(roles: SessionStageMessage["roles"]): string {
  if (!roles || roles.length === 0) return "wszyscy";
  return formatRoleLabels(roles);
}

function formatExpiresAt(msg: SessionStageMessage): string {
  if (!msg.expiresAt) return "";
  const at = Date.parse(msg.expiresAt);
  if (!Number.isFinite(at)) return "";
  return ` · do ${new Date(at).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

export function StageView() {
  const [text, setText] = useState("");
  const [ttlMs, setTtlMs] = useState(6000);
  const [priority, setPriority] = useState<CuePriority>("normal");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleId[]>([]);
  const [messages, setMessages] = useState<SessionStageMessage[]>([]);
  const [clients, setClients] = useState<PresenceClient[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [liveDesk, setLiveDesk] = useState<LiveDeskSettingsDto | null>(null);
  const [liveDeskError, setLiveDeskError] = useState<string | null>(null);
  const [liveDeskSaving, setLiveDeskSaving] = useState(false);
  const compactMobile = useMqMobileCompact();
  const [openCard, setOpenCard] = useState<StageCardId>("messages");

  const refreshMessages = useCallback(async () => {
    try {
      setMessages(await fetchStageMessages());
    } catch {
      /* keep last known list; send/dismiss surfaces errors */
    }
  }, []);

  const refreshClients = useCallback(async () => {
    setClientsLoading(true);
    setClientsError(null);
    try {
      setClients(await fetchStageClients());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nie udało się pobrać klientów";
      setClientsError(message.slice(0, 500));
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshClients();
    void refreshMessages();
    const id = window.setInterval(() => {
      void refreshClients();
      void refreshMessages();
    }, 4000);
    return () => window.clearInterval(id);
  }, [refreshClients, refreshMessages]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const desk = await fetchLiveDesk();
        if (!cancelled) {
          setLiveDesk(desk);
          setLiveDeskError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLiveDeskError(
            err instanceof Error ? err.message : "Błąd Live Desk",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function applyLiveDesk(patch: Partial<LiveDeskSettingsDto>) {
    setLiveDeskSaving(true);
    setLiveDeskError(null);
    try {
      const next = await patchLiveDesk(patch);
      setLiveDesk(next);
    } catch (err) {
      setLiveDeskError(
        err instanceof Error ? err.message : "Nie udało się zapisać",
      );
    } finally {
      setLiveDeskSaving(false);
    }
  }

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
    try {
      const next = await sendStageMessage({
        text: trimmed,
        ttlMs,
        roles: roles.length > 0 ? roles : undefined,
        priority: priority === "alert" ? "alert" : undefined,
      });
      setMessages(next);
      setText("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Wysyłka nieudana";
      setError(message.slice(0, 500));
    } finally {
      setPending(false);
    }
  };

  const onDismiss = async (id: string) => {
    setPending(true);
    setError(null);
    try {
      setMessages(await dismissStageMessage(id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nie udało się usunąć";
      setError(message.slice(0, 500));
    } finally {
      setPending(false);
    }
  };

  const onClearAll = async () => {
    if (messages.length === 0) return;
    setPending(true);
    setError(null);
    try {
      await clearStageMessages();
      setMessages([]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nie udało się wyczyścić";
      setError(message.slice(0, 500));
    } finally {
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
      ? (shell.presenceDotOn ?? "")
      : headerPresence === "error"
        ? (shell.presenceDotPending ?? "")
        : (shell.presenceDotOff ?? "");
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
  const activeCountLabel =
    messages.length === 1 ? "1 aktywny" : `${messages.length} aktywnych`;

  const messagesCount = (
    <span
      className={[
        styles.sessionMsgCount,
        messages.length > 0 ? styles.sessionMsgCountOn : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {activeCountLabel}
    </span>
  );

  return (
    <div
      className={compactMobile ? shell.accordionStack : styles.root}
      data-admin-mobile={compactMobile ? "1" : undefined}
    >
      <AdminAccordionCard
        id="korekta"
        title="Korekta na scenie"
        titleAs="h1"
        ariaLabel="Korekta na scenie"
        mobile={compactMobile}
        openId={openCard}
        onOpen={setOpenCard}
        className={styles.masterBar}
        bodyClassName={styles.masterBarBody}
      >
          {liveDeskError ? (
            <p className={shell.error} role="alert">
              {liveDeskError}
            </p>
          ) : null}
          {!liveDesk ? (
            <p className={shell.muted}>Wczytywanie Live Desk…</p>
          ) : (
            <>
              <label className={styles.masterField}>
                Transpozycja zespołu (
                {liveDesk.transpositionSemitones > 0 ? "+" : ""}
                {liveDesk.transpositionSemitones} półtonów)
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={liveDesk.transpositionSemitones}
                  disabled={liveDeskSaving}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setLiveDesk({ ...liveDesk, transpositionSemitones: n });
                  }}
                  onMouseUp={() =>
                    void applyLiveDesk({
                      transpositionSemitones: liveDesk.transpositionSemitones,
                    })
                  }
                  onTouchEnd={() =>
                    void applyLiveDesk({
                      transpositionSemitones: liveDesk.transpositionSemitones,
                    })
                  }
                  onKeyUp={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                      void applyLiveDesk({
                        transpositionSemitones: liveDesk.transpositionSemitones,
                      });
                    }
                  }}
                />
              </label>
              <label className={styles.masterField}>
                Kompensacja sieci (
                {liveDesk.syncLeadMs > 0 ? "+" : ""}
                {liveDesk.syncLeadMs} ms)
                <input
                  type="range"
                  min={-500}
                  max={500}
                  step={25}
                  value={liveDesk.syncLeadMs}
                  disabled={liveDeskSaving}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setLiveDesk({ ...liveDesk, syncLeadMs: n });
                  }}
                  onMouseUp={() =>
                    void applyLiveDesk({ syncLeadMs: liveDesk.syncLeadMs })
                  }
                  onTouchEnd={() =>
                    void applyLiveDesk({ syncLeadMs: liveDesk.syncLeadMs })
                  }
                  onKeyUp={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                      void applyLiveDesk({ syncLeadMs: liveDesk.syncLeadMs });
                    }
                  }}
                />
              </label>
              <div className={styles.masterSwitches}>
                <ShellSwitchRow
                  className={styles.masterSwitch}
                  checked={liveDesk.clientEditEnabled}
                  disabled={liveDeskSaving}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setLiveDesk({ ...liveDesk, clientEditEnabled: on });
                    void applyLiveDesk({ clientEditEnabled: on });
                  }}
                >
                  Edycja zdalna (notatki Formy / tap wokalu)
                </ShellSwitchRow>
              </div>
            </>
          )}
      </AdminAccordionCard>

      <div className={compactMobile ? shell.accordionFlatten : styles.bottom}>
        <AdminAccordionCard
          id="messages"
          title="Komunikaty"
          titleAs="h1"
          ariaLabel="Komunikaty"
          mobile={compactMobile}
          openId={openCard}
          onOpen={setOpenCard}
          className={styles.panel}
          headMeta={messagesCount}
          bodyClassName={[
            shell.cardBody,
            shell.cardBodyFill,
            styles.messagesBody,
          ].join(" ")}
        >
            {error ? (
              <p className={shell.error} role="alert">
                {error}
              </p>
            ) : null}

            <div className={styles.compose}>
              <Textarea
                maxLength={200}
                placeholder="Treść komunikatu na scenę…"
                value={text}
                disabled={pending}
                onChange={(e) => setText(e.target.value)}
                aria-label="Treść komunikatu"
              />

              <div className={styles.composeOptions}>
                <p className={styles.optionsLabel}>Role (puste = wszyscy)</p>
                <div className={shell.chips}>
                  {ROLE_OPTIONS.map((r) => {
                    const on = roles.includes(r.id);
                    return (
                      <Button
                        key={r.id}
                        variant="ghost"
                        selected={on}
                        disabled={pending}
                        onClick={() => toggleRole(r.id)}
                      >
                        {r.label}
                      </Button>
                    );
                  })}
                </div>

                <div className={styles.composeMeta}>
                  <div className={styles.composeSecondary}>
                    <Button
                      variant="ghost"
                      selected={priority === "alert"}
                      disabled={pending}
                      title={
                        priority === "alert"
                          ? "Priorytet: alert (wyłącz)"
                          : "Priorytet: normalny (włącz alert)"
                      }
                      aria-label={
                        priority === "alert"
                          ? "Priorytet: alert (wyłącz)"
                          : "Priorytet: normalny (włącz alert)"
                      }
                      onClick={() =>
                        setPriority((p) =>
                          p === "alert" ? "normal" : "alert",
                        )
                      }
                    >
                      Alert
                    </Button>
                    <label className={styles.ttlField}>
                      <span className={styles.optionsLabel}>Czas</span>
                      <Select
                        value={String(ttlMs)}
                        disabled={pending}
                        aria-label="Czas wyświetlania komunikatu"
                        onChange={(e) => setTtlMs(Number(e.target.value))}
                      >
                        <option value="6000">6 s</option>
                        <option value="10000">10 s</option>
                        <option value="15000">15 s</option>
                        <option value="30000">30 s</option>
                        <option value="0">∞</option>
                      </Select>
                    </label>
                  </div>
                  <div className={styles.composePrimary}>
                    <Button
                      variant="ghost"
                      disabled={pending || !text}
                      onClick={() => setText("")}
                    >
                      Wyczyść
                    </Button>
                    <Button
                      variant="primary"
                      disabled={pending || !text.trim()}
                      loading={pending}
                      onClick={() => void onSend()}
                    >
                      Wyślij
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.sessionMsgListHead}>
              <span className={styles.listSectionLabel}>Aktywne</span>
              {messages.length > 0 ? (
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => void onClearAll()}
                >
                  Wyczyść wszystkie
                </Button>
              ) : null}
            </div>

            {messages.length === 0 ? (
              <div className={styles.emptyState} role="status" aria-live="polite">
                <span className={styles.emptyIcon} aria-hidden>
                  <MessageSquare size={20} strokeWidth={2} />
                </span>
                <p className={styles.emptyTitle}>Brak aktywnych komunikatów</p>
                <p className={styles.emptyText}>
                  Napisz treść powyżej, wybierz role i czas, potem wyślij na
                  scenę — komunikat pojawi się tu i na Clientach.
                </p>
              </div>
            ) : (
              <ul className={styles.sessionMsgList} aria-live="polite">
                {messages.map((msg) => {
                  const isAlert = msg.priority === "alert";
                  return (
                    <li
                      key={msg.id}
                      className={[
                        styles.sessionMsgRow,
                        isAlert ? styles.sessionMsgRowAlert : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className={styles.sessionMsgMain}>
                        <span className={styles.sessionMsgText}>
                          {msg.text}
                        </span>
                        <span className={styles.sessionMsgMeta}>
                          {formatSessionRoles(msg.roles)}
                          {isAlert ? " · alert" : " · normalny"}
                          {formatExpiresAt(msg)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        disabled={pending}
                        title="Usuń komunikat"
                        aria-label={`Usuń komunikat: ${msg.text.trim().slice(0, 40) || "bez treści"}`}
                        onClick={() => void onDismiss(msg.id)}
                      >
                        Usuń
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
        </AdminAccordionCard>

        <AdminAccordionCard
          id="clients"
          title="Klienci"
          titleAs="h1"
          ariaLabel="Klienci"
          mobile={compactMobile}
          openId={openCard}
          onOpen={setOpenCard}
          className={styles.panel}
          headMeta={
            <span className={shell.clientsHeadCount}>{headerCountLabel}</span>
          }
          desktopHead={
            <div className={shell.clientsHeadLead}>
              <span
                className={[shell.presenceDot, headerDotClass].join(" ")}
                title={headerDotTitle}
                aria-label={headerDotTitle}
                role="img"
              />
              <h1 className={shell.cardTitle}>Klienci</h1>
              <span className={shell.clientsHeadCount}>{headerCountLabel}</span>
            </div>
          }
          headActions={
            <Button
              variant="ghost"
              loading={clientsLoading}
              onClick={() => void refreshClients()}
            >
              Odśwież
            </Button>
          }
          bodyClassName={[
            shell.cardBody,
            shell.cardBodyFill,
            styles.clientsBody,
          ].join(" ")}
        >
            {clientsError ? (
              <p className={shell.error} role="alert">
                {clientsError}
              </p>
            ) : null}
            {clients.length === 0 ? (
              <div className={styles.emptyState} role="status" aria-live="polite">
                <span className={styles.emptyIcon} aria-hidden>
                  <MonitorSmartphone size={20} strokeWidth={2} />
                </span>
                <p className={styles.emptyTitle}>Brak połączonych klientów</p>
                <p className={styles.emptyText}>
                  Otwórz Client na tablecie lub telefonie muzyków — urządzenie
                  pojawi się tu z nazwą, rolą i statusem połączenia.
                </p>
              </div>
            ) : (
              <ul className={styles.clientList} aria-live="polite">
                {clients.map((c) => {
                  const phase = resolveClientPhase(c);
                  const title = presenceTitle(phase);
                  const name =
                    phase === "awaiting-data"
                      ? "Łączenie…"
                      : (c.displayName ?? "Anonim");
                  const roleLabel = formatRoleLabels(c.roles);
                  const statusLabel = connectionStatusLabel(phase);
                  const latencyLabel =
                    phase === "ready" || phase === "awaiting-role"
                      ? c.latencyMs != null
                        ? `${c.latencyMs} ms`
                        : null
                      : null;
                  return (
                    <li key={c.id} className={styles.clientTile}>
                      <span
                        className={[
                          shell.presenceDot,
                          presenceDotClass(phase),
                        ].join(" ")}
                        title={title}
                        aria-label={title}
                      />
                      <div className={styles.clientBody}>
                        <span className={styles.clientName}>{name}</span>
                        <span className={styles.clientMeta}>
                          {[
                            roleLabel ||
                              (phase === "awaiting-data"
                                ? "brak danych"
                                : phase === "awaiting-role"
                                  ? "—"
                                  : null),
                            statusLabel,
                            latencyLabel,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
        </AdminAccordionCard>
      </div>
    </div>
  );
}

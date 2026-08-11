import { useCallback, useEffect, useState } from "react";
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
} from "@lib/shell-operator/setlistApi.js";
import { useMqMobileCompact } from "@lib/client/useMqMobileCompact.js";
import shell from "./AdminShell.module.css";
import styles from "./StageView.module.css";
import { LiveDeskCard } from "./stage/LiveDeskCard.js";
import { StageClientsCard } from "./stage/StageClientsCard.js";
import { StageMessagesCard } from "./stage/StageMessagesCard.js";
import {
  type CuePriority,
  type HeaderPresence,
  type RoleId,
  type StageCardId,
} from "./stagePresence.js";

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
      const message = err instanceof Error ? err.message : "Wysyłka nieudana";
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
      <LiveDeskCard
        compactMobile={compactMobile}
        openCard={openCard}
        onOpen={setOpenCard}
        liveDesk={liveDesk}
        liveDeskError={liveDeskError}
        liveDeskSaving={liveDeskSaving}
        applyLiveDesk={applyLiveDesk}
        setLiveDesk={setLiveDesk}
      />

      <div className={compactMobile ? shell.accordionFlatten : styles.bottom}>
        <StageMessagesCard
          compactMobile={compactMobile}
          openCard={openCard}
          onOpen={setOpenCard}
          messagesCount={messagesCount}
          error={error}
          text={text}
          setText={setText}
          pending={pending}
          roles={roles}
          toggleRole={toggleRole}
          priority={priority}
          setPriority={setPriority}
          ttlMs={ttlMs}
          setTtlMs={setTtlMs}
          onSend={onSend}
          messages={messages}
          onClear={onClearAll}
          onDismiss={onDismiss}
        />

        <StageClientsCard
          compactMobile={compactMobile}
          openCard={openCard}
          onOpen={setOpenCard}
          headerCountLabel={headerCountLabel}
          headerDotClass={headerDotClass}
          headerDotTitle={headerDotTitle}
          clientsLoading={clientsLoading}
          refreshClients={refreshClients}
          clientsError={clientsError}
          clients={clients}
        />
      </div>
    </div>
  );
}

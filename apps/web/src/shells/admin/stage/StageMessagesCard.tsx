import type { Dispatch, ReactNode, SetStateAction } from "react";
import { MessageSquare } from "lucide-react";
import { Button, Select, Textarea } from "@stagesync/ui";
import type { SessionStageMessage } from "@lib/shell-operator/setlistApi.js";
import shell from "../../AdminShell.module.css";
import { AdminAccordionCard } from "../AdminAccordionCard.js";
import styles from "../StageView.module.css";
import {
  ROLE_OPTIONS,
  formatExpiresAt,
  formatSessionRoles,
  type CuePriority,
  type RoleId,
  type StageCardId,
} from "../stagePresence.js";

export function StageMessagesCard({
  compactMobile,
  openCard,
  onOpen,
  messagesCount,
  error,
  text,
  setText,
  pending,
  roles,
  toggleRole,
  priority,
  setPriority,
  ttlMs,
  setTtlMs,
  onSend,
  messages,
  onClear,
  onDismiss,
}: {
  compactMobile: boolean;
  openCard: StageCardId;
  onOpen: (id: StageCardId) => void;
  messagesCount: ReactNode;
  error: string | null;
  text: string;
  setText: (v: string) => void;
  pending: boolean;
  roles: RoleId[];
  toggleRole: (id: RoleId) => void;
  priority: CuePriority;
  setPriority: Dispatch<SetStateAction<CuePriority>>;
  ttlMs: number;
  setTtlMs: (v: number) => void;
  onSend: () => void | Promise<void>;
  messages: SessionStageMessage[];
  onClear: () => void | Promise<void>;
  onDismiss: (id: string) => void | Promise<void>;
}) {
  return (
        <AdminAccordionCard
          id="messages"
          title="Komunikaty"
          titleAs="h1"
          ariaLabel="Komunikaty"
          mobile={compactMobile}
          openId={openCard}
          onOpen={onOpen}
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
                      setPriority((p) => (p === "alert" ? "normal" : "alert"))
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
                onClick={() => void onClear()}
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
                Napisz treść powyżej, wybierz role i czas, potem wyślij na scenę
                — komunikat pojawi się tu i na Clientach.
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
                      <span className={styles.sessionMsgText}>{msg.text}</span>
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
  );
}

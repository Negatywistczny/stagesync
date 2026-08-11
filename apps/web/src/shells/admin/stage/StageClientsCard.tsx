import { MonitorSmartphone } from "lucide-react";
import { Button } from "@stagesync/ui";
import type { PresenceClient } from "@lib/shell-operator/setlistApi.js";
import shell from "../AdminShell.module.css";
import { AdminAccordionCard } from "../AdminAccordionCard.js";
import styles from "../StageView.module.css";
import {
  connectionStatusLabel,
  formatRoleLabels,
  presenceDotClass,
  presenceTitle,
  resolveClientPhase,
  type StageCardId,
} from "../stagePresence.js";

export function StageClientsCard({
  compactMobile,
  openCard,
  onOpen,
  headerCountLabel,
  headerDotClass,
  headerDotTitle,
  clientsLoading,
  refreshClients,
  clientsError,
  clients,
}: {
  compactMobile: boolean;
  openCard: StageCardId;
  onOpen: (id: StageCardId) => void;
  headerCountLabel: string;
  headerDotClass: string;
  headerDotTitle: string;
  clientsLoading: boolean;
  refreshClients: () => void | Promise<void>;
  clientsError: string | null;
  clients: PresenceClient[];
}) {
  return (
    <AdminAccordionCard
      id="clients"
      title="Klienci"
      titleAs="h1"
      ariaLabel="Klienci"
      mobile={compactMobile}
      openId={openCard}
      onOpen={onOpen}
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
            Otwórz Client na tablecie lub telefonie muzyków — urządzenie pojawi
            się tu z nazwą, rolą i statusem połączenia.
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
                  className={[shell.presenceDot, presenceDotClass(phase)].join(
                    " ",
                  )}
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
  );
}

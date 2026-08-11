import type { ReactNode } from "react";
import { Button } from "@stagesync/ui";
import type { WsStatus } from "../../transport/transportContext.js";
import { ConnectionLostBanner } from "../ConnectionLostBanner.js";
import { ShellIconButton } from "../ShellIconButton.js";
import { ShellWordmark } from "../ShellWordmark.js";
import { IconPencil } from "../icons.js";
import styles from "../ClientShell.module.css";
import { CLIENT_ROLES, type ClientRoleId } from "./clientRoles.js";

export function ClientWelcome({
  wsStatus,
  isCompactMobile,
  name,
  picked,
  onRoleTileClick,
  onEditName,
  onStart,
  chrome,
}: {
  wsStatus: WsStatus;
  isCompactMobile: boolean;
  name: string;
  picked: ClientRoleId[];
  onRoleTileClick: (id: ClientRoleId) => void;
  onEditName: () => void;
  onStart: () => void;
  chrome: ReactNode;
}) {
  return (
    <div className={styles.page}>
      {chrome}
      <ConnectionLostBanner status={wsStatus} />
      <main
        className={[styles.welcome, isCompactMobile ? styles.welcomeMobile : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.welcomeHero}>
          <ShellWordmark className={styles.welcomeBrand} />
          <div className={styles.greetingRow}>
            <p className={styles.greeting}>Cześć, {name}</p>
            <ShellIconButton label="Zmień nazwę" onClick={onEditName}>
              <IconPencil />
            </ShellIconButton>
          </div>
          <h1 className={styles.welcomeTitle}>
            Wybierz <span className={styles.welcomeAccent}>rolę</span>
          </h1>
        </div>

        <div className={styles.roleGrid}>
          {CLIENT_ROLES.map((r) => {
            const on = picked.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                className={[styles.roleTile, on ? styles.roleOn : ""]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={isCompactMobile ? undefined : on}
                onClick={() => onRoleTileClick(r.id)}
              >
                <span className={styles.roleIcon} aria-hidden>
                  {r.icon}
                </span>
                <strong className={styles.roleLabel}>{r.label}</strong>
              </button>
            );
          })}
        </div>

        {!isCompactMobile ? (
          <div className={styles.startBar}>
            <Button
              variant="primary"
              className={styles.startBarBtn}
              disabled={picked.length === 0}
              onClick={onStart}
            >
              {picked.length === 2 ? "Rozpocznij widok dzielony" : "Rozpocznij"}
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

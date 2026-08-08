/**
 * Shared USDB host-account panel for UltraStar / US+UG import wizards.
 */

import { useEffect, useRef, useState } from "react";
import { Button, Input } from "@stagesync/ui";
import {
  fetchUltrastarAccount,
  putUltrastarAccount,
  testUltrastarAccount,
} from "@lib/shell-operator/ultrastarImportApi.js";
import styles from "./UsdbAccountPanel.module.css";

export function shouldOpenUsdbAccount(message: string): boolean {
  return /Brak konta USDB|Konto USDB|Sesja USDB|odnowić sesji USDB|zaloguj|Nieprawidłowe dane logowania|dane konta|ogranicza logowanie|nie udało się połączyć z USDB/i.test(
    message,
  );
}

export type UsdbAccountStatusInfo = {
  configured: boolean;
  user: string;
  loaded: boolean;
};

export type UsdbAccountPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onStatusChange?: (status: UsdbAccountStatusInfo) => void;
  /** When false, only the panel body is shown (no Konto USDB toggle). */
  showToggle?: boolean;
};

export function UsdbAccountPanel({
  open,
  onOpenChange,
  disabled = false,
  onBusyChange,
  onStatusChange,
  showToggle = true,
}: UsdbAccountPanelProps) {
  const [accountUser, setAccountUser] = useState("");
  const [accountPass, setAccountPass] = useState("");
  const [accountConfigured, setAccountConfigured] = useState(false);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountLoaded, setAccountLoaded] = useState(false);

  const onBusyChangeRef = useRef(onBusyChange);
  const onStatusChangeRef = useRef(onStatusChange);
  onBusyChangeRef.current = onBusyChange;
  onStatusChangeRef.current = onStatusChange;

  const locked = disabled || accountBusy;

  useEffect(() => {
    onBusyChangeRef.current?.(accountBusy);
  }, [accountBusy]);

  useEffect(() => {
    onStatusChangeRef.current?.({
      configured: accountConfigured,
      user: accountUser,
      loaded: accountLoaded,
    });
  }, [accountConfigured, accountUser, accountLoaded]);

  useEffect(() => {
    let cancelled = false;
    void fetchUltrastarAccount()
      .then((status) => {
        if (cancelled) return;
        setAccountConfigured(status.configured);
        setAccountUser(status.user);
        setAccountLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAccountLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSaveAccount() {
    setAccountStatus(null);
    setAccountBusy(true);
    try {
      const saved = await putUltrastarAccount(
        accountUser,
        accountPass.trim() ? accountPass : undefined,
      );
      setAccountConfigured(saved.configured);
      setAccountUser(saved.user);
      setAccountPass("");
      setAccountStatus(saved.message ?? "Zapisano konto USDB.");
    } catch (err) {
      setAccountStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setAccountBusy(false);
    }
  }

  async function onTestAccount() {
    setAccountStatus(null);
    setAccountBusy(true);
    try {
      const result = await testUltrastarAccount(
        accountUser.trim() || undefined,
        accountPass.trim() || undefined,
      );
      setAccountStatus(result.message);
    } catch (err) {
      setAccountStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setAccountBusy(false);
    }
  }

  async function onClearAccount() {
    setAccountStatus(null);
    setAccountBusy(true);
    try {
      const saved = await putUltrastarAccount("", "");
      setAccountConfigured(saved.configured);
      setAccountUser("");
      setAccountPass("");
      setAccountStatus(saved.message ?? "Usunięto konto USDB.");
    } catch (err) {
      setAccountStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setAccountBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {showToggle ? (
        <div className={styles.toggleRow}>
          <Button
            variant="ghost"
            disabled={disabled}
            onClick={() => onOpenChange(!open)}
          >
            {open ? "Ukryj konto USDB" : "Konto USDB"}
          </Button>
        </div>
      ) : null}

      {open ? (
        <div className={styles.panel} data-testid="ultrastar-usdb-account">
          <p className={styles.title}>Konto USDB (host)</p>
          <p className={styles.status}>
            Darmowe konto na{" "}
            <a
              href="https://usdb.animux.de"
              target="_blank"
              rel="noreferrer"
            >
              usdb.animux.de
            </a>
            . Dane zapisują się na serwerze (wszyscy klienci tego hosta).
          </p>
          <label className={styles.field}>
            <span>Użytkownik</span>
            <Input
              type="text"
              autoComplete="username"
              value={accountUser}
              aria-label="Użytkownik USDB"
              disabled={locked}
              onChange={(e) => setAccountUser(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Hasło</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={accountPass}
              aria-label="Hasło USDB"
              placeholder={
                accountConfigured
                  ? "Zostaw puste, aby nie zmieniać"
                  : undefined
              }
              disabled={locked}
              onChange={(e) => setAccountPass(e.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              disabled={locked || (!accountUser.trim() && !accountConfigured)}
              loading={accountBusy}
              onClick={() => void onSaveAccount()}
            >
              Zapisz
            </Button>
            <Button
              variant="ghost"
              disabled={
                locked ||
                (!accountConfigured &&
                  (!accountUser.trim() || !accountPass.trim()))
              }
              onClick={() => void onTestAccount()}
            >
              Testuj połączenie
            </Button>
            {accountConfigured ? (
              <Button
                variant="ghost"
                disabled={locked}
                onClick={() => void onClearAccount()}
              >
                Usuń
              </Button>
            ) : null}
          </div>
          {accountStatus ? (
            <p className={styles.status} role="status">
              {accountStatus}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

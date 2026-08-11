import { useCallback, useEffect, useState } from "react";
import { Button } from "@stagesync/ui";
import {
  fetchHostUpdateStatus,
  postApplyHostUpdate,
  type HostUpdateStatus,
} from "@lib/shell-operator/setlistApi.js";
import {
  canUseDesktopUpdater,
  checkDesktopUpdate,
  installDesktopUpdate,
  openExternalUrl,
  formatUnknownError,
  type DesktopUpdateInfo,
} from "@lib/client/desktopBridge.js";
import {
  DOCS_INSTALL_URL,
  DOCS_ISSUES_URL,
  DOCS_RELEASES_URL,
} from "@lib/client/docsLinks.js";
import { APP_VERSION } from "@lib/client/appVersion.js";
import {
  fetchAndroidLatestManifest,
  isSemverNewer,
} from "@lib/client/androidLatest.js";
import { isAndroidUpdateSurface } from "@lib/client/nativeShell.js";
import { ShellConfirmDialog } from "../../components/ShellBlockingDialog.js";
import shell from "../AdminShell.module.css";
import styles from "../SystemView.module.css";

/** Update panel — Sprawdź / Aktualizuj host + desktop (ADR 0004 amendement β1). */
export function UpdatePanel({
  autoCheck = false,
  onAutoCheckConsumed,
}: {
  autoCheck?: boolean;
  onAutoCheckConsumed?: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [hostStatus, setHostStatus] = useState<HostUpdateStatus | null>(null);
  const [desktopStatus, setDesktopStatus] = useState<DesktopUpdateInfo | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [confirmHostUpdate, setConfirmHostUpdate] = useState(false);
  const [confirmDesktopUpdate, setConfirmDesktopUpdate] = useState(false);
  // Require real Tauri IPC — Android Console on :4000 matches isDesktopShell() without invoke.
  const inTauri = canUseDesktopUpdater();
  const onAndroid = isAndroidUpdateSurface();

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setError(null);
    setHostStatus(null);
    setDesktopStatus(null);
    setDone(false);
    try {
      // Desktop: only the app version / Tauri updater — host/Watchtower is Docker-only.
      if (inTauri) {
        try {
          setDesktopStatus(await checkDesktopUpdate());
        } catch (e) {
          setError(`Aplikacja: ${formatUnknownError(e)}`);
        }
        return;
      }
      // Android Console / Android UA: compare shell to GitHub android-latest.json.
      if (onAndroid) {
        const manifest = await fetchAndroidLatestManifest();
        if (!manifest) {
          setHostStatus({
            current: APP_VERSION,
            latest: null,
            updateAvailable: false,
            applyAvailable: false,
            error:
              "Nie udało się sprawdzić Releases (sieć / brak android-latest.json).",
            updateMode: "apk",
            apkUrl: null,
          });
          return;
        }
        const available = isSemverNewer(manifest.version, APP_VERSION);
        setHostStatus({
          current: APP_VERSION,
          latest: manifest.version,
          updateAvailable: available,
          applyAvailable: false,
          error: null,
          updateMode: "apk",
          apkUrl: available ? manifest.consoleUrl : null,
        });
        return;
      }
      try {
        const host = await fetchHostUpdateStatus();
        setHostStatus(host);
        if (host.error) setError(`Host: ${host.error}`);
      } catch (e) {
        setError(`Host: ${formatUnknownError(e)}`);
      }
    } finally {
      setChecking(false);
    }
  }, [inTauri, onAndroid]);

  useEffect(() => {
    if (!autoCheck) return;
    let cancelled = false;
    void handleCheck().finally(() => {
      if (!cancelled) onAutoCheckConsumed?.();
    });
    return () => {
      cancelled = true;
    };
    // Intentional: run once when native menu requests a check (autoCheck rising edge).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onAutoCheckConsumed is unstable identity from parent
  }, [autoCheck, handleCheck]);

  const handleApplyHost = useCallback(async () => {
    setApplying(true);
    setError(null);
    try {
      await postApplyHostUpdate();
      setDone(true);
    } catch (e) {
      setError(formatUnknownError(e));
    } finally {
      setApplying(false);
    }
  }, []);

  const handleApplyDesktop = useCallback(async () => {
    setApplying(true);
    setError(null);
    try {
      await installDesktopUpdate();
    } catch (e) {
      setError(formatUnknownError(e));
      setApplying(false);
    }
  }, []);

  return (
    <div className={styles.updateBlock}>
      <div className={styles.updateRow}>
        <Button
          variant="secondary"
          onClick={handleCheck}
          disabled={checking || applying}
        >
          {checking ? "Sprawdzam…" : "Sprawdź aktualizacje"}
        </Button>
        <span className={shell.muted}>Kanał: oficjalne</span>
      </div>
      {error ? (
        <p className={styles.updateError} role="alert">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className={shell.muted}>
          Aktualizacja hosta uruchomiona — połączenie wróci za chwilę.
        </p>
      ) : null}
      {!inTauri && hostStatus && !onAndroid ? (
        <div className={styles.updateRow}>
          <span className={shell.muted}>
            Host: {hostStatus.current}
            {hostStatus.latest ? ` → ${hostStatus.latest}` : ""}{" "}
            {!hostStatus.updateAvailable && hostStatus.latest
              ? "(aktualny)"
              : null}
          </span>
          {hostStatus.updateAvailable && hostStatus.applyAvailable ? (
            <Button
              variant="primary"
              onClick={() => setConfirmHostUpdate(true)}
              disabled={applying}
            >
              {applying ? "Aktualizuję…" : "Aktualizuj host"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {!inTauri &&
      !onAndroid &&
      hostStatus?.updateAvailable &&
      hostStatus.applyAvailable === false ? (
        <p className={shell.muted}>
          Nowa wersja jest dostępna, ale ten host nie ma Watchtower (
          <code>STAGESYNC_UPDATER_*</code>). Docker:{" "}
          <code>compose.prod.yml</code>. Desktop / lokalnie: pobierz instalator
          z{" "}
          <a
            href={DOCS_RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              e.preventDefault();
              void openExternalUrl(DOCS_RELEASES_URL);
            }}
          >
            Releases
          </a>
          .
        </p>
      ) : null}
      {onAndroid && hostStatus ? (
        <div className={styles.updateRow}>
          <span className={shell.muted}>
            Console: v{hostStatus.current}
            {hostStatus.latest ? ` → ${hostStatus.latest}` : ""}
            {!hostStatus.updateAvailable && hostStatus.latest
              ? " (aktualna)"
              : null}
          </span>
          {hostStatus.updateAvailable && hostStatus.apkUrl ? (
            <Button
              variant="primary"
              onClick={() => {
                void openExternalUrl(hostStatus.apkUrl!);
              }}
            >
              Pobierz APK
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                void openExternalUrl(DOCS_RELEASES_URL);
              }}
            >
              Releases
            </Button>
          )}
        </div>
      ) : null}
      {inTauri && desktopStatus ? (
        <div className={styles.updateRow}>
          <span className={shell.muted}>
            {desktopStatus.available ? (
              <>
                Aplikacja: {desktopStatus.current} →{" "}
                {desktopStatus.version ?? "?"}
              </>
            ) : (
              <>Aplikacja: {desktopStatus.current} (aktualna)</>
            )}
          </span>
          {desktopStatus.available ? (
            <Button
              variant="primary"
              onClick={() => setConfirmDesktopUpdate(true)}
              disabled={applying}
            >
              {applying ? "Aktualizuję…" : "Aktualizuj aplikację"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {!inTauri &&
      !onAndroid &&
      hostStatus &&
      !(hostStatus.updateAvailable && hostStatus.applyAvailable === false) ? (
        <p className={shell.muted}>
          Desktop: pobierz instalator z{" "}
          <a
            href={DOCS_RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              e.preventDefault();
              void openExternalUrl(DOCS_RELEASES_URL);
            }}
          >
            Releases
          </a>
          .
        </p>
      ) : null}
      <ShellConfirmDialog
        open={confirmHostUpdate}
        title="Aktualizacja hosta"
        message="Aktualizacja hosta spowoduje ~30s przerwę połączenia WS. Kontynuować?"
        confirmLabel="Aktualizuj"
        onConfirm={() => {
          setConfirmHostUpdate(false);
          void handleApplyHost();
        }}
        onCancel={() => setConfirmHostUpdate(false)}
      />
      <ShellConfirmDialog
        open={confirmDesktopUpdate}
        title="Aktualizacja aplikacji"
        message="StageSync zostanie uruchomiony ponownie po aktualizacji. Zapisz niezapisane zmiany w projekcie przed kontynuacją. Kontynuować?"
        confirmLabel="Aktualizuj"
        onConfirm={() => {
          setConfirmDesktopUpdate(false);
          void handleApplyDesktop();
        }}
        onCancel={() => setConfirmDesktopUpdate(false)}
      />
    </div>
  );
}

import { Button, Input, Select } from "@stagesync/ui";
import { browseServerPath, type BrowseResult, type ServerSettingsValues, type ServerSettingsResponse } from "@lib/shell-operator/setlistApi.js";
import styles from "../../ServerSettingsModal.module.css";

interface ServerSettingsTabProps {
  restartNote: string | null;
  server: ServerSettingsValues | null;
  onServerChange: (server: ServerSettingsValues) => void;
  serverMeta: ServerSettingsResponse | null;
  browseField: string | null;
  onBrowseFieldChange: (field: string | null) => void;
  browseData: BrowseResult | null;
  onBrowseDataChange: (data: BrowseResult | null) => void;
  restoreMsg: string | null;
  onRestoreMsgChange: (msg: string | null) => void;
  restoreBusy: boolean;
  onRestoreClick: () => void;
  onBrowseUp: () => void;
  onBrowseSelect: () => void;
  isRestoreBrowse: boolean;
  restoreSelectedCount: number;
  onRestoreSelectedClick: () => void;
  onRestoreDirClick: () => void;
  onBrowseCancel: () => void;
  renderBrowseEntry: (e: { path: string; name: string; type: "file" | "dir" }) => React.ReactNode;
}

export function ServerSettingsTab({
  restartNote,
  server,
  onServerChange,
  serverMeta,
  browseField,
  onBrowseFieldChange,
  browseData,
  onBrowseDataChange,
  restoreMsg,
  onRestoreMsgChange,
  restoreBusy,
  onRestoreClick,
  onBrowseUp,
  onBrowseSelect,
  isRestoreBrowse,
  restoreSelectedCount,
  onRestoreSelectedClick,
  onRestoreDirClick,
  onBrowseCancel,
  renderBrowseEntry,
}: ServerSettingsTabProps) {
  if (!server) {
    return (
      <div className={styles.body} role="tabpanel">
        <p className={styles.muted}>Wczytywanie ustawień serwera…</p>
      </div>
    );
  }

  return (
    <div className={styles.body} role="tabpanel">
      {restartNote ? (
        <p className={styles.restartNote} role="status">{restartNote}</p>
      ) : null}
      
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Sieć & Klienci</legend>
        <label className={styles.field}>
          <span className={styles.label}>Port HTTP</span>
          <input className={styles.number} type="number" min={1} max={65535} value={server.PORT || "4000"}
            onChange={(e) => onServerChange({ ...server, PORT: e.target.value })} aria-label="Port HTTP" />
          <span className={styles.muted}>Domyślnie 4000 · wymaga restartu</span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Bind host</span>
          <Select value={server.STAGESYNC_BIND_HOST || "0.0.0.0"}
            onChange={(e) => onServerChange({ ...server, STAGESYNC_BIND_HOST: e.target.value })} aria-label="Host nasłuchu">
            <option value="0.0.0.0">0.0.0.0 (LAN)</option>
            <option value="127.0.0.1">localhost</option>
          </Select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Nazwa hosta w sieci</span>
          <Input
            maxLength={40}
            value={String(server.STAGESYNC_HOST_DISPLAY_NAME ?? "")}
            onChange={(e) =>
              onServerChange({
                ...server,
                STAGESYNC_HOST_DISPLAY_NAME: e.target.value,
              })
            }
            aria-label="Nazwa hosta w sieci"
          />
          <span className={styles.muted}>
            Widoczna przy wyszukiwaniu hostów w launcherze; adres IP zostaje w drugiej linii.
          </span>
        </label>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={Boolean(server.STAGESYNC_DISABLE_MDNS)}
            onChange={(e) => onServerChange({ ...server, STAGESYNC_DISABLE_MDNS: e.target.checked })} aria-label="Wyłącz mDNS" />
          <span>Wyłącz ogłoszenie mDNS</span>
        </label>
      </fieldset>
      
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Import UltraStar (USDB)</legend>
        <p className={styles.muted}>
          Konto na{" "}
          <a href="https://usdb.animux.de" target="_blank" rel="noreferrer">
            usdb.animux.de
          </a>{" "}
          do wyszukiwania i pobierania. Zapis na hoście (bez restartu). Hasło nie
          wraca z API — puste pole = bez zmiany.
        </p>
        <label className={styles.field}>
          <span className={styles.label}>Użytkownik USDB</span>
          <Input
            type="text"
            autoComplete="username"
            value={String(server.STAGESYNC_USDB_USER ?? "")}
            onChange={(e) =>
              onServerChange({
                ...server,
                STAGESYNC_USDB_USER: e.target.value,
              })
            }
            aria-label="Użytkownik USDB"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Hasło USDB</span>
          <Input
            type="password"
            autoComplete="current-password"
            value={String(server.STAGESYNC_USDB_PASS ?? "")}
            placeholder={
              serverMeta?.secretsConfigured?.STAGESYNC_USDB_PASS
                ? "Zostaw puste, aby nie zmieniać"
                : undefined
            }
            onChange={(e) =>
              onServerChange({
                ...server,
                STAGESYNC_USDB_PASS: e.target.value,
              })
            }
            aria-label="Hasło USDB"
          />
          {serverMeta?.secretsConfigured?.STAGESYNC_USDB_PASS ? (
            <span className={styles.muted}>Hasło jest zapisane na hoście.</span>
          ) : null}
        </label>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Logi & Utrzymanie</legend>
        <label className={styles.field}>
          <span className={styles.label}>Poziom logów</span>
          <Select value={server.LOG_LEVEL || "info"}
            onChange={(e) => onServerChange({ ...server, LOG_LEVEL: e.target.value })} aria-label="Poziom logów">
            <option value="info">info</option>
            <option value="debug">debug</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </Select>
        </label>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={!server.STAGESYNC_DISABLE_AUTO_UPDATE}
            onChange={(e) => onServerChange({ ...server, STAGESYNC_DISABLE_AUTO_UPDATE: !e.target.checked })} aria-label="Aktualizacje automatyczne" />
          <span>Aktualizacje z Admina</span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Kanał aktualizacji</span>
          <Select value={server.STAGESYNC_UPDATE_CHANNEL || "stable"}
            onChange={(e) => onServerChange({ ...server, STAGESYNC_UPDATE_CHANNEL: e.target.value })} aria-label="Kanał">
            <option value="stable">Stable</option>
            <option value="beta">Beta</option>
            <option value="rc">RC</option>
          </Select>
        </label>
      </fieldset>
      
      <details className={styles.fieldset}>
        <summary className={styles.legend}>Zaawansowane — Ścieżki plików</summary>
        {([
          ["STAGESYNC_DATA_DIR", "dataDir", serverMeta?.resolved?.dataDir],
          ["STAGESYNC_BACKUPS_DIR", "backupDir", serverMeta?.resolved?.backupsDir],
          ["STAGESYNC_ASSETS_DIR", "assetsDir", serverMeta?.resolved?.assetsHint],
        ] as const).map(([key, label, ph]) => (
          <label key={key} className={styles.field}>
            <span className={styles.label}>{label}</span>
            <div className={styles.latencyRow}>
              <Input style={{ flex: 1 }} type="text" value={String(server[key] ?? "")}
                placeholder={ph ?? ""} onChange={(e) => onServerChange({ ...server, [key]: e.target.value })} aria-label={label} />
              <Button
                variant="secondary"
                aria-label={`Przeglądaj katalog — ${label}`}
                onClick={() => {
                onBrowseFieldChange(key);
                onRestoreMsgChange(null);
                void browseServerPath({ path: String(server[key] || ""), mode: "dir" }).then(onBrowseDataChange).catch(() => onBrowseDataChange(null));
              }}>…</Button>
            </div>
          </label>
        ))}
        <div className={styles.field}>
          <span className={styles.label}>Przywróć z kopii</span>
          <p className={styles.muted}>
            Wybierz plik <code>.bak</code> (shadow backup), kilka plików
            <code>.bak</code>, albo archiwum <code>.zip</code> z drzewem
            danych / kopiami. Host nadpisze pliki w katalogu danych
            (najpierw zrobi kopię <code>pre-restore</code>).
          </p>
          <div className={styles.latencyRow}>
            <Button
              variant="secondary"
              disabled={restoreBusy}
              aria-label="Przywróć z pliku .bak lub .zip"
              onClick={onRestoreClick}
            >
              Przywróć…
            </Button>
          </div>
          {restoreMsg ? (
            <p className={styles.muted} role="status">
              {restoreMsg}
            </p>
          ) : null}
        </div>
        {browseField && browseData ? (
          <div className={styles.panicBlock}>
            <p className={styles.muted}>{browseData.envPath}</p>
            <div className={styles.latencyRow}>
              <Button variant="ghost" disabled={!browseData.parent} onClick={onBrowseUp}>W górę</Button>
              {!isRestoreBrowse ? (
                <Button variant="primary" onClick={onBrowseSelect}>Wybierz</Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    disabled={restoreSelectedCount === 0 || restoreBusy}
                    onClick={onRestoreSelectedClick}
                  >
                    Przywróć zaznaczone
                    {restoreSelectedCount > 0
                      ? ` (${restoreSelectedCount})`
                      : ""}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={restoreBusy}
                    onClick={onRestoreDirClick}
                  >
                    Przywróć katalog (.bak)
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={onBrowseCancel}>Anuluj</Button>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {browseData.entries
                .filter((e) =>
                  isRestoreBrowse ? e.type === "dir" || e.type === "file" : e.type === "dir",
                )
                .map((e) => renderBrowseEntry(e))}
            </ul>
          </div>
        ) : null}
      </details>
    </div>
  );
}

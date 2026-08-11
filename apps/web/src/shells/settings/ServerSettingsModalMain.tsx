import { Button } from "@stagesync/ui";
import { type PreferencesTab } from "@lib/client/preferencesEvents.js";
import {
  browseServerPath,
  postSystemRestore,
} from "@lib/shell-operator/setlistApi.js";
import { clampLatencyCompensationMs } from "@lib/audio/audioLatencyPrefs.js";
import { ShellConfirmDialog } from "../components/ShellBlockingDialog.js";
import { GeneralSettingsTab } from "./tabs/GeneralSettingsTab.js";
import { AudioSettingsTab } from "./tabs/AudioSettingsTab.js";
import { MidiSettingsTab } from "./tabs/MidiSettingsTab.js";
import { MetronomeSettingsTab } from "./tabs/MetronomeSettingsTab.js";
import { ServerSettingsTab } from "./tabs/ServerSettingsTab.js";
import styles from "./ServerSettingsModal.module.css";
import { TABS } from "./prefsSnapshot.js";
import { SettingsModalShell as ModalShell } from "./SettingsModalShell.js";
import { useServerSettingsModalState } from "./useServerSettingsModalState.js";

type Props = {
  onClose: () => void;
  initialTab?: PreferencesTab;
};

export function ServerSettingsModal({
  onClose,
  initialTab = "general",
}: Props) {
  const {
    tab,
    setTab,
    draft,
    setDraft,
    outputs,
    sampleRate,
    maxChannelCount,
    midiStatus,
    audioError,
    midiError,
    saveBusy,
    deviceNameError,
    setDeviceNameError,
    panicBusy,
    panicConfirm,
    panicHoldMs,
    previewBusy,
    server,
    setServer,
    serverMeta,
    restartNote,
    browseField,
    setBrowseField,
    browseData,
    setBrowseData,
    restoreBusy,
    setRestoreBusy,
    restoreMsg,
    setRestoreMsg,
    restoreSelected,
    setRestoreSelected,
    pendingRestore,
    setPendingRestore,
    isRestoreBrowse,
    browseMode,
    restoreBrowseExt,
    isZipName,
    isBakName,
    onDiscard,
    onSave,
    onPreviewMetronome,
    clearPanicHold,
    startPanicHold,
    networkLatencyLabel,
    midiDraft,
    midiReady,
    dirty,
  } = useServerSettingsModalState(onClose, initialTab);

  return (
    <ModalShell
      title="Ustawienia"
      onDiscard={onDiscard}
      footer={
        <div className={styles.actions}>
          <Button
            variant="ghost"
            className={dirty ? styles.discardHot : undefined}
            disabled={saveBusy}
            onClick={onDiscard}
          >
            Odrzuć
          </Button>
          <Button
            variant={dirty ? "primary" : "ghost"}
            loading={saveBusy}
            disabled={saveBusy || !dirty}
            onClick={() => {
              void onSave();
            }}
          >
            Zapisz
          </Button>
        </div>
      }
    >
      <div className={styles.layout}>
        <div className={styles.tabs} role="tablist" aria-label="Preferencje">
          {TABS.map((t) => (
            <Button
              key={t.id}
              variant="ghost"
              role="tab"
              aria-selected={tab === t.id}
              selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className={styles.main}>
          {tab === "general" && (
            <GeneralSettingsTab
              appearance={draft.appearance}
              onAppearanceChange={(appearance) =>
                setDraft((d) => ({ ...d, appearance }))
              }
              clockFormat={draft.clockFormat}
              onClockFormatChange={(clockFormat) =>
                setDraft((d) => ({ ...d, clockFormat }))
              }
              deviceName={draft.deviceName}
              onDeviceNameChange={(deviceName) => {
                setDeviceNameError(null);
                setDraft((d) => ({ ...d, deviceName }));
              }}
              deviceNameError={deviceNameError}
            />
          )}

          {tab === "audio" && (
            <AudioSettingsTab
              audioError={audioError}
              saveBusy={saveBusy}
              sinkId={draft.sinkId}
              onSinkIdChange={(sinkId) => setDraft((d) => ({ ...d, sinkId }))}
              outputs={outputs}
              sampleRate={sampleRate}
              maxChannelCount={maxChannelCount}
              networkLatencyLabel={networkLatencyLabel}
              latencyCompMs={draft.latencyCompMs}
              onLatencyCompMsChange={(ms) =>
                setDraft((d) => ({
                  ...d,
                  latencyCompMs: clampLatencyCompensationMs(ms),
                }))
              }
            />
          )}

          {tab === "midi" && (
            <MidiSettingsTab
              midiError={midiError}
              midiReady={midiReady}
              midiStatus={midiStatus}
              midiDraft={midiDraft}
              saveBusy={saveBusy}
              panicBusy={panicBusy}
              panicHoldMs={panicHoldMs}
              panicConfirm={panicConfirm}
              onPanicHoldStart={startPanicHold}
              onPanicHoldEnd={clearPanicHold}
              onMidiDraftChange={(midi) => setDraft((d) => ({ ...d, midi }))}
            />
          )}

          {tab === "metronome" && (
            <MetronomeSettingsTab
              metro={draft.metro}
              onMetroChange={(metro) => setDraft((d) => ({ ...d, metro }))}
              previewBusy={previewBusy}
              saveBusy={saveBusy}
              onPreviewClick={() => {
                void onPreviewMetronome();
              }}
            />
          )}

          {tab === "server" && (
            <ServerSettingsTab
              restartNote={restartNote}
              server={server}
              onServerChange={setServer}
              serverMeta={serverMeta}
              browseField={browseField}
              onBrowseFieldChange={setBrowseField}
              browseData={browseData}
              onBrowseDataChange={setBrowseData}
              restoreMsg={restoreMsg}
              onRestoreMsgChange={setRestoreMsg}
              restoreBusy={restoreBusy}
              onRestoreClick={() => {
                setBrowseField("__restore__");
                setRestoreMsg(null);
                setRestoreSelected([]);
                const start =
                  serverMeta?.resolved?.backupsDir ||
                  serverMeta?.resolved?.dataDir ||
                  String(
                    server?.STAGESYNC_BACKUPS_DIR ||
                      server?.STAGESYNC_DATA_DIR ||
                      "",
                  );
                void browseServerPath({
                  path: start,
                  mode: "file",
                  ext: restoreBrowseExt,
                })
                  .then(setBrowseData)
                  .catch((err) => {
                    setBrowseData(null);
                    setRestoreMsg(
                      err instanceof Error
                        ? err.message
                        : "Nie udało się otworzyć przeglądarki plików",
                    );
                  });
              }}
              onBrowseUp={() => {
                if (browseData?.parent) {
                  void browseServerPath({
                    path: browseData.parent,
                    mode: browseMode,
                    ext: isRestoreBrowse ? restoreBrowseExt : undefined,
                  }).then((next) => {
                    setBrowseData(next);
                    if (isRestoreBrowse) setRestoreSelected([]);
                  });
                }
              }}
              onBrowseSelect={() => {
                if (server && browseField && browseData) {
                  setServer({ ...server, [browseField]: browseData.envPath });
                  setBrowseField(null);
                  setBrowseData(null);
                }
              }}
              isRestoreBrowse={isRestoreBrowse}
              restoreSelectedCount={restoreSelected.length}
              onRestoreSelectedClick={() => {
                const n = restoreSelected.length;
                setPendingRestore({
                  paths: restoreSelected.map((s) => s.path),
                  label:
                    n === 1 ? restoreSelected[0]!.name : `${n} plików .bak`,
                });
              }}
              onRestoreDirClick={() => {
                const baks =
                  browseData?.entries.filter(
                    (e) => e.type === "file" && isBakName(e.name),
                  ) ?? [];
                if (baks.length === 0) {
                  setRestoreMsg(
                    "W tym katalogu nie ma plików .bak do przywrócenia",
                  );
                  return;
                }
                setPendingRestore({
                  paths: baks.map((e) => e.path),
                  label: `wszystkie .bak w katalogu (${baks.length})`,
                });
              }}
              onBrowseCancel={() => {
                setBrowseField(null);
                setBrowseData(null);
                setRestoreSelected([]);
              }}
              renderBrowseEntry={(e) => {
                const selected =
                  isRestoreBrowse &&
                  e.type === "file" &&
                  isBakName(e.name) &&
                  restoreSelected.some((s) => s.path === e.path);
                return (
                  <li key={e.path}>
                    <button
                      type="button"
                      className={styles.select}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        ...(selected
                          ? { outline: "2px solid var(--ss-color-primary)" }
                          : {}),
                      }}
                      onClick={() => {
                        if (e.type === "dir") {
                          void browseServerPath({
                            path: e.path,
                            mode: browseMode,
                            ext: isRestoreBrowse ? restoreBrowseExt : undefined,
                          }).then((next) => {
                            setBrowseData(next);
                            if (isRestoreBrowse) setRestoreSelected([]);
                          });
                          return;
                        }
                        if (isZipName(e.name)) {
                          setPendingRestore({
                            paths: [e.path],
                            label: e.name,
                          });
                          setBrowseField(null);
                          setBrowseData(null);
                          setRestoreSelected([]);
                          return;
                        }
                        if (isBakName(e.name)) {
                          setRestoreSelected((prev) => {
                            const exists = prev.some((s) => s.path === e.path);
                            if (exists) {
                              return prev.filter((s) => s.path !== e.path);
                            }
                            return [...prev, { path: e.path, name: e.name }];
                          });
                          return;
                        }
                      }}
                    >
                      {e.type === "dir"
                        ? "📁"
                        : isZipName(e.name)
                          ? "📦"
                          : selected
                            ? "☑"
                            : "☐"}{" "}
                      {e.name}
                    </button>
                  </li>
                );
              }}
            />
          )}
        </div>
      </div>

      <ShellConfirmDialog
        open={pendingRestore != null}
        title="Przywróć kopię zapasową"
        message={
          pendingRestore
            ? `Nadpisać bieżące pliki zawartością „${pendingRestore.label}”? To destrukcyjna operacja (host zrobi najpierw kopię pre-restore dla każdego nadpisanego pliku).`
            : ""
        }
        confirmLabel="Przywróć"
        onConfirm={() => {
          const pending = pendingRestore;
          setPendingRestore(null);
          if (!pending) return;
          setRestoreBusy(true);
          setRestoreMsg(null);
          setBrowseField(null);
          setBrowseData(null);
          setRestoreSelected([]);
          const payload =
            pending.paths.length === 1 ? pending.paths[0]! : pending.paths;
          void postSystemRestore(payload)
            .then((res) => {
              setRestoreMsg(
                res.message ??
                  (res.count && res.count > 1
                    ? `Przywrócono ${res.count} plików`
                    : `Przywrócono: ${res.targetPath ?? ""}`),
              );
            })
            .catch((err) => {
              setRestoreMsg(
                err instanceof Error ? err.message : "Nie udało się przywrócić",
              );
            })
            .finally(() => setRestoreBusy(false));
        }}
        onCancel={() => setPendingRestore(null)}
      />
    </ModalShell>
  );
}

export function PreferencesModal(props: Props) {
  return <ServerSettingsModal {...props} />;
}

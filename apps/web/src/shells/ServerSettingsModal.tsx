import { useId, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@stagesync/ui";
import {
  applyAppearance,
  readAppearance,
  setAppearance,
  type AppearanceState,
} from "@lib/client/appearance.js";
import {
  applyAudioOutputSink,
  getStoredAudioOutputDeviceId,
  listAudioOutputDevices,
  setStoredAudioOutputDeviceId,
} from "@lib/audio/audioOutputPrefs.js";
import { refreshAudioHwCapability } from "@lib/audio/audioHwCapability.js";
import {
  clampLatencyCompensationMs,
  getStoredLatencyCompensationMs,
  setStoredLatencyCompensationMs,
} from "@lib/audio/audioLatencyPrefs.js";
import {
  getStoredClockDisplayFormat,
  setStoredClockDisplayFormat,
  type ClockDisplayFormat,
} from "@lib/client/clockDisplayPrefs.js";
import { getMetronomeAudioContext, previewMetronomeClick } from "@lib/audio/metronome.js";
import {
  getMetronomePrefs,
  setMetronomePrefs,
  type MetronomePrefs,
} from "@lib/audio/metronomePrefs.js";
import {
  getStoredDeviceDisplayName,
  setStoredDeviceDisplayName,
} from "@lib/client/deviceNamePrefs.js";
import { type PreferencesTab } from "@lib/client/preferencesEvents.js";
import {
  browseServerPath,
  fetchMidiHostStatus,
  fetchServerSettings,
  postMidiPanic,
  postSystemRestore,
  putMidiHostConfig,
  putServerSettings,
  type BrowseResult,
  type MidiHostStatus,
  type ServerSettingsResponse,
  type ServerSettingsValues,
} from "@lib/shell-operator/setlistApi.js";
import { useTransport } from "../transport/useTransport.js";
import { ShellConfirmDialog } from "./ShellBlockingDialog.js";
import { ShellIconButton } from "./ShellIconButton.js";
import { GeneralSettingsTab } from "./settings/tabs/GeneralSettingsTab.js";
import { AudioSettingsTab } from "./settings/tabs/AudioSettingsTab.js";
import { MidiSettingsTab } from "./settings/tabs/MidiSettingsTab.js";
import { MetronomeSettingsTab } from "./settings/tabs/MetronomeSettingsTab.js";
import { ServerSettingsTab } from "./settings/tabs/ServerSettingsTab.js";
import styles from "./ServerSettingsModal.module.css";

export type { PreferencesTab };

type Props = {
  onClose: () => void;
  initialTab?: PreferencesTab;
};

type MidiDraft = {
  inputId: string | null;
  outputId: string | null;
  clockOutEnabled: boolean;
  inputChannel: number | null;
  outputChannel: number;
};

type PrefsSnapshot = {
  appearance: AppearanceState;
  clockFormat: ClockDisplayFormat;
  deviceName: string;
  sinkId: string;
  latencyCompMs: number;
  metro: MetronomePrefs;
  midi: MidiDraft | null;
};

type SettingsTab = PreferencesTab | "server";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "Ogólne" },
  { id: "audio", label: "Audio" },
  { id: "midi", label: "MIDI" },
  { id: "metronome", label: "Metronom" },
  { id: "server", label: "Serwer" },
];

function readLocalSnapshot(): PrefsSnapshot {
  const metro = getMetronomePrefs();
  return {
    appearance: readAppearance(),
    clockFormat: getStoredClockDisplayFormat(),
    deviceName: getStoredDeviceDisplayName() ?? "",
    sinkId: getStoredAudioOutputDeviceId() ?? "",
    latencyCompMs: getStoredLatencyCompensationMs(),
    metro,
    midi: null,
  };
}

function midiDraftEqual(a: MidiDraft | null, b: MidiDraft | null): boolean {
  if (a == null || b == null) return a === b;
  return (
    a.inputId === b.inputId &&
    a.outputId === b.outputId &&
    a.clockOutEnabled === b.clockOutEnabled &&
    a.inputChannel === b.inputChannel &&
    a.outputChannel === b.outputChannel
  );
}

function prefsEqual(a: PrefsSnapshot, b: PrefsSnapshot): boolean {
  return (
    a.appearance.profile === b.appearance.profile &&
    a.clockFormat === b.clockFormat &&
    a.deviceName === b.deviceName &&
    a.sinkId === b.sinkId &&
    a.latencyCompMs === b.latencyCompMs &&
    a.metro.accentVolume === b.metro.accentVolume &&
    a.metro.beatVolume === b.metro.beatVolume &&
    a.metro.timbre === b.metro.timbre &&
    a.metro.masterGainDb === b.metro.masterGainDb &&
    midiDraftEqual(a.midi, b.midi)
  );
}

function ModalShell({
  title,
  children,
  footer,
  onDiscard,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onDiscard: () => void;
}) {
  const titleId = useId();
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Odrzuć"
        onClick={onDiscard}
      />
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 id={titleId}>{title}</h2>
          <ShellIconButton label="Odrzuć" onClick={onDiscard}>
            ×
          </ShellIconButton>
        </div>
        <div className={styles.scroll}>{children}</div>
        {footer}
      </div>
    </div>
  );
}

export function ServerSettingsModal({ onClose, initialTab = "general" }: Props) {
  const { latencyMs } = useTransport();
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  const snapshotRef = useRef<PrefsSnapshot>(readLocalSnapshot());

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [draft, setDraft] = useState<PrefsSnapshot>(() => snapshotRef.current);

  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [maxChannelCount, setMaxChannelCount] = useState<number | null>(null);
  const [midiStatus, setMidiStatus] = useState<MidiHostStatus | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [deviceNameError, setDeviceNameError] = useState<string | null>(null);
  const [panicBusy, setPanicBusy] = useState(false);
  const [panicConfirm, setPanicConfirm] = useState(false);
  const [panicHoldMs, setPanicHoldMs] = useState(0);
  const panicHoldTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panicArmedRef = useRef(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [server, setServer] = useState<ServerSettingsValues | null>(null);
  const serverSnap = useRef<ServerSettingsValues | null>(null);
  const [serverMeta, setServerMeta] = useState<ServerSettingsResponse | null>(null);
  const [restartNote, setRestartNote] = useState<string | null>(null);
  const [browseField, setBrowseField] = useState<string | null>(null);
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [restoreSelected, setRestoreSelected] = useState<
    { path: string; name: string }[]
  >([]);
  const [pendingRestore, setPendingRestore] = useState<{
    paths: string[];
    label: string;
  } | null>(null);

  const isRestoreBrowse = browseField === "__restore__";
  const browseMode = isRestoreBrowse ? "file" : "dir";
  const restoreBrowseExt = ".bak,.zip";

  function isZipName(name: string): boolean {
    return name.toLowerCase().endsWith(".zip");
  }

  function isBakName(name: string): boolean {
    return name.toLowerCase().endsWith(".bak");
  }

  useEffect(() => {
    snapshotRef.current = readLocalSnapshot();
    setDraft(snapshotRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listAudioOutputDevices();
        if (!cancelled) setOutputs(list);
      } catch (err) {
        if (!cancelled) {
          setAudioError(
            err instanceof Error
              ? err.message
              : "Nie udało się listować urządzeń",
          );
        }
      }
    })();
    try {
      setSampleRate(getMetronomeAudioContext().sampleRate);
      setMaxChannelCount(
        refreshAudioHwCapability(getMetronomeAudioContext()).maxChannelCount,
      );
    } catch {
      setSampleRate(null);
      setMaxChannelCount(null);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await fetchMidiHostStatus();
        if (cancelled) return;
        setMidiStatus(status);
        const midi: MidiDraft = {
          inputId: status.config.inputId,
          outputId: status.config.outputId,
          clockOutEnabled: status.config.clockOutEnabled,
          inputChannel: status.config.inputChannel ?? null,
          outputChannel: status.config.outputChannel ?? 0,
        };
        snapshotRef.current = { ...snapshotRef.current, midi };
        setDraft((d) => ({ ...d, midi }));
        setMidiError(null);
      } catch (err) {
        if (!cancelled) {
          setMidiError(err instanceof Error ? err.message : "Błąd MIDI");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchServerSettings();
        if (cancelled) return;
        setServerMeta(res);
        serverSnap.current = { ...res.values };
        setServer({ ...res.values });
      } catch (err) {
        if (!cancelled) {
          setMidiError(err instanceof Error ? err.message : "Błąd ustawień serwera");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyAppearance(draft.appearance);
  }, [draft.appearance]);

  const onDiscard = () => {
    applyAppearance(snapshotRef.current.appearance);
    onCloseRef.current();
  };

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      applyAppearance(snapshotRef.current.appearance);
      onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSave = async () => {
    setSaveBusy(true);
    setAudioError(null);
    setMidiError(null);
    setDeviceNameError(null);
    try {
      try {
        setStoredDeviceDisplayName(draft.deviceName);
      } catch (err) {
        setDeviceNameError(
          err instanceof Error ? err.message : "Błąd zapisu nazwy",
        );
        setTab("general");
        return;
      }

      setAppearance(draft.appearance);
      setStoredClockDisplayFormat(draft.clockFormat);
      setStoredLatencyCompensationMs(draft.latencyCompMs);
      setMetronomePrefs(draft.metro);
      snapshotRef.current = {
        ...snapshotRef.current,
        appearance: draft.appearance,
        clockFormat: draft.clockFormat,
        deviceName: getStoredDeviceDisplayName() ?? draft.deviceName,
        latencyCompMs: draft.latencyCompMs,
        metro: draft.metro,
      };

      const prevSink = snapshotRef.current.sinkId;
      const nextSink = draft.sinkId;
      if (prevSink !== nextSink) {
        try {
          const sink = nextSink === "" ? null : nextSink;
          await applyAudioOutputSink(sink);
          setStoredAudioOutputDeviceId(sink);
          snapshotRef.current = {
            ...snapshotRef.current,
            sinkId: nextSink,
          };
        } catch (err) {
          setAudioError(
            err instanceof Error ? err.message : "Nie udało się zmienić wyjścia",
          );
          setTab("audio");
          return;
        }
      }

      if (draft.midi && !midiDraftEqual(draft.midi, snapshotRef.current.midi)) {
        const status = await putMidiHostConfig({
          inputId: draft.midi.inputId,
          outputId: draft.midi.outputId,
          clockOutEnabled: draft.midi.clockOutEnabled,
          inputChannel: draft.midi.inputChannel,
          outputChannel: draft.midi.outputChannel,
        });
        setMidiStatus(status);
        snapshotRef.current = { ...snapshotRef.current, midi: draft.midi };
      }

      if (server && serverDirty) {
        const saved = await putServerSettings(server);
        setServerMeta(saved);
        serverSnap.current = { ...saved.values };
        setServer({ ...saved.values });
        if (saved.restartRequired) {
          setRestartNote(
            saved.message ??
              "Zapisano. Zrestartuj serwer, aby zastosować zmiany sieci / ścieżek / logów.",
          );
          snapshotRef.current = {
            ...draft,
            deviceName: getStoredDeviceDisplayName() ?? draft.deviceName,
          };
          return;
        }
      }

      snapshotRef.current = {
        ...draft,
        deviceName: getStoredDeviceDisplayName() ?? draft.deviceName,
      };
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nie udało się zapisać";
      if (msg.toLowerCase().includes("midi")) setMidiError(msg);
      else setAudioError(msg);
    } finally {
      setSaveBusy(false);
    }
  };

  const onPreviewMetronome = async () => {
    setPreviewBusy(true);
    try {
      await previewMetronomeClick(draft.metro, true);
    } catch {
      /* ignore preview error */
    } finally {
      setPreviewBusy(false);
    }
  };

  const onPanic = async () => {
    setPanicBusy(true);
    setPanicConfirm(false);
    try {
      const result = await postMidiPanic();
      if (result.status) setMidiStatus(result.status);
      setMidiError(null);
      setPanicConfirm(true);
    } catch (err) {
      setMidiError(err instanceof Error ? err.message : "Błąd MIDI Panic");
    } finally {
      setPanicBusy(false);
    }
  };

  const clearPanicHold = () => {
    if (panicHoldTimerRef.current != null) {
      clearInterval(panicHoldTimerRef.current);
      panicHoldTimerRef.current = null;
    }
    setPanicHoldMs(0);
    panicArmedRef.current = false;
  };

  const startPanicHold = () => {
    if (
      panicBusy ||
      saveBusy ||
      !midiStatus?.available ||
      !midiStatus.config.outputId
    ) {
      return;
    }
    clearPanicHold();
    panicArmedRef.current = true;
    const started = Date.now();
    panicHoldTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - started;
      setPanicHoldMs(elapsed);
      if (elapsed >= 1000 && panicArmedRef.current) {
        clearPanicHold();
        void onPanic();
      }
    }, 50);
  };

  const networkLatencyLabel =
    latencyMs != null && Number.isFinite(latencyMs)
      ? `${Math.round(latencyMs)} ms`
      : "—";

  const midiDraft = draft.midi;
  const midiReady = midiStatus != null && midiDraft != null;
  const serverDirty =
    server != null &&
    serverSnap.current != null &&
    JSON.stringify(server) !== JSON.stringify(serverSnap.current);
  const dirty = !prefsEqual(draft, snapshotRef.current) || serverDirty;

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
              onAppearanceChange={(appearance) => setDraft((d) => ({ ...d, appearance }))}
              clockFormat={draft.clockFormat}
              onClockFormatChange={(clockFormat) => setDraft((d) => ({ ...d, clockFormat }))}
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
                  String(server?.STAGESYNC_BACKUPS_DIR || server?.STAGESYNC_DATA_DIR || "");
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
                    n === 1
                      ? restoreSelected[0]!.name
                      : `${n} plików .bak`,
                });
              }}
              onRestoreDirClick={() => {
                const baks = browseData?.entries.filter(
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
                    <button type="button" className={styles.select} style={{
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
            pending.paths.length === 1
              ? pending.paths[0]!
              : pending.paths;
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

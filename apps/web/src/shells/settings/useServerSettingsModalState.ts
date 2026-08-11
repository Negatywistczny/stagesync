import { useEffect, useRef, useState } from "react";
import { applyAppearance, setAppearance } from "@lib/client/appearance.js";
import {
  applyAudioOutputSink,
  setStoredAudioOutputDeviceId,
  listAudioOutputDevices,
} from "@lib/audio/audioOutputPrefs.js";
import { refreshAudioHwCapability } from "@lib/audio/audioHwCapability.js";
import { setStoredLatencyCompensationMs } from "@lib/audio/audioLatencyPrefs.js";
import { setStoredClockDisplayFormat } from "@lib/client/clockDisplayPrefs.js";
import {
  getMetronomeAudioContext,
  previewMetronomeClick,
} from "@lib/audio/metronome.js";
import { setMetronomePrefs } from "@lib/audio/metronomePrefs.js";
import {
  getStoredDeviceDisplayName,
  setStoredDeviceDisplayName,
} from "@lib/client/deviceNamePrefs.js";
import { type PreferencesTab } from "@lib/client/preferencesEvents.js";
import {
  fetchMidiHostStatus,
  fetchServerSettings,
  postMidiPanic,
  putMidiHostConfig,
  putServerSettings,
  type BrowseResult,
  type MidiHostStatus,
  type ServerSettingsResponse,
  type ServerSettingsValues,
} from "@lib/shell-operator/setlistApi.js";
import { useTransport } from "../../transport/useTransport.js";
import {
  midiDraftEqual,
  prefsEqual,
  readLocalSnapshot,
  type MidiDraft,
  type PrefsSnapshot,
  type SettingsTab,
} from "./prefsSnapshot.js";

export function useServerSettingsModalState(
  onClose: () => void,
  initialTab: PreferencesTab = "general",
) {
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
  const [serverMeta, setServerMeta] = useState<ServerSettingsResponse | null>(
    null,
  );
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
  const browseMode: "dir" | "file" = isRestoreBrowse ? "file" : "dir";
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
          setMidiError(
            err instanceof Error ? err.message : "Błąd ustawień serwera",
          );
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
            err instanceof Error
              ? err.message
              : "Nie udało się zmienić wyjścia",
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

  return {
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
  };
}

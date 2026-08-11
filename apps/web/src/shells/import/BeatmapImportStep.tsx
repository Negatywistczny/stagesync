import { BeatMapperPane } from "./BeatMapperPane.js";
import styles from "../CombinedUsUgImportForm.module.css";

interface BeatmapImportStepProps {
  meta: { title: string; subtitle: string };
  bridgeOk: any;
  stepNotice: string | null;
  smartTempoAudio: any;
  audioStartOffsetMs: number;
  localBuffer: AudioBuffer | null;
  displayTempoNodes: any[];
  handleTempoNodesChange: (nodes: any[]) => void;
  handleAudioStartOffsetChange: (ms: number) => void;
  gridBpmDisplay: string;
  setGridBpmDraft: (v: string) => void;
  usTitle: string;
  usPreview: any;
  ingestLocalFile: (file: File) => Promise<void>;
  beatPlayToggleRef: React.MutableRefObject<(() => void) | null>;
  locked: boolean;
  weakAlign: boolean;
  confirmWeak: boolean;
  setConfirmWeak: (v: boolean) => void;
}

export function BeatmapImportStep({
  meta,
  bridgeOk,
  stepNotice,
  smartTempoAudio,
  audioStartOffsetMs,
  localBuffer,
  displayTempoNodes,
  handleTempoNodesChange,
  handleAudioStartOffsetChange,
  gridBpmDisplay,
  setGridBpmDraft,
  usTitle,
  usPreview,
  ingestLocalFile,
  beatPlayToggleRef,
  locked,
  weakAlign,
  confirmWeak,
  setConfirmWeak,
}: BeatmapImportStepProps) {
  if (!bridgeOk) return null;

  return (
    <>
      <header className={styles.stepHead}>
        <h3 className={styles.stepTitle}>{meta.title}</h3>
        <p className={styles.stepSubtitle}>{meta.subtitle}</p>
      </header>
      <div className={styles.stepPanel}>
        {stepNotice ? (
          <p className={styles.notice} role="status">
            {stepNotice}
          </p>
        ) : null}
        <BeatMapperPane
          bridge={bridgeOk}
          audio={
            smartTempoAudio ? { ...smartTempoAudio, audioStartOffsetMs } : null
          }
          localAudioBuffer={localBuffer}
          tempoNodes={displayTempoNodes}
          onTempoNodesChange={handleTempoNodesChange}
          audioStartOffsetMs={audioStartOffsetMs}
          onAudioStartOffsetChange={handleAudioStartOffsetChange}
          gridBpmDisplay={gridBpmDisplay}
          onGridBpmChange={setGridBpmDraft}
          songTitle={
            usTitle.trim() ||
            (usPreview?.ok === true ? usPreview.title?.trim() : "") ||
            ""
          }
          onSelectAudioFile={(file) => void ingestLocalFile(file)}
          onRegisterPlayToggle={(fn) => {
            beatPlayToggleRef.current = fn;
          }}
          disabled={locked}
        />
        {bridgeOk.warnings.length > 0 ? (
          <ul className={styles.warnList}>
            {bridgeOk.warnings.map((w: string) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        {weakAlign ? (
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={confirmWeak}
              disabled={locked}
              onChange={(e) => setConfirmWeak(e.target.checked)}
            />
            Potwierdzam import mimo słabego dopasowania tekstu
          </label>
        ) : null}
      </div>
    </>
  );
}

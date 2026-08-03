/**
 * Shared audio dropzone for US+UG wizard (file card / Beat Mapper empty).
 */

import { useRef, useState } from "react";
import { Button } from "@stagesync/ui";
import { AudioLines } from "lucide-react";
import { ImportProgress } from "./ImportProgress.js";
import styles from "./AudioDropzone.module.css";

export type AudioDropzoneProps = {
  disabled?: boolean;
  busy?: boolean;
  /** Compact card height for studio split layouts. */
  compact?: boolean;
  progressLabel?: string | null;
  /** 0…100 — when set with a label, shows a smooth determinate bar. */
  progressValue?: number | null;
  onSelectFile: (file: File) => void;
};

export function AudioDropzone({
  disabled = false,
  busy = false,
  compact = false,
  progressLabel = null,
  progressValue = null,
  onSelectFile,
}: AudioDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropActive, setDropActive] = useState(false);
  const locked = disabled || busy;

  function accept(file: File | undefined | null) {
    if (!file || locked) return;
    onSelectFile(file);
  }

  return (
    <div
      className={[
        styles.root,
        compact ? styles.compact : "",
        dropActive ? styles.active : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragEnter={(e) => {
        e.preventDefault();
        setDropActive(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDropActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDropActive(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDropActive(false);
        accept(e.dataTransfer.files?.[0] ?? null);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
        hidden
        disabled={locked}
        onChange={(e) => {
          accept(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      <AudioLines
        className={styles.icon}
        aria-hidden
        size={compact ? 28 : 36}
        strokeWidth={1.75}
      />
      <p className={styles.title}>Przeciągnij i upuść plik MP3 / WAV</p>
      <p className={styles.hint}>Albo wybierz plik z dysku.</p>
      <div className={styles.actions}>
        <Button
          type="button"
          variant="primary"
          disabled={locked}
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          Wybierz plik z dysku
        </Button>
      </div>
      {progressLabel != null && progressLabel !== "" ? (
        progressValue != null ? (
          <ImportProgress label={progressLabel} value={progressValue} />
        ) : (
          <p className={styles.progress} role="status">
            {progressLabel}
          </p>
        )
      ) : null}
    </div>
  );
}

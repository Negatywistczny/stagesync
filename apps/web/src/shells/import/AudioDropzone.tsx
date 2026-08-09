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
    if (!file || locked || file.name.startsWith("._")) return;
    onSelectFile(file);
  }

  function pickValidFile(files: FileList | null | undefined): File | null {
    if (!files) return null;
    return Array.from(files).find((f) => !f.name.startsWith("._")) ?? null;
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
        accept(pickValidFile(e.dataTransfer.files));
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
        hidden
        disabled={locked}
        onChange={(e) => {
          accept(pickValidFile(e.target.files));
          e.target.value = "";
        }}
      />
      <div className={styles.content}>
        <AudioLines
          className={styles.icon}
          aria-hidden
          size={compact ? 22 : 36}
          strokeWidth={1.75}
        />
        <div className={styles.textWrapper}>
          <p className={styles.title}>
            {compact
              ? "Przeciągnij plik tutaj lub..."
              : "Przeciągnij i upuść plik MP3 / WAV"}
          </p>
          {!compact ? (
            <p className={styles.hint}>Albo wybierz plik z dysku.</p>
          ) : null}
        </div>
      </div>
      <div className={styles.actions}>
        <Button
          type="button"
          variant={compact ? "secondary" : "primary"}
          disabled={locked}
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          {compact ? "Wybierz z dysku" : "Wybierz plik z dysku"}
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

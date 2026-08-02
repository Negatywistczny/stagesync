import { useRef } from "react";
import { Button } from "@stagesync/ui";
import styles from "../../AdminShell.module.css";

interface LibraryFilesCardProps {
  onOpenImport: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  locked?: boolean;
  error?: string | null;
  notice?: string | null;
  compact?: boolean;
}

export function LibraryFilesCard({
  onOpenImport,
  onExport,
  onImportFile,
  locked,
  error,
  notice,
  compact = false,
}: LibraryFilesCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const body = (
    <>
      <div
        className={compact ? styles.dropZoneCompact : styles.dropZone}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onImportFile(f);
        }}
      >
        Upuść .stagesync.json (v5) albo legacy database.json
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.stagesync.json,application/json,.zip,.stagesync"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImportFile(f);
          e.target.value = "";
        }}
      />
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {notice && !error ? (
        <p className={styles.muted} role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}
      {!compact ? (
        <p className={styles.muted}>
          Archiwa ZIP / binarne .stagesync — na razie niewspierane (tylko JSON).
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          disabled={locked}
          loading={locked}
          onClick={() => inputRef.current?.click()}
        >
          Z pliku…
        </Button>
        <Button variant="ghost" disabled={locked} onClick={onOpenImport}>
          Import UG
        </Button>
        <Button variant="ghost" disabled={locked} onClick={onExport}>
          Eksport
        </Button>
      </div>
    </>
  );

  if (compact) {
    return (
      <div
        className={styles.dbManageBody}
        role="region"
        aria-label="Pliki bazy"
      >
        {body}
      </div>
    );
  }

  return (
    <section className={styles.card} aria-label="Pliki">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Pliki</h2>
      </div>
      <div className={styles.cardBody}>{body}</div>
    </section>
  );
}

import { useRef, useState } from "react";
import { Button } from "@stagesync/ui";
import { uploadProjectMusicXml } from "@lib/shell-operator/projectAssetsApi.js";
import { Modal } from "./Modal.js";
import styles from "../../AdminShell.module.css";

interface MusicXmlModalProps {
  projectId: string | null;
  projectName: string | null;
  onClose: () => void;
  onUploaded: () => void;
}

export function MusicXmlModal({
  projectId,
  projectName,
  onClose,
  onUploaded,
}: MusicXmlModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal title="Importuj MusicXML" onClose={onClose}>
      {!projectId ? (
        <p className={styles.muted}>Wybierz utwór.</p>
      ) : (
        <>
          <p className={styles.muted}>
            {projectName ?? projectId}
          </p>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept=".musicxml,.xml,.mxl,application/xml,text/xml"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file || !projectId) return;
              void (async () => {
                setBusy(true);
                setError(null);
                try {
                  await uploadProjectMusicXml(projectId, file);
                  onUploaded();
                  onClose();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Przesyłanie nieudane");
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        </>
      )}
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Anuluj
        </Button>
        <Button
          variant="primary"
          disabled={!projectId || busy}
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          Wybierz plik…
        </Button>
      </div>
    </Modal>
  );
}

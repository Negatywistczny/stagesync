import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@stagesync/ui";
import type { Project, ProjectAsset } from "@stagesync/shared";
import { fetchProject } from "../../lib/libraryApi.js";
import {
  deleteProjectAsset,
  uploadProjectAudio,
} from "../../lib/projectAssetsApi.js";
import styles from "../AdminShell.module.css";
import { ShellConfirmDialog } from "../ShellBlockingDialog.js";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type ProjectFilesPanelProps = {
  projectId: string | null;
  locked?: boolean;
};

export function ProjectFilesPanel({
  projectId,
  locked = false,
}: ProjectFilesPanelProps) {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async (id: string) => {
    const project: Project = await fetchProject(id);
    setAssets(project.assets);
  }, []);

  useEffect(() => {
    if (!projectId) {
      setAssets([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await reload(projectId);
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Błąd plików");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, reload]);

  const onUpload = async (file: File | undefined) => {
    if (!projectId || !file || busyRef.current || locked) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const project = await uploadProjectAudio(projectId, file);
      setAssets(project.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Przesyłanie nieudane");
    } finally {
      busyRef.current = false;
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDelete = (assetId: string) => {
    if (!projectId || busyRef.current || locked) return;
    setDeleteAssetId(assetId);
  };

  const confirmDelete = async () => {
    if (!projectId || !deleteAssetId || busyRef.current || locked) return;
    const assetId = deleteAssetId;
    setDeleteAssetId(null);
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const project = await deleteProjectAsset(projectId, assetId);
      setAssets(project.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Usuwanie nieudane");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!projectId) {
    return <p className={styles.muted}>Wybierz utwór.</p>;
  }

  return (
    <div>
      <h3 className={styles.subTitle}>Assety projektu</h3>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {assets.length === 0 ? (
        <p className={styles.muted}>Brak plików w projekcie.</p>
      ) : (
        <ul className={styles.list} aria-label="Assety projektu">
          {assets.map((a) => (
            <li
              key={a.id}
              className={[styles.songRow, styles.songRowTrail].join(" ")}
            >
              <span className={styles.songName}>{a.originalName}</span>
              <span className={styles.songMeta}>
                {a.kind} · {formatBytes(a.sizeBytes)}
              </span>
              <Button
                variant="ghost"
                disabled={busy || locked}
                onClick={() => onDelete(a.id)}
              >
                Usuń
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.aiff,.aif,.m4a,.flac,.ogg,.musicxml,.xml,.mxl"
          hidden
          onChange={(e) => void onUpload(e.target.files?.[0])}
        />
        <Button
          variant="secondary"
          disabled={busy || locked}
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          Import audio / MusicXML…
        </Button>
      </div>
      <ShellConfirmDialog
        open={deleteAssetId != null}
        title="Usuń plik"
        message="Usunąć plik z projektu?"
        confirmLabel="Usuń"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteAssetId(null)}
      />
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@stagesync/ui";
import type { Project, ProjectAsset } from "@stagesync/shared";
import { fetchProject } from "../../lib/libraryApi.js";
import {
  deleteProjectAsset,
  uploadProjectAudio,
} from "../../lib/projectAssetsApi.js";
import styles from "../AdminShell.module.css";

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
    if (!projectId || !file || busy || locked) return;
    setBusy(true);
    setError(null);
    try {
      const project = await uploadProjectAudio(projectId, file);
      setAssets(project.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload nieudany");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDelete = async (assetId: string) => {
    if (!projectId || busy || locked) return;
    if (!window.confirm("Usunąć plik z projektu?")) return;
    setBusy(true);
    setError(null);
    try {
      const project = await deleteProjectAsset(projectId, assetId);
      setAssets(project.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Usuwanie nieudane");
    } finally {
      setBusy(false);
    }
  };

  if (!projectId) {
    return <p className={styles.muted}>Wybierz utwór.</p>;
  }

  return (
    <div>
      <h3 className={styles.subTitle}>Pliki projektu</h3>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {assets.length === 0 ? (
        <p className={styles.muted}>Brak plików w projekcie.</p>
      ) : (
        <ul className={styles.list} aria-label="Pliki projektu">
          {assets.map((a) => (
            <li key={a.id} className={styles.songRow}>
              <span className={styles.songName}>{a.originalName}</span>
              <span className={styles.songMeta}>
                {a.kind} · {formatBytes(a.sizeBytes)}
              </span>
              <Button
                variant="ghost"
                disabled={busy || locked}
                onClick={() => void onDelete(a.id)}
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
    </div>
  );
}

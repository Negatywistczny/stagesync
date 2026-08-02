/**
 * UltraStar / USDX import: paste or .txt file → preview → apply.
 */

import { useMemo, useState } from "react";
import { Button, Textarea } from "@stagesync/ui";
import {
  importUltrastarText,
  type UltrastarImportOk,
  type UltrastarImportOptions,
} from "@stagesync/shared";
import styles from "./UgImportForm.module.css";

export type UltrastarImportFormProps = {
  applyLabel: string;
  disabled?: boolean;
  applying?: boolean;
  importOptions?: UltrastarImportOptions;
  onCancel: () => void;
  onApply: (result: UltrastarImportOk) => void | Promise<void>;
};

export function UltrastarImportForm({
  applyLabel,
  disabled = false,
  applying = false,
  importOptions,
  onCancel,
  onApply,
}: UltrastarImportFormProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    return importUltrastarText(trimmed, importOptions);
  }, [text, importOptions]);

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      const body = await file.text();
      setText(body);
    } catch {
      setError("Nie udało się odczytać pliku.");
    }
  }

  async function handleApply() {
    setError(null);
    const result = importUltrastarText(text, importOptions);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setBusy(true);
    try {
      await onApply(result);
    } catch {
      setError("Import nie powiódł się.");
    } finally {
      setBusy(false);
    }
  }

  const locked = disabled || applying || busy;
  const canApply = preview?.ok === true && !locked;

  return (
    <div className={styles.root}>
      <p className={styles.status}>
        Wklej tekst UltraStar / USDX albo wczytaj plik <code>.txt</code>. Tempo z
        nagłówka <code>#BPM</code> to wartość ×4 (metronom = BPM/4). Pozycje
        sylab trafiają w ticki projektu.
      </p>

      <label className={styles.urlBlock}>
        Plik UltraStar
        <input
          type="file"
          accept=".txt,text/plain"
          disabled={locked}
          onChange={(e) => {
            void handleFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </label>

      <label className={styles.urlBlock}>
        Tekst
        <Textarea
          value={text}
          disabled={locked}
          rows={12}
          placeholder={"#TITLE:…\n#BPM:320\n#GAP:0\n: 0 4 0 Hel\n…"}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
        />
      </label>

      {preview?.ok ? (
        <p className={styles.status} data-testid="ultrastar-import-preview">
          {preview.title ?? "Bez tytułu"}
          {preview.artist ? ` — ${preview.artist}` : ""} ·{" "}
          {preview.syllableCount} sylab / {preview.noteCount} nut · metronom{" "}
          {preview.metronomeBpm} BPM (#BPM {preview.ultrastarBpm}) · GAP{" "}
          {preview.gapMs} ms · {preview.tekst.clips.length} linii
        </p>
      ) : null}

      {preview && !preview.ok ? (
        <p className={styles.error} role="alert">
          {preview.message}
        </p>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button type="button" variant="secondary" disabled={locked} onClick={onCancel}>
          Anuluj
        </Button>
        <Button
          type="button"
          disabled={!canApply}
          onClick={() => {
            void handleApply();
          }}
        >
          {applyLabel}
        </Button>
      </div>
    </div>
  );
}

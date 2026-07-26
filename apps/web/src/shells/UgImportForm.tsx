/**
 * Shared UG import body: paste → section preview with editable bars → apply.
 * Optional Różdżka after import (V5: skip manual stretch when lengths are set).
 */

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Textarea } from "@stagesync/ui";
import {
  importUgText,
  reflowUgImportSectionBars,
  type UgImportOk,
  type UgImportOptions,
} from "@stagesync/shared";
import styles from "./UgImportForm.module.css";

export type UgImportApplyPayload = {
  result: UgImportOk;
  text: string;
  barsPerLine: number;
  /** Operator-edited bars per Forma section (same order as preview). */
  sectionBars: number[];
  /** When true, caller should run placeContentFromForma(..., "both") after merge. */
  runWand: boolean;
};

export type UgImportFormProps = {
  /** Hint under the title (target song / draft). */
  hint: string;
  applyLabel: string;
  disabled?: boolean;
  applying?: boolean;
  importOptions?: Omit<UgImportOptions, "barsPerLine">;
  onCancel: () => void;
  onApply: (payload: UgImportApplyPayload) => void | Promise<void>;
};

export function UgImportForm({
  hint,
  applyLabel,
  disabled = false,
  applying = false,
  importOptions,
  onCancel,
  onApply,
}: UgImportFormProps) {
  const [text, setText] = useState("");
  const [barsPerLine, setBarsPerLine] = useState(1);
  const [sectionBars, setSectionBars] = useState<number[]>([]);
  const [runWand, setRunWand] = useState(true);
  const [applyError, setApplyError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    return importUgText(text, {
      ppq: importOptions?.ppq,
      meter: importOptions?.meter,
      contentFloorTicks: importOptions?.contentFloorTicks,
      idPrefix: importOptions?.idPrefix,
      barsPerLine,
    });
  }, [
    text,
    barsPerLine,
    importOptions?.ppq,
    importOptions?.meter,
    importOptions?.contentFloorTicks,
    importOptions?.idPrefix,
  ]);

  const previewOk = parsed?.ok === true ? parsed : null;
  const sectionKey = previewOk
    ? previewOk.sections.map((s) => s.name).join("\0")
    : "";

  useEffect(() => {
    if (!parsed?.ok) {
      setSectionBars([]);
      return;
    }
    setSectionBars(parsed.sections.map((s) => s.estimatedBars));
    // Reset when section set or sketch barsPerLine changes — not when editing numbers.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional sectionKey/barsPerLine only
  }, [sectionKey, barsPerLine]);

  const parseError =
    text.trim() && parsed && !parsed.ok ? parsed.message : null;
  const error = applyError ?? parseError;

  return (
    <div className={styles.root}>
      <p className={styles.hint}>{hint}</p>
      <p className={styles.hint}>
        Ustaw takty każdej sekcji w podglądzie (rzeczywista forma utworu).
        Zaznacz Różdżkę, żeby od razu rozłożyć Tekst/Akordy — bez ręcznego
        rozciągania Formy na timeline.
      </p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <Textarea
        rows={10}
        value={text}
        aria-label="Tekst UG"
        placeholder={"[Verse]\n[C]Hello [G]world\n\n[Chorus]\n[Am]Line two"}
        disabled={disabled || applying}
        onChange={(e) => {
          setApplyError(null);
          setText(e.target.value);
        }}
      />
      <label className={styles.barsRow}>
        <span>Takty na linię (szkic)</span>
        <Input
          type="number"
          min={1}
          max={16}
          value={barsPerLine}
          aria-label="Takty na linię wokalu (szkic)"
          disabled={disabled || applying}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            setBarsPerLine(Number.isFinite(n) ? Math.min(16, Math.max(1, n)) : 1);
          }}
        />
      </label>
      {previewOk ? (
        <div className={styles.preview} aria-live="polite">
          <p className={styles.previewTitle}>
            Podgląd: {previewOk.sections.length} sekcji Formy,{" "}
            {previewOk.tekst.clips.length} linii tekstu,{" "}
            {previewOk.akordy.clips.length} akordów
          </p>
          <ul className={styles.sectionList}>
            {previewOk.sections.map((s, i) => (
              <li key={`${s.name}-${i}`} className={styles.sectionRow}>
                <span className={styles.sectionMeta}>
                  <strong>{s.name}</strong>
                  {" — "}
                  {s.lyricLines} lin. / {s.chordCount} ak.
                </span>
                <label className={styles.sectionBars}>
                  <span className={styles.srOnly}>Takty: {s.name}</span>
                  <Input
                    type="number"
                    min={1}
                    max={256}
                    value={sectionBars[i] ?? s.estimatedBars}
                    aria-label={`Takty sekcji ${s.name}`}
                    disabled={disabled || applying}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      const next = Math.min(
                        256,
                        Math.max(1, Number.isFinite(n) ? n : 1),
                      );
                      setSectionBars((prev) => {
                        const copy =
                          prev.length === previewOk.sections.length
                            ? [...prev]
                            : previewOk.sections.map((x) => x.estimatedBars);
                        copy[i] = next;
                        return copy;
                      });
                    }}
                  />
                  <span>takt.</span>
                </label>
              </li>
            ))}
          </ul>
          <label className={styles.wandCheck}>
            <input
              type="checkbox"
              checked={runWand}
              disabled={disabled || applying}
              onChange={(e) => setRunWand(e.target.checked)}
            />
            <span>Po imporcie uruchom Różdżkę (Tekst + Akordy → Forma)</span>
          </label>
        </div>
      ) : null}
      <div className={styles.actions}>
        <Button variant="ghost" disabled={applying} onClick={onCancel}>
          Anuluj
        </Button>
        <Button
          variant="primary"
          disabled={
            disabled ||
            applying ||
            !previewOk ||
            sectionBars.length !== previewOk.sections.length
          }
          loading={applying}
          onClick={() => {
            if (!previewOk) return;
            setApplyError(null);
            void (async () => {
              try {
                const reflowed = reflowUgImportSectionBars(
                  previewOk,
                  sectionBars,
                  {
                    ppq: importOptions?.ppq,
                    meter: importOptions?.meter,
                    contentFloorTicks: importOptions?.contentFloorTicks,
                  },
                );
                if (!reflowed.ok) {
                  setApplyError(reflowed.message);
                  return;
                }
                await onApply({
                  result: reflowed,
                  text,
                  barsPerLine,
                  sectionBars,
                  runWand,
                });
              } catch (err) {
                setApplyError(
                  err instanceof Error ? err.message : String(err),
                );
              }
            })();
          }}
        >
          {applyLabel}
        </Button>
      </div>
    </div>
  );
}

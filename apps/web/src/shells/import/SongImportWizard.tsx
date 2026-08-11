/**
 * Unified song import entry: pick UltraStar / UG / Audio sources, then
 * route to Combined (US+UG), Ultrastar-only, or UG-only forms.
 */

import { useMemo, useState } from "react";
import { Button } from "@stagesync/ui";
import type {
  TextAnchorBridgeOptions,
  UltrastarImportOk,
  UltrastarImportOptions,
  UgImportOptions,
} from "@stagesync/shared";
import {
  CombinedUsUgImportForm,
  type UsUgApplyPayload,
} from "./CombinedUsUgImportForm.js";
import { UgImportForm, type UgImportApplyPayload } from "./UgImportForm.js";
import { UltrastarImportForm } from "./UltrastarImportForm.js";
import styles from "./SongImportWizard.module.css";

export type SongImportSources = {
  ultrastar: boolean;
  ug: boolean;
  audio: boolean;
};

export type SongImportWizardProps = {
  applyLabel: string;
  disabled?: boolean;
  applying?: boolean;
  /** Prefill search fields. */
  initialTitle?: string;
  initialArtist?: string;
  /** Draft project id when overwriting (US+UG audio assets). */
  projectId?: string;
  importOptions?: TextAnchorBridgeOptions &
    UltrastarImportOptions &
    Omit<UgImportOptions, "barsPerLine">;
  onCancel: () => void;
  onApplyUsUg: (payload: UsUgApplyPayload) => void | Promise<void>;
  onApplyUltrastar: (result: UltrastarImportOk) => void | Promise<void>;
  onApplyUg: (payload: UgImportApplyPayload) => void | Promise<void>;
};

type Phase = "sources" | "form";

const DEFAULT_SOURCES: SongImportSources = {
  ultrastar: true,
  ug: true,
  audio: true,
};

export function SongImportWizard({
  applyLabel,
  disabled = false,
  applying = false,
  initialTitle,
  initialArtist,
  projectId,
  importOptions,
  onCancel,
  onApplyUsUg,
  onApplyUltrastar,
  onApplyUg,
}: SongImportWizardProps) {
  const [phase, setPhase] = useState<Phase>("sources");
  const [sources, setSources] = useState<SongImportSources>(DEFAULT_SOURCES);

  const canStart = sources.ultrastar || sources.ug;

  const mode = useMemo(() => {
    if (sources.ultrastar && sources.ug) return "usug" as const;
    if (sources.ultrastar) return "us" as const;
    if (sources.ug) return "ug" as const;
    return null;
  }, [sources]);

  function toggle(key: keyof SongImportSources) {
    setSources((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Audio only meaningful with US+UG bridge.
      if (key !== "audio" && !(next.ultrastar && next.ug)) {
        next.audio = false;
      }
      return next;
    });
  }

  if (phase === "sources") {
    return (
      <div className={styles.root}>
        <header className={styles.head}>
          <h3 className={styles.title}>Źródła importu</h3>
          <p className={styles.subtitle}>
            Wybierz UltraStar i/lub Ultimate Guitar. Audio (Smart Tempo) jest
            dostępne przy imporcie US+UG.
          </p>
        </header>
        <div className={styles.chips} role="group" aria-label="Źródła importu">
          <button
            type="button"
            className={[styles.chip, sources.ultrastar ? styles.chipOn : ""]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={sources.ultrastar}
            disabled={disabled || applying}
            onClick={() => toggle("ultrastar")}
          >
            UltraStar / USDB
          </button>
          <button
            type="button"
            className={[styles.chip, sources.ug ? styles.chipOn : ""]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={sources.ug}
            disabled={disabled || applying}
            onClick={() => toggle("ug")}
          >
            Ultimate Guitar
          </button>
          <button
            type="button"
            className={[styles.chip, sources.audio ? styles.chipOn : ""]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={sources.audio}
            disabled={
              disabled || applying || !(sources.ultrastar && sources.ug)
            }
            onClick={() => toggle("audio")}
            title={
              sources.ultrastar && sources.ug
                ? undefined
                : "Audio wymaga UltraStar i UG"
            }
          >
            Audio (Smart Tempo)
          </button>
        </div>
        {!canStart ? (
          <p className={styles.hint} role="status">
            Włącz przynajmniej UltraStar albo Ultimate Guitar.
          </p>
        ) : (
          <p className={styles.hint} role="status">
            {mode === "usug"
              ? sources.audio
                ? "Kreator: UltraStar → UG → Audio → Beat Mapper."
                : "Kreator: UltraStar → UG → Beat Mapper (bez audio)."
              : mode === "us"
                ? "Kreator: sam UltraStar (tekst + melodia)."
                : "Kreator: sam Ultimate Guitar (Forma + akordy)."}
          </p>
        )}
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            disabled={applying}
            onClick={onCancel}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={disabled || applying || !canStart}
            onClick={() => setPhase("form")}
          >
            Dalej
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "usug") {
    return (
      <CombinedUsUgImportForm
        applyLabel={applyLabel}
        disabled={disabled}
        applying={applying}
        importOptions={importOptions}
        projectId={projectId}
        initialTitle={initialTitle}
        initialArtist={initialArtist}
        includeAudioStep={sources.audio}
        onCancel={onCancel}
        onApply={onApplyUsUg}
      />
    );
  }

  if (mode === "us") {
    return (
      <UltrastarImportForm
        applyLabel={applyLabel}
        disabled={disabled}
        applying={applying}
        importOptions={importOptions}
        initialTitle={initialTitle}
        initialArtist={initialArtist}
        onCancel={onCancel}
        onApply={onApplyUltrastar}
      />
    );
  }

  return (
    <UgImportForm
      applyLabel={applyLabel}
      disabled={disabled}
      applying={applying}
      importOptions={importOptions}
      initialTitle={initialTitle}
      initialArtist={initialArtist}
      onCancel={onCancel}
      onApply={onApplyUg}
    />
  );
}

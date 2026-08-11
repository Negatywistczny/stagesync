import type { Dispatch, SetStateAction } from "react";
import { Button } from "@stagesync/ui";
import type { ImportWizardStep } from "./combinedImportHelpers.js";
import styles from "../CombinedUsUgImportForm.module.css";

type UsPreview = {
  ok: boolean;
  title?: string | null;
  artist?: string | null;
} | null;

export type CombinedImportFooterProps = {
  step: ImportWizardStep;
  locked: boolean;
  onCancel: () => void;
  go: (next: ImportWizardStep) => void;
  stepBeforeAudio: () => ImportWizardStep;
  stepBeforeBeatmap: () => ImportWizardStep;
  stepAfterUg: () => ImportWizardStep;
  canGoNextUs: boolean;
  canGoNextUg: boolean;
  canGoNextAudio: boolean;
  canApply: boolean;
  usTitle: string;
  usArtist: string;
  usPreview: UsPreview;
  setUgTitle: Dispatch<SetStateAction<string>>;
  setUgArtist: Dispatch<SetStateAction<string>>;
  setConfirmWeak: Dispatch<SetStateAction<boolean>>;
  hasAudio: boolean;
  busyApply: boolean;
  applying: boolean;
  applyLabel: string;
  apply: () => void | Promise<void>;
};

export function CombinedImportFooter({
  step,
  locked,
  onCancel,
  go,
  stepBeforeAudio,
  stepBeforeBeatmap,
  stepAfterUg,
  canGoNextUs,
  canGoNextUg,
  canGoNextAudio,
  canApply,
  usTitle,
  usArtist,
  usPreview,
  setUgTitle,
  setUgArtist,
  setConfirmWeak,
  hasAudio,
  busyApply,
  applying,
  applyLabel,
  apply,
}: CombinedImportFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerLeft}>
        {step === "us" ? (
          <Button
            type="button"
            variant="ghost"
            disabled={locked}
            onClick={onCancel}
          >
            Anuluj
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled={locked}
            onClick={() =>
              go(
                step === "ug"
                  ? "us"
                  : step === "audio"
                    ? stepBeforeAudio()
                    : stepBeforeBeatmap(),
              )
            }
          >
            Wstecz
          </Button>
        )}
      </div>
      <div className={styles.footerRight}>
        {step === "us" ? (
          <Button
            type="button"
            variant="primary"
            disabled={locked || !canGoNextUs}
            onClick={() => {
              const fromUsTitle =
                usTitle.trim() ||
                (usPreview?.ok === true
                  ? (usPreview.title?.trim() ?? "")
                  : "") ||
                "";
              const fromUsArtist =
                usArtist.trim() ||
                (usPreview?.ok === true
                  ? (usPreview.artist?.trim() ?? "")
                  : "") ||
                "";
              if (fromUsTitle)
                setUgTitle((prev) => prev.trim() || fromUsTitle);
              if (fromUsArtist)
                setUgArtist((prev) => prev.trim() || fromUsArtist);
              go("ug");
            }}
          >
            Dalej
          </Button>
        ) : null}
        {step === "ug" ? (
          <Button
            type="button"
            variant="primary"
            disabled={locked || !canGoNextUg}
            onClick={() => {
              setConfirmWeak(false);
              go(stepAfterUg());
            }}
          >
            Dalej
          </Button>
        ) : null}
        {step === "audio" ? (
          <Button
            type="button"
            variant="primary"
            disabled={locked || !canGoNextAudio}
            onClick={() => go("beatmap")}
          >
            {hasAudio ? "Dalej" : "Dalej bez audio"}
          </Button>
        ) : null}
        {step === "beatmap" ? (
          <Button
            type="button"
            variant="primary"
            disabled={locked || !canApply}
            loading={busyApply || Boolean(applying)}
            onClick={() => void apply()}
          >
            {applyLabel}
          </Button>
        ) : null}
      </div>
    </footer>
  );
}

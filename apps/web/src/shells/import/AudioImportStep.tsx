import { Button, Input } from "@stagesync/ui";
import { Music, Check } from "lucide-react";
import { AudioDropzone } from "./AudioDropzone.js";
import { ImportProgress } from "./ImportProgress.js";
import { formatBytesMb } from "@lib/client/memoryPressure.js";
import styles from "../CombinedUsUgImportForm.module.css";

interface AudioImportStepProps {
  meta: { title: string; subtitle: string };
  includeAudioStep: boolean;
  projectAudioAssets: any[];
  selectedAssetId: string | null;
  smartTempoAudio: any;
  locked: boolean;
  busyNet: boolean;
  ytJobBusy: boolean;
  hasAudio: boolean;
  pipelineStages: any[];
  youtubeUrlDraft: string;
  youtubeAvailable: boolean;
  resolvedYoutubeId?: string | null;
  setYoutubeUrlDraft: (v: string) => void;
  ingestProjectAsset: (id: string) => Promise<void>;
  ingestLocalFile: (file: File) => Promise<void>;
  fetchYoutubeAudio: (id?: string | null) => Promise<void>;
}

export function AudioImportStep({
  meta,
  includeAudioStep,
  projectAudioAssets,
  selectedAssetId,
  smartTempoAudio,
  locked,
  busyNet,
  ytJobBusy,
  hasAudio,
  pipelineStages,
  youtubeUrlDraft,
  youtubeAvailable,
  resolvedYoutubeId,
  setYoutubeUrlDraft,
  ingestProjectAsset,
  ingestLocalFile,
  fetchYoutubeAudio,
}: AudioImportStepProps) {
  if (!includeAudioStep) return null;

  return (
    <>
      <header className={styles.stepHead}>
        <h3 className={styles.stepTitle}>{meta.title}</h3>
        <p className={styles.stepSubtitle}>{meta.subtitle}</p>
      </header>
      <div className={styles.stepPanel}>
        {/* Top Row: 3 equal sections (Project Files, Disk File / DnD, YouTube) */}
        <div className={styles.audioSplit3Col}>
          {/* Card 1: Project Audio Files */}
          <div className={styles.audioCard}>
            <h4 className={styles.audioCardTitle}>Pliki w projekcie</h4>
            <div className={styles.projectFilesSection}>
              {projectAudioAssets.length > 0 ? (
                <ul
                  className={styles.projectFilesList}
                  aria-label="Pliki audio w projekcie"
                >
                  {projectAudioAssets.map((asset) => {
                    const isSelected =
                      selectedAssetId === asset.id ||
                      smartTempoAudio?.assetId === asset.id;
                    const durationLabel = asset.durationMs
                      ? `${Math.floor(asset.durationMs / 60000)}:${String(
                          Math.floor((asset.durationMs % 60000) / 1000),
                        ).padStart(2, "0")}`
                      : null;
                    const sizeLabel = asset.sizeBytes
                      ? formatBytesMb(asset.sizeBytes)
                      : null;
                    const metaLabel = [durationLabel, sizeLabel]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <li key={asset.id}>
                        <button
                          type="button"
                          className={[
                            styles.projectFileItem,
                            isSelected ? styles.projectFileItemActive : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          disabled={locked}
                          onClick={() => void ingestProjectAsset(asset.id)}
                        >
                          <input
                            type="radio"
                            name="projectAudioSelect"
                            checked={isSelected}
                            readOnly
                            className={styles.projectFileRadio}
                          />
                          <Music className={styles.projectFileIcon} size={18} />
                          <div className={styles.projectFileInfo}>
                            <span className={styles.projectFileName}>
                              {asset.originalName || asset.storageName}
                            </span>
                            {metaLabel ? (
                              <span className={styles.projectFileMeta}>
                                {metaLabel}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.emptyFilesNotice}>
                  Brak wgranych plików audio w projekcie.
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Disk File / DnD */}
          <div className={styles.audioCard}>
            <h4 className={styles.audioCardTitle}>Plik z dysku</h4>
            <AudioDropzone
              compact
              disabled={locked}
              busy={busyNet && !ytJobBusy && !selectedAssetId}
              onSelectFile={(f: File) => void ingestLocalFile(f)}
            />
          </div>

          {/* Card 3: YouTube */}
          <div className={styles.audioCard}>
            <h4 className={styles.audioCardTitle}>YouTube</h4>
            <div className={styles.ytInlineGroup}>
              <Input
                type="url"
                className={styles.ytInput}
                value={youtubeUrlDraft}
                aria-label="Link YouTube"
                placeholder="https://www.youtube.com/watch?v=…"
                disabled={locked}
                onChange={(e) => setYoutubeUrlDraft(e.target.value)}
              />
              <Button
                type="button"
                className={styles.ytButton}
                variant="secondary"
                disabled={locked || !youtubeAvailable}
                loading={ytJobBusy}
                onClick={() => void fetchYoutubeAudio(resolvedYoutubeId)}
              >
                Pobierz z YouTube
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Pipeline Progress Checklist */}
        {ytJobBusy ||
        busyNet ||
        hasAudio ||
        pipelineStages.some((s) => s.status !== "pending") ? (
          <div className={styles.pipelineSection}>
            <h5 className={styles.pipelineTitle}>Postęp przygotowania audio</h5>
            <ul className={styles.pipelineList}>
              {pipelineStages.map((s) => {
                const isDone = s.status === "done";
                const isActive = s.status === "running";

                return (
                  <li key={s.id} className={styles.pipelineStep}>
                    <div
                      className={[
                        styles.pipelineStepHeader,
                        isDone
                          ? styles.pipelineStepDone
                          : isActive
                            ? styles.pipelineStepActive
                            : styles.pipelineStepPending,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span
                        className={[
                          styles.pipelineBadge,
                          isDone
                            ? styles.pipelineBadgeDone
                            : isActive
                              ? styles.pipelineBadgeActive
                              : styles.pipelineBadgePending,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {isDone ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                      <span>{s.label}</span>
                    </div>
                    {isActive && s.progress != null && s.progress >= 0 ? (
                      <div className={styles.pipelineProgressWrapper}>
                        <ImportProgress
                          label={`${Math.round(s.progress)}%`}
                          value={s.progress}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </>
  );
}

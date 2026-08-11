/**
 * Combined UltraStar + UG import wizard (Text-Anchor Bridging + Smart Tempo).
 * Steps: UltraStar → UG → Audio → Beat Mapper → Apply.
 */

export type {
  UsUgApplyPayload,
  CombinedUsUgImportFormProps,
} from "./import/combinedImportHelpers.js";

import { UsImportStep } from "./import/UsImportStep.js";
import { UgImportStep } from "./import/UgImportStep.js";
import { AudioImportStep } from "./import/AudioImportStep.js";
import { BeatmapImportStep } from "./import/BeatmapImportStep.js";
import { CombinedImportFooter } from "./import/CombinedImportFooter.js";
import { useCombinedUsUgImport } from "./import/useCombinedUsUgImport.js";
import type { CombinedUsUgImportFormProps } from "./import/combinedImportHelpers.js";
import styles from "./CombinedUsUgImportForm.module.css";

export function CombinedUsUgImportForm(props: CombinedUsUgImportFormProps) {
  const { applyLabel, onCancel, applying = false } = props;
  const wizard = useCombinedUsUgImport(props);

  return (
    <div className={styles.wizard}>
      <div className={styles.body}>
        {wizard.step === "us" ? (
          <UsImportStep
            meta={wizard.meta}
            showUsdbAccount={wizard.showUsdbAccount}
            setShowUsdbAccount={wizard.setShowUsdbAccount}
            disabled={wizard.disabled}
            applying={wizard.applying || false}
            setAccountBusy={wizard.setAccountBusy}
            usTitle={wizard.usTitle}
            setUsTitle={wizard.setUsTitle}
            usArtist={wizard.usArtist}
            setUsArtist={wizard.setUsArtist}
            locked={wizard.locked}
            busyNet={wizard.busyNet}
            searchUs={wizard.searchUs}
            usHits={wizard.usHits}
            selectedUsUrl={wizard.selectedUsUrl}
            pickUsHit={wizard.pickUsHit}
            usText={wizard.usText}
            setUsText={wizard.setUsText}
            setGridBpmDraft={wizard.setGridBpmDraft}
            usPreview={wizard.usPreview}
            stepNotice={wizard.stepNotice}
          />
        ) : null}

        {wizard.step === "ug" ? (
          <UgImportStep
            meta={wizard.meta}
            ugTitle={wizard.ugTitle}
            setUgTitle={wizard.setUgTitle}
            ugArtist={wizard.ugArtist}
            setUgArtist={wizard.setUgArtist}
            locked={wizard.locked}
            busyNet={wizard.busyNet}
            searchUg={wizard.searchUg}
            sortedUgHits={wizard.sortedUgHits}
            selectedUgUrl={wizard.selectedUgUrl}
            pickUgHit={wizard.pickUgHit}
            ugHitScores={wizard.ugHitScores}
            ugHitScoresBusy={wizard.ugHitScoresBusy}
            ugText={wizard.ugText}
            setUgText={wizard.setUgText}
            setGridBpmDraft={wizard.setGridBpmDraft}
            bridged={wizard.bridged}
            stepNotice={wizard.stepNotice}
          />
        ) : null}

        {wizard.step === "audio" ? (
          <AudioImportStep
            meta={wizard.meta}
            includeAudioStep={wizard.includeAudioStep}
            projectAudioAssets={wizard.projectAudioAssets}
            selectedAssetId={wizard.selectedAssetId}
            smartTempoAudio={wizard.smartTempoAudio}
            locked={wizard.locked}
            busyNet={wizard.busyNet}
            ytJobBusy={wizard.ytJobBusy}
            hasAudio={wizard.hasAudio}
            pipelineStages={wizard.pipelineStages}
            youtubeUrlDraft={wizard.youtubeUrlDraft}
            youtubeAvailable={wizard.youtubeAvailable}
            resolvedYoutubeId={wizard.resolvedYoutubeId}
            setYoutubeUrlDraft={wizard.setYoutubeUrlDraft}
            ingestProjectAsset={wizard.ingestProjectAsset}
            ingestLocalFile={wizard.ingestLocalFile}
            fetchYoutubeAudio={wizard.fetchYoutubeAudio}
          />
        ) : null}

        {wizard.step === "beatmap" && wizard.bridgeOk ? (
          <BeatmapImportStep
            meta={wizard.meta}
            bridgeOk={wizard.bridgeOk}
            stepNotice={wizard.stepNotice}
            smartTempoAudio={wizard.smartTempoAudio}
            audioStartOffsetMs={wizard.audioStartOffsetMs}
            localBuffer={wizard.localBuffer}
            displayTempoNodes={wizard.displayTempoNodes}
            handleTempoNodesChange={wizard.handleTempoNodesChange}
            handleAudioStartOffsetChange={wizard.handleAudioStartOffsetChange}
            gridBpmDisplay={wizard.gridBpmDisplay}
            setGridBpmDraft={wizard.setGridBpmDraft}
            usTitle={wizard.usTitle}
            usPreview={wizard.usPreview}
            ingestLocalFile={wizard.ingestLocalFile}
            beatPlayToggleRef={wizard.beatPlayToggleRef}
            locked={wizard.locked}
            weakAlign={wizard.weakAlign}
            confirmWeak={wizard.confirmWeak}
            setConfirmWeak={wizard.setConfirmWeak}
          />
        ) : null}

        {wizard.error ? (
          <p className={styles.error} role="alert">
            {wizard.error}
          </p>
        ) : null}
      </div>

      <CombinedImportFooter
        step={wizard.step}
        locked={wizard.locked}
        onCancel={onCancel}
        go={wizard.go}
        stepBeforeAudio={wizard.stepBeforeAudio}
        stepBeforeBeatmap={wizard.stepBeforeBeatmap}
        stepAfterUg={wizard.stepAfterUg}
        canGoNextUs={wizard.canGoNextUs}
        canGoNextUg={wizard.canGoNextUg}
        canGoNextAudio={wizard.canGoNextAudio}
        canApply={wizard.canApply}
        usTitle={wizard.usTitle}
        usArtist={wizard.usArtist}
        usPreview={wizard.usPreview}
        setUgTitle={wizard.setUgTitle}
        setUgArtist={wizard.setUgArtist}
        setConfirmWeak={wizard.setConfirmWeak}
        hasAudio={wizard.hasAudio}
        busyApply={wizard.busyApply}
        applying={applying}
        applyLabel={applyLabel}
        apply={wizard.apply}
      />
    </div>
  );
}

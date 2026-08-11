import React from "react";
import { Button, Input, Textarea } from "@stagesync/ui";
import type {
  UltrastarImportResult,
  UltrastarSearchHit,
} from "@stagesync/shared";
import { UsdbAccountPanel } from "./UsdbAccountPanel.js";
import styles from "./CombinedUsUgImportForm.module.css";

export type UsImportStepProps = {
  meta: { title: string; subtitle: string };
  showUsdbAccount: boolean;
  setShowUsdbAccount: (open: boolean) => void;
  disabled: boolean;
  applying: boolean;
  setAccountBusy: (busy: boolean) => void;
  usTitle: string;
  setUsTitle: (title: string) => void;
  usArtist: string;
  setUsArtist: (artist: string) => void;
  locked: boolean;
  busyNet: boolean;
  searchUs: () => Promise<void>;
  usHits: UltrastarSearchHit[];
  selectedUsUrl: string | null;
  pickUsHit: (hit: UltrastarSearchHit) => Promise<void>;
  usText: string;
  setUsText: (text: string) => void;
  setGridBpmDraft: (bpm: string | null) => void;
  usPreview: UltrastarImportResult | null;
  stepNotice: string | null;
};

export function UsImportStep({
  meta,
  showUsdbAccount,
  setShowUsdbAccount,
  disabled,
  applying,
  setAccountBusy,
  usTitle,
  setUsTitle,
  usArtist,
  setUsArtist,
  locked,
  busyNet,
  searchUs,
  usHits,
  selectedUsUrl,
  pickUsHit,
  usText,
  setUsText,
  setGridBpmDraft,
  usPreview,
  stepNotice,
}: UsImportStepProps) {
  return (
    <>
      <header className={styles.stepHead}>
        <h3 className={styles.stepTitle}>{meta.title}</h3>
        <p className={styles.stepSubtitle}>{meta.subtitle}</p>
      </header>
      <div className={styles.stepPanel}>
        <UsdbAccountPanel
          open={showUsdbAccount}
          onOpenChange={setShowUsdbAccount}
          disabled={disabled || applying}
          onBusyChange={setAccountBusy}
        />
        <div className={styles.studioSplit}>
          <div className={styles.studioColLeft}>
            <div className={styles.fieldStack}>
              <Input
                type="text"
                value={usTitle}
                aria-label="Tytuł USDB"
                placeholder="Tytuł"
                disabled={locked}
                onChange={(e) => setUsTitle(e.target.value)}
              />
              <div className={styles.artistSearchRow}>
                <Input
                  type="text"
                  value={usArtist}
                  aria-label="Artysta USDB"
                  placeholder="Artysta"
                  disabled={locked}
                  onChange={(e) => setUsArtist(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={locked || !usTitle.trim()}
                  loading={busyNet}
                  onClick={() => void searchUs()}
                >
                  Szukaj w USDB
                </Button>
              </div>
            </div>
            {usHits.length > 0 ? (
              <ul className={styles.resultList} aria-label="Wyniki USDB">
                {usHits.map((hit, i) => {
                  const label =
                    [hit.title, hit.artist].filter(Boolean).join(" — ") ||
                    `Wersja ${i + 1}`;
                  const metaText = [
                    hit.edition,
                    hit.language,
                    hit.rating != null ? `★ ${hit.rating}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const selected = Boolean(
                    hit.url && hit.url === selectedUsUrl,
                  );
                  return (
                    <li key={`${hit.url ?? i}-${i}`}>
                      <button
                        type="button"
                        className={[
                          styles.resultCard,
                          selected ? styles.resultCardSelected : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={locked || !hit.url}
                        onClick={() => void pickUsHit(hit)}
                      >
                        <span className={styles.resultTitle}>
                          UltraStar: {label}
                        </span>
                        {metaText ? (
                          <span className={styles.resultMeta}>{metaText}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.notice} role="status">
                Wyszukaj w USDB albo wklej plik po prawej.
              </p>
            )}
          </div>
          <div className={styles.studioColRight}>
            <p className={styles.previewLabel}>Podgląd UltraStar</p>
            <Textarea
              className={styles.previewTextarea}
              value={usText}
              aria-label="Tekst UltraStar"
              placeholder="Wklej UltraStar .txt…"
              disabled={locked}
              rows={12}
              onChange={(e) => {
                setUsText(e.target.value);
                setGridBpmDraft(null);
              }}
            />
            {usPreview?.ok ? (
              <p className={styles.notice} role="status">
                {usPreview.syllableCount} sylab (UltraStar Tekst)
                {usPreview.youtubeVideoId
                  ? ` · YouTube ${usPreview.youtubeVideoId}`
                  : ""}
              </p>
            ) : stepNotice ? (
              <p className={styles.notice} role="status">
                {stepNotice}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

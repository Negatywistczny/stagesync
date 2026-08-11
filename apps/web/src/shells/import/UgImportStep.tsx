import React from "react";
import { Button, Input, Textarea } from "@stagesync/ui";
import type { UgSearchHit, TextAnchorBridgeResult } from "@stagesync/shared";
import { TEXT_ANCHOR_WEAK_ALIGN } from "@stagesync/shared";
import styles from "../CombinedUsUgImportForm.module.css";

export type UgImportStepProps = {
  meta: { title: string; subtitle: string };
  ugTitle: string;
  setUgTitle: (title: string) => void;
  ugArtist: string;
  setUgArtist: (artist: string) => void;
  locked: boolean;
  busyNet: boolean;
  searchUg: () => Promise<void>;
  sortedUgHits: UgSearchHit[];
  selectedUgUrl: string | null;
  pickUgHit: (hit: UgSearchHit) => Promise<void>;
  ugHitScores: Record<string, number>;
  ugHitScoresBusy: boolean;
  ugText: string;
  setUgText: (text: string) => void;
  setGridBpmDraft: (bpm: string | null) => void;
  bridged: TextAnchorBridgeResult | null;
  stepNotice: string | null;
};

export function UgImportStep({
  meta,
  ugTitle,
  setUgTitle,
  ugArtist,
  setUgArtist,
  locked,
  busyNet,
  searchUg,
  sortedUgHits,
  selectedUgUrl,
  pickUgHit,
  ugHitScores,
  ugHitScoresBusy,
  ugText,
  setUgText,
  setGridBpmDraft,
  bridged,
  stepNotice,
}: UgImportStepProps) {
  return (
    <>
      <header className={styles.stepHead}>
        <h3 className={styles.stepTitle}>{meta.title}</h3>
        <p className={styles.stepSubtitle}>{meta.subtitle}</p>
      </header>
      <div className={styles.stepPanel}>
        <div className={styles.studioSplit}>
          <div className={styles.studioColLeft}>
            <div className={styles.fieldStack}>
              <Input
                type="text"
                value={ugTitle}
                aria-label="Tytuł UG"
                placeholder="Tytuł"
                disabled={locked}
                onChange={(e) => setUgTitle(e.target.value)}
              />
              <div className={styles.artistSearchRow}>
                <Input
                  type="text"
                  value={ugArtist}
                  aria-label="Artysta UG"
                  placeholder="Artysta"
                  disabled={locked}
                  onChange={(e) => setUgArtist(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={locked || !ugTitle.trim()}
                  loading={busyNet}
                  onClick={() => void searchUg()}
                >
                  Szukaj w UG
                </Button>
              </div>
            </div>
            {sortedUgHits.length > 0 ? (
              <ul className={styles.resultList} aria-label="Wyniki UG">
                {sortedUgHits.map((hit, i) => {
                  const label =
                    [hit.title, hit.artist].filter(Boolean).join(" — ") ||
                    `Wersja ${i + 1}`;
                  const metaText = [
                    hit.type,
                    hit.rating != null ? `★ ${hit.rating}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const selected = Boolean(
                    hit.url && hit.url === selectedUgUrl,
                  );
                  const score = hit.url ? ugHitScores[hit.url] : undefined;
                  const scorePct =
                    score != null ? Math.round(score * 100) : null;
                  const alignClass =
                    score != null
                      ? score >= 0.7
                        ? styles.alignHigh
                        : score >= 0.4
                          ? styles.alignMedium
                          : styles.alignLow
                      : "";

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
                        onClick={() => void pickUgHit(hit)}
                      >
                        <div className={styles.resultCardHeader}>
                          <span className={styles.resultTitle}>
                            UG: {label}
                          </span>
                          {scorePct != null ? (
                            <span
                              className={`${styles.alignBadge} ${alignClass}`}
                              title={`Zgodność tekstu z UltraStar: ${scorePct}%`}
                            >
                              Zgodność: {scorePct}%
                            </span>
                          ) : ugHitScoresBusy ? (
                            <span className={styles.resultMeta}>Liczenie…</span>
                          ) : null}
                        </div>
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
                Wyszukaj w UG albo wklej tabulatury po prawej.
              </p>
            )}
          </div>
          <div className={styles.studioColRight}>
            <p className={styles.previewLabel}>Podgląd Ultimate Guitar</p>
            <Textarea
              className={styles.previewTextarea}
              value={ugText}
              aria-label="Tekst Ultimate Guitar"
              placeholder="Wklej ChordPro / UG…"
              disabled={locked}
              rows={12}
              onChange={(e) => {
                setUgText(e.target.value);
                setGridBpmDraft(null);
              }}
            />
            {ugText.trim() && bridged?.ok ? (
              <p className={styles.notice} role="status">
                Zgodność z UltraStar:{" "}
                <span
                  className={`${styles.alignBadge} ${
                    bridged.alignScore >= 0.7
                      ? styles.alignHigh
                      : bridged.alignScore >= 0.4
                        ? styles.alignMedium
                        : styles.alignLow
                  }`}
                >
                  {Math.round(bridged.alignScore * 100)}%
                </span>
                {bridged.alignScore < TEXT_ANCHOR_WEAK_ALIGN
                  ? " (Słabe dopasowanie)"
                  : " (Dobre dopasowanie)"}
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

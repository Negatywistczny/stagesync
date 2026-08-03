/**
 * Shared UG import body: search / URL fetch → section preview → apply.
 * Paste ChordPro remains as fallback (offline / ręczna korekta).
 */

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Textarea } from "@stagesync/ui";
import {
  importUgText,
  reflowUgImportSectionBars,
  type UgImportOk,
  type UgImportOptions,
  type UgSearchHit,
  type UgTabMetadata,
} from "@stagesync/shared";
import {
  fetchUgTabFromServer,
  searchUgTabs,
} from "../lib/ugImportApi.js";
import styles from "./UgImportForm.module.css";

export type UgImportApplyPayload = {
  result: UgImportOk;
  text: string;
  barsPerLine: number;
  /** Operator-edited bars per Forma section (same order as preview). */
  sectionBars: number[];
  /** When true, caller should run placeContentFromForma(..., "both") after merge. */
  runWand: boolean;
  metadata?: UgTabMetadata | null;
};

export type UgImportFormProps = {
  applyLabel: string;
  disabled?: boolean;
  applying?: boolean;
  importOptions?: Omit<UgImportOptions, "barsPerLine">;
  /** Prefill UG search from project name / artist when known. */
  initialTitle?: string;
  initialArtist?: string;
  onCancel: () => void;
  onApply: (payload: UgImportApplyPayload) => void | Promise<void>;
};

export function UgImportForm({
  applyLabel,
  disabled = false,
  applying = false,
  importOptions,
  initialTitle = "",
  initialArtist = "",
  onCancel,
  onApply,
}: UgImportFormProps) {
  const [searchTitle, setSearchTitle] = useState(() => initialTitle.trim());
  const [searchArtist, setSearchArtist] = useState(() => initialArtist.trim());
  const [searchHits, setSearchHits] = useState<UgSearchHit[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [metadata, setMetadata] = useState<UgTabMetadata | null>(null);

  const [text, setText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [barsPerLine, setBarsPerLine] = useState(1);
  const [sectionBars, setSectionBars] = useState<number[]>([]);
  const [runWand, setRunWand] = useState(true);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [fetchStatus, setFetchStatus] = useState<string | null>(null);

  const busy = disabled || applying || searching || fetching;

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

  async function onSearch() {
    setApplyError(null);
    setSearchMessage(null);
    setSearching(true);
    try {
      const data = await searchUgTabs(searchTitle, searchArtist);
      setSearchHits(data.results);
      setSearchMessage(
        data.results.length
          ? null
          : data.message ?? "Brak wyników na Ultimate Guitar.",
      );
    } catch (err) {
      setSearchHits([]);
      setSearchMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  }

  async function onFetchUrl(overrideUrl?: string) {
    const target = (overrideUrl ?? url).trim();
    setApplyError(null);
    setFetchStatus(null);
    if (!target) {
      setApplyError("Wklej link do zakładki Ultimate Guitar (Chords).");
      return;
    }
    setFetching(true);
    setFetchStatus("Pobieranie z Ultimate Guitar…");
    try {
      const data = await fetchUgTabFromServer(target);
      setUrl(data.metadata.url || target);
      setMetadata(data.metadata);
      setText(data.content);
      if (data.metadata.title?.trim()) {
        setSearchTitle((prev) => prev.trim() || data.metadata.title!.trim());
      }
      if (data.metadata.artist?.trim()) {
        setSearchArtist((prev) => prev.trim() || data.metadata.artist!.trim());
      }
      setShowPaste(false);
      setFetchStatus(
        [
          data.metadata.title ?? "Zakładka",
          data.metadata.artist ? `— ${data.metadata.artist}` : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (err) {
      setFetchStatus(null);
      setApplyError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className={styles.root}>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.searchRow}>
        <Input
          type="text"
          value={searchTitle}
          aria-label="Tytuł do wyszukiwania UG"
          placeholder="Tytuł"
          disabled={busy}
          onChange={(e) => setSearchTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onSearch();
            }
          }}
        />
        <Input
          type="text"
          value={searchArtist}
          aria-label="Artysta do wyszukiwania UG"
          placeholder="Artysta (opcjonalnie)"
          disabled={busy}
          onChange={(e) => setSearchArtist(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onSearch();
            }
          }}
        />
        <Button
          variant="secondary"
          disabled={busy || !searchTitle.trim()}
          loading={searching}
          onClick={() => void onSearch()}
        >
          Szukaj na UG
        </Button>
      </div>
      {searchMessage ? (
        <p className={styles.status} role="status">
          {searchMessage}
        </p>
      ) : null}
      {searchHits.length > 0 ? (
        <ul className={styles.results} role="listbox" aria-label="Wyniki Ultimate Guitar">
          {searchHits.map((hit, i) => {
            const label = [hit.title, hit.artist].filter(Boolean).join(" — ");
            const disabledHit = !hit.url || busy;
            return (
              <li key={`${hit.id ?? hit.url ?? i}-${i}`}>
                <button
                  type="button"
                  className={styles.resultBtn}
                  role="option"
                  disabled={disabledHit}
                  onClick={() => {
                    if (!hit.url) return;
                    setUrl(hit.url);
                    void onFetchUrl(hit.url);
                  }}
                >
                  <span className={styles.resultTitle}>{label || hit.url}</span>
                  {hit.type ? (
                    <span className={styles.resultMeta}>{hit.type}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <label className={styles.urlBlock}>
        <span>Link do zakładki (Chords)</span>
        <Input
          type="url"
          value={url}
          aria-label="Link Ultimate Guitar"
          placeholder="https://tabs.ultimate-guitar.com/tab/…"
          disabled={busy}
          onChange={(e) => {
            setUrl(e.target.value);
            setApplyError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onFetchUrl();
            }
          }}
        />
      </label>
      <div className={styles.fetchRow}>
        <Button
          variant="secondary"
          disabled={busy || !url.trim()}
          loading={fetching}
          onClick={() => void onFetchUrl()}
        >
          Pobierz z UG
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => setShowPaste((v) => !v)}
        >
          {showPaste ? "Ukryj wklejanie" : "Wklej tekst ręcznie"}
        </Button>
      </div>
      {fetchStatus ? (
        <p className={styles.status} role="status">
          {fetchStatus}
          {metadata?.tonality ? ` · ${metadata.tonality}` : ""}
          {metadata?.tempo != null ? ` · ${metadata.tempo} BPM` : ""}
        </p>
      ) : null}

      {showPaste || text ? (
        <Textarea
          rows={showPaste ? 10 : 4}
          value={text}
          aria-label="Tekst UG"
          placeholder={
            showPaste
              ? "[Verse]\n[C]Hello [G]world\n\n[Chorus]\n[Am]Line two"
              : undefined
          }
          readOnly={!showPaste}
          disabled={busy}
          onChange={(e) => {
            setApplyError(null);
            setMetadata(null);
            setText(e.target.value);
          }}
        />
      ) : null}

      <label className={styles.barsRow}>
        <span>Takty na linię (szkic)</span>
        <Input
          type="number"
          min={1}
          max={16}
          value={barsPerLine}
          aria-label="Takty na linię wokalu (szkic)"
          disabled={busy}
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
                    disabled={busy}
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
              disabled={busy}
              onChange={(e) => setRunWand(e.target.checked)}
            />
            <span>Po imporcie uruchom Różdżkę (Tekst + Akordy → Forma)</span>
          </label>
        </div>
      ) : null}
      <div className={styles.actions}>
        <Button variant="ghost" disabled={applying || fetching || searching} onClick={onCancel}>
          Anuluj
        </Button>
        <Button
          variant="primary"
          disabled={
            busy ||
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
                  metadata,
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

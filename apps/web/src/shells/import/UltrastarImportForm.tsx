/**
 * UltraStar / USDX import: USDB search / URL fetch → preview → apply.
 * Paste / .txt file remain as offline fallback (same pattern as UG import).
 */

import { useMemo, useState } from "react";
import { Button, Input, Textarea } from "@stagesync/ui";
import {
  importUltrastarText,
  type UltrastarImportOk,
  type UltrastarImportOptions,
  type UltrastarSearchHit,
  type UltrastarSongMetadata,
} from "@stagesync/shared";
import {
  fetchUltrastarFromServer,
  searchUltrastarSongs,
} from "@lib/shell-operator/ultrastarImportApi.js";
import { yieldToUi } from "@lib/audio/audioTempoAnalysis.js";
import {
  UsdbAccountPanel,
  shouldOpenUsdbAccount,
  type UsdbAccountStatusInfo,
} from "./UsdbAccountPanel.js";
import styles from "./UgImportForm.module.css";

export type UltrastarImportFormProps = {
  applyLabel: string;
  disabled?: boolean;
  applying?: boolean;
  importOptions?: UltrastarImportOptions;
  /** Prefill USDB search from project name / artist when known. */
  initialTitle?: string;
  initialArtist?: string;
  onCancel: () => void;
  onApply: (result: UltrastarImportOk) => void | Promise<void>;
};

export function UltrastarImportForm({
  applyLabel,
  disabled = false,
  applying = false,
  importOptions,
  initialTitle = "",
  initialArtist = "",
  onCancel,
  onApply,
}: UltrastarImportFormProps) {
  const [searchTitle, setSearchTitle] = useState(() => initialTitle.trim());
  const [searchArtist, setSearchArtist] = useState(() => initialArtist.trim());
  const [searchHits, setSearchHits] = useState<UltrastarSearchHit[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [metadata, setMetadata] = useState<UltrastarSongMetadata | null>(null);
  const [fetchStatus, setFetchStatus] = useState<string | null>(null);

  const [text, setText] = useState("");
  /** Paste / file always available (offline fallback) — not buried behind a toggle. */
  const [showPaste, setShowPaste] = useState(true);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [busyApply, setBusyApply] = useState(false);

  const [showAccount, setShowAccount] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountInfo, setAccountInfo] = useState<UsdbAccountStatusInfo>({
    configured: false,
    user: "",
    loaded: false,
  });

  const locked =
    disabled || applying || searching || fetching || busyApply || accountBusy;

  const preview = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    return importUltrastarText(trimmed, importOptions);
  }, [text, importOptions]);

  const parseError =
    text.trim() && preview && !preview.ok ? preview.message : null;
  const error = applyError ?? parseError;

  async function onSearch() {
    setApplyError(null);
    setSearchMessage(null);
    setSearching(true);
    try {
      const data = await searchUltrastarSongs(searchTitle, searchArtist);
      setSearchHits(data.results);
      setSearchMessage(
        data.results.length ? null : (data.message ?? "Brak wyników na USDB."),
      );
    } catch (err) {
      setSearchHits([]);
      const message = err instanceof Error ? err.message : String(err);
      setSearchMessage(message);
      if (shouldOpenUsdbAccount(message)) {
        setShowAccount(true);
      }
    } finally {
      setSearching(false);
    }
  }

  async function onFetchUrl(overrideUrl?: string) {
    const target = (overrideUrl ?? url).trim();
    setApplyError(null);
    setFetchStatus(null);
    if (!target) {
      setApplyError("Wklej link do utworu USDB (usdb.animux.de).");
      return;
    }
    setFetching(true);
    setFetchStatus("Pobieranie z USDB…");
    try {
      const data = await fetchUltrastarFromServer(target);
      setUrl(data.metadata.url || target);
      setMetadata(data.metadata);
      setText(data.content);
      if (data.metadata.title?.trim()) {
        setSearchTitle((prev) => prev.trim() || data.metadata.title!.trim());
      }
      if (data.metadata.artist?.trim()) {
        setSearchArtist((prev) => prev.trim() || data.metadata.artist!.trim());
      }
      setFetchStatus("Pobrano z USDB");
      // Keep paste visible so operator can inspect / tweak before apply.
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setApplyError(message);
      setFetchStatus(null);
      if (shouldOpenUsdbAccount(message)) {
        setShowAccount(true);
      }
    } finally {
      setFetching(false);
    }
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setApplyError(null);
    setMetadata(null);
    try {
      setText(await file.text());
      setShowPaste(true);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleApply() {
    if (!preview?.ok) return;
    setApplyError(null);
    setBusyApply(true);
    await yieldToUi();
    try {
      await onApply(preview);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyApply(false);
    }
  }

  const canApply = Boolean(preview?.ok) && !locked && !applying;

  return (
    <div className={styles.root}>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <p className={styles.status}>
        Szukaj na USDB, wklej link albo wklej / wybierz plik <code>.txt</code>.
        Tempo z <code>#BPM</code> to wartość ×4 (metronom = BPM/4). Import
        trafia do draftu — potem Zapisz w nagłówku (⌘S / Ctrl+S), żeby utrwalić
        na hoście. Wyszukiwanie online wymaga konta USDB
        {accountInfo.loaded
          ? accountInfo.configured
            ? ` (zapisane: ${accountInfo.user || "…"}).`
            : " — ustaw poniżej albo w Ustawieniach serwera."
          : "."}
      </p>

      <UsdbAccountPanel
        open={showAccount}
        onOpenChange={setShowAccount}
        disabled={disabled || applying}
        onBusyChange={setAccountBusy}
        onStatusChange={setAccountInfo}
      />

      <div className={styles.searchRow}>
        <Input
          type="text"
          value={searchTitle}
          aria-label="Tytuł do wyszukiwania UltraStar"
          placeholder="Tytuł"
          disabled={locked}
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
          aria-label="Artysta do wyszukiwania UltraStar"
          placeholder="Artysta (opcjonalnie)"
          disabled={locked}
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
          disabled={locked || !searchTitle.trim()}
          loading={searching}
          onClick={() => void onSearch()}
        >
          Szukaj na USDB
        </Button>
      </div>
      {searchMessage ? (
        <p className={styles.status} role="status">
          {searchMessage}
        </p>
      ) : null}
      {searchHits.length > 0 ? (
        <ul
          className={styles.results}
          role="listbox"
          aria-label="Wyniki USDB UltraStar"
        >
          {searchHits.map((hit, i) => {
            const label = [hit.title, hit.artist].filter(Boolean).join(" — ");
            const disabledHit = !hit.url || locked;
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
                  {hit.language || hit.edition ? (
                    <span className={styles.resultMeta}>
                      {[hit.language, hit.edition].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <label className={styles.urlBlock}>
        <span>Link USDB</span>
        <Input
          type="url"
          value={url}
          aria-label="Link USDB UltraStar"
          placeholder="https://usdb.animux.de/?link=detail&id=…"
          disabled={locked}
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
          disabled={locked || !url.trim()}
          loading={fetching}
          onClick={() => void onFetchUrl()}
        >
          Pobierz z USDB
        </Button>
        <Button
          variant="ghost"
          disabled={locked}
          onClick={() => setShowPaste((v) => !v)}
        >
          {showPaste ? "Ukryj wklejanie" : "Pokaż wklejanie / plik"}
        </Button>
      </div>
      {fetchStatus ? (
        <p className={styles.status} role="status">
          {fetchStatus}
          {metadata?.language ? ` · ${metadata.language}` : ""}
        </p>
      ) : null}

      {showPaste ? (
        <>
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
          <Textarea
            rows={10}
            value={text}
            aria-label="Tekst UltraStar"
            placeholder={"#TITLE:…\n#BPM:320\n#GAP:0\n: 0 4 0 Hel\n…"}
            disabled={locked}
            onChange={(e) => {
              setApplyError(null);
              setMetadata(null);
              setText(e.target.value);
            }}
          />
        </>
      ) : text ? (
        <Textarea
          rows={4}
          value={text}
          aria-label="Tekst UltraStar"
          readOnly
          disabled={locked}
        />
      ) : (
        <p className={styles.status}>
          Brak tekstu — wklej plik albo pobierz z USDB.
        </p>
      )}

      {preview?.ok ? (
        <p className={styles.status} data-testid="ultrastar-import-preview">
          {preview.title ?? "Bez tytułu"}
          {preview.artist ? ` — ${preview.artist}` : ""} ·{" "}
          {preview.syllableCount} sylab / {preview.noteCount} nut · metronom{" "}
          {preview.metronomeBpm} BPM (#BPM {preview.ultrastarBpm}) · GAP{" "}
          {preview.gapMs} ms · {preview.tekst.clips.length} linii
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button
          type="button"
          variant="ghost"
          disabled={
            applying || fetching || searching || busyApply || accountBusy
          }
          onClick={onCancel}
        >
          Anuluj
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!canApply}
          loading={applying || busyApply}
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

import { bridgeUsUgFromTexts } from "@stagesync/shared";
import { yieldToUi } from "@lib/audio/audioTempoAnalysis.js";
import {
  fetchUltrastarFromServer,
  searchUltrastarSongs,
} from "@lib/shell-operator/ultrastarImportApi.js";
import {
  fetchUgTabFromServer,
  searchUgTabs,
} from "@lib/shell-operator/ugImportApi.js";
import { shouldOpenUsdbAccount } from "./UsdbAccountPanel.js";
import type { ImportSourceSearchContext } from "./combinedImportIngestTypes.js";
import type { UgSearchHit, UltrastarSearchHit } from "@stagesync/shared";

export async function pickUsHit(
  ctx: ImportSourceSearchContext,
  hit: UltrastarSearchHit,
): Promise<void> {
  if (!hit.url) {
    ctx.setStepNotice("Wynik USDB bez URL.");
    return;
  }
  ctx.setBusyNet(true);
  ctx.setStepNotice(null);
  ctx.setApplyError(null);
  await yieldToUi();
  try {
    const fetched = await fetchUltrastarFromServer(hit.url);
    ctx.setUsText(fetched.content);
    ctx.setSelectedUsUrl(hit.url);
    ctx.setGridBpmDraft(null);
    const metaTitle = fetched.metadata.title?.trim() || hit.title?.trim() || "";
    const metaArtist =
      fetched.metadata.artist?.trim() || hit.artist?.trim() || "";
    if (metaTitle) ctx.setUsTitle(metaTitle);
    if (metaArtist) ctx.setUsArtist(metaArtist);
    ctx.setStepNotice(`Załadowano: ${metaTitle || "utwór"}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.setStepNotice(message);
    if (shouldOpenUsdbAccount(message)) {
      ctx.setShowUsdbAccount(true);
    }
  } finally {
    ctx.setBusyNet(false);
  }
}

export async function pickUgHit(
  ctx: ImportSourceSearchContext,
  hit: UgSearchHit,
): Promise<void> {
  if (!hit.url) {
    ctx.setStepNotice("Wynik UG bez URL.");
    return;
  }
  ctx.setBusyNet(true);
  ctx.setStepNotice(null);
  ctx.setApplyError(null);
  await yieldToUi();
  try {
    const fetched = await fetchUgTabFromServer(hit.url);
    ctx.setUgText(fetched.content);
    ctx.setSelectedUgUrl(hit.url);
    ctx.setGridBpmDraft(null);
    const metaTitle =
      fetched.metadata?.title?.trim() || hit.title?.trim() || "";
    const metaArtist =
      fetched.metadata?.artist?.trim() || hit.artist?.trim() || "";
    if (metaTitle) ctx.setUgTitle(metaTitle);
    if (metaArtist) ctx.setUgArtist(metaArtist);

    if (ctx.usText.trim()) {
      const res = bridgeUsUgFromTexts(ctx.usText, fetched.content, {
        idPrefix: "preview",
      });
      if (res.ok) {
        ctx.setUgHitScores((prev) => ({
          ...prev,
          [hit.url!]: res.alignScore,
        }));
      }
    }
    ctx.setStepNotice(`Załadowano zakładkę: ${metaTitle || "UG"}`);
  } catch (err) {
    ctx.setStepNotice(err instanceof Error ? err.message : String(err));
  } finally {
    ctx.setBusyNet(false);
  }
}

export async function searchUs(ctx: ImportSourceSearchContext): Promise<void> {
  ctx.setStepNotice(null);
  ctx.setBusyNet(true);
  await yieldToUi();
  try {
    const data = await searchUltrastarSongs(ctx.usTitle, ctx.usArtist);
    ctx.setUsHits(data.results);
    ctx.setSelectedUsUrl(null);
    if (!data.results.length) {
      ctx.setStepNotice(data.message ?? "Brak wyników USDB.");
      return;
    }
    ctx.setStepNotice(
      `Znaleziono ${data.results.length} wersji — wybierz kartę.`,
    );
  } catch (err) {
    ctx.setUsHits([]);
    const message = err instanceof Error ? err.message : String(err);
    ctx.setStepNotice(message);
    if (shouldOpenUsdbAccount(message)) {
      ctx.setShowUsdbAccount(true);
    }
  } finally {
    ctx.setBusyNet(false);
  }
}

export async function searchUg(ctx: ImportSourceSearchContext): Promise<void> {
  ctx.setStepNotice(null);
  ctx.setBusyNet(true);
  ctx.setUgHitScores({});
  await yieldToUi();
  try {
    const data = await searchUgTabs(ctx.ugTitle, ctx.ugArtist);
    ctx.setUgHits(data.results);
    ctx.setSelectedUgUrl(null);
    if (!data.results.length) {
      ctx.setStepNotice(data.message ?? "Brak wyników Ultimate Guitar.");
      return;
    }

    if (ctx.usText.trim()) {
      ctx.setStepNotice(
        `Znaleziono ${data.results.length} zakładek — obliczanie zgodności…`,
      );
      ctx.setUgHitScoresBusy(true);
      void Promise.allSettled(
        data.results.map(async (hit) => {
          if (!hit.url) return;
          try {
            const fetched = await fetchUgTabFromServer(hit.url);
            const res = bridgeUsUgFromTexts(ctx.usText, fetched.content, {
              idPrefix: "preview",
            });
            if (res.ok) {
              ctx.setUgHitScores((prev) => ({
                ...prev,
                [hit.url!]: res.alignScore,
              }));
            }
          } catch {
            // Ignore background fetch errors
          }
        }),
      ).finally(() => {
        ctx.setUgHitScoresBusy(false);
        ctx.setStepNotice(
          `Znaleziono ${data.results.length} zakładek — wybierz kartę.`,
        );
      });
    } else {
      ctx.setStepNotice(
        `Znaleziono ${data.results.length} zakładek — wybierz kartę.`,
      );
    }
  } catch (err) {
    ctx.setUgHits([]);
    ctx.setStepNotice(err instanceof Error ? err.message : String(err));
  } finally {
    ctx.setBusyNet(false);
  }
}

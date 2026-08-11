import { useCallback, type RefObject } from "react";
import type { Project, WandMode } from "@stagesync/shared";
import { placeContentFromForma } from "@stagesync/shared";
import type { ClipSelection } from "@lib/timeline/timelineSelection.js";
import type { ToolId } from "../timelineToolsData.js";

export type UseTimelineWandToolOptions = {
  draftRef: RefObject<Project | null>;
  clipSelection: ClipSelection;
  commitDraft: (next: Project) => void;
  flashCanvasNotice: (msg: string) => void;
  setWandMenu: (pos: { left: number; top: number } | null) => void;
  setTool: (tool: ToolId) => void;
};

export function useTimelineWandTool({
  draftRef,
  clipSelection,
  commitDraft,
  flashCanvasNotice,
  setWandMenu,
  setTool,
}: UseTimelineWandToolOptions) {
  const applyWand = useCallback(
    (mode: WandMode) => {
      const draft = draftRef.current;
      if (!draft) return;
      // v4 wandScopeSectionIds: Forma sections and/or enclosing sections of
      // selected Tekst/Akordy. Empty selection → whole song. Cue-only → abort.
      const selected = clipSelection.items;
      let scope: { sectionIds?: string[] } = {};
      if (selected.length > 0) {
        const sectionIds = new Set<string>();
        const music = draft.forma.clips.filter((c) => c.kind === "section");
        for (const item of selected) {
          if (item.lane === "forma") {
            const clip = draft.forma.clips.find((c) => c.id === item.id);
            if (clip?.kind === "section") sectionIds.add(clip.id);
            continue;
          }
          if (item.lane !== "tekst" && item.lane !== "akordy") continue;
          const content =
            item.lane === "tekst"
              ? draft.tekst.clips.find((c) => c.id === item.id)
              : draft.akordy.clips.find((c) => c.id === item.id);
          if (!content) continue;
          const host = music.find(
            (s) =>
              content.startTicks >= s.startTicks &&
              content.startTicks < s.startTicks + s.lengthTicks,
          );
          if (host) sectionIds.add(host.id);
        }
        if (sectionIds.size === 0) {
          flashCanvasNotice(
            "Zaznacz sekcję Formy albo klipy Tekstu/Akordów — Różdżka nie działa na Cue",
          );
          setWandMenu(null);
          setTool("pointer");
          return;
        }
        scope = { sectionIds: [...sectionIds] };
      }

      const result = placeContentFromForma(draft, mode, scope);
      if (!result.ok) {
        flashCanvasNotice(
          result.message || "Nie udało się rozmieścić treści Różdżką",
        );
        setWandMenu(null);
        setTool("pointer");
        return;
      }
      if (result.project !== draft) commitDraft(result.project);
      let msg = result.message || `Różdżka: ${result.placed} klipów`;
      if (result.approximate) {
        msg += " — przybliżone (doprecyzuj Tapem)";
      }
      flashCanvasNotice(msg);
      setWandMenu(null);
      setTool("pointer");
    },
    [
      draftRef,
      clipSelection,
      commitDraft,
      flashCanvasNotice,
      setWandMenu,
      setTool,
    ],
  );

  return { applyWand };
}

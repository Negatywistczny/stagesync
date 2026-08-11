import { useState, useCallback, useId } from "react";
import type { Project } from "@stagesync/shared";
import { resolveTempoAt, resolveMeterAt } from "@stagesync/shared";
import type { MapLaneId } from "@lib/timeline/mapLaneEdit.js";

export type UseTimelineMapEditsOptions = {
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
};

export function useTimelineMapEdits({
  draftProject,
}: UseTimelineMapEditsOptions) {
  const tempoEditTitleId = useId();
  const meterEditTitleId = useId();
  const keyEditTitleId = useId();

  const [tempoEditOpen, setTempoEditOpen] = useState(false);
  const [tempoDraft, setTempoDraft] = useState("");
  const [meterEditOpen, setMeterEditOpen] = useState(false);
  const [meterNumDraft, setMeterNumDraft] = useState("4");
  const [meterDenDraft, setMeterDenDraft] = useState("4");
  const [keyEditOpen, setKeyEditOpen] = useState(false);
  const [mapEditTicks, setMapEditTicks] = useState(0);

  const openMapEdit = useCallback(
    (
      lane: MapLaneId,
      ticks: number,
      seed?: { bpm?: number; num?: number; den?: number },
    ) => {
      if (!draftProject) return;
      setMapEditTicks(ticks);
      if (lane === "tempo") {
        setTempoDraft(String(seed?.bpm ?? resolveTempoAt(draftProject, ticks)));
        setTempoEditOpen(true);
      } else if (lane === "metrum") {
        const m = resolveMeterAt(draftProject, ticks);
        setMeterNumDraft(String(seed?.num ?? m.numerator));
        setMeterDenDraft(String(seed?.den ?? m.denominator));
        setMeterEditOpen(true);
      } else {
        setKeyEditOpen(true);
      }
    },
    [draftProject],
  );

  return {
    tempoEditTitleId,
    meterEditTitleId,
    keyEditTitleId,
    tempoEditOpen,
    setTempoEditOpen,
    tempoDraft,
    setTempoDraft,
    meterEditOpen,
    setMeterEditOpen,
    meterNumDraft,
    setMeterNumDraft,
    meterDenDraft,
    setMeterDenDraft,
    keyEditOpen,
    setKeyEditOpen,
    mapEditTicks,
    setMapEditTicks,
    openMapEdit,
  };
}

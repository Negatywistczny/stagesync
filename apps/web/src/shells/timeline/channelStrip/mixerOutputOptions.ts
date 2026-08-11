import {
  listMasterStereoPairOptions,
  resolveMasterOutputRouting,
  type AudioHardwareOutput,
  type MasterOutputRouting,
} from "@stagesync/shared";
import type { OutputSelectorOption } from "./OutputSelector.js";

export function buildMasterOutOptions(
  uiAllowed: boolean,
  maxChannelCount: number,
  hwOuts: readonly AudioHardwareOutput[],
  masterOutput: MasterOutputRouting | undefined,
): OutputSelectorOption[] {
  if (!uiAllowed) return [];
  return listMasterStereoPairOptions(maxChannelCount, hwOuts)
    .filter(
      (o) =>
        !o.blocked ||
        o.channelOffset ===
          resolveMasterOutputRouting(masterOutput).channelOffset,
    )
    .map((o) => ({
      value: `ch:${o.channelOffset}`,
      label: o.blocked ? `${o.label} (zajęte)` : o.label,
    }));
}

export function buildHwOptions(
  uiAllowed: boolean,
  hwOuts: readonly { id: string; name: string }[],
): OutputSelectorOption[] {
  if (!uiAllowed) return [];
  return hwOuts.map((h) => ({
    value: `hw:${h.id}`,
    label: h.name,
  }));
}

export function buildTrackOutputOptions(
  busses: readonly { id: string; name: string }[],
  hwOptions: readonly OutputSelectorOption[],
): OutputSelectorOption[] {
  return [
    { value: "master", label: "Master" },
    ...busses.map((b) => ({
      value: `bus:${b.id}`,
      label: b.name,
    })),
    ...hwOptions,
  ];
}

export function busOutputOptionsFor(
  busId: string,
  busses: readonly { id: string; name: string }[],
  hwOptions: readonly OutputSelectorOption[],
): OutputSelectorOption[] {
  return [
    { value: "master", label: "Master" },
    ...busses
      .filter((b) => b.id !== busId)
      .map((b) => ({
        value: `bus:${b.id}`,
        label: b.name,
      })),
    ...hwOptions,
  ];
}

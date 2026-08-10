import type { AkordClip, TempoEvent } from "../schema.js";
import { secondsToTicks } from "../tempo-map.js";
import type { TimeSignature } from "../time.js";
import {
  evenlySpaceOnsetsOnBarGrid,
  sealChordLengths,
  structuralBarOffsetsForChordLines,
} from "./onset-grid.js";
import type {
  ChordMsPlan,
  SectionContainer,
  TimedWord,
  UgBridgeChord,
  UgSectionParsed,
} from "./types.js";

export type PlaceBridgeAkordsInput = {
  ugSections: readonly UgSectionParsed[];
  containers: readonly SectionContainer[];
  ugChords: readonly UgBridgeChord[];
  solverSections: {
    vocalMsRange: { startMs: number; endMs: number } | null;
  }[];
  barTicks: number;
  prefix: string;
  useAudioSmartTempo: boolean;
  alignMapAtoB: readonly (number | null)[];
  usWords: readonly TimedWord[];
  mapUsAudio: (t: number) => number;
  chordMsPlans: readonly ChordMsPlan[];
  tempoMap: readonly TempoEvent[];
  seedBpm: number;
  meter: TimeSignature;
  ppq: number;
  floor: number;
  effectiveAudioOffset: number;
};

export type PlaceBridgeAkordsResult = {
  akordClips: AkordClip[];
  sectionChordCounts: number[];
  warnings: string[];
  approximate: boolean;
};

export function placeBridgeAkords(
  input: PlaceBridgeAkordsInput,
): PlaceBridgeAkordsResult {
  const {
    ugSections,
    containers,
    ugChords,
    solverSections,
    barTicks,
    prefix,
    useAudioSmartTempo,
    alignMapAtoB,
    usWords,
    mapUsAudio,
    chordMsPlans,
    tempoMap,
    seedBpm,
    meter,
    ppq,
    floor,
    effectiveAudioOffset,
  } = input;

  const align = { mapAtoB: alignMapAtoB };
  const warnings: string[] = [];
  let approximate = false;
  const akordClips: AkordClip[] = [];
  let seq = 0;
  const chordsBySection = new Map<number, UgBridgeChord[]>();
  for (const c of ugChords) {
    const list = chordsBySection.get(c.sectionIndex) ?? [];
    list.push(c);
    chordsBySection.set(c.sectionIndex, list);
  }
  const sectionChordCounts = ugSections.map(() => 0);

  for (let si = 0; si < ugSections.length; si++) {
    const win = containers[si]!;
    const sec = ugSections[si]!;
    const list = (chordsBySection.get(si) ?? [])
      .slice()
      .sort((a, b) => a.orderInSection - b.orderInSection);

    if (sec.pipeBarCount > 0 && sec.pipeEvents.length > 0) {
      const paired: { startTicks: number; symbol: string; isRest?: boolean }[] =
        [];
      for (const ev of sec.pipeEvents) {
        // Pipe cell = 1 full bar; mid-cell offsetInBar kept as authored.
        const local =
          ev.barIndex * barTicks + Math.round(ev.offsetInBar * barTicks);
        const t = win.startTicks + local;
        if (t >= win.endTicks) continue;
        paired.push({
          startTicks: Math.max(win.startTicks, t),
          symbol: ev.symbol,
          isRest: ev.isRest,
        });
      }
      paired.sort((a, b) => a.startTicks - b.startTicks);
      const unique: { startTicks: number; symbol: string }[] = [];
      for (const p of paired) {
        if (p.isRest) continue;
        const last = unique[unique.length - 1];
        if (last && last.symbol === p.symbol) continue;
        unique.push({ startTicks: p.startTicks, symbol: p.symbol });
      }
      const sealed = sealChordLengths(
        unique.map((p) => p.startTicks),
        win.endTicks,
      );
      for (let i = 0; i < unique.length && i < sealed.length; i++) {
        akordClips.push({
          id: `${prefix}-akord-${++seq}`,
          startTicks: sealed[i]!.startTicks,
          lengthTicks: sealed[i]!.lengthTicks,
          symbol: unique[i]!.symbol,
        });
      }
    } else if (list.length > 0 && solverSections[si]!.vocalMsRange == null) {
      // Instrumental without pipe: even pristineBars grid.
      const onsets = evenlySpaceOnsetsOnBarGrid(
        list.length,
        win.startTicks,
        win.endTicks,
        barTicks,
      );
      const sealed = sealChordLengths(onsets, win.endTicks);
      for (let i = 0; i < sealed.length && i < list.length; i++) {
        akordClips.push({
          id: `${prefix}-akord-${++seq}`,
          startTicks: sealed[i]!.startTicks,
          lengthTicks: sealed[i]!.lengthTicks,
          symbol: list[i]!.symbol,
        });
      }
      if (onsets.length < list.length) {
        approximate = true;
      }
    } else if (list.length > 0) {
      const paired: { startTicks: number; symbol: string }[] = [];
      let usedApprox = false;

      if (useAudioSmartTempo) {
        // Word-linked: chord time = aligned US word wall-clock → audio map.
        for (const c of list) {
          let t: number | null = null;
          if (c.ugWordIndex != null) {
            const bj = align.mapAtoB[c.ugWordIndex];
            if (bj != null && usWords[bj]) {
              t = mapUsAudio(usWords[bj]!.startTicks);
            }
          }
          if (t == null) {
            const plan = chordMsPlans.find(
              (p) =>
                p.sectionIndex === si && p.orderInSection === c.orderInSection,
            );
            if (plan && !plan.structuralOnly) {
              try {
                const contentMs = Math.max(
                  0,
                  plan.ms - Math.max(0, effectiveAudioOffset),
                );
                t =
                  secondsToTicks(
                    contentMs / 1000,
                    tempoMap,
                    seedBpm,
                    meter,
                    ppq,
                  ) + floor;
              } catch {
                t = null;
              }
            }
          }
          if (t == null) {
            usedApprox = true;
            const slot = paired.length;
            const span = Math.max(1, win.endTicks - win.startTicks);
            t =
              win.startTicks +
              Math.floor((slot * span) / Math.max(1, list.length));
          }
          paired.push({ startTicks: t, symbol: c.symbol });
        }
      } else {
        // Legacy: structural Beat 1/3 from phrase framing.
        const plans = chordMsPlans
          .filter((p) => p.sectionIndex === si)
          .sort((a, b) => a.orderInSection - b.orderInSection);

        for (const p of plans) {
          const targetTick = Math.min(
            win.endTicks - 1,
            win.startTicks + p.barOffset * barTicks,
          );
          if (p.structuralOnly) usedApprox = true;
          paired.push({ startTicks: targetTick, symbol: p.symbol });
        }

        if (plans.length < list.length) {
          usedApprox = true;
          const usedOrders = new Set(plans.map((p) => p.orderInSection));
          const offsets = structuralBarOffsetsForChordLines(list);
          const offsetByOrder = new Map(
            offsets.map((o) => [o.orderInSection, o.barOffset]),
          );
          for (const c of list) {
            if (usedOrders.has(c.orderInSection)) continue;
            const barOffset = offsetByOrder.get(c.orderInSection) ?? 0;
            paired.push({
              startTicks: Math.min(
                win.endTicks - 1,
                win.startTicks + barOffset * barTicks,
              ),
              symbol: c.symbol,
            });
          }
        }
      }

      if (usedApprox) {
        approximate = true;
        warnings.push(
          `Sekcja „${sec.name}”: akord bez sylaby w zasięgu — pozycja strukturalna / interpolacja (przybliżenie).`,
        );
      }

      // Chronological order; min gap 1 tick. Never half-bar crush / even reflow.
      paired.sort((a, b) => a.startTicks - b.startTicks);
      const lastLegal = Math.max(win.startTicks, win.endTicks - 1);
      const unique: { startTicks: number; symbol: string }[] = [];
      for (const p of paired) {
        let t = Math.min(lastLegal, Math.max(win.startTicks, p.startTicks));
        const last = unique[unique.length - 1];
        if (last && t <= last.startTicks) {
          t = Math.min(lastLegal, last.startTicks + 1);
        }
        unique.push({ startTicks: t, symbol: p.symbol });
      }
      const sealed = sealChordLengths(
        unique.map((u) => u.startTicks),
        win.endTicks,
      );
      for (let i = 0; i < unique.length && i < sealed.length; i++) {
        akordClips.push({
          id: `${prefix}-akord-${++seq}`,
          startTicks: sealed[i]!.startTicks,
          lengthTicks: sealed[i]!.lengthTicks,
          symbol: unique[i]!.symbol,
        });
      }
    }
    sectionChordCounts[si] = akordClips.filter(
      (c) => c.startTicks >= win.startTicks && c.startTicks < win.endTicks,
    ).length;
  }

  return { akordClips, sectionChordCounts, warnings, approximate };
}

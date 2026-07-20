import {
  resolveMeterAt,
  ticksPerBar,
  type FormaClip,
  type Project,
} from "@stagesync/shared";

export function renameFormaClip(project: Project, clipId: string, name: string): Project {
  const trimmed = name.trim();
  if (!trimmed) return project;
  return {
    ...project,
    forma: {
      clips: project.forma.clips.map((c) =>
        c.id === clipId ? { ...c, name: trimmed } : c,
      ),
    },
  };
}

/** Countdown length in full bars @ meter at tick 0; updates startTicks = -lengthTicks. */
export function setCountdownBars(project: Project, bars: number): Project {
  if (!Number.isInteger(bars) || bars < 1) {
    throw new RangeError("Countdown length must be at least 1 bar");
  }
  const meter = resolveMeterAt(project, 0);
  const barTicks = ticksPerBar(meter, project.ppq);
  const lengthTicks = bars * barTicks;
  return {
    ...project,
    forma: {
      clips: project.forma.clips.map((c) =>
        c.kind === "countdown"
          ? { ...c, lengthTicks, startTicks: -lengthTicks }
          : c,
      ),
    },
  };
}

export function countdownBars(project: Project, clip: FormaClip): number {
  if (clip.kind !== "countdown") return 1;
  const meter = resolveMeterAt(project, 0);
  const barTicks = ticksPerBar(meter, project.ppq);
  return Math.max(1, Math.round(clip.lengthTicks / barTicks));
}

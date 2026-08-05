import { useNavigate } from "react-router-dom";
import { Button } from "@stagesync/ui";
import {
  formatKeySignature,
  resolveKeyAt,
  type Project,
  type TimeSignature,
} from "@stagesync/shared";
import type { MapLaneId } from "@lib/timeline/mapLaneEdit.js";
import type { FormaToolId } from "@lib/timeline/timelineGesture.js";
import {
  IconAutoAdvance,
  IconChevronLeft,
  IconChevronRight,
  IconIndicator,
  IconFollow,
  IconInfo,
  IconLoop,
  IconMetronome,
  IconMixer,
  IconPause,
  IconPlay,
  IconSettings,
  IconStop,
} from "../icons.js";
import { ShellIconButton } from "../ShellIconButton.js";
import styles from "../TimelineShell.module.css";

interface TimelineToolbarProps {
  operatorNavCompact: boolean;
  timelineHeaderActions: React.ReactNode;
  isMobilePreview: boolean;
  tools: { id: FormaToolId; title: string; Icon: React.ComponentType }[];
  toolbarVisibleSet: Set<string>;
  tool: string;
  onTool: (id: FormaToolId) => void;
  toolsVisBtnRef: React.RefObject<HTMLButtonElement | null>;
  toolsVisOpen: boolean;
  toolsVisMenuId: string;
  setToolsVisOpen: (v: boolean | ((v: boolean) => boolean)) => void;
  commandPending: boolean;
  onStopClick: () => void;
  state: {
    playing: boolean;
  };
  audioBuffering: boolean;
  onPauseClick: () => void;
  onPlayClick: () => void;
  clockLabel: string;
  tempoAtPlayhead: number;
  displayTicks: number;
  openMapEdit: (kind: MapLaneId, ticks: number) => void;
  timelineSurface: "timeline" | "mixer";
  setTimelineSurface: (v: "timeline" | "mixer" | ((v: "timeline" | "mixer") => "timeline" | "mixer")) => void;
  loopOn: boolean;
  onLoopToggle: () => void;
  meterAtPlayhead: TimeSignature;
  draftProject: Project | null;
  metronomeOn: boolean;
  onMetronomeToggle: () => void;
  followPlayhead: boolean;
  setFollowPlayhead: (v: boolean | ((v: boolean) => boolean)) => void;
  showMidiPlayhead: boolean;
  setShowMidiPlayhead: (v: boolean | ((v: boolean) => boolean)) => void;
  songMetaOpen: boolean;
  clearClipSelection: () => void;
  clearMapSelection: () => void;
  setInspectorVisible: (v: boolean) => void;
  setSongMetaOpen: (v: boolean) => void;
  prevSetlistId: string | null | undefined;
  nextSetlistId: string | null | undefined;
  songScreenOpen: boolean;
  setSongScreenOpen: (v: boolean) => void;
  songScreenId: string;
  setlistEnabled: boolean;
  autoAdvance: boolean;
  patchSetlistAutoAdvance: (v: boolean) => Promise<{ autoAdvance: { enabled: boolean } }>;
  setAutoAdvance: (v: boolean) => void;
}

export function TimelineToolbar({
  operatorNavCompact,
  timelineHeaderActions,
  isMobilePreview,
  tools,
  toolbarVisibleSet,
  tool,
  onTool,
  toolsVisBtnRef,
  toolsVisOpen,
  toolsVisMenuId,
  setToolsVisOpen,
  commandPending,
  onStopClick,
  state,
  audioBuffering,
  onPauseClick,
  onPlayClick,
  clockLabel,
  tempoAtPlayhead,
  displayTicks,
  openMapEdit,
  timelineSurface,
  setTimelineSurface,
  loopOn,
  onLoopToggle,
  meterAtPlayhead,
  draftProject,
  metronomeOn,
  onMetronomeToggle,
  followPlayhead,
  setFollowPlayhead,
  showMidiPlayhead,
  setShowMidiPlayhead,
  songMetaOpen,
  clearClipSelection,
  clearMapSelection,
  setInspectorVisible,
  setSongMetaOpen,
  prevSetlistId,
  nextSetlistId,
  songScreenOpen,
  setSongScreenOpen,
  songScreenId,
  setlistEnabled,
  autoAdvance,
  patchSetlistAutoAdvance,
  setAutoAdvance,
}: TimelineToolbarProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.toolbar} data-ss-level="2">
      {operatorNavCompact ? (
        <div className={styles.toolbarHeaderActions}>{timelineHeaderActions}</div>
      ) : null}
      {!isMobilePreview ? (
        <div className={styles.toolBar} role="toolbar" aria-label="Narzędzia">
          {tools.filter(({ id }) => toolbarVisibleSet.has(id)).map(
            ({ id, title, Icon }) => (
              <ShellIconButton
                key={id}
                label={title}
                pressed={tool === id}
                onClick={() => onTool(id)}
              >
                <Icon />
              </ShellIconButton>
            ),
          )}
          <ShellIconButton
            ref={toolsVisBtnRef}
            label="Widoczne narzędzia na pasku"
            pressed={toolsVisOpen}
            aria-expanded={toolsVisOpen}
            aria-haspopup="menu"
            aria-controls={toolsVisOpen ? toolsVisMenuId : undefined}
            onClick={() => setToolsVisOpen((v) => !v)}
          >
            <IconSettings />
          </ShellIconButton>
        </div>
      ) : null}

      <div className={styles.toolbarCenter}>
        <div className={styles.transport} role="group" aria-label="Odtwarzanie">
          <ShellIconButton
            label="Zatrzymaj"
            disabled={commandPending}
            onClick={() => void onStopClick()}
          >
            <IconStop />
          </ShellIconButton>
          <Button
            variant="ghost"
            iconOnly
            className={styles.playAccent}
            selected={state.playing && !audioBuffering}
            loading={audioBuffering}
            aria-label={
              audioBuffering
                ? "Buforowanie audio"
                : state.playing
                  ? "Pauza"
                  : "Odtwarzaj"
            }
            disabled={commandPending || audioBuffering}
            onClick={() =>
              void (state.playing ? onPauseClick() : onPlayClick())
            }
          >
            {audioBuffering ? null : state.playing ? (
              <IconPause />
            ) : (
              <IconPlay />
            )}
          </Button>
          <ShellIconButton
            label="Pętla — przeciągnij zakres na linijce, potem włącz"
            aria-keyshortcuts="c"
            pressed={loopOn}
            onClick={onLoopToggle}
          >
            <IconLoop />
          </ShellIconButton>
          <span className={styles.bbt} aria-live="polite">
            {clockLabel}
          </span>
          {isMobilePreview ? (
            <span className={styles.metaChip} aria-label={`Tempo ${tempoAtPlayhead} BPM`}>
              {tempoAtPlayhead} BPM
            </span>
          ) : (
            <Button
              variant="ghost"
              className={styles.metaChip}
              title="Tempo — kliknij, aby edytować przy playheadzie"
              aria-label="Tempo — kliknij, aby edytować przy playheadzie"
              onClick={() => {
                openMapEdit("tempo", displayTicks);
              }}
            >
              {tempoAtPlayhead} BPM
            </Button>
          )}
          <div className={styles.transportExtras}>
            <Button
              variant="ghost"
              className={styles.metaChip}
              title="Metrum — kliknij, aby edytować przy playheadzie"
              aria-label="Metrum — kliknij, aby edytować przy playheadzie"
              onClick={() => {
                openMapEdit("metrum", displayTicks);
              }}
            >
              {meterAtPlayhead.numerator}/{meterAtPlayhead.denominator}
            </Button>
            <Button
              variant="ghost"
              className={styles.metaChip}
              title="Tonacja — kliknij, aby edytować"
              aria-label="Tonacja — kliknij, aby edytować"
              onClick={() => openMapEdit("tonacja", displayTicks)}
            >
              {draftProject
                ? formatKeySignature(resolveKeyAt(draftProject, displayTicks))
                : "—"}
            </Button>
          </div>
          <ShellIconButton
            label="Metronom"
            aria-keyshortcuts="k"
            pressed={metronomeOn}
            onClick={() => void onMetronomeToggle()}
          >
            <IconMetronome />
          </ShellIconButton>
          <ShellIconButton
            label="Podążaj za wskaźnikiem"
            pressed={followPlayhead}
            onClick={() => {
              setFollowPlayhead((v) => {
                const next = !v;
                try {
                  localStorage.setItem(
                    "stagesync-timeline-follow-playhead",
                    next ? "1" : "0",
                  );
                } catch {
                  /* ignore */
                }
                return next;
              });
            }}
          >
            <IconFollow />
          </ShellIconButton>
          <ShellIconButton
            label="Wskaźnik MIDI (playhead)"
            pressed={showMidiPlayhead}
            onClick={() => {
              setShowMidiPlayhead((v) => {
                const next = !v;
                try {
                  localStorage.setItem(
                    "stagesync-timeline-midi-playhead",
                    next ? "1" : "0",
                  );
                } catch {
                  /* ignore */
                }
                return next;
              });
            }}
          >
            <IconIndicator />
          </ShellIconButton>
          <ShellIconButton
            label={
              timelineSurface === "mixer"
                ? "Wróć do Timeline"
                : "Mikser"
            }
            aria-keyshortcuts="x"
            pressed={timelineSurface === "mixer"}
            onClick={() =>
              setTimelineSurface((s) =>
                s === "mixer" ? "timeline" : "mixer",
              )
            }
          >
            <IconMixer />
          </ShellIconButton>
        </div>
      </div>

      <div className={styles.songCluster} role="group" aria-label="Setlista">
        {!isMobilePreview ? (
        <ShellIconButton
          label="Metadane utworu"
          disabled={!draftProject}
          pressed={songMetaOpen}
          onClick={() => {
            if (!draftProject) return;
            clearClipSelection();
            clearMapSelection();
            setInspectorVisible(true);
            setSongMetaOpen(true);
          }}
        >
          <IconInfo />
        </ShellIconButton>
        ) : null}
        <ShellIconButton
          label="Poprzedni utwór setlisty"
          disabled={!prevSetlistId}
          onClick={() => prevSetlistId && navigate(`/timeline/${prevSetlistId}`)}
        >
          <IconChevronLeft />
        </ShellIconButton>
        <button
          type="button"
          className={styles.songPicker}
          onClick={() => setSongScreenOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={songScreenOpen}
          aria-controls={songScreenOpen ? songScreenId : undefined}
        >
          {draftProject?.name ?? "Wybierz utwór"}
        </button>
        <ShellIconButton
          label="Następny utwór setlisty"
          disabled={!nextSetlistId}
          onClick={() => nextSetlistId && navigate(`/timeline/${nextSetlistId}`)}
        >
          <IconChevronRight />
        </ShellIconButton>
        <span className={styles.songClusterExtra}>
          <ShellIconButton
            label="Auto-setlista"
            disabled={!setlistEnabled || commandPending}
            pressed={autoAdvance}
            onClick={() => {
              void (async () => {
                try {
                  const v = await patchSetlistAutoAdvance(!autoAdvance);
                  setAutoAdvance(v.autoAdvance.enabled);
                } catch {
                  /* ignore */
                }
              })();
            }}
          >
            <IconAutoAdvance />
          </ShellIconButton>
        </span>
      </div>
    </div>
  );
}

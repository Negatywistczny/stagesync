import { type Project } from "@stagesync/shared";
import { type TrackSelection } from "@lib/timeline/timelineSelection.js";
import { MixerSurface } from "./channelStrip/index.js";
import type {
  ChannelStripCallbacks,
  MasterStripCallbacks,
} from "./channelStrip/channelStripTypes.js";

interface MixerDockProps {
  draftProject: Project;
  trackSelection: TrackSelection;
  soloAudioTrackIds: string[];
  soloBusIds: string[];
  selectedBusId: string | null;
  selectedHwOutputId: string | null;
  trackRename: { trackId: string; name: string } | null;
  busRename: { busId: string; name: string } | null;
  buildChannelStripCallbacks: (id: string) => ChannelStripCallbacks;
  buildBusCallbacks: (id: string) => ChannelStripCallbacks;
  buildMasterStripCallbacks: MasterStripCallbacks;
  onMetronomeToggle: () => void;
  metronomeOn: boolean;
  playing: boolean;
  onAddAudioTrack: () => void;
  onAddBus: () => void;
  onAddHwOut: () => void;
  onHwSelect: (id: string, e: React.MouseEvent) => void;
  onHwContextMenu: (id: string, e: React.MouseEvent) => void;
  onHwGainChange: (id: string, gainDb: number) => void;
  onHwMuteToggle: (id: string) => void;
  onHwChannelModeChange: (id: string, mode: "mono" | "stereo") => void;
}

export function MixerDock({
  draftProject,
  trackSelection,
  soloAudioTrackIds,
  soloBusIds,
  selectedBusId,
  selectedHwOutputId,
  trackRename,
  busRename,
  buildChannelStripCallbacks,
  buildBusCallbacks,
  buildMasterStripCallbacks,
  onMetronomeToggle,
  metronomeOn,
  playing,
  onAddAudioTrack,
  onAddBus,
  onAddHwOut,
  onHwSelect,
  onHwContextMenu,
  onHwGainChange,
  onHwMuteToggle,
  onHwChannelModeChange,
}: MixerDockProps) {
  return (
    <MixerSurface
      project={draftProject}
      trackSelection={trackSelection}
      soloAudioTrackIds={soloAudioTrackIds}
      soloBusIds={soloBusIds}
      selectedBusId={selectedBusId}
      selectedHwOutputId={selectedHwOutputId}
      renamingTrackId={trackRename?.trackId ?? null}
      renameValue={trackRename?.name ?? ""}
      renamingBusId={busRename?.busId ?? null}
      busRenameValue={busRename?.name ?? ""}
      buildCallbacks={buildChannelStripCallbacks}
      buildBusCallbacks={buildBusCallbacks}
      masterCallbacks={buildMasterStripCallbacks}
      clickCallbacks={{ onMuteClick: () => void onMetronomeToggle() }}
      clickMuted={!metronomeOn}
      playing={playing}
      onAddAudioTrack={onAddAudioTrack}
      onAddBus={onAddBus}
      onAddHwOut={onAddHwOut}
      onHwSelect={onHwSelect}
      onHwContextMenu={onHwContextMenu}
      onHwGainChange={onHwGainChange}
      onHwMuteToggle={onHwMuteToggle}
      onHwChannelModeChange={onHwChannelModeChange}
      onEmptyDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("button, input, select")) return;
        onAddAudioTrack();
      }}
    />
  );
}

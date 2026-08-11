/**
 * Setlist / stage / host operator API — thin barrel (#834).
 * Implementation: `./setlist/*`.
 */

export {
  fetchSetlist,
  putSetlist,
  patchSetlistAutoAdvance,
} from "./setlist/setlist-crud.js";

export {
  sendStageMessage,
  fetchStageMessages,
  dismissStageMessage,
  clearStageMessages,
  fetchStageClients,
  fetchLiveDesk,
  patchLiveDesk,
} from "./setlist/stage-presence.js";

export type {
  SessionStageMessage,
  PresenceClient,
  LiveDeskSettingsDto,
} from "./setlist/stage-presence.js";

export {
  fetchNetworkInfo,
  probeApkAvailable,
  pickPrimaryJoinUrl,
  mdnsJoinUrl,
  networkDisplayUrls,
  apkDownloadUrl,
  apkDownloadUrlsFromJoin,
  apkSameOriginProbeUrl,
} from "./setlist/network-apk.js";

export type { NetworkInfo, ApkDownloadKind } from "./setlist/network-apk.js";

export {
  fetchMidiHostStatus,
  putMidiHostConfig,
  postMidiPanic,
} from "./setlist/midi-host.js";

export type {
  MidiPortInfo,
  MidiHostStatus,
  MidiPanicResult,
} from "./setlist/midi-host.js";

export {
  fetchHostLogs,
  clearHostLogs,
  downloadDiagnosticsExport,
  postSystemRestart,
  postSystemShutdown,
  fetchServerSettings,
  putServerSettings,
  browseServerPath,
  postSystemRestore,
  fetchHostUpdateStatus,
  postApplyHostUpdate,
  fetchSafetyNetStatus,
  postSafetyNetPromote,
} from "./setlist/system-host.js";

export type {
  HostLogLine,
  ServerSettingsValues,
  ServerSettingsResponse,
  BrowseResult,
  RestoreBackupItem,
  RestoreBackupResponse,
  HostUpdateStatus,
  SafetyNetStatus,
} from "./setlist/system-host.js";

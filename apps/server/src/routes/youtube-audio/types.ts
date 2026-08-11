export type YoutubeAudioJobStatus =
  "pending" | "downloading" | "done" | "error";

export type YoutubeAudioJob = {
  id: string;
  projectId: string;
  videoId: string;
  status: YoutubeAudioJobStatus;
  progress: number;
  message?: string;
  assetId?: string;
  error?: string;
};

export type SessionYoutubeJob = {
  id: string;
  videoId: string;
  status: YoutubeAudioJobStatus;
  progress: number;
  bytes?: Buffer;
  error?: string;
  createdAt: number;
};

import { extname } from "node:path";

/** Extension from upload filename; defaults to `.bin` when missing. */
export function extFromName(name: string): string {
  const ext = extname(name).toLowerCase();
  return ext || ".bin";
}

/** MIME type for known audio / MusicXML extensions. */
export function mimeForExt(ext: string): string {
  switch (ext) {
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".aiff":
    case ".aif":
      return "audio/aiff";
    case ".m4a":
      return "audio/mp4";
    case ".flac":
      return "audio/flac";
    case ".ogg":
      return "audio/ogg";
    case ".musicxml":
    case ".xml":
      return "application/vnd.recordare.musicxml+xml";
    case ".mxl":
      return "application/vnd.recordare.musicxml";
    default:
      return "application/octet-stream";
  }
}

import { LibrarySchema, type Library } from "@stagesync/shared";

export async function fetchLibrary(): Promise<Library> {
  const res = await fetch("/api/library");
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return LibrarySchema.parse(await res.json());
}

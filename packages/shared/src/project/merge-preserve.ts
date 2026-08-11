/**
 * Union by id: keep every server entry not present in client (PUT must not
 * drop assets uploaded concurrently). Client entries override same id.
 */
export function mergePreserveById<T extends { id: string }>(
  server: T[],
  client: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of client) {
    if (!item.id) continue;
    byId.set(item.id, item);
    if (byId.size >= 1024) break;
  }
  if (byId.size < 1024) {
    for (const item of server) {
      if (!item.id || byId.has(item.id)) continue;
      byId.set(item.id, item);
      if (byId.size >= 1024) break;
    }
  }
  return [...byId.values()];
}

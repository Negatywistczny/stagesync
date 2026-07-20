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
    byId.set(item.id, item);
  }
  for (const item of server) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

# Evidence fala 2 — Storage RMW / ProjectId / H4 / cold seed

**Data:** 2026-07-21 ~01:40 Europe/Warsaw  
**Repo:** `stagesync` @ `5.0.0-alpha.8`  
**Obszar:** `apps/server/src/storage/{index,paths,atomic-write}.ts`  
**Cel:** weryfikacja overnight H2/H3/H4 + residual

---

## Werdykt fali

| ID | Temat | Status dziś |
|----|-------|-------------|
| **H2** (mutacje CRUD) | mutex RMW | **FIXED** — `withLibraryLock` + test 5× concurrent POST |
| **H2 residual → A21-H01** | `getLibrary` / cold seed | **OPEN HIGH** — 19/20 seed fail bez locka |
| **H3** | path traversal | **FIXED** — UUID Zod + resolve containment |
| **H4 delete** | ghost po delete | **FIXED** — `saveLibrary` przed `rm` |
| **H4 create → A21-M02** | crash window | **PARTIAL** — kolejność odwrócona (library przed dyskiem) |

---

## Cytaty (≥20)

### Mutex

```150:158:apps/server/src/storage/index.ts
  let libraryChain: Promise<void> = Promise.resolve();

  function withLibraryLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = libraryChain.then(fn, fn);
    libraryChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
```

### `getLibrary` **bez** locka (bug)

```235:237:apps/server/src/storage/index.ts
    async getLibrary(): Promise<Library> {
      return ensureLibrary();
    },
```

### Seed path w `ensureLibrary`

```161:181:apps/server/src/storage/index.ts
  async function ensureLibrary(): Promise<Library> {
    try {
      const raw = await readJsonFile(paths.libraryFile);
      return LibrarySchema.parse(raw);
    } catch (err) {
      if (errCode(err) !== "ENOENT") {
        ...
      }
    }
    try {
      const raw = await readJsonFile(paths.libraryTemplate);
      const library = LibrarySchema.parse(raw);
      await writeJsonAtomic(paths.libraryFile, library);
      return library;
    } catch (err) {
      throw new StorageError("Failed to seed library from template", err);
    }
  }
```

### Create — library przed dyskiem (H4 odwrócone)

```319:322:apps/server/src/storage/index.ts
        library.projects.push(libraryEntryFromProject(project));
        await saveLibrary(library);
        await writeProject(project);
        return project;
```

### Delete — library przed `rm` (fix H4 delete)

```418:440:apps/server/src/storage/index.ts
        if (idx !== -1) {
          library.projects.splice(idx, 1);
          await saveLibrary(library);
        }
        ...
        if (onDisk) {
          try {
            await rm(projectDir(paths, safeId), { recursive: true, force: true });
```

### ProjectId + containment

```40:48:apps/server/src/storage/paths.ts
export function assertSafeProjectId(paths: DataPaths, rawId: string): string {
  const id = ProjectIdSchema.parse(rawId);
  const root = resolve(paths.projectsDir);
  const dir = resolve(root, id);
  if (dir !== root && !dir.startsWith(root + sep)) {
    throw new InvalidProjectIdError(`Invalid project id: ${rawId}`);
  }
  return id;
}
```

```26:26:packages/shared/src/schema.ts
export const ProjectIdSchema = z.string().uuid();
```

### Asset path reject `..`

```69:76:apps/server/src/storage/paths.ts
  if (
    !storageName ||
    storageName.includes("..") ||
    storageName.includes("/") ||
    storageName.includes("\\")
  ) {
    throw new InvalidProjectIdError(`Invalid asset storage name: ${storageName}`);
  }
```

### Atomic write (tmp name)

```9:13:apps/server/src/storage/atomic-write.ts
  await mkdir(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(tmpPath, payload, "utf8");
  await rename(tmpPath, filePath);
```

### Mutacje pod lockiem

```277:281:apps/server/src/storage/index.ts
    async createProject(
      name: string,
      opts?: { fromTemplateId?: string; isTemplate?: boolean },
    ): Promise<Project> {
      return withLibraryLock(async () => {
```

```330:332:apps/server/src/storage/index.ts
    async putProject(id: string, body: PutProjectBody): Promise<Project> {
      return withLibraryLock(async () => {
```

```400:402:apps/server/src/storage/index.ts
    async deleteProject(id: string): Promise<void> {
      return withLibraryLock(async () => {
```

### Test concurrent creates (happy path gdy library już istnieje)

```203:219:apps/server/src/library-crud.test.ts
  it("concurrent creates keep library consistent", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        fetch(`${baseUrl}/api/projects`, {
```

### Upgrade chain v1→v5

```123:146:apps/server/src/storage/index.ts
function upgradeToV5(raw: unknown): Project {
  let project: Project;
  if (isProjectV1(raw)) {
    project = upgradeProjectV4ToV5(
      upgradeProjectV3ToV4(
        upgradeProjectV2ToV3(upgradeProjectV1ToV2(ProjectSchemaV1.parse(raw))),
      ),
    );
```

---

## Reprodukcja 2026-07-21 01:40

In-process `createStores(tmpDir)`:

### H3 — wszystkie złe id odrzucone

`../library`, `..%2Flibrary`, `not-a-uuid`, `../../../etc/passwd`, UUID+`/../x` → `ZodError` invalid uuid (`ok: false`).

### H2 mutacje — 10× parallel `createProject`

`created: 10`, `libraryEntries: 10`, `match: true`.

### H4 delete

Po `deleteProject`: `ghostGet: false`, `stillInLib: false`.

### A21-H01 — cold seed 20× parallel `getLibrary()` na pustym dataDir

```json
{
  "seedOk": 1,
  "seedFailCount": 19,
  "sampleFail": [
    "StorageError: Failed to seed library from template",
    "StorageError: Failed to seed library from template",
    "StorageError: Failed to seed library from template"
  ]
}
```

### Mix `getLibrary` + `createProject` na świeżym dir (bez wcześniejszego seed)

Częściowy sukces: jeden lib OK, jeden create OK; drugi create `ENOENT … rename …library.json…tmp`; drugi get `Failed to seed library from template`.

**Root cause:** `getLibrary` wywołuje `ensureLibrary` **poza** `libraryChain`, więc concurrent seed + mutacje kolidują na `writeJsonAtomic` / rename.

---

## Remediacje (propozycje)

1. **Must:** `getLibrary: () => withLibraryLock(() => ensureLibrary())` — single-flight seed.
2. Opcjonalnie: `getProject` read-only bez locka OK; asset reads OK.
3. Create H4: rozważyć `writeProject` → `saveLibrary` + hygiene orphan scan; albo write-ahead journal.
4. `atomic-write`: dodać `randomBytes` / counter do tmp name (defense in depth).
5. Test: `it("concurrent cold getLibrary seeds once")` — dziś brak.

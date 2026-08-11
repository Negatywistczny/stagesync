export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** OCC conflict — client's base `updatedAt` does not match disk. */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export { InvalidProjectIdError } from "./paths.js";

export function errCode(err: unknown): string | undefined {
  return err && typeof err === "object" && "code" in err
    ? (err as NodeJS.ErrnoException).code
    : undefined;
}

/**
 * Temporary file management utilities.
 * Files are written to OS temp dir and cleaned up after use.
 */

import { writeFile, unlink, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

/**
 * Write a buffer to a temp file and return its path.
 * The caller is responsible for deletion.
 */
export async function writeTempFile(data: Buffer, ext: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "invoice-"));
  const filename = `${randomUUID()}.${ext}`;
  const filePath = join(dir, filename);
  await writeFile(filePath, data);
  return filePath;
}

/**
 * Delete a temp file. Silently ignores ENOENT (already deleted).
 */
export async function deleteTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[temp-file] Failed to delete ${filePath}:`, err);
    }
  }
}

/**
 * Helper that writes a temp file, calls your async function with its path,
 * then automatically deletes the temp file. Ensures cleanup even on error.
 */
export async function withTempFile<T>(
  data: Buffer,
  ext: string,
  fn: (path: string) => Promise<T>
): Promise<T> {
  const path = await writeTempFile(data, ext);
  try {
    return await fn(path);
  } finally {
    await deleteTempFile(path);
  }
}

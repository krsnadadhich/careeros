import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_RESUME_BYTES = 8 * 1024 * 1024; // 8 MiB

const STORAGE_ROOT = path.join(process.cwd(), "storage", "resumes");

/** Checks the actual file bytes rather than trusting the browser-supplied
 * File.type, which can be misreported. */
export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

/** Strips path separators/control characters and caps length — this value
 * is display-only (Resume.fileName) and is never used to build a
 * filesystem path, but it's still safe to sanitize defensively before it
 * reaches an HTTP header (Content-Disposition) or the UI. */
export function sanitizeDisplayName(name: string): string {
  const cleaned = name
    .replace(/[\\/]/g, "-")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim();
  return (cleaned || "resume.pdf").slice(0, 200);
}

function userDir(userId: string): string {
  return path.join(STORAGE_ROOT, userId);
}

/** Writes the buffer under a random, non-user-controlled filename and
 * returns the relative key to persist as Resume.fileUrl. */
export async function saveResumeFile(userId: string, buffer: Buffer): Promise<string> {
  const dir = userDir(userId);
  await mkdir(dir, { recursive: true });
  const key = `${randomUUID()}.pdf`;
  await writeFile(path.join(dir, key), buffer);
  return key;
}

/** Reads a previously-saved resume file. `key` is always DB-controlled
 * (never user input), but the containment check is kept anyway as a
 * defensive backstop. */
export async function readResumeFile(userId: string, key: string): Promise<Buffer> {
  const dir = path.resolve(userDir(userId));
  const filePath = path.resolve(dir, key);
  if (!filePath.startsWith(dir)) {
    throw new Error("Invalid resume file key");
  }
  return readFile(filePath);
}

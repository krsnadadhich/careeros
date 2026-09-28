import { extractText, getDocumentProxy } from "unpdf";

/** Extracts plain text from a PDF buffer. Never throws — corrupt,
 * password-protected, or scanned/image-only PDFs have no extractable text
 * layer, which is an expected outcome here, not an exceptional one. */
export async function extractResumeText(buffer: Buffer): Promise<string | null> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (err) {
    console.warn("[resume] PDF text extraction failed:", (err as Error).message);
    return null;
  }
}

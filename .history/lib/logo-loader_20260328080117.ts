import { readFileSync } from "fs";
import { join } from "path";

let cachedLogoBase64: string | null = null;

/**
 * Load logo.jpg and convert to base64 data URL for PDF rendering.
 * Caches the result to avoid repeated file reads.
 */
export function getLogoDataUrl(): string {
  if (cachedLogoBase64) {
    return cachedLogoBase64;
  }

  try {
    const logoPath = join(process.cwd(), "Public", "Logo", "logo.jpg");
    const logoBuffer = readFileSync(logoPath);
    cachedLogoBase64 = `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;
    return cachedLogoBase64;
  } catch (error) {
    console.error("Failed to load logo:", error);
    // Return a transparent pixel as fallback
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }
}

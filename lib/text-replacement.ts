/**
 * PO (Purchase Order) placeholder detection and replacement utilities.
 *
 * Targets phrases found in real invoice samples such as:
 *   "PO# pending valid purchase order from Ryder."
 *   "Pending Purchase Order"
 *   "Awaiting PO"
 *   "PO TBD"
 *   and similar patterns.
 */

/** List of regex patterns that identify PO placeholders in invoice text */
export const PO_PLACEHOLDER_PATTERNS: RegExp[] = [
  /(PO#?\s*)(pending\s+valid\s+purchase\s+order[^.]*\.?)/gi,
  /(pending\s+valid\s+purchase\s+order[^.]*\.?)/gi,
  /pending\s+purchase\s+order/gi,
  /purchase\s+order\s+pending/gi,
  /(PO#?\s*)(TBD)/gi,
  /TBD\s*(?:[-–]|for)?\s*(?:purchase\s+)?order/gi,
  /(PO#?\s*)(pending)/gi,
  /pending\s+(?:PO|purchase\s+order)/gi,
  /awaiting\s+PO/gi,
  /awaiting\s+purchase\s+order/gi,
  /(PO#?\s*)(?:awaiting|TBA|to\s+be\s+assigned)/gi,
  /(PO#?\s*)\[\s*pending\s*\]/gi,
  /(PO#?\s*)\(\s*pending\s*\)/gi,
  /\bPO#?\s*pending\b/gi,
];

/** Pattern to match an existing PO number after a prefix (labels like PO: PO# PO ) */
export const EXISTING_PO_QUERY_PATTERN = /(PO[:#\s]*)\s*([A-Za-z0-9\-\/\.]+)/gi;

export interface PODetectionResult {
  detected: boolean;
  matchedText: string | null;
  pattern: string | null;
}

/**
 * Detect whether a text block contains a PO placeholder phrase.
 */
export function detectPOPlaceholder(text: string): PODetectionResult {
  for (const pattern of PO_PLACEHOLDER_PATTERNS) {
    pattern.lastIndex = 0; // reset global regex state
    const match = pattern.exec(text);
    if (match) {
      return {
        detected: true,
        matchedText: match[0],
        pattern: pattern.toString(),
      };
    }
  }
  return { detected: false, matchedText: null, pattern: null };
}

/**
 * Replace a detected PO placeholder with a real PO number.
 * Replaces all occurrences across all known patterns.
 *
 * @param text - Input text (e.g. line item description)
 * @param poNumber - The PO number to insert
 * @returns Updated text with placeholder replaced
 */
export function replacePOPlaceholder(text: string, poNumber: string): string {
  let result = text;
  const isPending = poNumber.toLowerCase().includes("pending");

  for (const pattern of PO_PLACEHOLDER_PATTERNS) {
    pattern.lastIndex = 0;
    // If it's a pending placeholder, we use the exact text "Pending PO" per requirement
    // otherwise we use "PO# [number]"
    const replacement = isPending ? "Pending PO" : `PO# ${poNumber}`;
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Replace an existing PO number with a new one.
 * Matches patterns like "PO# 47382" and replaces with new number.
 * Word-boundary matching prevents partial matches (e.g., won't match "PO# 4738299").
 *
 * @param text - Input text
 * @param oldPoNumber - The current PO number to find
 * @param newPoNumber - The new PO number to insert
 * @returns Updated text with old PO replaced by new
 */
export function replaceExistingPO(
  text: string,
  oldPoNumber: string,
  newPoNumber: string,
): string {
  // Escape special regex chars in PO numbers
  const escaped = oldPoNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Updated pattern: handle alphanumeric PO numbers with common separators
  // Updated pattern: handle alphanumeric PO numbers with common separators (including :)
  const pattern = new RegExp(`PO[:#]?\\s*${escaped}(?![\\w-])`, "gi");
  return text.replace(pattern, (match) => {
    // Determine the label part to preserve it if possible
    const labelMatch = /^(PO[:#]?\s*)/i.exec(match);
    const label = labelMatch ? labelMatch[1] : "PO# ";
    return `${label}${newPoNumber}`;
  });
}

/**
 * Scan an array of line item descriptions and return
 * the index of the first one containing a PO placeholder.
 */
export function findPOLineIndex(descriptions: string[]): number {
  return descriptions.findIndex((desc) => detectPOPlaceholder(desc).detected);
}

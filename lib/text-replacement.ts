/**
 * PO (Purchase Order) placeholder detection and replacement utilities.
 *
 * Targets phrases found in real invoice samples such as:
 *   "PO# pending valid purchase order from Ryder."
 *   "Pending Purchase Order"
 *   and similar patterns.
 */

/** List of regex patterns that identify PO placeholders in invoice text */
const PO_PLACEHOLDER_PATTERNS: RegExp[] = [
  /PO#?\s*pending\s+valid\s+purchase\s+order[^.]*\./gi,
  /pending\s+valid\s+purchase\s+order[^.]*\./gi,
  /pending\s+purchase\s+order/gi,
  /purchase\s+order\s+pending/gi,
  /PO#?\s*TBD/gi,
  /PO#?\s*pending/gi,
  /TBD\s*[-–]\s*purchase\s+order/gi,
];

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
  for (const pattern of PO_PLACEHOLDER_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, `PO# ${poNumber}`);
  }
  return result;
}

/**
 * Scan an array of line item descriptions and return
 * the index of the first one containing a PO placeholder.
 */
export function findPOLineIndex(descriptions: string[]): number {
  return descriptions.findIndex((desc) => detectPOPlaceholder(desc).detected);
}

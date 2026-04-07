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

/** List of regex patterns that identify WO placeholders in invoice text */
export const WO_PLACEHOLDER_PATTERNS: RegExp[] = [
  /(W\.?O\.?#?\s*)(pending)/gi,
  /pending\s+(?:WO|work\s+order)/gi,
  /(W\.?O\.?#?\s*)(?:awaiting|TBA|to\s+be\s+assigned|TBD)/gi,
  /\bW\.?O\.?#?\s*pending\b/gi,
];

/** Pattern to match an existing PO number after a prefix (labels like PO: PO# PO ) */
export const EXISTING_PO_QUERY_PATTERN = /(PO[:#\s]*)\s*([A-Za-z0-9\-\/\.]+)/gi;

/** Pattern to match an existing WO number after a prefix */
export const EXISTING_WO_QUERY_PATTERN =
  /(W\.?O\.?[:#\s]*)\s*([A-Za-z0-9\-\/\.]+)/gi;

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
 * Detect whether a text block contains a WO placeholder phrase.
 */
export function detectWOPlaceholder(text: string): PODetectionResult {
  for (const pattern of WO_PLACEHOLDER_PATTERNS) {
    pattern.lastIndex = 0;
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
    // Use a replacer function to avoid double-labeling if the pattern didn't include the prefix
    result = result.replace(pattern, (match) => {
      // If match already starts with PO# or similar, only replace the number/placeholder part
      // and preserve the original label format.
      const labelMatch = /^(PO#?\s*|Order#?\s*)/i.exec(match);
      if (labelMatch) {
        const label = labelMatch[1];
        return isPending ? "Pending PO" : `${label}${poNumber}`;
      }

      // Bare replacement: if the match didn't have a label,
      // but the poNumber itself doesn't have "PO#"...
      if (isPending) return "Pending PO";

      // If we are replacing a bare "pending" word, we should generally
      // check if it's already preceded by a label in the full text.
      // But for simplicity in this replacement loop, we'll prefix it if it's a number.
      return `PO# ${poNumber}`;
    });
  }
  return result;
}

/**
 * Replace a detected WO placeholder with a real WO number.
 */
export function replaceWOPlaceholder(text: string, woNumber: string): string {
  let result = text;
  const isPending = woNumber.toLowerCase().includes("pending");

  for (const pattern of WO_PLACEHOLDER_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, (match) => {
      const labelMatch = /^(W\.?O\.?#?\s*)/i.exec(match);
      if (labelMatch) {
        const label = labelMatch[1];
        return isPending ? "Pending WO" : `${label}${woNumber}`;
      }
      if (isPending) return "Pending WO";
      return `W.O.# ${woNumber}`;
    });
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
 * Replace an existing WO number with a new one.
 */
export function replaceExistingWO(
  text: string,
  oldWoNumber: string,
  newWoNumber: string,
): string {
  const escaped = oldWoNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`W\\.?O\\.?[:#]?\\s*${escaped}(?![\\w-])`, "gi");
  return text.replace(pattern, (match) => {
    const labelMatch = /^(W\.?O\.?[:#]?\s*)/i.exec(match);
    const label = labelMatch ? labelMatch[1] : "W.O.# ";
    return `${label}${newWoNumber}`;
  });
}

/**
 * Replace ANY existing WO value in text (not just a specific one).
 * Finds W.O.# followed by ANY alphanumeric value and replaces it.
 * This is more generic than replaceExistingWO which requires knowing the old value.
 */
export function replaceAnyExistingWO(text: string, newWoNumber: string): string {
  // Match W.O.# or WO: or WO # followed by any alphanumeric value
  // More flexible: handles "W.O. #", "W.O.#", "WO #", "WO#", etc.
  const pattern = /W\.?O\.?\s*#?\s*([A-Za-z0-9\-\/\.]+)/gi;
  return text.replace(pattern, (match) => {
    const labelMatch = /^(W\.?O\.?\s*#?\s*)/i.exec(match);
    const label = labelMatch ? labelMatch[1] : "W.O# ";
    return `${label}${newWoNumber}`;
  });
}

/**
 * Replace ANY existing PO value in text (not just a specific one).
 * Finds PO# followed by ANY alphanumeric value and replaces it.
 * This is more generic than replaceExistingPO which requires knowing the old value.
 */
export function replaceAnyExistingPO(text: string, newPoNumber: string): string {
  // Match PO# or PO: or PO followed by any alphanumeric value
  // More flexible: handles "PO #", "PO#", "PO:", etc.
  const pattern = /PO\s*#?\s*([A-Za-z0-9\-\/\.]+)/gi;
  return text.replace(pattern, (match) => {
    const labelMatch = /^(PO\s*#?\s*)/i.exec(match);
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

/**
 * Token-Based Placeholder System for PO# and W.O# Numbers
 *
 * Instead of regex-based string searching (which can leave remnants),
 * we use dedicated tokens that get replaced atomically:
 *   {PO#} → replaced with actual PO number
 *   {WO#} → replaced with actual W.O number
 *   {PO_WO#} → placeholder for both (e.g., when only one is provided, shows that one)
 *
 * Benefits:
 * - Single atomic replacement (no partial matches or remnants)
 * - Both PO# and W.O# bind to the SAME activity line
 * - Clean, deterministic behavior
 * - Easy to trace through transform pipeline
 */

export interface TokenReplacementResult {
  text: string;
  hadPlaceholder: boolean;
  replacementApplied: boolean;
}

/**
 * Detects if text contains PO# or W.O# tokens.
 */
export function hasPOToken(text: string): boolean {
  return /\{PO#\}|\{PO_WO#\}/i.test(text);
}

export function hasWOToken(text: string): boolean {
  return /\{WO#\}|\{PO_WO#\}/i.test(text);
}

/**
 * Replace {PO#} token with actual PO number.
 * If {PO_WO#} is present, replaces with "PO# {number}" format.
 */
export function replacePOToken(
  text: string,
  poNumber: string,
): TokenReplacementResult {
  let hasPlaceholder = false;
  let replacementApplied = false;

  let result = text;

  // Case 1: Dedicated {PO#} token
  if (/{PO#}/.test(result)) {
    hasPlaceholder = true;
    result = result.replace(/{PO#}/g, `PO# ${poNumber}`);
    replacementApplied = true;
  }

  // Case 2: Combined {PO_WO#} token - replace with PO part only
  if (/{PO_WO#}/.test(result)) {
    hasPlaceholder = true;
    result = result.replace(/{PO_WO#}/g, `PO# ${poNumber}`);
    replacementApplied = true;
  }

  return { text: result, hadPlaceholder: hasPlaceholder, replacementApplied };
}

/**
 * Replace {WO#} token with actual W.O number.
 * If {PO_WO#} is present AND PO is empty/not provided, replaces with "W.O# {number}".
 */
export function replaceWOToken(
  text: string,
  woNumber: string,
  poNumber?: string,
): TokenReplacementResult {
  let hasPlaceholder = false;
  let replacementApplied = false;

  let result = text;

  // Case 1: Dedicated {WO#} token
  if (/{WO#}/.test(result)) {
    hasPlaceholder = true;
    result = result.replace(/{WO#}/g, `W.O# ${woNumber}`);
    replacementApplied = true;
  }

  // Case 2: Combined {PO_WO#} token
  // If PO was already replaced, we now append W.O# to same line
  if (/{PO_WO#}/.test(result)) {
    hasPlaceholder = true;
    if (poNumber) {
      // PO already replaced this token, append W.O# with spacing
      result = result.replace(/{PO_WO#}/g, `W.O# ${woNumber}`);
    } else {
      // Only W.O# provided, replace token with W.O# alone
      result = result.replace(/{PO_WO#}/g, `W.O# ${woNumber}`);
    }
    replacementApplied = true;
  }

  return { text: result, hadPlaceholder: hasPlaceholder, replacementApplied };
}

/**
 * Replace both PO# and W.O# tokens in a single pass.
 * Handles combined {PO_WO#} token by replacing once with both values formatted together.
 */
export function replacePOWOTokens(
  text: string,
  poNumber?: string,
  woNumber?: string,
): TokenReplacementResult {
  let hasPlaceholder = false;
  let replacementApplied = false;
  let result = text;

  // Combined {PO_WO#} token: replace with both values if provided
  if (/{PO_WO#}/.test(result)) {
    hasPlaceholder = true;
    let replacement = "";
    if (poNumber) {
      replacement += `PO# ${poNumber}`;
    }
    if (woNumber) {
      if (replacement) replacement += "  "; // 2-space separator
      replacement += `W.O# ${woNumber}`;
    }
    // If no values provided, leave token as-is (shouldn't happen in practice)
    if (replacement) {
      result = result.replace(/{PO_WO#}/g, replacement);
      replacementApplied = true;
    }
  } else {
    // Separate tokens
    if (poNumber && /{PO#}/.test(result)) {
      hasPlaceholder = true;
      result = result.replace(/{PO#}/g, `PO# ${poNumber}`);
      replacementApplied = true;
    }
    if (woNumber && /{WO#}/.test(result)) {
      hasPlaceholder = true;
      result = result.replace(/{WO#}/g, `W.O# ${woNumber}`);
      replacementApplied = true;
    }
  }

  return { text: result, hadPlaceholder: hasPlaceholder, replacementApplied };
}

/**
 * Append W.O# to descriptions that already have PO# but no W.O#.
 * Used when user inputs W.O# but there's NO W.O# placeholder detected.
 *
 * This prevents W.O# from being added to non-activity descriptions.
 * Only appends if:
 * 1. Description has PO# (from token or existing)
 * 2. Description doesn't already have W.O#
 * 3. Description is not a "Service Address" line
 */
export function appendWOToExistingPO(
  text: string,
  woNumber: string,
): { text: string; wasAppended: boolean } {
  // Skip if already has W.O#
  if (/W\.?O\.?#/i.test(text)) {
    return { text, wasAppended: false };
  }

  // Skip if looks like a Service Address (city, state, zip)
  if (/[A-Z][a-z]+,?\s+[A-Z]{2}\s+\d{5}|Service\s+Address/i.test(text)) {
    return { text, wasAppended: false };
  }

  // Append W.O# after PO# if PO# exists
  if (/PO#\s+[A-Za-z0-9\-\/\.]+/i.test(text)) {
    // Find the end of the PO# value and append W.O# after it
    const newText = text.replace(
      /(PO#\s+[A-Za-z0-9\-\/\.]+)/i,
      `$1  W.O# ${woNumber}`,
    );
    return { text: newText, wasAppended: true };
  }

  return { text, wasAppended: false };
}

/**
 * Clean up any remaining tokens (fallback safety).
 * Removes tokens if they weren't replaced for any reason.
 */
export function cleanupUnreplacedTokens(text: string): string {
  return text
    .replace(/\{PO#\}/g, "")
    .replace(/\{WO#\}/g, "")
    .replace(/\{PO_WO#\}/g, "")
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Ensure PO# / W.O# tokens are present (or removed) at the beginning of an
 * activity description according to current values. This will:
 * - Skip Service Address-like lines
 * - Replace existing leading PO/W.O# tokens rather than prepend duplicates
 * - Remove a token if its value was cleared (poNumber/woNumber undefined/null)
 */
export function ensureLeadingPOWOTokens(
  text: string,
  poNumber?: string | null,
  woNumber?: string | null,
): string {
  // Do not touch Service Address lines
  if (/[A-Z][a-z]+,?\s+[A-Z]{2}\s+\d{5}|Service\s+Address/i.test(text)) {
    return text;
  }

  // Work on a trimmed copy but preserve original trailing whitespace/format locally
  let working = text.replace(/^\s+/, "");

  // Remove any existing leading PO/W.O# tokens (one or more)
  while (true) {
    const m = /^(?:PO[:#]?\s*[A-Za-z0-9\-/\.]+|W\.?O\.?[:#]?\s*[A-Za-z0-9\-/\.]+)(?:\s{2}|\s+)?/i.exec(
      working,
    );
    if (!m) break;
    working = working.slice(m[0].length);
  }

  // Trim the remainder start
  working = working.replace(/^\s+/, "");

  // Build new leading token segment depending on provided values
  const parts: string[] = [];
  if (poNumber) parts.push(`PO# ${poNumber}`);
  if (woNumber) parts.push(`W.O# ${woNumber}`);

  if (parts.length === 0) {
    // No values provided: simply return the remainder (tokens removed)
    return working;
  }

  const tokenSegment = parts.join("  ");
  // Join with two spaces between token segment and remainder for layout
  return tokenSegment + (working ? `  ${working}` : "");
}

/**
 * Inject placeholder tokens into text that has PO/W.O placeholders.
 * Used by invoice-parser to normalize detected placeholders into tokens.
 */
export function injectPOWOTokens(text: string): string {
  let result = text;

  // Patterns indicating PO placeholder - replace with token
  const poPatterns = [
    /\bPO\s*#\s*(?:pending|awaiting|tbd|tba|to\s+be\s+assigned)\b/gi,
    /\bpending\s+(?:po|purchase\s+order)\b/gi,
    /\bawaiting\s+(?:po|purchase\s+order)\b/gi,
  ];

  for (const pattern of poPatterns) {
    if (pattern.test(result)) {
      result = result.replace(pattern, "{PO#}");
      pattern.lastIndex = 0;
    }
  }

  // Patterns indicating W.O placeholder - replace with token
  const woPatterns = [
    /\bW\.?O\.?\s*#\s*(?:pending|awaiting|tbd|tba|to\s+be\s+assigned)\b/gi,
    /\bpending\s+(?:wo|work\s+order)\b/gi,
    /\bawaiting\s+(?:wo|work\s+order)\b/gi,
  ];

  for (const pattern of woPatterns) {
    if (pattern.test(result)) {
      result = result.replace(pattern, "{WO#}");
      pattern.lastIndex = 0;
    }
  }

  return result;
}

/**
 * For activity descriptions that need both PO# and W.O# on same line,
 * inject the combined token {PO_WO#} instead of separate tokens.
 */
export function injectPOWOCombinedToken(text: string): string {
  let result = text;

  // First check if it already has separate tokens
  if (/{PO#}/.test(result) || /{WO#}/.test(result)) {
    // Already has tokens, convert to combined form
    result = result.replace(/{PO#}/, "{PO_WO#}");
    result = result.replace(/{WO#}/, ""); // Remove separate W.O token
    result = result.trim();
  } else {
    // Check for placeholder patterns and inject combined token
    const poPatterns = [
      /\bPO\s*#\s*(?:pending|awaiting|tbd|tba)\b/gi,
      /\bpending\s+(?:po|purchase\s+order)\b/gi,
    ];

    const woPatterns = [
      /\bW\.?O\.?\s*#\s*(?:pending|awaiting|tbd|tba)\b/gi,
      /\bpending\s+(?:wo|work\s+order)\b/gi,
    ];

    let hasPo = false;
    let hasWo = false;

    for (const pattern of poPatterns) {
      if (pattern.test(result)) {
        hasPo = true;
        pattern.lastIndex = 0;
        break;
      }
    }

    for (const pattern of woPatterns) {
      if (pattern.test(result)) {
        hasWo = true;
        pattern.lastIndex = 0;
        break;
      }
    }

    // If both found, use combined token
    if (hasPo || hasWo) {
      result = result.replace(poPatterns[0], "{PO_WO#}");
      result = result.replace(
        / *W\.?O\.?\s*#\s*(?:pending|awaiting|tbd|tba)\b/gi,
        "",
      );
      result = result.trim();
    }
  }

  return result;
}

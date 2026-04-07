/**
 * Invoice transformer — applies business rules to parsed invoices.
 *
 * Supported operations:
 *  1. Apply 1% markup to all monetary fields (service, tax, credit, totals)
 *  2. Replace PO placeholder text with a real PO number
 *  3. Assemble a ProcessedInvoice combining original + marked-up versions
 */

import type {
  ParsedInvoice,
  ParsedLineItem,
  ProcessedInvoice,
} from "@/types/invoice";
import { applyMarkup } from "@/lib/currency";
import {
  detectPOPlaceholder,
  replacePOPlaceholder,
  replaceExistingPO,
  replaceAnyExistingPO,
  detectWOPlaceholder,
  replaceWOPlaceholder,
  replaceExistingWO,
  replaceAnyExistingWO,
} from "@/lib/text-replacement";
import {
  hasPOToken,
  hasWOToken,
  replacePOToken,
  replaceWOToken,
  replacePOWOTokens,
  cleanupUnreplacedTokens,
} from "@/lib/token-replacement";

/**
 * Apply percentage markup to all monetary fields of an invoice.
 * Line item amounts are marked up individually, then totals are
 * RECALCULATED from the marked-up line items to guarantee consistency.
 *
 * KEY BUSINESS RULES:
 * - Mark up ALL service line items by the specified percentage (default 1%)
 * - Subtotal is ALWAYS recalculated from marked-up service line items (never from PDF extraction)
 * - If tax exists, mark it up independently (same 1% as services), NOT as a multiplier
 * - Total = Marked-Up Subtotal + Marked-Up Tax (never multiply, which would over-tax)
 * - If tax does not exist, do NOT inject tax
 * - Balance due is ALWAYS recalculated from marked-up subtotal, tax, and credits (never from PDF extraction)
 * - Preserve original invoice structure (tax presence/absence)
 * - Credits are marked up as well for consistency
 *
 * Returns a new, immutable copy — does not mutate the original.
 */
export function applyMarkupToInvoice(
  invoice: ParsedInvoice,
  markupPercent: number = 1,
): ParsedInvoice {
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const factor = 1 + markupPercent / 100;

  // ─── Step 1: Mark up line items (High Precision) ─────────────────
  // CRITICAL: Ensure ALL service items get marked up, not just some
  const markedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => {
    // Apply markup to all item types consistently
    const markupMultiplier = item.type === "credit" ? factor : factor; // Credits also get 1%
    return {
      ...item,
      // We do NOT round here to preserve precision for the final total
      amount: item.amount !== null ? item.amount * markupMultiplier : null,
      rate: item.rate !== null ? item.rate * markupMultiplier : null,
    };
  });

  // ─── Step 2: Calculate Marked-Up Subtotal ────────────────────────
  // CRITICAL: ALWAYS recalculate from marked-up line items, NEVER use PDF-extracted subtotal
  // This ensures Services amount includes the 1% markup
  const serviceItems = markedLineItems.filter((it) => it.type === "service");
  let subtotalRaw = serviceItems.reduce((sum, it) => sum + (it.amount ?? 0), 0);

  // Verify: if the original PDF had a subtotal, it should roughly match (within 5%)
  // If there's a large discrepancy, log a warning for debugging
  if (invoice.subtotal !== null && subtotalRaw > 0) {
    const expectedSubtotal = invoice.subtotal * factor;
    const discrepancy =
      Math.abs(subtotalRaw - expectedSubtotal) / expectedSubtotal;
    if (discrepancy > 0.05) {
      console.warn(
        `[applyMarkupToInvoice] Subtotal discrepancy detected: recalculated=${subtotalRaw}, expected=${expectedSubtotal}, difference=${(discrepancy * 100).toFixed(2)}%`,
      );
    }
  }

  // ─── Step 3: Mark Up Tax Independently ────────────────────────
  // CRITICAL FIX: Tax must be marked up as a separate line item (if it exists)
  // NOT applied as a multiplicative multiplier on the new subtotal, which would
  // cause double-taxation and incorrect balance due values.
  let taxAmountRaw: number | null = null;
  let totalAmountRaw: number | null = null;

  if (subtotalRaw > 0) {
    // 1. Mark up the tax amount independently (same 1% markup as services)
    if (invoice.taxAmount !== null && invoice.taxAmount > 0) {
      taxAmountRaw = invoice.taxAmount * factor; // Apply markup to tax as well
      totalAmountRaw = subtotalRaw + taxAmountRaw;
    } else {
      // No tax in original, don't add tax
      totalAmountRaw = subtotalRaw;
    }
  }

  // ─── Step 4: Handle Credit ───────────────────────────────────────
  // Credits are marked up for consistency
  const creditFromItems = markedLineItems
    .filter((it) => it.type === "credit")
    .reduce((sum, it) => sum + Math.abs(it.amount ?? 0), 0);

  let creditAmountRaw =
    creditFromItems > 0
      ? creditFromItems
      : invoice.creditAmount !== null
        ? invoice.creditAmount * factor
        : null;

  // ─── Step 5: Final Balanced Calculation ──────────────────────────
  // CRITICAL: Balance Due is ALWAYS recalculated, never uses PDF extraction
  const balanceDueRaw =
    totalAmountRaw !== null ? totalAmountRaw - (creditAmountRaw ?? 0) : null;

  // ─── Step 6: Final Rounding (ONLY AT OUTPUT) ─────────────────────
  // CRITICAL: Round totalAmount FIRST to avoid rounding discrepancies
  // This ensures: subtotal + tax = totalAmount (no rounding errors)
  const totalAmount = totalAmountRaw !== null ? round2(totalAmountRaw) : null;

  // Now derive subtotal and tax from the rounded totalAmount
  const subtotal = subtotalRaw > 0 ? round2(subtotalRaw) : null;
  const taxAmount =
    totalAmount !== null && subtotal !== null
      ? round2(totalAmount - subtotal)
      : taxAmountRaw !== null && taxAmountRaw > 0
        ? round2(taxAmountRaw)
        : null;

  const creditAmount =
    creditAmountRaw !== null && creditAmountRaw > 0
      ? round2(creditAmountRaw)
      : null;

  // CRITICAL: Always recalculate balance due, ensuring it includes the 1% markup
  // Balance Due must be: totalAmount - creditAmount (not subtotal + tax - credit)
  // Using totalAmount ensures no rounding discrepancies between separate calculations
  const recalculatedBalanceDue =
    totalAmount !== null
      ? round2(totalAmount - (creditAmount ?? 0))
      : balanceDueRaw !== null
        ? round2(balanceDueRaw)
        : null;

  // Round line items for the final output as well
  const finalLineItems = markedLineItems.map((item) => ({
    ...item,
    amount: item.amount !== null ? round2(item.amount) : null,
    rate: item.rate !== null ? round2(item.rate) : null,
  }));

  return {
    ...invoice,
    lineItems: finalLineItems,
    subtotal,
    taxAmount,
    creditAmount,
    totalAmount,
    // CRITICAL: Use recalculated balance due, never extract from PDF
    balanceDue: recalculatedBalanceDue ?? totalAmount ?? null,
  };
}

/**
 * Apply PO replacement to all description fields of an invoice.
 * Prioritizes token-based replacement ({PO#}) for clean, atomic updates.
 * Falls back to regex-based replacement for legacy patterns.
 */
export function applyPOReplacement(
  invoice: ParsedInvoice,
  poNumber: string,
): ParsedInvoice {
  const updatedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => {
    let desc = item.description;
    let title = item.title;

    // PRIORITY 1: Token-based replacement (clean, atomic)
    if (hasPOToken(desc)) {
      const result = replacePOToken(desc, poNumber);
      desc = result.text;
    } else {
      // PRIORITY 2: Falls back to regex patterns for legacy invoices
      desc = replacePOPlaceholder(desc, poNumber);
      if (invoice.poNumber) {
        desc = replaceExistingPO(desc, invoice.poNumber, poNumber);
      }
    }

    // Same for title
    if (hasPOToken(title)) {
      const result = replacePOToken(title, poNumber);
      title = result.text;
    } else {
      title = replacePOPlaceholder(title, poNumber);
      if (invoice.poNumber) {
        title = replaceExistingPO(title, invoice.poNumber, poNumber);
      }
    }

    // Cleanup any remaining unreplaced tokens
    desc = cleanupUnreplacedTokens(desc);
    title = cleanupUnreplacedTokens(title);

    return {
      ...item,
      description: desc,
      title: title,
    };
  });

  return {
    ...invoice,
    lineItems: updatedLineItems,
    poPlaceholderDetected: false, // has been resolved
    poOriginalText: invoice.poOriginalText, // keep for audit trail in UI
    poNumber: poNumber, // updated existing PO field
  };
}

/**
 * Apply WO replacement to all description fields of an invoice - DISABLED
 * W.O. features are currently disabled
 */
export function applyWOReplacement(
  invoice: ParsedInvoice,
  woNumber: string,
): ParsedInvoice {
  // W.O. replacement disabled
  return invoice;
}

/**
 * Apply both PO and WO replacements in a single pass - W.O. DISABLED
 * W.O. features are currently disabled. Only PO replacement is active.
 */
export function applyPOWOReplacement(
  invoice: ParsedInvoice,
  poNumber?: string,
  woNumber?: string,
): ParsedInvoice {
  if (!poNumber) {
    return invoice;
  }

  const updatedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => {
    let desc = item.description;
    let title = item.title;

    if (item.type === "service" && poNumber) {
      const isServiceAddress =
        /Service\s+Address|SERVICE ADDRESS|[A-Z][a-z]+,?\s+[A-Z]{2}\s+\d{5}/i.test(
          desc,
        );

      if (!isServiceAddress) {
        // PRIORITY 1: Check for token-based placeholders first (e.g., {PO#})
        if (hasPOToken(desc) && poNumber) {
          const result = replacePOToken(desc, poNumber);
          desc = result.text;
        }

        // PRIORITY 2: Check for text-based placeholders
        const poPlaceholder = detectPOPlaceholder(desc);

        // ALWAYS try to replace PO - whether there's a placeholder or existing value
        if (poNumber) {
          if (poPlaceholder.detected) {
            // Replace placeholder text like "pending"
            desc = replacePOPlaceholder(desc, poNumber);
          }
          // ALSO always replace existing PO/Order numbers
          if (/PO\s*#/i.test(desc)) {
            desc = desc.replace(
              /PO\s*#\s*[A-Za-z0-9\-\/\.]+/gi,
              `PO# ${poNumber}`,
            );
          } else if (/Order\s*#/i.test(desc)) {
            desc = desc.replace(
              /Order\s*#\s*[A-Za-z0-9\-\/\.]+/gi,
              `Order # ${poNumber}`,
            );
          }
        }
      }
    }

    return {
      ...item,
      description: desc,
      title: title,
    };
  });

  return {
    ...invoice,
    lineItems: updatedLineItems,
    poPlaceholderDetected: false,
    poNumber: poNumber ?? invoice.poNumber,
  };
}

/**
 * Build the full ProcessedInvoice combining original and marked-up versions.
 * Automatically detects whether PO replacement was applied.
 */
export function buildProcessedInvoice(
  original: ParsedInvoice,
  poNumber?: string,
  markupPercent: number = 1,
  invoiceDate?: string,
  dueDate?: string,
): ProcessedInvoice {
  const warnings: string[] = [];

  // Apply PO replacement only if a PO number was explicitly provided from the frontend/tool.
  // We no longer force a "Pending PO" default to avoid double-rendering issues.
  const finalPo = poNumber;

  // Enforce a fixed 1% markup regardless of caller-supplied value
  const enforcedMarkup = 1;
  let markedUp = applyMarkupToInvoice(original, enforcedMarkup);

  // Transfer provided PO parameters to markedUp directly for the GUI overlay engine
  markedUp.poNumber = finalPo ?? null;
  if (invoiceDate) {
    markedUp.invoiceDate = invoiceDate;
  }
  if (dueDate) {
    markedUp.dueDate = dueDate;
  }

  // Detect placeholders: Check for BOTH token-based and regex-based patterns
  const hasPoToken = original.lineItems.some((item) =>
    hasPOToken(item.description),
  );
  const hasPoPlaceholder =
    original.poPlaceholderDetected ||
    hasPoToken ||
    original.lineItems.some(
      (item) => detectPOPlaceholder(item.description).detected,
    );
  const hasExistingPO = !!original.poNumber;

  // Apply replacements using combined function (PO only - W.O. disabled)
  if ((hasPoPlaceholder || hasExistingPO) && finalPo) {
    markedUp = applyPOWOReplacement(markedUp, finalPo);
  }

  const poReplacementApplied = !!(
    finalPo &&
    (hasPoPlaceholder || hasExistingPO)
  );

  if (original.lowConfidence) {
    warnings.push(
      "The invoice was partially extracted. Review the values before generating the PDF.",
    );
  }

  if (!original.balanceDue && !original.totalAmount) {
    warnings.push(
      "No monetary totals were detected. The markup may be incomplete.",
    );
  }

  return {
    original,
    markedUp,
    markupPercent: enforcedMarkup,
    poReplacementApplied,
    replacementPoNumber: finalPo ?? null,
    warnings,
  };
}

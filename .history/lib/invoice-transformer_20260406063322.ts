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
  detectWOPlaceholder,
  replaceWOPlaceholder,
  replaceExistingWO,
} from "@/lib/text-replacement";

/**
 * Apply percentage markup to all monetary fields of an invoice.
 * Line item amounts are marked up individually, then totals are
 * RECALCULATED from the marked-up line items to guarantee consistency.
 *
 * KEY BUSINESS RULES:
 * - Mark up ALL service line items by the specified percentage (default 1%)
 * - Subtotal is ALWAYS recalculated from marked-up service line items (never from PDF extraction)
 * - If tax exists, recalculate from markup AND preserve original tax rate
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

  // ─── Step 3: Dynamic Multiplicative Tax Calculation ──────────────
  // We determine the correct multiplier from the ORIGINAL invoice
  // to ensure exactly a 1% increase while staying multiplicative.
  let totalAmountRaw: number | null = null;
  let taxAmountRaw: number | null = null;

  if (subtotalRaw > 0) {
    // 1. Calculate original tax rate (fallback to 6.35% only if tax existed but rate unknown)
    let taxMultiplier = 1.0;
    if (invoice.taxRate !== null) {
      taxMultiplier = 1 + invoice.taxRate / 100;
    } else if (
      invoice.taxAmount !== null &&
      invoice.subtotal &&
      invoice.subtotal > 0
    ) {
      taxMultiplier = 1 + invoice.taxAmount / invoice.subtotal;
    } else if (invoice.taxAmount !== null && invoice.taxAmount > 0) {
      // If we have tax amount but no subtotal to derive rate, use ratio from marked-up values
      // This ensures tax is preserved proportionally
      taxMultiplier = 1 + invoice.taxAmount / (invoice.subtotal || 1);
    } else {
      // No tax in original, don't add tax
      totalAmountRaw = subtotalRaw;
    }

    // 2. Apply multiplicative formula: total = subtotal * multiplier (only if tax exists)
    if (totalAmountRaw === null) {
      totalAmountRaw = subtotalRaw * taxMultiplier;
      taxAmountRaw = totalAmountRaw - subtotalRaw;
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
  const subtotal = subtotalRaw > 0 ? round2(subtotalRaw) : null;
  const taxAmount =
    taxAmountRaw !== null && taxAmountRaw > 0 ? round2(taxAmountRaw) : null;
  const creditAmount =
    creditAmountRaw !== null && creditAmountRaw > 0
      ? round2(creditAmountRaw)
      : null;

  // CRITICAL: Always recalculate balance due, ensuring it includes the 1% markup
  // Balance Due must include: (Subtotal + Tax) - Credit
  const recalculatedBalanceDue =
    subtotal !== null
      ? round2(subtotal + (taxAmount ?? 0) - (creditAmount ?? 0))
      : balanceDueRaw !== null
        ? round2(balanceDueRaw)
        : null;

  // Determine totalAmount: if the original invoice treats totalAmount and
  // balanceDue as the same field (both equal), keep them synchronized after markup.
  // Otherwise, totalAmount = subtotal + tax (independent of credit).
  const originalTotalEqualsBalance =
    invoice.totalAmount !== null &&
    invoice.balanceDue !== null &&
    Math.abs(invoice.totalAmount - invoice.balanceDue) < 0.02;

  let totalAmount: number | null;
  if (originalTotalEqualsBalance && recalculatedBalanceDue !== null) {
    // Same field on the PDF — keep them synchronized
    totalAmount = recalculatedBalanceDue;
  } else {
    totalAmount = totalAmountRaw !== null ? round2(totalAmountRaw) : null;
  }

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
 */
export function applyPOReplacement(
  invoice: ParsedInvoice,
  poNumber: string,
): ParsedInvoice {
  const updatedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => {
    let desc = item.description;
    let title = item.title;

    // Case A: Placeholder
    desc = replacePOPlaceholder(desc, poNumber);
    title = replacePOPlaceholder(title, poNumber);

    // Case B: Existing PO
    if (invoice.poNumber) {
      desc = replaceExistingPO(desc, invoice.poNumber, poNumber);
      title = replaceExistingPO(title, invoice.poNumber, poNumber);
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
    poPlaceholderDetected: false, // has been resolved
    poOriginalText: invoice.poOriginalText, // keep for audit trail in UI
    poNumber: poNumber, // updated existing PO field
  };
}

/**
 * Apply WO replacement to all description fields of an invoice.
 */
export function applyWOReplacement(
  invoice: ParsedInvoice,
  woNumber: string,
): ParsedInvoice {
  const updatedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => {
    let desc = item.description;
    let title = item.title;

    // Case A: Placeholder
    desc = replaceWOPlaceholder(desc, woNumber);
    title = replaceWOPlaceholder(title, woNumber);

    // Case B: Existing WO
    if (invoice.woNumber) {
      desc = replaceExistingWO(desc, invoice.woNumber, woNumber);
      title = replaceExistingWO(title, invoice.woNumber, woNumber);
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
    woNumber: woNumber,
  };
}

/**
 * Build the full ProcessedInvoice combining original and marked-up versions.
 * Automatically detects whether PO replacement was applied.
 */
export function buildProcessedInvoice(
  original: ParsedInvoice,
  poNumber?: string,
  woNumber?: string,
  markupPercent: number = 1,
  invoiceDate?: string,
  dueDate?: string,
): ProcessedInvoice {
  const warnings: string[] = [];

  // Apply PO replacement only if a PO number was explicitly provided from the frontend/tool.
  // We no longer force a "Pending PO" default to avoid double-rendering issues.
  const finalPo = poNumber;

  // Apply markup first
  let markedUp = applyMarkupToInvoice(original, markupPercent);

  // Transfer provided PO/WO parameters to markedUp directly for the GUI overlay engine
  markedUp.poNumber = finalPo ?? null;
  if (woNumber) {
    markedUp.woNumber = woNumber;
  }
  if (invoiceDate) {
    markedUp.invoiceDate = invoiceDate;
  }
  if (dueDate) {
    markedUp.dueDate = dueDate;
  }

  // Apply PO replacement if a PO number was provided
  const hasPoPlaceholder =
    original.poPlaceholderDetected ||
    original.lineItems.some(
      (item) => detectPOPlaceholder(item.description).detected,
    );
  const hasExistingPO = !!original.poNumber;

  if ((hasPoPlaceholder || hasExistingPO) && finalPo) {
    markedUp = applyPOReplacement(markedUp, finalPo);
  }

  // Apply WO replacement if a WO number was provided
  const hasWoPlaceholder = original.lineItems.some(
    (item) => detectWOPlaceholder(item.description).detected,
  );
  const hasExistingWO = !!original.woNumber;

  if ((hasWoPlaceholder || hasExistingWO) && woNumber) {
    markedUp = applyWOReplacement(markedUp, woNumber);
  }

  const poReplacementApplied = !!(
    finalPo &&
    (hasPoPlaceholder || hasExistingPO)
  );

  const woReplacementApplied = !!(
    woNumber &&
    (hasWoPlaceholder || hasExistingWO)
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
    markupPercent,
    poReplacementApplied,
    woReplacementApplied,
    replacementPoNumber: finalPo ?? null,
    replacementWoNumber: woNumber ?? null,
    warnings,
  };
}

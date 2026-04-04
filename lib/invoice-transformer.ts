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
} from "@/lib/text-replacement";

/**
 * Apply percentage markup to all monetary fields of an invoice.
 * Line item amounts are marked up individually, then totals are
 * RECALCULATED from the marked-up line items to guarantee consistency.
 *
 * KEY BUSINESS RULES:
 * - Preserve original invoice structure (tax presence/absence)
 * - If tax exists, recalculate from markup AND preserve original tax rate
 * - If tax does not exist, do NOT inject tax
 * - Credits are preserved as-is
 * - Balance due is recalculated from structured values, never patched
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
  const markedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => {
    return {
      ...item,
      // We do NOT round here to preserve precision for the final total
      amount: item.amount !== null ? item.amount * factor : null,
      rate: item.rate !== null ? item.rate * factor : null,
    };
  });

  // ─── Step 2: Calculate Marked-Up Subtotal ────────────────────────
  let subtotalRaw =
    invoice.subtotal !== null ? invoice.subtotal * factor : null;

  // Fallback: if header subtotal is missing, sum the marked-up line items
  if (subtotalRaw === null) {
    subtotalRaw = markedLineItems
      .filter((it) => it.type === "service")
      .reduce((sum, it) => sum + (it.amount ?? 0), 0);
  }

  // ─── Step 3: Dynamic Multiplicative Tax Calculation ──────────────
  // We determine the correct multiplier from the ORIGINAL invoice
  // to ensure exactly a 1% increase while staying multiplicative.
  let totalAmountRaw: number | null = null;
  let taxAmountRaw: number | null = null;

  if (subtotalRaw !== null) {
    // 1. Calculate original tax rate (fallback to 6.35% only if tax existed but rate unknown)
    let taxMultiplier = 1.0;
    if (invoice.taxRate !== null) {
      taxMultiplier = 1 + invoice.taxRate / 100;
    } else if (invoice.taxAmount !== null && invoice.subtotal) {
      taxMultiplier = 1 + invoice.taxAmount / invoice.subtotal;
    } else if (invoice.taxAmount !== null) {
      // Fallback if we have tax but no subtotal to derive rate
      taxMultiplier = 1.0635;
    }

    // 2. Apply multiplicative formula: total = subtotal * multiplier
    totalAmountRaw = subtotalRaw * taxMultiplier;
    taxAmountRaw = totalAmountRaw - subtotalRaw;
  }

  // ─── Step 4: Handle Credit ───────────────────────────────────────
  let creditAmountRaw =
    invoice.creditAmount !== null ? invoice.creditAmount * factor : null;

  // Fallback: derive credit from credit line items if header credit is missing
  if (creditAmountRaw === null) {
    const creditFromItems = markedLineItems
      .filter((it) => it.type === "credit")
      .reduce((sum, it) => sum + Math.abs(it.amount ?? 0), 0);
    if (creditFromItems > 0) {
      creditAmountRaw = creditFromItems;
    }
  }

  // ─── Step 5: Final Balanced Calculation ──────────────────────────
  const balanceDueRaw =
    totalAmountRaw !== null ? totalAmountRaw - (creditAmountRaw ?? 0) : null;

  // ─── Step 6: Final Rounding (ONLY AT OUTPUT) ─────────────────────
  const subtotal = subtotalRaw !== null ? round2(subtotalRaw) : null;
  const taxAmount = taxAmountRaw !== null ? round2(taxAmountRaw) : null;
  const creditAmount =
    creditAmountRaw !== null && creditAmountRaw > 0
      ? round2(creditAmountRaw)
      : null;
  const balanceDue = balanceDueRaw !== null ? round2(balanceDueRaw) : null;

  // Determine totalAmount: if the original invoice treats totalAmount and
  // balanceDue as the same field (both equal), keep them in sync after markup.
  // Otherwise, totalAmount = subtotal + tax (independent of credit).
  const originalTotalEqualsBalance =
    invoice.totalAmount !== null &&
    invoice.balanceDue !== null &&
    Math.abs(invoice.totalAmount - invoice.balanceDue) < 0.02;

  let totalAmount: number | null;
  if (originalTotalEqualsBalance && balanceDue !== null) {
    // Same field on the PDF — keep them synchronized
    totalAmount = balanceDue;
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
    balanceDue:
      balanceDue !== null && balanceDue > 0 ? balanceDue : totalAmount,
  };
}

/**
 * Apply PO replacement to all description fields of an invoice.
 * Returns a new, immutable copy.
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

  // Automatically use "Pending PO" if no real PO number is available per requirements
  const finalPo = poNumber || "Pending PO";

  // Apply markup first
  let markedUp = applyMarkupToInvoice(original, markupPercent);

  // Transfer provided PO/WO parameters to markedUp directly for the GUI overlay engine
  markedUp.poNumber = finalPo;
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
  const hasPlaceholder =
    original.poPlaceholderDetected ||
    original.lineItems.some(
      (item) => detectPOPlaceholder(item.description).detected,
    );
  const hasExistingPO = !!original.poNumber;

  const poReplacementApplied = !!(
    poNumber &&
    (hasPlaceholder || hasExistingPO)
  );

  if (hasPlaceholder || hasExistingPO) {
    markedUp = applyPOReplacement(markedUp, finalPo);
  }

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
    replacementPoNumber: poReplacementApplied
      ? (poNumber ?? null)
      : (poNumber ?? null),
    replacementWoNumber: woNumber ?? null,
    warnings,
  };
}

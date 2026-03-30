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

  // ─── Step 1: Mark up line items ──────────────────────────────────
  // Key requirement: "All monetary amounts on the invoice must be silently multiplied by 1.01"
  const markedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => {
    return {
      ...item,
      amount: item.amount !== null ? round2(item.amount * factor) : null,
      rate: item.rate !== null ? round2(item.rate * factor) : null,
    };
  });

  // ─── Step 2: Mark up header totals ───────────────────────────────
  // Recalculate component totals if they exist in the original
  const subtotal =
    invoice.subtotal !== null ? round2(invoice.subtotal * factor) : null;
  const taxAmount =
    invoice.taxAmount !== null ? round2(invoice.taxAmount * factor) : null;
  const creditAmount =
    invoice.creditAmount !== null
      ? round2(invoice.creditAmount * factor)
      : null;

  // Balance due and total amount must also be multiplied by 1.01
  const balanceDue =
    invoice.balanceDue !== null ? round2(invoice.balanceDue * factor) : null;
  const totalAmount =
    invoice.totalAmount !== null ? round2(invoice.totalAmount * factor) : null;

  return {
    ...invoice,
    lineItems: markedLineItems,
    subtotal,
    taxAmount,
    creditAmount,
    totalAmount,
    balanceDue,
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
  markupPercent: number = 1,
): ProcessedInvoice {
  const warnings: string[] = [];

  // Apply markup first
  let markedUp = applyMarkupToInvoice(original, markupPercent);

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

  if (poNumber && poReplacementApplied) {
    markedUp = applyPOReplacement(markedUp, poNumber);
  } else if (poNumber && !poReplacementApplied) {
    warnings.push(
      "A PO number was provided but no PO placeholder was found in the invoice.",
    );
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
    replacementPoNumber: poReplacementApplied ? (poNumber ?? null) : null,
    warnings,
  };
}

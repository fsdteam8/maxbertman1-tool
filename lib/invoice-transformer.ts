/**
 * Invoice transformer — applies business rules to parsed invoices.
 *
 * Supported operations:
 *  1. Apply 1% markup to all monetary fields (service, tax, credit, totals)
 *  2. Replace PO placeholder text with a real PO number
 *  3. Assemble a ProcessedInvoice combining original + marked-up versions
 */

import type { ParsedInvoice, ParsedLineItem, ProcessedInvoice } from "@/types/invoice";
import { applyMarkup } from "@/lib/currency";
import { detectPOPlaceholder, replacePOPlaceholder } from "@/lib/text-replacement";

/**
 * Apply percentage markup to all monetary fields of an invoice.
 * Returns a new, immutable copy — does not mutate the original.
 */
export function applyMarkupToInvoice(
  invoice: ParsedInvoice,
  markupPercent: number = 1
): ParsedInvoice {
  const markAmount = (v: number | null) =>
    v !== null ? applyMarkup(v, markupPercent) : null;

  const markedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => ({
    ...item,
    amount: markAmount(item.amount),
    rate: item.rate !== null ? applyMarkup(item.rate, markupPercent) : null,
  }));

  return {
    ...invoice,
    lineItems: markedLineItems,
    balanceDue: markAmount(invoice.balanceDue),
    subtotal: markAmount(invoice.subtotal),
    taxAmount: markAmount(invoice.taxAmount),
    creditAmount: markAmount(invoice.creditAmount),
    totalAmount: markAmount(invoice.totalAmount),
  };
}

/**
 * Apply PO replacement to all description fields of an invoice.
 * Returns a new, immutable copy.
 */
export function applyPOReplacement(
  invoice: ParsedInvoice,
  poNumber: string
): ParsedInvoice {
  const updatedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => ({
    ...item,
    description: replacePOPlaceholder(item.description, poNumber),
    title: replacePOPlaceholder(item.title, poNumber),
  }));

  return {
    ...invoice,
    lineItems: updatedLineItems,
    poPlaceholderDetected: false, // has been resolved
    poOriginalText: invoice.poOriginalText, // keep for audit trail in UI
  };
}

/**
 * Build the full ProcessedInvoice combining original and marked-up versions.
 * Automatically detects whether PO replacement was applied.
 */
export function buildProcessedInvoice(
  original: ParsedInvoice,
  poNumber?: string,
  markupPercent: number = 1
): ProcessedInvoice {
  const warnings: string[] = [];

  // Apply markup first
  let markedUp = applyMarkupToInvoice(original, markupPercent);

  // Apply PO replacement if a PO number was provided and a placeholder exists
  const poReplacementApplied = !!(
    poNumber &&
    (original.poPlaceholderDetected ||
      original.lineItems.some(
        (item) => detectPOPlaceholder(item.description).detected
      ))
  );

  if (poNumber && poReplacementApplied) {
    markedUp = applyPOReplacement(markedUp, poNumber);
  } else if (poNumber && !poReplacementApplied) {
    warnings.push(
      "A PO number was provided but no PO placeholder was found in the invoice."
    );
  }

  if (original.lowConfidence) {
    warnings.push(
      "The invoice was partially extracted. Review the values before generating the PDF."
    );
  }

  if (!original.balanceDue && !original.totalAmount) {
    warnings.push(
      "No monetary totals were detected. The markup may be incomplete."
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

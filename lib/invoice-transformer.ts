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
} from "@/lib/text-replacement";

/**
 * Apply percentage markup to all monetary fields of an invoice.
 * Line item amounts are marked up individually, then totals are
 * RECALCULATED from the marked-up line items to guarantee consistency.
 * Returns a new, immutable copy — does not mutate the original.
 */
export function applyMarkupToInvoice(
  invoice: ParsedInvoice,
  markupPercent: number = 1,
): ParsedInvoice {
  const markAmount = (v: number | null) =>
    v !== null ? applyMarkup(v, markupPercent) : null;

  const round2 = (v: number) => Math.round(v * 100) / 100;

  // 1. Mark up each line item's amount and rate
  const markedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => ({
    ...item,
    amount: markAmount(item.amount),
    rate: item.rate !== null ? applyMarkup(item.rate, markupPercent) : null,
  }));

  // 2. Recalculate totals from marked-up line items
  const serviceTotal = round2(
    markedLineItems
      .filter((it) => it.type === "service")
      .reduce((sum, it) => sum + (it.amount ?? 0), 0),
  );

  let taxTotal = round2(
    markedLineItems
      .filter((it) => it.type === "tax")
      .reduce((sum, it) => sum + (it.amount ?? 0), 0),
  );

  // 3. Always ensure a 1% tax is applied for automation.
  // If a tax line natively exists (e.g. extracted as $0.00), overwrite its amount to be 1%.
  // If no tax line exists at all, inject a new one.
  if (serviceTotal > 0) {
    const autoTax = round2(serviceTotal * 0.01);
    const existingTaxItem = markedLineItems.find((it) => it.type === "tax");

    if (existingTaxItem) {
      existingTaxItem.amount = autoTax;
      if (
        !existingTaxItem.description ||
        existingTaxItem.description === "Sales Tax"
      ) {
        existingTaxItem.description = "Sales Tax (1%)";
      }
      taxTotal = autoTax;
    } else {
      markedLineItems.push({
        title: "Sales Tax",
        description: "Sales Tax (1%)",
        serviceDateRange: null,
        quantity: null,
        rate: null,
        amount: autoTax,
        type: "tax",
      });
      taxTotal = autoTax;
    }
  }

  const creditTotal = round2(
    markedLineItems
      .filter((it) => it.type === "credit")
      .reduce((sum, it) => sum + Math.abs(it.amount ?? 0), 0),
  );

  const newSubtotal = serviceTotal;
  const newTaxAmount = taxTotal;
  const newCreditAmount = creditTotal;
  const newTotalAmount = round2(newSubtotal + newTaxAmount - newCreditAmount);
  const newBalanceDue = newTotalAmount;

  return {
    ...invoice,
    lineItems: markedLineItems,

    // always populate recalculated values when they exist logically
    subtotal: newSubtotal,
    taxAmount: newTaxAmount,
    creditAmount: newCreditAmount,
    totalAmount: newTotalAmount,
    balanceDue: newBalanceDue,
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
  markupPercent: number = 1,
): ProcessedInvoice {
  const warnings: string[] = [];

  // Apply markup first
  let markedUp = applyMarkupToInvoice(original, markupPercent);

  // Apply PO replacement if a PO number was provided and a placeholder exists
  const poReplacementApplied = !!(
    poNumber &&
    (original.poPlaceholderDetected ||
      original.lineItems.some(
        (item) => detectPOPlaceholder(item.description).detected,
      ))
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

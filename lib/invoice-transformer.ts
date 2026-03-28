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

  // ─── Step 1: Compute original totals BEFORE markup ────────────────
  const originalServiceTotal = round2(
    invoice.lineItems
      .filter((it) => it.type === "service")
      .reduce((sum, it) => sum + (it.amount ?? 0), 0),
  );

  const originalTaxTotal = round2(
    invoice.lineItems
      .filter((it) => it.type === "tax")
      .reduce((sum, it) => sum + (it.amount ?? 0), 0),
  );

  // Detect original tax rate (e.g., 6.35% = 0.0635)
  const hasTax = originalTaxTotal > 0 && originalServiceTotal > 0;
  const originalTaxRate = hasTax ? originalTaxTotal / originalServiceTotal : 0;

  // ─── Step 2: Mark up ONLY service items ───────────────────────────
  const markedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => {
    if (item.type === "service") {
      return {
        ...item,
        amount:
          item.amount !== null ? applyMarkup(item.amount, markupPercent) : null,
        rate: item.rate !== null ? applyMarkup(item.rate, markupPercent) : null,
      };
    }
    // Credits and other types: preserve unchanged
    return { ...item };
  });

  // ─── Step 3: Recalculate totals ───────────────────────────────────
  const newServiceTotal = round2(
    markedLineItems
      .filter((it) => it.type === "service")
      .reduce((sum, it) => sum + (it.amount ?? 0), 0),
  );

  // KEY BUSINESS RULE: Preserve original tax presence/absence
  // If original had tax, recalculate with original rate applied to new service total
  // If original had NO tax, do NOT inject tax
  let finalMarkedItems = [...markedLineItems];
  let newTaxTotal = 0;
  let taxRateApplied = originalTaxRate;

  if (hasTax && originalTaxRate > 0) {
    // Tax exists: preserve rate, recalculate amount on marked-up service total
    newTaxTotal = round2(newServiceTotal * originalTaxRate);

    // Update existing tax rows to reflect new amount
    finalMarkedItems = finalMarkedItems.map((item) => {
      if (item.type === "tax") {
        const taxPercent = (originalTaxRate * 100).toFixed(2);
        return {
          ...item,
          title: item.title, // Keep original title
          description: item.description.includes("%")
            ? item.description // Keep original description if it has rate
            : `Tax (${taxPercent}%)`, // Otherwise update with rate
          amount: newTaxTotal,
        };
      }
      return item;
    });
  } else {
    // No tax in original: do NOT inject tax
    // Simply filter out any tax rows if present
    finalMarkedItems = finalMarkedItems.filter((it) => it.type !== "tax");
  }

  // Credits: sum unchanged (NOT marked up)
  const newCreditTotal = round2(
    finalMarkedItems
      .filter((it) => it.type === "credit")
      .reduce((sum, it) => sum + Math.abs(it.amount ?? 0), 0),
  );

  const newTotalAmount = round2(newServiceTotal + newTaxTotal - newCreditTotal);

  // If we have an original balance due but no line items or it's mismatched,
  // we should still mark up the balance due rather than letting it be zeroed.
  let finalBalanceDue = newTotalAmount;
  if (
    (newTotalAmount === 0 ||
      Math.abs(
        newTotalAmount - applyMarkup(invoice.balanceDue ?? 0, markupPercent),
      ) > 2) &&
    invoice.balanceDue
  ) {
    finalBalanceDue = applyMarkup(invoice.balanceDue, markupPercent);
  }

  return {
    ...invoice,
    lineItems: finalMarkedItems,
    subtotal:
      newServiceTotal > 0
        ? newServiceTotal
        : invoice.subtotal
          ? applyMarkup(invoice.subtotal, markupPercent)
          : null,
    taxAmount:
      newTaxTotal > 0
        ? newTaxTotal
        : invoice.taxAmount
          ? applyMarkup(invoice.taxAmount, markupPercent)
          : null,
    taxRate: hasTax ? originalTaxRate : invoice.taxRate,
    creditAmount:
      newCreditTotal > 0 ? newCreditTotal : (invoice.creditAmount ?? 0),
    totalAmount: finalBalanceDue,
    balanceDue: finalBalanceDue,
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

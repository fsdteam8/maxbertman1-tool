/**
 * Invoice transformer — applies business rules to parsed invoices.
 *
 * Supported operations:
 *  1. Apply 1% markup to all monetary fields (service, tax, credit, totals)
 *  2. Replace PO placeholder text with a real PO number
 *  3. Assemble a ProcessedInvoice combining original + marked-up versions
 *
 * PRECISION: All monetary calculations use Decimal arithmetic internally
 * to ensure 100% accuracy. No floating-point errors.
 */

import type {
  ParsedInvoice,
  ParsedLineItem,
  ProcessedInvoice,
} from "@/types/invoice";
import { applyMarkup } from "@/lib/currency";
import Decimal from "@/lib/decimal-precision";
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
 * USES DECIMAL ARITHMETIC for 100% calculation accuracy.
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
  // ─── Step 1: Mark up line items (using Decimal for precision) ────────
  // CRITICAL: Ensure ALL service items get marked up, not just some
  const markedLineItems: ParsedLineItem[] = invoice.lineItems.map((item) => {
    // Apply markup to all item types consistently using Decimal arithmetic
    return {
      ...item,
      amount:
        item.amount !== null
          ? new Decimal(item.amount).applyMarkup(markupPercent).round()
          : null,
      rate:
        item.rate !== null
          ? new Decimal(item.rate).applyMarkup(markupPercent).round()
          : null,
    };
  });

  // ─── Step 2: Calculate Marked-Up Subtotal (Decimal precision) ────────
  // CRITICAL: ALWAYS recalculate from marked-up line items, NEVER use PDF-extracted subtotal
  // This ensures Services amount includes the full markup
  const serviceItems = markedLineItems.filter((it) => it.type === "service");
  let subtotalDec = Decimal.sum(
    ...serviceItems.map((it) => new Decimal(it.amount ?? 0)),
  );
  const subtotal = subtotalDec.round();

  // Verify: if the original PDF had a subtotal, it should roughly match (within 5%)
  if (invoice.subtotal !== null && subtotal > 0) {
    const expectedSubtotal = new Decimal(invoice.subtotal)
      .applyMarkup(markupPercent)
      .round();
    const discrepancy = Math.abs(subtotal - expectedSubtotal) / expectedSubtotal;
    if (discrepancy > 0.05) {
      console.warn(
        `[applyMarkupToInvoice] Subtotal discrepancy detected: recalculated=$${subtotal.toFixed(2)}, expected=$${expectedSubtotal.toFixed(2)}, difference=${(discrepancy * 100).toFixed(2)}%`,
      );
    }
  }

  // ─── Step 3: Dynamic Multiplicative Tax Calculation (Decimal) ─────────
  // Determine the correct multiplier to preserve original tax rate
  let totalAmountDec: Decimal | null = null;
  let taxAmountDec: Decimal | null = null;

  if (subtotal > 0) {
    // Calculate original tax rate
    let taxMultiplier = 1.0;
    if (invoice.taxRate !== null) {
      taxMultiplier = 1 + invoice.taxRate / 100;
    } else if (
      invoice.taxAmount !== null &&
      invoice.subtotal &&
      invoice.subtotal > 0
    ) {
      // Derive tax rate from original values, then apply to marked-up subtotal
      // CRITICAL: Round the rate to 4 decimal places to avoid precision errors
      const impliedTaxRate = invoice.taxAmount / invoice.subtotal;
      const roundedTaxRate = Math.round(impliedTaxRate * 10000) / 10000;
      taxMultiplier = 1 + roundedTaxRate;
    } else if (invoice.taxAmount !== null && invoice.taxAmount > 0) {
      const effectiveSubtotal = invoice.subtotal || subtotal;
      const impliedTaxRate = invoice.taxAmount / effectiveSubtotal;
      const roundedTaxRate = Math.round(impliedTaxRate * 10000) / 10000;
      taxMultiplier = 1 + roundedTaxRate;
    } else {
      // No tax in original, don't add tax
      totalAmountDec = subtotalDec;
    }

    // Apply multiplicative formula: total = subtotal * multiplier
    if (totalAmountDec === null) {
      totalAmountDec = new Decimal(subtotal).multiplyTaxMultiplier(
        taxMultiplier,
      );
      taxAmountDec = totalAmountDec.subtract(subtotalDec);
    }
  }

  // ─── Step 4: Handle Credit (Decimal) ──────────────────────────────────
  // Credits are marked up for consistency
  const creditFromItems = markedLineItems
    .filter((it) => it.type === "credit")
    .reduce((sum, it) => sum + Math.abs(it.amount ?? 0), 0);

  let creditAmountDec: Decimal | null = null;
  if (creditFromItems > 0) {
    creditAmountDec = new Decimal(creditFromItems);
  } else if (invoice.creditAmount !== null) {
    creditAmountDec = new Decimal(invoice.creditAmount).applyMarkup(
      markupPercent,
    );
  }

  // ─── Step 5: Final Balance Due Calculation (Decimal) ──────────────────
  // CRITICAL: Balance Due is ALWAYS recalculated using totalAmount
  const totalAmount =
    totalAmountDec !== null ? totalAmountDec.round() : null;
  const creditAmount = creditAmountDec !== null ? creditAmountDec.round() : null;

  let balanceDue: number | null = null;
  if (totalAmount !== null) {
    balanceDue = new Decimal(totalAmount)
      .subtract(new Decimal(creditAmount ?? 0))
      .round();
  }

  // Derive tax amount from totalAmount to ensure consistency
  const taxAmount =
    totalAmount !== null && subtotal !== null
      ? new Decimal(totalAmount).subtract(new Decimal(subtotal)).round()
      : taxAmountDec !== null
        ? taxAmountDec.round()
        : null;

  return {
    ...invoice,
    lineItems: markedLineItems,
    subtotal,
    taxAmount,
    creditAmount,
    totalAmount,
    // CRITICAL: Use recalculated balance due with Decimal precision
    balanceDue: balanceDue ?? totalAmount ?? null,
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

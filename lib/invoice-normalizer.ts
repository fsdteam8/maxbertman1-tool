/**
 * Invoice normalizer — cleans and sanitizes extracted data before use.
 * Fills defaults, trims whitespace, coerces numeric types.
 *
 * Also validates totals coherence and rounding to catch extraction errors early.
 */

import type { ParsedInvoice } from "@/types/invoice";

const ROUNDING_TOLERANCE = 0.01; // Allow ±$0.01 discrepancy from rounding

export function normalizeInvoice(raw: ParsedInvoice): ParsedInvoice {
  const normalized = {
    ...raw,
    invoiceNumber: raw.invoiceNumber?.trim() || null,
    customerNumber: raw.customerNumber?.trim() || null,
    invoiceDate: raw.invoiceDate?.trim() || null,
    dueDate: raw.dueDate?.trim() || null,
    issuerName: raw.issuerName?.trim() || null,
    issuerEmail: raw.issuerEmail?.trim().toLowerCase() || null,
    billToName: raw.billToName?.trim() || null,
    issuerAddressLines: raw.issuerAddressLines
      .map((l) => l.trim())
      .filter(Boolean),
    billToAddressLines: raw.billToAddressLines
      .map((l) => l.trim())
      .filter(Boolean),
    serviceAddressLines: raw.serviceAddressLines
      .map((l) => l.trim())
      .filter(Boolean),
    remitToLines: raw.remitToLines.map((l) => l.trim()).filter(Boolean),
    lineItems: raw.lineItems.map((item) => ({
      ...item,
      title: item.title.trim(),
      description: item.description.trim(),
      amount: item.amount !== null ? Math.round(item.amount * 100) / 100 : null,
    })),
    balanceDue:
      raw.balanceDue !== null ? Math.round(raw.balanceDue * 100) / 100 : null,
    subtotal:
      raw.subtotal !== null ? Math.round(raw.subtotal * 100) / 100 : null,
    taxAmount:
      raw.taxAmount !== null ? Math.round(raw.taxAmount * 100) / 100 : null,
    taxRate: raw.taxRate, // Pass through; already a rate percentage
    creditAmount:
      raw.creditAmount !== null
        ? Math.round(raw.creditAmount * 100) / 100
        : null,
    totalAmount:
      raw.totalAmount !== null ? Math.round(raw.totalAmount * 100) / 100 : null,
  };

  // VALIDATION: Check totals coherence from line items
  const services =
    Math.round(
      normalized.lineItems
        .filter((it) => it.type === "service")
        .reduce((sum, it) => sum + (it.amount ?? 0), 0) * 100,
    ) / 100;

  const taxes =
    Math.round(
      normalized.lineItems
        .filter((it) => it.type === "tax")
        .reduce((sum, it) => sum + (it.amount ?? 0), 0) * 100,
    ) / 100;

  const credits =
    Math.round(
      normalized.lineItems
        .filter((it) => it.type === "credit")
        .reduce((sum, it) => sum + Math.abs(it.amount ?? 0), 0) * 100,
    ) / 100;

  const expectedTotal = Math.round((services + taxes - credits) * 100) / 100;
  const actualBalance = normalized.balanceDue ?? expectedTotal;

  // Warn if balance due doesn't match recalculated total
  if (Math.abs(expectedTotal - actualBalance) > ROUNDING_TOLERANCE) {
    console.warn(
      `[AUDIT] Balance due mismatch: expected ${expectedTotal}, got ${actualBalance}. Difference: ${Math.abs(expectedTotal - actualBalance)}`,
    );
  }

  // Warn if normalized subtotal doesn't match services sum
  if (
    normalized.subtotal !== null &&
    Math.abs(normalized.subtotal - services) > ROUNDING_TOLERANCE
  ) {
    console.warn(
      `[AUDIT] Subtotal mismatch: extracted ${normalized.subtotal}, calculated from items ${services}. Difference: ${Math.abs(normalized.subtotal - services)}`,
    );
  }

  // Warn if tax rate exists but can't recalculate tax amount (indicates extraction or data issue)
  if (
    normalized.taxRate !== null &&
    normalized.taxRate > 0 &&
    services > 0 &&
    normalized.taxAmount !== null
  ) {
    const expectedTax =
      Math.round(services * (normalized.taxRate / 100) * 100) / 100;
    if (Math.abs(expectedTax - normalized.taxAmount) > ROUNDING_TOLERANCE) {
      console.warn(
        `[AUDIT] Tax amount mismatch: extracted ${normalized.taxAmount} at rate ${normalized.taxRate}%, expected ${expectedTax}. Difference: ${Math.abs(expectedTax - normalized.taxAmount)}`,
      );
    }
  }

  return normalized;
}

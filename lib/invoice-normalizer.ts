/**
 * Invoice normalizer — cleans and sanitizes extracted data before use.
 * Fills defaults, trims whitespace, and coerces numeric types.
 */

import type { ParsedInvoice } from "@/types/invoice";

export function normalizeInvoice(raw: ParsedInvoice): ParsedInvoice {
  return {
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
      raw.balanceDue !== null
        ? Math.round(raw.balanceDue * 100) / 100
        : null,
    subtotal:
      raw.subtotal !== null ? Math.round(raw.subtotal * 100) / 100 : null,
    taxAmount:
      raw.taxAmount !== null ? Math.round(raw.taxAmount * 100) / 100 : null,
    creditAmount:
      raw.creditAmount !== null
        ? Math.round(raw.creditAmount * 100) / 100
        : null,
    totalAmount:
      raw.totalAmount !== null
        ? Math.round(raw.totalAmount * 100) / 100
        : null,
  };
}

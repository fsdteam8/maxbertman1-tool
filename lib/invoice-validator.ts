/**
 * Invoice Data Validator
 * Ensures parsed/processed invoices meet minimum data quality requirements
 * before PDF generation.
 *
 * Rules:
 * - Company branding (System4 S.N.E.) is fixed for all PDFs
 * - Customer data (billToName, billToAddressLines) must be extracted and valid
 * - Invoice number must be present and non-empty
 * - Line items and financial totals must be coherent
 * - Tax rate/amount must match extracted data (not forced/artificial)
 */

import type { ParsedInvoice } from "@/types/invoice";

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Fields that must have real data (not empty, not placeholders)
const REQUIRED_FIELDS = [
  "invoiceNumber",
  "billToName",
  "billToAddressLines",
] as const;

// Placeholder patterns to detect mock/dummy data
const PLACEHOLDER_PATTERNS = [
  /\[.*not extracted.*\]/i,
  /\[.*not found.*\]/i,
  /\[.*unknown.*\]/i,
  /mock|dummy|test|placeholder/i,
];

/**
 * Check if a string contains placeholder text
 */
function isPlaceholderText(text: string | null | undefined): boolean {
  if (!text) return false;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Validate invoice data before PDF generation
 */
export function validateInvoiceData(
  invoice: ParsedInvoice,
): DataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ─── REQUIRED FIELDS CHECK ───
  if (!invoice.invoiceNumber?.trim()) {
    errors.push("Invoice number is required and must be non-empty");
  }

  // Note: issuerName, issuerEmail, issuerAddressLines are fixed company branding (System4 S.N.E.)
  // These no longer need to be extracted and are not validated

  if (!invoice.billToName?.trim()) {
    errors.push("Bill-to party name is required for customer identification");
  }

  if (!invoice.billToAddressLines || invoice.billToAddressLines.length === 0) {
    errors.push("Bill-to address is required for invoice");
  }

  // ─── PLACEHOLDER TEXT CHECK ───
  // Check only extracted customer data for placeholders
  [
    invoice.billToName,
    ...(invoice.billToAddressLines || []),
    ...(invoice.remitToLines || []),
  ].forEach((field) => {
    if (isPlaceholderText(field)) {
      errors.push(
        `Placeholder text detected in extracted data: "${field}". This indicates extraction failure.`,
      );
    }
  });

  // ─── LINE ITEMS CHECK ───
  if (!invoice.lineItems || invoice.lineItems.length === 0) {
    errors.push("Invoice must contain at least one line item");
  }

  // ─── FINANCIAL TOTALS CHECK ───
  const serviceTotal = invoice.lineItems
    .filter((it) => it.type === "service")
    .reduce((sum, it) => sum + (it.amount ?? 0), 0);

  if (serviceTotal === 0) {
    errors.push(
      "Invoice must contain at least one service item with amount > 0",
    );
  }

  if (!Number.isFinite(invoice.balanceDue) || invoice.balanceDue === 0) {
    errors.push("Balance due must be a valid non-zero amount");
  }

  if (!Number.isFinite(invoice.totalAmount) || invoice.totalAmount === 0) {
    errors.push("Total amount must be a valid non-zero amount");
  }

  // ─── TAX COHERENCE CHECK ───
  const taxItems = invoice.lineItems.filter((it) => it.type === "tax");
  const taxTotal = taxItems.reduce((sum, it) => sum + (it.amount ?? 0), 0);

  if (
    taxTotal > 0 &&
    (!invoice.taxRate ||
      !Number.isFinite(invoice.taxRate) ||
      invoice.taxRate <= 0)
  ) {
    warnings.push(
      "Tax items present but tax rate is not set. Tax may not be properly extracted.",
    );
  }

  // Verify tax amount makes sense with tax rate (within rounding tolerance)
  if (
    taxTotal > 0 &&
    invoice.taxRate &&
    Number.isFinite(invoice.taxRate) &&
    serviceTotal > 0
  ) {
    const expectedTax = Math.round(serviceTotal * invoice.taxRate * 100) / 100;
    const difference = Math.abs(expectedTax - taxTotal);
    if (difference > 0.02) {
      // Allow ±$0.02 rounding
      warnings.push(
        `Tax amount mismatch: expected $${expectedTax.toFixed(2)} but got $${taxTotal.toFixed(2)}. This may indicate extraction error.`,
      );
    }
  }

  // ─── RECALCULATION CHECK ───
  const creditTotal = invoice.lineItems
    .filter((it) => it.type === "credit")
    .reduce((sum, it) => sum + Math.abs(it.amount ?? 0), 0);

  const expectedTotal =
    Math.round((serviceTotal + taxTotal - creditTotal) * 100) / 100;
  const actualBalance = invoice.balanceDue ?? 0;
  const balanceDifference = Math.abs(expectedTotal - actualBalance);

  if (balanceDifference > 0.02) {
    // Allow ±$0.02 rounding
    warnings.push(
      `Balance due mismatch: expected $${expectedTotal.toFixed(2)} but got $${actualBalance.toFixed(2)}. Invoice arithmetic may not be correct.`,
    );
  }

  // ─── LOW CONFIDENCE CHECK ───
  if (invoice.lowConfidence) {
    warnings.push(
      "Invoice was extracted with low confidence. Some fields may be inaccurate.",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate invoice and throw error if validation fails
 */
export function validateInvoiceDataStrict(invoice: ParsedInvoice): void {
  const result = validateInvoiceData(invoice);
  if (!result.isValid) {
    const errorMsg = result.errors.join("\n  - ");
    throw new Error(
      `Invoice validation failed:\n  - ${errorMsg}\n\nInvoice cannot be used for PDF generation.`,
    );
  }
}

/**
 * Log validation warnings to console
 */
export function logValidationWarnings(invoice: ParsedInvoice): void {
  const result = validateInvoiceData(invoice);
  if (result.warnings.length > 0) {
    console.warn(
      "[Invoice Validation] Warnings detected:",
      result.warnings.join("\n  - "),
    );
  }
}

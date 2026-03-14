// ─────────────────────────────────────────────
// Core invoice data types (transient, no DB)
// ─────────────────────────────────────────────

export interface ParsedLineItem {
  title: string;
  description: string;
  serviceDateRange: string | null;
  quantity: number | null;
  rate: number | null;
  amount: number | null;
  /** Distinguishes service rows from tax/credit/other rows */
  type: "service" | "tax" | "credit" | "other";
}

export interface ParsedInvoice {
  // Header metadata
  balanceDue: number | null;
  customerNumber: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;

  // Issuer block
  issuerName: string | null;
  issuerEmail: string | null;
  issuerAddressLines: string[];

  // Bill-to block
  billToName: string | null;
  billToAddressLines: string[];

  // Service address
  serviceAddressLines: string[];

  // Remit-to block
  remitToLines: string[];

  // Line items
  lineItems: ParsedLineItem[];

  // Monetary totals
  subtotal: number | null;
  taxAmount: number | null;
  creditAmount: number | null;
  totalAmount: number | null;

  // PO handling
  poPlaceholderDetected: boolean;
  poOriginalText: string | null;

  // Raw text for fallback / manual review
  extractedRawText: string;

  /** True when extraction was partial and manual review is recommended */
  lowConfidence?: boolean;
}

export interface ProcessedInvoice {
  original: ParsedInvoice;
  markedUp: ParsedInvoice;
  markupPercent: number;
  poReplacementApplied: boolean;
  replacementPoNumber: string | null;
  warnings: string[];
}

// ─────────────────────────────────────────────
// API request / response shapes
// ─────────────────────────────────────────────

export interface InvoiceProcessRequest {
  invoice: ParsedInvoice;
  poNumber?: string;
  markupPercent?: number;
}

export interface InvoiceProcessResult {
  success: boolean;
  processed?: ProcessedInvoice;
  error?: string;
}

export interface InvoiceGenerateRequest {
  invoice: ParsedInvoice;
  filename?: string;
}

export interface InvoiceParseResult {
  success: boolean;
  invoice?: ParsedInvoice;
  error?: string;
}

// ─────────────────────────────────────────────
// Core invoice data types (transient, no DB)
// ─────────────────────────────────────────────

export interface PDFRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PDFFieldMetadata {
  rect: PDFRect;
  pageIndex: number;
  /** The full text content of the PDF item(s) found at this location */
  fullText?: string;
}

export interface ParsedLineItem {
  title: string;
  description: string;
  serviceDateRange: string | null;
  quantity: number | null;
  rate: number | null;
  amount: number | null;
  /** Distinguishes service rows from tax/credit/other rows */
  type: "service" | "tax" | "credit" | "other";
  /** Metadata for the amount field if we want to overwrite it */
  amountMetadata?: PDFFieldMetadata;
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
  /** Original tax percentage (e.g., 6.35 for 6.35% tax). Null if tax not present or undetected. */
  taxRate: number | null;
  /**
   * CREDIT SEMANTICS:
   * - Stored as POSITIVE number (e.g., 50.00 means $50 credit)
   * - Represents reduction FROM the subtotal
   * - Used in: balance = subtotal + tax - creditAmount
   * - Display: shown as ( $50.00 ) in PDF (parentheses, negative adjustment)
   */
  creditAmount: number | null;
  totalAmount: number | null;

  // PO handling
  poPlaceholderDetected: boolean;
  poOriginalText: string | null;
  poNumber: string | null;
  woNumber: string | null;

  // Source coordinate metadata for overlay
  sourceMetadata: {
    invoiceNumber?: PDFFieldMetadata;
    invoiceDate?: PDFFieldMetadata;
    dueDate?: PDFFieldMetadata;
    balanceDue?: PDFFieldMetadata;
    subtotal?: PDFFieldMetadata;
    taxAmount?: PDFFieldMetadata;
    creditAmount?: PDFFieldMetadata;
    totalAmount?: PDFFieldMetadata;
    poPlaceholder?: PDFFieldMetadata;
    poNumber?: PDFFieldMetadata;
    serviceAddress?: PDFFieldMetadata;
    /** All items identified within the Service Activity section */
    serviceActivityItems?: PDFFieldMetadata[];
  };

  // Raw text for fallback / manual review
  extractedRawText: string;

  /** True when extraction was partial and manual review is recommended */
  lowConfidence?: boolean;
  /** True when the PDF contains native form fields (AcroForm) */
  hasAcroForm?: boolean;
}

export interface ProcessedInvoice {
  original: ParsedInvoice;
  markedUp: ParsedInvoice;
  markupPercent: number;
  poReplacementApplied: boolean;
  replacementPoNumber: string | null;
  replacementWoNumber: string | null;
  warnings: string[];
  injectedSalesTax?: boolean;
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
  logoDataUrl?: string;
  error?: string;
}

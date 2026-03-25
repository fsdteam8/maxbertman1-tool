/**
 * Invoice parser — extracts structured data from raw PDF text.
 *
 * Designed around the known invoice structure from System4 S.N.E. samples:
 *   – Header block (Invoice #, Customer #, Date, Due Date, Balance Due)
 *   – Issuer block (company name, address, billing email)
 *   – Bill To block
 *   – Service Address block
 *   – Remit To block
 *   – Line items table (service, tax, credit rows)
 *   – PO placeholder detection
 *
 * Supports OCR fallback: if confidence is low, raw text is preserved
 * so the user can manually correct values in the UI.
 */

import type { ParsedInvoice, ParsedLineItem, PDFFieldMetadata } from "@/types/invoice";
import { parseCurrencyString } from "@/lib/currency";
import { detectPOPlaceholder } from "@/lib/text-replacement";

// ─────────────────────────────────────────────
// PDF Text Extraction (pdfjs-dist, Node-only)
// ─────────────────────────────────────────────

export interface PDFTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
}

export interface ExtractedPDFContent {
  rawText: string;
  items: PDFTextItem[];
}

/**
 * Extract raw text and coordinates from a PDF buffer using pdfjs-dist.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<ExtractedPDFContent> {
  const { join } = await import("path");
  
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const lib = (pdfjs as any).default || pdfjs;

  lib.GlobalWorkerOptions.workerSrc = join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.mjs"
  );

  const uint8 = new Uint8Array(buffer);

  const loadingTask = lib.getDocument({
    data: uint8,
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];
  const items: PDFTextItem[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageIndex = i - 1;
    
    const pageItems: string[] = [];
    content.items.forEach((item: any) => {
      if ("str" in item) {
        pageItems.push(item.str);
        const [scaleX, skewX, skewY, scaleY, x, y] = item.transform;
        items.push({
          str: item.str,
          x,
          y,
          width: item.width,
          height: item.height,
          pageIndex,
        });
      }
    });
    pageTexts.push(pageItems.join(" "));
  }

  return {
    rawText: pageTexts.join("\n"),
    items,
  };
}

// ─────────────────────────────────────────────
// Field Extraction helpers
// ─────────────────────────────────────────────

function extractField(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractAmount(text: string, patterns: RegExp[]): number | null {
  const raw = extractField(text, patterns);
  if (!raw) return null;
  return parseCurrencyString(raw);
}

// ─────────────────────────────────────────────
// Line Item Extraction
// ─────────────────────────────────────────────

function extractLineItems(text: string): ParsedLineItem[] {
  const items: ParsedLineItem[] = [];

  // Detect tax row
  const taxMatch = /(?:Sales\s+)?Tax\s+[\$]?([\d,]+\.?\d*)/i.exec(text);
  if (taxMatch) {
    items.push({
      title: "Sales Tax",
      description: "Sales Tax",
      serviceDateRange: null,
      quantity: null,
      rate: null,
      amount: parseCurrencyString(taxMatch[1]),
      type: "tax",
    });
  }

  // Detect credit row
  const creditMatch = /Credit\s+[\$]?(-?[\d,]+\.?\d*)/i.exec(text);
  if (creditMatch) {
    items.push({
      title: "Credit",
      description: "Credit",
      serviceDateRange: null,
      quantity: null,
      rate: null,
      amount: parseCurrencyString(creditMatch[1]),
      type: "credit",
    });
  }

  // Service rows — heuristic: lines with dollar amounts that look like service charges
  // Match patterns like "Service Name ... $1,234.56" or amounts on their own lines
  const servicePattern =
    /([A-Za-z][A-Za-z\s\-\/&,().#]+?)\s+\$?([\d,]+\.\d{2})\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = servicePattern.exec(text)) !== null) {
    const title = match[1].trim();
    const amount = parseCurrencyString(match[2]);

    // Skip if this looks like a header or a total line
    const skipWords = [
      "balance due",
      "subtotal",
      "total",
      "tax",
      "credit",
      "amount",
      "invoice",
      "customer",
      "date",
      "due",
    ];
    if (skipWords.some((w) => title.toLowerCase().includes(w))) continue;
    if (amount === null) continue;

    // Check if PO placeholder is in surrounding context
    const contextStart = Math.max(0, match.index - 200);
    const context = text.slice(contextStart, match.index + match[0].length + 100);
    const poCheck = detectPOPlaceholder(context);

    items.push({
      title,
      description: poCheck.detected ? context.slice(0, 300) : title,
      serviceDateRange: extractDateRange(context),
      quantity: null,
      rate: null,
      amount,
      type: "service",
    });
  }

  return items.length > 0
    ? items
    : [
        {
          title: "Service",
          description: "See extracted text for details",
          serviceDateRange: null,
          quantity: null,
          rate: null,
          amount: null,
          type: "service",
        },
      ];
}

function extractDateRange(text: string): string | null {
  const match =
    /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[-–to]+\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i.exec(
      text
    );
  if (match) return `${match[1]} – ${match[2]}`;
  return null;
}

// ─────────────────────────────────────────────
// Address Block Extraction
// ─────────────────────────────────────────────

function extractBlock(text: string, startPattern: RegExp, endPattern: RegExp): string[] {
  const startMatch = startPattern.exec(text);
  if (!startMatch) return [];
  const blockStart = startMatch.index + startMatch[0].length;
  const remaining = text.slice(blockStart);
  const endMatch = endPattern.exec(remaining);
  const block = endMatch ? remaining.slice(0, endMatch.index) : remaining.slice(0, 300);
  return block
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 6);
}

// ─────────────────────────────────────────────
// Main Parse Function
// ─────────────────────────────────────────────

/**
 * Finds the coordinates for a field by searching for the value string in PDF items.
 */
function findMetadata(value: string | null, items: PDFTextItem[]): PDFFieldMetadata | undefined {
  if (!value) return undefined;
  
  // Try to find an item that exactly matches or contains the value
  const item = items.find(it => it.str.includes(value));
  if (item) {
    return {
      rect: {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height
      },
      pageIndex: item.pageIndex
    };
  }
  return undefined;
}

export function parseInvoiceText(content: ExtractedPDFContent): ParsedInvoice {
  const { rawText: text, items } = content;

  // Header fields
  const invoiceNumber = extractField(text, [
    /Invoice\s*#\s*:?\s*(\d+)/i,
    /Invoice\s+Number\s*:?\s*(\d+)/i,
  ]);

  const customerNumber = extractField(text, [
    /Customer\s*#\s*:?\s*([\w\-]+)/i,
    /Customer\s+Number\s*:?\s*([\w\-]+)/i,
    /Cust\s*#\s*:?\s*([\w\-]+)/i,
  ]);

  const invoiceDate = extractField(text, [
    /(?:Invoice\s+)?Date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /Date\s*:?\s*(\w+\s+\d{1,2},?\s*\d{4})/i,
  ]);

  const dueDate = extractField(text, [
    /Due\s+Date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /Due\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  ]);

  const balanceDue = extractAmount(text, [
    /Balance\s+Due\s*:?\s*\$?([\d,]+\.?\d*)/i,
    /Amount\s+Due\s*:?\s*\$?([\d,]+\.?\d*)/i,
    /Total\s+Due\s*:?\s*\$?([\d,]+\.?\d*)/i,
  ]);

  const totalAmount = extractAmount(text, [
    /(?:Grand\s+)?Total\s*:?\s*\$?([\d,]+\.?\d*)/i,
    /Amount\s+Due\s*:?\s*\$?([\d,]+\.?\d*)/i,
  ]);

  const subtotal = extractAmount(text, [/Subtotal\s*:?\s*\$?([\d,]+\.?\d*)/i]);

  const taxAmount = extractAmount(text, [
    /(?:Sales\s+)?Tax\s*:?\s*\$?([\d,]+\.?\d*)/i,
  ]);

  const creditAmount = extractAmount(text, [
    /Credit\s*:?\s*\$?(-?[\d,]+\.?\d*)/i,
  ]);

  // Issuer block
  const issuerName = extractField(text, [
    /^(System4[^\n\r]*)/im,
    /(?:From|Issuer|Company)\s*:?\s*([^\n\r]+)/i,
  ]);

  const issuerEmail = extractField(text, [
    /billing[^:]*:?\s*([\w.+-]+@[\w.-]+\.[a-z]{2,})/i,
    /([\w.+-]+@[\w.-]+\.[a-z]{2,})/i,
  ]);

  // Address blocks
  const billToLines = extractBlock(
    text,
    /Bill\s+To\s*:?/i,
    /Service\s+Address|Remit\s+To|Invoice\s*#|Customer\s*#/i
  );

  const issuerLines = extractBlock(
    text,
    /(?:System4|Issuer|From)\s/i,
    /Bill\s+To|Invoice\s*#/i
  );

  const serviceAddressLines = extractBlock(
    text,
    /Service\s+Address\s*:?/i,
    /Remit\s+To|Total|Balance|Invoice\s*#/i
  );

  const remitToLines = extractBlock(
    text,
    /Remit\s+To\s*:?/i,
    /Thank\s+you|Page\s+\d|END/i
  );

  // PO placeholder detection
  const poCheck = detectPOPlaceholder(text);

  // Line items
  const lineItems = extractLineItems(text);
  
  // Enhance line items with metadata for overlay
  lineItems.forEach(item => {
    if (item.amount !== null) {
      // Find coordinates for the amount string
      const amtStr = item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 });
      item.amountMetadata = findMetadata(amtStr, items);
    }
  });

  // Confidence check
  const keyFieldsMissing = !invoiceNumber && !balanceDue && !invoiceDate;
  const lowConfidence = keyFieldsMissing;

  return {
    balanceDue,
    customerNumber,
    invoiceNumber,
    invoiceDate,
    dueDate,
    issuerName,
    issuerEmail,
    issuerAddressLines: issuerLines,
    billToName: billToLines[0] ?? null,
    billToAddressLines: billToLines.slice(1),
    serviceAddressLines,
    remitToLines,
    lineItems,
    subtotal,
    taxAmount,
    creditAmount,
    totalAmount,
    poPlaceholderDetected: poCheck.detected,
    poOriginalText: poCheck.matchedText,
    sourceMetadata: {
      invoiceNumber: findMetadata(invoiceNumber, items),
      invoiceDate: findMetadata(invoiceDate, items),
      dueDate: findMetadata(dueDate, items),
      balanceDue: findMetadata(balanceDue !== null ? balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 }) : null, items),
      subtotal: findMetadata(subtotal !== null ? subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : null, items),
      taxAmount: findMetadata(taxAmount !== null ? taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : null, items),
      creditAmount: findMetadata(creditAmount !== null ? creditAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : null, items),
      totalAmount: findMetadata(totalAmount !== null ? totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : null, items),
      poPlaceholder: findMetadata(poCheck.matchedText, items),
    },
    extractedRawText: text,
    lowConfidence,
  };
}

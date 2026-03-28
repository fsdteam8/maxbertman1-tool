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

import type {
  ParsedInvoice,
  ParsedLineItem,
  PDFFieldMetadata,
} from "@/types/invoice";
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
export async function extractTextFromPDF(
  buffer: Buffer,
): Promise<ExtractedPDFContent> {
  const { join } = await import("path");

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const lib = (pdfjs as any).default || pdfjs;

  const uint8 = new Uint8Array(buffer);

  // In Node.js environment (especially on Vercel), we want to disable the worker
  // to avoid path resolution issues with node_modules.
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

/**
 * Extract the original tax percentage rate from invoice text.
 * Looks for patterns like "6.35%", "6.35 percent", "tax rate: 7.25%", etc.
 * Returns null if no rate is found or cannot be parsed.
 */
function extractTaxRate(text: string): number | null {
  const patterns = [
    /(\d+\.?\d*)\s*%\s*(?:sales\s+)?tax/i,
    /(?:sales\s+)?tax\s+rate[:\s]*(\d+\.?\d*)\s*%/i,
    /tax[:=\s]*(\d+\.?\d*)\s*%/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const rate = parseFloat(match[1]);
      return isNaN(rate) ? null : rate;
    }
  }
  return null;
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

  // IMPROVED: Split on meaningful boundaries
  // If line ends with money, it's a complete item
  // Otherwise split on multiple spaces (for wrapped text)
  const logicalLines = text
    .split(/\n+/)
    .flatMap((line) => {
      // Check if line ends with a currency amount (terminus of an item)
      if (/\$?\d+[\,.]?\d{0,2}(\s*\)?)?$/.test(line.trim())) {
        return [line];
      }
      // Otherwise, split on multiple spaces
      return line.split(/\s{2,}/);
    })
    .map((l) => l.trim())
    .filter(Boolean);

  // Strategy 1: lines with "Title ... $Amount" pattern
  const servicePattern =
    /([A-Za-z][A-Za-z\s\-\/&,().#]+?)\s+\$?([\d,]+\.\d{2})\s*$/;

  // Strategy 2: lines that are just an amount preceded by any text
  const loosePattern = /^(.+?)\s+\$?([\d,]+\.\d{2})\s*$/;

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
    "bill to",
    "remit to",
    "service address",
    "qty",
    "rate",
  ];

  const seenAmounts = new Set<string>();

  for (const line of logicalLines) {
    // Try strict pattern first, then loose
    let match = servicePattern.exec(line) || loosePattern.exec(line);
    if (!match) continue;

    const title = match[1].trim();
    const amountStr = match[2];
    const amount = parseCurrencyString(amountStr);

    // Skip headers, totals, and duplicates
    if (skipWords.some((w) => title.toLowerCase().includes(w))) continue;
    if (amount === null) continue;
    if (seenAmounts.has(amountStr)) continue;
    seenAmounts.add(amountStr);

    // Check if PO placeholder is in surrounding context
    // Use indexOf with an offset to avoid matching the same line multiple times
    let lineIndex = -1;
    let searchStart = 0;
    for (let k = 0; k < logicalLines.indexOf(line) + 1; k++) {
      lineIndex = text.indexOf(line, searchStart);
      if (lineIndex === -1) break;
      searchStart = lineIndex + 1;
    }
    if (lineIndex === -1) lineIndex = text.indexOf(line);
    const contextStart = Math.max(0, lineIndex - 200);
    const context = text.slice(contextStart, lineIndex + line.length + 100);
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
      text,
    );
  if (match) return `${match[1]} – ${match[2]}`;
  return null;
}

// ─────────────────────────────────────────────
// Address Block Extraction
// ─────────────────────────────────────────────

function extractBlock(
  text: string,
  startPattern: RegExp,
  endPattern: RegExp,
): string[] {
  const startMatch = startPattern.exec(text);
  if (!startMatch) return [];
  const blockStart = startMatch.index + startMatch[0].length;
  const remaining = text.slice(blockStart);
  const endMatch = endPattern.exec(remaining);
  // Increased limit from 300 to 800 characters to capture full address blocks
  const block = endMatch
    ? remaining.slice(0, endMatch.index)
    : remaining.slice(0, 800);
  return block
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12); // Increased from 6 to 12 lines to capture full addresses
}

// ─────────────────────────────────────────────
// Main Parse Function
// ─────────────────────────────────────────────

/**
 * Finds the coordinates for a field by searching for the value string in PDF items.
 * Uses a multi-tier strategy:
 *  1. Exact substring match within a single text item
 *  2. Stripped numeric match (ignoring $, commas, spaces)
 *  3. Proximity-based match: find adjacent items whose concatenation contains the value
 */
function findMetadata(
  value: string | null,
  items: PDFTextItem[],
): PDFFieldMetadata | undefined {
  if (!value) return undefined;

  // Tier 1: Exact substring match
  const exactItem = items.find((it) => it.str.includes(value));
  if (exactItem) {
    return {
      rect: {
        x: exactItem.x,
        y: exactItem.y,
        width: exactItem.width,
        height: exactItem.height,
      },
      pageIndex: exactItem.pageIndex,
    };
  }

  // Tier 2: Stripped numeric match — for values like "1,234.50" that may appear as "1234.50" or "1,234" in items
  const stripped = value.replace(/[$,\s]/g, "");
  if (stripped) {
    const numItem = items.find((it) =>
      it.str.replace(/[$,\s]/g, "").includes(stripped),
    );
    if (numItem) {
      return {
        rect: {
          x: numItem.x,
          y: numItem.y,
          width: numItem.width,
          height: numItem.height,
        },
        pageIndex: numItem.pageIndex,
      };
    }
  }

  // Tier 3: Proximity-based — group adjacent items on the same line and search the concatenation
  const Y_TOLERANCE = 3; // items within 3 units vertically are on the same "line"
  for (let i = 0; i < items.length; i++) {
    const anchor = items[i];
    let concat = anchor.str;
    let maxX = anchor.x + anchor.width;
    let maxH = anchor.height;

    // Extend rightward through adjacent items on the same line
    for (let j = i + 1; j < items.length; j++) {
      const next = items[j];
      if (next.pageIndex !== anchor.pageIndex) break;
      if (Math.abs(next.y - anchor.y) > Y_TOLERANCE) continue;
      if (next.x < maxX - 5) continue; // skip items that are behind (not sequential)

      concat += next.str;
      maxX = next.x + next.width;
      maxH = Math.max(maxH, next.height);

      if (
        concat.includes(value) ||
        concat.replace(/[$,\s]/g, "").includes(stripped)
      ) {
        return {
          rect: {
            x: anchor.x,
            y: anchor.y,
            width: maxX - anchor.x,
            height: maxH,
          },
          pageIndex: anchor.pageIndex,
        };
      }
    }
  }

  return undefined;
}

export function parseInvoiceText(content: ExtractedPDFContent): ParsedInvoice {
  const { rawText: text, items } = content;

  // Header fields
  const invoiceNumber = extractField(text, [
    /Invoice\s*#\s*:?\s*([\w\-]+)/i,
    /Invoice\s+Number\s*:?\s*([\w\-]+)/i,
    /INV\s*#?\s*:?\s*([\w\-]+)/i,
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
    /Total\s+Amount\s*:?\s*\$?([\d,]+\.?\d*)/i,
    /Amount\s+Due\s*:?\s*\$?([\d,]+\.?\d*)/i,
  ]);

  const subtotal = extractAmount(text, [
    /Subtotal\s*:?\s*\$?([\d,]+\.?\d*)/i,
    /Sub[\\s-]?Total\s*:?\s*\$?([\d,]+\.?\d*)/i,
    /Services\s+Total\s*:?\s*\$?([\d,]+\.?\d*)/i,
  ]);

  const taxAmount = extractAmount(text, [
    /(?:Sales\s+)?Tax\s*:?\s*\$?([\d,]+\.?\d*)/i,
  ]);

  const taxRate = extractTaxRate(text);

  const creditAmount = extractAmount(text, [
    /Credit\s*:?\s*\$?(-?[\d,]+\.?\d*)/i,
  ]);

  // Issuer block
  const issuerName = extractField(text, [
    /(?:From|Issuer|Company\s+Name|Billed By)\s*:?\s*([^\n\r]+)/i,
    /^([A-Z][A-Za-z0-9\s.&,()-]*)/m,
  ]);

  const issuerEmail = extractField(text, [
    /billing[^:]*:?\s*([\w.+-]+@[\w.-]+\.[a-z]{2,})/i,
    /([\w.+-]+@[\w.-]+\.[a-z]{2,})/i,
  ]);

  // Address blocks
  const billToLines = extractBlock(
    text,
    /(?:Bill\s+To|Billed\s+To|Customer)\s*:?/i,
    /Service\s+Address|Remit\s+To|Invoice|Customer\s*#|AMOUNT|TOTAL/i,
  );

  const issuerLines = extractBlock(
    text,
    /(?:From|Issuer|Company|Billed\s+By)\s*:?/i,
    /Bill\s+To|Service\s+Address|Invoice/i,
  );

  const serviceAddressLines = extractBlock(
    text,
    /(?:Service\s+Address|Ship\s+To|Deliver\s+To)\s*:?/i,
    /Remit\s+To|TOTAL|BALANCE|AMOUNT|Tax|PAGE/i,
  );

  const remitToLines = extractBlock(
    text,
    /(?:Remit\s+To|Pay\s+To|Send\s+Payment)\s*:?/i,
    /SERVICE\s+ADDRESS|THANK|NOTE|PAGE|^$\n^$/i,
  );

  // PO placeholder detection
  const poCheck = detectPOPlaceholder(text);

  // Line items
  const lineItems = extractLineItems(text);

  // Enhance line items with metadata for overlay
  lineItems.forEach((item) => {
    if (item.amount !== null) {
      // Find coordinates for the amount string
      const amtStr = item.amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
      });
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
    taxRate,
    creditAmount,
    totalAmount,
    poPlaceholderDetected: poCheck.detected,
    poOriginalText: poCheck.matchedText,
    sourceMetadata: {
      invoiceNumber: findMetadata(invoiceNumber, items),
      invoiceDate: findMetadata(invoiceDate, items),
      dueDate: findMetadata(dueDate, items),
      balanceDue: findMetadata(
        balanceDue !== null
          ? balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : null,
        items,
      ),
      subtotal: findMetadata(
        subtotal !== null
          ? subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : null,
        items,
      ),
      taxAmount: findMetadata(
        taxAmount !== null
          ? taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : null,
        items,
      ),
      creditAmount: findMetadata(
        creditAmount !== null
          ? creditAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : null,
        items,
      ),
      totalAmount: findMetadata(
        totalAmount !== null
          ? totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : null,
        items,
      ),
      poPlaceholder: findMetadata(poCheck.matchedText, items),
      serviceAddress:
        findMetadata("Service Address", items) ||
        findMetadata("SERVICE ADDRESS", items),
    },
    extractedRawText: text,
    lowConfidence,
  };
}

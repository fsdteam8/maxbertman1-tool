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
import { PDFDocument } from "pdf-lib";
import { parseCurrencyString } from "@/lib/currency";
import { detectPOPlaceholder } from "@/lib/text-replacement";
import {
  injectPOWOTokens,
  injectPOWOCombinedToken,
} from "@/lib/token-replacement";

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
  hasAcroForm: boolean;
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
  const allItems: PDFTextItem[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageIndex = i - 1;

    const pageItems: PDFTextItem[] = [];
    content.items.forEach((item: any) => {
      if ("str" in item) {
        const [scaleX, skewX, skewY, scaleY, x, y] = item.transform;
        const pdfItem = {
          str: item.str,
          x,
          y,
          width: item.width,
          height: item.height,
          pageIndex,
        };
        pageItems.push(pdfItem);
        allItems.push(pdfItem);
      }
    });

    // Group items by Y coordinate (using a small tolerance for "same line")
    const lines: { y: number; items: PDFTextItem[] }[] = [];
    const Y_TOLERANCE = 2;

    pageItems.forEach((item) => {
      let foundLine = lines.find((l) => Math.abs(l.y - item.y) < Y_TOLERANCE);
      if (!foundLine) {
        foundLine = { y: item.y, items: [] };
        lines.push(foundLine);
      }
      foundLine.items.push(item);
    });

    // Sort lines by Y (top to bottom) - PDF coordinates are usually Y-up
    lines.sort((a, b) => b.y - a.y);

    const reconstructedLines = lines.map((line) => {
      // Sort items within line by X (left to right)
      line.items.sort((a, b) => a.x - b.x);
      return line.items.map((it) => it.str).join("  "); // double space helps retain gaps
    });

    pageTexts.push(reconstructedLines.join("\n"));
  }

  // Check for native form fields (AcroForm)
  let hasAcroForm = false;
  try {
    const pdfDoc = await PDFDocument.load(uint8, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    hasAcroForm = fields.length > 0;
  } catch (e) {
    console.warn("[Parser] Failed to check for AcroForm fields:", e);
  }

  return {
    rawText: pageTexts.join("\n\n"),
    items: allItems,
    hasAcroForm,
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

  // Detect tax row - look for Tax followed by amount, often at end of line
  const taxMatch = /(?:Sales\s+)?Tax.*?\s+\$?([\d,]+\.\d{2})(?:\s|$)/i.exec(
    text,
  );
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

  // Detect credit row - handles "Credit ($50.00)" or "Credit 50.00"
  const creditMatch = /Credit.*?\s+[\$]?\(?\s*(-?[\d,]+\.\d{2})\s*\)?/i.exec(
    text,
  );
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
    "sub-total",
    "previous balance",
    "balance forward",
    "payments/credits",
    "new charges",
    "portsmouth",
    "waterbury",
    "kingstown",
    "ri 02",
    "ct 06",
  ];

  const seenAmounts = new Set<string>();

  for (const line of logicalLines) {
    // Skip if line looks like an address (City, ST Zip)
    if (/[A-Z][a-z]+,?\s+[A-Z]{2}\s+\d{5}/.test(line)) continue;

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

    // Build description with token-based placeholders
    let description = poCheck.detected ? context.slice(0, 300) : title;

    // Inject tokens for PO# and W.O# placeholders
    if (poCheck.detected) {
      description = injectPOWOCombinedToken(description);
    }

    items.push({
      title,
      description,
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
export interface FindMetadataOptions {
  yRange?: { min: number; max: number };
  xRange?: { min: number; max: number };
  targetY?: number;
}

/**
 * Finds the coordinates for a field by searching for the value string in PDF items.
 * Uses a multi-tier strategy with optional coordinate filtering to disambiguate
 * identical values (e.g. Service Amount vs Balance Due).
 */
function findMetadata(
  value: string | null,
  items: PDFTextItem[],
  options: FindMetadataOptions = {},
): PDFFieldMetadata | undefined {
  if (!value) return undefined;

  const { yRange, xRange, targetY } = options;

  // Filter items by coordinate ranges if provided
  const candidateItems = items.filter((it) => {
    if (yRange && (it.y < yRange.min || it.y > yRange.max)) return false;
    if (xRange && (it.x < xRange.min || it.x > xRange.max)) return false;
    return true;
  });

  const pickBest = (matches: any[]) => {
    if (matches.length === 0) return undefined;
    if (targetY !== undefined) {
      matches.sort((a, b) => Math.abs(a.y - targetY) - Math.abs(b.y - targetY));
    }
    return matches[0];
  };

  // Tier 0: Exact complete literal match (helps avoid matching "$90.00" when looking for "90.00")
  const exactFullMatches = candidateItems.filter(
    (it) => it.str.trim() === value,
  );
  if (exactFullMatches.length > 0) {
    const best = pickBest(exactFullMatches);
    return {
      rect: { x: best.x, y: best.y, width: best.width, height: best.height },
      pageIndex: best.pageIndex,
      fullText: best.str,
    };
  }

  // Tier 1: Exact substring match
  const exactMatches = candidateItems.filter((it) => it.str.includes(value));
  if (exactMatches.length > 0) {
    const best = pickBest(exactMatches);
    return {
      rect: { x: best.x, y: best.y, width: best.width, height: best.height },
      pageIndex: best.pageIndex,
      fullText: best.str,
    };
  }

  // Tier 2: Stripped numeric match
  const stripped = value.replace(/[$,\s]/g, "");
  if (stripped) {
    const numMatches = candidateItems.filter((it) =>
      it.str.replace(/[$,\s]/g, "").includes(stripped),
    );
    if (numMatches.length > 0) {
      const best = pickBest(numMatches);
      return {
        rect: { x: best.x, y: best.y, width: best.width, height: best.height },
        pageIndex: best.pageIndex,
        fullText: best.str,
      };
    }
  }

  // Tier 3: Proximity-based
  const proxMatches = [];
  const Y_TOLERANCE = 3;
  for (let i = 0; i < candidateItems.length; i++) {
    const anchor = candidateItems[i];
    let concat = anchor.str;
    let maxX = anchor.x + anchor.width;
    let maxH = anchor.height;

    for (let j = i + 1; j < candidateItems.length; j++) {
      const next = candidateItems[j];
      if (next.pageIndex !== anchor.pageIndex) break;
      if (Math.abs(next.y - anchor.y) > Y_TOLERANCE) continue;
      if (next.x < maxX - 5) continue;

      concat += next.str;
      maxX = next.x + next.width;
      maxH = Math.max(maxH, next.height);

      if (
        concat.includes(value) ||
        concat.replace(/[$,\s]/g, "").includes(stripped)
      ) {
        proxMatches.push({
          x: anchor.x,
          y: anchor.y,
          width: maxX - anchor.x,
          height: maxH,
          pageIndex: anchor.pageIndex,
          fullText: concat,
        });
        break; // Only keep the first valid proximity cluster for this anchor
      }
    }
  }

  if (proxMatches.length > 0) {
    const best = pickBest(proxMatches);
    return {
      rect: { x: best.x, y: best.y, width: best.width, height: best.height },
      pageIndex: best.pageIndex,
      fullText: best.fullText,
    };
  }

  return undefined;
}

export function parseInvoiceText(content: ExtractedPDFContent): ParsedInvoice {
  const { rawText: text, items, hasAcroForm } = content;

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
    /Balance\s+Due[\s\S]*?\s+\$?([\d,]+\.\d{2})/i,
    /Amount\s+Due[\s\S]*?\s+\$?([\d,]+\.\d{2})/i,
    /Total\s+Due[\s\S]*?\s+\$?([\d,]+\.\d{2})/i,
    /BALANCE\s+DUE[\s\S]*?\s+\$?([\d,]+\.\d{2})/i,
  ]);

  const totalAmount = extractAmount(text, [
    /(?:Grand\s+)?Total.*?\s+\$?([\d,]+\.?\d*)/i,
    /Total\s+Amount.*?\s+\$?([\d,]+\.?\d*)/i,
    /Amount\s+Due.*?\s+\$?([\d,]+\.?\d*)/i,
  ]);

  const subtotal = extractAmount(text, [
    /Subtotal.*?\s+\$?([\d,]+\.\d{2})/i,
    /Sub[\s-]?Total.*?\s+\$?([\d,]+\.\d{2})/i,
    /Services\s+Total.*?\s+\$?([\d,]+\.\d{2})/i,
  ]);

  const taxAmount = extractAmount(text, [
    /(?:Sales\s+)?Tax.*?(?:%|rate)[^$\d]*?\$?\s*([\d,]+\.\d{2})/i,
    /(?:Sales\s+)?Tax[^\n\r\d]*?\$?\s*([\d,]+\.\d{2})/i,
    /(?:Sales\s+)?Tax[\s\S]{0,40}?\$?\s*([\d,]+\.\d{2})/i,
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

  // Existing PO number extraction (Case B)
  // CRITICAL: Require at least one digit or special char to avoid matching words like "from", "valid", etc.
  // Valid PO formats: "123456", "PO-2024-001", "PO/2024/01", etc.
  const poNumber = extractField(text, [
    /\bPO\b\s*#?\s*:?\s*(?!(?:pending|awaiting|tbd|tba|from|valid|and|order)\b)([A-Z0-9\-\/\.]+(?:[0-9\-\/\.]|$))/i,
    /\bPurchase\s*Order\b\s*#?\s*:?\s*(?!(?:pending|awaiting|tbd|tba|from|valid|and)\b)([A-Z0-9\-\/\.]+(?:[0-9\-\/\.]|$))/i,
  ]);

  // Existing W.O. number extraction - DISABLED
  // W.O. features are currently disabled
  // const woNumber = extractField(text, [
  //   /\bW\.?O\.?\b\s*#?\s*:?\s*(?!(?:pending|awaiting|tbd|tba|from|valid|and)\b)([A-Z0-9\-\/\.]+(?:[0-9\-\/\.]|$))/i,
  //   /\bWork\s*Order\b\s*#?\s*:?\s*(?!(?:pending|awaiting|tbd|tba|from|valid|and)\b)([A-Z0-9\-\/\.]+(?:[0-9\-\/\.]|$))/i,
  // ]);
  const woNumber = null;

  // Identify Service Activity Items
  // This focuses on items in the left-half of the page between the "Services" header and following sections
  const servicesHeaderItem = items.find(
    (it) => /Service\s*-\s*Activity|Services?/i.test(it.str) && it.y < 700,
  );
  const nextSectionItem = items.find(
    (it) =>
      /(?:Sales\s*)?Tax|Total|Credit|Subtotal|Balance|PAGE/i.test(it.str) &&
      it.y < (servicesHeaderItem?.y || 600),
  );

  const topY = servicesHeaderItem ? servicesHeaderItem.y - 5 : 550;
  // CRITICAL FIX: Set bottomY to a position just ABOVE the tax/total line, not below it
  // This prevents service address and other footer content from being included
  const bottomY = nextSectionItem ? nextSectionItem.y - 10 : 100;

  const serviceActivityItems = items.filter((it) => {
    const isBelowHeader = it.y < topY;
    const isAboveFooter = it.y > bottomY;
    const isLeftColumn = it.x < 300; // Left column is usually < 300
    // Skip common static headers and address-like content
    const isNotHeader = !/Invoice|Customer|Date|Activity/i.test(it.str);
    const isNotAddress =
      !/^([A-Z][a-z]+,?\s+[A-Z]{2}\s+\d{5}|[A-Za-z\s-]+,\s+[A-Z]{2})/.test(
        it.str,
      );
    return (
      isBelowHeader &&
      isAboveFooter &&
      isLeftColumn &&
      isNotHeader &&
      isNotAddress
    );
  });

  const serviceActivityMetadata = serviceActivityItems.map((it) => ({
    rect: { x: it.x, y: it.y, width: it.width, height: it.height },
    pageIndex: it.pageIndex,
    fullText: it.str,
  }));

  // Store Service Activity block bounds for coordinate validation during overlay
  const serviceActivityBounds = {
    topY,
    bottomY,
    minX: Math.min(...serviceActivityItems.map((it) => it.x), 0),
    maxX: Math.max(...serviceActivityItems.map((it) => it.x + it.width), 300),
  };

  // Line items
  const lineItems = extractLineItems(text);

  // Enhance line items with metadata for overlay
  lineItems.forEach((item) => {
    // Try to find the title's coordinate so we can anchor the amount to the same row
    let targetY: number | undefined;
    if (item.title) {
      // Find where the title is in the service block window
      const titleMeta = findMetadata(item.title, items, {
        yRange: { min: bottomY - 5, max: topY + 5 },
      });
      if (titleMeta) {
        targetY = titleMeta.rect.y;
      }
    }

    if (item.amount !== null) {
      const amtStr = item.amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
      });
      // Removing rigid xRange to allow the amount to float anywhere. Use targetY to align.
      item.amountMetadata = findMetadata(amtStr, items, {
        yRange: { min: bottomY - 5, max: topY + 5 },
        targetY: targetY,
      });
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
    poNumber,
    sourceMetadata: {
      invoiceNumber: findMetadata(invoiceNumber, items),
      invoiceDate: findMetadata(invoiceDate, items),
      dueDate: findMetadata(dueDate, items),
      balanceDue: findMetadata(
        balanceDue !== null
          ? balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : null,
        items,
        {
          yRange: { min: 50, max: bottomY + 50 },
          xRange: { min: 450, max: 600 },
        },
      ),
      subtotal: findMetadata(
        subtotal !== null
          ? subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : null,
        items,
        {
          yRange: { min: bottomY - 20, max: topY },
          xRange: { min: 450, max: 600 },
        },
      ),
      taxAmount: findMetadata(
        taxAmount !== null
          ? taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : null,
        items,
        {
          yRange: { min: bottomY - 20, max: topY },
          xRange: { min: 450, max: 600 },
        },
      ),
      creditAmount: findMetadata(
        creditAmount !== null
          ? creditAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : null,
        items,
        {
          yRange: { min: bottomY - 20, max: topY },
          xRange: { min: 450, max: 600 },
        },
      ),
      totalAmount: findMetadata(
        totalAmount !== null
          ? totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : null,
        items,
        {
          yRange: { min: 50, max: bottomY + 50 },
          xRange: { min: 450, max: 600 },
        },
      ),
      poPlaceholder: findMetadata(poCheck.matchedText, items),
      poNumber: findMetadata(poNumber, items),
      serviceAddress:
        findMetadata("Service Address", items) ||
        findMetadata("SERVICE ADDRESS", items),
      serviceActivityItems: serviceActivityMetadata,
      serviceActivityBounds,
    },
    extractedRawText: text,
    lowConfidence,
    hasAcroForm,
  };
}

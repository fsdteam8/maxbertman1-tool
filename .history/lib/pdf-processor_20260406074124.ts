import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";

/**
 * PDF Processing Engine — Repaint/Overlay approach for modifying invoices.
 *
 * CRITICAL FIXES (based on reference PDF analysis):
 * 1. Protect description text from being modified (add left-side boundary check)
 * 2. Handle empty RATE column gracefully (detect and skip if empty)
 * 3. Sales Tax detection (conditional - only update if exists)
 * 4. Balance Due detection (update both occurrences)
 * 5. Right-aligned text insertion (align to original right edge)
 * 6. Complete markup pipeline combining all fixes
 */

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
  transform?: [number, number, number, number, number, number];
}

export interface OverlayOp {
  x: number;
  y: number;
  width: number;
  height: number;
  newText: string;
  fontSize: number;
  isBold: boolean;
  isErase: boolean;
  align?: "left" | "right";
}

/**
 * Step 1 — Read text positions with pdfjs-dist
 */
export async function extractWords(pdfBytes: Uint8Array | ArrayBuffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const lib = (pdfjs as any).default || pdfjs;

  const data =
    pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);

  const loadingTask = lib.getDocument({
    data: data.slice(),
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();

  const items: TextItem[] = textContent.items.map((item: any) => {
    const transform = item.transform as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    const [a, b, c, d, x, y] = transform;
    return {
      str: item.str,
      x: x,
      y: y,
      width: item.width,
      height: item.height,
      fontName: item.fontName,
      transform: transform,
    };
  });

  return { items };
}

/**
 * Core Logic for 1% Markup and PO Replacement
 *
 * IMPLEMENTATION NOTES:
 * - Detects column boundaries from header positions (QTY, RATE, AMOUNT)
 * - Protects description text on left side from being modified
 * - Handles empty RATE column by detecting if values actually exist
 * - Detects and conditionally updates Sales Tax if present
 * - Updates Balance Due (all occurrences)
 * - Uses right-aligned text insertion for all column values
 */
export async function processInvoice(
  pdfBytes: Uint8Array,
  poNumber: string | null,
): Promise<Uint8Array> {
  const { items } = await extractWords(pdfBytes);
  const ops: OverlayOp[] = [];

  // Load fonts for measurement if needed
  const measureDoc = await PDFDocument.load(pdfBytes.slice());
  const fontRoman = await measureDoc.embedFont(StandardFonts.TimesRoman);

  // --- Step 2: Column Boundary Detection ---
  // Locate column headers to define boundaries
  const qtyHeader = items.find((i) => i.str.trim() === "QTY");
  const rateHeader = items.find((i) => i.str.trim() === "RATE");
  const amountHeader = items.find((i) => i.str.trim() === "AMOUNT");

  if (!qtyHeader || !amountHeader) {
    console.warn(
      "Could not find QTY or AMOUNT header. Falling back to broad markup pass.",
    );
    // Fallback strategy: apply markup to all detected monetary tokens on the page
    // by expanding column boundaries to the full width and allowing below-header
    // detection to cover the whole page. This ensures 1% markup is always applied.
    // Set safe defaults derived from page items.
    const minX = Math.min(...items.map((it) => it.x));
    const maxX = Math.max(...items.map((it) => it.x + it.width));
    // Treat entire page as amount column
    // descriptionColumnRightEdge should be very small to avoid protecting left side when unknown
    var descriptionColumnRightEdge = minX - 1000;
    var rateColX0 = minX - 1000;
    var rateColX1 = maxX + 1000;
    var amountColX0 = minX - 1000;
    var amountColX1 = maxX + 1000;
    var headerRowY = Infinity;
  } else {
    // Everything LEFT of QTY header x = description column = DO NOT TOUCH
    var descriptionColumnRightEdge = qtyHeader.x - 5;

    // Column x-boundaries derived from header positions
    var rateColX0 = rateHeader ? rateHeader.x - 15 : Infinity;
    var rateColX1 = rateHeader
      ? rateHeader.x + rateHeader.width + 10
      : -Infinity;
    var amountColX0 = amountHeader.x - 15;
    var amountColX1 = amountHeader.x + amountHeader.width + 60;
    var headerRowY = amountHeader.y;
  }

  const monetaryPattern = /^\$?[\d,]+\.\d{2}$/;

  // --- Step 3: Identify Column Targets (RATE + AMOUNT) ---
  const columnTargets = items.filter((item) => {
    const x = item.x;
    const y = item.y;
    const str = item.str.trim();

    const isCurrency = monetaryPattern.test(str);
    const isInRateCol = rateHeader && x >= rateColX0 && x <= rateColX1;
    const isInAmountCol = x >= amountColX0 && x <= amountColX1;
    const isBelowHeader = y < headerRowY - 5;

    // 🛡️ CRITICAL GUARD: skip anything in the description column
    const isNotDescriptionText = x > descriptionColumnRightEdge;

    return (
      isCurrency &&
      (isInRateCol || isInAmountCol) &&
      isBelowHeader &&
      isNotDescriptionText
    );
  });

  // --- Step 4: Sales Tax Detection (Conditional) ---
  const salesTaxLabel = items.find((i) =>
    i.str.toLowerCase().includes("sales tax"),
  );

  let salesTaxTarget: TextItem | undefined;
  if (salesTaxLabel) {
    salesTaxTarget = items.find((i) => {
      const str = i.str.trim();
      return (
        monetaryPattern.test(str) &&
        Math.abs(i.y - salesTaxLabel.y) < 5 &&
        i.x > salesTaxLabel.x &&
        // Must be in the AMOUNT column x-range
        i.x >= amountColX0 &&
        i.x <= amountColX1
      );
    });
  }

  // --- Step 5: Balance Due Detection ---
  const balanceDueLabels = items.filter((i) => /balance\s+due/i.test(i.str));

  const balanceDueAmounts = balanceDueLabels
    .map((label) => {
      return items.find((i) => {
        const str = i.str.trim();
        return (
          monetaryPattern.test(str) &&
          Math.abs(i.y - label.y) < 10 &&
          i.x > label.x
        );
      });
    })
    .filter((item): item is TextItem => Boolean(item));

  // --- Step 6: Unified Markup Pipeline (with De-duplication) ---
  const allMarkupTargets = [
    ...columnTargets,
    ...(salesTaxTarget ? [salesTaxTarget] : []),
    ...balanceDueAmounts,
  ];

  // Remove duplicates by position to avoid double-processing
  const seen = new Set<string>();
  const uniqueTargets = allMarkupTargets.filter((item) => {
    const key = `${item.x.toFixed(1)}_${item.y.toFixed(1)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Apply 1% markup to each unique target
  for (const item of uniqueTargets) {
    addMarkupOp(ops, item);
  }

  // --- Step 7: PO Number Replacement Logic ---
  const serviceActivityItems = items.filter(
    (it) => it.x < 300 && it.y < 550 && it.y > 100,
  );
  let poMatchApplied = false;

  // CASE A & B: Replacement in existing text
  const pendingRegex =
    /\b(pending|pending po|pending valid|pending order|pending valid purchase order)\b/i;
  const existingPoRegex = /(PO#?\s*)(\d+)/i;

  for (const item of serviceActivityItems) {
    // Check Case A: Pending PO
    const pendingMatch = pendingRegex.exec(item.str);
    if (pendingMatch && poNumber) {
      const matchedPhrase = pendingMatch[0];
      const { x, width } = getSubstringCoords(item, matchedPhrase, fontRoman);

      ops.push({
        x: x,
        y: item.y,
        width: width,
        height: item.height,
        newText: poNumber,
        fontSize: item.height,
        isBold: false,
        isErase: true,
        align: "left",
      });
      poMatchApplied = true;
      continue;
    }

    // Check Case B: Existing PO
    const existingMatch = existingPoRegex.exec(item.str);
    if (existingMatch && poNumber) {
      const oldPoVal = existingMatch[2];
      const { x, width } = getSubstringCoords(item, oldPoVal, fontRoman);

      ops.push({
        x: x,
        y: item.y,
        width: width,
        height: item.height,
        newText: poNumber,
        fontSize: item.height,
        isBold: false,
        isErase: true,
        align: "left",
      });
      poMatchApplied = true;
      continue;
    }
  }

  // CASE C: No PO exists
  if (!poMatchApplied && poNumber && serviceActivityItems.length > 0) {
    const sortedItems = [...serviceActivityItems].sort((a, b) => a.y - b.y);
    const lastItem = sortedItems[0];
    const fontSize = lastItem.height || 9;

    ops.push({
      x: lastItem.x,
      y: lastItem.y - fontSize * 1.4,
      width: 0,
      height: 0,
      newText: `PO# ${poNumber}`,
      fontSize: fontSize,
      isBold: false,
      isErase: false,
      align: "left",
    });
  }

  return await applyEdits(pdfBytes, ops, fontRoman);
}

/**
 * Helper: Add a markup operation for a currency value (1% increase)
 * CRITICAL: Preserves dollar sign and commas if present in original string.
 */
function addMarkupOp(ops: OverlayOp[], item: TextItem): void {
  const originalStr = item.str.trim();
  const original = parseFloat(originalStr.replace(/[$,]/g, ""));
  if (isNaN(original)) return;

  const updated = Math.round(original * 1.01 * 100) / 100;

  // Preserve dollar sign and format with commas
  const hasDollar = originalStr.includes("$");
  const newValueStr =
    (hasDollar ? "$" : "") +
    updated.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  ops.push({
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    newText: newValueStr,
    fontSize: item.height,
    isBold: false,
    isErase: true,
    align: "right",
  });
}

/**
 * Calculates X and Width for a substring within a TextItem
 */
function getSubstringCoords(
  item: TextItem,
  substring: string,
  font: PDFFont,
): { x: number; width: number } {
  const index = item.str.indexOf(substring);
  if (index === -1) return { x: item.x, width: item.width };

  const textBefore = item.str.substring(0, index);
  const fontSize = item.height;

  const widthBefore = font.widthOfTextAtSize(textBefore, fontSize);
  const substringWidth = font.widthOfTextAtSize(substring, fontSize);

  // Scale if necessary (pdfjs item.width might differ from font.widthOfTextAtSize)
  const totalMeasuredWidth = font.widthOfTextAtSize(item.str, fontSize);
  const scale = totalMeasuredWidth > 0 ? item.width / totalMeasuredWidth : 1;

  return {
    x: item.x + widthBefore * scale,
    width: substringWidth * scale,
  };
}

/**
 * Step 4 — Apply edits with pdf-lib
 * Handles both left-aligned (PO) and right-aligned (currency values) text insertion
 */
export async function applyEdits(
  originalPdfBytes: Uint8Array,
  ops: OverlayOp[],
  fontForMeasurement?: PDFFont,
) {
  const pdfDoc = await PDFDocument.load(Buffer.from(originalPdfBytes));
  const pages = pdfDoc.getPages();
  const page = pages[0];

  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  for (const op of ops) {
    const fontSize = op.fontSize || 9;
    const align = op.align || "right";

    // Step 1: Erase original with white rectangle
    if (op.isErase) {
      page.drawRectangle({
        x: op.x - 2,
        y: op.y - 2,
        width: op.width + 4,
        height: op.height + 2,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      });
    }

    // Step 2: Insert new value with proper alignment
    let textX = op.x;
    const font = op.isBold ? timesBold : timesRoman;

    if (align === "right" && fontForMeasurement) {
      // Right-align new value to original right edge
      // For right-aligned text, we need to position the text so its right edge aligns with the original's right edge
      const originalRightEdge = op.x + op.width;
      const newTextWidth = font.widthOfTextAtSize(op.newText, fontSize);
      textX = originalRightEdge - newTextWidth;
    }

    page.drawText(op.newText, {
      x: textX,
      y: op.y,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });
  }

  return await pdfDoc.save();
}

import { PDFDocument, rgb, StandardFonts, PDFFont } from "pdf-lib";

/**
 * PDF Processing Engine — Repaint/Overlay approach for modifying invoices.
 * Strictly follows the requirements for 1% markup and PO replacement (Cases A, B, C).
 */

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
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
    const [a, b, c, d, x, y] = item.transform;
    return {
      str: item.str,
      x: x,
      y: y,
      width: item.width,
      height: item.height,
      fontName: item.fontName,
    };
  });

  return { items };
}

/**
 * Core Logic for 1% Markup and PO Replacement
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

  // --- Step 2: 1% Markup Logic ---
  const AMOUNT_COLUMN_MIN_X = 400;
  // Account for optional negative sign, optional dollar, commas, and 2 decimal places
  const currencyRegex = /^-?\$?[\d,]+\.\d{2}$/;

  items.forEach((item) => {
    const trimmed = item.str.trim();
    if (currencyRegex.test(trimmed) && item.x > AMOUNT_COLUMN_MIN_X) {
      const originalValue = parseFloat(trimmed.replace(/[$,]/g, ""));
      if (isNaN(originalValue)) return;

      const newValue = Math.round(originalValue * 1.01 * 100) / 100;
      const newValueStr = newValue.toFixed(2); // Prompt says: "Math.round(parseFloat(original) * 1.01 * 100) / 100"

      ops.push({
        x: item.x,
        y: item.y,
        width: item.width + 4,
        height: item.height + 4,
        newText: newValueStr,
        fontSize: item.height,
        isBold: false,
        isErase: true,
      });
    }
  });

  // --- Step 3: PO Number Replacement Logic ---
  const serviceActivityItems = items.filter(
    (it) => it.x < 300 && it.y < 550 && it.y > 100,
  );
  let poMatchApplied = false;

  // CASE A & B: Replacement in existing text
  // Broaden pending regex to capture more variations shown in prompt
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
        newText: poNumber, // Only insert the number where "pending..." was
        fontSize: item.height,
        isBold: false,
        isErase: true,
      });
      poMatchApplied = true;
      continue;
    }

    // Check Case B: Existing PO
    const existingMatch = existingPoRegex.exec(item.str);
    if (existingMatch && poNumber) {
      const poLabel = existingMatch[1];
      const oldPoVal = existingMatch[2];
      // Erase only the number portion
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
    });
  }

  return await applyEdits(pdfBytes, ops);
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
 */
export async function applyEdits(
  originalPdfBytes: Uint8Array,
  ops: OverlayOp[],
) {
  const pdfDoc = await PDFDocument.load(Buffer.from(originalPdfBytes));
  const pages = pdfDoc.getPages();
  const page = pages[0];

  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  for (const op of ops) {
    if (op.isErase) {
      page.drawRectangle({
        x: op.x,
        y: op.y,
        width: op.width,
        height: op.height,
        color: rgb(1, 1, 1),
      });
    }

    page.drawText(op.newText, {
      x: op.x,
      y: op.y,
      size: op.fontSize || 9,
      font: op.isBold ? timesBold : timesRoman,
      color: rgb(0, 0, 0),
    });
  }

  return await pdfDoc.save();
}

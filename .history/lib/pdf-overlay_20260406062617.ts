/**
 * PDF Overlay Engine — Repaint/Overlay approach for modifying invoices.
 *
 * Handles three cases for PO replacement with precise word targeting:
 * Case A: Cover ONLY the pending-related words in the Service Activity.
 * Case B: Cover ONLY the existing PO number value.
 * Case C: Append "PO# [number]" on a new line below the Service Activity.
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import {
  PO_PLACEHOLDER_PATTERNS,
  EXISTING_PO_QUERY_PATTERN,
} from "@/lib/text-replacement";
import type {
  ParsedInvoice,
  PDFFieldMetadata,
  ParsedLineItem,
} from "@/types/invoice";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface OverlayOp {
  pageIndex: number;
  /** pdfjs-dist coordinates (origin bottom-left, Y goes up) */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Original text (for logging/alignment) */
  oldText?: string;
  /** Replacement text */
  newText: string;
  /** Font size to use */
  fontSize: number;
  /** If true, draws a white rectangle over the area before writing text */
  isErase: boolean;
  /** Alignment: monetary values are usually right-aligned, POs etc are left-aligned */
  align: "left" | "right";
  /** Font weight to use */
  weight?: "normal" | "bold";
}

// ─────────────────────────────────────────────
// Overlay Operations Builder
// ─────────────────────────────────────────────

function formatAmount(value: number | string, prefix: string = ""): string {
  const cleanValue =
    typeof value === "string" ? value.replace(/[$, ]/g, "") : value;
  const num = Number(cleanValue);
  if (isNaN(num)) return String(value);

  return (
    prefix +
    num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Calculates a sub-rectangle for a substring within a larger text item using font measurements.
 * This is CRITICAL for Case A to avoid erasing adjacent content like dates.
 */
function calculateSubstringRect(
  meta: PDFFieldMetadata,
  substring: string,
  font: PDFFont,
  occurrenceIndex?: number,
): { x: number; width: number } {
  const fullText = meta.fullText || "";
  if (!fullText) {
    return { x: meta.rect.x, width: meta.rect.width };
  }

  const index =
    occurrenceIndex !== undefined
      ? occurrenceIndex
      : fullText.indexOf(substring);

  if (index === -1) {
    return { x: meta.rect.x, width: meta.rect.width };
  }
  const fontSize = Math.max(meta.rect.height * 0.9, 7);
  const textBefore = fullText.slice(0, index);

  // Measure the width of the text before the target substring to find the X offset
  const xOffset = font.widthOfTextAtSize(textBefore, fontSize);
  const subWidth = font.widthOfTextAtSize(substring, fontSize);

  // Scale factor: PDF text items often have slight horizontal scaling or kerning
  // We compare our measured full width vs the PDF item's reported width
  const measuredFullWidth = font.widthOfTextAtSize(fullText, fontSize);
  const scale = meta.rect.width / measuredFullWidth;

  return {
    x: meta.rect.x + xOffset * scale,
    width: subWidth * scale,
  };
}

function makeOp(
  meta: PDFFieldMetadata | undefined,
  oldValue: string,
  newValue: string,
  label: string,
  font: PDFFont,
  align: "left" | "right" = "right",
  isErase: boolean = true,
  substringOnly: boolean = false,
  offsetWithinFullText?: number,
): OverlayOp | null {
  if (!meta) return null;

  const fontSize = Math.max(meta.rect.height * 0.9, 7);
  let { x, width } = meta.rect;

  if (substringOnly && oldValue) {
    const sub = calculateSubstringRect(
      meta,
      oldValue,
      font,
      offsetWithinFullText,
    );
    x = sub.x;
    width = sub.width;
  }

  return {
    pageIndex: meta.pageIndex,
    x,
    y: meta.rect.y,
    width,
    height: meta.rect.height,
    oldText: oldValue,
    newText: newValue,
    fontSize,
    isErase,
    align,
  };
}

export function buildOverlayOps(
  original: ParsedInvoice,
  markedUp: ParsedInvoice,
  font: PDFFont,
): OverlayOp[] {
  const ops: OverlayOp[] = [];

  // ─── Monetary header fields ───
  const monetaryFields = [
    {
      label: " ",
      orig: original.balanceDue,
      curr: markedUp.balanceDue !== null ? `$${markedUp.balanceDue}` : null,
      meta: original.sourceMetadata.balanceDue,
    },
    {
      label: "subtotal",
      orig: original.subtotal,
      curr: markedUp.subtotal,
      meta: original.sourceMetadata.subtotal,
    },
    {
      label: "taxAmount",
      orig: original.taxAmount,
      curr: markedUp.taxAmount,
      meta: original.sourceMetadata.taxAmount,
    },
    {
      label: "creditAmount",
      orig: original.creditAmount,
      curr: markedUp.creditAmount,
      meta: original.sourceMetadata.creditAmount,
    },
    {
      label: "totalAmount",
      orig: original.totalAmount,
      curr: markedUp.totalAmount !== null ? `$${markedUp.totalAmount}` : null,
      meta: original.sourceMetadata.totalAmount,
    },
  ];

  for (const field of monetaryFields) {
    if (field.orig !== null && field.curr !== null) {
      // Determine if this field should have a dollar sign prefix
      const usePrefix = field.label === " " || field.label === "totalAmount";
      const prefix = usePrefix ? "$" : "";

      const oldStr = formatAmount(field.orig, prefix);
      const newStr = formatAmount(field.curr, prefix);

      if (oldStr !== newStr) {
        const op = makeOp(
          field.meta,
          oldStr,
          newStr,
          field.label,
          font,
          "right",
        );
        if (op) ops.push(op);
      }
    }
  }

  // ─── Header date fields ───
  const dateFields = [
    {
      label: "invoiceDate",
      orig: original.invoiceDate,
      curr: markedUp.invoiceDate,
      meta: original.sourceMetadata.invoiceDate,
    },
    {
      label: "dueDate",
      orig: original.dueDate,
      curr: markedUp.dueDate,
      meta: original.sourceMetadata.dueDate,
    },
  ];

  for (const field of dateFields) {
    if (field.meta && field.curr && field.orig !== field.curr) {
      const op = makeOp(
        field.meta,
        field.orig || "",
        field.curr,
        field.label,
        font,
        "left",
      );
      if (op) ops.push(op);
    }
  }

  // ─── Line item amounts ───
  for (let i = 0; i < original.lineItems.length; i++) {
    const origItem = original.lineItems[i];
    const newItem = markedUp.lineItems[i];
    if (origItem.amount !== null && newItem?.amount !== null) {
      const oldStr = formatAmount(origItem.amount);
      const newStr = formatAmount(newItem.amount);
      if (oldStr !== newStr && origItem.amountMetadata) {
        const op = makeOp(
          origItem.amountMetadata,
          oldStr,
          newStr,
          `item[${i}]`,
          font,
          "right",
        );
        if (op) ops.push(op);
      }
    }
  }

  // ─── Dynamic Line-Replacement Logic (W.O. and Order/PO) ───
  const targetPo = markedUp.poNumber;
  const targetWo = markedUp.woNumber;

  if (
    (targetPo || targetWo) &&
    original.sourceMetadata.serviceActivityItems?.length
  ) {
    const items = original.sourceMetadata.serviceActivityItems;
    const bounds = original.sourceMetadata.serviceActivityBounds;
    
    // CRITICAL: Validate bounds are available for coordinate safety
    if (!bounds) {
      console.warn(
        "[buildOverlayOps] Service Activity bounds not available, skipping PO/W.O. rendering for safety",
      );
      return ops;
    }

    // 1. Group items into contiguous horizontal lines based on Y coordinate
    const Y_TOLERANCE = 3;
    const linesMap = new Map<number, PDFFieldMetadata[]>();
    for (const item of items) {
      let foundY = Array.from(linesMap.keys()).find(
        (y) => Math.abs(y - item.rect.y) <= Y_TOLERANCE,
      );
      if (foundY === undefined) {
        foundY = item.rect.y;
        linesMap.set(foundY, []);
      }
      linesMap.get(foundY)!.push(item);
    }

    let woHandled = false;
    let poHandled = false;

    // Sort array of lines from top to bottom
    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
    const descLines = sortedY.map((y) => {
      const lineItems = linesMap.get(y)!.sort((a, b) => a.rect.x - b.rect.x);
      return {
        y,
        items: lineItems,
        text: lineItems.map((i) => i.fullText || "").join(" "),
      };
    });

    // Strategy 1: Order / PO #
    if (targetPo) {
      const poLineIndex = descLines.findIndex((line) =>
        /order\s*#?\s*\d|PO[:#\s]*\d|pending|awaiting/i.test(line.text),
      );
      // CRITICAL: Verify the line is within Service Activity bounds before rendering
      const poLineValid =
        poLineIndex !== -1 && isWithinServiceActivityBounds(descLines[poLineIndex].y);
      
      if (poLineValid) {
        const poLine = descLines[poLineIndex];
        poHandled = true; // Placeholder found, we will replace it
        const targetItemIndex = poLine.items.findIndex((i) =>
          /order\s*#?\s*\d|PO[:#\s]*\d|pending|awaiting/i.test(
            i.fullText || "",
          ),
        );

        if (targetItemIndex !== -1) {
          const targetItem = poLine.items[targetItemIndex];
          const fullText = targetItem.fullText || "";

          let match = /pending/i.exec(fullText);
          if (!match) match = /awaiting/i.exec(fullText);
          if (!match) match = /PO[:#\s]*[a-zA-Z0-9\-]+/i.exec(fullText);
          if (!match) match = /order\s*#?\s*[a-zA-Z0-9\-]+/i.exec(fullText);

          if (match) {
            const textBefore = fullText.slice(0, match.index);
            const remainderText = fullText.slice(match.index);

            let substitutedRemainder = remainderText;
            if (targetPo) {
              substitutedRemainder = remainderText
                .replace(/pending/i, targetPo)
                .replace(/awaiting/i, targetPo)
                .replace(/(PO[:#\s]*)[a-zA-Z0-9\-]+/i, `$1${targetPo}`)
                .replace(/(order\s*#?\s*)[a-zA-Z0-9\-]+/i, `$1${targetPo}`);
            }

            // Reduce font size slightly (90% of original height) to avoid overlap issues
            const fontSize = (targetItem.rect.height || 8) * 0.9;
            const xOffset = font.widthOfTextAtSize(textBefore, fontSize);
            const measuredFullWidth = font.widthOfTextAtSize(
              fullText,
              fontSize,
            );
            const scale = targetItem.rect.width / measuredFullWidth;
            const startX = targetItem.rect.x + xOffset * scale;

            const remainingItems = poLine.items.slice(targetItemIndex);
            const maxRightEdge = Math.max(
              ...remainingItems.map((i) => i.rect.x + i.rect.width),
            );
            const minY = Math.min(...remainingItems.map((i) => i.rect.y)) - 1;
            const maxY =
              Math.max(...remainingItems.map((i) => i.rect.y + i.rect.height)) +
              1;

            ops.push({
              pageIndex: targetItem.pageIndex,
              x: startX - 2,
              y: minY - 2,
              width: maxRightEdge - startX + 4,
              height: maxY - minY,
              newText: "",
              fontSize,
              isErase: true,
              align: "left",
            });

            let textToDraw = substitutedRemainder;
            // REPOSITION: If WO is also provided, group it right after PO
            if (targetWo) {
              textToDraw += `  W.O.# ${targetWo}`;
              woHandled = true;
            }
            for (let i = targetItemIndex + 1; i < poLine.items.length; i++) {
              textToDraw += " " + (poLine.items[i].fullText || "");
            }

            ops.push({
              pageIndex: targetItem.pageIndex,
              x: startX,
              y: targetItem.rect.y - 2,
              width: 0,
              height: fontSize,
              newText: textToDraw,
              fontSize,
              isErase: false,
              align: "left",
              weight: "normal",
            });
          }
        }
      }
    }

    // Strategy 2: W.O. # (Only if not already grouped with PO)
    if (targetWo) {
      const woLineIndex = descLines.findIndex((line) =>
        /W\.?O\.?\s*#?/i.test(line.text),
      );
      // CRITICAL: Verify the line is within Service Activity bounds before rendering
      const woLineValid =
        woLineIndex !== -1 && isWithinServiceActivityBounds(descLines[woLineIndex].y);
      
      if (woLineValid) {
        const woLine = descLines[woLineIndex];
        const targetItemIndex = woLine.items.findIndex((i) =>
          /W\.?O\.?\s*#?/i.test(i.fullText || ""),
        );

        if (targetItemIndex !== -1) {
          const targetItem = woLine.items[targetItemIndex];
          const fullText = targetItem.fullText || "";
          const match = /(W\.?O\.?#?\s*)[a-zA-Z0-9\-]+/i.exec(fullText);

          if (match) {
            const textBefore = fullText.slice(0, match.index);
            const remainderText = fullText.slice(match.index);

            const substitutedRemainder = remainderText
              .replace(/pending/i, targetWo)
              .replace(/awaiting/i, targetWo)
              .replace(/(W\.?O\.?#?\s*)[a-zA-Z0-9\-]+/i, `$1${targetWo}`);

            const fontSize = (targetItem.rect.height || 8) * 0.9;
            const xOffset = font.widthOfTextAtSize(textBefore, fontSize);
            const measuredFullWidth = font.widthOfTextAtSize(
              fullText,
              fontSize,
            );
            const scale = targetItem.rect.width / measuredFullWidth;
            const startX = targetItem.rect.x + xOffset * scale;

            const remainingItems = woLine.items.slice(targetItemIndex);
            const maxRightEdge = Math.max(
              ...remainingItems.map((i) => i.rect.x + i.rect.width),
            );
            const minY = Math.min(...remainingItems.map((i) => i.rect.y)) - 2;
            const maxY =
              Math.max(...remainingItems.map((i) => i.rect.y + i.rect.height)) +
              2;

            ops.push({
              pageIndex: targetItem.pageIndex,
              x: startX - 1,
              y: minY - 2,
              width: maxRightEdge - startX + 2,
              height: maxY - minY,
              newText: "",
              fontSize,
              isErase: true,
              align: "left",
            });

            if (!woHandled) {
              // Only draw if we didn't already group it with PO
              let textToDraw = substitutedRemainder;
              for (let i = targetItemIndex + 1; i < woLine.items.length; i++) {
                textToDraw += " " + (woLine.items[i].fullText || "");
              }

              ops.push({
                pageIndex: targetItem.pageIndex,
                x: startX,
                y: targetItem.rect.y - 2,
                width: 0,
                height: fontSize,
                newText: textToDraw.trim(),
                fontSize,
                isErase: false,
                align: "left",
                weight: "normal",
              });
              woHandled = true;
            }
          }
        }
      }
    }

    // Case C: No PO/WO placeholder found in any line
    // CRITICAL: Only render on lines that are WITHIN the Service Activity block
    const validLines = descLines.filter((line) =>
      isWithinServiceActivityBounds(line.y),
    );

    if (validLines.length > 0 && (!poHandled || !woHandled)) {
      // Case C: No PO placeholder (and/or no WO placeholder) found.
      // Append missing values to the LAST valid line within bounds (not second line).
      // This ensures we stay within the Service Activity block.
      const lineToUse = validLines[validLines.length - 1];
      const firstItem = lineToUse.items[0];
      const fontSize = firstItem.rect.height || 8;

      const minX = Math.min(...lineToUse.items.map((i) => i.rect.x));
      const minY = Math.min(...lineToUse.items.map((i) => i.rect.y)) - 1;
      const maxY =
        Math.max(...lineToUse.items.map((i) => i.rect.y + i.rect.height)) + 1;

      // 1. Erase the whole line (narrower width to avoid Amount column)
      const eraseWidth = Math.min(460 - minX, 550 - minX);
      ops.push({
        pageIndex: firstItem.pageIndex,
        x: minX - 1,
        y: minY,
        width: eraseWidth + 2,
        height: maxY - minY - 1,
        newText: "",
        fontSize,
        isErase: true,
        align: "left",
      });

      // 2. Draw text with PO# and W.O.# if NOT already handled
      let newLabel = lineToUse.text.trim();
      if (!poHandled && targetPo) {
        // Only append if it's not "Pending PO" (otherwise it's redundant to force an append)
        if (!targetPo.toLowerCase().includes("pending")) {
          newLabel += `  PO# ${targetPo}`;
          poHandled = true;
        }
      }
      if (!woHandled && targetWo) {
        newLabel += `  W.O.# ${targetWo}`;
        woHandled = true;
      }

      ops.push({
        pageIndex: firstItem.pageIndex,
        x: minX,
        y: lineToUse.y - 2,
        width: 0,
        height: fontSize,
        newText: newLabel,
        fontSize,
        isErase: false,
        align: "left",
        weight: "normal",
      });
    } else {
      // Case D: No valid lines found within bounds (all lines are outside Service Activity)
      // In this case, skip rendering PO/W.O. entirely to avoid overlapping with other sections
      // This preserves the integrity of the document layout
      if (!poHandled && !woHandled) {
        console.warn(
          "[buildOverlayOps] No valid lines found within Service Activity bounds. Skipping PO/W.O. overlay to prevent overlap with other sections.",
        );
      }
  }

  return ops;
}

/**
 * Apply overlay operations to an original PDF.
 */
export async function applyOverlay(
  originalPdfBuffer: Buffer | Uint8Array,
  ops: OverlayOp[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfBuffer, {
    ignoreEncryption: true,
  });
  const pages = pdfDoc.getPages();
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  for (const op of ops) {
    const page = pages[op.pageIndex];
    if (!page) continue;

    if (op.isErase) {
      page.drawRectangle({
        x: op.x - 1,
        y: op.y - 1,
        width: op.width + 2,
        height: op.height + 2,
        color: rgb(1, 1, 1),
      });
    }

    const currentFont = op.weight === "normal" ? fontNormal : fontBold;

    // Auto-shrink font size if text is too wide for the target field
    let fontSize = op.fontSize;
    if (op.width > 0) {
      const MIN_FONT_SIZE = 6;
      let textWidth = currentFont.widthOfTextAtSize(op.newText, fontSize);
      while (textWidth > op.width + 2 && fontSize > MIN_FONT_SIZE) {
        fontSize -= 0.5;
        textWidth = currentFont.widthOfTextAtSize(op.newText, fontSize);
      }
    }

    const textWidth = currentFont.widthOfTextAtSize(op.newText, fontSize);

    let textX = op.x;
    if (op.align === "right") {
      textX = op.x + op.width - textWidth;
    }

    page.drawText(op.newText, {
      x: textX,
      y: op.y + op.height * 0.15,
      size: fontSize,
      font: currentFont,
      color: rgb(0, 0, 0),
    });
  }

  return pdfDoc.save();
}

/**
 * High-level function to generate the overlaid PDF.
 */
export async function generateOverlaidPDF(
  originalPdfBuffer: Buffer | Uint8Array,
  originalInvoice: ParsedInvoice,
  markedUpInvoice: ParsedInvoice,
): Promise<Buffer> {
  // Use a second instance just for font measurements to keep the main flow clean
  const measureDoc = await PDFDocument.load(originalPdfBuffer);
  const fontNormal = await measureDoc.embedFont(StandardFonts.TimesRoman);

  const ops = buildOverlayOps(originalInvoice, markedUpInvoice, fontNormal);
  const modifiedBytes = await applyOverlay(originalPdfBuffer, ops);
  return Buffer.from(modifiedBytes);
}

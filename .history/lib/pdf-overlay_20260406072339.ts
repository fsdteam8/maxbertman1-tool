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

    // CRITICAL: Filter to ONLY lines that correspond to actual service items
    // Exclude "Service Address", address patterns, and other non-service lines
    // Build a set of Y coordinates that have service amounts (from lineItems metadata)
    const serviceLineYCoordinates = new Set<number>();
    for (const lineItem of original.lineItems) {
      if (
        lineItem.amountMetadata?.rect.y !== undefined &&
        lineItem.amountMetadata.rect.y > bounds.bottomY &&
        lineItem.amountMetadata.rect.y < bounds.topY
      ) {
        // Find the descLine that matches this Y coordinate (within tolerance)
        const matchingDescLine = descLines.find(
          (dl) => Math.abs(dl.y - lineItem.amountMetadata!.rect.y) <= Y_TOLERANCE,
        );
        if (matchingDescLine) {
          serviceLineYCoordinates.add(matchingDescLine.y);
        }
      }
    }

    // Filter descLines to ONLY those that correspond to service items
    // If no service items found by amount metadata, fall back to filtering out obvious non-service patterns
    let serviceLines = descLines;
    if (serviceLineYCoordinates.size > 0) {
      serviceLines = descLines.filter((line) =>
        serviceLineYCoordinates.has(line.y),
      );
    } else {
      // Fallback: exclude lines that look like addresses or headers
      serviceLines = descLines.filter(
        (line) =>
          !/Service\s+Address|^([A-Z][a-z]+,?\s+[A-Z]{2}\s+\d{5}|[A-Za-z\s-]+,\s+[A-Z]{2})/i.test(
            line.text,
          ),
      );
    }

    // Simplified Unified Strategy: Repaint entire service line with PO/W.O. at start
    // This provides a clean layout and avoids positioning issues.
    
    // First pass: Find lines that need repainting (contain PO/W.O. placeholders)
    const linesToRepaint = new Map<
      number,
      { line: typeof serviceLines[0]; needsPo: boolean; needsWo: boolean }
    >();

    // Check each service line for PO/W.O. placeholders
    for (let i = 0; i < serviceLines.length; i++) {
      const line = serviceLines[i];
      
      // Skip if line is outside Service Activity bounds
      if (line.y <= bounds.bottomY || line.y >= bounds.topY) continue;

      const hasPOPlaceholder =
        /PO\s*#\s*(?:pending|awaiting|tbd|tba)/i.test(line.text) ||
        /order\s+#?\s*(?:pending|awaiting|tbd|tba|to\s+be\s+assigned)/i.test(
          line.text,
        );

      const hasWOPlaceholder =
        /W\.?O\.?\s*#\s*(?:pending|awaiting|tbd|tba)/i.test(line.text) ||
        /W\.?O\.?\s*#\s*to\s+be\s+assigned/i.test(line.text);

      // Mark line for repainting if it needs PO/W.O.
      if ((hasPOPlaceholder && targetPo) || (hasWOPlaceholder && targetWo)) {
        linesToRepaint.set(i, {
          line,
          needsPo: hasPOPlaceholder && targetPo,
          needsWo: hasWOPlaceholder && targetWo,
        });
      }
    }

    // If no lines with placeholders found, try to place on first valid service line
    if (linesToRepaint.size === 0 && (targetPo || targetWo)) {
      const firstValidLine = serviceLines.find(
        (line) => line.y > bounds.bottomY && line.y < bounds.topY,
      );
      if (firstValidLine) {
        const lineIndex = serviceLines.indexOf(firstValidLine);
        linesToRepaint.set(lineIndex, {
          line: firstValidLine,
          needsPo: !!targetPo,
          needsWo: !!targetWo,
        });
      }
    }

    // Second pass: Repaint marked lines with PO/W.O. at the start
    for (const [lineIndex, lineInfo] of linesToRepaint) {
      const line = lineInfo.line;
      const firstItem = line.items[0];
      const lastItem = line.items[line.items.length - 1];

      if (!firstItem) continue;

      const fontSize = firstItem.rect.height || 8;
      const minX = Math.min(...line.items.map((i) => i.rect.x));
      const minY = Math.min(...line.items.map((i) => i.rect.y)) - 1;
      const maxY =
        Math.max(...line.items.map((i) => i.rect.y + i.rect.height)) + 1;
      const maxX = Math.max(...line.items.map((i) => i.rect.x + i.rect.width));

      // 1. Erase the entire line
      ops.push({
        pageIndex: firstItem.pageIndex,
        x: minX - 2,
        y: minY - 1,
        width: maxX - minX + 4,
        height: maxY - minY,
        newText: "",
        fontSize,
        isErase: true,
        align: "left",
      });

      // 2. Build new line text: PO# [number] W.O.# [number] [original service description]
      let newLineText = "";

      // Add PO at start if needed
      if (lineInfo.needsPo && targetPo) {
        newLineText += `PO# ${targetPo}`;
        poHandled = true;
      }

      // Add W.O. at start (or after PO) if needed
      if (lineInfo.needsWo && targetWo) {
        if (newLineText) newLineText += "  ";
        newLineText += `W.O.# ${targetWo}`;
        woHandled = true;
      }

      // Add original service description
      // Remove placeholder keywords from original text
      let originalText = line.text
        .replace(/PO\s*#\s*(?:pending|awaiting|tbd|tba|to\s+be\s+assigned)/gi, "")
        .replace(
          /order\s+#?\s*(?:pending|awaiting|tbd|tba|to\s+be\s+assigned)/gi,
          "",
        )
        .replace(/W\.?O\.?\s*#\s*(?:pending|awaiting|tbd|tba|to\s+be\s+assigned)/gi, "")
        .trim();

      if (newLineText && originalText) {
        newLineText += "  " + originalText;
      } else if (originalText) {
        newLineText = originalText;
      }

      // 3. Draw the new line text at the start position
      ops.push({
        pageIndex: firstItem.pageIndex,
        x: minX,
        y: line.y,
        width: 0,
        height: fontSize,
        newText: newLineText,
        fontSize,
        isErase: false,
        align: "left",
        weight: "normal",
      });
    }

    // If PO/W.O. still unhandled, log a warning (optional fallback could go here)
    if (!poHandled && targetPo) {
      console.warn(
        `[buildOverlayOps] PO# ${targetPo} was not placed (no suitable service line found)`,
      );
    }
    if (!woHandled && targetWo) {
      console.warn(
        `[buildOverlayOps] W.O.# ${targetWo} was not placed (no suitable service line found)`,
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

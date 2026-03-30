/**
 * PDF Overlay Engine — Repaint/Overlay approach for modifying invoices.
 *
 * Handles three cases for PO replacement with precise word targeting:
 * Case A: Cover ONLY the pending-related words in the Service Activity.
 * Case B: Cover ONLY the existing PO number value.
 * Case C: Append "PO# [number]" on a new line below the Service Activity.
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
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
}

// ─────────────────────────────────────────────
// Overlay Operations Builder
// ─────────────────────────────────────────────

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculates a sub-rectangle for a substring within a larger text item using font measurements.
 * This is CRITICAL for Case A to avoid erasing adjacent content like dates.
 */
function calculateSubstringRect(
  meta: PDFFieldMetadata,
  substring: string,
  font: PDFFont,
): { x: number; width: number } {
  const fullText = meta.fullText || "";
  if (!fullText || !fullText.includes(substring)) {
    return { x: meta.rect.x, width: meta.rect.width };
  }

  const fontSize = Math.max(meta.rect.height * 0.9, 7);
  const index = fullText.indexOf(substring);
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
): OverlayOp | null {
  if (!meta) return null;

  const fontSize = Math.max(meta.rect.height * 0.9, 7);
  let { x, width } = meta.rect;

  if (substringOnly && oldValue) {
    const sub = calculateSubstringRect(meta, oldValue, font);
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
      label: "balanceDue",
      orig: original.balanceDue,
      curr: markedUp.balanceDue,
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
      curr: markedUp.totalAmount,
      meta: original.sourceMetadata.totalAmount,
    },
  ];

  for (const field of monetaryFields) {
    if (field.orig !== null && field.curr !== null) {
      const oldStr = formatAmount(field.orig);
      const newStr = formatAmount(field.curr);
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

  // ─── PO Replacement Logic ───
  const targetPo = markedUp.poNumber;
  if (targetPo) {
    if (
      original.poPlaceholderDetected &&
      original.sourceMetadata.poPlaceholder
    ) {
      const op = makeOp(
        original.sourceMetadata.poPlaceholder,
        original.poOriginalText || "",
        `PO# ${targetPo}`,
        "Case A",
        font,
        "left",
        true,
        true,
      );
      if (op) ops.push(op);
    } else if (original.poNumber && original.sourceMetadata.poNumber) {
      const op = makeOp(
        original.sourceMetadata.poNumber,
        original.poNumber,
        targetPo,
        "Case B",
        font,
        "left",
        true,
        true,
      );
      if (op) ops.push(op);
    } else if (original.sourceMetadata.serviceActivityItems?.length) {
      const items = original.sourceMetadata.serviceActivityItems;
      const lastItem = items.reduce((prev, curr) =>
        curr.rect.y < prev.rect.y ? curr : prev,
      );
      const fontSize = Math.max(lastItem.rect.height * 0.9, 8);
      ops.push({
        pageIndex: lastItem.pageIndex,
        x: lastItem.rect.x,
        y: lastItem.rect.y - fontSize * 1.5,
        width: 100,
        height: fontSize,
        newText: `PO# ${targetPo}`,
        fontSize,
        isErase: false,
        align: "left",
      });
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

    const textWidth = fontBold.widthOfTextAtSize(op.newText, op.fontSize);
    let textX = op.x;
    if (op.align === "right") {
      textX = op.x + op.width - textWidth;
    }

    page.drawText(op.newText, {
      x: textX,
      y: op.y + op.height * 0.15,
      size: op.fontSize,
      font: fontBold,
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

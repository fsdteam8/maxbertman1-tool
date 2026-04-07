/**
 * PDF Overlay Engine — Repaint/Overlay approach for modifying invoices.
 *
 * With the new token-based replacement system:
 * - Activity descriptions now use {PO#}, {WO#}, and {PO_WO#} tokens
 * - Invoice transformer replaces tokens atomically with actual values
 * - OverlayEngine receives markedUp invoice with tokens already replaced
 * - Overlay renders the final descriptions with real PO/WO values
 *
 * This eliminates fragile regex searching at the PDF level and ensures
 * PO/W.O# values bind to the same activity line cleanly.
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import {
  PO_PLACEHOLDER_PATTERNS,
  EXISTING_PO_QUERY_PATTERN,
} from "@/lib/text-replacement";
import { hasPOToken, hasWOToken } from "@/lib/token-replacement";
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
  /** If true, don't add padding to erase rectangle dimensions */
  noPadding?: boolean;
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

  // IMPROVED FONT SIZING: Use 85% of rect height for better visual balance
  // This ensures text fits comfortably and maintains readability
  const fontSize = Math.max(meta.rect.height * 0.85, 8);
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
      // All monetary fields rendered with $ prefix for consistency
      const prefix = "$";

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

  // ─── Render Modified Service Activity Descriptions ───
  // The transformer has already modified lineItem.descriptions to include PO# / W.O#.
  // Now we need to render these modified descriptions back into the PDF.
  // This is simpler and more reliable than searching for patterns at the PDF level.

  // Build a map of modified descriptions: only service items with changed descriptions
  const modifiedDescriptions = new Map<string, string>();
  for (let i = 0; i < original.lineItems.length; i++) {
    const origItem = original.lineItems[i];
    const newItem = markedUp.lineItems[i];

    if (
      origItem.type === "service" &&
      origItem.description !== newItem.description
    ) {
      const key = `${origItem.description}::${i}`;
      modifiedDescriptions.set(key, newItem.description);
    }
  }

  // If we have modified descriptions that need to be painted, do it here
  let serviceDescriptionHandled = false;
  if (
    modifiedDescriptions.size > 0 &&
    original.sourceMetadata.serviceActivityItems?.length
  ) {
    const items = original.sourceMetadata.serviceActivityItems;
    const bounds = original.sourceMetadata.serviceActivityBounds;

    if (!bounds) {
      console.warn(
        "[buildOverlayOps] Service Activity bounds not available, skipping service description rendering",
      );
      return ops;
    }

    // For each service item with description metadata, paint the new description
    let firstServiceItem: PDFFieldMetadata | null = null;

    for (let i = 0; i < original.lineItems.length; i++) {
      const origItem = original.lineItems[i];
      const newItem = markedUp.lineItems[i];

      if (
        origItem.type === "service" &&
        origItem.description !== newItem.description
      ) {
        // Find the first PDF item in serviceActivityItems that matches this service line
        if (!firstServiceItem) {
          // Get the first PDF item in service activity (skip header rows)
          for (const pdfItem of items) {
            if (
              !/Service\s*-?\s*Activity|Services?|QTY|RATE|AMOUNT/i.test(
                pdfItem.fullText || "",
              )
            ) {
              firstServiceItem = pdfItem;
              break;
            }
          }
        }

        if (firstServiceItem) {
          const fontSize = Math.max(firstServiceItem.rect.height * 0.9, 7);

          // For multi-line descriptions, paint the new text at the first item's position
          // This allows the PDF to naturally overwrite old text while preserving layout
          // Don't use aggressive area erasure - just paint the new content
          ops.push({
            pageIndex: firstServiceItem.pageIndex,
            x: firstServiceItem.rect.x,
            y: firstServiceItem.rect.y,
            width: 0,
            height: fontSize,
            newText: newItem.description,
            fontSize,
            isErase: false,
            align: "left",
            weight: "normal",
          });

          serviceDescriptionHandled = true;
          break; // Only repaint the first modified service description
        }
      }
    }
  }

  // ─── Dynamic Line-Replacement Logic (PO only - W.O. DISABLED) ───
  // LEGACY: This section handles cases where transformer didn't modify descriptions
  // (e.g., when there's already a placeholder in the lineItem.description)
  // CRITICAL: SKIP if we already handled service description in modified rendering above
  // This prevents duplicate overlays and text corruption
  const targetPo = markedUp.poNumber;
  const targetWo: string | null = null; // W.O. rendering disabled

  if (
    !serviceDescriptionHandled &&
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

    // Identify lines that are Service Address blocks so we avoid placing W.O.# there
    const serviceAddressLineIndices = new Set<number>();
    descLines.forEach((line, idx) => {
      if (/Service\s*Address/i.test(line.text))
        serviceAddressLineIndices.add(idx);
    });

    // Strategy 1: Replace PO placeholder (if found)
    if (targetPo) {
      const poLineIndex = descLines.findIndex(
        (line) =>
          // First look for explicit PO prefix with placeholder status (highest priority)
          /PO\s*#\s*(?:pending|awaiting|tbd|tba)/i.test(line.text) ||
          // Then look for order keyword with placeholder status
          /order\s+#?\s*(?:pending|awaiting|tbd|tba|to\s+be\s+assigned)/i.test(
            line.text,
          ),
      );
      // CRITICAL: Verify the line is within Service Activity bounds before rendering
      const poLineValid =
        poLineIndex !== -1 &&
        descLines[poLineIndex].y > bounds.bottomY &&
        descLines[poLineIndex].y < bounds.topY;

      if (poLineValid) {
        const poLine = descLines[poLineIndex];
        const targetItemIndex = poLine.items.findIndex((i) => {
          const txt = i.fullText || "";
          // Match items with PO prefix OR with pending/awaiting keywords
          return /PO\s*#/.test(txt) || /pending|awaiting|tbd|tba/i.test(txt);
        });

        if (targetItemIndex !== -1) {
          const targetItem = poLine.items[targetItemIndex];
          const fullText = targetItem.fullText || "";

          let match = /pending|awaiting|tbd|tba|to\s+be\s+assigned/i.exec(
            fullText,
          );
          if (!match) match = /(PO\s*#\s*)[a-zA-Z0-9\-\/\.]+/i.exec(fullText);
          if (!match)
            match = /(order\s+#?\s*)[a-zA-Z0-9\-\/\.]+/i.exec(fullText);

          if (match) {
            const textBefore = fullText.slice(0, match.index);
            const remainderText = fullText.slice(match.index);

            let substitutedRemainder = remainderText;
            if (targetPo) {
              substitutedRemainder = remainderText
                .replace(
                  /pending|awaiting|tbd|tba|to\s+be\s+assigned/i,
                  targetPo,
                )
                .replace(/(PO\s*#\s*)[a-zA-Z0-9\-\/\.]+/i, `$1${targetPo}`)
                .replace(/(order\s+#?\s*)[a-zA-Z0-9\-\/\.]+/i, `$1${targetPo}`);
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
            const minY = Math.min(...remainingItems.map((i) => i.rect.y));
            const maxY = Math.max(
              ...remainingItems.map((i) => i.rect.y + i.rect.height),
            );

            ops.push({
              pageIndex: targetItem.pageIndex,
              x: startX,
              y: minY,
              width: maxRightEdge - startX,
              height: maxY - minY,
              newText: "",
              fontSize,
              isErase: true,
              noPadding: true,
              align: "left",
            });

            let textToDraw = substitutedRemainder;
            for (let i = targetItemIndex + 1; i < poLine.items.length; i++) {
              textToDraw += " " + (poLine.items[i].fullText || "");
            }

            ops.push({
              pageIndex: targetItem.pageIndex,
              x: startX,
              y: targetItem.rect.y,
              width: 0,
              height: fontSize,
              newText: textToDraw,
              fontSize,
              isErase: false,
              align: "left",
              weight: "normal",
            });

            poHandled = true;
          }
        }
      }
    }

    // NEW STRATEGY: If user supplied PO or W.O., prefer repainting the whole "Services" line
    // after the "Services" label and place PO/W.O. at the start of that line. This avoids
    // piecemeal substring overlays that can mis-align on some PDFs.
    if ((targetPo || targetWo) && !poHandled && !woHandled) {
      const servicesHeaderLineIndex = descLines.findIndex((line) =>
        /Service\s*-?\s*Activity|Services?/i.test(line.text),
      );

      if (servicesHeaderLineIndex !== -1) {
        const headerLine = descLines[servicesHeaderLineIndex];

        // Ensure header line within service activity bounds
        if (headerLine.y > bounds.bottomY && headerLine.y < bounds.topY) {
          // Find the item within the header line that contains the 'Services' word
          const headerItemIndex = headerLine.items.findIndex((it) =>
            /Service\s*-?\s*Activity|Services?/i.test(it.fullText || ""),
          );

          if (headerItemIndex !== -1) {
            const headerItem = headerLine.items[headerItemIndex];
            const fullText = headerItem.fullText || "";
            const match = /Service\s*-?\s*Activity|Services?/i.exec(fullText);
            // Compute X offset after the 'Services' text so we repaint only the trailing part
            let startX = headerItem.rect.x;
            const fontSize = (headerItem.rect.height || 8) * 0.9;
            if (match) {
              const textBefore = fullText.slice(
                0,
                match.index + match[0].length,
              );
              const measured = font.widthOfTextAtSize(textBefore, fontSize);
              const measuredFull =
                font.widthOfTextAtSize(fullText, fontSize) || 1;
              const scale = headerItem.rect.width / measuredFull;
              startX = headerItem.rect.x + measured * scale + 2; // small padding
            }

            // Determine line extents (avoid erasing amount columns on the right)
            const remainingItems = headerLine.items.slice(headerItemIndex);
            const maxRightEdge = Math.max(
              ...remainingItems.map((i) => i.rect.x + i.rect.width),
            );
            const minY = Math.min(...remainingItems.map((i) => i.rect.y));
            const maxY = Math.max(
              ...remainingItems.map((i) => i.rect.y + i.rect.height),
            );

            // Erase the trailing portion of the header line (after 'Services')
            ops.push({
              pageIndex: headerItem.pageIndex,
              x: startX,
              y: minY,
              width: maxRightEdge - startX,
              height: maxY - minY,
              newText: "",
              fontSize,
              isErase: true,
              noPadding: true,
              align: "left",
            });

            // Build new trailing text starting with PO/W.O. at the start of the line
            let newTrailing = "";
            if (
              targetPo &&
              !String(targetPo).toLowerCase().includes("pending")
            ) {
              newTrailing += `PO# ${targetPo}`;
              poHandled = true;
            }
            if (targetWo) {
              if (newTrailing) newTrailing += "  ";
              newTrailing += `W.O.# ${targetWo}`;
              woHandled = true;
            }

            // Append the original remainder of the header line (excluding the 'Services' token)
            let remainder = "";
            // Collect text from headerItem remainder plus following items
            if (match) {
              remainder = fullText.slice(match.index + match[0].length).trim();
            }
            for (
              let i = headerItemIndex + 1;
              i < headerLine.items.length;
              i++
            ) {
              remainder +=
                (remainder ? " " : "") + (headerLine.items[i].fullText || "");
            }

            const trailingText = (
              newTrailing + (remainder ? `  ${remainder.trim()}` : "")
            ).trim();

            ops.push({
              pageIndex: headerItem.pageIndex,
              x: startX,
              y: headerItem.rect.y,
              width: 0,
              height: fontSize,
              newText: trailingText,
              fontSize,
              isErase: false,
              align: "left",
              weight: "normal",
            });
          }
        }
      }
    }

    // Strategy 2: Replace W.O. placeholder (if found) - INDEPENDENTLY from PO
    if (targetWo) {
      const woLineIndex = descLines.findIndex(
        (line) =>
          // Look for W.O. with placeholder status (highest priority)
          /W\.?O\.?\s*#\s*(?:pending|awaiting|tbd|tba)/i.test(line.text) ||
          // Then look for any W.O. prefix
          /W\.?O\.?\s*#\s*[a-zA-Z0-9\-\/\.]+/i.test(line.text),
      );
      // CRITICAL: Verify the line is within Service Activity bounds before rendering
      const woLineValid =
        woLineIndex !== -1 &&
        descLines[woLineIndex].y > bounds.bottomY &&
        descLines[woLineIndex].y < bounds.topY &&
        // Avoid Service Address lines for default W.O. placement
        !serviceAddressLineIndices.has(woLineIndex);

      if (woLineValid) {
        const woLine = descLines[woLineIndex];
        const targetItemIndex = woLine.items.findIndex((i) => {
          const txt = i.fullText || "";
          // Match items with W.O. prefix OR with pending/awaiting keywords
          return (
            /W\.?O\.?\s*#/.test(txt) || /pending|awaiting|tbd|tba/i.test(txt)
          );
        });

        if (targetItemIndex !== -1) {
          const targetItem = woLine.items[targetItemIndex];
          const fullText = targetItem.fullText || "";

          // Try to find the placeholder or existing value to replace
          let match = /pending|awaiting|tbd|tba|to\s+be\s+assigned/i.exec(
            fullText,
          );
          if (!match)
            match = /(W\.?O\.?\s*#\s*)[a-zA-Z0-9\-\/\.]+/i.exec(fullText);

          if (match) {
            const textBefore = fullText.slice(0, match.index);
            const remainderText = fullText.slice(match.index);

            const substitutedRemainder = remainderText
              .replace(/pending|awaiting|tbd|tba|to\s+be\s+assigned/i, targetWo)
              .replace(/(W\.?O\.?\s*#\s*)[a-zA-Z0-9\-\/\.]+/i, `$1${targetWo}`);

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
            const minY = Math.min(...remainingItems.map((i) => i.rect.y));
            const maxY = Math.max(
              ...remainingItems.map((i) => i.rect.y + i.rect.height),
            );

            ops.push({
              pageIndex: targetItem.pageIndex,
              x: startX,
              y: minY,
              width: maxRightEdge - startX,
              height: maxY - minY,
              newText: "",
              fontSize,
              isErase: true,
              noPadding: true,
              align: "left",
            });

            let textToDraw = substitutedRemainder;
            for (let i = targetItemIndex + 1; i < woLine.items.length; i++) {
              textToDraw += " " + (woLine.items[i].fullText || "");
            }

            ops.push({
              pageIndex: targetItem.pageIndex,
              x: startX,
              y: targetItem.rect.y,
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

    // Case C: Append unhandled PO/W.O. to the end of the line (if any remain)
    // This handles cases where no placeholder was found for either PO or W.O.
    // CRITICAL: Only render on lines that are WITHIN the Service Activity block
    const validLines = descLines
      .map((line, idx) => ({ line, idx }))
      .filter(
        ({ line, idx }) =>
          line.y > bounds.bottomY &&
          line.y < bounds.topY &&
          // Exclude Service Address lines from default append targets
          !serviceAddressLineIndices.has(idx),
      )
      .map(({ line }) => line);

    const hasUnhandledPo = !poHandled && targetPo;
    const hasUnhandledWo = !woHandled && targetWo;

    if ((hasUnhandledPo || hasUnhandledWo) && validLines.length > 0) {
      // Place PO/W.O. on the LAST valid line within bounds
      const lineToUse = validLines[validLines.length - 1];

      // CRITICAL SAFETY CHECK: Verify this line is actually within bounds before rendering
      if (lineToUse.y <= bounds.bottomY || lineToUse.y >= bounds.topY) {
        console.warn(
          `[buildOverlayOps] Case C: Line at Y=${lineToUse.y} is out of bounds [${bounds.bottomY}, ${bounds.topY}], skipping to prevent corruption`,
        );
        return ops;
      }

      const firstItem = lineToUse.items[0];
      // Use consistent font sizing (matching placeholder case: 0.9 multiplier)
      const fontSize = (firstItem.rect.height || 8) * 0.9;

      const minX = Math.min(...lineToUse.items.map((i) => i.rect.x));
      const minY = Math.min(...lineToUse.items.map((i) => i.rect.y));
      const maxY = Math.max(
        ...lineToUse.items.map((i) => i.rect.y + i.rect.height),
      );
      // 1. Erase the whole line (narrower width to avoid Amount column)
      const eraseWidth = Math.min(460 - minX, 550 - minX);
      ops.push({
        pageIndex: firstItem.pageIndex,
        x: minX,
        y: minY,
        width: eraseWidth,
        height: maxY - minY,
        newText: "",
        fontSize,
        isErase: true,
        noPadding: true,
        align: "left",
      });

      // 2. Build new text with PO/W.O. at START of line + original service description
      let newLabel = "";

      // Place PO at the start (if not already handled)
      if (hasUnhandledPo && !targetPo.toLowerCase().includes("pending")) {
        newLabel += `PO# ${targetPo}`;
      }

      // Place W.O. on same line after PO (if not already handled)
      if (hasUnhandledWo) {
        if (newLabel) newLabel += "  "; // Consistent spacing between PO and W.O.
        newLabel += `W.O.# ${targetWo}`;
      }

      // Append original service description after PO/W.O. numbers
      const originalText = lineToUse.text.trim();
      if (newLabel && originalText) {
        newLabel += "  " + originalText; // Consistent spacing after PO/W.O.
      } else if (originalText) {
        newLabel = originalText;
      }

      ops.push({
        pageIndex: firstItem.pageIndex,
        x: minX,
        y: lineToUse.y,
        width: 0,
        height: fontSize,
        newText: newLabel,
        fontSize,
        isErase: false,
        align: "left",
        weight: "normal",
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
  const fontNormal = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  for (const op of ops) {
    const page = pages[op.pageIndex];
    if (!page) continue;

    if (op.isErase) {
      const padding = op.noPadding ? 0 : 1;
      page.drawRectangle({
        x: op.x - padding,
        y: op.y - padding,
        width: op.width + padding * 2,
        height: op.height + padding * 2,
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

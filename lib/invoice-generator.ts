import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";
import type { ParsedInvoice } from "@/types/invoice";
import { formatCurrency } from "@/lib/currency";

const C = {
  black: rgb(0, 0, 0),
  text: rgb(0.15, 0.15, 0.15),
  darkGray: rgb(0.22, 0.22, 0.22),
  midGray: rgb(0.45, 0.45, 0.45),
  lightRule: rgb(0.72, 0.86, 0.90),
  heavyRule: rgb(0.25, 0.25, 0.25),
  white: rgb(1, 1, 1),
  teal: rgb(0.74, 0.86, 0.90),
};

const PAGE_W = PageSizes.Letter[0]; // 612
const PAGE_H = PageSizes.Letter[1]; // 792

const MARGIN = 40;
const LEFT = MARGIN;
const RIGHT = PAGE_W - MARGIN;
const CONTENT_W = RIGHT - LEFT;

// Table columns
const COL_ACTIVITY = LEFT;
const COL_QTY = 420;
const COL_RATE = 470;
const COL_AMOUNT = RIGHT;

// Meta block
const META_RIGHT = RIGHT;
const META_LABEL_RIGHT = 505;

export async function generateInvoicePDF(
  invoice: ParsedInvoice,
  originalPdfBuffer?: Buffer
): Promise<Buffer> {
  // ── Overlay strategy for pixel-close fidelity when original PDF exists ──
  if (originalPdfBuffer) {
    try {
      const pdfDoc = await PDFDocument.load(originalPdfBuffer);
      const pages = pdfDoc.getPages();
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const drawOverlay = (
        metadata: any,
        newValue: string | number | null,
        isBold = false,
        alignRight = false
      ) => {
        if (!metadata || newValue === null || newValue === undefined) return;
        const page = pages[metadata.pageIndex];
        if (!page) return;

        const { width: pageWidth, height: pageHeight } = page.getSize();
        const { x, y, width, height } = metadata.rect;
        
        // Normalize Y coordinate if needed. 
        // pdfjs-dist often uses a y-from-bottom system matching pdf-lib,
        // but if there's a flip, we'd use pageHeight - y.
        // After auditing real samples, the direct y value from the transformation 
        // matrix usually works if we account for the baseline.
        const drawY = y; 

        const textValue =
          typeof newValue === "number" ? formatCurrency(newValue) : String(newValue);

        const font = isBold ? boldFont : regFont;
        // Font size heuristic: use 82% of the measured box height or fallback to 9.5
        const fontSize = height > 0 ? Math.max(7, height * 0.85) : 9.5;

        // Draw white background to hide old text
        // Increased padding to ensure full coverage of original anti-aliased text
        page.drawRectangle({
          x: x - 1,
          y: drawY - 1,
          width: width + 2,
          height: height + 2,
          color: rgb(1, 1, 1),
        });

        let drawX = x;
        if (alignRight) {
          const newWidth = font.widthOfTextAtSize(textValue, fontSize);
          drawX = x + width - newWidth;
        }

        page.drawText(textValue, {
          x: drawX,
          y: drawY,
          size: fontSize,
          font,
          color: C.black,
        });
      };

      drawOverlay(invoice.sourceMetadata?.invoiceNumber, invoice.invoiceNumber, true);
      drawOverlay(invoice.sourceMetadata?.invoiceDate, invoice.invoiceDate);
      drawOverlay(invoice.sourceMetadata?.dueDate, invoice.dueDate);
      drawOverlay(invoice.sourceMetadata?.balanceDue, invoice.balanceDue, true, true);
      drawOverlay(invoice.sourceMetadata?.subtotal, invoice.subtotal, false, true);
      drawOverlay(invoice.sourceMetadata?.taxAmount, invoice.taxAmount, false, true);
      drawOverlay(invoice.sourceMetadata?.creditAmount, invoice.creditAmount, false, true);
      drawOverlay(invoice.sourceMetadata?.totalAmount, invoice.totalAmount, true, true);

      invoice.lineItems.forEach((item) => {
        if (item.amountMetadata) {
          drawOverlay(item.amountMetadata, item.amount, false, true);
        }
      });

      if (invoice.sourceMetadata?.poPlaceholder) {
        // If we detected a PO placeholder and we have a replacement PO, draw it
        const replacementPo = invoice.lineItems.find(it => 
          it.description?.includes("PO#") || it.title?.includes("PO#")
        );
        
        if (replacementPo) {
          const poMatch = /PO#\s*([A-Za-z0-9\-\/\.]+)/.exec(replacementPo.description || "");
          if (poMatch) {
            drawOverlay(invoice.sourceMetadata.poPlaceholder, `PO# ${poMatch[1]}`, true);
          }
        }
      }

      return Buffer.from(await pdfDoc.save());
    } catch (err) {
      console.warn("Overlay failed, falling back to recreation:", err);
    }
  }

  // ── Full recreation ─────────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(PageSizes.Letter);

  const regFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const sansFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sansBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const textWidth = (text: string, font: any, size: number) =>
    font.widthOfTextAtSize(text, size);

  const drawText = (
    text: string,
    x: number,
    y: number,
    size: number,
    font: any = regFont,
    color = C.text
  ) => {
    if (!text) return;
    page.drawText(text, { x, y, size, font, color });
  };

  const drawRightText = (
    text: string,
    rightEdge: number,
    y: number,
    size: number,
    font: any = regFont,
    color = C.text
  ) => {
    if (!text) return;
    const w = textWidth(text, font, size);
    page.drawText(text, { x: rightEdge - w, y, size, font, color });
  };

  const drawRule = (
    y: number,
    x1 = LEFT,
    x2 = RIGHT,
    thickness = 0.6,
    color = C.lightRule
  ) => {
    page.drawLine({
      start: { x: x1, y },
      end: { x: x2, y },
      thickness,
      color,
    });
  };

  const wrapTextByWidth = (
    text: string,
    maxWidth: number,
    font: any,
    size: number
  ): string[] => {
    if (!text?.trim()) return [];
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(test, size);

      if (testWidth <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }

    if (current) lines.push(current);
    return lines;
  };

  const drawWrappedLines = (
    lines: string[],
    x: number,
    startY: number,
    size: number,
    font: any,
    color: any,
    lineHeight: number
  ) => {
    let y = startY;
    for (const line of lines) {
      drawText(line, x, y, size, font, color);
      y -= lineHeight;
    }
    return y;
  };

  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: rgb(1, 1, 1),
  });

  // ── 1. Header left ──────────────────────────────────────────────────────
  let y = 735;

  drawText(invoice.issuerName || "System4 S.N.E.", LEFT, y, 11, boldFont, C.black);
  y -= 18;

  const issuerLines = [
    ...(invoice.issuerAddressLines?.slice(0, 3) || [
      "60 Romano Vineyard Way, #101",
      "North Kingstown, RI 02852",
    ]),
  ];

  for (const line of issuerLines) {
    drawText(line, LEFT, y, 9.5, regFont, C.text);
    y -= 13;
  }

  drawText(
    invoice.issuerEmail || "billing@system4ips.com",
    LEFT,
    y,
    9.5,
    regFont,
    C.text
  );

  // ── 2. Simple logo-style header right ───────────────────────────────────
  // Replace this with a real embedded logo if you have it.
  page.drawLine({
    start: { x: 356, y: 724 },
    end: { x: 405, y: 736 },
    thickness: 7,
    color: rgb(0.23, 0.39, 0.66),
  });
  page.drawLine({
    start: { x: 366, y: 718 },
    end: { x: 416, y: 729 },
    thickness: 7,
    color: rgb(0.78, 0.22, 0.20),
  });
  drawText("System", 392, 723, 18, sansFont, rgb(0.20, 0.35, 0.65));
  drawText("4", 474, 727, 24, sansFont, rgb(0.82, 0.22, 0.18));
  drawText("Facility Services Management", 394, 710, 7.5, sansFont, C.midGray);
  page.drawLine({
    start: { x: 460, y: 705 },
    end: { x: 558, y: 700 },
    thickness: 1.2,
    color: rgb(0.82, 0.22, 0.18),
  });

  // ── 3. Invoice title ────────────────────────────────────────────────────
  drawText("INVOICE", LEFT, 655, 28, boldFont, C.black);

  // ── 4. Bill To block ────────────────────────────────────────────────────
  drawText("BILL TO", LEFT, 612, 10, boldFont, C.black);

  let billY = 596;
  if (invoice.billToName) {
    drawText(invoice.billToName, LEFT, billY, 10, regFont, C.text);
    billY -= 14;
  }

  const billLines = invoice.billToAddressLines?.slice(0, 4) || [];
  for (const line of billLines) {
    drawText(line, LEFT, billY, 10, regFont, C.text);
    billY -= 14;
  }

  // ── 5. Right meta block ─────────────────────────────────────────────────
  let metaY = 615;
  const metaRows: Array<[string, string | null | undefined]> = [
    ["CUSTOMER#", invoice.customerNumber],
    ["INVOICE#", invoice.invoiceNumber],
    ["DATE", invoice.invoiceDate],
    ["DUE DATE", invoice.dueDate],
  ];

  for (const [label, value] of metaRows) {
    if (!value) continue;
    drawRightText(label, META_LABEL_RIGHT, metaY, 10, boldFont, C.black);
    drawRightText(String(value), META_RIGHT, metaY, 10, regFont, C.text);
    metaY -= 20;
  }

  // ── 6. Thin rule under heading blocks ───────────────────────────────────
  drawRule(560, LEFT, RIGHT, 0.8, C.lightRule);

  // ── 7. Table header ─────────────────────────────────────────────────────
  const tableHeaderTop = 510;
  const headerH = 16;

  page.drawRectangle({
    x: LEFT,
    y: tableHeaderTop - 2,
    width: CONTENT_W,
    height: headerH,
    color: C.teal,
  });

  page.drawLine({
    start: { x: COL_QTY - 4, y: tableHeaderTop - 2 },
    end: { x: COL_QTY - 4, y: tableHeaderTop + headerH - 2 },
    thickness: 0.4,
    color: C.white,
  });

  page.drawLine({
    start: { x: COL_RATE - 4, y: tableHeaderTop - 2 },
    end: { x: COL_RATE - 4, y: tableHeaderTop + headerH - 2 },
    thickness: 0.4,
    color: C.white,
  });

  page.drawLine({
    start: { x: COL_AMOUNT - 54, y: tableHeaderTop - 2 },
    end: { x: COL_AMOUNT - 54, y: tableHeaderTop + headerH - 2 },
    thickness: 0.4,
    color: C.white,
  });

  drawText("SERVICE ACTIVITY", COL_ACTIVITY + 4, tableHeaderTop + 3, 8.7, boldFont, C.black);
  drawText("QTY", COL_QTY + 1, tableHeaderTop + 3, 8.7, boldFont, C.black);
  drawText("RATE", COL_RATE + 1, tableHeaderTop + 3, 8.7, boldFont, C.black);
  drawRightText("AMOUNT", COL_AMOUNT, tableHeaderTop + 3, 8.7, boldFont, C.black);

  // ── 8. Line items ───────────────────────────────────────────────────────
  let rowTopY = 474;
  const ACTIVITY_TEXT_X = COL_ACTIVITY + 60;
  const ACTIVITY_TEXT_W = COL_QTY - ACTIVITY_TEXT_X - 16;
  const lineHeight = 11;

  invoice.lineItems.forEach((item) => {
    if (rowTopY < 170) return;

    const isService = item.type === "service";
    const isCredit = item.type === "credit";
    const isTax = item.type === "tax";

    const rowLabel = isService ? "Services" : isCredit ? "Credit" : "Sales Tax";

    let activityBlock = "";

    if (isService) {
      const parts = [
        item.title?.trim(),
        item.description && item.description !== item.title
          ? item.description.trim()
          : "",
        item.serviceDateRange?.trim(),
      ].filter(Boolean);

      activityBlock = parts.join("\n");
    } else if (isTax) {
      activityBlock = item.description?.trim() || item.title?.trim() || "Sales Tax";
    } else if (isCredit) {
      activityBlock = item.description?.trim() || item.title?.trim() || "Credit";
    }

    const amountStr =
      item.amount !== null && item.amount !== undefined
        ? isCredit
          ? `( ${formatCurrency(Math.abs(item.amount))} )`
          : formatCurrency(item.amount)
        : "";

    const blockParts = activityBlock.split("\n").filter(Boolean);
    const wrappedLines: string[] = [];

    for (const part of blockParts) {
      const lines = wrapTextByWidth(part, ACTIVITY_TEXT_W, regFont, 8.8);
      wrappedLines.push(...lines);
    }

    const rowHeight = Math.max(28, 8 + wrappedLines.length * lineHeight + 7);

    drawText(rowLabel, COL_ACTIVITY + 2, rowTopY - 2, 10, boldFont, C.black);

    let textY = rowTopY + 10;
    for (const line of wrappedLines) {
      drawText(line, ACTIVITY_TEXT_X, textY, 8.8, regFont, C.darkGray);
      textY -= lineHeight;
    }

    if (amountStr) {
      drawRightText(amountStr, COL_AMOUNT, rowTopY - 1, 10, regFont, C.text);
    }

    rowTopY -= rowHeight;
  });

  // ── 9. Heavy rule below line items ──────────────────────────────────────
  const dividerY = rowTopY - 4;
  page.drawLine({
    start: { x: LEFT, y: dividerY },
    end: { x: RIGHT, y: dividerY },
    thickness: 1.2,
    color: C.heavyRule,
  });

  // ── 10. Bottom blocks ───────────────────────────────────────────────────
  const bottomTopY = dividerY - 26;

  // Service Address
  drawText("SERVICE ADDRESS", LEFT, bottomTopY, 10, boldFont, C.black);

  let serviceY = bottomTopY - 16;
  if (invoice.billToName) {
    drawText(invoice.billToName, LEFT, serviceY, 10, regFont, C.text);
    serviceY -= 14;
  }

  const serviceLines =
    invoice.serviceAddressLines?.length
      ? invoice.serviceAddressLines.slice(0, 4)
      : invoice.billToAddressLines?.slice(0, 4) || [];

  for (const line of serviceLines) {
    drawText(line, LEFT, serviceY, 10, regFont, C.text);
    serviceY -= 14;
  }

  // Credit optional
  let rightInfoY = bottomTopY - 2;
  if (invoice.creditAmount !== null && invoice.creditAmount !== undefined) {
    drawText("CREDIT", 305, rightInfoY + 22, 10, boldFont, C.black);
    drawRightText(
      `( ${formatCurrency(Math.abs(invoice.creditAmount))} )`,
      COL_AMOUNT,
      rightInfoY + 22,
      10,
      regFont,
      C.text
    );
  }

  const balanceDue =
    invoice.balanceDue !== null && invoice.balanceDue !== undefined
      ? invoice.balanceDue
      : invoice.totalAmount;

  if (balanceDue !== null && balanceDue !== undefined) {
    drawText("BALANCE DUE", 305, rightInfoY, 10, boldFont, C.black);
    drawRightText(formatCurrency(balanceDue), COL_AMOUNT, rightInfoY - 4, 17, boldFont, C.black);
  }

  // Remit To
  const remitTopY = Math.min(serviceY, rightInfoY - 40);
  drawText("REMIT TO", LEFT, remitTopY, 10, boldFont, C.black);

  let remitY = remitTopY - 16;
  const remitLines =
    invoice.remitToLines?.length
      ? invoice.remitToLines.slice(0, 6)
      : [
          "System4 S.N.E.",
          "60 Romano Vineyard Way, #101",
          "North Kingstown, RI 02852",
          "Attn: billing@system4ips.com",
          "Phone: (401) 615-7043",
        ];

  for (const line of remitLines) {
    drawText(line, LEFT, remitY, 10, regFont, C.text);
    remitY -= 14;
  }

  return Buffer.from(await pdfDoc.save());
}
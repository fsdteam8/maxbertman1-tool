/**
 * Invoice PDF generator — builds a professional invoice PDF using pdf-lib.
 *
 * Strategy: recreate the invoice in a clean template rather than mutating
 * the original PDF layout, ensuring stable output regardless of source format.
 */

import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";
import type { ParsedInvoice } from "@/types/invoice";
import { formatCurrency } from "@/lib/currency";

const COLORS = {
  navy: rgb(0.09, 0.13, 0.25),
  blue: rgb(0.24, 0.49, 0.92),
  lightBlue: rgb(0.9, 0.94, 1.0),
  darkGray: rgb(0.25, 0.28, 0.32),
  midGray: rgb(0.55, 0.58, 0.62),
  lightGray: rgb(0.95, 0.96, 0.97),
  white: rgb(1, 1, 1),
  black: rgb(0, 0, 0),
  green: rgb(0.1, 0.6, 0.3),
};

const MARGIN = 50;
const PAGE_WIDTH = PageSizes.Letter[0]; // 612
const PAGE_HEIGHT = PageSizes.Letter[1]; // 792
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export async function generateInvoicePDF(invoice: ParsedInvoice): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(PageSizes.Letter);

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let y = PAGE_HEIGHT - MARGIN;

  // ─── Header Banner ───────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 90,
    width: PAGE_WIDTH,
    height: 90,
    color: COLORS.navy,
  });

  // Company name
  page.drawText(invoice.issuerName ?? "Company Name", {
    x: MARGIN,
    y: PAGE_HEIGHT - 45,
    size: 18,
    font: boldFont,
    color: COLORS.white,
  });

  // Invoice label (top right)
  page.drawText("INVOICE", {
    x: PAGE_WIDTH - MARGIN - 80,
    y: PAGE_HEIGHT - 40,
    size: 22,
    font: boldFont,
    color: COLORS.blue,
  });

  y = PAGE_HEIGHT - 110;

  // ─── Blue accent line ─────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: y,
    width: PAGE_WIDTH,
    height: 4,
    color: COLORS.blue,
  });
  y -= 20;

  // ─── Invoice Meta Row ─────────────────────────────────────────────────
  const metaFields = [
    { label: "Invoice #", value: invoice.invoiceNumber ?? "—" },
    { label: "Customer #", value: invoice.customerNumber ?? "—" },
    { label: "Date", value: invoice.invoiceDate ?? "—" },
    { label: "Due Date", value: invoice.dueDate ?? "—" },
  ];

  const colWidth = CONTENT_WIDTH / metaFields.length;
  metaFields.forEach((field, i) => {
    const x = MARGIN + i * colWidth;
    page.drawText(field.label, {
      x,
      y,
      size: 7,
      font: regularFont,
      color: COLORS.midGray,
    });
    page.drawText(field.value, {
      x,
      y: y - 13,
      size: 9,
      font: boldFont,
      color: COLORS.darkGray,
    });
  });
  y -= 40;

  // ─── Balance Due Highlight ────────────────────────────────────────────
  const balanceDue = invoice.balanceDue ?? invoice.totalAmount;
  if (balanceDue !== null) {
    page.drawRectangle({
      x: PAGE_WIDTH - MARGIN - 160,
      y: y - 5,
      width: 160,
      height: 32,
      color: COLORS.blue,
    });
    page.drawText("Balance Due", {
      x: PAGE_WIDTH - MARGIN - 150,
      y: y + 13,
      size: 7,
      font: regularFont,
      color: COLORS.lightBlue,
    });
    page.drawText(formatCurrency(balanceDue), {
      x: PAGE_WIDTH - MARGIN - 150,
      y: y + 1,
      size: 14,
      font: boldFont,
      color: COLORS.white,
    });
  }

  // Separator
  page.drawLine({
    start: { x: MARGIN, y: y - 12 },
    end: { x: PAGE_WIDTH - MARGIN, y: y - 12 },
    thickness: 0.5,
    color: COLORS.lightGray,
  });
  y -= 28;

  // ─── Bill To / Issuer Columns ─────────────────────────────────────────
  const halfW = CONTENT_WIDTH / 2 - 10;

  // Issuer
  const drawAddressBlock = (
    title: string,
    name: string | null,
    lines: string[],
    xOffset: number
  ) => {
    page.drawText(title, {
      x: MARGIN + xOffset,
      y,
      size: 7,
      font: boldFont,
      color: COLORS.blue,
    });
    let lineY = y - 14;
    if (name) {
      page.drawText(name, {
        x: MARGIN + xOffset,
        y: lineY,
        size: 9,
        font: boldFont,
        color: COLORS.darkGray,
      });
      lineY -= 12;
    }
    lines.slice(0, 4).forEach((line) => {
      page.drawText(line, {
        x: MARGIN + xOffset,
        y: lineY,
        size: 8,
        font: regularFont,
        color: COLORS.darkGray,
      });
      lineY -= 11;
    });
  };

  drawAddressBlock(
    "FROM",
    invoice.issuerName,
    [
      ...invoice.issuerAddressLines,
      invoice.issuerEmail ? `Email: ${invoice.issuerEmail}` : "",
    ].filter(Boolean),
    0
  );

  drawAddressBlock(
    "BILL TO",
    invoice.billToName,
    invoice.billToAddressLines,
    halfW + 10
  );

  y -= 80;

  // ─── Service Address ──────────────────────────────────────────────────
  if (invoice.serviceAddressLines.length > 0) {
    page.drawText("SERVICE ADDRESS", {
      x: MARGIN,
      y,
      size: 7,
      font: boldFont,
      color: COLORS.blue,
    });
    y -= 12;
    invoice.serviceAddressLines.slice(0, 3).forEach((line) => {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 8,
        font: regularFont,
        color: COLORS.darkGray,
      });
      y -= 11;
    });
    y -= 6;
  }

  // ─── Line Items Table ─────────────────────────────────────────────────
  y -= 8;

  // Table header
  page.drawRectangle({
    x: MARGIN,
    y: y - 2,
    width: CONTENT_WIDTH,
    height: 20,
    color: COLORS.navy,
  });
  page.drawText("DESCRIPTION", {
    x: MARGIN + 8,
    y: y + 4,
    size: 7,
    font: boldFont,
    color: COLORS.white,
  });
  page.drawText("AMOUNT", {
    x: PAGE_WIDTH - MARGIN - 60,
    y: y + 4,
    size: 7,
    font: boldFont,
    color: COLORS.white,
  });
  y -= 22;

  // Rows
  invoice.lineItems.forEach((item, idx) => {
    if (y < 120) return; // avoid overflow

    const isShaded = idx % 2 === 0;
    const rowHeight = item.description.length > 80 ? 36 : 22;

    if (isShaded) {
      page.drawRectangle({
        x: MARGIN,
        y: y - rowHeight + 14,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: COLORS.lightGray,
      });
    }

    // Title
    page.drawText(item.title.slice(0, 70), {
      x: MARGIN + 8,
      y: y + 2,
      size: 8,
      font: boldFont,
      color: COLORS.darkGray,
    });

    // Description (truncated if long)
    if (item.description && item.description !== item.title) {
      page.drawText(item.description.slice(0, 90), {
        x: MARGIN + 8,
        y: y - 9,
        size: 7,
        font: italicFont,
        color: COLORS.midGray,
      });
    }

    if (item.serviceDateRange) {
      page.drawText(item.serviceDateRange, {
        x: MARGIN + 8,
        y: y - 20,
        size: 6,
        font: regularFont,
        color: COLORS.midGray,
      });
    }

    // Amount
    if (item.amount !== null) {
      const amtText = formatCurrency(item.amount);
      const isCredit = item.type === "credit";
      page.drawText(isCredit ? `(${amtText})` : amtText, {
        x: PAGE_WIDTH - MARGIN - 60,
        y: y + 2,
        size: 9,
        font: boldFont,
        color: isCredit ? COLORS.blue : COLORS.darkGray,
      });
    }

    y -= rowHeight;
  });

  // ─── Totals Block ─────────────────────────────────────────────────────
  y -= 8;
  page.drawLine({
    start: { x: PAGE_WIDTH - MARGIN - 150, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: COLORS.lightGray,
  });
  y -= 4;

  const drawTotal = (label: string, value: number | null, isBold = false) => {
    if (value === null) return;
    page.drawText(label, {
      x: PAGE_WIDTH - MARGIN - 140,
      y,
      size: 8,
      font: isBold ? boldFont : regularFont,
      color: isBold ? COLORS.darkGray : COLORS.midGray,
    });
    page.drawText(formatCurrency(value), {
      x: PAGE_WIDTH - MARGIN - 60,
      y,
      size: isBold ? 10 : 8,
      font: isBold ? boldFont : regularFont,
      color: isBold ? COLORS.navy : COLORS.darkGray,
    });
    y -= 14;
  };

  if (invoice.subtotal !== null) drawTotal("Subtotal", invoice.subtotal);
  if (invoice.taxAmount !== null) drawTotal("Sales Tax", invoice.taxAmount);
  if (invoice.creditAmount !== null) drawTotal("Credit", invoice.creditAmount);

  const total = invoice.balanceDue ?? invoice.totalAmount;
  if (total !== null) {
    // Balance Due box
    page.drawRectangle({
      x: PAGE_WIDTH - MARGIN - 145,
      y: y - 4,
      width: 145,
      height: 22,
      color: COLORS.navy,
    });
    page.drawText("BALANCE DUE", {
      x: PAGE_WIDTH - MARGIN - 135,
      y: y + 5,
      size: 7,
      font: boldFont,
      color: COLORS.lightBlue,
    });
    page.drawText(formatCurrency(total), {
      x: PAGE_WIDTH - MARGIN - 60,
      y: y + 5,
      size: 10,
      font: boldFont,
      color: COLORS.white,
    });
    y -= 30;
  }

  // ─── Remit To ─────────────────────────────────────────────────────────
  if (invoice.remitToLines.length > 0) {
    y -= 10;
    page.drawText("REMIT TO", {
      x: MARGIN,
      y,
      size: 7,
      font: boldFont,
      color: COLORS.blue,
    });
    y -= 12;
    invoice.remitToLines.slice(0, 4).forEach((line) => {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 8,
        font: regularFont,
        color: COLORS.darkGray,
      });
      y -= 11;
    });
  }

  // ─── Footer ───────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: 0, y: 40 },
    end: { x: PAGE_WIDTH, y: 40 },
    thickness: 1,
    color: COLORS.blue,
  });
  page.drawText("Generated by Invoice Automation Tool", {
    x: MARGIN,
    y: 25,
    size: 7,
    font: italicFont,
    color: COLORS.midGray,
  });
  page.drawText(new Date().toLocaleDateString("en-US"), {
    x: PAGE_WIDTH - MARGIN - 80,
    y: 25,
    size: 7,
    font: regularFont,
    color: COLORS.midGray,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

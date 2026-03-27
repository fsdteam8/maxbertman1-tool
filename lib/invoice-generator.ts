import {
  PDFDocument,
  rgb,
  StandardFonts,
  PageSizes,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import type { ParsedInvoice } from "@/types/invoice";
import { formatCurrency } from "@/lib/currency";

// ==============================
// 🔥 FULL PIXEL-PERFECT INVOICE GENERATOR
// ==============================

// ─── Grid & snap helpers ─────────────────────────
const GRID = { rowSnap: 2, baselineAdjust: 1.5, dividerNudge: 0.5 };
function snapY(y: number) {
  return Math.round(y / GRID.rowSnap) * GRID.rowSnap;
}

// ─── Colors ─────────────────────────────────────
const C = {
  black: rgb(0, 0, 0),
  text: rgb(0.15, 0.15, 0.15),
  darkGray: rgb(0.22, 0.22, 0.22),
  midGray: rgb(0.45, 0.45, 0.45),
  lightRule: rgb(0.72, 0.86, 0.9),
  heavyRule: rgb(0.25, 0.25, 0.25),
  white: rgb(1, 1, 1),
  teal: rgb(0.74, 0.86, 0.9),
  blue: rgb(0.23, 0.39, 0.66),
  red: rgb(0.82, 0.22, 0.18),
};

function formatServiceLines(invoice: ParsedInvoice) {
  return invoice.serviceAddressLines?.length
    ? invoice.serviceAddressLines
    : (invoice.billToAddressLines ?? []);
}

function formatRemitLines(invoice: ParsedInvoice) {
  return invoice.remitToLines?.length
    ? invoice.remitToLines
    : [
        "System4 S.N.E.",
        "60 Romano Vineyard Way, #101",
        "North Kingstown, RI 02852",
        "Attn: billing@system4ips.com",
        "Phone: (401) 615-7043",
      ];
}

// ─── Measure Row Height ────────────────────────
function getRowHeight(text: string, font: PDFFont) {
  const lines = wrapText(text, 260, font, 9);
  return Math.max(18, lines.length * 10.5 + 8);
}

// ─── Page geometry ─────────────────────────────────────────────────────────
const PAGE_W = PageSizes.Letter[0]; // 612 pt
const PAGE_H = PageSizes.Letter[1]; // 792 pt
const MARGIN = 40;
const LEFT = MARGIN;
const RIGHT = PAGE_W - MARGIN;
const CONTENT_W = RIGHT - LEFT;

// ─── Table column X positions ──────────────────────────────────────────────
const COL_ACTIVITY = LEFT;
const COL_QTY = 420;
const COL_RATE = 470;
const COL_AMOUNT = RIGHT;

// Activity text begins after the row-type label gutter
const ACTIVITY_LABEL_GUTTER = 60;
const ACTIVITY_TEXT_X = COL_ACTIVITY + ACTIVITY_LABEL_GUTTER;
const ACTIVITY_TEXT_W = COL_QTY - ACTIVITY_TEXT_X - 12;

// ─── Meta block positions (top-right) ──────────────────────────────────────
const META_LABEL_RIGHT = 505;
const META_VALUE_RIGHT = RIGHT;

// ─── Footer safe-area ──────────────────────────────────────────────────────
// Minimum vertical space reserved for the footer block below the table.
// Accounts for: SERVICE ADDRESS (up to 4 lines) + REMIT TO (up to 5 lines) +
// totals rows (CREDIT + BALANCE DUE).
const FOOTER_RESERVED_H = 220;
const MIN_TABLE_END_Y = FOOTER_RESERVED_H + 20; // table rows must stop above this

// ─── Shared font sizes ─────────────────────────────────────────────────────
const FS = {
  body: 10,
  bodySmall: 9,
  tableCell: 8.8,
  headerLabel: 8.7,
  sectionHead: 10,
  metaLabel: 10,
  rowLabel: 10,
  balanceDue: 17,
  issuerName: 11,
  invoiceTitle: 28,
  logoSystem: 18,
  logoFour: 24,
  logoTag: 7.5,
} as const;

// ─── Row spacing constants ─────────────────────────────────────────────────
const LINE_H = 11; // line-height within a wrapped activity block
const ROW_V_PAD = 8; // top/bottom padding inside a table row
const OVERLAY_ROW_H = 16; // fixed height for each inserted overlay row
const META_STEP = 20; // vertical step between meta label rows
const ADDR_STEP = 14; // vertical step between address lines

// ─── Types ─────────────────────────────────────────────────────────────────
type Color = ReturnType<typeof rgb>;
type Drawer = {
  text(
    v: string,
    x: number,
    y: number,
    size: number,
    font?: PDFFont,
    color?: Color,
  ): void;
  rightText(
    v: string,
    rightEdge: number,
    y: number,
    size: number,
    font?: PDFFont,
    color?: Color,
  ): void;
  rule(
    y: number,
    x1?: number,
    x2?: number,
    thickness?: number,
    color?: Color,
  ): void;
};

// ─── Drawer factory ────────────────────────────────────────────────────────
function makeDrawer(page: PDFPage, defaultFont: PDFFont): Drawer {
  return {
    text(v, x, y, size, font = defaultFont, color = C.text) {
      if (!v) return;
      page.drawText(v, { x, y, size, font, color });
    },
    rightText(v, rightEdge, y, size, font = defaultFont, color = C.text) {
      if (!v) return;
      page.drawText(v, {
        x: rightEdge - font.widthOfTextAtSize(v, size),
        y,
        size,
        font,
        color,
      });
    },
    rule(y, x1 = LEFT, x2 = RIGHT, thickness = 0.6, color = C.lightRule) {
      page.drawLine({
        start: { x: x1, y },
        end: { x: x2, y },
        thickness,
        color,
      });
    },
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────
const isPresent = <T>(v: T | null | undefined): v is T =>
  v !== null && v !== undefined;

function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  size: number,
): string[] {
  if (!text?.trim()) return [];
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function getServiceLines(invoice: ParsedInvoice): string[] {
  return (
    invoice.serviceAddressLines?.length
      ? invoice.serviceAddressLines
      : (invoice.billToAddressLines ?? [])
  ).slice(0, 4);
}

function getRemitLines(invoice: ParsedInvoice): string[] {
  return (
    invoice.remitToLines?.length
      ? invoice.remitToLines
      : [
          "System4 S.N.E.",
          "60 Romano Vineyard Way, #101",
          "North Kingstown, RI 02852",
          "Attn: billing@system4ips.com",
          "Phone: (401) 615-7043",
        ]
  ).slice(0, 6);
}

function findReplacementPO(invoice: ParsedInvoice): string | null {
  for (const item of invoice.lineItems) {
    const m = /PO#\s*([A-Za-z0-9\-/.]+)/.exec(
      item.description || item.title || "",
    );
    if (m) return `PO# ${m[1]}`;
  }
  return null;
}

function getOrderedOverlayItems(invoice: ParsedInvoice) {
  const order: Record<string, number> = {
    service: 1,
    tax: 2,
    credit: 3,
  };

  return invoice.lineItems
    .filter((it) => !it.amountMetadata)
    .sort((a, b) => {
      const aOrder = order[a.type || "service"] ?? 99;
      const bOrder = order[b.type || "service"] ?? 99;
      return aOrder - bOrder;
    });
}

// ─── Overlay value helper ──────────────────────────────────────────────────
function drawOverlayValue(
  pages: PDFPage[],
  regFont: PDFFont,
  boldFont: PDFFont,
  metadata: any,
  newValue: string | number | null | undefined,
  options?: { isBold?: boolean; alignRight?: boolean },
): void {
  if (!metadata || !isPresent(newValue)) return;
  const page = pages[metadata.pageIndex];
  if (!page) return;

  const { x, y, width, height } = metadata.rect;
  const text =
    typeof newValue === "number" ? formatCurrency(newValue) : String(newValue);
  const font = options?.isBold ? boldFont : regFont;
  const fontSize = height > 0 ? Math.max(7, height * 0.85) : 9.5;

  page.drawRectangle({
    x: x - 3,
    y: y - 3,
    width: width + 6,
    height: height + 6,
    color: C.white,
  });

  const drawX = options?.alignRight
    ? x + width - font.widthOfTextAtSize(text, fontSize)
    : x;

  page.drawText(text, { x: drawX, y, size: fontSize, font, color: C.black });
}

// ─── Footer block ──────────────────────────────────────────────────────────
function drawFooterBlocks(
  page: PDFPage,
  invoice: ParsedInvoice,
  regFont: PDFFont,
  boldFont: PDFFont,
  amountRight: number,
  dividerY: number,
): void {
  const d = makeDrawer(page, regFont);

  const LEFT_COL_X = LEFT;
  const RIGHT_LABEL_X = 330;
  const TOP_Y = dividerY - 28;
  const SECTION_GAP = 18;
  const ROW_GAP = 20;

  d.text(
    "SERVICE ADDRESS",
    LEFT_COL_X,
    TOP_Y,
    FS.sectionHead,
    boldFont,
    C.black,
  );

  let serviceY = TOP_Y - 18;

  if (invoice.billToName) {
    d.text(invoice.billToName, LEFT_COL_X, serviceY, FS.body, regFont, C.text);
    serviceY -= ADDR_STEP;
  }

  for (const line of getServiceLines(invoice)) {
    d.text(line, LEFT_COL_X, serviceY, FS.body, regFont, C.text);
    serviceY -= ADDR_STEP;
  }

  let totalsY = TOP_Y;

  if (isPresent(invoice.creditAmount) && Math.abs(invoice.creditAmount) > 0) {
    d.text("CREDIT", RIGHT_LABEL_X, totalsY, FS.sectionHead, boldFont, C.black);
    d.rightText(
      `( ${formatCurrency(Math.abs(invoice.creditAmount))} )`,
      amountRight,
      totalsY,
      FS.sectionHead,
      regFont,
      C.text,
    );
    totalsY -= ROW_GAP;
  }

  const balanceDue = isPresent(invoice.balanceDue)
    ? invoice.balanceDue
    : invoice.totalAmount;

  d.text(
    "BALANCE DUE",
    RIGHT_LABEL_X,
    totalsY,
    FS.sectionHead,
    boldFont,
    C.black,
  );
  d.rightText(
    formatCurrency(balanceDue || 0),
    amountRight,
    totalsY,
    FS.balanceDue,
    boldFont,
    C.black,
  );
  totalsY -= FS.balanceDue + 10;

  const remitTopY = Math.min(serviceY, totalsY) - SECTION_GAP;

  d.text("REMIT TO", LEFT_COL_X, remitTopY, FS.sectionHead, boldFont, C.black);

  let remitY = remitTopY - 18;
  for (const line of getRemitLines(invoice)) {
    d.text(line, LEFT_COL_X, remitY, FS.body, regFont, C.text);
    remitY -= ADDR_STEP;
  }
}

// ─── Inserted overlay rows — pure measurement ─────────────────────────────
function measureInsertedRowsEndY(
  invoice: ParsedInvoice,
  startY: number,
): number {
  const count = getOrderedOverlayItems(invoice).length;
  return startY - count * OVERLAY_ROW_H;
}

// ─── Inserted overlay rows — draw pass ────────────────────────────────────
function drawInsertedOverlayRows(
  page: PDFPage,
  invoice: ParsedInvoice,
  regFont: PDFFont,
  boldFont: PDFFont,
  startY: number,
  amountRight: number,
): number {
  const newItems = getOrderedOverlayItems(invoice);
  if (!newItems.length) return startY;

  const d = makeDrawer(page, regFont);
  const LABEL_X = 42;
  const DESC_X = 100;
  const DESC_MAX_WIDTH = 220;

  let y = startY;

  for (const item of newItems) {
    const label =
      item.type === "tax"
        ? "Sales Tax"
        : item.type === "credit"
          ? "Credit"
          : "Services";

    const desc =
      item.type === "service"
        ? [
            item.title?.trim(),
            item.description && item.description !== item.title
              ? item.description.trim()
              : "",
            item.serviceDateRange?.trim(),
          ]
            .filter(Boolean)
            .join(" ")
        : item.description?.trim() || item.title?.trim() || "";

    const amount =
      item.type === "credit"
        ? `( ${formatCurrency(Math.abs(item.amount || 0))} )`
        : formatCurrency(item.amount || 0);

    const rowY = y - 2;

    d.text(label, LABEL_X, rowY, FS.body, boldFont, C.black);

    if (desc) {
      const wrapped = wrapText(desc, DESC_MAX_WIDTH, regFont, FS.bodySmall);
      if (wrapped[0]) {
        d.text(wrapped[0], DESC_X, rowY, FS.bodySmall, regFont, C.text);
      }
    }

    d.rightText(amount, amountRight, rowY, FS.bodySmall + 0.5, regFont, C.text);

    y -= OVERLAY_ROW_H;
  }

  return y;
}

// ─── PDF overlay (edit existing PDF) ──────────────────────────────────────
async function tryOverlayPdf(
  invoice: ParsedInvoice,
  originalPdfBuffer: Buffer,
): Promise<Buffer | null> {
  try {
    const pdfDoc = await PDFDocument.load(originalPdfBuffer);
    const pages = pdfDoc.getPages();
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const scalars: Array<
      [
        any,
        string | number | null | undefined,
        { isBold?: boolean; alignRight?: boolean }?,
      ]
    > = [
      [
        invoice.sourceMetadata?.invoiceNumber,
        invoice.invoiceNumber,
        { isBold: true },
      ],
      [invoice.sourceMetadata?.invoiceDate, invoice.invoiceDate],
      [invoice.sourceMetadata?.dueDate, invoice.dueDate],
      [
        invoice.sourceMetadata?.balanceDue,
        invoice.balanceDue,
        { isBold: true, alignRight: true },
      ],
    ];

    for (const [meta, val, opts] of scalars) {
      drawOverlayValue(pages, regFont, boldFont, meta, val, opts);
    }

    const existingItems = invoice.lineItems
      .filter((it) => it.amountMetadata)
      .sort((a, b) => {
        const pi = a.amountMetadata!.pageIndex - b.amountMetadata!.pageIndex;
        return pi !== 0
          ? pi
          : b.amountMetadata!.rect.y - a.amountMetadata!.rect.y;
      });

    for (const item of existingItems) {
      drawOverlayValue(
        pages,
        regFont,
        boldFont,
        item.amountMetadata,
        item.amount,
        { alignRight: true },
      );
    }

    const lastItem = existingItems[existingItems.length - 1];
    if (lastItem?.amountMetadata) {
      const page = pages[lastItem.amountMetadata.pageIndex];
      const amountRect = lastItem.amountMetadata.rect;
      const amountRight = amountRect.x + amountRect.width;

      const insertStartY = amountRect.y - 22;
      const insertedEndY = measureInsertedRowsEndY(invoice, insertStartY);
      const dividerY = insertedEndY - 6;

      page.drawRectangle({
        x: LEFT - 8,
        y: 0,
        width: CONTENT_W + 16,
        height: insertStartY + 16,
        color: C.white,
      });

      drawInsertedOverlayRows(
        page,
        invoice,
        regFont,
        boldFont,
        insertStartY,
        amountRight,
      );

      page.drawLine({
        start: { x: LEFT, y: dividerY },
        end: { x: RIGHT, y: dividerY },
        thickness: 1.2,
        color: C.heavyRule,
      });

      drawFooterBlocks(page, invoice, regFont, boldFont, amountRight, dividerY);
    }

    if (
      invoice.sourceMetadata?.poPlaceholder &&
      !invoice.poPlaceholderDetected
    ) {
      const replacement = findReplacementPO(invoice);
      if (replacement) {
        drawOverlayValue(
          pages,
          regFont,
          boldFont,
          invoice.sourceMetadata.poPlaceholder,
          replacement,
          { isBold: true },
        );
      }
    }

    return Buffer.from(await pdfDoc.save());
  } catch (err) {
    console.warn("Overlay failed, falling back to full recreation:", err);
    return null;
  }
}

// ─── Full PDF generation ───────────────────────────────────────────────────
export async function generateInvoicePDF(
  invoice: ParsedInvoice,
  originalPdfBuffer?: Buffer,
): Promise<Buffer> {
  if (originalPdfBuffer) {
    const overlaid = await tryOverlayPdf(invoice, originalPdfBuffer);
    if (overlaid) return overlaid;
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(PageSizes.Letter);
  const regFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const sansFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const d = makeDrawer(page, regFont);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: C.white,
  });

  let y = 735;
  d.text(
    invoice.issuerName || "System4 S.N.E.",
    LEFT,
    y,
    FS.issuerName,
    boldFont,
    C.black,
  );
  y -= 18;

  const issuerLines = invoice.issuerAddressLines?.slice(0, 3) ?? [
    "60 Romano Vineyard Way, #101",
    "North Kingstown, RI 02852",
  ];
  for (const line of issuerLines) {
    d.text(line, LEFT, y, 9.5, regFont, C.text);
    y -= 13;
  }
  d.text(
    invoice.issuerEmail || "billing@system4ips.com",
    LEFT,
    y,
    9.5,
    regFont,
    C.text,
  );

  page.drawLine({
    start: { x: 356, y: 724 },
    end: { x: 405, y: 736 },
    thickness: 7,
    color: C.blue,
  });
  d.text("System", 392, 723, FS.logoSystem, sansFont, C.blue);
  d.text("4", 474, 727, FS.logoFour, sansFont, C.red);
  d.text(
    "Facility Services Management",
    394,
    710,
    FS.logoTag,
    sansFont,
    C.midGray,
  );
  page.drawLine({
    start: { x: 460, y: 705 },
    end: { x: 558, y: 700 },
    thickness: 1.2,
    color: C.red,
  });

  d.text("INVOICE", LEFT, 655, FS.invoiceTitle, boldFont, C.black);

  d.text("BILL TO", LEFT, 612, FS.sectionHead, boldFont, C.black);
  let billY = 596;
  if (invoice.billToName) {
    d.text(invoice.billToName, LEFT, billY, FS.body, regFont, C.text);
    billY -= ADDR_STEP;
  }
  for (const line of invoice.billToAddressLines?.slice(0, 4) ?? []) {
    d.text(line, LEFT, billY, FS.body, regFont, C.text);
    billY -= ADDR_STEP;
  }

  let metaY = 615;
  const metaRows: [string, string | null | undefined][] = [
    ["CUSTOMER#", invoice.customerNumber],
    ["INVOICE#", invoice.invoiceNumber],
    ["DATE", invoice.invoiceDate],
    ["DUE DATE", invoice.dueDate],
  ];
  for (const [label, value] of metaRows) {
    if (!value) continue;
    d.rightText(
      label,
      META_LABEL_RIGHT,
      metaY,
      FS.metaLabel,
      boldFont,
      C.black,
    );
    d.rightText(
      String(value),
      META_VALUE_RIGHT,
      metaY,
      FS.metaLabel,
      regFont,
      C.text,
    );
    metaY -= META_STEP;
  }

  d.rule(560, LEFT, RIGHT, 0.8, C.lightRule);

  const TABLE_HEADER_TOP = 510;
  const HEADER_BAND_H = 16;

  page.drawRectangle({
    x: LEFT,
    y: TABLE_HEADER_TOP - 2,
    width: CONTENT_W,
    height: HEADER_BAND_H,
    color: C.teal,
  });
  for (const sepX of [COL_QTY - 4, COL_RATE - 4, COL_AMOUNT - 54]) {
    page.drawLine({
      start: { x: sepX, y: TABLE_HEADER_TOP - 2 },
      end: { x: sepX, y: TABLE_HEADER_TOP + HEADER_BAND_H - 2 },
      thickness: 0.4,
      color: C.white,
    });
  }
  const HEADER_TEXT_Y = TABLE_HEADER_TOP + 3;
  d.text(
    "SERVICE ACTIVITY",
    COL_ACTIVITY + 4,
    HEADER_TEXT_Y,
    FS.headerLabel,
    boldFont,
    C.black,
  );
  d.text("QTY", COL_QTY + 1, HEADER_TEXT_Y, FS.headerLabel, boldFont, C.black);
  d.text(
    "RATE",
    COL_RATE + 1,
    HEADER_TEXT_Y,
    FS.headerLabel,
    boldFont,
    C.black,
  );
  d.rightText(
    "AMOUNT",
    COL_AMOUNT,
    HEADER_TEXT_Y,
    FS.headerLabel,
    boldFont,
    C.black,
  );

  let rowTopY = 474;

  for (const item of invoice.lineItems) {
    if (item.type === "tax") continue;

    const isCredit = item.type === "credit";
    const rowLabel = isCredit ? "Credit" : item.title?.trim() ? "Services" : "";

    const activityText =
      item.type === "service"
        ? [
            item.title?.trim(),
            item.description && item.description !== item.title
              ? item.description.trim()
              : "",
            item.serviceDateRange?.trim(),
          ]
            .filter(Boolean)
            .join("\n")
        : item.description?.trim() || item.title?.trim() || rowLabel;

    const wrappedLines = activityText
      .split("\n")
      .filter(Boolean)
      .flatMap((part) =>
        wrapText(part, ACTIVITY_TEXT_W, regFont, FS.tableCell),
      );

    const rowHeight = Math.max(
      28,
      ROW_V_PAD + wrappedLines.length * LINE_H + 7,
    );

    if (rowTopY - rowHeight < MIN_TABLE_END_Y) break;

    d.text(
      rowLabel,
      COL_ACTIVITY + 2,
      rowTopY - 2,
      FS.rowLabel,
      boldFont,
      C.black,
    );

    let textY = rowTopY + 10;
    for (const line of wrappedLines) {
      d.text(line, ACTIVITY_TEXT_X, textY, FS.tableCell, regFont, C.darkGray);
      textY -= LINE_H;
    }

    if (isPresent(item.amount)) {
      const amountStr = isCredit
        ? `( ${formatCurrency(Math.abs(item.amount))} )`
        : formatCurrency(item.amount);
      d.rightText(
        amountStr,
        COL_AMOUNT,
        rowTopY - 1,
        FS.rowLabel,
        regFont,
        C.text,
      );
    }

    rowTopY -= rowHeight;
  }

  const taxItems = invoice.lineItems.filter((it) => it.type === "tax");
  const taxTotal =
    invoice.taxAmount ??
    taxItems.reduce((sum, it) => sum + (it.amount ?? 0), 0) ??
    0;

  const TAX_ROW_H = 24;

  if (rowTopY - TAX_ROW_H >= MIN_TABLE_END_Y) {
    d.rule(rowTopY + 6, LEFT, RIGHT, 0.4, C.lightRule);

    const taxY = rowTopY - 4;

    d.text("Sales Tax", COL_ACTIVITY + 2, taxY, FS.rowLabel, boldFont, C.black);

    const taxDesc =
      taxItems[0]?.description?.trim() || taxItems[0]?.title?.trim() || "";
    if (taxDesc) {
      d.text(taxDesc, ACTIVITY_TEXT_X, taxY, FS.tableCell, regFont, C.text);
    }

    const taxAmountStr =
      taxTotal > 0 ? formatCurrency(taxTotal) : formatCurrency(0);
    d.rightText(taxAmountStr, COL_AMOUNT, taxY, FS.rowLabel, regFont, C.text);

    rowTopY -= TAX_ROW_H;
  }

  const dividerY = rowTopY - 10;
  page.drawLine({
    start: { x: LEFT, y: dividerY },
    end: { x: RIGHT, y: dividerY },
    thickness: 1.2,
    color: C.heavyRule,
  });

  drawFooterBlocks(page, invoice, regFont, boldFont, COL_AMOUNT, dividerY);

  return Buffer.from(await pdfDoc.save());
}

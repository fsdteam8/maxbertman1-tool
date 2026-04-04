import fs from "fs";
import path from "path";
import { extractTextFromPDF, parseInvoiceText } from "../lib/invoice-parser";
import { normalizeInvoice } from "../lib/invoice-normalizer";
import { buildProcessedInvoice } from "../lib/invoice-transformer";
import { buildOverlayOps } from "../lib/pdf-overlay";
import { PDFDocument, StandardFonts } from "pdf-lib";

async function testPdf(pdfName: string) {
  const pdfPath = path.join(process.cwd(), pdfName);
  if (!fs.existsSync(pdfPath)) {
    console.log(`⏭  ${pdfName}: not found, skipping`);
    return;
  }

  console.log(`\n━━━ ${pdfName} ━━━`);
  const pdfBuffer = fs.readFileSync(pdfPath);

  const extracted = await extractTextFromPDF(pdfBuffer);
  const parsed = parseInvoiceText(extracted);
  const normalized = normalizeInvoice(parsed);
  const processed = buildProcessedInvoice(normalized, "TEST-PO");
  const mu = processed.markedUp;

  console.log(`Invoice #${normalized.invoiceNumber}`);
  console.log(`  Subtotal: ${normalized.subtotal} → ${mu.subtotal}`);
  console.log(`  Tax: ${normalized.taxAmount} → ${mu.taxAmount}`);
  console.log(`  Credit: ${normalized.creditAmount} → ${mu.creditAmount}`);
  console.log(`  Total: ${normalized.totalAmount} → ${mu.totalAmount}`);
  console.log(`  Balance Due: ${normalized.balanceDue} → ${mu.balanceDue}`);

  for (let i = 0; i < mu.lineItems.length; i++) {
    const orig = normalized.lineItems[i];
    const marked = mu.lineItems[i];
    console.log(
      `  Line[${i}] [${orig.type}]: $${orig.amount} → $${marked.amount} | meta: ${orig.amountMetadata ? "YES" : "MISSING"}`,
    );
  }

  // Check consistency: totalAmount should equal balanceDue when they were originally equal
  if (normalized.totalAmount === normalized.balanceDue) {
    if (mu.totalAmount === mu.balanceDue) {
      console.log(`  ✅ totalAmount == balanceDue (consistent)`);
    } else {
      console.log(
        `  ❌ totalAmount (${mu.totalAmount}) != balanceDue (${mu.balanceDue}) — INCONSISTENT`,
      );
    }
  }

  // Build overlay ops and check
  const measureDoc = await PDFDocument.load(pdfBuffer);
  const font = await measureDoc.embedFont(StandardFonts.TimesRoman);
  const ops = buildOverlayOps(normalized, mu, font);

  console.log(`  Overlay ops: ${ops.length}`);
  for (const op of ops) {
    if (op.newText) {
      console.log(
        `    [${op.align}] "${op.oldText || ""}" → "${op.newText}" | x=${op.x.toFixed(1)}, y=${op.y.toFixed(1)}, w=${op.width.toFixed(1)}`,
      );
    }
  }
}

async function main() {
  const pdfs = [
    "Invoice48166 (2) (1) (1).pdf",
    "Invoice48289 with sales tax.pdf",
    "Invoice48572 (1) (1).pdf",
  ];

  for (const pdf of pdfs) {
    await testPdf(pdf);
  }
}

main().catch(console.error);

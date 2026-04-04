import fs from "fs";
import path from "path";
import { extractTextFromPDF, parseInvoiceText } from "../lib/invoice-parser";
import { normalizeInvoice } from "../lib/invoice-normalizer";
import { buildProcessedInvoice } from "../lib/invoice-transformer";
import { buildOverlayOps } from "../lib/pdf-overlay";
import { PDFDocument, StandardFonts } from "pdf-lib";

async function main() {
  const pdfName = "Invoice48572 (1) (1).pdf";
  const pdfPath = path.join(process.cwd(), pdfName);
  if (!fs.existsSync(pdfPath)) {
    console.log(`❌ ${pdfName} not found`);
    return;
  }

  const pdfBuffer = fs.readFileSync(pdfPath);
  const extracted = await extractTextFromPDF(pdfBuffer);
  const parsed = parseInvoiceText(extracted);
  const normalized = normalizeInvoice(parsed);
  const processed = buildProcessedInvoice(normalized, "TEST-PO");
  const mu = processed.markedUp;

  console.log(`\n=== Invoice 48572 Results ===`);
  console.log(`Line Items: ${mu.lineItems.length}`);
  mu.lineItems.forEach((item, i) => {
    const meta = normalized.lineItems[i].amountMetadata;
    console.log(
      `Line[${i}] ${item.title}: $${normalized.lineItems[i].amount} -> $${item.amount} | y=${meta?.rect.y.toFixed(1)}`,
    );
  });

  const measureDoc = await PDFDocument.load(pdfBuffer);
  const font = await measureDoc.embedFont(StandardFonts.TimesRoman);
  const ops = buildOverlayOps(normalized, mu, font);

  console.log(`\n=== Overlay Ops ===`);
  ops.forEach((op) => {
    if (op.newText && op.oldText) {
      console.log(
        `Op: "${op.oldText}" -> "${op.newText}" | x=${op.x.toFixed(1)}, y=${op.y.toFixed(1)}`,
      );
    }
  });
}

main().catch(console.error);

import fs from "fs";
import path from "path";
import { extractTextFromPDF, parseInvoiceText } from "../lib/invoice-parser";
import { buildProcessedInvoice } from "../lib/invoice-transformer";
import { generateOverlaidPDF } from "../lib/pdf-overlay";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildOverlayOps } from "../lib/pdf-overlay";

async function main() {
  const pdfName = "Invoice48289 with sales tax.pdf";
  const pdfPath = path.join(process.cwd(), pdfName);
  const pdfBuffer = fs.readFileSync(pdfPath);
  const content = await extractTextFromPDF(pdfBuffer);
  const parsed = parseInvoiceText(content);
  const processed = buildProcessedInvoice(parsed, "TEST-PO-12345");
  
  const measureDoc = await PDFDocument.load(pdfBuffer);
  const fontNormal = await measureDoc.embedFont(StandardFonts.TimesRoman);
  
  const ops = buildOverlayOps(parsed, processed.markedUp, fontNormal);
  const eraseOps = ops.filter(op => op.isErase);
  console.log("Erase Ops:", JSON.stringify(eraseOps, null, 2));
}
main();

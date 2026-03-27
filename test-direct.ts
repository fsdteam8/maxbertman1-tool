import fs from "fs";
import path from "path";
import { extractTextFromPDF, parseInvoiceText } from "./lib/invoice-parser";
import { buildProcessedInvoice } from "./lib/invoice-transformer";
import { generateInvoicePDF } from "./lib/invoice-generator";

async function verify() {
  const pdfPath = path.join(process.cwd(), "Invoice48289 with sales tax.pdf");
  const buffer = fs.readFileSync(pdfPath);

  const extracted = await extractTextFromPDF(buffer);
  const parsed = parseInvoiceText(extracted);

  // Strip tax to force auto-generation
  parsed.taxAmount = null;
  parsed.lineItems = parsed.lineItems.filter((i) => i.type !== "tax");
  parsed.sourceMetadata.taxAmount = undefined;

  const processed = buildProcessedInvoice(parsed, undefined, 1);
  const markedUp = processed.markedUp;

  const addedTax = markedUp.lineItems.find((i) => i.type === "tax");
  console.log("Auto tax item added:", !!addedTax);

  const outPdf = await generateInvoicePDF(markedUp, buffer);
  fs.writeFileSync("test-gen.pdf", outPdf);
  console.log("PDF generated! Size:", outPdf.byteLength);
}

verify().catch(console.error);

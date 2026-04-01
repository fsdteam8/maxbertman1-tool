import fs from "fs";
import { extractTextFromPDF, parseInvoiceText } from "../lib/invoice-parser";

async function main() {
  const file = "Invoice48166 (2) (1) (1).pdf";
  const pdfBuffer = fs.readFileSync(file);
  const content = await extractTextFromPDF(pdfBuffer);
  const parsed = parseInvoiceText(content);

  console.log("Subtotal:", parsed.subtotal);
  console.log("TaxAmount:", parsed.taxAmount);
  console.log("Rate:", parsed.taxRate);
  console.log("Total:", parsed.totalAmount);

  console.log("\nRaw Text:");
  console.log(content.rawText);
}

main();

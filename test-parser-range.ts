import fs from "fs";
import path from "path";
import { extractTextFromPDF, parseInvoiceText } from "./lib/invoice-parser";

async function run() {
  const buf = fs.readFileSync("Invoice49216 (1).pdf");
  const extracted = await extractTextFromPDF(buf);
  const parsed = parseInvoiceText(extracted);
  console.log(parsed.lineItems.map(item => ({
    amount: item.amount,
    hasMetadata: !!item.amountMetadata,
    metaRect: item.amountMetadata?.rect
  })));
}
run();

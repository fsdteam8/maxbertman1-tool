import fs from "fs";
import path from "path";
import { extractTextFromPDF, parseInvoiceText } from "../lib/invoice-parser";

async function main() {
  const dir = process.cwd();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".pdf"));

  for (const file of files) {
    try {
      const pdfPath = path.join(dir, file);
      const pdfBuffer = fs.readFileSync(pdfPath);
      const content = await extractTextFromPDF(pdfBuffer);
      const parsed = parseInvoiceText(content);
      console.log(`\nFile: ${file}`);
      console.log(`  Subtotal: ${parsed.subtotal}`);
      console.log(`  Tax Amount: ${parsed.taxAmount}`);
      console.log(`  Tax Rate: ${parsed.taxRate}`);
      console.log(`  Total: ${parsed.totalAmount}`);
    } catch (e) {
      console.log(
        `Error reading ${file}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}

main();

import fs from "fs";
import path from "path";
import { processInvoice } from "../lib/pdf-processor";

async function main() {
  const samplePdf = "Invoice48289 with sales tax.pdf";
  const pdfPath = path.join(process.cwd(), samplePdf);
  const outputPath = path.join(process.cwd(), "test-processed-output.pdf");

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ Error: ${samplePdf} not found.`);
    return;
  }

  console.error(`\n━━━ Testing PDF Processor for: ${samplePdf} ━━━`);
  const pdfBuffer = fs.readFileSync(pdfPath);
  console.error(`Original buffer size: ${pdfBuffer.length} bytes`);
  const pdfBytes = new Uint8Array(pdfBuffer);
  console.error(`Uint8Array size: ${pdfBytes.length} bytes`);

  const poNumber = "PO-2026-999";

  try {
    console.error("Calling processInvoice...");
    const processedBytes = await processInvoice(pdfBytes, poNumber);
    console.error("processInvoice returned!");
    fs.writeFileSync(outputPath, Buffer.from(processedBytes));
    console.error(`✅ Success! Processed PDF saved to: ${outputPath}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to process invoice:", error);
    process.exit(1);
  }
}

main().catch(console.error);

/**
 * Test script for the overlay engine.
 *
 * Loads a sample PDF, parses it, applies 1% markup + PO replacement,
 * generates the overlaid PDF, and writes it to disk.
 *
 * Usage: npx tsx scripts/test-overlay.ts
 */

import fs from "fs";
import path from "path";
import { extractTextFromPDF, parseInvoiceText } from "../lib/invoice-parser";
import { normalizeInvoice } from "../lib/invoice-normalizer";
import { buildProcessedInvoice } from "../lib/invoice-transformer";
import { generateOverlaidPDF } from "../lib/pdf-overlay";

async function main() {
  // Find a sample PDF
  const samplePdfs = [
    "Invoice48166 (2) (1) (1).pdf",
    "Invoice48289 with sales tax.pdf",
    "Invoice48572 (1) (1).pdf",
  ];

  for (const pdfName of samplePdfs) {
    const pdfPath = path.join(process.cwd(), pdfName);
    if (!fs.existsSync(pdfPath)) {
      console.log(`⏭  Skipping ${pdfName} (not found)`);
      continue;
    }

    console.log(`\n━━━ Processing: ${pdfName} ━━━`);
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Step 1: Extract and parse
    console.log("  📖 Extracting text from PDF...");
    const extracted = await extractTextFromPDF(pdfBuffer);
    console.log(`  📝 Found ${extracted.items.length} text items`);

    const parsed = parseInvoiceText(extracted);
    const normalized = normalizeInvoice(parsed);

    console.log(`  📋 Invoice #${normalized.invoiceNumber || "unknown"}`);
    console.log(`  💰 Balance Due: ${normalized.balanceDue}`);
    console.log(`  📊 Subtotal: ${normalized.subtotal}`);
    console.log(`  🏷  Tax: ${normalized.taxAmount}`);
    console.log(`  💳 Credit: ${normalized.creditAmount}`);
    console.log(
      `  📦 PO: ${normalized.poNumber || normalized.poOriginalText || "none"}`,
    );

    // Step 2: Apply business rules
    const processed = buildProcessedInvoice(normalized, "TEST-PO-12345");
    const mu = processed.markedUp;

    console.log("\n  After 1% markup:");
    console.log(
      `  💰 Balance Due: ${normalized.balanceDue} → ${mu.balanceDue}`,
    );
    console.log(`  📊 Subtotal: ${normalized.subtotal} → ${mu.subtotal}`);
    if (normalized.taxAmount) {
      console.log(`  🏷  Tax: ${normalized.taxAmount} → ${mu.taxAmount}`);
    }
    if (normalized.creditAmount) {
      console.log(
        `  💳 Credit: ${normalized.creditAmount} → ${mu.creditAmount}`,
      );
    }
    console.log(
      `  📦 PO Replacement: ${processed.poReplacementApplied ? "YES" : "NO"}`,
    );

    // Step 3: Generate overlaid PDF
    console.log("\n  🔧 Generating overlaid PDF...");
    const overlaidPdf = await generateOverlaidPDF(pdfBuffer, normalized, mu);

    const outputName = `test-overlay-${normalized.invoiceNumber || "unknown"}.pdf`;
    const outputPath = path.join(process.cwd(), outputName);
    fs.writeFileSync(outputPath, overlaidPdf);

    console.log(`  ✅ Written to: ${outputName} (${overlaidPdf.length} bytes)`);
    console.log(`     Original: ${pdfBuffer.length} bytes`);
    console.log(`     Delta: ${overlaidPdf.length - pdfBuffer.length} bytes`);
  }

  console.log(
    "\n\nDone! Open the test-overlay-*.pdf files and compare with originals.",
  );
}

main().catch(console.error);

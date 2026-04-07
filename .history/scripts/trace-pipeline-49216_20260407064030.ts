/**
 * Diagnostic trace: Run the ACTUAL production pipeline on Invoice49216 (1).pdf
 * and log every step to find where the Services amount update is lost.
 */
import fs from "fs";
import path from "path";
import { extractTextFromPDF, parseInvoiceText } from "../lib/invoice-parser";
import { normalizeInvoice } from "../lib/invoice-normalizer";
import { buildProcessedInvoice } from "../lib/invoice-transformer";

async function diagnose() {
  const pdfName = "Invoice49216 (1).pdf";
  const pdfPath = path.join(process.cwd(), pdfName);
  const buf = fs.readFileSync(pdfPath);

  console.log(`\n━━━ PIPELINE TRACE: ${pdfName} ━━━\n`);

  // Step 1: Extract
  const extracted = await extractTextFromPDF(buf);
  console.log(`[1] Extracted ${extracted.items.length} text items`);

  // Step 2: Parse
  const parsed = parseInvoiceText(extracted);
  console.log(`[2] Parsed Invoice:`);
  console.log(`    balanceDue: ${parsed.balanceDue}`);
  console.log(`    lineItems count: ${parsed.lineItems.length}`);
  parsed.lineItems.forEach((li, i) => {
    console.log(
      `    lineItem[${i}]: type="${li.type}", amount=${li.amount}, amountMetadata=${JSON.stringify(li.amountMetadata?.rect)}`,
    );
  });
  console.log(
    `    sourceMetadata.balanceDue: ${JSON.stringify(parsed.sourceMetadata.balanceDue?.rect)}`,
  );

  // Step 3: Normalize
  const normalized = normalizeInvoice(parsed);
  console.log(`[3] Normalized Invoice:`);
  console.log(`    balanceDue: ${normalized.balanceDue}`);
  console.log(`    lineItems count: ${normalized.lineItems.length}`);
  normalized.lineItems.forEach((li, i) => {
    console.log(
      `    lineItem[${i}]: type="${li.type}", amount=${li.amount}, amountMetadata=${JSON.stringify(li.amountMetadata?.rect)}`,
    );
  });

  // Step 4: Transform
  const processed = buildProcessedInvoice(normalized, "TEST-PO");
  console.log(`[4] Transformed (markedUp) Invoice:`);
  console.log(`    balanceDue: ${processed.markedUp.balanceDue}`);
  console.log(`    lineItems count: ${processed.markedUp.lineItems.length}`);
  processed.markedUp.lineItems.forEach((li, i) => {
    console.log(`    lineItem[${i}]: type="${li.type}", amount=${li.amount}`);
  });

  // Step 5: Check overlay ops BUILD (not apply)
  // We can't easily call buildOverlayOps without a font, but we can check the data
  console.log(`\n[5] Overlay Input Check:`);
  for (let i = 0; i < normalized.lineItems.length; i++) {
    const origItem = normalized.lineItems[i];
    const newItem = processed.markedUp.lineItems[i];
    const hasMetadata = !!origItem.amountMetadata;
    const amountsChanged = origItem.amount !== newItem?.amount;
    console.log(
      `    lineItem[${i}]: hasMetadata=${hasMetadata}, orig=${origItem.amount}, new=${newItem?.amount}, changed=${amountsChanged}`,
    );
    if (!hasMetadata && amountsChanged) {
      console.log(
        `    ⚠️  MISSING METADATA — THIS AMOUNT WILL NOT BE REPAINTED!`,
      );
    }
  }

  console.log(`\n━━━ TRACE COMPLETE ━━━`);
}

diagnose().catch(console.error);

/**
 * Debug script to trace PO/W.O. rendering and detect issues.
 */

import fs from "fs";
import path from "path";
import { extractTextFromPDF, parseInvoiceText } from "../lib/invoice-parser";
import { normalizeInvoice } from "../lib/invoice-normalizer";
import { buildProcessedInvoice } from "../lib/invoice-transformer";
import { buildOverlayOps } from "../lib/pdf-overlay";
import { PDFDocument, StandardFonts } from "pdf-lib";

async function main() {
  const pdfPath = path.join(process.cwd(), "Invoice48289 with sales tax.pdf");
  if (!fs.existsSync(pdfPath)) {
    console.log("❌ PDF not found");
    return;
  }

  console.log("🔍 Debugging Invoice 48289 PO/W.O. Rendering\n");

  const pdfBuffer = fs.readFileSync(pdfPath);

  // Step 1: Extract and parse
  const extracted = await extractTextFromPDF(pdfBuffer);
  const parsed = parseInvoiceText(extracted);
  const normalized = normalizeInvoice(parsed);

  console.log("📋 Original Invoice:");
  console.log(`  - PO detected: ${normalized.poPlaceholderDetected}`);
  console.log(`  - PO original text: ${normalized.poOriginalText}`);
  console.log(`  - PO number: ${normalized.poNumber}`);
  console.log(`  - W.O. number: ${normalized.woNumber}`);
  console.log(
    `  - Service Activity bounds: ${JSON.stringify(normalized.sourceMetadata.serviceActivityBounds)}`,
  );
  console.log(
    `  - Service Activity items: ${normalized.sourceMetadata.serviceActivityItems?.length || 0}`,
  );

  // Step 2: Apply business rules with a test PO (W.O. disabled)
  const processed = buildProcessedInvoice(
    normalized,
    "TEST-PO-12345",
  );

  console.log("\n✏️ After Processing:");
  console.log(`  - markedUp.poNumber: ${processed.markedUp.poNumber}`);

  // Step 3: Generate overlay operations
  const measureDoc = await PDFDocument.load(pdfBuffer);
  const fontNormal = await measureDoc.embedFont(StandardFonts.TimesRoman);
  const ops = buildOverlayOps(normalized, processed.markedUp, fontNormal);

  console.log("\n🎨 Overlay Operations:");
  console.log(`  - Total ops: ${ops.length}`);

  // Filter to PO/W.O. related operations
  const poWoOps = ops.filter((op) => {
    const text = op.newText.toLowerCase();
    return text.includes("po") || text.includes("w.o") || text.includes("wo");
  });

  console.log(`  - PO/W.O. operations: ${poWoOps.length}`);
  poWoOps.forEach((op, i) => {
    console.log(`\n  Op ${i + 1}:`);
    console.log(
      `    - Page: ${op.pageIndex}, X: ${op.x.toFixed(1)}, Y: ${op.y.toFixed(1)}`,
    );
    console.log(`    - Dims: ${op.width.toFixed(1)}x${op.height.toFixed(1)}`);
    console.log(`    - Erase: ${op.isErase}`);
    console.log(`    - Text: "${op.newText}"`);
    console.log(`    - Align: ${op.align}`);
  });

  // Check for overlapping operations
  console.log("\n🔎 Checking for overlaps:");
  for (let i = 0; i < poWoOps.length; i++) {
    for (let j = i + 1; j < poWoOps.length; j++) {
      const op1 = poWoOps[i];
      const op2 = poWoOps[j];

      if (
        op1.pageIndex === op2.pageIndex &&
        Math.abs(op1.y - op2.y) < 10 &&
        Math.abs(op1.x - op2.x) < 10
      ) {
        console.log(
          `  ⚠️  Ops ${i + 1} and ${j + 1} are very close (potential overlap)`,
        );
      }
    }
  }

  // Check if Service Activity bounds are valid
  const bounds = normalized.sourceMetadata.serviceActivityBounds;
  if (bounds) {
    console.log("\n📐 Service Activity Bounds:");
    console.log(`  - topY: ${bounds.topY}`);
    console.log(`  - bottomY: ${bounds.bottomY}`);
    console.log(`  - minX: ${bounds.minX}`);
    console.log(`  - maxX: ${bounds.maxX}`);

    poWoOps.forEach((op, i) => {
      const withinY = op.y > bounds.bottomY && op.y < bounds.topY;
      const withinX = op.x >= bounds.minX && op.x <= bounds.maxX;
      console.log(`  - Op ${i + 1} within bounds: Y=${withinY} X=${withinX}`);
    });
  }
}

main().catch(console.error);

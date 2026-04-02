/**
 * Debug script to inspect PDF items for word-level box analysis.
 *
 * Usage: npx tsx scripts/debug-pdf-items.ts
 */

import fs from "fs";
import path from "path";
import { extractTextFromPDF } from "../lib/invoice-parser";

async function main() {
  const pdfName = "Invoice48572 (1) (1).pdf";
  const pdfPath = path.join(process.cwd(), pdfName);

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ Error: ${pdfName} not found.`);
    return;
  }

  console.log(`\n━━━ Analyzing PDF Items for: ${pdfName} ━━━ `);
  const pdfBuffer = fs.readFileSync(pdfPath);
  const content = await extractTextFromPDF(pdfBuffer);

  // Look for items related to the pending PO phrase
  const TARGET_PHRASE = "pending";

  const relevantItems = content.items.filter(
    (it) =>
      it.str.toLowerCase().includes(TARGET_PHRASE) ||
      it.str.toLowerCase().includes("po#"),
  );

  console.log(`Found ${relevantItems.length} relevant items:`);
  relevantItems.forEach((it, i) => {
    console.log(`[${i}] "${it.str}"`);
    console.log(`    x: ${it.x.toFixed(2)}, y: ${it.y.toFixed(2)}`);
    console.log(`    w: ${it.width.toFixed(2)}, h: ${it.height.toFixed(2)}`);
    console.log(`    page: ${it.pageIndex}`);
  });

  // Also print a few items "around" one of the matches on the same line
  if (relevantItems.length > 0) {
    const anchor = relevantItems[0];
    const neighbors = content.items
      .filter(
        (it) =>
          it.pageIndex === anchor.pageIndex && Math.abs(it.y - anchor.y) < 5,
      )
      .sort((a, b) => a.x - b.x);

    console.log(`\nItems on line with "${anchor.str}":`);
    neighbors.forEach((it) => {
      console.log(
        `  "${it.str}" (x=${it.x.toFixed(2)}, w=${it.width.toFixed(2)})`,
      );
    });
  }
}

main().catch(console.error);

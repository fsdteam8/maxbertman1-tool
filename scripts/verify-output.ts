import fs from "fs";
import path from "path";
import { extractWords } from "../lib/pdf-processor";

async function main() {
  const samplePdf = process.argv[2] || "Invoice48289 with sales tax.pdf";
  const originalPdf = samplePdf;
  const processedPdf = "test-processed-output.pdf";

  const originalPath = path.join(process.cwd(), originalPdf);
  const processedPath = path.join(process.cwd(), processedPdf);

  if (!fs.existsSync(originalPath) || !fs.existsSync(processedPath)) {
    console.error("❌ Error: Missing original or processed PDF.");
    return;
  }

  console.log(`\n━━━ Verifying Output PDF ━━━`);

  const originalBytes = new Uint8Array(fs.readFileSync(originalPath));
  const processedBytes = new Uint8Array(fs.readFileSync(processedPath));

  const { items: origItems } = await extractWords(originalBytes);
  const { items: procItems } = await extractWords(processedBytes);

  console.log(`\nOriginal Items vs Processed Items:`);

  // Find interesting items (amounts and PO)
  const currencyRegex = /^\$?[\d,]+\.\d{2}$/;

  const originalAmounts = origItems.filter(
    (it) => currencyRegex.test(it.str) && it.x > 400,
  );
  const processedAmounts = procItems.filter(
    (it) => currencyRegex.test(it.str) && it.x > 400,
  );

  console.log(`\n--- Monetary Amounts ---`);
  originalAmounts.forEach((orig, i) => {
    const allAtY = procItems.filter((p) => Math.abs(p.y - orig.y) < 2);
    console.log(`\nOriginal: "${orig.str}" at y=${orig.y.toFixed(2)}`);
    console.log(
      `Items at this y in processed:`,
      allAtY.map((p) => `"${p.str}" (x=${p.x.toFixed(2)})`).join(", "),
    );

    const origVal = parseFloat(orig.str.replace(/[$,]/g, ""));
    const expected = Math.round(origVal * 1.01 * 100) / 100;
    const expectedStr = expected.toFixed(2);

    const foundNew = allAtY.find((p) => p.str.includes(expectedStr));
    if (foundNew) {
      console.log(`✅ Found new value: "${foundNew.str}"`);
    } else {
      console.log(`❌ Could NOT find expected value: "${expectedStr}"`);
    }
  });

  console.log(`\n--- PO Replacement ---`);
  const poPattern = /PO#\s*PO-2026-999/;
  const poFound = procItems.some((it) => poPattern.test(it.str));
  if (poFound) {
    console.log(`✅ PO number found in processed PDF.`);
    const poItem = procItems.find((it) => poPattern.test(it.str));
    console.log(`   Found: "${poItem?.str}" at x=${poItem?.x}, y=${poItem?.y}`);
  } else {
    console.log(`❌ PO number NOT found in processed PDF.`);
  }

  // Check for the "pending" phrase in the processed PDF (should NOT be there)
  const pendingFound = procItems.some((it) => /pending/i.test(it.str));
  if (pendingFound) {
    console.log(`❌ "pending" phrase STILL present in processed PDF.`);
  } else {
    console.log(`✅ "pending" phrase successfully removed.`);
  }
}

main().catch(console.error);

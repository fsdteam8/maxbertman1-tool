import fs from "fs";
import { extractTextFromPDF } from "./lib/invoice-parser";

async function run() {
  const buffer = fs.readFileSync("test-output.pdf");
  const extracted = await extractTextFromPDF(buffer);
  
  extracted.items.forEach(item => {
    console.log(`[${Math.round(item.x)}, ${Math.round(item.y)}] '${item.str}'`);
  });
}
run().catch(console.error);

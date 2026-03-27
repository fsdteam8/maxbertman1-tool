const fs = require("fs");
const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

async function analyze() {
  const data = new Uint8Array(
    fs.readFileSync("Invoice48289 with sales tax.pdf"),
  );
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();

  const relevant = tc.items.filter((i) => {
    const text = i.str.toLowerCase();
    return (
      text.includes("sales tax") ||
      text.includes("service address") ||
      text.includes("subtotal") ||
      text.includes("total") ||
      text.includes("balance")
    );
  });

  relevant.forEach((i) => {
    console.log(
      `Text: "${i.str}", X: ${Math.round(i.transform[4])}, Y: ${Math.round(i.transform[5])}`,
    );
  });
}
analyze().catch(console.error);

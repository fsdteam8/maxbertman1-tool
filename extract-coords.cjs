// Extract coordinates from original PDFs
const fs = require("fs");

async function main() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const lib = pdfjs.default || pdfjs;

  const files = [
    "Invoice48289 with sales tax.pdf",
    "Invoice48572 (1) (1).pdf",
    "Invoice48166 (2) (1) (1).pdf",
  ];

  for (const file of files) {
    console.log("\n======== " + file + " ========");
    const buf = fs.readFileSync(file);
    const uint8 = new Uint8Array(buf);

    const loadingTask = lib.getDocument({
      data: uint8,
      disableWorker: true,
      useWorkerFetch: false,
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      content.items.forEach((item) => {
        if ("str" in item && item.str.trim()) {
          const [scaleX, skewX, skewY, scaleY, x, y] = item.transform;
          console.log(
            JSON.stringify({
              s: item.str,
              x: Math.round(x * 10) / 10,
              y: Math.round(y * 10) / 10,
              w: Math.round(item.width * 10) / 10,
              h: Math.round(item.height * 10) / 10,
              fs: Math.round(scaleY * 10) / 10,
            }),
          );
        }
      });
    }
  }
}

main().catch(console.error);

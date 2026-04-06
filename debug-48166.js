const fs = require('fs');
const { extractTextFromPDF, parseInvoiceText } = require('./lib/invoice-parser');
// Let's see if there is an Invoice48166.pdf
const fsPromises = require('fs').promises;
async function main() {
  const files = await fsPromises.readdir('.');
  const targetPdf = files.find(f => f.includes('48166') && f.endsWith('.pdf'));
  if (!targetPdf) {
    console.log('No 48166 PDF found.');
    return;
  }
  const buffer = await fsPromises.readFile(targetPdf);
  const content = await extractTextFromPDF(buffer);
  const result = parseInvoiceText(content);
  console.log("Found PDF:", targetPdf);
  console.log("Services:", result.lineItems.map(li => ({
    title: li.title,
    amount: li.amount,
    hasMeta: !!li.amountMetadata,
    metaRect: li.amountMetadata?.rect
  })));
  console.log("TopY/BottomY logic inside parser can be diagnosed if needed.");
}
main();

const fs = require('fs');
const { extractTextFromPDF, parseInvoiceText } = require('./lib/invoice-parser');
const pdfBuffer = fs.readFileSync('Invoice49216 (1).pdf');
extractTextFromPDF(pdfBuffer).then(content => {
  const result = parseInvoiceText(content);
  console.log("Balance Due Metadata:", result.sourceMetadata.balanceDue);
  console.log("Line Items:", result.lineItems.map(li => ({ amount: li.amount, metadata: li.amountMetadata })));
});

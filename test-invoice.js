const fs = require('fs');
const { extractTextFromPDF } = require('./lib/invoice-parser');
const pdfBuffer = fs.readFileSync('Invoice49216 (1).pdf');
extractTextFromPDF(pdfBuffer).then(res => {
  const items = res.items.filter(it => it.str.includes('90.'));
  console.log('Items with 90.:', items);
});

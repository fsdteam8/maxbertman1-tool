const fs = require('fs');
const http = require('http');

const invoice = {
  customerNumber: "2758",
  invoiceNumber: "48572", // The multiline one that has NO tax originally
  invoiceDate: "03/10/2026",
  dueDate: "03/20/2026",
  issuerName: "System4 S.N.E.",
  issuerAddressLines: ["60 Romano Vineyard Way, #101", "North Kingstown, RI 02852"],
  issuerEmail: "billing@system4ips.com",
  billToName: "The Pennfield School",
  billToAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"],
  serviceAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"],
  subtotal: 1224.00,
  taxAmount: undefined, // No tax originally
  creditAmount: undefined,
  totalAmount: 1224.00,
  balanceDue: 1224.00,
  lineItems: [
    {
      id: "1",
      type: "service",
      title: "Services",
      description: "Porter Services: Inv #47057 in December was under charged $612.\nInv #47771 in January was undercharged $612.",
      amount: 1224.00,
      quantity: null,
      rate: null,
      serviceDateRange: "Total = $1224.00 03/10/2026",
      extractedText: ""
    }
  ]
};

// We want to test the transformer output, so we must run transformer logic
// Since we want the API to do it, wait, the /api/invoice/generate endpoint
// EXPECTS the already marked up invoice! So we must run transformer locally first.
// Let's just use the Next.js API to run it: no, we need to run transformer.

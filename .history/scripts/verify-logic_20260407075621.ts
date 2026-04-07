import { applyMarkupToInvoice } from "../lib/invoice-transformer";
import type { ParsedInvoice } from "../types/invoice";

const testInvoice: ParsedInvoice = {
  invoiceNumber: "TEST-PROMPT",
  subtotal: 540.0,
  taxAmount: 34.29, // 540 * 0.0635 = 34.29 Exactly
  taxRate: 6.35,
  creditAmount: 0.0,
  totalAmount: 574.29,
  balanceDue: 574.29,
  lineItems: [
    {
      title: "Service Item",
      description: "Service Item Description",
      amount: 540.0,
      rate: 540.0,
      type: "service",
      serviceDateRange: null,
      quantity: 1,
    },
  ],
  customerNumber: null,
  invoiceDate: null,
  dueDate: null,
  issuerName: null,
  issuerEmail: null,
  issuerAddressLines: [],
  billToName: null,
  billToAddressLines: [],
  serviceAddressLines: [],
  remitToLines: [],
  poPlaceholderDetected: false,
  poOriginalText: null,
  poNumber: null,
  // woNumber: null,
  sourceMetadata: {},
  extractedRawText: "",
};

function runVerification() {
  console.log("--- PROMPT LOGIC VERIFICATION ---");
  console.log("Input: Service = $540.00, Markup = 1%, Tax = 6.35%");

  const marked = applyMarkupToInvoice(testInvoice, 1);

  const errors: string[] = [];

  // 1. Marked-up Service Amount (B)
  // Expected: 540 * 1.01 = 545.40
  console.log(`B: Service Line (Top): Expected 545.40, Got ${marked.subtotal}`);
  if (marked.subtotal !== 545.4) {
    errors.push(
      `Service Line mismatch: expected 545.40, got ${marked.subtotal}`,
    );
  }

  // 2. Tax Amount (C)
  // Formula: B * T = 545.40 * 0.0635 = 34.6329 -> 34.63
  console.log(`C: Tax Amount: Expected 34.63, Got ${marked.taxAmount}`);
  if (marked.taxAmount !== 34.63) {
    errors.push(`Tax Amount mismatch: expected 34.63, got ${marked.taxAmount}`);
  }

  // 3. Final Balance Due (D)
  // Formula: B + C = 545.40 + 34.63 = 580.03
  console.log(
    `D: Balance Due (Bottom): Expected 580.03, Got ${marked.balanceDue}`,
  );
  if (marked.balanceDue !== 580.03) {
    errors.push(
      `Balance Due mismatch: expected 580.03, got ${marked.balanceDue}`,
    );
  }

  // 4. Universal Application Check
  const factor = 1.01;
  const lineItemChecked = marked.lineItems[0].amount === 545.4;
  console.log(
    `Universal: Line Item Amount increased? ${lineItemChecked ? "Yes" : "No"}`,
  );
  if (!lineItemChecked) {
    errors.push(
      `Line Item not increased correctly: got ${marked.lineItems[0].amount}`,
    );
  }

  if (errors.length === 0) {
    console.log("\n✅ SUCCESS: Logic matches prompt requirements exactly.");
  } else {
    console.log("\n❌ FAILURE: Logic discrepancies found:");
    errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(1);
  }
}

runVerification();

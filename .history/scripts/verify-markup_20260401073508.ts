import { applyMarkupToInvoice } from "../lib/invoice-transformer";
import type { ParsedInvoice } from "../types/invoice";

const mockInvoice: ParsedInvoice = {
  invoiceNumber: "TEST-001",
  subtotal: 100.0,
  taxAmount: 6.35,
  taxRate: 6.35,
  creditAmount: 20.0,
  totalAmount: 106.35,
  balanceDue: 86.35,
  lineItems: [
    {
      title: "Service 1",
      description: "Service 1",
      amount: 100.0,
      rate: 100.0,
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
  woNumber: null,
  sourceMetadata: {},
  extractedRawText: "",
};

function runTest() {
  console.log("--- Testing 1% Markup Logic ---");
  const marked = applyMarkupToInvoice(mockInvoice, 1);

  console.log(
    `Original Subtotal: ${mockInvoice.subtotal} -> ${marked.subtotal}`,
  );
  console.log(
    `Original Tax Amount: ${mockInvoice.taxAmount} -> ${marked.taxAmount}`,
  );
  console.log(
    `Original Credit Amount: ${mockInvoice.creditAmount} -> ${marked.creditAmount}`,
  );
  console.log(
    `Original Total: ${mockInvoice.totalAmount} -> ${marked.totalAmount}`,
  );
  console.log(
    `Original Balance: ${mockInvoice.balanceDue} -> ${marked.balanceDue}`,
  );

  const errors: string[] = [];

  // Check 1% increases
  if (marked.subtotal !== 101.0)
    errors.push(`Subtotal should be 101.0, got ${marked.subtotal}`);

  // 101 * 0.0635 = 6.4135 -> 6.41
  if (marked.taxAmount !== 6.41)
    errors.push(`Tax should be 6.41, got ${marked.taxAmount}`);

  // 20 * 1.01 = 20.2
  if (marked.creditAmount !== 20.2)
    errors.push(`Credit should be 20.2, got ${marked.creditAmount}`);

  // 101 + 6.41 = 107.41
  if (marked.totalAmount !== 107.41)
    errors.push(
      `Total should be 107.41 (Subtotal + Tax), got ${marked.totalAmount}`,
    );

  // 107.41 - 20.2 = 87.21
  if (marked.balanceDue !== 87.21)
    errors.push(
      `Balance should be 87.21 (Total - Credit), got ${marked.balanceDue}`,
    );

  if (errors.length === 0) {
    console.log("\n✅ ALL TESTS PASSED!");
  } else {
    console.log("\n❌ TESTS FAILED:");
    errors.forEach((e) => console.log(`  - ${e}`));
  }
}

runTest();

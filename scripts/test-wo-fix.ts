import { buildProcessedInvoice } from "../lib/invoice-transformer";
import { normalizeInvoice } from "../lib/invoice-normalizer";

const MOCK_ORIGINAL: any = {
  invoiceNumber: "123",
  lineItems: [
    {
      title: "Services",
      description: "PO# pending, W.O.# pending",
      amount: 100,
    },
  ],
  issuerAddressLines: [],
  billToAddressLines: [],
  serviceAddressLines: [],
  remitToLines: [],
  subtotal: 100,
  totalAmount: 100,
  balanceDue: 100,
  poNumber: null,
  woNumber: null,
  poPlaceholderDetected: true,
  sourceMetadata: {
    serviceActivityItems: [],
  },
};

function test() {
  console.log("=== PO & WO FIX VERIFICATION ===");

  const normalized = normalizeInvoice(MOCK_ORIGINAL);

  // Scenario 1: PO "P123" and WO "W456" provided
  console.log("\nScenario 1: PO 'P123' and WO 'W456' provided");
  const processed = buildProcessedInvoice(normalized, "P123", "W456");

  const resultDesc = processed.markedUp.lineItems[0].description;
  console.log(`Initial: "${normalized.lineItems[0].description}"`);
  console.log(`Result:  "${resultDesc}"`);

  if (resultDesc.includes("PO# P123") && resultDesc.includes("W.O.# W456")) {
    console.log("\n✅ SUCCESS: Both PO and WO replaced correctly.");
  } else {
    console.log("\n❌ FAILED: Replacement incomplete or incorrect.");
  }
}

test();

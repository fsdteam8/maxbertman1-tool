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
  poPlaceholderDetected: true,
  sourceMetadata: {
    serviceActivityItems: [],
  },
};

function test() {
  console.log("=== PO & WO FIX VERIFICATION - W.O. DISABLED ===");

  const normalized = normalizeInvoice(MOCK_ORIGINAL);

  // Scenario 1: PO "P123" provided (W.O. disabled)
  console.log(\"\\nScenario 1: PO 'P123' provided (W.O. disabled)\");
  const processed = buildProcessedInvoice(normalized, \"P123\");

  const resultDesc = processed.markedUp.lineItems[0].description;
  console.log(`Initial: "${normalized.lineItems[0].description}"`);
  console.log(`Result:  "${resultDesc}"`);

  if (resultDesc.includes(\"PO# P123\")) {
    console.log(\"\\n✅ SUCCESS: PO replaced correctly (W.O. disabled).\");
  } else {
    console.log(\"\\n❌ FAILED: PO replacement incomplete or incorrect.\");
  }
}

test();

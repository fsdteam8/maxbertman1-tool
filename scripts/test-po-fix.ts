import { buildProcessedInvoice } from "../lib/invoice-transformer";
import { normalizeInvoice } from "../lib/invoice-normalizer";

const MOCK_ORIGINAL: any = {
  invoiceNumber: "123",
  lineItems: [{ title: "Services", description: "PO# pending", amount: 100 }],
  subtotal: 100,
  totalAmount: 100,
  balanceDue: 100,
  poNumber: null,
  poPlaceholderDetected: true,
};

function test() {
  console.log("=== PO FIX VERIFICATION ===");

  const normalized = normalizeInvoice(MOCK_ORIGINAL);

  // Scenario 1: No PO provided by user
  console.log("\nScenario 1: No PO provided by user");
  const processed1 = buildProcessedInvoice(normalized);
  console.log(`PO in markedUp: "${processed1.markedUp.poNumber}"`);
  console.log(`Description: "${processed1.markedUp.lineItems[0].description}"`);

  // Scenario 2: PO "123456" provided
  console.log("\nScenario 2: PO '123456' provided");
  const processed2 = buildProcessedInvoice(normalized, "123456");
  console.log(`PO in markedUp: "${processed2.markedUp.poNumber}"`);
  console.log(`Description: "${processed2.markedUp.lineItems[0].description}"`);

  if (processed1.markedUp.lineItems[0].description === "PO# pending") {
    console.log(
      "\n✅ SUCCESS: Original text preserved when no PO provided (no double 'Pending PO').",
    );
  } else {
    console.log(
      "\n❌ FAILED: Original text was modified even without user input.",
    );
  }

  if (processed2.markedUp.lineItems[0].description === "PO# 123456") {
    console.log("✅ SUCCESS: Correct replacement when PO provided.");
  } else {
    console.log(
      `❌ FAILED: Unexpected replacement result: "${processed2.markedUp.lineItems[0].description}"`,
    );
  }
}

test();

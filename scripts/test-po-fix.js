// Mocking the NEW smarter behavior of lib/text-replacement.ts
function applyPOPlaceholder(match, poNumber) {
  const isPending = poNumber.toLowerCase().includes("pending");
  const labelMatch = /^(PO#?\s*|Order#?\s*)/i.exec(match);
  if (labelMatch) {
    const label = labelMatch[1];
    return isPending ? "Pending PO" : `${label}${poNumber}`;
  }
  if (isPending) return "Pending PO";
  return `PO# ${poNumber}`;
}

function applyPOReplacement(text, poNumber) {
  // Simplified mock of the loop
  return text
    .replace(/PO#?\s*pending/gi, (match) => applyPOPlaceholder(match, poNumber))
    .replace(/pending/gi, (match) => applyPOPlaceholder(match, poNumber));
}

function buildProcessedInvoiceMock(original, poNumber) {
  // Transfer PO parameter
  const finalPo = poNumber || null;
  const markedUp = JSON.parse(JSON.stringify(original));
  markedUp.poNumber = finalPo;

  if (finalPo) {
    markedUp.lineItems[0].description = applyPOReplacement(
      markedUp.lineItems[0].description,
      finalPo,
    );
  }
  return { markedUp };
}

function test() {
  console.log("=== PO FIX MOCK VERIFICATION ===");

  const original = {
    lineItems: [{ description: "PO# pending" }],
  };

  // Scenario 1: No PO provided
  console.log("\nScenario 1: No PO provided (user inputs nothing)");
  const res1 = buildProcessedInvoiceMock(original, undefined);
  console.log(`Initial: "${original.lineItems[0].description}"`);
  console.log(`Result:  "${res1.markedUp.lineItems[0].description}"`);

  // Scenario 2: PO "123456" provided
  console.log("\nScenario 2: PO '123456' provided");
  const res2 = buildProcessedInvoiceMock(original, "123456");
  console.log(`Initial: "${original.lineItems[0].description}"`);
  console.log(`Result:  "${res2.markedUp.lineItems[0].description}"`);

  if (res1.markedUp.lineItems[0].description === "PO# pending") {
    console.log("\n✅ SUCCESS: Original text preserved when no PO provided.");
  } else {
    console.log("\n❌ FAILED: Text was modified unexpectedly.");
  }

  if (res2.markedUp.lineItems[0].description === "PO# 123456") {
    console.log("✅ SUCCESS: Correct replacement when PO provided.");
  } else {
    console.log(
      `❌ FAILED: Unexpected result: "${res2.markedUp.lineItems[0].description}"`,
    );
  }
}

test();

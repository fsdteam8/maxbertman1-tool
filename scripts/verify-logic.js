function round2(v) {
  return Math.round(v * 100) / 100;
}

function applyMarkupToInvoice(invoice, markupPercent = 1) {
  const factor = 1 + markupPercent / 100;

  // 1. Mark up line items (No rounding yet)
  const markedLineItems = invoice.lineItems.map((item) => {
    return {
      ...item,
      amount: item.amount !== null ? item.amount * factor : null,
      rate: item.rate !== null ? item.rate * factor : null,
    };
  });

  // 2. Mark up subtotal
  let subtotalRaw =
    invoice.subtotal !== null ? invoice.subtotal * factor : null;

  // 3. Tax Calculation
  let taxMultiplier = 1 + invoice.taxRate / 100;
  let totalAmountRaw = subtotalRaw * taxMultiplier;
  let taxAmountRaw = totalAmountRaw - subtotalRaw;

  // 4. Final Rounding
  const subtotal = subtotalRaw !== null ? round2(subtotalRaw) : null;
  const taxAmount = taxAmountRaw !== null ? round2(taxAmountRaw) : null;
  const totalAmount = totalAmountRaw !== null ? round2(totalAmountRaw) : null;
  const balanceDue = totalAmount; // assuming no credit for this test

  return {
    subtotal,
    taxAmount,
    totalAmount,
    balanceDue,
    lineItems: markedLineItems.map((it) => ({
      ...it,
      amount: round2(it.amount),
    })),
  };
}

const testInvoice = {
  subtotal: 540.0,
  taxRate: 6.35,
  lineItems: [{ amount: 540.0 }],
};

const marked = applyMarkupToInvoice(testInvoice, 1);

console.log("--- STANDALONE VERIFICATION ---");
console.log("Input: 540.00, 1%, 6.35%");
console.log(`B: Service Line (Top): ${marked.subtotal}`);
console.log(`C: Tax Amount: ${marked.taxAmount}`);
console.log(`D: Balance Due (Bottom): ${marked.balanceDue}`);

if (
  marked.subtotal === 545.4 &&
  marked.taxAmount === 34.63 &&
  marked.balanceDue === 580.03
) {
  console.log("\n✅ SUCCESS: Logic verified.");
} else {
  console.log("\n❌ FAILURE: Logic discrepancy.");
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function applyMarkupToInvoice(invoice, markupPercent = 1) {
  const factor = 1 + markupPercent / 100;

  // 1. Mark up line items
  const markedLineItems = invoice.lineItems.map((item) => ({
    ...item,
    amount: item.amount !== null ? item.amount * factor : null,
  }));

  // 2. Mark up header fields
  const subtotalRaw =
    invoice.subtotal !== null ? invoice.subtotal * factor : null;
  const creditAmountRaw =
    invoice.creditAmount !== null ? invoice.creditAmount * factor : null;

  // Fallback subtotal if missing
  const effectiveSubtotalRaw =
    subtotalRaw ||
    markedLineItems.reduce((sum, it) => sum + (it.amount || 0), 0);

  // 3. Tax Calculation (0% in this case if missing)
  const taxMultiplier = 1;
  const totalAmountRaw = effectiveSubtotalRaw * taxMultiplier;
  const balanceDueRaw = totalAmountRaw - (creditAmountRaw || 0);

  return {
    subtotal: round2(effectiveSubtotalRaw),
    creditAmount: round2(creditAmountRaw),
    balanceDue: round2(balanceDueRaw),
    lineItems: markedLineItems.map((it) => ({
      ...it,
      amount: round2(it.amount),
    })),
  };
}

const invoice48166 = {
  subtotal: null,
  creditAmount: 2704.61,
  lineItems: [{ title: "Services Cleaning", amount: 3516.0 }],
};

const marked = applyMarkupToInvoice(invoice48166, 1);

console.log("--- INVOICE 48166 VERIFICATION ---");
console.log(
  `Original Service: 3,516.00 -> Marked up: ${marked.lineItems[0].amount}`,
);
console.log(`Original Credit: 2,704.61 -> Marked up: ${marked.creditAmount}`);
console.log(`Original Balance: 811.39 -> Marked up: ${marked.balanceDue}`);

const expectedService = 3551.16;
const expectedCredit = 2731.66;
const expectedBalance = 819.5;

if (
  marked.lineItems[0].amount === expectedService &&
  marked.creditAmount === expectedCredit &&
  marked.balanceDue === expectedBalance
) {
  console.log("\n✅ SUCCESS: Invoice 48166 values verified.");
} else {
  console.log("\n❌ FAILURE: Discrepancy found.");
}

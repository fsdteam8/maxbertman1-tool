/**
 * Test PDF generation script.
 * Generates 3 PDFs matching the 3 original invoice patterns:
 *   1. Invoice 48572 — multiline description, no tax, no credit
 *   2. Invoice 48166 — cleaning with credit, no tax
 *   3. Invoice 48289 — cleaning + PO placeholder + 6.35% sales tax
 *
 * Usage: npx tsx generate-test-pdf.ts
 */

// NOTE: The old generateInvoicePDF (from-scratch via @react-pdf/renderer) has been
// replaced with the overlay engine. This test script is deprecated.
// Use scripts/test-overlay.ts instead for testing the overlay approach.
import type { ParsedInvoice } from "./types/invoice";
import fs from "fs";

// ─── Shared defaults ─────────────────────────────────────────────────────
const sharedFields = {
  issuerName: "System4 S.N.E.",
  issuerEmail: "billing@system4ips.com",
  issuerAddressLines: [
    "60 Romano Vineyard Way, #101",
    "North Kingstown, RI 02852",
  ],
  remitToLines: [
    "System4 S.N.E.",
    "60 Romano Vineyard Way, #101",
    "North Kingstown, RI 02852",
    "Attn: billing@system4ips.com",
    "Phone: (401) 615-7043",
  ],
  poPlaceholderDetected: false,
  poOriginalText: null,
  sourceMetadata: {},
  extractedRawText: "",
  lowConfidence: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// Invoice 48572 — Multiline description, no tax, no credit
// ═══════════════════════════════════════════════════════════════════════════
const invoice48572: ParsedInvoice = {
  ...sharedFields,
  invoiceNumber: "48572",
  customerNumber: "2758",
  invoiceDate: "03/10/2026",
  dueDate: "03/20/2026",
  balanceDue: 1224.0,
  totalAmount: 1224.0,
  subtotal: 1224.0,
  taxAmount: null,
  taxRate: null,
  creditAmount: null,
  billToName: "The Pennfield School",
  billToAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"],
  serviceAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"],
  lineItems: [
    {
      type: "service",
      title: "Porter Services: Inv #47057 in December was under charged $612.",
      description:
        "Inv #47771 in January was undercharged $612.\nTotal = $1224.00  03/10/2026",
      serviceDateRange: null,
      quantity: null,
      rate: null,
      amount: 1224.0,
    },
  ],
} as ParsedInvoice;

// ═══════════════════════════════════════════════════════════════════════════
// Invoice 48166 — Cleaning with credit, no tax
// ═══════════════════════════════════════════════════════════════════════════
const invoice48166: ParsedInvoice = {
  ...sharedFields,
  invoiceNumber: "48166",
  customerNumber: "2758",
  invoiceDate: "03/01/2026",
  dueDate: "03/11/2026",
  balanceDue: 811.39,
  totalAmount: 811.39,
  subtotal: 3516.0,
  taxAmount: null,
  taxRate: null,
  creditAmount: 2704.61,
  billToName: "The Pennfield School",
  billToAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"],
  serviceAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"],
  lineItems: [
    {
      type: "service",
      title: "Cleaning",
      description: "Cleaning",
      serviceDateRange: "03/01/2026 - 03/31/2026",
      quantity: null,
      rate: null,
      amount: 3516.0,
    },
    {
      type: "credit",
      title: "Credit",
      description: "Credit",
      serviceDateRange: null,
      quantity: null,
      rate: null,
      amount: 2704.61,
    },
  ],
} as ParsedInvoice;

// ═══════════════════════════════════════════════════════════════════════════
// Invoice 48289 — Cleaning + PO placeholder + 6.35% sales tax
// ═══════════════════════════════════════════════════════════════════════════
const invoice48289: ParsedInvoice = {
  ...sharedFields,
  invoiceNumber: "48289",
  customerNumber: "2266",
  invoiceDate: "03/01/2026",
  dueDate: "03/11/2026",
  balanceDue: 956.09,
  totalAmount: 956.09,
  subtotal: 899.0,
  taxAmount: 57.09,
  taxRate: 6.35,
  creditAmount: null,
  billToName: "Ryder Truck- Waterbury",
  billToAddressLines: ["37 E Aurora St", "Waterbury, CT 06708"],
  serviceAddressLines: ["37 E Aurora St", "Waterbury, CT 06708"],
  lineItems: [
    {
      type: "service",
      title: "Cleaning",
      description: "PO# pending valid purchase order from Ryder.",
      serviceDateRange: "03/01/2026 - 03/31/2026",
      quantity: null,
      rate: null,
      amount: 899.0,
    },
    {
      type: "tax",
      title: "Sales Tax",
      description: "Waterbury, CT 06708 (6.35%)",
      serviceDateRange: null,
      quantity: null,
      rate: null,
      amount: 57.09,
    },
  ],
} as ParsedInvoice;

// ═══════════════════════════════════════════════════════════════════════════
// Long Text Test Case — Reproducing overflow
// ═══════════════════════════════════════════════════════════════════════════
const invoiceLongText: ParsedInvoice = {
  ...sharedFields,
  invoiceNumber: "LONG-TEXT",
  customerNumber: "9999",
  invoiceDate: "03/28/2026",
  dueDate: "04/01/2026",
  balanceDue: 9999.99,
  totalAmount: 9999.99,
  subtotal: 9999.99,
  taxAmount: null,
  taxRate: null,
  creditAmount: null,
  billToName:
    "Long Name Company Limited That Should Definitely Wrap Because It Is Too Long For A Single Line",
  billToAddressLines: [
    "123 Very Long Street Name That Might Also Need Wrapping If The Sidebar Is Small",
    "City of Longness, State of Wrap",
  ],
  serviceAddressLines: ["Service Point A", "Service Point B"],
  lineItems: [
    {
      type: "service",
      title:
        "Extremely Long Service Title That Should Warp To Multiple Lines Without Breaking The Layout",
      description:
        "This is a very long description intended to test the wrapping capabilities of the React-PDF generator. It contains many words and should wrap correctly within the 44% width allocated to the activity column without overflowing into the next column which contains quantity and rate information. We want to ensure that the flexbox engine correctly calculates heights and prevents horizontal spillover.",
      serviceDateRange: "01/01/2026 - 12/31/2026",
      quantity: 1000000,
      rate: 999.99,
      amount: 9999.99,
    },
  ],
} as ParsedInvoice;

import { applyMarkupToInvoice } from "./lib/invoice-transformer";

// ═══════════════════════════════════════════════════════════════════════════
// Generate all test PDFs — DEPRECATED (uses old from-scratch generator)
// Use scripts/test-overlay.ts instead.
// ═══════════════════════════════════════════════════════════════════════════
// async function run() { ... }
// run().catch(console.error);
console.log("This script is deprecated. Use: npx tsx scripts/test-overlay.ts");

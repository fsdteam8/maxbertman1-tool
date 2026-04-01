"use client";

import React, { useState, useEffect } from "react";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import type { ParsedInvoice } from "@/types/invoice";

// ─── Mock Data (ParsedInvoice compatible) ───────────────────────────────────
const MOCK_INVOICE: ParsedInvoice = {
  invoiceNumber: "48289",
  customerNumber: "2266",
  invoiceDate: "03/01/2026",
  dueDate: "03/11/2026",
  issuerName: "System4 S.N.E.",
  issuerAddressLines: [
    "60 Romano Vineyard Way, #101",
    "North Kingstown, RI 02852",
  ],
  issuerEmail: "billing@system4ips.com",
  billToName: "Ryder Truck- Waterbury",
  billToAddressLines: ["37 E Aurora St", "Waterbury, CT 06708"],
  serviceAddressLines: ["37 E Aurora St", "Waterbury, CT 06708"],
  lineItems: [
    {
      type: "service",
      title: "Services",
      description:
        "Cleaning\nPO# pending valid purchase order from Ryder.  03/01/2026 -\n03/31/2026",
      quantity: null,
      rate: 899.0,
      amount: 899.0,
      serviceDateRange: "03/01/2026 - 03/31/2026",
    },
    {
      type: "tax",
      title: "Sales Tax",
      description: "Waterbury, CT 06708 (6.35%)",
      quantity: null,
      rate: null,
      amount: 57.09,
      serviceDateRange: null,
    },
  ],
  balanceDue: 956.09,
  totalAmount: 956.09,
  subtotal: 899.0,
  taxAmount: 57.09,
  remitToLines: [
    "System4 S.N.E.",
    "60 Romano Vineyard Way, #101",
    "North Kingstown, RI 02852",
  ],
  taxRate: 6.35,
  creditAmount: 0,
  poPlaceholderDetected: false,
  poOriginalText: null,
  poNumber: null,
  woNumber: null,
  sourceMetadata: null as any,
  extractedRawText: "Mock Data",
  lowConfidence: false,
};

export default function InvoicePreviewPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F0F0EC] flex flex-col items-center font-sans">
      <div className="w-full bg-[#1E4F96] p-3 px-8 flex items-center justify-between box-border shadow-lg">
        <span className="text-white font-bold text-base tracking-tight">
          Invoice #{MOCK_INVOICE.invoiceNumber} · {MOCK_INVOICE.issuerName}
        </span>

        <PDFDownloadLink
          document={<InvoiceDocument invoice={MOCK_INVOICE} />}
          fileName={`Invoice_${MOCK_INVOICE.invoiceNumber}.pdf`}
          className="bg-white text-[#1E4F96] font-bold text-sm px-5 py-2 rounded-md no-underline transition-opacity hover:opacity-90 active:scale-95"
        >
          {({ loading }) => (loading ? "Generating…" : "⬇ Download PDF")}
        </PDFDownloadLink>
      </div>

      <div className="mt-8 shadow-2xl bg-white border border-gray-200">
        <PDFViewer
          width="860"
          height="1110"
          className="border-none"
          showToolbar={false}
        >
          <InvoiceDocument invoice={MOCK_INVOICE} />
        </PDFViewer>
      </div>

      <p className="text-gray-400 text-[11px] mt-4 mb-8">
        Live PDF preview · US Letter · Unified React-PDF Template
      </p>
    </div>
  );
}

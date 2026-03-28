import React from "react";
import ReactPDF from "@react-pdf/renderer";
import type { ParsedInvoice } from "@/types/invoice";
import { InvoiceDocument } from "@/components/InvoiceDocument";

// Removed local InvoiceDocument and helpers - now using shared component from @/components/InvoiceDocument

/**
 * Main export: Generate the PDF Buffer on the backend using React-PDF.
 * This completely replaces the old pdf-lib implementation!
 */
export async function generateInvoicePDF(
  invoice: ParsedInvoice,
): Promise<Buffer> {
  const pdfStream = await ReactPDF.renderToStream(
    <InvoiceDocument invoice={invoice} />,
  );

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfStream.on("error", (err: Error) => reject(err));
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

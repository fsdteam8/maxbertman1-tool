import { NextRequest, NextResponse } from "next/server";
import { generateInvoicePDF } from "@/lib/invoice-generator";
import {
  validateInvoiceDataStrict,
  logValidationWarnings,
} from "@/lib/invoice-validator";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoice/generate
 *
 * Accepts either:
 *  - multipart/form-data with 'invoice' (JSON string)
 *  - application/json with the invoice object directly (legacy)
 *
 * Validates invoice data before generation to ensure:
 * - No hardcoded/placeholder data is used
 * - All required fields are present
 * - Financial totals are coherent
 *
 * Generates an invoice PDF deterministically from scratch and returns it as a binary stream.
 */
export async function POST(req: NextRequest) {
  try {
    let invoice: any;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // FormData mode: invoice JSON string
      const formData = await req.formData();
      const invoiceField = formData.get("invoice");

      if (!invoiceField) {
        return NextResponse.json(
          { success: false, error: "Missing invoice data" },
          { status: 400 },
        );
      }

      invoice = JSON.parse(invoiceField as string);
    } else {
      // Legacy JSON mode
      invoice = await req.json();
    }

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Missing invoice data" },
        { status: 400 },
      );
    }

    // ─── VALIDATION: Ensure no hardcoded/dummy data ───
    try {
      validateInvoiceDataStrict(invoice);
      logValidationWarnings(invoice);
    } catch (validationError: any) {
      console.error(
        "[api/invoice/generate] Validation failed:",
        validationError.message,
      );
      return NextResponse.json(
        {
          success: false,
          error: `Invoice validation failed: ${validationError.message}`,
        },
        { status: 422 }, // 422 Unprocessable Entity
      );
    }

    // Generate the deterministic PDF buffer from scratch
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Determine filename
    const filename = invoice.invoiceNumber
      ? `Invoice_${invoice.invoiceNumber}_Processed.pdf`
      : "Processed_Invoice.pdf";

    // Stream as PDF response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("[api/invoice/generate] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate PDF" },
      { status: 500 },
    );
  }
}

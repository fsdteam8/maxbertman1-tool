import { NextRequest, NextResponse } from "next/server";
import { generateInvoicePDF } from "@/lib/invoice-generator";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoice/generate
 * 
 * Accepts either:
 *  - multipart/form-data with 'invoice' (JSON string) + optional 'originalPdf' (File)
 *  - application/json with the invoice object directly (legacy)
 * 
 * Generates a PDF and returns it as a binary stream.
 * When an original PDF is provided, uses overlay mode for high-fidelity output.
 */
export async function POST(req: NextRequest) {
  try {
    let invoice: any;
    let originalPdfBuffer: Buffer | undefined;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // FormData mode: invoice JSON string + optional original PDF
      const formData = await req.formData();
      const invoiceField = formData.get("invoice");
      const pdfFile = formData.get("originalPdf") as File | null;

      if (!invoiceField) {
        return NextResponse.json(
          { success: false, error: "Missing invoice data" },
          { status: 400 }
        );
      }

      invoice = JSON.parse(invoiceField as string);

      if (pdfFile) {
        originalPdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
      }
    } else {
      // Legacy JSON mode
      invoice = await req.json();
    }

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Missing invoice data" },
        { status: 400 }
      );
    }

    // Generate the PDF buffer (overlay when original is available)
    const pdfBuffer = await generateInvoicePDF(invoice, originalPdfBuffer);

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
      { status: 500 }
    );
  }
}

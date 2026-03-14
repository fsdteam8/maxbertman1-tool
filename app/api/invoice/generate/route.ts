import { NextRequest, NextResponse } from "next/server";
import { generateInvoicePDF } from "@/lib/invoice-generator";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoice/generate
 * 
 * Accepts a ParsedInvoice JSON (the marked-up version).
 * Generates a clean PDF and returns it as a binary stream.
 */
export async function POST(req: NextRequest) {
  try {
    const invoice = await req.json();

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Missing invoice data" },
        { status: 400 }
      );
    }

    // Step 1: Generate the PDF buffer
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Step 2: Determine filename
    const filename = invoice.invoiceNumber 
      ? `Invoice_${invoice.invoiceNumber}_Processed.pdf`
      : "Processed_Invoice.pdf";

    // Step 3: Stream as PDF response
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

import { NextRequest, NextResponse } from "next/server";
import { processInvoice } from "@/lib/pdf-processor";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    const poNumber = formData.get("poNumber") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);

    // 1. Process the invoice (includes text extraction, markup, and PO replacement)
    const processedPdfBytes = await processInvoice(pdfBytes, poNumber);

    // 2. Return the modified PDF
    return new Response(Buffer.from(processedPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="processed_invoice.pdf"',
      },
    });
  } catch (error: any) {
    console.error("Error processing invoice:", error);

    // As per Step 5: Error Handling
    // Never return a corrupted or partially written PDF — wrap in try/catch
    // and return the original unmodified PDF with an error flag if processing fails
    try {
      const formData = await req.formData();
      const file = formData.get("pdf") as File;
      const arrayBuffer = await file.arrayBuffer();

      return new Response(new Uint8Array(arrayBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "X-Processing-Error": error.message || "Unknown error",
          "Content-Disposition":
            'attachment; filename="original_invoice_error.pdf"',
        },
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: "Critical error during invoice processing" },
        { status: 500 },
      );
    }
  }
}

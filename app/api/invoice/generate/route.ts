import { NextRequest, NextResponse } from "next/server";
import { generateOverlaidPDF } from "@/lib/pdf-overlay";
import { extractTextFromPDF, parseInvoiceText } from "@/lib/invoice-parser";
import { normalizeInvoice } from "@/lib/invoice-normalizer";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoice/generate
 *
 * Accepts multipart/form-data with:
 *   - invoice: JSON string of the marked-up ParsedInvoice
 *   - originalPdf: the original PDF file (required for overlay)
 *
 * Generates the overlaid PDF by comparing the original extraction
 * with the marked-up invoice data, and returns the modified PDF.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This endpoint requires multipart/form-data with 'invoice' and 'originalPdf' fields.",
        },
        { status: 400 },
      );
    }

    const formData = await req.formData();
    const invoiceField = formData.get("invoice");
    const originalPdfFile = formData.get("originalPdf") as File | null;

    if (!invoiceField) {
      return NextResponse.json(
        { success: false, error: "Missing invoice data" },
        { status: 400 },
      );
    }

    if (!originalPdfFile) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing originalPdf file. The overlay engine requires the original PDF.",
        },
        { status: 400 },
      );
    }

    const markedUpInvoice = JSON.parse(invoiceField as string);
    const originalPdfBuffer = Buffer.from(await originalPdfFile.arrayBuffer());

    // Re-parse the original PDF to get fresh coordinate metadata
    const extractedContent = await extractTextFromPDF(originalPdfBuffer);
    const parsed = parseInvoiceText(extractedContent);
    const originalInvoice = normalizeInvoice(parsed);

    // Generate overlaid PDF
    const pdfBuffer = await generateOverlaidPDF(
      originalPdfBuffer,
      originalInvoice,
      markedUpInvoice,
    );

    const filename = markedUpInvoice.invoiceNumber
      ? `Invoice_${markedUpInvoice.invoiceNumber}_Processed.pdf`
      : "Processed_Invoice.pdf";

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[api/invoice/generate] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate PDF",
      },
      { status: 500 },
    );
  }
}

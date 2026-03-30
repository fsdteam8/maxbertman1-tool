import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, parseInvoiceText } from "@/lib/invoice-parser";
import { normalizeInvoice } from "@/lib/invoice-normalizer";
import { buildProcessedInvoice } from "@/lib/invoice-transformer";
import { generateOverlaidPDF } from "@/lib/pdf-overlay";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/invoice/process-pdf
 *
 * Unified endpoint for the web tool.
 * Accepts FormData with:
 *   - file: PDF file (required)
 *   - poNumber: string (optional)
 *
 * Pipeline: parse → normalize → transform (1% markup + PO) → overlay → return PDF
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const poNumber = (formData.get("poNumber") as string) || undefined;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 },
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { success: false, error: "Only PDF files are supported" },
        { status: 400 },
      );
    }

    // 1. Read original PDF bytes
    const originalBuffer = Buffer.from(await file.arrayBuffer());

    // 2. Extract text + coordinates
    const extractedContent = await extractTextFromPDF(originalBuffer);

    // 3. Parse and normalize
    const parsed = parseInvoiceText(extractedContent);
    const normalized = normalizeInvoice(parsed);

    // 4. Apply business rules (1% markup + PO replacement)
    const processed = buildProcessedInvoice(normalized, poNumber);

    // 5. Generate overlay PDF
    const overlaidPdf = await generateOverlaidPDF(
      originalBuffer,
      normalized,
      processed.markedUp,
    );

    // 6. Return the modified PDF
    const filename = normalized.invoiceNumber
      ? `Invoice_${normalized.invoiceNumber}_Processed.pdf`
      : "Processed_Invoice.pdf";

    return new NextResponse(new Uint8Array(overlaidPdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": overlaidPdf.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("[api/invoice/process-pdf] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process invoice" },
      { status: 500 },
    );
  }
}

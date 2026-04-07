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
    console.log("[API] process-pdf POST request received");
    
    const formData = await req.formData();
    console.log("[API] FormData parsed");
    
    const file = formData.get("file") as File | null;
    const poNumber = (formData.get("poNumber") as string) || undefined;
    const woNumber = (formData.get("woNumber") as string) || undefined;

    console.log("[API] File:", file?.name, file?.type, file?.size, "bytes");
    console.log("[API] PO:", poNumber || "(not provided)");
    console.log("[API] W.O:", woNumber || "(not provided)");

    if (!file) {
      console.error("[API] No file provided");
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 },
      );
    }

    // Validate PDF - accept both by MIME type and by file extension
    const isPDF =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPDF) {
      console.error("[API] Invalid file type:", file.type, "name:", file.name);
      return NextResponse.json(
        { success: false, error: "Only PDF files are supported" },
        { status: 400 },
      );
    }

    // 1. Read original PDF bytes
    console.log("[API] Reading PDF buffer...");
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    console.log("[API] PDF buffer read, size:", originalBuffer.length);

    // 2. Extract text + coordinates
    console.log("[API] Extracting text from PDF...");
    const extractedContent = await extractTextFromPDF(originalBuffer);
    console.log("[API] Text extracted, length:", extractedContent.rawText.length);

    // 3. Parse and normalize
    console.log("[API] Parsing invoice text...");
    const parsed = parseInvoiceText(extractedContent);
    console.log("[API] Invoice parsed, items:", parsed.lineItems.length);
    
    const normalized = normalizeInvoice(parsed);
    console.log("[API] Invoice normalized");

    // 4. Apply business rules (1% markup + PO/WO replacement)
    console.log("[API] Building processed invoice...");
    const processed = buildProcessedInvoice(normalized, poNumber, woNumber);
    console.log("[API] Processed invoice built, PO applied:", processed.poReplacementApplied, "W.O applied:", processed.woReplacementApplied);

    // 5. Generate overlay PDF
    console.log("[API] Generating overlay PDF...");
    const overlaidPdf = await generateOverlaidPDF(
      originalBuffer,
      normalized,
      processed.markedUp,
    );
    console.log("[API] Overlay PDF generated, size:", overlaidPdf.length);

    // 6. Return the modified PDF
    const filename = normalized.invoiceNumber
      ? `Invoice_${normalized.invoiceNumber}_Processed.pdf`
      : "Processed_Invoice.pdf";

    console.log("[API] Returning PDF with filename:", filename);
    return new NextResponse(new Uint8Array(overlaidPdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": overlaidPdf.length.toString(),
      },
    });
  } catch (error) {
    const errorDetail =
      error instanceof Error ? error.message : "Failed to process invoice";
    console.error("[api/invoice/process-pdf] Error:", errorDetail);
    console.error("[api/invoice/process-pdf] Stack:", error);
    return NextResponse.json(
      { success: false, error: errorDetail },
      { status: 500 },
    );
  }
}

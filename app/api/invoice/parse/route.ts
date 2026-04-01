import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, parseInvoiceText } from "@/lib/invoice-parser";
import { normalizeInvoice } from "@/lib/invoice-normalizer";
import { getLogoDataUrl } from "@/lib/logo-loader";
import type { InvoiceParseResult } from "@/types/invoice";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoice/parse
 *
 * Accepts a multipart/form-data request with an 'file' field (PDF).
 * Extracts text and parses it into a structured ParsedInvoice JSON.
 * Also returns the logo data URL for rendering in the generated PDF.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Only PDF files are supported" },
        { status: 400 },
      );
    }

    // Convert File to Buffer for processing
    const buffer = Buffer.from(await file.arrayBuffer());

    // Step 1: Extract raw text from PDF
    const rawText = await extractTextFromPDF(buffer);

    // Step 2: Parse text into structured fields
    const parsed = parseInvoiceText(rawText);

    // Step 3: Normalize data
    const normalized = normalizeInvoice(parsed);

    // Step 4: Get logo data URL (currently uses static logo, could extract from PDF)
    const logoDataUrl = getLogoDataUrl();

    const result: InvoiceParseResult = {
      success: true,
      invoice: normalized,
      logoDataUrl,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/invoice/parse] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to parse invoice",
      },
      { status: 500 },
    );
  }
}

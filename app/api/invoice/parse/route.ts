import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, parseInvoiceText } from "@/lib/invoice-parser";
import { normalizeInvoice } from "@/lib/invoice-normalizer";
import type { InvoiceParseResult } from "@/types/invoice";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoice/parse
 * 
 * Accepts a multipart/form-data request with an 'file' field (PDF).
 * Extracts text and parses it into a structured ParsedInvoice JSON.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Only PDF files are supported" },
        { status: 400 }
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

    const result: InvoiceParseResult = {
      success: true,
      invoice: normalized,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[api/invoice/parse] Fatal error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to parse invoice" },
      { status: 500 }
    );
  }
}

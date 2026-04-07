import { NextRequest, NextResponse } from "next/server";
import { buildProcessedInvoice } from "@/lib/invoice-transformer";
import { processRequestSchema } from "@/lib/validators";
import type { InvoiceProcessResult } from "@/types/invoice";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoice/process
 *
 * Accepts ParsedInvoice + processing options (PO number, markup percent).
 * Returns a ProcessedInvoice JSON containing original vs marked-up versions.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request metadata
    // Enforce a fixed 1% markup regardless of request payload
    const { poNumber } = processRequestSchema.parse(body);
    const enforcedMarkupPercent = 1;

    // The invoice object itself is expected in the body
    const { invoice } = body;

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Missing invoice data" },
        { status: 400 },
      );
    }

    // Apply business rules: 1% markup and PO replacement
    const processed = buildProcessedInvoice(
      invoice,
      poNumber,
      enforcedMarkupPercent, // markupPercent parameter
      undefined, // invoiceDate parameter
      undefined, // dueDate parameter
    );

    const result: InvoiceProcessResult = {
      success: true,
      processed,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/invoice/process] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process invoice",
      },
      { status: 500 },
    );
  }
}

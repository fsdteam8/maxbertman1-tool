import { NextRequest, NextResponse } from "next/server";
import { validateInboundSender, parseSendGridWebhook, extractPOFromEmail, validateAttachment } from "@/lib/email-inbound";
import { extractTextFromPDF, parseInvoiceText } from "@/lib/invoice-parser";
import { normalizeInvoice } from "@/lib/invoice-normalizer";
import { buildProcessedInvoice } from "@/lib/invoice-transformer";
import { generateInvoicePDF } from "@/lib/invoice-generator";
import { sendProcessedInvoiceEmail, sendFailureEmail } from "@/lib/email-outbound";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for PDF processing + email
export const fetchCache = "force-no-store";

/**
 * POST /api/email/inbound
 * 
 * Target for inbound email webhooks (e.g. SendGrid Inbound Parse).
 * Processes the email, extracts PDF, applies markup/PO replacement,
 * and replies automatically with the updated PDF.
 */
export async function POST(req: NextRequest) {
  const trace: string[] = [];
  let senderEmail = "unknown";
  let messageId = "none";

  try {
    // 1. Parse Multipart Form Data (SendGrid format)
    const formData = await req.formData();
    const fields: Record<string, string> = {};
    const attachments: { filename: string; contentType: string; content: Buffer }[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        attachments.push({
          filename: value.name,
          contentType: value.type,
          content: Buffer.from(await value.arrayBuffer()),
        });
      } else {
        fields[key] = value as string;
      }
    }

    // 2. Normalise Inbound Payload
    let email;
    try {
      email = parseSendGridWebhook(fields as any, attachments as any);
    } catch (err: any) {
      trace.push(`Payload parsing failed: ${err.message}`);
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }

    senderEmail = email.fromAddress;
    messageId = email.messageId;
    trace.push(`Received email from ${senderEmail} with ${email.attachments.length} attachments.`);

    // 3. Validate Sender
    if (!validateInboundSender(senderEmail)) {
      const error = `Sender ${senderEmail} not in whitelist. Ignoring.`;
      trace.push(error);
      return NextResponse.json({ success: false, error }, { status: 401 });
    }

    // 4. Find valid PDF attachment
    const pdfAttachment = email.attachments.find(a => a.contentType === "application/pdf" || a.filename.toLowerCase().endsWith(".pdf"));
    if (!pdfAttachment) {
      const error = "No PDF attachment found in email.";
      trace.push(error);
      await sendFailureEmail(senderEmail, error, messageId);
      return NextResponse.json({ success: false, error });
    }

    trace.push(`Found PDF attachment: ${pdfAttachment.filename} (${pdfAttachment.size} bytes)`);

    const attachmentError = validateAttachment(pdfAttachment as any);
    if (attachmentError) {
      trace.push(`Attachment validation failed: ${attachmentError}`);
      await sendFailureEmail(senderEmail, attachmentError, messageId);
      return NextResponse.json({ success: false, error: attachmentError });
    }

    // 5. Extract Text and Parse Invoice
    trace.push("Extracting text from PDF via pdfjs-dist...");
    const extractedContent = await extractTextFromPDF(pdfAttachment.content as Buffer);
    trace.push(`Extracted ${extractedContent.items.length} text items from PDF.`);
    
    const parsed = parseInvoiceText(extractedContent);
    const normalized = normalizeInvoice(parsed);
    trace.push(`Parsed and normalized invoice. Invoice #: ${normalized.invoiceNumber || "unknown"}, Date: ${normalized.invoiceDate || "unknown"}`);

    if (normalized.lowConfidence) {
      trace.push("WARNING: Low extraction confidence. Some fields may be missing.");
    }

    // 6. Extract PO from Email content (subject/body)
    trace.push("Scanning email for PO number...");
    const poFromEmail = extractPOFromEmail(email.subject, email.bodyText);
    if (poFromEmail) {
      trace.push(`Extracted PO from email: ${poFromEmail}`);
    } else {
      trace.push("No PO number found in email subject or body.");
    }

    // 7. Apply Business Rules (1% Markup + PO Replacement)
    trace.push("Applying business rules (1% markup and PO replacement if available)...");
    const processed = buildProcessedInvoice(normalized, poFromEmail || undefined);
    
    if (processed.poReplacementApplied) {
      trace.push(`PO replacement applied successfully for PO: ${processed.replacementPoNumber}`);
    }
    
    if (processed.warnings.length > 0) {
      processed.warnings.forEach(w => trace.push(`Rule Warning: ${w}`));
    }

    // 8. Generate Updated PDF
    trace.push("Generating updated PDF with overlay...");
    const updatedPdfBuffer = await generateInvoicePDF(processed.markedUp, pdfAttachment.content as Buffer);
    trace.push(`Generated updated PDF (${updatedPdfBuffer.length} bytes).`);

    // 9. Send Reply Email
    trace.push(`Sending processed invoice email back to ${senderEmail}...`);
    await sendProcessedInvoiceEmail(
      senderEmail,
      normalized.invoiceNumber,
      updatedPdfBuffer,
      messageId
    );
    trace.push("Sent processed invoice reply email.");

    return NextResponse.json({ success: true, trace });
  } catch (error: any) {
    console.error("[api/email/inbound] Fatal processing error:", error);
    trace.push(`FATAL ERROR: ${error.message}`);
    
    // Attempt to send failure notification if we have a sender
    const errorDetail = error instanceof Error ? error.message : String(error);
    if (senderEmail !== "unknown") {
      await sendFailureEmail(
        senderEmail,
        `Invoice processing failed: ${errorDetail}`,
        messageId
      ).catch((e) => console.error("Failed to send failure email:", e));
    }

    return NextResponse.json(
      { success: false, error: error.message || "Internal processing error", trace },
      { status: 500 }
    );
  }
}

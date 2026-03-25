import { NextRequest, NextResponse } from "next/server";
import { validateInboundSender, parseSendGridWebhook, extractPOFromEmail, validateAttachment } from "@/lib/email-inbound";
import { extractTextFromPDF, parseInvoiceText } from "@/lib/invoice-parser";
import { normalizeInvoice } from "@/lib/invoice-normalizer";
import { buildProcessedInvoice } from "@/lib/invoice-transformer";
import { generateInvoicePDF } from "@/lib/invoice-generator";
import { sendProcessedInvoiceEmail, sendFailureEmail } from "@/lib/email-outbound";

export const dynamic = "force-dynamic";

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
      trace.push("Sender not in whitelist. Ignoring.");
      return NextResponse.json({ success: false, error: "Sender not authorized" }, { status: 401 });
    }

    // 4. Find valid PDF attachment
    const pdfAttachment = email.attachments.find(a => a.contentType === "application/pdf");
    if (!pdfAttachment) {
      const error = "No PDF attachment found in email.";
      trace.push(error);
      await sendFailureEmail(senderEmail, error, messageId);
      return NextResponse.json({ success: false, error });
    }

    const attachmentError = validateAttachment(pdfAttachment as any);
    if (attachmentError) {
      trace.push(attachmentError);
      await sendFailureEmail(senderEmail, attachmentError, messageId);
      return NextResponse.json({ success: false, error: attachmentError });
    }

    // 5. Extract Text and Parse Invoice
    trace.push("Extracting text from PDF...");
    const rawText = await extractTextFromPDF(pdfAttachment.content as Buffer);
    const parsed = parseInvoiceText(rawText);
    const normalized = normalizeInvoice(parsed);
    trace.push(`Parsed invoice #${normalized.invoiceNumber || "unknown"}.`);

    // 6. Extract PO from Email content (subject/body)
    const poFromEmail = extractPOFromEmail(email.subject, email.bodyText);
    if (poFromEmail) {
      trace.push(`Extracted PO from email: ${poFromEmail}`);
    }

    // 7. Apply Business Rules (1% Markup + PO Replacement)
    const processed = buildProcessedInvoice(normalized, poFromEmail || undefined);
    trace.push("Applied 1% markup and PO replacement.");

    // 8. Generate Updated PDF
    const updatedPdfBuffer = await generateInvoicePDF(processed.markedUp, pdfAttachment.content as Buffer);
    trace.push("Generated updated PDF.");

    // 9. Send Reply Email
    await sendProcessedInvoiceEmail(
      senderEmail,
      normalized.invoiceNumber,
      updatedPdfBuffer,
      messageId
    );
    trace.push("Sent processed invoice reply.");

    return NextResponse.json({ success: true, trace });
  } catch (error: any) {
    console.error("[api/email/inbound] Fatal processing error:", error);
    
    // Attempt to send failure notification if we have a sender
    if (senderEmail !== "unknown") {
      await sendFailureEmail(
        senderEmail,
        "A technical error occurred while processing your invoice.",
        messageId
      ).catch(() => {});
    }

    return NextResponse.json(
      { success: false, error: "Internal processing error", trace },
      { status: 500 }
    );
  }
}

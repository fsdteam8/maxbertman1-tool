/**
 * Outbound email service using Nodemailer.
 *
 * Requirements:
 * 1. Send processed invoice PDF as attachment.
 * 2. Support success/failure notifications.
 * 3. Use SMTP configuration from environment variables.
 */

import nodemailer from "nodemailer";
import type { OutboundEmailOptions } from "@/types/email";

// SMTP configuration from environment variables
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "user",
    pass: process.env.SMTP_PASS || "pass",
  },
};

const FROM_ADDRESS = process.env.SMTP_FROM || '"Invoice Automation" <noreply@example.com>';

/**
 * Send an email with optional attachments.
 */
export async function sendEmail({
  to,
  subject,
  bodyText,
  bodyHtml,
  attachments = [],
  replyToMessageId,
}: OutboundEmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  const extraHeaders: Record<string, string> = {};
  if (replyToMessageId) {
    extraHeaders["In-Reply-To"] = replyToMessageId;
    extraHeaders["References"] = replyToMessageId;
  }

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject,
    text: bodyText,
    html: bodyHtml,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
    headers: extraHeaders,
  });
}

/**
 * Send a success notification with the processed invoice attached.
 */
export async function sendProcessedInvoiceEmail(
  to: string,
  invoiceNumber: string | null,
  pdfBuffer: Buffer,
  replyToMessageId?: string
): Promise<void> {
  const subject = invoiceNumber 
    ? `Processed Invoice #${invoiceNumber}`
    : "Your Processed Invoice";

  const filename = invoiceNumber 
    ? `Invoice_${invoiceNumber}_Processed.pdf`
    : "Processed_Invoice.pdf";

  await sendEmail({
    to,
    subject,
    bodyText: `Your invoice has been processed successfully. The updated version with the 1% markup applied and PO information corrected is attached.`,
    bodyHtml: `
      <p>Your invoice has been processed successfully.</p>
      <p>The updated version with the <b>1% markup applied</b> and PO information corrected is attached.</p>
    `,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
    replyToMessageId,
  });
}

/**
 * Send a failure notification when an invoice cannot be processed automatically.
 */
export async function sendFailureEmail(
  to: string,
  error: string,
  replyToMessageId?: string
): Promise<void> {
  await sendEmail({
    to,
    subject: "Invoice Processing Failed",
    bodyText: `We could not process your invoice automatically. Error: ${error}\n\nPlease verify the file format or use the manual upload tool at http://yourdomain.com/tool`,
    bodyHtml: `
      <p>We could not process your invoice automatically.</p>
      <p style="color: #dc2626;"><b>Error:</b> ${error}</p>
      <p>Please verify the file format or use the <a href="http://yourdomain.com/tool">manual upload tool</a>.</p>
    `,
    replyToMessageId,
  });
}

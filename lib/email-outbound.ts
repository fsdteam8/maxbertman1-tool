/**
 * Outbound email service using SendGrid API.
 *
 * Requirements:
 * 1. Send processed invoice PDF as attachment.
 * 2. Support success/failure notifications.
 * 3. Uses SendGrid API for reliable delivery from serverless (Vercel).
 */

import sgMail from "@sendgrid/mail";
import type { OutboundEmailOptions } from "@/types/email";

// Initialise SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const FROM_ADDRESS = process.env.EMAIL_FROM || "notifications@system4sneai.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

/**
 * Send an email with optional attachments via SendGrid.
 */
export async function sendEmail({
  to,
  subject,
  bodyText,
  bodyHtml,
  attachments = [],
  replyToMessageId,
}: OutboundEmailOptions): Promise<void> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY is not configured. Cannot send email.");
  }

  console.log(`[email-outbound] Sending email to ${to} | subject: "${subject}"`);

  const msg: sgMail.MailDataRequired = {
    to,
    from: FROM_ADDRESS,
    subject,
    text: bodyText,
    html: bodyHtml || bodyText,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content)
        ? a.content.toString("base64")
        : a.content,
      type: a.contentType,
      disposition: "attachment" as const,
    })),
  };

  if (replyToMessageId) {
    msg.headers = {
      "In-Reply-To": replyToMessageId,
      References: replyToMessageId,
    };
  }

  try {
    const [response] = await sgMail.send(msg);
    console.log(`[email-outbound] Email sent. Status: ${response.statusCode}, Headers: x-message-id=${response.headers?.["x-message-id"] || "n/a"}`);
  } catch (error: any) {
    const details = error?.response?.body?.errors
      ? JSON.stringify(error.response.body.errors)
      : error.message;
    console.error(`[email-outbound] SendGrid send failed:`, details);
    throw new Error(`Email delivery failed: ${details}`);
  }
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
    bodyText: `We could not process your invoice automatically. Error: ${error}\n\nPlease verify the file format or use the manual upload tool at ${BASE_URL}/tool`,
    bodyHtml: `
      <p>We could not process your invoice automatically.</p>
      <p style="color: #dc2626;"><b>Error:</b> ${error}</p>
      <p>Please verify the file format or use the <a href="${BASE_URL}/tool">manual upload tool</a>.</p>
    `,
    replyToMessageId,
  });
}

/**
 * Inbound email handler.
 *
 * Architecture is provider-agnostic: normalise from SendGrid/Postmark/Mailgun
 * webhooks or IMAP polling into a common InboundEmailPayload shape.
 *
 * To swap providers, replace the parse* functions below without touching
 * the processing pipeline.
 */

import type { InboundEmailPayload, EmailAttachment } from "@/types/email";

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */

const MAX_ATTACHMENT_BYTES = parseInt(
  process.env.MAX_ATTACHMENT_BYTES ?? String(20 * 1024 * 1024),
  10
);

const MAX_ATTACHMENTS = parseInt(process.env.MAX_ATTACHMENTS ?? "3", 10);

const ALLOWED_SENDERS_RAW = process.env.ALLOWED_SENDERS ?? "";

const ALLOWED_SENDERS: string[] = ALLOWED_SENDERS_RAW
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const ALLOW_ALL_SENDERS =
  ALLOWED_SENDERS.length === 0 || ALLOWED_SENDERS.includes("*");

/* -------------------------------------------------------------------------- */
/*                            SENDER VALIDATION                               */
/* -------------------------------------------------------------------------- */

/**
 * Validate that the inbound sender is allowed.
 * Supports wildcard (*) and empty configuration.
 */
export function validateInboundSender(fromAddress: string): boolean {
  if (ALLOW_ALL_SENDERS) return true;

  return ALLOWED_SENDERS.includes(fromAddress.toLowerCase());
}

/* -------------------------------------------------------------------------- */
/*                           SENDGRID WEBHOOK PARSER                          */
/* -------------------------------------------------------------------------- */

/**
 * Parse a raw SendGrid inbound parse webhook body into a normalised payload.
 * SendGrid sends multipart form data; Next.js route handler should parse it first.
 */
export function parseSendGridWebhook(
  fields: Record<string, string | string[]>,
  attachments: { filename: string; contentType: string; content: Buffer }[]
): InboundEmailPayload {
  const get = (k: string) =>
    Array.isArray(fields[k]) ? fields[k][0] : fields[k] ?? "";

  const attachmentCount = parseInt(get("attachments") || "0", 10);
  if (attachmentCount > MAX_ATTACHMENTS || attachments.length > MAX_ATTACHMENTS) {
    throw new Error(`Too many attachments (received ${Math.max(attachmentCount, attachments.length)}, max ${MAX_ATTACHMENTS}).`);
  }

  return {
    messageId: get("id") || `sg-${Date.now()}`,
    fromAddress: extractEmailAddress(get("from")),
    fromName: extractDisplayName(get("from")),
    toAddress: extractEmailAddress(get("to")),
    subject: get("subject"),
    bodyText: get("text"),
    bodyHtml: get("html") || null,
    receivedAt: new Date().toISOString(),
    attachments: attachments.map((a) => ({
      ...a,
      size: a.content.length,
    })),
    rawPayload: fields,
  };
}

/* -------------------------------------------------------------------------- */
/*                         GENERIC PROVIDER PARSER                            */
/* -------------------------------------------------------------------------- */

/**
 * Generic parser for minimal webhook body from any provider.
 * Falls back gracefully when fields are missing.
 */
export function parseGenericWebhook(body: unknown): InboundEmailPayload {
  const b = (body ?? {}) as Record<string, unknown>;

  return {
    messageId: String(b.messageId ?? b.id ?? `msg-${Date.now()}`),
    fromAddress: extractEmailAddress(String(b.from ?? b.fromAddress ?? "")),
    fromName: extractDisplayName(String(b.from ?? b.fromAddress ?? "")),
    toAddress: extractEmailAddress(String(b.to ?? b.toAddress ?? "")),
    subject: String(b.subject ?? ""),
    bodyText: String(b.text ?? b.body ?? b.bodyText ?? ""),
    bodyHtml: b.html ? String(b.html) : null,
    receivedAt: String(b.receivedAt ?? new Date().toISOString()),
    attachments: [],
    rawPayload: body,
  };
}

/* -------------------------------------------------------------------------- */
/*                           ATTACHMENT VALIDATION                            */
/* -------------------------------------------------------------------------- */

/**
 * Validate an attachment before processing it.
 * Returns an error string or null if valid.
 */
export function validateAttachment(attachment: EmailAttachment): string | null {
  const isPdf =
    attachment.contentType === "application/pdf" ||
    attachment.filename?.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return `Unsupported file type: ${attachment.contentType} (${attachment.filename}). Only PDF files are accepted.`;
  }

  if (attachment.size > MAX_ATTACHMENT_BYTES) {
    const mb = Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024);
    return `Attachment too large (max ${mb} MB).`;
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function extractEmailAddress(raw: string): string {
  const match = /<([^>]+)>/.exec(raw);
  return match ? match[1].trim() : raw.trim();
}

function extractDisplayName(raw: string): string | null {
  const match = /^([^<]+)</.exec(raw);
  return match ? match[1].trim() : null;
}

/* -------------------------------------------------------------------------- */
/*                             PO NUMBER EXTRACTION                           */
/* -------------------------------------------------------------------------- */

/**
 * Extract a PO number from email subject or body.
 * Supported patterns:
 *
 * PO: 12345
 * PO# 12345
 * PO Number: 12345
 */
export function extractPOFromEmail(
  subject: string,
  body: string
): string | null {
  const combined = `${subject}\n${body}`;

  // More robust regex for PO extraction
  // Handles: PO: 12345, PO# 12345, PO Number: 12345, Purchase Order: 12345, PO 12345
  // Updated to avoid picking up arbitrary numbers by requiring a PO-related prefix
  const match = /(?:PO|Purchase\s*Order)(?:#|:|Number)?[\s:]*([A-Za-z0-9\-\/\.]+)/i.exec(combined);

  return match ? match[1].trim() : null;
}

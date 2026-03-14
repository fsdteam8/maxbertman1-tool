// ─────────────────────────────────────────────
// Email types for automation pipeline
// ─────────────────────────────────────────────

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer | string; // Buffer for binary, base64 string from webhooks
  size: number;
}

/** Generic inbound email shape — normalised from webhook or IMAP polling */
export interface InboundEmailPayload {
  messageId: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: string; // ISO string
  attachments: EmailAttachment[];
  /** Raw provider-specific payload preserved for debugging */
  rawPayload?: unknown;
}

/** Options for sending an outbound email */
export interface OutboundEmailOptions {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments?: OutboundAttachment[];
  replyToMessageId?: string;
}

export interface OutboundAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

/** Result from the email processing pipeline */
export interface EmailProcessingResult {
  success: boolean;
  invoiceNumber?: string | null;
  messageId?: string;
  error?: string;
  /** Human-readable step-by-step trace for logging */
  trace: string[];
}

/** Inbound webhook shape from providers like SendGrid, Postmark, Mailgun */
export interface SendGridInboundPayload {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: number;
  [key: `attachment${number}`]: string;
  [key: string]: unknown;
}

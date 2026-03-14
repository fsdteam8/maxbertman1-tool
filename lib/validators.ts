import { z } from "zod";

// ─────────────────────────────────────────────
// File Upload
// ─────────────────────────────────────────────

export const uploadFileSchema = z.object({
  name: z.string().min(1, "Filename is required"),
  type: z.literal("application/pdf", {
    errorMap: () => ({ message: "Only PDF files are supported" }),
  }),
  size: z
    .number()
    .max(20 * 1024 * 1024, "File must be smaller than 20 MB")
    .positive("File size must be positive"),
});

// ─────────────────────────────────────────────
// PO Number Input
// ─────────────────────────────────────────────

export const poInputSchema = z.object({
  poNumber: z
    .string()
    .min(1, "PO number is required")
    .max(64, "PO number is too long")
    .regex(/^[\w\-\/\.]+$/, "PO number may only contain letters, numbers, hyphens, slashes, and dots"),
  applyReplacement: z.boolean().default(true),
});

export type POInputValues = z.infer<typeof poInputSchema>;

// ─────────────────────────────────────────────
// Manual correction of extracted invoice fields
// ─────────────────────────────────────────────

export const manualCorrectionSchema = z.object({
  invoiceNumber: z.string().optional(),
  customerNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  balanceDue: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v.replace(/[$,]/g, "")) : undefined))
    .pipe(z.number().positive().optional()),
  issuerName: z.string().optional(),
  billToName: z.string().optional(),
});

export type ManualCorrectionValues = z.infer<typeof manualCorrectionSchema>;

// ─────────────────────────────────────────────
// Process Request Payload (API)
// ─────────────────────────────────────────────

export const processRequestSchema = z.object({
  markupPercent: z.number().min(0).max(100).default(1),
  poNumber: z.string().max(64).optional(),
});

// ─────────────────────────────────────────────
// Email Metadata Validation
// ─────────────────────────────────────────────

export const emailMetadataSchema = z.object({
  from: z.string().email("Invalid sender email"),
  to: z.string().email("Invalid recipient email"),
  subject: z.string().min(1, "Email subject is required"),
  messageId: z.string().min(1),
});

export type EmailMetadataValues = z.infer<typeof emailMetadataSchema>;

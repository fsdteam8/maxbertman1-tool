/**
 * Invoice PDF Generator — Overlay-based approach.
 *
 * Instead of regenerating the PDF from scratch, this module overlays
 * changes on the original PDF using pdf-lib, preserving all original
 * formatting, fonts, and layout.
 *
 * The old @react-pdf/renderer approach has been replaced entirely.
 */

export { generateOverlaidPDF } from "@/lib/pdf-overlay";


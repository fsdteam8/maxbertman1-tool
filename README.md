# Invoice Automation Tool

A high-fidelity invoice processing system that automates markup applications and Purchase Order (PO) corrections via email webhooks.

## 🚀 Purpose
This tool is designed for staff members to automate the tedious process of updating invoices. 
1. **Staff emails** an invoice PDF to a dedicated address.
2. **System automatically** extracts data, applies a 1% markup, and replaces "Pending PO" placeholders with the correct PO number.
3. **Staff receives** an updated, professional PDF reply within seconds.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **PDF Engine**: `pdf-lib` (Generation/Overlay) & `pdfjs-dist` (Parsing)
- **Email Service**: SendGrid (Inbound Parse + Outbound Mail)
- **Validation**: Zod
- **Styling**: Tailwind CSS + Radix UI

---

## 📋 Features & Business Rules
- **1% Markup**: Automatically applied to Subtotal, Tax, and Total fields.
- **PO Correction**: Scans email subject/body for a PO number (e.g., `PO# 12345`) and replaces "Pending Purchase Order" text inside the PDF.
- **High-Fidelity Overlay**: Uses geometric coordinate mapping to draw over the original PDF, preserving the exact layout and branding of the source document.
- **Automated Logging**: Full execution trace returned in webhook responses for easy debugging.

---

## ⚙️ Setup & Configuration

### 1. Environment Variables
Copy `.env.example` to `.env.local` and fill in the following:
```env
# SendGrid API Key for outbound replies
SENDGRID_API_KEY=SG.xxx

# Verified sender for SendGrid
EMAIL_FROM="Invoice Processor" <invoices@yourdomain.com>

# Whitelist of staff emails allowed to trigger the tool
ALLOWED_SENDERS=staff@yourdomain.com,admin@yourdomain.com

# Base URL for link generation
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

### 2. SendGrid Inbound Parse
To enable fully automated email processing:
1. Go to **SendGrid Dashboard** -> **Settings** -> **Inbound Parse**.
2. Add a Host & URL.
3. Set the **Destination URL** to: `https://your-domain.com/api/email/inbound`.
4. Point your MX record for that subdomain to `mx.sendgrid.net`.

---

## 🔄 User Flow (Sequence)

1. **Email Intake**: Staff sends email to `processor@your-subdomain.com` with an invoice attached.
2. **Webhook Trigger**: SendGrid receives the email and POSTs a multipart payload to `/api/email/inbound`.
3. **Data Extraction**:
   - PDF text is parsed to find "Pending PO" text and monetary totals.
   - Email subject is scanned for a valid PO number.
4. **Processing**:
   - Numeric values are multiplied by 1.01 and rounded.
   - PO placeholder is swapped with the real PO number.
5. **PDF Generation**: A new PDF is generated using an **Overlay Strategy** (drawing white boxes over old text and rendering new values at exact coordinates).
6. **Delivery**: The updated PDF is emailed back to the original sender as a reply.

---

## 🧪 Testing Locally
You can simulate an inbound webhook using the provided test script:
```bash
# Ensure your local server is running (usually on port 3000 or 3002)
npx ts-node scripts/test-inbound-webhook.ts
```

## 🛡️ Security & Validation
- **Sender Whitelist**: Only authorized emails can trigger processing.
- **Size Limits**: Attachments capped at 20MB.
- **Type Safety**: PDFs are validated for integrity before parsing.

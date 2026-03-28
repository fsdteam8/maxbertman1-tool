# User Manual: Email Invoice Automation

Automate your invoice processing by simply sending an email. Our system will extract the data, apply a 1% markup, update the sales tax, and replace the Purchase Order (PO) number automatically.

## 🚀 Getting Started

1.  **Prepare your Invoice**: Ensure your invoice is in **PDF format**.
2.  **Send an Email**: Attach the PDF to an email and send it to the system's inbound address (e.g., `invoice@parse.system4sneai.com`).
3.  **Wait for the Result**: Within a minutes, you will receive a reply with the processed invoice attached.

---

## 🛠️ How it Works

### 1. Authorization

To prevent unauthorized usage, the system only processes emails from **whitelisted senders**.

> [!IMPORTANT]
> Ensure your email address is added to the `ALLOWED_SENDERS` whitelist in the system configuration.

### 2. Purchase Order (PO) Injection

You can specify a new PO number to replace the one in the original PDF by including it in the **Email Subject** or **Email Body**.

**Supported Formats:**

- `PO: 12345`
- `PO# 12345`
- `PO Number: 12345`
- `Purchase Order 12345`

### 3. Automatic Processing

The system performs the following actions:

- **1% Markup**: Increases the service subtotal by 1%.
- **Sales Tax Update**: Recalculates tax based on the new subtotal (preserving original tax presence).
- **PO Replacement**: Swaps the original PO number with the one found in your email.

---

## ✅ Response Emails

### Success

You will receive an email with the subject **"Processed Invoice #[Number]"**. The updated PDF will be attached, ready for use.

### Failure

If processing fails (e.g., no PDF found, unsupported format, or data validation error), you will receive a **"Invoice Processing Failed"** email explaining the issue.

---

## ⚠️ Troubleshooting

- **No Reply?** Check your Spam folder or verify that your email is whitelisted.
- **Multiple Files?** The system only processes the **first PDF attachment** found.
- **Low Confidence?** If the original PDF is low quality/scanned, extraction might be less accurate. Check the final PDF carefully.
- **Manual Fallback**: If email automation fails, use the [Manual Upload Tool](https://system4sneai.com/tool) to process your invoice via the web interface.

---

> [!TIP]
> For best results, ensure the PDF text is selectable (not an image-only scan).

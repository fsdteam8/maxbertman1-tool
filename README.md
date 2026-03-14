# Invoice Automation Tool

A production-ready, frontend-heavy invoice automation application built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **Industrial Dashboard**: Modern UI for manual PDF invoice processing.
- **Automated Email Workflow**: Inbound webhook processing via SendGrid.
- **Stateless Processing**: 1% markup application and PO placeholder replacement.
- **Professional Generation**: Recreates invoices as clean, standard PDFs.

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env.local` and fill in your SMTP/Security credentials.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Production Build**:
   ```bash
   npm run build
   ```

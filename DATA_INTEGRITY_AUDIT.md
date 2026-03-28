# Data Integrity Audit Report

## Executive Summary

Critical issues identified where hardcoded/dummy values are replacing actual uploaded data, preventing a fully data-driven invoice generation system.

---

## CRITICAL ISSUES

### 🔴 ISSUE #1: Tax Rate Forced to 1% (HIGHEST PRIORITY)

**File:** `lib/invoice-transformer.ts` (lines 59-87)  
**Severity:** CRITICAL - Alters extracted financial data

**Current Behavior:**

```typescript
// Strictly enforce 1.00% sales tax as per requirements
const taxRateToApply = 0.01; // ← HARDCODED 1%
const newTaxTotal = round2(newServiceTotal * taxRateToApply);
```

**Impact:**

- If invoice PDF has 6.35% tax (like invoice 48289), it gets **changed to 1%**
- If invoice has no tax, 1% is **injected artificially**
- Email and download reflect altered amounts, not source data
- Tax validation in normalizer warns about mismatch but is ignored

**Expected Behavior:**

- Should preserve original extracted tax rate from parsed invoice
- If no tax in source, should not inject tax
- If tax exists, should preserve its rate and amount

**Fix Required:**
Replace hardcoded `0.01` with `originalTaxRate` from extracted data

---

### 🔴 ISSUE #2: Hardcoded Company Defaults in PDF Generation

**File:** `components/InvoiceDocument.tsx` (lines 384-391)  
**Severity:** HIGH - Replaces actual company info with defaults

**Current Behavior:**

```typescript
const companyName = firstNonEmpty(invoice.issuerName, "System4 S.N.E.");
const companyEmail = firstNonEmpty(
  invoice.issuerEmail,
  "billing@system4ips.com",
);
const companyAddressParts = cleanLines(invoice.issuerAddressLines);
if (!companyAddressParts.length) {
  companyAddressParts.push("60 Romano Vineyard Way, #101");
  companyAddressParts.push("North Kingstown, RI 02852");
}
```

**Impact:**

- If issuer name missing → defaults to "System4 S.N.E."
- If issuer email missing → defaults to "billing@system4ips.com"
- If address missing → adds hardcoded RI address
- PDF generated with default data masks missing extraction

**Expected Behavior:**

- Render blank/placeholder if data missing
- Do NOT substitute with System4 branding unless explicitly configured
- Do NOT generate PDF with incomplete/wrong company info

**Fix Required:**
Remove all hardcoded fallbacks; validate required fields before PDF rendering

---

### 🔴 ISSUE #3: Hardcoded Remit Lines Fallback

**File:** `components/InvoiceDocument.tsx` (lines 423-429)  
**Severity:** HIGH - Synthetic data generation from defaults

**Current Behavior:**

```typescript
let remitLines = cleanLines(invoice.remitToLines);
if (!remitLines.length) {
  remitLines = [
    companyName, // Uses default from Issue #2
    ...companyAddressParts, // Uses default from Issue #2
    `Attn: ${companyEmail}`, // Uses default from Issue #2
    "Phone: (401) 615-7043", // HARDCODED phone
  ];
}
```

**Impact:**

- If remit lines missing → constructs synthetic address using defaults
- Phone number "(401) 615-7043" is hardcoded System4 number
- Email contains hardcoded System4 email if none extracted

**Expected Behavior:**

- Use extracted remit lines AS-IS
- If missing, either skip section or show placeholder
- Never invent address/phone from defaults

**Fix Required:**
Remove fallback construction; use extracted data only

---

## ACTION ITEMS (IN ORDER)

1. ✅ IDENTIFY - All hardcoded defaults found (this audit)
2. ⏳ FIX #1 - Remove 1% tax forcing in transformer
3. ⏳ FIX #2 - Remove company defaults in InvoiceDocument
4. ⏳ FIX #3 - Remove remit line fallback
5. ⏳ VALIDATE - Add data validation layer
6. ⏳ TEST - End-to-end pipeline verification

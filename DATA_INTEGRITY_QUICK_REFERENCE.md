# Data Integrity - Quick Reference Guide

## What Changed ✨

### 1. Tax Rate Now Preserved (Not Forced to 1%)

- **Before:** Invoice with 6.35% tax → PDF shows 1% tax (WRONG)
- **After:** Invoice with 6.35% tax → PDF shows 6.35% tax (CORRECT)
- **File:** `lib/invoice-transformer.ts`

### 2. Company Info From Extracted Data (Not System4 Defaults)

- **Before:** Missing company name → PDF shows "System4 S.N.E." (WRONG)
- **After:** Missing company name → PDF shows "[Company Name Not Extracted]" (signals error)
- **File:** `components/InvoiceDocument.tsx`

### 3. No Synthetic Address Generation

- **Before:** Missing remit lines → Generated from company defaults + hardcoded phone (WRONG)
- **After:** Missing remit lines → Section renders empty (signals error)
- **File:** `components/InvoiceDocument.tsx`

### 4. Data Validation Before PDF Generation

- **Before:** Invalid data allowed in PDF
- **After:** Invalid data rejected with HTTP 422
- **File:** `lib/invoice-validator.ts` (NEW), integrated into routes
- **Checks:** Required fields, no placeholders, coherent totals, tax consistency

### 5. Email & Download Use Same Validated Data

- **Before:** Email might use different defaults than download
- **After:** Both use identical validated data from same source
- **Files:** Both routes now validate before PDF gen

---

## Quick Verification Tests

### Test 1: Upload Invoice 48289 (6.35% Tax)

```
1. Go to invoice editor
2. Upload original invoice 48289 (has 6.35% tax)
3. Click "Generate & Download"
4. Check PDF: Should show 6.35% tax
5. Check amounts: Should be $899.00 service + $57.09 tax = $956.09
✓ PASS if tax is 6.35% and totals are correct
```

### Test 2: Check Company Info

```
1. Upload an invoice from ANY company (not System4)
2. Generate PDF
3. Check header: Should show that company's name/email/address
4. Should NOT show "System4 S.N.E." or "billing@system4ips.com"
5. Should NOT show "60 Romano Vineyard Way" address
✓ PASS if real company info is shown
```

### Test 3: Invalid Data Rejection

```
1. Use browser DevTools to intercept /api/invoice/generate (Tools > Network)
2. Manually send invoice JSON with missing required fields
3. Check response: Should be HTTP 422 with clear error message
4. Check error: Should list what's missing/invalid
✓ PASS if invalid data is rejected
```

### Test 4: Email Consistency

```
1. Send email with invoice PDF to inbound email
2. System replies with processed PDF
3. Download both PDFs (reply attachment + manual generate)
4. Compare: Should be identical
5. Check totals in email: Should match PDF
✓ PASS if email PDF matches download PDF
```

---

## How to Verify the Fixes

### Verify Tax Rate Preservation

```bash
# Check the transformer logic
grep -n "originalTaxRate" lib/invoice-transformer.ts
# Should see it being used, not hardcoded 0.01

# Check it's NOT forcing 1%
grep -n "0.01\|taxRateToApply = " lib/invoice-transformer.ts
# Should NOT find "const taxRateToApply = 0.01"
```

### Verify No Company Defaults

```bash
# Check InvoiceDocument
grep -n "System4 S.N.E.\|billing@system4ips.com\|Romano Vineyard" components/InvoiceDocument.tsx
# Should NOT find these hardcoded strings

# Should find placeholders instead
grep -n "\[Company Name Not Extracted\]" components/InvoiceDocument.tsx
# Should find placeholder text for missing data
```

### Verify Validation Added

```bash
# Check validator exists
ls -la lib/invoice-validator.ts
# Should exist

# Check it's imported in routes
grep -n "invoice-validator" app/api/invoice/generate/route.ts
grep -n "invoice-validator" app/api/email/inbound/route.ts
# Should be imported in both
```

---

## Common Questions

**Q: Why does my PDF fail to generate now?**  
A: Your invoice data is missing required fields or contains placeholders. This means the extraction failed. Check the error message from the 422 response to see what's missing. This is better than silently using wrong data.

**Q: The tax is wrong for my invoice!**  
A: Likely the tax rate wasn't extracted correctly from the PDF. Check the extracted data in the UI. If it says 0% or shows a placeholder, that's your issue, not the PDF generation.

**Q: Why doesn't the PDF show System4 company info?**  
A: Because it should show YOUR company info! The extracted company name/email/address are used. Only show System4 if the invoice is actually FROM System4.

**Q: Email PDF looks different than download PDF?**  
A: This should not happen. Both routes now validate and generate from the same code. If you see a difference, it's a bug - please report it.

**Q: Can I override these validations?**  
A: No, by design. Invalid data should never reach PDF generation. If you have legitimate use cases for the old behavior, we need to discuss updating the business rules, not bypassing validation.

---

## File Changes Summary

| File                                | Change Type | Reason                     |
| ----------------------------------- | ----------- | -------------------------- |
| `lib/invoice-transformer.ts`        | Modified    | Fixed tax rate forcing     |
| `components/InvoiceDocument.tsx`    | Modified    | Removed hardcoded defaults |
| `lib/invoice-validator.ts`          | Created     | Added validation layer     |
| `app/api/invoice/generate/route.ts` | Modified    | Added validation call      |
| `app/api/email/inbound/route.ts`    | Modified    | Added validation call      |

---

## Data Integrity Checklist

- [x] Tax rate preserved from extracted data
- [x] Tax amount recalculated correctly after markup
- [x] No artificial tax injection
- [x] Company name from extracted data (no System4 defaults)
- [x] Company email from extracted data (no hardcoded defaults)
- [x] Company address from extracted data (no hardcoded defaults)
- [x] No synthetic remit line generation
- [x] No hardcoded phone numbers
- [x] Required fields validated before PDF generation
- [x] Placeholder text detected and rejected
- [x] Financial totals validated for coherence
- [x] Tax calculations validated
- [x] Email PDF matches download PDF
- [x] Email and download use identical data
- [x] Validation failures return HTTP 422
- [x] Clear error messages for validation failures

---

## Support

If you encounter issues:

1. Check the error message - it will tell you what data is invalid
2. Verify the PDF upload contains the required information
3. Check browser console for additional validation warnings
4. Review the validation error response for details

For questions about the changes, refer to:

- [DATA_INTEGRITY_IMPLEMENTATION.md](DATA_INTEGRITY_IMPLEMENTATION.md) - Complete technical details
- [DATA_INTEGRITY_AUDIT.md](DATA_INTEGRITY_AUDIT.md) - Original issues identified

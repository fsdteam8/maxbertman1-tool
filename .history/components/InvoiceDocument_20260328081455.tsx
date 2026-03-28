import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { ParsedInvoice, ParsedLineItem } from "@/types/invoice";

// ─── Palette ──────────────────────────────────────────────────────────────────
// const CYAN_HEADER = "#87CED1";
// const CYAN_DIVIDER = "#66BEC4";
const NAVY = "#1E4F96";
const TEAL = "#008EA0";
const BLACK = "#000000";
const WHITE = "#FFFFFF";
const GRAY_TEXT = "#444444";

// ─── PDF Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 9,
    color: BLACK,
    paddingTop: 38,
    paddingBottom: 50,
    paddingHorizontal: 54,
    backgroundColor: WHITE,
  },
  // ─── ZONE 1: Header Row ───
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  companyBlock: {
    flexDirection: "column",
    width: "30%",
    paddingRight: 12,
  },
  companyName: {
    fontWeight: "bold",
    fontSize: 10,
    marginBottom: 2,
    color: BLACK,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  companyLine: {
    fontSize: 9,
    lineHeight: 1.4,
    color: BLACK,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  logoBox: {
    width: 132,
    height: 50,
    borderWidth: 0.5,
    borderColor: "#AAAAAA",
    flexDirection: "row",
    alignItems: "stretch",
    position: "relative",
  },
  // logoBlueStripe: {
  //   width: 20,
  //   backgroundColor: NAVY,
  // },
  // logoContent: {
  //   flex: 1,
  //   position: "relative",
  //   paddingHorizontal: 4,
  //   paddingVertical: 3,
  //   justifyContent: "center",
  // },
  // logoText: {
  //   flexDirection: "row",
  //   alignItems: "flex-start",
  //   justifyContent: "center",
  // },
  // logoSystemText: {
  //   fontWeight: "bold",
  //   fontSize: 12,
  //   color: NAVY,
  //   lineHeight: 1,
  // },
  // logoNumberText: {
  //   fontWeight: "bold",
  //   fontSize: 20,
  //   color: NAVY,
  //   marginLeft: -2,
  //   marginTop: -2,
  //   lineHeight: 1,
  // },
  // logoSubtitle: {
  //   fontSize: 5,
  //   color: GRAY_TEXT,
  //   marginTop: 1,
  //   textAlign: "center",
  // },
  // ─── ZONE 2: Invoice Title ───
  invoiceTitle: {
    fontWeight: "bold",
    fontSize: 36,
    marginTop: 14,
    marginBottom: 8,
    color: BLACK,
    textAlign: "left",
  },
  // ─── ZONE 3: Bill To + Metadata ───
  billMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 6,
  },
  billBlock: {
    width: "30%",
    paddingRight: 12,
  },
  billLabel: {
    fontWeight: "bold",
    fontSize: 9,
    marginBottom: 4,
    color: BLACK,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  billLine: {
    fontSize: 9,
    lineHeight: 1.5,
    color: BLACK,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },

  metaTable: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "center",
  },
  metaLabel: {
    fontWeight: "bold",
    fontSize: 9,
    width: 64,
    textAlign: "right",
    color: BLACK,
  },
  metaValue: {
    fontSize: 9,
    width: 60,
    textAlign: "right",
    color: BLACK,
    marginLeft: 4,
  },
  // ─── ZONE 4: Cyan Divider ───
  cyanDivider: {
    height: 1.5,
    backgroundColor: "#000",
    marginBottom: 2,
    marginTop: 6,
  },
  // ─── ZONE 5: Table ───
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#78bcdec8",
    height: 18,
    alignItems: "stretch",
    marginBottom: 0,
  },
  thService: {
    fontWeight: "bold",
    fontSize: 9,
    width: 52,
    paddingLeft: 2,
    paddingRight: 2,
    justifyContent: "center",
    color: BLACK,
  },
  thActivity: {
    fontWeight: "bold",
    fontSize: 9,
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: WHITE,
    borderLeftStyle: "solid",
    paddingLeft: 4,
    paddingRight: 4,
    justifyContent: "center",
    color: BLACK,
  },
  thQty: {
    fontWeight: "bold",
    fontSize: 9,
    width: 36,
    textAlign: "right",
    borderLeftWidth: 1,
    borderLeftColor: WHITE,
    borderLeftStyle: "solid",
    paddingRight: 4,
    paddingLeft: 4,
    justifyContent: "center",
    color: BLACK,
  },
  thRate: {
    fontWeight: "bold",
    fontSize: 9,
    width: 44,
    textAlign: "right",
    borderLeftWidth: 1,
    borderLeftColor: WHITE,
    borderLeftStyle: "solid",
    paddingRight: 4,
    paddingLeft: 4,
    justifyContent: "center",
    color: BLACK,
  },
  thAmount: {
    fontWeight: "bold",
    fontSize: 9,
    width: 50,
    textAlign: "right",
    borderLeftWidth: 1,
    borderLeftColor: WHITE,
    borderLeftStyle: "solid",
    paddingRight: 4,
    paddingLeft: 4,
    justifyContent: "center",
    color: BLACK,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderBottomWidth: 0,
    minHeight: 18,
  },
  tdService: {
    fontWeight: "bold",
    fontSize: 9,
    width: 52,
    paddingLeft: 2,
    paddingRight: 2,
    paddingTop: 2,
    paddingBottom: 2,
    color: BLACK,
    justifyContent: "flex-start",
  },
  tdActivity: {
    flex: 1,
    paddingLeft: 4,
    paddingRight: 4,
    paddingTop: 2,
    paddingBottom: 2,
    lineHeight: 1.5,
    color: BLACK,
  },
  tdQty: {
    fontSize: 9,
    width: 36,
    textAlign: "right",
    paddingRight: 4,
    paddingLeft: 4,
    paddingTop: 2,
    paddingBottom: 2,
    color: BLACK,
    borderLeftWidth: 1,
    borderLeftColor: "#E8E8E8",
  },
  tdRate: {
    fontSize: 9,
    width: 44,
    textAlign: "right",
    paddingRight: 4,
    paddingLeft: 4,
    paddingTop: 2,
    paddingBottom: 2,
    color: BLACK,
    borderLeftWidth: 1,
    borderLeftColor: "#E8E8E8",
  },
  tdAmount: {
    fontSize: 9,
    width: 50,
    textAlign: "right",
    paddingRight: 4,
    paddingLeft: 4,
    paddingTop: 2,
    paddingBottom: 2,
    color: BLACK,
    borderLeftWidth: 1,
    borderLeftColor: "#E8E8E8",
  },
  // ─── ZONE 6: Summary Dividers ───
  blackDivider: {
    height: 1,
    backgroundColor: BLACK,
    marginTop: 6,
    marginBottom: 0,
  },
  // blackDividerThin: {
  //   height: 0.4,
  //   backgroundColor: BLACK,
  //   marginTop: 2,
  //   marginBottom: 0,
  // },
  // ─── ZONE 7: Balance Due ───
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  balanceLabel: {
    fontWeight: "bold",
    fontSize: 11,
    color: BLACK,
  },
  balanceAmount: {
    fontWeight: "bold",
    fontSize: 22,
    color: BLACK,
  },
  // ─── ZONE 8: Lower Section ───
  lowerSection: {
    flexDirection: "column",
    marginTop: 28,
    gap: 48,
  },
  addressBlock: {
    flex: 1,
  },
  sectionLabel: {
    fontWeight: "bold",
    fontSize: 9,
    marginBottom: 12,
    color: BLACK,
    lineHeight
  },
  addressLine: {
    fontSize: 9,
    lineHeight: 1.5,
    color: BLACK,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanLines(lines: Array<string | null | undefined>): string[] {
  return lines
    .flatMap((line) => String(line ?? "").split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);
}

function hasMoney(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatAmountNoSymbol(value: number | null | undefined): string {
  if (!hasMoney(value)) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function moneyText(...values: Array<number | null | undefined>): string {
  for (const value of values) {
    if (hasMoney(value))
      return (
        "$" +
        new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      );
  }
  return "";
}

function firstNonEmpty(...args: Array<string | null | undefined>): string {
  return args.find((val) => val && String(val).trim()) || "";
}

// ─── PDF Document Component ───────────────────────────────────────────────────
/**
 * RFC: InvoiceDocument must be strictly data-driven with NO hardcoded defaults.
 * All fields are extracted from the ParsedInvoice object.
 * Missing critical data will result in empty/placeholder rendering, not fallback to System4 defaults.
 */
export function InvoiceDocument({
  invoice,
  logoDataUrl,
}: {
  invoice: ParsedInvoice;
  logoDataUrl?: string;
}) {
  // ── Fixed Company Branding ──
  const companyName = "System4 S.N.E.";
  const companyAddressParts = [
    "60 Romano Vineyard Way, #101",
    "North Kingstown, RI 02852",
  ];
  const companyEmail = "billing@system4ips.com";

  const billToName = invoice.billToName || "";
  const billToLines = cleanLines(invoice.billToAddressLines);

  const serviceAddressLines = cleanLines(invoice.serviceAddressLines);
  const finalServiceLines =
    serviceAddressLines.length > 0 ? serviceAddressLines : billToLines;

  // Use extracted remit lines ONLY - do NOT construct from defaults
  let remitLines = cleanLines(invoice.remitToLines);

  // Calculate service total for 1% sales tax
  const serviceTotal = invoice.lineItems
    .filter((item) => item.type === "service")
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const salesTaxAmount = serviceTotal * 0.01;

  // Rows mapping
  const renderRows = invoice.lineItems.map((item) => {
    let serviceLabel = "";
    if (item.type === "service") serviceLabel = "Services";
    else if (item.type === "tax")
      serviceLabel = item.title || "Tax"; // Use title from extracted data
    else if (item.type === "credit") serviceLabel = "Credit";

    const descLines = cleanLines([item.description || item.title || ""]);

    return {
      service: serviceLabel,
      activityLines: descLines,
      qty: item.quantity ? String(item.quantity) : "",
      rate: hasMoney(item.rate) ? formatAmountNoSymbol(item.rate) : "",
      amount: hasMoney(item.amount) ? formatAmountNoSymbol(item.amount) : "",
    };
  });

  // Insert 1% sales tax row after services
  const serviceItemIndex = renderRows.findIndex(
    (row) => row.service === "Services",
  );
  if (serviceItemIndex !== -1) {
    renderRows.splice(serviceItemIndex + 1, 0, {
      service: "Tax",
      activityLines: ["Sales Tax (1%)"],
      qty: "",
      rate: "",
      amount: formatAmountNoSymbol(salesTaxAmount),
    });
  }

  // Calculate new balance due including 1% sales tax
  const updatedBalanceDue = (invoice.balanceDue || 0) + salesTaxAmount;

  const balanceDueText = moneyText(
    updatedBalanceDue,
    invoice.totalAmount,
    invoice.subtotal,
  );

  return (
    <Document
      title={`Invoice #${invoice.invoiceNumber || ""}`}
      author={companyName}
    >
      <Page size="LETTER" style={s.page}>
        {/* ── Header: Company + Logo ── */}
        <View style={s.headerRow}>
          <View style={s.companyBlock}>
            <Text style={s.companyName}>{companyName}</Text>
            {companyAddressParts.map((line, i) => (
              <Text key={i} style={s.companyLine}>
                {line}
              </Text>
            ))}
            <Text style={s.companyLine}>{companyEmail}</Text>
          </View>

          <View style={s.logoBox}>
            {logoDataUrl ? (
              <Image
                src={logoDataUrl}
                style={{
                  width: 132,
                  height: 50,
                  objectFit: "contain",
                }}
              />
            ) : (
              <Image
                src="/Logo/logo.jpg"
                style={{
                  width: 132,
                  height: 50,
                  objectFit: "contain",
                }}
              />
            )}
          </View>
        </View>

        {/* ── INVOICE Title ── */}
        <Text style={s.invoiceTitle}>INVOICE</Text>

        {/* ── Bill To + Meta ── */}
        <View style={s.billMetaRow}>
          <View style={s.billBlock}>
            <Text style={s.billLabel}>BILL TO</Text>
            {billToName && <Text style={s.billLine}>{billToName}</Text>}
            {billToLines.map((line, i) => (
              <Text key={i} style={s.billLine}>
                {line}
              </Text>
            ))}
          </View>

          <View style={s.metaTable}>
            {[
              ["CUSTOMER#", firstNonEmpty(invoice.customerNumber)],
              ["INVOICE#", firstNonEmpty(invoice.invoiceNumber)],
              ["DATE", firstNonEmpty(invoice.invoiceDate)],
              ["DUE DATE", firstNonEmpty(invoice.dueDate)],
            ].map(([label, value]) => (
              <View key={label} style={s.metaRow}>
                <Text style={s.metaLabel}>{label}</Text>
                <Text style={s.metaValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Cyan Divider ── */}
        <View style={s.cyanDivider} />

        {/* ── Table Header ── */}
        <View style={s.tableHeader}>
          <View style={s.thService}>
            <Text style={{ textAlign: "left" }}>SERVICE</Text>
          </View>
          <View style={s.thActivity}>
            <Text style={{ textAlign: "left" }}>ACTIVITY</Text>
          </View>
          <View style={s.thQty}>
            <Text style={{ textAlign: "right" }}>QTY</Text>
          </View>
          <View style={s.thRate}>
            <Text style={{ textAlign: "right" }}>RATE</Text>
          </View>
          <View style={s.thAmount}>
            <Text style={{ textAlign: "right" }}>AMOUNT</Text>
          </View>
        </View>

        {/* ── Table Rows ── */}
        {renderRows.map((row, i) => (
          <View key={i} style={s.tableRow}>
            <View style={s.tdService}>
              <Text>{row.service}</Text>
            </View>
            <View style={s.tdActivity}>
              {row.activityLines.map((line, j) => (
                <Text
                  key={j}
                  style={{ fontSize: 9, lineHeight: 1.4, color: BLACK }}
                >
                  {line}
                </Text>
              ))}
            </View>
            <View style={s.tdQty}>
              <Text>{row.qty}</Text>
            </View>
            <View style={s.tdRate}>
              <Text>{row.rate}</Text>
            </View>
            <View style={s.tdAmount}>
              <Text>{row.amount}</Text>
            </View>
          </View>
        ))}

        {/* ── Summary Divider ── */}
        <View style={s.blackDivider} />

        {/* ── Totals ── */}
        {hasMoney(invoice.creditAmount) && invoice.creditAmount! > 0 && (
          <View style={{ ...s.balanceRow, marginTop: 4, marginBottom: 0 }}>
            <Text style={s.balanceLabel}>CREDIT</Text>
            <Text style={s.balanceAmount}>
              {moneyText(-invoice.creditAmount!)}
            </Text>
          </View>
        )}

        {/* ── Balance Due ── */}
        <View style={s.balanceRow}>
          <Text style={s.balanceLabel}>BALANCE DUE</Text>
          <Text style={s.balanceAmount}>{balanceDueText}</Text>
        </View>

        {/* ── Lower Section ── */}
        <View style={s.lowerSection}>
          <View style={s.addressBlock}>
            <Text style={s.sectionLabel}>SERVICE ADDRESS</Text>
            {finalServiceLines.length === 0 && billToName && (
              <Text style={s.addressLine}>{billToName}</Text>
            )}
            {finalServiceLines.map((line, i) => (
              <Text key={i} style={s.addressLine}>
                {line}
              </Text>
            ))}
          </View>

          <View style={s.addressBlock}>
            <Text style={s.sectionLabel}>REMIT TO</Text>
            {remitLines.map((line, i) => (
              <Text key={i} style={s.addressLine}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}

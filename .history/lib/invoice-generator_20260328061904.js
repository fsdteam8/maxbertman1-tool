"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePDF = generateInvoicePDF;
var pdf_lib_1 = require("pdf-lib");
var currency_1 = require("@/lib/currency");
// ─── Original Grid Coordinates and Table Formats ─────────────────────────
var PAGE_W = pdf_lib_1.PageSizes.Letter[0];
var PAGE_H = pdf_lib_1.PageSizes.Letter[1];
var LEFT = 40;
var RIGHT = PAGE_W - 40;
var CONTENT_W = RIGHT - LEFT;
// Table Column grid
var COL_SERVICE = LEFT;
var COL_ACTIVITY = LEFT + 58;
var COL_QTY_R = 440;
var COL_RATE_R = 486;
var COL_AMOUNT_R = RIGHT;
// Meta block grid
var META_LABEL_R = 505;
var META_VALUE_R = RIGHT;
var C = {
    white: (0, pdf_lib_1.rgb)(1, 1, 1),
    black: (0, pdf_lib_1.rgb)(0, 0, 0),
    text: (0, pdf_lib_1.rgb)(0.15, 0.15, 0.15),
    muted: (0, pdf_lib_1.rgb)(0.45, 0.45, 0.45),
    teal: (0, pdf_lib_1.rgb)(0.74, 0.86, 0.9),
    blue: (0, pdf_lib_1.rgb)(0.23, 0.39, 0.66),
    red: (0, pdf_lib_1.rgb)(0.82, 0.22, 0.18),
    rule: (0, pdf_lib_1.rgb)(0.22, 0.22, 0.22),
};
var FS = {
    issuerName: 11,
    body: 9.5,
    bodySmall: 9,
    section: 10,
    meta: 9.5,
    title: 18,
    header: 9.5,
    balance: 10,
    logoSystem: 24,
    logoFour: 27,
    logoTag: 7.5,
};
var TABLE_HEADER_TOP = 510;
var TABLE_HEADER_H = 18;
var TABLE_START_Y = 486;
function generateInvoicePDF(invoice, _originalPdfBuffer) {
    return __awaiter(this, void 0, void 0, function () {
        var pdfDoc, page, reg, bold, d, rows, footerTopY, y, _i, rows_1, row, rowHeight, dividerY, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, pdf_lib_1.PDFDocument.create()];
                case 1:
                    pdfDoc = _c.sent();
                    page = pdfDoc.addPage(pdf_lib_1.PageSizes.Letter);
                    return [4 /*yield*/, pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica)];
                case 2:
                    reg = _c.sent();
                    return [4 /*yield*/, pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold)];
                case 3:
                    bold = _c.sent();
                    d = makeDrawer(page, reg);
                    page.drawRectangle({
                        x: 0,
                        y: 0,
                        width: PAGE_W,
                        height: PAGE_H,
                        color: C.white,
                    });
                    // Maintain original 2-column header and strict layout positions
                    drawIssuerBlock(page, d, invoice, reg, bold);
                    drawMetaBlock(d, invoice, reg, bold);
                    drawBillToBlock(d, invoice, reg, bold);
                    drawTableHeader(page, d, bold);
                    rows = buildRows(invoice);
                    footerTopY = 178;
                    y = TABLE_START_Y;
                    for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                        row = rows_1[_i];
                        rowHeight = drawRow(d, row, y, reg, bold);
                        y -= rowHeight;
                    }
                    dividerY = Math.max(footerTopY + 48, y - 8);
                    page.drawLine({
                        start: { x: LEFT, y: dividerY },
                        end: { x: RIGHT, y: dividerY },
                        thickness: 1.1,
                        color: C.rule,
                    });
                    // Maintain original 3-column footer
                    drawFooter(d, invoice, reg, bold, dividerY);
                    _b = (_a = Buffer).from;
                    return [4 /*yield*/, pdfDoc.save()];
                case 4: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
            }
        });
    });
}
function drawIssuerBlock(page, d, invoice, reg, bold) {
    var y = 735;
    d.text(firstNonEmpty(invoice.issuerName, "System4 S.N.E."), LEFT, y, FS.issuerName, bold, C.black);
    y -= 18;
    var issuerLines = cleanLines(invoice.issuerAddressLines);
    var finalIssuerLines = issuerLines.length > 0
        ? issuerLines
        : ["60 Romano Vineyard Way, #101", "North Kingstown, RI 02852"];
    for (var _i = 0, finalIssuerLines_1 = finalIssuerLines; _i < finalIssuerLines_1.length; _i++) {
        var line = finalIssuerLines_1[_i];
        d.text(line, LEFT, y, FS.body, reg, C.text);
        y -= 13;
    }
    d.text(firstNonEmpty(invoice.issuerEmail, "billing@system4ips.com"), LEFT, y, FS.body, reg, C.text);
    page.drawLine({
        start: { x: 356, y: 724 },
        end: { x: 405, y: 736 },
        thickness: 7,
        color: C.blue,
    });
    d.text("System", 392, 723, FS.logoSystem, reg, C.blue);
    d.text("4", 474, 727, FS.logoFour, bold, C.red);
    d.text("Facility Services Management", 394, 710, FS.logoTag, reg, C.muted);
    page.drawLine({
        start: { x: 460, y: 705 },
        end: { x: 558, y: 700 },
        thickness: 1.1,
        color: C.red,
    });
    d.text("INVOICE", LEFT, 655, FS.title, bold, C.black);
}
function drawMetaBlock(d, invoice, reg, bold) {
    // Align with BILL TO block on left
    var y = 607;
    var topRows = [];
    topRows.push(["CUSTOMER#", firstNonEmpty(invoice.customerNumber, ""), reg]);
    topRows.push(["INVOICE#", firstNonEmpty(invoice.invoiceNumber, ""), bold]);
    topRows.push(["DATE", firstNonEmpty(invoice.invoiceDate, ""), reg]);
    topRows.push(["DUE DATE", firstNonEmpty(invoice.dueDate, ""), reg]);
    drawMetaRows(d, topRows, y, reg, bold);
}
function drawMetaRows(d, rows, y, reg, bold) {
    for (var _i = 0, rows_2 = rows; _i < rows_2.length; _i++) {
        var _a = rows_2[_i], label = _a[0], value = _a[1], valueFont = _a[2];
        d.rightText(label, META_LABEL_R, y, FS.meta, bold, C.black);
        d.rightText(value, META_VALUE_R, y, FS.meta, valueFont, C.black);
        y -= 16;
    }
    return y;
}
function drawBillToBlock(d, invoice, reg, bold) {
    var _a;
    var y = 607; // Restore original position
    d.text("BILL TO", LEFT, y, FS.section, bold, C.black);
    y -= 16;
    var lines = cleanLines(__spreadArray([
        invoice.billToName
    ], ((_a = invoice.billToAddressLines) !== null && _a !== void 0 ? _a : []), true));
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        d.text(line, LEFT, y, FS.body, reg, C.text);
        y -= 13;
    }
}
function drawTableHeader(page, d, bold) {
    page.drawRectangle({
        x: LEFT,
        y: TABLE_HEADER_TOP,
        width: CONTENT_W,
        height: TABLE_HEADER_H,
        color: C.teal,
    });
    var y = TABLE_HEADER_TOP + 5;
    // Restore original separate columns for header
    d.text("SERVICE", COL_SERVICE, y, FS.header, bold, C.black);
    d.text("ACTIVITY", COL_ACTIVITY, y, FS.header, bold, C.black);
    d.rightText("QTY", COL_QTY_R, y, FS.header, bold, C.black);
    d.rightText("RATE", COL_RATE_R, y, FS.header, bold, C.black);
    d.rightText("AMOUNT", COL_AMOUNT_R, y, FS.header, bold, C.black);
}
function buildRows(invoice) {
    var lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    var rows = [];
    for (var _i = 0, lineItems_1 = lineItems; _i < lineItems_1.length; _i++) {
        var item = lineItems_1[_i];
        if (item.type === "service") {
            var lines = buildServiceLines(item);
            if (!lines.length && !hasMoney(item.amount))
                continue;
            // Table body should not have $ prefix
            rows.push({
                kind: "service",
                label: "Services",
                lines: lines,
                qty: formatNullableNumber(item.quantity),
                rate: formatNullableRate(item.rate),
                amountText: formatAmountNoSymbol(item.amount),
            });
        }
        else if (item.type === "tax" && hasMoney(item.amount)) {
            rows.push({
                kind: "tax",
                label: "Sales Tax",
                lines: cleanLines([
                    item.description || item.title || buildTaxFallback(invoice),
                ]),
                amountText: formatAmountNoSymbol(item.amount),
            });
        }
        else if (item.type === "credit" && hasMoney(item.amount)) {
            rows.push({
                kind: "credit",
                label: "Credit",
                lines: cleanLines([item.description || item.title || ""]),
                amountText: formatAmountNoSymbol(item.amount),
            });
        }
    }
    // Fallback tax row only if invoice-level tax exists and no tax line item exists
    if (rows.findIndex(function (r) { return r.kind === "tax"; }) === -1 &&
        hasMoney(invoice.taxAmount) &&
        Number(invoice.taxAmount) > 0) {
        rows.push({
            kind: "tax",
            label: "Sales Tax",
            lines: cleanLines([buildTaxFallback(invoice)]),
            amountText: formatAmountNoSymbol(invoice.taxAmount),
        });
    }
    return rows;
}
function buildServiceLines(item) {
    var raw = cleanLines([
        item.title,
        item.description && item.description !== item.title ? item.description : "",
        item.serviceDateRange,
    ]);
    return raw.filter(function (line) { return !/see extracted text for details/i.test(line); });
}
function buildTaxFallback(invoice) {
    var location = cleanLines(invoice.serviceAddressLines).slice(-1)[0] || "";
    var rate = typeof invoice.taxRate === "number"
        ? " (".concat(invoice.taxRate.toFixed(2), "%)")
        : "";
    return "Sales Tax ".concat(location).concat(rate).trim();
}
function drawRow(d, row, startY, reg, bold) {
    var wrapped = row.lines.flatMap(function (line) {
        return wrapText(line, COL_QTY_R - COL_ACTIVITY - 16, reg, FS.bodySmall);
    });
    var lines = wrapped.length ? wrapped : [""];
    var firstY = startY;
    var lineY = firstY;
    // Restore distinct columns!
    d.text(row.label, COL_SERVICE, firstY, FS.body, bold, C.black);
    for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
        var line = lines_2[_i];
        d.text(line, COL_ACTIVITY, lineY, FS.bodySmall, reg, C.text);
        lineY -= 10.5;
    }
    if (row.kind === "service") {
        if (row.qty)
            d.rightText(row.qty, COL_QTY_R, firstY, FS.bodySmall, reg, C.text);
        if (row.rate)
            d.rightText(row.rate, COL_RATE_R, firstY, FS.bodySmall, reg, C.text);
    }
    d.rightText(row.amountText, COL_AMOUNT_R, firstY, FS.bodySmall, reg, C.text);
    return Math.max(20, lines.length * 10.5 + 10);
}
function drawFooter(d, invoice, reg, bold, dividerY) {
    var _a, _b;
    // Restore original 3-column footer layout exactly!
    var serviceX = LEFT;
    var remitX = 245;
    var summaryLabelR = 505;
    var summaryValueR = RIGHT;
    var y1 = dividerY - 28;
    d.text("SERVICE ADDRESS", serviceX, y1, FS.section, bold, C.black);
    y1 -= 16;
    for (var _i = 0, _c = cleanLines(__spreadArray([
        invoice.billToName && !cleanLines(invoice.serviceAddressLines).length
            ? invoice.billToName
            : null
    ], (cleanLines(invoice.serviceAddressLines).length
        ? invoice.serviceAddressLines
        : ((_a = invoice.billToAddressLines) !== null && _a !== void 0 ? _a : [])), true)); _i < _c.length; _i++) {
        var line = _c[_i];
        d.text(line, serviceX, y1, FS.body, reg, C.text);
        y1 -= 13;
    }
    var y2 = dividerY - 28;
    d.text("REMIT TO", remitX, y2, FS.section, bold, C.black);
    y2 -= 16;
    for (var _d = 0, _e = cleanLines((((_b = invoice.remitToLines) === null || _b === void 0 ? void 0 : _b.length)
        ? invoice.remitToLines
        : __spreadArray(__spreadArray([
            firstNonEmpty(invoice.issuerName, "System4 S.N.E.")
        ], (cleanLines(invoice.issuerAddressLines).length
            ? invoice.issuerAddressLines
            : ["60 Romano Vineyard Way, #101", "North Kingstown, RI 02852"]), true), [
            "Attn: ".concat(firstNonEmpty(invoice.issuerEmail, "billing@system4ips.com")),
            "Phone: (401) 615-7043",
        ], false))); _d < _e.length; _d++) {
        var line = _e[_d];
        d.text(line, remitX, y2, FS.body, reg, C.text);
        y2 -= 13;
    }
    var ys = dividerY - 26;
    if (hasMoney(invoice.creditAmount) && invoice.creditAmount > 0) {
        d.rightText("CREDIT", summaryLabelR, ys, FS.balance, bold, C.black);
        d.rightText(formatCredit(invoice.creditAmount), summaryValueR, ys, FS.balance, bold, C.black);
        ys -= 22;
    }
    d.rightText("BALANCE DUE", summaryLabelR, ys, FS.balance, bold, C.black);
    d.rightText(moneyText(invoice.balanceDue, invoice.totalAmount, invoice.subtotal), summaryValueR, ys - 2, 14, bold, C.black);
}
function makeDrawer(page, defaultFont) {
    return {
        text: function (text, x, y, size, font, color) {
            if (font === void 0) { font = defaultFont; }
            if (color === void 0) { color = C.text; }
            if (!text)
                return;
            page.drawText(String(text), { x: x, y: y, size: size, font: font, color: color });
        },
        rightText: function (text, rightX, y, size, font, color) {
            if (font === void 0) { font = defaultFont; }
            if (color === void 0) { color = C.text; }
            if (!text)
                return;
            var width = font.widthOfTextAtSize(String(text), size);
            page.drawText(String(text), {
                x: rightX - width,
                y: y,
                size: size,
                font: font,
                color: color,
            });
        },
    };
}
function wrapText(text, maxWidth, font, fontSize) {
    var clean = String(text || "")
        .replace(/\s+/g, " ")
        .trim();
    if (!clean)
        return [];
    var words = clean.split(" ");
    var lines = [];
    var current = "";
    for (var _i = 0, words_1 = words; _i < words_1.length; _i++) {
        var word = words_1[_i];
        var test = current ? "".concat(current, " ").concat(word) : word;
        if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
            current = test;
        }
        else {
            if (current)
                lines.push(current);
            current = word;
        }
    }
    if (current)
        lines.push(current);
    return lines;
}
function cleanLines(lines) {
    return lines
        .flatMap(function (line) { return String(line !== null && line !== void 0 ? line : "").split(/\r?\n/); })
        .map(function (line) { return line.trim(); })
        .filter(Boolean);
}
function firstNonEmpty() {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i] = arguments[_i];
    }
    for (var _a = 0, values_1 = values; _a < values_1.length; _a++) {
        var v = values_1[_a];
        if (typeof v === "string" && v.trim())
            return v.trim();
    }
    return "";
}
function hasMoney(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function formatAmountNoSymbol(value) {
    if (!hasMoney(value))
        return "";
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}
function moneyText() {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i] = arguments[_i];
    }
    for (var _a = 0, values_2 = values; _a < values_2.length; _a++) {
        var value = values_2[_a];
        if (hasMoney(value))
            return (0, currency_1.formatCurrency)(value);
    }
    return "";
}
function formatCredit(value) {
    return "( ".concat((0, currency_1.formatCurrency)(Math.abs(value)), " )");
}
function formatNullableNumber(value) {
    if (value === null || value === undefined)
        return undefined;
    return Number.isInteger(value) ? String(value) : String(value);
}
function formatNullableRate(value) {
    if (value === null || value === undefined)
        return undefined;
    return (0, currency_1.formatCurrency)(value);
}

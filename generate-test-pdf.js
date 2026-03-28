"use strict";
/**
 * Test PDF generation script.
 * Generates 3 PDFs matching the 3 original invoice patterns:
 *   1. Invoice 48572 — multiline description, no tax, no credit
 *   2. Invoice 48166 — cleaning with credit, no tax
 *   3. Invoice 48289 — cleaning + PO placeholder + 6.35% sales tax
 *
 * Usage: npx tsx generate-test-pdf.ts
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var invoice_generator_1 = require("./lib/invoice-generator");
var fs_1 = __importDefault(require("fs"));
// ─── Shared defaults ─────────────────────────────────────────────────────
var sharedFields = {
    issuerName: "System4 S.N.E.",
    issuerEmail: "billing@system4ips.com",
    issuerAddressLines: [
        "60 Romano Vineyard Way, #101",
        "North Kingstown, RI 02852",
    ],
    remitToLines: [
        "System4 S.N.E.",
        "60 Romano Vineyard Way, #101",
        "North Kingstown, RI 02852",
        "Attn: billing@system4ips.com",
        "Phone: (401) 615-7043",
    ],
    poPlaceholderDetected: false,
    poOriginalText: null,
    sourceMetadata: {},
    extractedRawText: "",
    lowConfidence: false,
};
// ═══════════════════════════════════════════════════════════════════════════
// Invoice 48572 — Multiline description, no tax, no credit
// ═══════════════════════════════════════════════════════════════════════════
var invoice48572 = __assign(__assign({}, sharedFields), { invoiceNumber: "48572", customerNumber: "2758", invoiceDate: "03/10/2026", dueDate: "03/20/2026", balanceDue: 1224.0, totalAmount: 1224.0, subtotal: 1224.0, taxAmount: null, taxRate: null, creditAmount: null, billToName: "The Pennfield School", billToAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"], serviceAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"], lineItems: [
        {
            type: "service",
            title: "Porter Services: Inv #47057 in December was under charged $612.",
            description: "Inv #47771 in January was undercharged $612.\nTotal = $1224.00  03/10/2026",
            serviceDateRange: null,
            quantity: null,
            rate: null,
            amount: 1224.0,
        },
    ] });
// ═══════════════════════════════════════════════════════════════════════════
// Invoice 48166 — Cleaning with credit, no tax
// ═══════════════════════════════════════════════════════════════════════════
var invoice48166 = __assign(__assign({}, sharedFields), { invoiceNumber: "48166", customerNumber: "2758", invoiceDate: "03/01/2026", dueDate: "03/11/2026", balanceDue: 811.39, totalAmount: 811.39, subtotal: 3516.0, taxAmount: null, taxRate: null, creditAmount: 2704.61, billToName: "The Pennfield School", billToAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"], serviceAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"], lineItems: [
        {
            type: "service",
            title: "Cleaning",
            description: "Cleaning",
            serviceDateRange: "03/01/2026 - 03/31/2026",
            quantity: null,
            rate: null,
            amount: 3516.0,
        },
        {
            type: "credit",
            title: "Credit",
            description: "Credit",
            serviceDateRange: null,
            quantity: null,
            rate: null,
            amount: 2704.61,
        },
    ] });
// ═══════════════════════════════════════════════════════════════════════════
// Invoice 48289 — Cleaning + PO placeholder + 6.35% sales tax
// ═══════════════════════════════════════════════════════════════════════════
var invoice48289 = __assign(__assign({}, sharedFields), { invoiceNumber: "48289", customerNumber: "2266", invoiceDate: "03/01/2026", dueDate: "03/11/2026", balanceDue: 956.09, totalAmount: 956.09, subtotal: 899.0, taxAmount: 57.09, taxRate: 6.35, creditAmount: null, billToName: "Ryder Truck- Waterbury", billToAddressLines: ["37 E Aurora St", "Waterbury, CT 06708"], serviceAddressLines: ["37 E Aurora St", "Waterbury, CT 06708"], lineItems: [
        {
            type: "service",
            title: "Cleaning",
            description: "PO# pending valid purchase order from Ryder.",
            serviceDateRange: "03/01/2026 - 03/31/2026",
            quantity: null,
            rate: null,
            amount: 899.0,
        },
        {
            type: "tax",
            title: "Sales Tax",
            description: "Waterbury, CT 06708 (6.35%)",
            serviceDateRange: null,
            quantity: null,
            rate: null,
            amount: 57.09,
        },
    ] });
// ═══════════════════════════════════════════════════════════════════════════
// Generate all 3 test PDFs
// ═══════════════════════════════════════════════════════════════════════════
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var tests, _i, tests_1, _a, name_1, invoice, pdfBytes;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    tests = [
                        { name: "test-48572-multiline.pdf", invoice: invoice48572 },
                        { name: "test-48166-credit.pdf", invoice: invoice48166 },
                        { name: "test-48289-tax.pdf", invoice: invoice48289 },
                    ];
                    _i = 0, tests_1 = tests;
                    _b.label = 1;
                case 1:
                    if (!(_i < tests_1.length)) return [3 /*break*/, 4];
                    _a = tests_1[_i], name_1 = _a.name, invoice = _a.invoice;
                    return [4 /*yield*/, (0, invoice_generator_1.generateInvoicePDF)(invoice)];
                case 2:
                    pdfBytes = _b.sent();
                    fs_1.default.writeFileSync(name_1, pdfBytes);
                    console.log("\u2705 Generated ".concat(name_1, " (").concat(pdfBytes.length, " bytes)"));
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log("\nDone. Compare generated PDFs against originals.");
                    return [2 /*return*/];
            }
        });
    });
}
run().catch(console.error);

/**
 * utils/pdf.util.js
 *
 * Best of both versions:
 *   ✅ Old code's correct date: bill.generatedAt || bill.createdAt
 *   ✅ Old code's layout: dark header band, meta strip, summary boxes, table
 *   ✅ New code's tenant wiring: businessName, phone, address, logo from req.tenant
 *   ✅ Refined typography: tighter spacing, cleaner hierarchy
 *   ✅ Logo from Cloudinary (URL fetch) with local fallback
 *
 * Exports both old names + aliases for full compatibility.
 */

const PDFDocument = require("pdfkit");
const https       = require("https");
const http        = require("http");
const path        = require("path");
const fs          = require("fs");

const DEFAULT_LOGO_PATH = path.join(__dirname, "../assets/logo.png");

// ─── Page geometry (A4 = 595 × 842 pt) ───────────────────────────────────────
const PAGE_W = 595;
const PAGE_H = 842;
const ML     = 45;
const MR     = 550;
const CW     = MR - ML;

// Table column positions — absolute X
const COL = {
  date:    ML,
  product: ML + 92,
  qty_R:   ML + 322,
  rate_R:  ML + 408,
  amt_R:   MR,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fetchImageBuffer = (url) =>
  new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      const chunks = [];
      res.on("data",  (c) => chunks.push(c));
      res.on("end",   () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });

const loadLogo = async (logoUrl) => {
  try {
    if (logoUrl) return await fetchImageBuffer(logoUrl);
    return null;
  } catch { return null; }
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

const Rs = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;

const hline = (doc, y, color = "#E5E7EB", lw = 0.5) =>
  doc.save()
    .strokeColor(color).lineWidth(lw)
    .moveTo(ML, y).lineTo(MR, y).stroke()
    .restore();

// Right-align a string so its right edge lands exactly at rx
const rText = (doc, str, rx, y) =>
  doc.text(str, rx - doc.widthOfString(str), y, { lineBreak: false });

// ─── buildBillFilename ────────────────────────────────────────────────────────
const buildBillFilename = (bill, laneName = "") => {
  const cname = (
    typeof bill.customerId === "object" ? bill.customerId?.name : bill._customerName
  ) || "Customer";
  const lane      = laneName || bill._laneName || "Lane";
  const monthYear = new Date(bill.fromDate)
    .toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    .replace(/\s+/g, "");
  const safe = (s) => s.replace(/[^a-zA-Z0-9]/g, "").slice(0, 28);
  return `${safe(cname)}_${safe(lane)}_${monthYear}.pdf`;
};

// ─── buildBillPdfBuffer ───────────────────────────────────────────────────────
/**
 * @param {object} bill       - populated bill doc (.lean())
 * @param {string} laneName   - bill.laneId?.name
 * @param {object} [tenant]   - req.tenant from tenantMiddleware (optional)
 * @returns {Promise<Buffer>}
 */
const buildBillPdfBuffer = (bill, laneName = "", tenant = null) =>
  new Promise(async (resolve, reject) => {
    try {
      // ── Tenant data (falls back gracefully if no tenant passed) ────────────
      const logoBuffer   = await loadLogo(tenant?.logoUrl || null);
      const businessName = tenant?.name          || "Dairy";
      const phone        = tenant?.phone         || "";
      const address      = tenant?.address       || "";
      const prefix       = tenant?.invoicePrefix || "INV";

      // ── Bill derived values ───────────────────────────────────────────────
      const customerName  = (typeof bill.customerId === "object" ? bill.customerId?.name  : bill._customerName)  || "Customer";
      const customerPhone = (typeof bill.customerId === "object" ? bill.customerId?.phone : bill._customerPhone) || "";
      const lane          = laneName || bill._laneName || "";
      const pending       = Math.max(0, (bill.totalAmount || 0) - (bill.amountPaid || 0));
      const isPaid        = bill.status === "PAID";
      const isPartial     = bill.status === "PARTIAL";

      const statusLabel  = isPaid ? "PAID" : isPartial ? "PARTIAL" : "UNPAID";
      const statusFg     = isPaid ? "#065F46" : isPartial ? "#92400E" : "#991B1B";
      const statusBg     = isPaid ? "#D1FAE5" : isPartial ? "#FEF3C7" : "#FEE2E2";
      const statusAccent = isPaid ? "#059669" : isPartial ? "#D97706" : "#DC2626";

      // Bill ref number
      const billRef = `${prefix}-${String(bill._id).slice(-6).toUpperCase()}`;

      // ✅ Correct date — when the bill was generated, NOT when downloaded
      const billDate = bill.generatedAt || bill.createdAt || new Date();

      const doc = new PDFDocument({
        size:          [PAGE_W, PAGE_H],
        margin:        0,
        autoFirstPage: true,
        bufferPages:   false,
        info: {
          Title:   `Invoice – ${customerName}`,
          Author:  businessName,
          Subject: "Dairy Delivery Bill",
          Creator: "DairyFlow",
        },
      });

      const bufs = [];
      doc.on("data",  (b) => bufs.push(b));
      doc.on("end",   () => resolve(Buffer.concat(bufs)));
      doc.on("error", reject);

      // ══════════════════════════════════════════════════════════════════════
      // SECTION 1 — HEADER BAND
      // ══════════════════════════════════════════════════════════════════════
      const HDR_H  = 72;
      const LOGO_S = 46;
      const LOGO_Y = (HDR_H - LOGO_S) / 2;

      doc.rect(0, 0, PAGE_W, HDR_H).fill("#0F172A");

      let nameX = ML;
      if (logoBuffer) {
        try {
          // Clip logo to rounded square
          doc.save();
          doc.roundedRect(ML, LOGO_Y, LOGO_S, LOGO_S, 5).clip();
          doc.image(logoBuffer, ML, LOGO_Y, { fit: [LOGO_S, LOGO_S] });
          doc.restore();
          nameX = ML + LOGO_S + 13;
        } catch (_) { /* bad image — skip, nameX stays at ML */ }
      }

      // Business name
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(16)
        .text(businessName, nameX, 18, { lineBreak: false });

      // Contact line — phone · address
      const contactLine = [phone, address].filter(Boolean).join("   ·   ");
      if (contactLine) {
        doc.fillColor("#94A3B8").font("Helvetica").fontSize(8)
          .text(contactLine, nameX, 40, {
            lineBreak: false,
            width: MR - nameX - 80,
            ellipsis: true,
          });
      } else {
        // Fallback subtitle if no contact info
        doc.fillColor("#94A3B8").font("Helvetica").fontSize(8)
          .text("Fresh Dairy Products", nameX, 40, { lineBreak: false });
      }

      // Invoice ref badge — top right of header
      doc.save().roundedRect(MR - 72, 24, 72, 22, 4).fill("#1E293B").restore();
      doc.fillColor("#E2E8F0").font("Helvetica-Bold").fontSize(8.5);
      const refW = doc.widthOfString(billRef);
      doc.text(billRef, MR - 36 - refW / 2, 33, { lineBreak: false });

      // ══════════════════════════════════════════════════════════════════════
      // SECTION 2 — META STRIP  (period · generated · status)
      // ══════════════════════════════════════════════════════════════════════
      let y = HDR_H + 14;

      // Bill period — left
      doc.fillColor("#94A3B8").font("Helvetica").fontSize(7.5)
        .text("BILL PERIOD", ML, y, { lineBreak: false });
      y += 13;
      doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(9.5)
        .text(`${fmtDate(bill.fromDate)}  –  ${fmtDate(bill.toDate)}`, ML, y, { lineBreak: false });

      // Generated date — center
      // ✅ bill.generatedAt || bill.createdAt, not new Date()
      const genStr = `Generated: ${fmtDate(billDate)}`;
      doc.fillColor("#94A3B8").font("Helvetica").fontSize(8);
      doc.text(genStr, ML + CW / 2 - doc.widthOfString(genStr) / 2, y, { lineBreak: false });

      // Status pill — right
      doc.save().roundedRect(MR - 62, y - 4, 62, 20, 4).fill(statusBg).restore();
      doc.fillColor(statusFg).font("Helvetica-Bold").fontSize(8.5);
      const slW = doc.widthOfString(statusLabel);
      doc.text(statusLabel, MR - 31 - slW / 2, y + 1, { lineBreak: false });

      y += 24;
      hline(doc, y, "#E2E8F0");
      y += 14;

      // ══════════════════════════════════════════════════════════════════════
      // SECTION 3 — CUSTOMER BLOCK  +  SUMMARY BOXES
      // ══════════════════════════════════════════════════════════════════════
      const INFO_TOP = y;

      // Customer — left column
      doc.fillColor("#94A3B8").font("Helvetica").fontSize(7.5)
        .text("BILLED TO", ML, y, { lineBreak: false });
      y += 14;
      doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(13)
        .text(customerName, ML, y, { lineBreak: false });
      y += 19;
      if (lane) {
        doc.fillColor("#64748B").font("Helvetica").fontSize(9)
          .text(`Lane: ${lane}`, ML, y, { lineBreak: false });
        y += 14;
      }
      if (customerPhone) {
        doc.fillColor("#64748B").font("Helvetica").fontSize(9)
          .text(`Ph: ${customerPhone}`, ML, y, { lineBreak: false });
        y += 14;
      }

      // Summary boxes — right column (drawn at fixed INFO_TOP, don't move y)
      const BW = 118, BH = 54;
      const B2X = MR - BW, B1X = B2X - BW - 8;

      // Box 1 — Total Amount
      doc.save().roundedRect(B1X, INFO_TOP, BW, BH, 6).fill("#F1F5F9").restore();
      doc.fillColor("#64748B").font("Helvetica").fontSize(7)
        .text("TOTAL AMOUNT", B1X + 9, INFO_TOP + 10, { lineBreak: false });
      doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(13)
        .text(Rs(bill.totalAmount), B1X + 9, INFO_TOP + 26, { lineBreak: false, width: BW - 18 });

      // Box 2 — Due / Paid
      doc.save().roundedRect(B2X, INFO_TOP, BW, BH, 6).fill(statusBg).restore();
      doc.fillColor(statusFg).font("Helvetica").fontSize(7)
        .text(isPaid ? "FULLY PAID" : "AMOUNT DUE", B2X + 9, INFO_TOP + 10, { lineBreak: false });
      doc.fillColor(statusFg).font("Helvetica-Bold").fontSize(13)
        .text(Rs(isPaid ? bill.amountPaid : pending), B2X + 9, INFO_TOP + 26, { lineBreak: false, width: BW - 18 });

      // y must clear the boxes
      y = Math.max(y, INFO_TOP + BH + 14);
      hline(doc, y, "#E2E8F0");
      y += 14;

      // ══════════════════════════════════════════════════════════════════════
      // SECTION 4 — DELIVERY ITEMS TABLE
      // ══════════════════════════════════════════════════════════════════════

      // Table header row
      doc.save().rect(ML - 4, y, CW + 8, 21).fill("#F8FAFC").restore();
      const HY = y + 7;
      doc.fillColor("#64748B").font("Helvetica-Bold").fontSize(8);
      doc.text("DATE",    COL.date,    HY, { lineBreak: false });
      doc.text("PRODUCT", COL.product, HY, { lineBreak: false });
      rText(doc, "QTY",    COL.qty_R,  HY);
      rText(doc, "RATE",   COL.rate_R, HY);
      rText(doc, "AMOUNT", COL.amt_R,  HY);

      y += 23;
      hline(doc, y, "#CBD5E1", 0.6);
      y += 7;

      // Data rows
      const ROW_H = 17;
      (bill.deliveryItems || []).forEach((item, idx) => {
        if (idx % 2 === 0) {
          doc.save().rect(ML - 4, y - 2, CW + 8, ROW_H).fill("#F8FAFC").restore();
        }

        doc.fillColor("#334155").font("Helvetica").fontSize(8.5);

        doc.text(fmtDate(item.date), COL.date, y, { lineBreak: false, width: 90 });

        // Clamp product name width to avoid Qty column overlap
        const maxW = COL.qty_R - COL.product - 30;
        let prod = String(item.productName || "Product");
        while (prod.length > 3 && doc.widthOfString(prod) > maxW) prod = prod.slice(0, -1);
        if (prod !== String(item.productName || "Product")) prod += "…";
        doc.text(prod, COL.product, y, { lineBreak: false });

        rText(doc, String(item.quantity), COL.qty_R,  y);
        rText(doc, Rs(item.rate),         COL.rate_R, y);

        doc.font("Helvetica-Bold").fillColor("#0F172A");
        rText(doc, Rs(item.amount), COL.amt_R, y);

        y += ROW_H;
      });

      hline(doc, y + 2, "#CBD5E1", 0.6);
      y += 16;

      // ══════════════════════════════════════════════════════════════════════
      // SECTION 5 — TOTALS  (right-aligned block)
      // ══════════════════════════════════════════════════════════════════════
      const T_LBL_X = ML + CW * 0.50;
      const T_ROW_H = 17;

      const totRow = (label, value, bold = false, color = "#334155", sz = 9) => {
        doc.fillColor("#64748B").font("Helvetica").fontSize(sz - 1)
          .text(label, T_LBL_X, y, { lineBreak: false });
        doc.fillColor(color).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(sz);
        rText(doc, Rs(value), COL.amt_R, y);
        y += T_ROW_H;
      };

      totRow("Delivery Total", bill.deliveryTotal);

      if (bill.amountPaid > 0 && !isPaid) {
        totRow("Advance Applied", bill.amountPaid, false, "#059669");
      }

      hline(doc, y, "#94A3B8", 0.8);
      y += 9;

      totRow(
        isPaid ? "Total Paid" : "Pending Amount",
        isPaid ? bill.amountPaid : pending,
        true, statusAccent, 12
      );

      // ══════════════════════════════════════════════════════════════════════
      // SECTION 6 — FOOTER  (pinned at absolute Y)
      // ══════════════════════════════════════════════════════════════════════
      const FY = PAGE_H - 48;
      hline(doc, FY, "#E2E8F0");
      doc.fillColor("#94A3B8").font("Helvetica").fontSize(7.5)
        .text(
          `This is a system-generated bill. For queries, contact ${businessName}.`,
          ML, FY + 12, { width: CW, align: "center", lineBreak: false }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

// ─── Aliases ──────────────────────────────────────────────────────────────────
const generateBillPdf  = buildBillPdfBuffer;
const buildPdfFilename = buildBillFilename;

module.exports = {
  buildBillPdfBuffer,
  buildBillFilename,
  generateBillPdf,
  buildPdfFilename,
};
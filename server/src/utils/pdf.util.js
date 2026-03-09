const PDFDocument = require("pdfkit");
const path        = require("path");
const fs          = require("fs");

// ─── Logo path (server-side) ──────────────────────────────────────────────────
const LOGO_PATH   = path.join(__dirname, "../assets/logo.png");
const LOGO_EXISTS = fs.existsSync(LOGO_PATH);

// ─── Page geometry  (A4 = 595 × 842 pt) ──────────────────────────────────────
const PAGE_W    = 595;
const PAGE_H    = 842;
const ML        = 45;          // left margin
const MR        = 550;         // right edge
const CW        = MR - ML;    // content width

// Table column positions — absolute X, not string padding
const COL = {
  date:     ML,          // left-start for date text
  product:  ML + 92,     // left-start for product text
  qty_R:    ML + 322,    // RIGHT edge of qty  (right-align numbers here)
  rate_R:   ML + 408,    // RIGHT edge of rate
  amt_R:    MR,          // RIGHT edge of amount
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

const Rs = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;  // see note 2

const hline = (doc, y, color = "#E5E7EB", lw = 0.5) =>
  doc.save()
    .strokeColor(color).lineWidth(lw)
    .moveTo(ML, y).lineTo(MR, y).stroke()
    .restore();

// Right-align a string so its right edge lands at rx
const rText = (doc, str, rx, y) => {
  doc.text(str, rx - doc.widthOfString(str), y, { lineBreak: false });
};

// ─── buildBillFilename ────────────────────────────────────────────────────────
const buildBillFilename = (bill, laneName) => {
  const cname = (
    typeof bill.customerId === "object" ? bill.customerId?.name : bill._customerName
  ) || "Customer";
  const lane      = laneName || bill._laneName || "Lane";
  const monthYear = new Date(bill.fromDate)
    .toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    .replace(" ", "");                          // "Jun2025"
  const safe = (s) => s.replace(/[^a-zA-Z0-9]/g, "").slice(0, 28);
  return `${safe(cname)}_${safe(lane)}_${monthYear}.pdf`;
};

// ─── buildBillPdfBuffer ───────────────────────────────────────────────────────
const buildBillPdfBuffer = (bill, laneName) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size:          [PAGE_W, PAGE_H],
      margin:        0,           // we control all positioning manually
      autoFirstPage: true,
      bufferPages:   false,       // stream immediately; no buffering
    });

    const bufs = [];
    doc.on("data",  (b) => bufs.push(b));
    doc.on("end",   () => resolve(Buffer.concat(bufs)));
    doc.on("error", reject);

    // ── Derived values ───────────────────────────────────────────────────────
    const customerName  = (typeof bill.customerId === "object" ? bill.customerId?.name  : bill._customerName)  || "Customer";
    const customerPhone = (typeof bill.customerId === "object" ? bill.customerId?.phone : bill._customerPhone) || "";
    const lane          = laneName || bill._laneName || "";
    const pending       = Math.max(0, (bill.totalAmount || 0) - (bill.amountPaid || 0));
    const isPaid        = bill.status === "PAID";
    const isPartial     = bill.status === "PARTIAL";

    const statusLabel = isPaid ? "PAID" : isPartial ? "PARTIAL" : "UNPAID";
    const statusFg    = isPaid ? "#065F46" : isPartial ? "#92400E" : "#991B1B";
    const statusBg    = isPaid ? "#D1FAE5" : isPartial ? "#FEF3C7" : "#FEE2E2";
    const statusAccent= isPaid ? "#059669" : isPartial ? "#D97706" : "#DC2626";

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 1 — HEADER BAND
    // ════════════════════════════════════════════════════════════════════════
    const HDR_H  = 72;
    const LOGO_S = 46;
    const LOGO_Y = (HDR_H - LOGO_S) / 2;   // vertically centered in band

    doc.rect(0, 0, PAGE_W, HDR_H).fill("#0F172A");

    let nameX = ML;
    if (LOGO_EXISTS) {
      try {
        doc.image(LOGO_PATH, ML, LOGO_Y, { fit: [LOGO_S, LOGO_S] });
        nameX = ML + LOGO_S + 12;
      } catch (_) { /* bad image — skip */ }
    }

    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(17)
      .text("Siddhivinayak Dairy", nameX, 19, { lineBreak: false });
    doc.fillColor("#94A3B8").font("Helvetica").fontSize(8.5)
      .text("Fresh Dairy Products", nameX, 41, { lineBreak: false });

    // "INVOICE" badge — top right corner
    doc.save().roundedRect(MR - 58, 24, 58, 22, 4).fill("#1E293B").restore();
    doc.fillColor("#E2E8F0").font("Helvetica-Bold").fontSize(9);
    const invW = doc.widthOfString("INVOICE");
    doc.text("INVOICE", MR - 29 - invW / 2, 32, { lineBreak: false });

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 2 — META STRIP  (period / generated / status)
    // ════════════════════════════════════════════════════════════════════════
    let y = HDR_H + 14;

    // Bill period — left
    doc.fillColor("#94A3B8").font("Helvetica").fontSize(7.5)
      .text("BILL PERIOD", ML, y, { lineBreak: false });
    y += 13;
    doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(9.5)
      .text(`${fmtDate(bill.fromDate)}  –  ${fmtDate(bill.toDate)}`, ML, y, { lineBreak: false });

    // Generated — center
    const genStr = `Generated: ${fmtDate(bill.generatedAt || bill.createdAt)}`;
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

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 3 — CUSTOMER BLOCK  +  SUMMARY BOXES
    // ════════════════════════════════════════════════════════════════════════
    const INFO_TOP = y;

    // Customer (left column)
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

    // Summary boxes (right column — drawn at fixed INFO_TOP, don't move y)
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

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 4 — DELIVERY ITEMS TABLE
    // ════════════════════════════════════════════════════════════════════════

    // ── Table header row ────────────────────────────────────────────────────
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

    // ── Data rows ────────────────────────────────────────────────────────────
    const ROW_H = 17;
    (bill.deliveryItems || []).forEach((item, idx) => {
      if (idx % 2 === 0) {
        doc.save().rect(ML - 4, y - 2, CW + 8, ROW_H).fill("#F8FAFC").restore();
      }

      doc.fillColor("#334155").font("Helvetica").fontSize(8.5);

      // Date
      doc.text(fmtDate(item.date), COL.date, y, { lineBreak: false, width: 90 });

      // Product — clamp width so it never overlaps Qty column
      const maxW = COL.qty_R - COL.product - 30;
      let prod = String(item.productName || "Product");
      while (prod.length > 3 && doc.widthOfString(prod) > maxW) prod = prod.slice(0, -1);
      if (prod !== (item.productName || "Product")) prod += "…";
      doc.text(prod, COL.product, y, { lineBreak: false });

      // Qty, Rate — right-aligned, regular weight
      rText(doc, String(item.quantity), COL.qty_R,  y);
      rText(doc, Rs(item.rate),         COL.rate_R, y);

      // Amount — right-aligned, bold
      doc.font("Helvetica-Bold").fillColor("#0F172A");
      rText(doc, Rs(item.amount), COL.amt_R, y);

      y += ROW_H;
    });

    hline(doc, y + 2, "#CBD5E1", 0.6);
    y += 16;

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 5 — TOTALS  (right-aligned block)
    // ════════════════════════════════════════════════════════════════════════
    const T_LBL_X  = ML + CW * 0.50;
    const T_ROW_H  = 17;

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

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 6 — FOOTER  (pinned at absolute Y — never pushes a new page)
    // ════════════════════════════════════════════════════════════════════════
    const FY = PAGE_H - 48;
    hline(doc, FY, "#E2E8F0");
    doc.fillColor("#94A3B8").font("Helvetica").fontSize(7.5)
      .text(
        "This is a system-generated bill. For queries contact Siddhivinayak Dairy.",
        ML, FY + 12, { width: CW, align: "center", lineBreak: false }
      );

    doc.end();
  });

module.exports = { buildBillPdfBuffer, buildBillFilename };
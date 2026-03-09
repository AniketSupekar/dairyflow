import axios from "./axios";

export const generateBill = (data) =>
  axios.post("/billing/generate", data);

export const getCustomersByLane = (laneId) =>
  axios.get(`/customers/lane/${laneId}`);

export const getBillsByCustomer = (customerId, params = {}) =>
  axios.get(`/billing/customer/${customerId}`, { params });

// ── PDF Download ──────────────────────────────────────────────────────────────
// Returns { blob, filename } so caller can use the correct filename.
//
// FILENAME STRATEGY — two layers of fallback:
//   1. Try Content-Disposition header (works once server adds Access-Control-Expose-Headers)
//   2. Fall back to a name built from the bill object the caller already has
//      → caller passes { customerName, laneName, fromDate } as hintMeta
//
// WHY Content-Disposition was being ignored:
//   The browser hides response headers from JS unless the server explicitly
//   lists them in Access-Control-Expose-Headers. Add this to your cors config:
//     exposedHeaders: ["Content-Disposition"]
//   Until that's deployed, hintMeta gives us the correct name anyway.
export const downloadBillPdf = async (billId, hintMeta = {}) => {
  try {
    const response = await axios.get(`/billing/${billId}/pdf`, {
      responseType: "blob",
    });

    // Layer 1: try Content-Disposition (requires server to expose the header)
    const disposition = response.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename="?([^";\n]+)"?/i);
    let filename = match?.[1]?.trim();

    // Layer 2: build from hintMeta the caller passes in
    if (!filename && hintMeta.customerName) {
      const safe = (s) => (s || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
      const monthYear = hintMeta.fromDate
        ? new Date(hintMeta.fromDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }).replace(" ", "")
        : "";
      filename = [safe(hintMeta.customerName), safe(hintMeta.laneName), monthYear]
        .filter(Boolean).join("_") + ".pdf";
    }

    // Layer 3: safe fallback
    filename = filename || `bill-${billId}.pdf`;

    return { blob: response.data, filename };
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        error.message = json.message || error.message;
      } catch { /* keep original error */ }
    }
    throw error;
  }
};
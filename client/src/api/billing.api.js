import axios from "./axios";

export const generateBill = (data) =>
  axios.post("/billing/generate", data);

export const getCustomersByLane = (laneId) =>
  axios.get(`/customers/lane/${laneId}`);

export const getBillsByCustomer = (customerId, params = {}) =>
  axios.get(`/billing/customer/${customerId}`, { params });

// ── PDF Download ──────────────────────────────────────────────────────────────
// responseType: "blob" tells axios to treat the response as binary data.
// Required for PDFs — without it axios tries to parse as JSON and the file
// comes back corrupted.
//
// Error handling for blob requests is special: when the server returns a JSON
// error (e.g. 401 Unauthorized, 404 Not Found), axios still receives the body
// as a Blob because we told it to. We parse that Blob back to JSON here so the
// caller gets a meaningful error message instead of "[object Blob]".
export const downloadBillPdf = async (billId) => {
  try {
    const response = await axios.get(`/billing/${billId}/pdf`, {
      responseType: "blob",
    });
    return response.data; // returns the raw Blob on success
  } catch (error) {
    // If the server sent a JSON error body, it arrives as a Blob.
    // Parse it so we can surface the real message to the UI.
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        error.message = json.message || error.message;
      } catch {
        // Blob wasn't valid JSON — keep original error
      }
    }
    throw error;
  }
};
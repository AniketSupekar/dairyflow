import axios from "./axios";

export const generateBill = (data) =>
  axios.post("/billing/generate", data);

export const getCustomersByLane = (laneId) =>
  axios.get(`/customers/lane/${laneId}`);

export const getBillsByCustomer = (customerId, params = {}) =>
  axios.get(`/billing/customer/${customerId}`, { params });

// ── PDF Download ──────────────────────────────────────────────────────────────
// responseType: "blob" tells axios to treat the response as binary data.
// This is required for PDFs — without it axios tries to parse it as JSON and
// the file comes back corrupted. The Authorization header is attached
// automatically by the request interceptor in axios.js.
export const downloadBillPdf = async (billId) => {
  const response = await axios.get(`/billing/${billId}/pdf`, {
    responseType: "blob",
  });
  return response.data; // returns the raw Blob
};
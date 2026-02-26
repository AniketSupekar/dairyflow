import axios from "./axios";

export const generateBill = (data) =>
  axios.post("/billing/generate", data);

export const getCustomersByLane = (laneId) =>
  axios.get(`/customers/lane/${laneId}`);

export const getBillsByCustomer = (customerId, params = {}) =>
  axios.get(`/billing/customer/${customerId}`, { params });
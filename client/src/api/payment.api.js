import axios from "./axios";

export const createPayment = (data) =>
  axios.post("/payments", data);

export const getPaymentsByCustomer = (customerId, params = {}) =>
  axios.get(`/payments/${customerId}`, { params });
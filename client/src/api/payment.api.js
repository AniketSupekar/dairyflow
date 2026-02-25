  import axios from "./axios";

  export const createPayment = (data) =>
    axios.post("/payments", data);

  export const getPaymentsByCustomer = (customerId) =>
    axios.get(`/payments/${customerId}`);
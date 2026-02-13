import api from "./axios";

export const getCustomersByLane = (laneId) =>
  api.get(`/customers/lane/${laneId}`);

export const createCustomer = (data) =>
  api.post("/customers", data);

export const updateCustomer = (id, data) =>
  api.put(`/customers/${id}`, data);

export const deleteCustomer = (id) =>
  api.delete(`/customers/${id}`);
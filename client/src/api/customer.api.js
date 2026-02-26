import api from "./axios";

export const getCustomersByLane = (laneId) =>
  api.get(`/customers/lane/${laneId}`);

export const getAllCustomers = (params) =>
  api.get("/customers", { params });

export const createCustomer = (data) =>
  api.post("/customers", data);

export const updateCustomer = (id, data) =>
  api.put(`/customers/${id}`, data);

export const deleteCustomer = (id) =>
  api.delete(`/customers/${id}`);

export const getInactiveCustomers = (laneId) =>
  api.get("/customers/inactive", { params: { laneId } });

export const restoreCustomer = (id) =>
  api.patch(`/customers/${id}/restore`);
import api from "./axios";

export const getDeliveryBoys = () =>
  api.get("/users");

export const createDeliveryBoy = (data) =>
  api.post("/users", data);

export const updateDeliveryBoy = (id, data) =>
  api.put(`/users/${id}`, data);

export const deleteDeliveryBoy = (id) =>
  api.delete(`/users/${id}`);
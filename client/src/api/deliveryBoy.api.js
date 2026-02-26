import api from "./axios";

export const getDeliveryBoys = () =>
  api.get("/users");

export const createDeliveryBoy = (data) =>
  api.post("/users", data);

export const updateDeliveryBoy = (id, data) =>
  api.put(`/users/${id}`, data);

export const deactivateDeliveryBoy = (id) =>
  api.put(`/users/${id}/deactivate`);

export const getInactiveDeliveryBoys = () =>
  api.get("/users/inactive");

export const restoreDeliveryBoy = (id) =>
  api.put(`/users/${id}/restore`);
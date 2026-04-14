import axios from "./axios";

export const getDeliveriesByDateAndLane = (date, laneId) =>
  axios.get(`/deliveries?date=${date}&laneId=${laneId}`);

export const upsertDeliveryRecord = (data) =>
  axios.post("/deliveries", data);

export const updateDeliveryRecord = (id, data) =>
  axios.put(`/deliveries/${id}`, data);

export const deleteDeliveryRecord = (id) =>
  axios.delete(`/deliveries/${id}`);

export const generateDefaultRecords = (laneId, date) =>
  axios.post("/delivery-defaults/generate", { laneId, date });
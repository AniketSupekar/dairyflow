import axios from "./axios";

export const getDeliveriesByDateAndLane = (date, laneId) => {
  return axios.get(
    `/deliveries?date=${date}&laneId=${laneId}`
  );
};

export const upsertDeliveryRecord = (data) => {
  return axios.post("/deliveries", data);
};

export const updateDeliveryRecord = (id, data) => {
  return axios.put(`/deliveries/${id}`, data);
};

export const deleteDeliveryRecord = (id) => {
  return axios.delete(`/deliveries/${id}`);
};
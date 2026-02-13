import api from "./axios";

export const getLanes = () => api.get("/lanes");

export const createLane = (data) => api.post("/lanes", data);

export const updateLane = (id, data) =>
  api.put(`/lanes/${id}`, data);

export const deleteLane = (id) =>
  api.delete(`/lanes/${id}`);
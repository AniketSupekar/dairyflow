import api from "./axios";

export const getLanes = () => api.get("/lanes");
export const getInactiveLanes = () => api.get("/lanes/inactive");
export const createLane = (data) => api.post("/lanes", data);
export const updateLane = (id, data) => api.put(`/lanes/${id}`, data);
export const deleteLane = (id) => api.delete(`/lanes/${id}`);
export const restoreLane = (id) => api.put(`/lanes/${id}/restore`);
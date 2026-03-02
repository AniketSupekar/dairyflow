import api from "./axios";

export const getProducts = () => api.get("/products");
export const getInactiveProducts = () => api.get("/products/inactive");
export const createProduct = (data) => api.post("/products", data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const restoreProduct = (id) => api.put(`/products/${id}/restore`);
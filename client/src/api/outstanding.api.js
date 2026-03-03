import api from "./axios";

/**
 * Fetch all customers with outstanding balance.
 * @param {Object} params - { laneId?, sortBy?, order? }
 */
export const getOutstandingList = (params = {}) =>
  api.get("/billing/outstanding", { params });
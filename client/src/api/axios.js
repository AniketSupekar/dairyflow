import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status;
    const code    = error.response?.data?.code;
    const isBlob  = error.config?.responseType === "blob";

    // 401 — session expired, force logout
    if (status === 401 && !isBlob) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // 403 + SUBSCRIPTION_EXPIRED — fire global event
    // AdminLayout listens and shows the upgrade modal
    if (status === 403 && code === "SUBSCRIPTION_EXPIRED") {
      window.dispatchEvent(new CustomEvent("subscriptionExpired"));
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
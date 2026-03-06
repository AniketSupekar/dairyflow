import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 — BUT skip blob requests.
// When responseType is "blob" and the server returns a JSON error (e.g. 401),
// axios receives the body as a Blob instead of parsed JSON. The status code
// is still correct on error.response.status, but we must NOT redirect here —
// the calling function (e.g. handleDownload) needs to handle it locally and
// show a proper error message rather than wiping the session.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isBlob = error.config?.responseType === "blob";
    if (error.response?.status === 401 && !isBlob) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
import axios from "axios";

export const AUTH_STORAGE_KEY = "freshmart_auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Send the login token with every request
api.interceptors.request.use((config) => {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
    if (saved?.token) config.headers.Authorization = `Bearer ${saved.token}`;
  } catch {
    // storage unavailable or corrupted: send the request without a token
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message || "Can't reach the server. Is the backend running?";

    // Token missing, expired or account disabled: log out everywhere
    if (status === 401 && !error.config?.url?.includes("/auth/login")) {
      window.dispatchEvent(new Event("auth:logout"));
    }

    const err = new Error(message);
    err.status = status;
    return Promise.reject(err);
  }
);

export default api;
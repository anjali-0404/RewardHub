import axios from "axios";
import { API_BASE_URL, STORAGE_KEYS } from "@/utils/constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add JWT token and prevent localhost calls on live domains
api.interceptors.request.use(
  (config) => {
    // If running in browser on a deployed host (e.g. Render, Vercel), rewrite any accidental localhost URLs
    if (
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      if (
        config.baseURL &&
        (config.baseURL.includes("localhost") ||
          config.baseURL.includes("127.0.0.1"))
      ) {
        config.baseURL = "/api";
      }
      if (
        config.url &&
        (config.url.startsWith("http://localhost") ||
          config.url.startsWith("http://127.0.0.1"))
      ) {
        config.url = config.url.replace(
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/,
          ""
        );
      }
    }

    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.USER_ROLE);

      // Only redirect if not already on login page
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

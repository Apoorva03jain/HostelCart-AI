import axios from "axios";
import { TOKEN_KEY } from "../utils/constants";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 (token expired/invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/**
 * Extract error message from Axios error
 */
export const extractError = (error) => {
  return {
    message: error.response?.data?.message || "Something went wrong",
    status: error.response?.status || 500,
  };
};

export default api;

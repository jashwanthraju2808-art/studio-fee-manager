/**
 * Central axios instance.
 * Automatically attaches the JWT token to every request.
 * Redirects to /login on 401.
 */
import axios from "axios";

const API = axios.create({ baseURL: "http://127.0.0.1:8000" });

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 — clear token and redirect to login
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;

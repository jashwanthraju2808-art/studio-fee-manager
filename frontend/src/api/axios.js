import axios from "axios";

const API = axios.create({
  baseURL: "https://antar-yoga-api.onrender.com",
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 — clear stored credentials.
// Do NOT call window.location.href here — that triggers a full page reload
// which can interrupt AuthContext's loading state and leave the app stuck.
// AuthContext's .catch() handles the redirect after clearing state.
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      // Let AuthContext catch() handle the redirect cleanly via React Router
      // Only fall back to location.href if we are NOT on /login already
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default API;

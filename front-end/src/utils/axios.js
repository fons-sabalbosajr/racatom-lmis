// src/utils/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL.replace(/\/$/, ""), // remove trailing slash
  withCredentials: true, // send cookies with requests
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 errors (expired session, invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // clear any stored user info
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("onlineUser");

      // ✅ Always send to the correct login route
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

export default api;

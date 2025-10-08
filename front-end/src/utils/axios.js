// src/utils/axios.js
import axios from "axios";
import { lsGet, lsClearAllApp } from "./storage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL.replace(/\/$/, ""), // remove trailing slash
  withCredentials: true, // send cookies with requests
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = lsGet("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    try {
      const dev = lsGet("devSettings") || {};
      if (dev.apiLogging) {
        console.debug("[API REQUEST]", config.method?.toUpperCase(), config.url, {
          params: config.params,
          data: config.data,
        });
      }
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 errors (expired session, invalid token)
api.interceptors.response.use(
  (response) => {
    try {
      const dev = lsGet("devSettings") || {};
      if (dev.apiLogging) {
        console.debug("[API RESPONSE]", response.config.url, response.status, response.data);
      }
    } catch {}
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // clear any stored user info
      lsClearAllApp();

      // ✅ Always send to the correct login route
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

export default api;

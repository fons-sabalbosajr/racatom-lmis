// src/utils/axios.js
import axios from "axios";
import { lsGet, lsGetSession, lsClearAllApp, lsRemove } from "./storage";

// Determine a robust API base URL
const envBase = typeof import.meta !== "undefined" && import.meta.env
  ? import.meta.env.VITE_API_URL
  : undefined;

// Fallback to same host on port 5000 with /api if env is missing
const computedFallback = (() => {
  try {
    const loc = typeof window !== "undefined" ? window.location : null;
    const protocol = loc?.protocol || "http:";
    const hostname = loc?.hostname || "localhost";
    const port = 5000; // backend default from server/server.js
    return `${protocol}//${hostname}:${port}/api`;
  } catch {
    return "http://localhost:5000/api";
  }
})();

// Normalize and export for reuse elsewhere
export const API_BASE_URL = String((envBase && String(envBase).trim()) || computedFallback).replace(/\/$/, "");

const api = axios.create({
  baseURL: API_BASE_URL, // normalized, no trailing slash
  withCredentials: true, // send cookies with requests
  timeout: 15000, // avoid hanging requests (15s default)
});

// Small helper to clear the session-scoped token
function clearSessionToken() {
  try { lsRemove("token"); } catch {}
}

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    // Prefer session token (tab/window scoped) over persisted token
  const token = lsGetSession("token") || lsGet("token");
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
    } catch (e) {
      void e; // ignore
    }
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
    } catch (e) {
      void e; // ignore
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // clear any stored user info
      lsClearAllApp();
      clearSessionToken();

      // ✅ Always send to the correct login route
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

export default api;

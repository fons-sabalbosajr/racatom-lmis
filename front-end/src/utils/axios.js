// src/utils/axios.js
import axios from "axios";
import { lsGet, lsGetSession, lsRemove } from "./storage";

// Determine a robust API base URL and ensure trailing /api path
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

// Normalize and export for reuse elsewhere; ensure "/api" suffix exists
function ensureApiSuffix(raw) {
  try {
    const s = String(raw || "").trim();
    if (!s) return computedFallback;
    // Try URL parsing to manipulate pathname cleanly
    try {
      const u = new URL(s);
      let pathname = u.pathname || "/";
      if (!/\/(api)\/?$/i.test(pathname)) {
        pathname = pathname.replace(/\/$/, "") + "/api";
      }
      return `${u.origin}${pathname}`;
    } catch {
      // Fallback: string operations
      const base = s.replace(/\/$/, "");
      return /(^|\/)api(\/$|$)/i.test(base) ? base : `${base}/api`;
    }
  } catch {
    return computedFallback;
  }
}

export const API_BASE_URL = ensureApiSuffix(envBase || computedFallback);

const api = axios.create({
  baseURL: API_BASE_URL, // normalized, no trailing slash
  // Do not send cookies by default; we rely on Authorization header for isolation
  withCredentials: false,
  timeout: 60000, // avoid hanging requests (60s default)
});

// Small helper to clear the session-scoped token (per tab/window)
function clearSessionToken() {
  try { lsRemove("token"); } catch {}
}

// Track which source provided the token for the last request: "session" | "local" | "none"
let lastTokenSource = "none";
export const getTokenSource = () => lastTokenSource;
export const setRuntimeToken = (token, source = "session") => {
  try {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      lastTokenSource = source;
    } else {
      delete api.defaults.headers.common.Authorization;
      lastTokenSource = "none";
    }
  } catch {}
};

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    // Prefer session token (tab/window scoped) over persisted token
    let s = lsGetSession("token");
    let l = s ? null : lsGet("token");
    let token = s || l;
    lastTokenSource = token ? (s ? "session" : "local") : "none";
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Also include a debug header so backend logs can trace source if needed (harmless in prod)
      try { config.headers["X-Token-Source"] = lastTokenSource; } catch {}
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
      const url = (error.config && (error.config.url || "")) || "";
      // Do not force logout on optional/bootstrap or auth-check endpoints; let callers handle
      if (url.includes("/theme/me") || url.includes("/auth/me") || url.includes("/auth/maintenance-status")) {
        return Promise.reject(error);
      }
      // Attempt silent refresh via HttpOnly cookie
      const original = error.config || {};
      if (!original.__isRetry) {
        original.__isRetry = true;
        return api
          .get("/auth/refresh", { withCredentials: true })
          .then(async (res) => {
            const token = res?.data?.data?.token;
            if (token) {
              try {
                // Store session-scoped token and set runtime header
                const { lsSetSession } = await import("./storage");
                lsSetSession("token", token);
              } catch {}
              try { api.defaults.headers.common.Authorization = `Bearer ${token}`; } catch {}
              original.headers = original.headers || {};
              original.headers.Authorization = `Bearer ${token}`;
              return api(original);
            }
            return Promise.reject(error);
          })
          .catch((e) => {
            // Silent refresh failed; proceed to clear and redirect below
            // fallthrough
            return Promise.reject(error);
          });
      }
      // Avoid redirect loop if already on login page
      if (typeof window !== "undefined" && window.location && window.location.pathname === "/login") {
        return Promise.reject(error);
      }
      // Only clear the auth token for this tab; avoid nuking other tabs' state
      clearSessionToken();
      try {
        // Best-effort minimal clean: remove user for this tab only
        lsRemove("user");
      } catch {}
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

export default api;

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DevSettingsProvider } from "./context/DevSettingsContext";
import { ConfigProvider } from "antd";
import { setRuntimeToken } from "./utils/axios";
import { lsGetSession, lsGet } from "./utils/storage";

// On boot, if a token exists in session/local storage, apply it to axios defaults so
// the very first bootstrap requests (e.g., /auth/me) include the Bearer header.
try {
  // 1) Read existing encrypted token first
  let encToken = lsGetSession("token") || lsGet("token");
  // 2) If missing, migrate any legacy/plain tokens into encrypted session storage
  if (!encToken && typeof window !== "undefined") {
    try {
      const legacySess = window.sessionStorage?.getItem("__session_token") || window.sessionStorage?.getItem("token");
      const legacyLocal = !legacySess ? (window.localStorage?.getItem("__session_token") || window.localStorage?.getItem("token")) : null;
      const legacy = legacySess || legacyLocal;
      if (legacy) {
        // Write to encrypted session storage
        const { lsSetSession } = await import("./utils/storage");
        lsSetSession("token", legacy);
        encToken = legacy;
      }
    } catch {}
  }
  // 3) Apply runtime Authorization header if we have a token
  if (encToken) setRuntimeToken(encToken, lsGetSession("token") ? "session" : "local");
  // 4) Cleanup legacy/plain token keys afterwards
  try { window.sessionStorage?.removeItem("__session_token"); } catch {}
  try { window.localStorage?.removeItem("__session_token"); } catch {}
  try { window.sessionStorage?.removeItem("token"); } catch {}
  try { window.localStorage?.removeItem("token"); } catch {}
} catch {}

// Use a single, static Ant Design theme (no dark/light switching globally)
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <DevSettingsProvider>
      <ConfigProvider>
        <App />
      </ConfigProvider>
    </DevSettingsProvider>
  </BrowserRouter>
);

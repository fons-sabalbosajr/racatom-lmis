// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spin, message } from "antd";
import api, { setRuntimeToken } from "../utils/axios";
import {
  lsSetSession,
  lsClearAllApp,
  lsGetSession,
  lsGet,
} from "../utils/storage";

function ProtectedRoute({ children }) {
  const [isValid, setIsValid] = useState(null);
  const [maint, setMaint] = useState({ maintenance: false, allowed: true });
  const location = useLocation();
  // Idle timeout: if auth check doesn't resolve within 60s, force logout/reset
  useEffect(() => {
    let timer;
    if (isValid === null) {
      timer = setTimeout(() => {
        try {
          lsClearAllApp();
        } catch {}
        setIsValid(false);
      }, 60000); // 60 seconds
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isValid]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Ensure the axios runtime header is set from storage before calling /auth/me
        try {
          const t = lsGetSession("token") || lsGet("token");
          if (t) {
            setRuntimeToken(t, lsGetSession("token") ? "session" : "local");
          } else {
            // No token yet; wait briefly and retry (startup may still be migrating)
            setTimeout(checkAuth, 120);
            return;
          }
        } catch {}
        const res = await api.get(`/auth/me`);

        const user = res.data?.data?.user;

        if (user) {
          // Store minimal user info in sessionStorage (per-tab) to avoid cross-tab bleed
          lsSetSession("user", user);
          // dev banner removed
          // Check maintenance status for this user
          try {
            const m = await api.get(`/auth/maintenance-status`);
            setMaint({
              maintenance: !!m.data?.maintenance,
              allowed: !!m.data?.allowed,
            });
          } catch {
            setMaint({ maintenance: false, allowed: true });
          }
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      } catch (err) {
        console.error(
          "ProtectedRoute /auth/me error:",
          err.response?.data || err
        );
        // If we have no token at all, redirect to login; otherwise allow a retry by marking invalid
        const hasToken = Boolean(lsGetSession("token") || lsGet("token"));
        if (!hasToken) {
          message.error("Session expired. Please login again.");
          lsClearAllApp();
        }
        // Retry once shortly if we do have a token (migration may still be applying)
        if (hasToken) {
          setTimeout(async () => {
            try {
              const res2 = await api.get(`/auth/me`);
              const user2 = res2.data?.data?.user;
              if (user2) {
                lsSetSession("user", user2);
                setIsValid(true);
                return;
              }
            } catch {}
            setIsValid(false);
          }, 150);
        } else {
          setIsValid(false);
        }
      }
    };

    checkAuth();
  }, []);

  if (isValid === null)
    return <Spin fullscreen tip="Checking authentication..." size="large" />;

  // If the app is in maintenance and the user is not allowed, send to maintenance page
  if (
    maint.maintenance &&
    !maint.allowed &&
    location.pathname !== "/maintenance"
  ) {
    return <Navigate to="/maintenance" replace />;
  }

  if (!isValid) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;

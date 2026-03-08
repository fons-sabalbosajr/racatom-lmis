// src/components/ProtectedRoute.jsx
import React, { useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spin } from "antd";
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
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // ── Fast-path: no token in storage → skip API call entirely ──
    const token = lsGetSession("token") || lsGet("token");
    if (!token) {
      setIsValid(false);
      return;
    }

    // Ensure axios has the token set before calling
    try {
      setRuntimeToken(token, lsGetSession("token") ? "session" : "local");
    } catch {}

    // ── Parallel fetch: /auth/me + /maintenance-status ──
    const checkAuth = async () => {
      try {
        const [meRes, maintRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/auth/maintenance-status").catch(() => ({
            data: { maintenance: false, allowed: true },
          })),
        ]);

        const user = meRes.data?.data?.user;
        if (user) {
          lsSetSession("user", user);
          setMaint({
            maintenance: !!maintRes.data?.maintenance,
            allowed: !!maintRes.data?.allowed,
          });
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      } catch {
        // Token is invalid or expired — clear and redirect
        lsClearAllApp();
        setIsValid(false);
      }
    };

    checkAuth();
  }, []);

  // Still checking — show spinner
  if (isValid === null) {
    return <Spin fullscreen tip="Checking authentication..." size="large" />;
  }

  // Maintenance mode — redirect non-allowed users
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

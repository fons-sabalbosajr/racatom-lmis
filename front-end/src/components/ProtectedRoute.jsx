// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spin, message } from "antd";
import api from "../utils/axios";
import { lsSetSession, lsClearAllApp } from "../utils/storage";

function ProtectedRoute({ children }) {
  const [isValid, setIsValid] = useState(null);
  const [maint, setMaint] = useState({ maintenance: false, allowed: true });
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get(`/auth/me`);

  const user = res.data?.data?.user;

        if (user) {
          // Store minimal user info in sessionStorage (per-tab) to avoid cross-tab bleed
          lsSetSession("user", user);
          // Check maintenance status for this user
          try {
            const m = await api.get(`/auth/maintenance-status`);
            setMaint({ maintenance: !!m.data?.maintenance, allowed: !!m.data?.allowed });
          } catch {
            setMaint({ maintenance: false, allowed: true });
          }
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      } catch (err) {
        console.error("ProtectedRoute /auth/me error:", err.response?.data || err);
  message.error("Session expired. Please login again.");
  lsClearAllApp();
        setIsValid(false);
      }
    };

    checkAuth();
  }, []);

  if (isValid === null)
    return <Spin fullscreen tip="Checking authentication..." size="large" />;

  // If the app is in maintenance and the user is not allowed, send to maintenance page
  if (maint.maintenance && !maint.allowed && location.pathname !== "/maintenance") {
    return <Navigate to="/maintenance" replace />;
  }

  if (!isValid) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;

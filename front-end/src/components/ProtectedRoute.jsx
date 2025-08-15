import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Spin } from "antd";
import axios from "axios";
import { decryptData, encryptData } from "../utils/storage";

function ProtectedRoute({ children }) {
  const [isValid, setIsValid] = useState(null);

  const token = (() => {
    try {
      return decryptData(localStorage.getItem("token"));
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!token) {
      setIsValid(false);
      return;
    }

    axios
      .get(`${import.meta.env.VITE_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data && res.data.user) {
          // ✅ Store encrypted user as JSON
          localStorage.setItem("user", encryptData(JSON.stringify(res.data.user)));
          setIsValid(true);
        } else {
          throw new Error("Invalid user data");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsValid(false);
      });
  }, [token]);

  if (isValid === null) {
    return <Spin fullscreen tip="Checking authentication..." size="large" />;
  }

  if (!isValid) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;

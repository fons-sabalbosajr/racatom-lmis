// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Spin, message } from "antd";
import axios from "axios";
import { encryptData } from "../utils/storage";

function ProtectedRoute({ children }) {
  const [isValid, setIsValid] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`, {
          withCredentials: true, // important for cookie
        });

        const user = res.data?.data?.user;

        if (user) {
          // Optional: store minimal user info in localStorage
          localStorage.setItem("user", encryptData(user));
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      } catch (err) {
        console.error("ProtectedRoute /auth/me error:", err.response?.data || err);
        message.error("Session expired. Please login again.");
        localStorage.removeItem("user");
        setIsValid(false);
      }
    };

    checkAuth();
  }, []);

  if (isValid === null)
    return <Spin fullscreen tip="Checking authentication..." size="large" />;

  if (!isValid) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;

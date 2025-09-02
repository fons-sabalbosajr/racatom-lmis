import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Spin, Typography, message } from "antd";

const { Text } = Typography;

function Verify() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatusMessage("Invalid verification link.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/verify-token/${token}`
        );
        const data = await res.json();

        if (res.ok) {
          message.success(data.message);
          setStatusMessage(data.message);
        } else {
          message.error(data.message);
          setStatusMessage(data.message);
        }
      } catch (err) {
        console.error(err);
        message.error("Verification failed. Please try again.");
        setStatusMessage("Verification failed. Please try again.");
      } finally {
        setLoading(false);

        // Redirect to login after 3 seconds
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      <Card style={{ textAlign: "center", minWidth: 300 }}>
        {loading ? <Spin /> : <Text>{statusMessage}</Text>}
      </Card>
    </div>
  );
}

export default Verify;

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Spin, Typography } from "antd";
import api from "../../utils/axios";

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
        const res = await api.get(`/auth/verify-token/${token}`);
        const data = res.data;
        setStatusMessage(data?.message || "Verification complete.");
      } catch (err) {
        console.error(err);
        setStatusMessage("An error occurred during verification. Please try again.");
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

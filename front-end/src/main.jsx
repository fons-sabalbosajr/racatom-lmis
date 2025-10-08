import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DevSettingsProvider } from "./context/DevSettingsContext";
import { ConfigProvider } from "antd";

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

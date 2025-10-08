import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DevSettingsProvider } from "./context/DevSettingsContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <DevSettingsProvider>
      <App />
    </DevSettingsProvider>
  </BrowserRouter>
);

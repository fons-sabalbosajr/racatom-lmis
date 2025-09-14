import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login/Login";
import Home from "./pages/Home/Home";
import CreateAccount from "./pages/CreateAccount/CreateAccount";
import VerifyEmail from "./pages/Login/VerifyEmail";
import ForgotPassword from "./pages/Login/ForgotPassword";
import ResetPassword from "./pages/Login/ResetPassword";
import Verify from "./pages/Home/Verify";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard/Dashboard";
import Loans from "./pages/Loans/Loans";
import Reports from "./pages/Reports/Reports";

// Settings subpages
import LoanRates from "./pages/Settings/LoanRateConfig/LoanRateConfig";
import Accounts from "./pages/Settings/Accounts/Accounts";
import Database from "./pages/Settings/Database/Database";
import Announcements from "./pages/Settings/Annoucements/Announcements";
import CollectorAccounts from "./pages/Settings/CollectorAccounts/CollectorAccounts";
import Accounting from "./pages/Settings/AccountingCenter/AccountingCenter";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/create-account" element={<CreateAccount />} />
      <Route path="/verify/:token" element={<Verify />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      >
        {/* Redirect / to /dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Nested routes inside Home layout */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="loans" element={<Loans />} />
        <Route path="reports" element={<Reports />} />

        {/* Flattened Settings subpages */}
        <Route path="settings/loan-rates" element={<LoanRates />} />
        <Route path="settings/employees" element={<Accounts />} />
        <Route path="settings/collectors" element={<CollectorAccounts />} />
        <Route path="settings/database" element={<Database />} />
        <Route path="settings/announcements/:id" element={<Announcements />} />
        <Route path="settings/announcements" element={<Announcements />} />
        <Route path="settings/accounting" element={<Accounting />} />

        {/* Optional: redirect /settings to a default subpage */}
        <Route
          path="settings"
          element={<Navigate to="settings/loan-rates" replace />}
        />
      </Route>
    </Routes>
  );
}

export default App;

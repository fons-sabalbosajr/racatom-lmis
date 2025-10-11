// src/App.jsx
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
import Maintenance from "./pages/Maintenance/Maintenance";
import Dashboard from "./pages/Dashboard/Dashboard";
import Loans from "./pages/Loans/Loans";
import Reports from "./pages/Reports/Reports";
import SOA from "./pages/Reports/components/StatementofAccounts";
import CollectionsList from "./pages/Reports/components/CollectionList";
import AccountVouchers from "./pages/Reports/components/AccountVouchers";

// Settings subpages
import LoanRates from "./pages/Settings/LoanRateConfig/LoanRateConfig";
import Accounts from "./pages/Settings/Accounts/Accounts";
import Database from "./pages/Settings/Database/Database";
import Announcements from "./pages/Settings/Annoucements/Announcements";
import CollectorAccounts from "./pages/Settings/CollectorAccounts/CollectorAccounts";
import Accounting from "./pages/Settings/AccountingCenter/AccountingCenter";
import DeveloperSettings from "./pages/Settings/Developer/DeveloperSettings";

function App() {
  return (
    <Routes>
      {/* Default redirect if hitting root */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
  <Route path="/maintenance" element={<Maintenance />} />
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
        {/* Redirect / to /dashboard (inside protected area) */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<Dashboard />} />
        <Route path="loans" element={<Loans />} />
        <Route
          path="loans/update-needed"
          element={<Navigate to="/loans" replace />}
        />
        <Route path="reports/statement-of-accounts" element={<SOA />} />
        <Route path="reports/collections-list" element={<CollectionsList />} />
        <Route path="reports/account-vouchers" element={<AccountVouchers />} />

        {/* Settings subpages */}
        <Route path="settings/loan-rates" element={<LoanRates />} />
        <Route path="settings/employees" element={<Accounts />} />
        <Route path="settings/collectors" element={<CollectorAccounts />} />
        <Route path="settings/database" element={<Database />} />
        <Route path="settings/announcements/:id" element={<Announcements />} />
        <Route path="settings/announcements" element={<Announcements />} />
        <Route path="settings/accounting" element={<Accounting />} />
  <Route path="settings/developer" element={<DeveloperSettings />} />

        {/* Default redirect inside settings */}
        <Route
          path="settings"
          element={<Navigate to="/settings/loan-rates" replace />}
        />
      </Route>
    </Routes>
  );
}

export default App;

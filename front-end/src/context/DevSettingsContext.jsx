import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { lsGet, lsSet, lsGetSession, lsGet as lsGetLocal } from "../utils/storage";
import apiClient from "../utils/axios";

const STORAGE_KEY = "devSettings";

const defaultSettings = {
  compactUI: false,
  maskUsernames: false,
  showDebugInfo: false,
  apiLogging: false,
  // UI Colors (kept):
  headerBg: "#ffffff",
  siderBg: "#001529",
  // Loans
  showStatusSummary: true,
  enableCollectionStatusCheck: true,
  autoLoanStatus: false,
  autoLoanStatusGrace: {
    dormantDays: 365,
    litigationDaysAfterMaturity: 180, // 6 months approx
    pastDueDaysAfterMaturity: 7,
    arrearsDailyDays: 3,
    arrearsWeeklyDays: 7,
    arrearsSemiMonthlyDays: 15,
    arrearsMonthlyDays: 30,
  },
  // Collections
  collectionsDedupeOnFetch: true,
  collectionsShowImportActions: true,
  // Users
  allowUserDelete: true,
  // Access toggles (developer-managed; optional override UI gating)
  accessEmployees: true,
  accessAnnouncements: true,
};

const DevSettingsContext = createContext({
  settings: defaultSettings,
  setSetting: () => {},
  resetSettings: () => {},
  refreshTheme: async () => {},
});

export function DevSettingsProvider({ children }) {
  // Bootstrap from local storage; we may briefly gate initial render on a fresh device to avoid a theme flash
  const savedLocal = lsGet(STORAGE_KEY);
  const [settings, setSettings] = useState(() => (savedLocal ? { ...defaultSettings, ...savedLocal } : defaultSettings));
  const sessionUser = lsGetSession("user") || lsGet("user");
  // Gate only when user is logged in AND there is no prior local settings cache
  const [hydratingTheme, setHydratingTheme] = useState(() => Boolean(sessionUser && !savedLocal));

  // One-time no-flash hydration: on a fresh device, fetch theme before first paint
  useEffect(() => {
    if (!hydratingTheme) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/theme/me");
        if (!cancelled && res?.data?.success && res.data.data) {
          const { headerBg, siderBg } = res.data.data;
          setSettings((prev) => ({
            ...prev,
            ...(typeof siderBg === "string" && siderBg ? { siderBg } : {}),
            ...(typeof headerBg === "string" && headerBg ? { headerBg } : {}),
          }));
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setHydratingTheme(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydratingTheme]);

  useEffect(() => {
    // Only persist dev settings when a user is logged in; avoid repopulating storage on logout
    const hasUser = Boolean(lsGetSession("user") || lsGet("user"));
    if (!hasUser) return;
    lsSet(STORAGE_KEY, settings);
  }, [settings]);

  // No global theme mode toggling; we only persist chosen settings

  const api = useMemo(
    () => ({
      settings,
      setSetting: (key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
        // Persist theme choices to current user on the server when possible
        if (key === "siderBg" || key === "headerBg") {
          // persist to backend user theme collection (fire-and-forget)
          apiClient.put("/theme/me", { [key]: value }).catch(() => {});
        }
      },
      resetSettings: () => setSettings(defaultSettings),
      refreshTheme: async () => {
        try {
          const res = await apiClient.get("/theme/me");
          if (res?.data?.success && res.data.data) {
            const { headerBg, siderBg } = res.data.data;
            setSettings((prev) => ({
              ...prev,
              ...(typeof siderBg === "string" && siderBg ? { siderBg } : {}),
              ...(typeof headerBg === "string" && headerBg ? { headerBg } : {}),
            }));
          }
        } catch {
          // ignore
        }
      },
    }),
    [settings]
  );

  return (
    <DevSettingsContext.Provider value={api}>
      {/* Avoid a first-paint theme flash on fresh devices by holding render until hydration completes */}
      {hydratingTheme ? null : children}
    </DevSettingsContext.Provider>
  );
}

export function useDevSettings() {
  return useContext(DevSettingsContext);
}

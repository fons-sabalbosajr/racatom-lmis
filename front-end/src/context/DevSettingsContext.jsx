import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { lsGet, lsSet } from "../utils/storage";

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
});

export function DevSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = lsGet(STORAGE_KEY);
    return saved ? { ...defaultSettings, ...saved } : defaultSettings;
  });

  useEffect(() => {
    lsSet(STORAGE_KEY, settings);
  }, [settings]);

  // No global theme mode toggling; we only persist chosen settings

  const api = useMemo(
    () => ({
      settings,
      setSetting: (key, value) =>
        setSettings((prev) => ({ ...prev, [key]: value })),
      resetSettings: () => setSettings(defaultSettings),
    }),
    [settings]
  );

  return (
    <DevSettingsContext.Provider value={api}>
      {children}
    </DevSettingsContext.Provider>
  );
}

export function useDevSettings() {
  return useContext(DevSettingsContext);
}

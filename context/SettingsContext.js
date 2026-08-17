import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../services/settingsService';

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  isReady: false,
  updateSettings: async () => DEFAULT_SETTINGS,
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    getSettings()
      .then((loaded) => {
        setSettings(loaded);
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  const updateSettings = useCallback(async (partialSettings) => {
    const nextSettings = await saveSettings({ ...settings, ...partialSettings });
    setSettings(nextSettings);
    return nextSettings;
  }, [settings]);

  const value = useMemo(() => ({ settings, isReady, updateSettings }), [settings, isReady, updateSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

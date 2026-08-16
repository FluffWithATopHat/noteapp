import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from '../constants/colors';

const THEME_KEY = '@noteapp:theme';

const ThemeContext = createContext({
  theme: themes.light,
  themeId: 'light',
  setThemeId: () => {},
});

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState('light');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved && themes[saved]) {
        setThemeIdState(saved);
      }
    });
  }, []);

  const setThemeId = (id) => {
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_KEY, id);
  };

  return (
    <ThemeContext.Provider value={{ theme: themes[themeId] || themes.light, themeId, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

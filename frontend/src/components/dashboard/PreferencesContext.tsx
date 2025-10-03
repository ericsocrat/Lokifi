'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type DarkModeOption = 'off' | 'on' | 'system' | 'sunset';
export type NumberFormatOption = 'system' | 'us' | 'europe' | 'nordic' | 'swiss';
export type FontSizeOption = 'sm' | 'md' | 'lg';

interface PreferencesContextType {
  darkMode: DarkModeOption;
  setDarkMode: (v: DarkModeOption) => void;
  numberFormat: NumberFormatOption;
  setNumberFormat: (v: NumberFormatOption) => void;
  fontSize: FontSizeOption;
  setFontSize: (v: FontSizeOption) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const PREF_KEY = 'lokifi.preferences.v1';

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<DarkModeOption>('off');
  const [numberFormat, setNumberFormat] = useState<NumberFormatOption>('system');
  const [fontSize, setFontSize] = useState<FontSizeOption>('md');

  // Load preferences
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.darkMode) setDarkMode(parsed.darkMode);
        if (parsed.numberFormat) setNumberFormat(parsed.numberFormat);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist & apply side effects
  useEffect(() => {
    const data = { darkMode, numberFormat, fontSize };
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
    // Theme application
    if (darkMode === 'on') {
      document.documentElement.classList.add('dark');
    } else if (darkMode === 'off') {
      document.documentElement.classList.remove('dark');
    } else if (darkMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.matches
        ? document.documentElement.classList.add('dark')
        : document.documentElement.classList.remove('dark');
    } else if (darkMode === 'sunset') {
      const hour = new Date().getHours();
      const isNight = hour >= 18 || hour < 6;
      isNight
        ? document.documentElement.classList.add('dark')
        : document.documentElement.classList.remove('dark');
    }
    document.documentElement.dataset['fontSize'] = fontSize;
  }, [darkMode, numberFormat, fontSize]);

  return (
    <PreferencesContext.Provider
      value={{ darkMode, setDarkMode, numberFormat, setNumberFormat, fontSize, setFontSize }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
};

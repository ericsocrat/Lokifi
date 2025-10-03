'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface PreferencesContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  currency: string;
  setCurrency: (value: string) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [currency, setCurrency] = useState('USD');

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedCurrency = localStorage.getItem('currency');

    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    }
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  return (
    <PreferencesContext.Provider value={{ darkMode, setDarkMode, currency, setCurrency }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

import { createContext, useContext } from 'react';
import type { Locale, Theme } from './preferences';
export const PreferencesContext = createContext<{ locale: Locale; theme: Theme; setLocale: (value: Locale) => void; setTheme: (value: Theme) => void; t: (value: string, values?: Record<string, string | number>) => string }>({ locale: 'en', theme: 'dark', setLocale: () => {}, setTheme: () => {}, t: value => value });
export const usePreferences = () => useContext(PreferencesContext);
export const useTranslation = () => usePreferences().t;

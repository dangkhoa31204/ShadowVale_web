import { useEffect, useState, type ReactNode } from 'react';
import { PreferencesContext } from './preferencesContext';
import { readPreferences, formatTranslation, PREFERENCES_KEY, type Locale, type Theme } from './preferences';
import { vi } from './vi';
function stored() { try { return readPreferences(localStorage.getItem(PREFERENCES_KEY)); } catch { return readPreferences(null); } }
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(stored);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.lang = preferences.locale;
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
    document.documentElement.style.colorScheme = preferences.theme;
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Settings still work for this tab. */ }
  }, [preferences]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === PREFERENCES_KEY) setPreferences(readPreferences(event.newValue)); };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, []);
  const setLocale = (locale: Locale) => setPreferences(p => ({ ...p, locale }));
  const setTheme = (theme: Theme) => setPreferences(p => ({ ...p, theme }));
  const t = (value: string, values?: Record<string, string | number>) => formatTranslation(preferences.locale === 'vi' ? vi[value] || value : value, values);
  return <PreferencesContext.Provider value={{ ...preferences, setLocale, setTheme, t }}>{children}</PreferencesContext.Provider>;
}

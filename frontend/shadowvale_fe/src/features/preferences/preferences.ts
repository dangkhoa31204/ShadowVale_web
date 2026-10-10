export type Locale = 'en' | 'vi';
export type Theme = 'dark' | 'light';
export const PREFERENCES_KEY = 'shadowvale_preferences_v1';
export function readPreferences(raw: string | null): { locale: Locale; theme: Theme } {
  try { const value = JSON.parse(raw || '{}'); return { locale: value.locale === 'vi' ? 'vi' : 'en', theme: value.theme === 'light' ? 'light' : 'dark' }; }
  catch { return { locale: 'en', theme: 'dark' }; }
}
export function formatTranslation(text: string, values: Record<string, string | number> = {}) {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

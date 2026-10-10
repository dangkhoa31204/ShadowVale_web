import { usePreferences } from './preferencesContext';
import { Icon } from '../shared/ui';
export function PreferencesControls() {
  const { locale, theme, setLocale, setTheme, t } = usePreferences();
  return <div className="sv-preferences">
    <label className="sv-language-control"><Icon name="translate" /><span className="sv-sr-only">{t('Language')}</span><select aria-label={t('Language')} value={locale} onChange={e => setLocale(e.target.value === 'vi' ? 'vi' : 'en')}><option value="en">{t("English")}</option><option value="vi">{t("Tiếng Việt")}</option></select></label>
    <button type="button" className="sv-theme-control" aria-label={t(theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')} title={t(theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} /></button>
  </div>;
}

import { useTranslation } from '../preferences/preferencesContext';
import { useState } from 'react';
import { useWorkspace } from '../content/workspaceContext';
import { apiBaseURL, isDemoMode } from '../../config/environment';
import { PageHeading } from '../shared/ui';
export function SettingsPage() {
  const t = useTranslation();
  const { state, execute, busy } = useWorkspace();
  const [telemetry, setTelemetry] = useState(state.config.telemetryEnabled);
  return <div className="sv-page"><PageHeading eyebrow={t("ADMINISTRATION")} title={t("Platform configuration")} description={t("Review release policy and configure telemetry ingestion preferences.")} />
    <section className="sv-panel sv-settings"><h2>{t("Release policy")}</h2><label className="sv-checkbox"><input type="checkbox" checked disabled /> {t("Require admin approval before publishing")}</label><p>{t("Published bundles must pass schema v1 validation. Review approval applies to a locked draft revision.")}</p>
      <h2>{t("Telemetry")}</h2><label className="sv-checkbox"><input type="checkbox" checked={telemetry} onChange={e => setTelemetry(e.target.checked)} />{t("Enable anonymized telemetry ingestion")}</label><p>{isDemoMode ? t("This demo stores the preference locally. The backend must apply it to ingestion; the game’s uploader has its own environment setting.") : t("The API must apply this preference to the ingestion service.")}</p>
      <button className="sv-button sv-button-primary" disabled={busy || telemetry === state.config.telemetryEnabled} onClick={async () => { try { await execute({ type: 'saveConfig', telemetryEnabled: telemetry }); } catch { /* reported */ } }}>{t("Save configuration")}</button>
    </section><section className="sv-panel sv-settings"><h2>{t("Connection")}</h2><dl><div><dt>{t("Mode")}</dt><dd>{isDemoMode ? t("Frontend demo · browser storage") : t("API · JWT authentication")}</dd></div><div><dt>{t("API base URL")}</dt><dd><code>{apiBaseURL}</code></dd></div><div><dt>{t("Unity active bundle endpoint")}</dt><dd><code>{t("/api/v1/content/bundles/active")}</code></dd></div><div><dt>{t("Content schema")}</dt><dd>{t("v1 · snake_case JSON")}</dd></div></dl></section>
  </div>;
}

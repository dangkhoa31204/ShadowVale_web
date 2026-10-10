import { useState } from 'react';
import { useWorkspace } from '../content/workspaceContext';
import { apiBaseURL, isDemoMode } from '../../config/environment';
import { PageHeading } from '../shared/ui';
export function SettingsPage() {
  const { state, execute, busy } = useWorkspace();
  const [telemetry, setTelemetry] = useState(state.config.telemetryEnabled);
  return <div className="sv-page"><PageHeading eyebrow="ADMINISTRATION" title="Platform configuration" description="Review release policy and configure telemetry ingestion preferences." />
    <section className="sv-panel sv-settings"><h2>Release policy</h2><label className="sv-checkbox"><input type="checkbox" checked disabled /> Require admin approval before publishing</label><p>Published bundles must pass schema v1 validation. Review approval applies to a locked draft revision.</p>
      <h2>Telemetry</h2><label className="sv-checkbox"><input type="checkbox" checked={telemetry} onChange={e => setTelemetry(e.target.checked)} />Enable anonymized telemetry ingestion</label><p>{isDemoMode ? 'This demo stores the preference locally. The backend must apply it to ingestion; the game’s uploader has its own environment setting.' : 'The API must apply this preference to the ingestion service.'}</p>
      <button className="sv-button sv-button-primary" disabled={busy || telemetry === state.config.telemetryEnabled} onClick={async () => { try { await execute({ type: 'saveConfig', telemetryEnabled: telemetry }); } catch { /* reported */ } }}>Save configuration</button>
    </section><section className="sv-panel sv-settings"><h2>Connection</h2><dl><div><dt>Mode</dt><dd>{isDemoMode ? 'Frontend demo · browser storage' : 'API · JWT authentication'}</dd></div><div><dt>API base URL</dt><dd><code>{apiBaseURL}</code></dd></div><div><dt>Unity active bundle endpoint</dt><dd><code>/api/v1/content/bundles/active</code></dd></div><div><dt>Content schema</dt><dd>v1 · snake_case JSON</dd></div></dl></section>
  </div>;
}

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Empty, Icon, Status } from '../shared/ui';
import { dateLabel, downloadJson } from '../shared/format';
import { useGameDelivery } from './gameDeliveryContext';
import { bytesLabel, categories } from './types';
import { isDemoMode } from '../../config/environment';
export function GamePublishPanel() {
  const { state, loading, busy, error, publish, refresh } = useGameDelivery();
  const [params] = useSearchParams();
  const [id, setId] = useState(params.get('build') || ''), [version, setVersion] = useState(''), [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; revision: number; version: string; notes: string } | null>(null);
  const approved = state.builds.filter(b => b.status === 'approved' && !b.stale), selected = approved.find(b => b.id === id) || approved[0];
  const valid = /^\d+\.\d+\.\d+$/.test(version) && selected && !state.releases.some(r => r.platform === selected.platform && r.release_version === version);
  const confirmedBuild = confirm && approved.find(b => b.id === confirm.id && b.revision === confirm.revision);
  const confirmationValid = confirm && confirmedBuild && !state.releases.some(r => r.platform === confirmedBuild.platform && r.release_version === confirm.version);
  async function publishSelected() { if (!confirm || !confirmedBuild || !confirmationValid) return; try { await publish(confirmedBuild, confirm.version, confirm.notes); setConfirm(null); setVersion(''); setNotes(''); } catch { /* Provider reports errors. */ } }
  return <>
    <section className="sv-panel"><div className="sv-panel-heading"><div><h2>Game bundle{isDemoMode && <span className="sv-demo-data">Demo data</span>}</h2><p>Maps, models, graphics and gameplay data.</p></div><Link className="sv-button sv-button-small" to="/admin/reviews?source=game">Review game changes</Link></div>
      {error && <div className="sv-alert sv-game-error" role="alert">{error}<button className="sv-button sv-button-small" onClick={() => void refresh()}>Retry</button></div>}
      {loading ? <div className="sv-empty" role="status">Loading builds…</div> : !approved.length ? <Empty title="No approved game build" /> : <div className="sv-game-compose sv-form">
        <label>Approved build<select value={selected?.id || ''} onChange={e => setId(e.target.value)}>{approved.map(b => <option key={b.id} value={b.id}>{b.commit.slice(0, 8)} · {b.platform} · {b.title}</option>)}</select></label>
        <label>Game version<input placeholder="e.g. 1.2.0" value={version} onChange={e => setVersion(e.target.value)} /></label>
        <label>Release notes<textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></label>
        {selected && <div className="sv-bundle-contents"><div className="sv-bundle-categories">{categories.filter(c => selected.changes.some(change => change.category === c.key)).map(c => <span key={c.key}><Icon name={c.icon} />{c.label}</span>)}</div><h3>Included in this version</h3><div className="sv-bundle-files"><div><Icon name="data_object" /><span><strong>Gameplay JSON</strong><small>Quests, maps and game settings</small></span></div>{selected.artifacts.filter(a => a.kind === 'assetbundle').map(a => <div key={a.file}><Icon name="inventory_2" /><span><strong>{a.file}</strong><small>{bytesLabel(a.size_bytes)}</small></span></div>)}</div></div>}
        {selected && <div className="sv-game-release-summary"><span>{selected.artifacts.filter(a => a.kind === 'assetbundle').length} AssetBundles · {bytesLabel(selected.artifacts.reduce((sum, a) => sum + a.size_bytes, 0))}</span><span>Client ≥ {selected.min_client_version}</span>{selected.requires_client_update && <span>Compatible client build required</span>}<Link to={'/admin/reviews?source=game&build=' + encodeURIComponent(selected.id)}>View changes</Link></div>}
        <button className="sv-button sv-button-primary" disabled={!valid || busy || !!error} onClick={() => selected && setConfirm({ id: selected.id, revision: selected.revision, version, notes })}><Icon name="deployed_code" />Publish game version</button>
      </div>}
    </section>
    {!!state.releases.length && <section className="sv-panel"><div className="sv-panel-heading"><h2>Game versions</h2></div><div className="sv-table-wrap"><table className="sv-table"><thead><tr><th>Version</th><th>Platform</th><th>Source</th><th>Published</th><th>Status</th><th>Actions</th></tr></thead><tbody>{state.releases.map(r => <tr key={r.platform + r.release_version}><td><strong>v{r.release_version}</strong></td><td>{r.platform}</td><td className="sv-mono">{r.source_commit.slice(0, 8)}</td><td>{dateLabel(r.published_at)}</td><td><Status value={state.active[r.platform] === r.platform + ':' + r.release_version ? 'active' : 'archived'} /></td><td><div className="sv-table-actions"><Link className="sv-button sv-button-small" to={'/admin/reviews?source=game&build=' + encodeURIComponent(r.source_build_id)}>View changes</Link><button className="sv-button sv-button-small" onClick={() => downloadJson(r, 'shadowvale-game-v' + r.release_version + '-' + r.platform + '.json')}>JSON</button></div></td></tr>)}</tbody></table></div></section>}
    {confirm && <div className="sv-modal-backdrop"><section className="sv-modal" role="dialog" aria-modal="true" aria-labelledby="game-publish-confirm"><h2 id="game-publish-confirm">Publish game v{confirm.version}?</h2>{confirmedBuild ? <p>{confirmedBuild.platform} · {confirmedBuild.commit.slice(0, 8)} · Client ≥ {confirmedBuild.min_client_version}</p> : <p role="alert">This build changed. Close and select a build again.</p>}{isDemoMode && <p>Demo release</p>}<div><button className="sv-button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button className="sv-button sv-button-primary" disabled={busy || !!error || !confirmationValid} onClick={() => void publishSelected()}>{busy ? 'Publishing…' : 'Confirm'}</button></div></section></div>}
  </>;
}

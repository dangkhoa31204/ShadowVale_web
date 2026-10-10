import { useTranslation } from '../preferences/preferencesContext';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BundleDetails } from '../content/BundleDetails';
import { Empty, Icon, Status } from '../shared/ui';
import { dateLabel } from '../shared/format';
import { isDemoMode } from '../../config/environment';
import { useGameDelivery } from './gameDeliveryContext';
import { gameDeliveryService } from './gameDeliveryService';
import { categories, bytesLabel, type GameBuild } from './types';
function BuildPreview({ build, file, sourcePath }: { build: GameBuild; file: string; sourcePath?: string }) {
  const [image, setImage] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let url = '';
    gameDeliveryService.preview(build.id, file, controller.signal, sourcePath).then(blob => { if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setImage(url); } }).catch(() => { if (!controller.signal.aborted) setError('Preview unavailable.'); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [build.id, file, sourcePath]);
  return <div className="sv-build-preview">{image ? <img src={image} alt={'Build preview · ' + file} /> : <p>{error || 'Loading preview…'}</p>}</div>;
}
function BuildDetails({ build }: { build: GameBuild }) {
  const t = useTranslation();
  const { busy, error, review } = useGameDelivery();
  const [section, setSection] = useState('all'), [path, setPath] = useState(''), [view, setView] = useState<'files' | 'content'>('files'), [note, setNote] = useState(''), [limit, setLimit] = useState(100);
  const visible = build.changes.filter(c => section === 'all' || c.category === section);
  const selectedFile = visible.find(c => c.path === path) || visible[0];
  const preview = build.previews.find(p => p.path === selectedFile?.path);
  async function decide(approve: boolean) { try { await review(build, approve, note); setNote(''); } catch { /* Provider reports errors. */ } }
  return <section className="sv-panel sv-build-detail">
    <div className="sv-panel-heading"><div><h2>{build.title}</h2><p><span className="sv-mono">{build.commit.slice(0, 8)}</span> · {build.author} · {dateLabel(build.committed_at)}</p></div><Status value={build.status} /></div>
    <div className="sv-build-metadata"><span><Icon name="account_tree" />{build.branch}</span><span><Icon name="computer" />{build.platform || 'Build target pending'}</span>{build.min_client_version && <span>{t("Client ≥")} {build.min_client_version}</span>}<span>{build.source === 'git' ? t("Local Git") : t("CI build")}</span></div>
    <p className="sv-table-note">{t("Compared with")} {build.source === 'git' ? t("parent commit ") + (build.parent_commit?.slice(0, 8) || '(initial commit)') : build.baseline_commit ? t("published commit ") + build.baseline_commit.slice(0, 8) : t("the initial game snapshot")}.</p>
    {build.status === 'awaiting_build' && <div className="sv-alert">{t("Awaiting build · review becomes available when the build is ready.")}</div>}
    {build.stale && <div className="sv-alert">{t("The published baseline changed. Rebuild this commit against the latest release before review.")}</div>}
    {build.requires_client_update && <div className="sv-alert">{t("Includes client code changes · requires a compatible client build.")}</div>}
    {build.build_error && <div className="sv-alert sv-alert-error">{build.build_error}</div>}
    <div className="sv-build-counts">{categories.filter(c => build.changes.some(f => f.category === c.key)).map(c => <button key={c.key} className={section === c.key ? 'is-active' : ''} onClick={() => { setSection(section === c.key ? 'all' : c.key); setPath(''); }}><Icon name={c.icon} /><span>{c.label}</span><strong>{build.changes.filter(f => f.category === c.key).length}</strong></button>)}</div>
    <div className="sv-detail-toolbar"><div className="sv-detail-tabs" role="group" aria-label={t("Game build view")}><button aria-pressed={view === 'files'} className={view === 'files' ? 'is-active' : ''} onClick={() => setView('files')}>{t("Changed files (")} {build.change_count})</button>{build.content && <button aria-pressed={view === 'content'} className={view === 'content' ? 'is-active' : ''} onClick={() => setView('content')}>{t("Gameplay content")}</button>}</div><label className="sv-detail-filter">{t("Type")}<select value={section} onChange={e => { setSection(e.target.value); setPath(''); }}><option value="all">{t("All types")}</option>{categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label></div>
    {view === 'content' && build.content ? <BundleDetails before={build.baseline_content || undefined} after={build.content} /> : <>
      <div className="sv-build-files">{visible.slice(0, limit).map(c => <button key={c.path} aria-pressed={selectedFile?.path === c.path} className={selectedFile?.path === c.path ? 'is-active' : ''} onClick={() => setPath(c.path)}><Status value={c.action} /><span><strong>{c.path}</strong>{c.previous_path && <small>{t("From")} {c.previous_path}</small>}{c.import_settings && <small>{t("Import settings changed")}</small>}</span>{build.previews.some(p => p.path === c.path) && <Icon name="image" />}</button>)}{!visible.length && <Empty title={t("No files in this type")} />}{visible.length > limit && <button className="sv-button" onClick={() => setLimit(limit + 100)}>{t("Show more (")} {visible.length - limit} {t("remaining)")}</button>}</div>
      {build.change_count > build.changes.length && <p className="sv-table-note">{t("Showing")} {build.changes.length} {t("of")} {build.change_count} {t("files. The compiled build includes the complete snapshot.")}</p>}
      {selectedFile && <div className="sv-file-detail"><div className="sv-file-detail-heading"><Icon name={categories.find(c => c.key === selectedFile.category)?.icon || 'folder'} /><h3>{selectedFile.path.split('/').pop()}</h3><Status value={selectedFile.action} /></div>{selectedFile.summary && <p>{selectedFile.summary}</p>}{!!selectedFile.details?.length && <div className="sv-table-wrap"><table className="sv-table sv-file-diff"><thead><tr><th>{t("Property")}</th><th>{t("Before")}</th><th>{t("After")}</th></tr></thead><tbody>{selectedFile.details.map(d => <tr key={d.label}><td>{d.label}</td><td>{d.before ?? '—'}</td><td>{d.after ?? '—'}</td></tr>)}</tbody></table></div>}{preview ? <BuildPreview key={build.id + preview.path} build={build} file={preview.file} sourcePath={preview.source_path} /> : <div className="sv-build-no-preview"><Icon name="image" /><span>{t("No preview available")}</span></div>}</div>}
    </>}
    {!!build.artifacts.length && <div className="sv-build-artifacts"><h3>{t("Build output")}</h3>{build.artifacts.map(a => <div key={a.file}><Icon name={a.kind === 'preview' ? 'image' : 'inventory_2'} /><span><strong>{a.file}</strong><small className="sv-mono">{t("SHA256")} {a.sha256.slice(0, 16)}…{a.dependencies.length ? t(" · Depends on ") + a.dependencies.join(', ') : ''}</small></span><span>{bytesLabel(a.size_bytes)}</span></div>)}</div>}
    {build.status === 'ready' && !build.stale ? <div className="sv-form sv-review-actions"><label>{t("Feedback")}<textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder={t("Required when returning the build")} /></label><div><button className="sv-button" disabled={busy || !!error || !note.trim()} onClick={() => void decide(false)}>{t("Request changes")}</button><button className="sv-button sv-button-primary" disabled={busy || !!error} onClick={() => void decide(true)}>{t("Approve build")}</button></div></div> : build.reviewed_by && <div className="sv-build-review-note"><p>{build.reviewed_by} · {dateLabel(build.reviewed_at!)}</p>{build.note && <p>{build.note}</p>}{build.status === 'approved' && !build.stale && <Link className="sv-button sv-button-small" to={'/admin/releases?source=game&build=' + encodeURIComponent(build.id)}>{t("Select for publish")}<Icon name="arrow_forward" /></Link>}</div>}
  </section>;
}
export function GameChangesPanel() {
  const t = useTranslation();
  const { state, loading, busy, error, refresh, resetDemo } = useGameDelivery(), [params, setParams] = useSearchParams();
  const id = params.get('build') || '', [filter, setFilter] = useState('all'), [source, setSource] = useState('all');
  function setId(next: string) { const query = new URLSearchParams(params); if (next) query.set('build', next); else query.delete('build'); setParams(query, { replace: true }); }
  const builds = state.builds.filter(b => (filter === 'all' || b.status === filter) && (source === 'all' || b.source === source));
  const selected = builds.find(b => b.id === id) || builds[0];
  return <div className="sv-page"><div className="sv-game-sync-header"><span className="sv-mono">{t("Local Git & CI")} {isDemoMode && <span className="sv-demo-data">{t("Demo data")}</span>}</span><div>{isDemoMode && <button className="sv-button sv-button-small" disabled={loading || busy} onClick={() => void resetDemo().catch(() => { /* Provider reports errors. */ })}>{t("Reset demo")}</button>}<button className="sv-button sv-button-small" disabled={loading || busy} onClick={() => void refresh()}><Icon name="sync" />{t("Refresh")}</button></div></div>
    {error && <div className="sv-alert sv-alert-error" role="alert">{error}</div>}{state.source_error && <div className="sv-alert">{state.source_error}</div>}
    {loading ? <div role="status" className="sv-empty">{t("Loading game changes…")}</div> : <div className="sv-review-layout"><aside className="sv-panel"><div className="sv-panel-heading"><h2>{t("Game changes")}</h2><span className="sv-count">{builds.length}</span></div><label className="sv-review-filter">{t("Source")}<select value={source} onChange={e => { setSource(e.target.value); setId(''); }}><option value="all">{t("All sources")}</option><option value="git">{t("Local Git")}</option><option value="ci">{t("CI build")}</option></select></label><label className="sv-review-filter">{t("Build status")}<select value={filter} onChange={e => { setFilter(e.target.value); setId(''); }}><option value="all">{t("All builds / commits")}</option><option value="awaiting_build">{t("Awaiting build")}</option><option value="ready">{t("Ready for review")}</option><option value="approved">{t("Approved")}</option><option value="published">{t("Published")}</option><option value="failed">{t("Failed")}</option><option value="rejected">{t("Returned")}</option></select></label>{builds.map(b => <button key={b.id} className={'sv-review-item ' + (selected?.id === b.id ? 'is-active' : '')} onClick={() => setId(b.id)}><strong>{b.title}</strong><small className="sv-mono">{b.commit.slice(0, 8)} · {b.source === 'git' ? t("Local Git") : t("CI")}{b.platform && ' · ' + b.platform}</small><Status value={b.status} /></button>)}{!builds.length && <Empty title={error ? t("Game changes unavailable") : t("No game changes")} />}</aside>{selected && <BuildDetails key={selected.id} build={selected} />}</div>}
  </div>;
}

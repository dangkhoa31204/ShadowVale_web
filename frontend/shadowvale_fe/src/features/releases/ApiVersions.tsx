import { useTranslation } from '../preferences/preferencesContext';
import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../content/workspaceContext';
import { useAuth } from '../../hooks/useAuth';
import { contentApi, downloadRaw } from '../content/contentApi';
import { Modal } from '../shared/Modal';
import { BundleDetails } from '../content/BundleDetails';
import { collections } from '../content/types';
import type { ContentBundle } from '../content/types';
import type { ContentDifferenceDto } from '../../services/api/contracts';
import { errorMessage } from '../../services/api/errors';
import { Empty, Icon, PageHeading, Status } from '../shared/ui';
import { dateLabel } from '../shared/format';
export function MissingGameApi() {
  const t = useTranslation(); return <section className="sv-panel"><Empty title={t("Game delivery API unavailable")} description={t("Git/CI builds, evidence uploads and model/graphics bundles have no backend endpoints yet. Designer reports are local drafts; content JSON versions can still be reviewed and published.")} /></section>; }
export function Pager({page,setPage,total}: {page:number;setPage:(n:number)=>void;total:number}) {
  const t = useTranslation();
  const pages=Math.max(1,Math.ceil(total/20));
  return <div className="sv-row-actions" style={{padding:16}}><button className="sv-button sv-button-small" disabled={page<=1} onClick={()=>setPage(page-1)}>{t("Previous")}</button><span>{t("Page")} {page} / {pages} · {total} {t("records")}</span><button className="sv-button sv-button-small" disabled={page>=pages} onClick={()=>setPage(page+1)}>{t("Next")}</button></div>;
}
function changeName(path:string, translate:(value:string)=>string) {
  const parts=path.split('/').slice(1).map(p=>p.replaceAll('~1','/').replaceAll('~0','~'));
  const section=collections.find(c=>c.key===parts[0]);
  let identity=parts[1]||'';
  try {const value=JSON.parse(identity);if(Array.isArray(value))identity=value.join(' · ');} catch { /* A section-wide change has no code identity. */ }
  return [translate(section?.label||parts[0]),identity,parts.slice(2).join(' · ')].filter(Boolean).join(' · ');
}
const showValue=(value:unknown)=>value===null||value===undefined?'—':typeof value==='object'?JSON.stringify(value,null,2):String(value);
export function ApiCompare({beforeId,afterId,onReady,expectedRevision}: {beforeId?:string;afterId:string;onReady?:(ready:boolean)=>void;expectedRevision?:number}) {
  const t = useTranslation();
  const [result,setResult]=useState<{differences:ContentDifferenceDto[];bundle:ContentBundle;revision:number}|null>(null);
  const [error,setError]=useState(''),[retry,setRetry]=useState(0),[view,setView]=useState('changes'),[section,setSection]=useState('all');
  useEffect(()=>{let active=true;
    const load=async()=>{
      const [after,diff]=await Promise.all([contentApi.details(afterId),beforeId?contentApi.compare(beforeId,afterId):Promise.resolve(null)]);
      if(expectedRevision!==undefined&&(Number(after.version.revision)!==expectedRevision||diff&&Number(diff.targetRevision)!==expectedRevision))throw new Error('This version changed. Refresh submissions and review it again.');
      const bundle=after.bundle as ContentBundle;
      if(!bundle || typeof bundle!=='object')throw new Error('Content is unavailable for this version. Refresh or ask the designer to save the content again.');
      const differences=diff?.differences||collections.flatMap(c=>(bundle[c.key]||[]).map((row,i)=>({path:'/'+c.key+'/'+String(row.code||row.item_code||i+1),before:null,after:row})));
      return {bundle,differences,revision:Number(after.version.revision)};
    };
    load().then(data=>{if(active){setResult(data);setError('');onReady?.(true);}}).catch(e=>{if(active){setError(errorMessage(e));onReady?.(false);}});
    return()=>{active=false;};
  },[beforeId,afterId,expectedRevision,retry,onReady]);
  if(error)return <div className="sv-alert sv-alert-error">{error}<button className="sv-button" onClick={()=>setRetry(retry+1)}>{t("Retry")}</button></div>;
  if(!result)return <div role="status" className="sv-empty">{t("Loading version and changes…")}</div>;
  const visible=result.differences.filter(d=>section==='all'||d.path.startsWith('/'+section+'/')||d.path==='/'+section);
  return <div className="sv-bundle-details"><div className="sv-detail-toolbar"><div className="sv-detail-tabs" role="group" aria-label={t("Content view")}><button className={view==='changes'?'is-active':''} aria-pressed={view==='changes'} onClick={()=>setView('changes')}>{t("Changes (")} {result.differences.length})</button><button className={view==='content'?'is-active':''} aria-pressed={view==='content'} onClick={()=>setView('content')}>{t("Full content")}</button></div>{view==='changes'&&<label>{t("Section")}<select value={section} onChange={e=>setSection(e.target.value)}><option value="all">{t("All sections")}</option>{collections.map(c=><option key={c.key} value={c.key}>{t(c.label)}</option>)}</select></label>}</div>
    {view==='content'?<BundleDetails after={result.bundle}/>:<><div className="sv-admin-diff-summary"><span><b>{visible.filter(d=>d.before===null).length}</b> {t("additions")}</span><span><b>{visible.filter(d=>d.before!==null&&d.after!==null).length}</b> {t("updates")}</span><span><b>{visible.filter(d=>d.after===null).length}</b> {t("removals")}</span></div><div className="sv-diff-columns"><span>{t("Before ·")} {beforeId?t('Baseline version'):t('First release')}</span><span>{t("After · Version #")} {result.bundle.version_no} {t("· Revision")} {result.revision}</span></div>{visible.length?<div className="sv-diff-list">{visible.map((d,i)=><div className="sv-diff" key={d.path+':'+i}><strong>{changeName(d.path,t)} <span className="sv-change-kind">{d.before===null?t('Added'):d.after===null?t('Removed'):t('Updated')}</span></strong><small className="sv-diff-path sv-mono">{d.path}</small><div><pre className="sv-diff-before">{showValue(d.before)}</pre><pre className="sv-diff-after">{showValue(d.after)}</pre></div></div>)}</div>:<Empty title={t("No content changes")}/>}</>}
  </div>;
}

export function ApiReviewsPage(){
  const t = useTranslation();
  const {state,execute,busy,reload}=useWorkspace();
  const [params,setParams]=useSearchParams();
  const [note,setNote]=useState(''),[status,setStatus]=useState(() => params.get('status') || (params.get('draft')?'all':'in_review'));
  const [search,setSearch]=useState(''),[page,setPage]=useState(1),[error,setError]=useState(''),[ready,setReady]=useState('');
  const game=params.get('source')==='game';
  const all=state.drafts.filter(d=>d.status!=='draft');
  const pending=all.filter(d=>d.status==='in_review');
  const submissions=all.filter(d=>(status==='all'||d.status===status)&&('#'+d.version_no+' '+d.label+' '+d.authorName).toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>status==='in_review'?(a.submitted_at||a.updatedAt).localeCompare(b.submitted_at||b.updatedAt):b.version_no-a.version_no);
  const visible=submissions.slice((page-1)*20,page*20);
  const draft=visible.find(d=>d.id===params.get('draft'))||visible[0];
  const reviewKey=draft?.id+':'+draft?.revision;
  const reviewReady=useCallback((value:boolean)=>setReady(value?reviewKey:''),[reviewKey]);
  const baseline=draft?.parent_version_id || (state.activeReleaseId!==draft?.id?state.activeReleaseId:undefined);
  function chooseStatus(next:string){
    setStatus(next);setPage(1);setNote('');setError('');
    const p=new URLSearchParams(params);p.delete('draft');p.set('status',next);p.set('source','content');setParams(p,{replace:true});
  }
  function chooseDraft(id:string){
    const p=new URLSearchParams(params);p.set('draft',id);setParams(p,{replace:true});setNote('');setError('');
  }
  async function review(approve:boolean){
    if(!draft)return;setError('');
    try{await execute({type:'reviewDraft',id:draft.id,revision:draft.revision,approve,note});setNote('');}catch(e){setError(errorMessage(e));}
  }
  const valid=!!draft?.validated_at&&!!draft?.bundle_checksum&&!draft?.validation_errors?.length;
  return <div className="sv-page sv-admin-page">
    <PageHeading eyebrow={t("STEP 1 · REVIEW")} title={t("Review content")} description={t("Inspect the changes before approving a version for publication.")} action={<button className="sv-button" disabled={busy} onClick={()=>void reload()}><Icon name="sync"/>{t("Refresh")}</button>}/>
    <div className="sv-admin-filter-tabs" role="group" aria-label={t("Submission status")}>
      {[['in_review','Awaiting review',pending.length],['approved','Approved',all.filter(d=>d.status==='approved').length],['rejected','Returned',all.filter(d=>d.status==='rejected').length],['all','All submissions',all.length]].map(([value,label,count])=><button className={status===value?'is-active':''} aria-pressed={status===value} key={value} onClick={()=>chooseStatus(String(value))}>{t(String(label))}<span>{count}</span></button>)}
      <button className={'sv-admin-git-toggle '+(game?'is-active':'')} aria-pressed={game} onClick={()=>{const p=new URLSearchParams(params);p.set('source',game?'content':'game');setParams(p);}}><Icon name="account_tree"/>{t("Git changes")}</button>
    </div>
    {game?<MissingGameApi/>:<div className="sv-review-layout sv-admin-review-grid">
      <aside className="sv-panel sv-admin-queue">
        <div className="sv-panel-heading"><div><h2>{t("Submission queue")}</h2><p>{submissions.length} {t("matching versions")}</p></div><span className="sv-count">{pending.length} {t("pending")}</span></div>
        <div className="sv-admin-search sv-form"><label>{t("Find submission")}<input type="search" value={search} placeholder={t("Version, title or author")} onChange={e=>{setSearch(e.target.value);setPage(1);setNote('');setError('');}}/></label></div>
        <div className="sv-admin-queue-items">{visible.map(d=><button key={d.id} className={'sv-review-item '+(draft?.id===d.id?'is-active':'')} onClick={()=>chooseDraft(d.id)}><div className="sv-admin-queue-top"><span className="sv-admin-version">#{d.version_no}</span><Status value={d.status}/></div><strong>{d.label}</strong><small>{d.authorName}</small><small>{t("Submitted")} {dateLabel(d.submitted_at||d.updatedAt)}</small></button>)}</div>
        {submissions.length>20&&<Pager page={page} setPage={setPage} total={submissions.length}/>}
        {!visible.length&&<Empty title={status==='in_review'&&!search?t("No pending submissions"):t("No matching submissions")} description={t("Choose another status or adjust your search.")}/>}
      </aside>
      {draft?<section className="sv-panel sv-review-detail sv-admin-review-detail">
        <div className="sv-panel-heading"><div><span className="sv-eyebrow">{t("SUBMISSION #")} {draft.version_no}</span><h2>{draft.label}</h2><p>{draft.authorName} {t("· Revision")} {draft.revision}</p></div><Status value={draft.status}/></div>
        <div className="sv-admin-review-meta"><div><span>{t("Submitted")}</span><strong>{dateLabel(draft.submitted_at||draft.updatedAt)}</strong></div><div><span>{t("Compared with")}</span><strong>{baseline?t('Version #')+(state.drafts.find(d=>d.id===baseline)?.version_no||'—'):t('First release · empty baseline')}</strong></div><div><span>{t("Validation")}</span><strong className={valid?'sv-admin-ok':'sv-admin-warning'}>{t(valid?'Passed':'Requires validation')}</strong></div></div>
        {draft.changelog&&<div className="sv-admin-changelog"><span className="sv-eyebrow">{t("DESIGNER SUMMARY")}</span><p>{draft.changelog}</p></div>}
        {!valid&&<div className="sv-alert sv-alert-error sv-admin-validation" role="status">{draft.validation_errors?.join('\n')||t('No valid snapshot recorded. The designer must validate this version before it can be approved.')}</div>}
        <ApiCompare key={draft.id+':'+draft.revision+':'+baseline} beforeId={baseline} afterId={draft.id} expectedRevision={draft.revision} onReady={reviewReady}/>
        {error&&<div className="sv-alert sv-alert-error sv-admin-validation" role="alert" style={{whiteSpace:'pre-wrap'}}>{error}</div>}
        {draft.status==='in_review'?<div className="sv-form sv-review-actions sv-admin-decision"><div><h3>{t("Review decision")}</h3><p>{t("Approve to move this version to the publish queue, or return it with a reason.")}</p></div><label>{t("Feedback to designer")}<textarea rows={2} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder={t("Explain what needs changing. Required when returning a submission.")}/></label><div className="sv-admin-decision-footer"><small>{ready!==reviewKey?t("Changes must finish loading before approval."):!valid?t("Approval requires a validated snapshot."):t("Changes loaded · review this version before approving.")}</small><div className="sv-row-actions"><button className="sv-button" disabled={busy||!note.trim()} onClick={()=>void review(false)}><Icon name="undo"/>{t("Return to designer")}</button><button className="sv-button sv-button-primary" disabled={busy||ready!==reviewKey||!valid} onClick={()=>void review(true)}><Icon name="check"/>{t("Approve content")}</button></div></div></div>:<div className="sv-admin-reviewed"><strong>{draft.status==='approved'?t("Approved for publication"):t("Review status: ")+draft.status}</strong>{draft.note&&<p>{draft.note}</p>}{draft.status==='approved'&&<Link className="sv-button sv-button-primary" to="/admin/releases">{t("Go to publish queue")}<Icon name="arrow_forward"/></Link>}</div>}
      </section>:<section className="sv-panel"><Empty title={t("Select a submission")} description={t("Changes and review actions appear here when a submission is available.")}/></section>}
    </div>}
  </div>;
}
export function ApiReleasesPage(){
  const t = useTranslation();
  const {state,execute,busy,reload}=useWorkspace(),{user}=useAuth();
  const [params,setParams]=useSearchParams();
  const admin=user?.role==='admin',canBundle=user?.role!=='analyst';
  const active=state.releases.find(r=>r.id===state.activeReleaseId);
  const [tab,setTab]=useState<'versions'|'history'|'compare'>('versions');
  const [search,setSearch]=useState(''),[status,setStatus]=useState('all');
  const [detail,setDetail]=useState(''),[before,setBefore]=useState(''),[after,setAfter]=useState(''),[page,setPage]=useState(1),[historyPage,setHistoryPage]=useState(1);
  const [confirm,setConfirm]=useState<{id:string;type:'publish'|'rollback';revision?:number}|null>(null),[reason,setReason]=useState(''),[error,setError]=useState(''),[downloading,setDownloading]=useState('');
  const approved=state.drafts.filter(d=>d.status==='approved');
  async function download(id:string,no:number){setDownloading(id);setError('');try{downloadRaw(await contentApi.rawBundle(id),'shadowvale-content-'+no+'.json');}catch(e){setError(errorMessage(e));}finally{setDownloading('');}}
  async function action(){if(!confirm||!reason.trim())return;setError('');try{
    if(confirm.type==='publish')await execute({type:'publishDraft',id:confirm.id,revision:confirm.revision!,reason});
    else await execute({type:'restoreRelease',id:confirm.id,reason});
    setConfirm(null);setReason('');
  }catch(e){setError(errorMessage(e));}}
  const filtered=state.releases.filter(r=>(status==='all'||r.status===status)&&('#'+r.version_no+' '+r.label).toLowerCase().includes(search.toLowerCase()));
  const entries=filtered.slice((page-1)*20,page*20);
  const selected=state.drafts.find(d=>d.id===detail);
  const baseline=selected?.parent_version_id||(state.activeReleaseId!==selected?.id?state.activeReleaseId:undefined);
  const target=state.drafts.find(d=>d.id===confirm?.id);
  if(user?.role==='analyst')return <div className="sv-page"><PageHeading title={t("Versions")}/><Empty title={t("Content version API is restricted")} description={t("Metadata and content comparison require Admin/Designer; publication history requires Admin. Analyst can compare game analytics by entering version GUIDs in Analytics.")}/></div>;
  return <div className="sv-page sv-admin-page">
    <PageHeading eyebrow={admin?'STEP 2 · PUBLISH':undefined} title={admin?t("Publish versions"):t("Versions")} description={t("Publish approved content and keep track of the version running in the game.")} action={<button className="sv-button" disabled={busy} onClick={()=>void reload()}><Icon name="sync"/>{t("Refresh")}</button>}/>
    {error&&!confirm&&<div className="sv-alert sv-alert-error" role="alert" style={{whiteSpace:'pre-wrap'}}>{error}</div>}
    <section className="sv-panel sv-admin-current"><div className="sv-admin-current-main"><div className="sv-release-symbol"><Icon name="public"/></div><div><span className="sv-eyebrow">{t("LIVE GAME CONTENT")}</span><h2>{active?'#'+active.version_no+' · '+active.label:t("No published version")}</h2><p>{active?t("Published ")+dateLabel(active.publishedAt)+' · '+active.publishedBy:t("Publish an approved version to make content available to the game.")}</p></div></div><div className="sv-row-actions">{active&&<><Status value="published"/>{canBundle&&<button className="sv-button" disabled={!!downloading} onClick={()=>void download(active.id,active.version_no)}><Icon name="download"/>{t("Download JSON")}</button>}</>}</div></section>
    {admin&&<section className="sv-panel sv-admin-publish-queue"><div className="sv-panel-heading"><div><h2>{t("Ready to publish")}<span className="sv-count">{approved.length}</span></h2><p>{t("Only approved submissions can be released.")}</p></div><Link className="sv-text-link" to="/admin/reviews">{t("Review content")}<Icon name="arrow_forward"/></Link></div>{approved.map(d=><div className="sv-admin-task sv-admin-release-task" key={d.id}><span className="sv-admin-version">#{d.version_no}</span><div><strong>{d.label}</strong><small>{t("Approved")} {dateLabel(d.reviewedAt||d.updatedAt)} · {d.reviewedBy||'Admin'}</small></div><div className="sv-row-actions"><button className="sv-button" onClick={()=>setDetail(d.id)}>{t("View changes")}</button><button className="sv-button sv-button-primary" disabled={busy} onClick={()=>{setError('');setReason('');setConfirm({type:'publish',id:d.id,revision:d.revision});}}><Icon name="deployed_code"/>{t("Publish version")}</button></div></div>)}{!approved.length&&<Empty title={t("No approved content waiting")} description={t("Review a designer submission first. Approved versions will appear here.")}/>}</section>}
    <section className="sv-panel sv-admin-version-library">
      <div className="sv-admin-library-tabs" role="group" aria-label={t("Version information")}>{([['versions','Published versions'],...(admin?[['history','Publication history']]:[]),['compare','Compare versions']] as [typeof tab,string][]).map(([value,label])=><button key={value} className={tab===value?'is-active':''} aria-pressed={tab===value} onClick={()=>{setTab(value);if(params.get('source')==='game')setParams({source:'content'});}}>{t(String(label))}</button>)}{admin&&<button className="sv-admin-git-toggle" onClick={()=>setParams({source:params.get('source')==='game'?'content':'game'})}><Icon name="account_tree"/>{t("Game assets")}</button>}</div>
      {params.get('source')==='game'&&admin?<MissingGameApi/>:tab==='versions'?<>
        <div className="sv-admin-table-filters sv-form"><label>{t("Find version")}<input type="search" value={search} placeholder={t("Version number or title")} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label><label>{t("Status")}<select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="all">{t("All published versions")}</option><option value="published">{t("Live")}</option><option value="archived">{t("Archived")}</option></select></label><span>{filtered.length} {t("versions")}</span></div>
        <div className="sv-table-wrap"><table className="sv-table sv-admin-version-table"><thead><tr><th>{t("Version")}</th><th>{t("Status")}</th><th>{t("Published")}</th><th>{t("Actions")}</th></tr></thead><tbody>{entries.map(r=><tr key={r.id}><td><strong>#{r.version_no} · {r.label}</strong><small>{r.publishedBy}</small></td><td><Status value={r.status}/></td><td>{dateLabel(r.publishedAt)}</td><td><div className="sv-row-actions"><button className="sv-button sv-button-small" onClick={()=>setDetail(r.id)}>{t("View changes")}</button>{canBundle&&<button className="sv-button sv-button-small" disabled={!!downloading} aria-label={t("Download JSON for version ")+r.version_no} onClick={()=>void download(r.id,r.version_no)}><Icon name="download"/>{t("JSON")}</button>}{admin&&r.status==='archived'&&<button className="sv-button sv-button-small" disabled={busy} onClick={()=>{setError('');setReason('');setConfirm({type:'rollback',id:r.id});}}>{t("Rollback")}</button>}</div></td></tr>)}</tbody></table></div>{!entries.length&&<Empty title={t("No matching versions")}/>}{filtered.length>20&&<Pager page={page} setPage={setPage} total={filtered.length}/>}
      </>:tab==='history'?<>
        <div className="sv-panel-heading"><div><h2>{t("Publication history")}</h2><p>{t("Recorded publish and rollback decisions")}</p></div></div><div className="sv-table-wrap"><table className="sv-table"><thead><tr><th>{t("Action")}</th><th>{t("Version")}</th><th>{t("Previous")}</th><th>{t("Reason")}</th><th>{t("Actor")}</th><th>{t("Occurred")}</th></tr></thead><tbody>{state.publications.slice((historyPage-1)*20,historyPage*20).map(h=><tr key={h.id}><td>{h.action==='publish'?t("Publish"):t("Rollback")}</td><td>#{state.drafts.find(d=>d.id===h.content_version_id)?.version_no||h.content_version_id}</td><td>{h.previous_version_id?'#'+(state.drafts.find(d=>d.id===h.previous_version_id)?.version_no||h.previous_version_id):'—'}</td><td>{h.reason}</td><td>{h.actor_id}</td><td>{dateLabel(h.occurred_at)}</td></tr>)}</tbody></table></div>{!state.publications.length&&<Empty title={t("No publication history")}/>}{state.publications.length>20&&<Pager page={historyPage} setPage={setHistoryPage} total={state.publications.length}/>}
      </>:<><div className="sv-panel-heading"><div><h2>{t("Compare versions")}</h2><p>{t("Choose a baseline and a target version.")}</p></div></div><div className="sv-compare-controls sv-form" style={{padding:24}}>{[['Baseline',before,setBefore],['Target',after,setAfter]].map(([label,value,set])=><label key={t(String(label))}>{t(String(label))}<select value={String(value)} onChange={e=>(set as (s:string)=>void)(e.target.value)}><option value="">{t("Choose version")}</option>{state.drafts.map(d=><option key={d.id} value={d.id}>#{d.version_no} · {d.label}</option>)}</select></label>)}</div>{before&&after?<ApiCompare key={before+after} beforeId={before} afterId={after}/>:<Empty title={t("Choose two versions")} description={t("The comparison shows additions, removals and field changes.")}/>}</>}
    </section>
    {selected&&<div className="sv-modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setDetail('');}}><section className="sv-panel sv-admin-version-dialog" role="dialog" aria-modal="true" aria-labelledby="version-detail-title" onKeyDown={e=>{if(e.key==='Escape')setDetail('');}}><div className="sv-panel-heading"><div><span className="sv-eyebrow">{t("VERSION DETAILS")}</span><h2 id="version-detail-title">#{selected.version_no} · {selected.label}</h2></div><button autoFocus className="sv-button" onClick={()=>setDetail('')}><Icon name="close"/>{t("Close")}</button></div><ApiCompare key={detail+':'+baseline} beforeId={baseline} afterId={detail}/></section></div>}
    {confirm&&<Modal title={(confirm.type==='publish'?t('Publish'):t('Rollback to'))+' #'+target?.version_no+'?'} busy={busy} onClose={()=>setConfirm(null)}>
      <span className="sv-eyebrow">{t(confirm.type==='publish'?'RELEASE CONTENT':'RESTORE A RELEASE')}</span>
      <p>{target?.label}</p><p>{t(confirm.type==='publish'?'This becomes the live content version available to the game.':'This restores the previously published bundle and archives the current live version.')}</p>
      <form className="sv-form" onSubmit={e=>{e.preventDefault();void action();}}><label>{t(confirm.type==='publish'?'Release note':'Rollback reason')}<textarea disabled={busy} maxLength={500} required rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('Required · explain this publication decision')}/></label>{error&&<div className="sv-alert sv-alert-error" role="alert">{error}</div>}<div className="sv-modal-actions"><button type="button" className="sv-button" disabled={busy} onClick={()=>setConfirm(null)}>{t('Cancel')}</button><button className="sv-button sv-button-primary" disabled={busy||!reason.trim()}>{t(busy?'Processing…':confirm.type==='publish'?'Publish version':'Confirm rollback')}</button></div></form>
    </Modal>}
  </div>;
}

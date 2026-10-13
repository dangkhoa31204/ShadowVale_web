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
import './adminWorkspace.css';
export function Pager({page,setPage,total}: {page:number;setPage:(n:number)=>void;total:number}) {
  const pages=Math.max(1,Math.ceil(total/20));
  return <div className="sv-row-actions" style={{padding:16}}><button className="sv-button sv-button-small" disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page} / {pages} · {total} records</span><button className="sv-button sv-button-small" disabled={page>=pages} onClick={()=>setPage(page+1)}>Next</button></div>;
}
function changeName(path:string) {
  const parts=path.split('/').slice(1).map(p=>p.replaceAll('~1','/').replaceAll('~0','~'));
  const section=collections.find(c=>c.key===parts[0]);
  let identity=parts[1]||'';
  try {const value=JSON.parse(identity);if(Array.isArray(value))identity=value.join(' · ');} catch { /* A section-wide change has no code identity. */ }
  return [section?.label||parts[0],identity,parts.slice(2).join(' · ')].filter(Boolean).join(' · ');
}
const showValue=(value:unknown)=>value===null||value===undefined?'—':typeof value==='object'?JSON.stringify(value,null,2):String(value);
export function ApiCompare({beforeId,afterId,onReady,expectedRevision}: {beforeId?:string;afterId:string;onReady?:(ready:boolean)=>void;expectedRevision?:number}) {
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
  if(error)return <div className="sv-alert sv-alert-error">{error}<button className="sv-button" onClick={()=>setRetry(retry+1)}>Retry</button></div>;
  if(!result)return <div role="status" className="sv-empty">Loading version and changes…</div>;
  const visible=result.differences.filter(d=>section==='all'||d.path.startsWith('/'+section+'/')||d.path==='/'+section);
  return <div className="sv-bundle-details"><div className="sv-detail-toolbar"><div className="sv-detail-tabs" role="group" aria-label="Content view"><button className={view==='changes'?'is-active':''} aria-pressed={view==='changes'} onClick={()=>setView('changes')}>Changes ( {result.differences.length})</button><button className={view==='content'?'is-active':''} aria-pressed={view==='content'} onClick={()=>setView('content')}>Full content</button></div>{view==='changes'&&<label>Section<select value={section} onChange={e=>setSection(e.target.value)}><option value="all">All sections</option>{collections.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></label>}</div>
    {view==='content'?<BundleDetails after={result.bundle}/>:<><div className="sv-admin-diff-summary"><span><b>{visible.filter(d=>d.before===null).length}</b> additions</span><span><b>{visible.filter(d=>d.before!==null&&d.after!==null).length}</b> updates</span><span><b>{visible.filter(d=>d.after===null).length}</b> removals</span></div><div className="sv-diff-columns"><span>Before · {beforeId?'Baseline version':'First release'}</span><span>After · Version # {result.bundle.version_no} {"· Revision"} {result.revision}</span></div>{visible.length?<div className="sv-diff-list">{visible.map((d,i)=><div className="sv-diff" key={d.path+':'+i}><strong>{changeName(d.path)} <span className="sv-change-kind">{d.before===null?'Added':d.after===null?'Removed':'Updated'}</span></strong><small className="sv-diff-path sv-mono">{d.path}</small><div><pre className="sv-diff-before">{showValue(d.before)}</pre><pre className="sv-diff-after">{showValue(d.after)}</pre></div></div>)}</div>:<Empty title="No content changes"/>}</>}
  </div>;
}

export function ApiReviewsPage(){
  const {state,execute,busy,reload}=useWorkspace();
  const [params,setParams]=useSearchParams();
  const [note,setNote]=useState(''),[status,setStatus]=useState(() => params.get('status') || (params.get('draft')?'all':'in_review'));
  const [search,setSearch]=useState(''),[page,setPage]=useState(1),[error,setError]=useState(''),[ready,setReady]=useState('');
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
    <PageHeading eyebrow="STEP 1 · REVIEW" title="Review content" description="Inspect the changes before approving a version for publication." action={<button className="sv-button" disabled={busy} onClick={()=>void reload()}><Icon name="sync"/>Refresh</button>}/>
    <div className="sv-admin-filter-tabs" role="group" aria-label="Submission status">
      {[['in_review','Awaiting review',pending.length],['approved','Approved',all.filter(d=>d.status==='approved').length],['rejected','Returned',all.filter(d=>d.status==='rejected').length],['all','All submissions',all.length]].map(([value,label,count])=><button className={status===value?'is-active':''} aria-pressed={status===value} key={value} onClick={()=>chooseStatus(String(value))}>{(String(label))}<span>{count}</span></button>)}
    </div>
    <div className="sv-review-layout sv-admin-review-grid">
      <aside className="sv-panel sv-admin-queue">
        <div className="sv-panel-heading"><div><h2>Submission queue</h2><p>{submissions.length} matching versions</p></div><span className="sv-count">{pending.length} pending</span></div>
        <div className="sv-admin-search sv-form"><label>Find submission<input type="search" value={search} placeholder="Version, title or author" onChange={e=>{setSearch(e.target.value);setPage(1);setNote('');setError('');}}/></label></div>
        <div className="sv-admin-queue-items">{visible.map(d=><button key={d.id} className={'sv-review-item '+(draft?.id===d.id?'is-active':'')} onClick={()=>chooseDraft(d.id)}><div className="sv-admin-queue-top"><span className="sv-admin-version">#{d.version_no}</span><Status value={d.status}/></div><strong>{d.label}</strong><small>{d.authorName}</small><small>Submitted {dateLabel(d.submitted_at||d.updatedAt)}</small></button>)}</div>
        {submissions.length>20&&<Pager page={page} setPage={setPage} total={submissions.length}/>}
        {!visible.length&&<Empty title={status==='in_review'&&!search?"No pending submissions":"No matching submissions"} description="Choose another status or adjust your search."/>}
      </aside>
      {draft?<section className="sv-panel sv-review-detail sv-admin-review-detail">
        <div className="sv-panel-heading"><div><span className="sv-eyebrow">SUBMISSION # {draft.version_no}</span><h2>{draft.label}</h2><p>{draft.authorName} {"· Revision"} {draft.revision}</p></div><Status value={draft.status}/></div>
        <div className="sv-admin-review-meta"><div><span>Submitted</span><strong>{dateLabel(draft.submitted_at||draft.updatedAt)}</strong></div><div><span>Compared with</span><strong>{baseline?'Version #'+(state.drafts.find(d=>d.id===baseline)?.version_no||'—'):'First release · empty baseline'}</strong></div><div><span>Validation</span><strong className={valid?'sv-admin-ok':'sv-admin-warning'}>{(valid?'Passed':'Requires validation')}</strong></div></div>
        {draft.changelog&&<div className="sv-admin-changelog"><span className="sv-eyebrow">DESIGNER SUMMARY</span><p>{draft.changelog}</p></div>}
        {!valid&&<div className="sv-alert sv-alert-error sv-admin-validation" role="status">{draft.validation_errors?.join('\n')||'No valid snapshot recorded. The designer must validate this version before it can be approved.'}</div>}
        <ApiCompare key={draft.id+':'+draft.revision+':'+baseline} beforeId={baseline} afterId={draft.id} expectedRevision={draft.revision} onReady={reviewReady}/>
        {error&&<div className="sv-alert sv-alert-error sv-admin-validation" role="alert" style={{whiteSpace:'pre-wrap'}}>{error}</div>}
        {draft.status==='in_review'?<div className="sv-form sv-review-actions sv-admin-decision"><div><h3>Review decision</h3><p>Approve to move this version to the publish queue, or return it with a reason.</p></div><label>Feedback to designer<textarea rows={2} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Explain what needs changing. Required when returning a submission."/></label><div className="sv-admin-decision-footer"><small>{ready!==reviewKey?"Changes must finish loading before approval.":!valid?"Approval requires a validated snapshot.":"Changes loaded · review this version before approving."}</small><div className="sv-row-actions"><button className="sv-button" disabled={busy||!note.trim()} onClick={()=>void review(false)}><Icon name="undo"/>Return to designer</button><button className="sv-button sv-button-primary" disabled={busy||ready!==reviewKey||!valid} onClick={()=>void review(true)}><Icon name="check"/>Approve content</button></div></div></div>:<div className="sv-admin-reviewed"><strong>{draft.status==='approved'?"Approved for publication":"Review status: "+draft.status}</strong>{draft.note&&<p>{draft.note}</p>}{draft.status==='approved'&&<Link className="sv-button sv-button-primary" to="/admin/releases">Go to publish queue<Icon name="arrow_forward"/></Link>}</div>}
      </section>:<section className="sv-panel"><Empty title="Select a submission" description="Changes and review actions appear here when a submission is available."/></section>}
    </div>
  </div>;
}
export function ApiReleasesPage(){
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
  if(user?.role==='analyst')return <div className="sv-page"><PageHeading title="Versions"/><Empty title="Content version API is restricted" description="Metadata and content comparison require Admin/Designer; publication history requires Admin. Analyst can compare game analytics by entering version GUIDs in Analytics."/></div>;
  return <div className="sv-page sv-admin-page">
    <PageHeading eyebrow={admin?'STEP 2 · PUBLISH':undefined} title={admin?"Publish versions":"Versions"} description="Publish approved content and keep track of the version running in the game." action={<button className="sv-button" disabled={busy} onClick={()=>void reload()}><Icon name="sync"/>Refresh</button>}/>
    {error&&!confirm&&<div className="sv-alert sv-alert-error" role="alert" style={{whiteSpace:'pre-wrap'}}>{error}</div>}
    <section className="sv-panel sv-admin-current"><div className="sv-admin-current-main"><div className="sv-release-symbol"><Icon name="public"/></div><div><span className="sv-eyebrow">LIVE GAME CONTENT</span><h2>{active?'#'+active.version_no+' · '+active.label:"No published version"}</h2><p>{active?"Published "+dateLabel(active.publishedAt)+' · '+active.publishedBy:"Publish an approved version to make content available to the game."}</p></div></div><div className="sv-row-actions">{active&&<><Status value="published"/>{canBundle&&<button className="sv-button" disabled={!!downloading} onClick={()=>void download(active.id,active.version_no)}><Icon name="download"/>Download JSON</button>}</>}</div></section>
    {admin&&<section className="sv-panel sv-admin-publish-queue"><div className="sv-panel-heading"><div><h2>Ready to publish<span className="sv-count">{approved.length}</span></h2><p>Only approved submissions can be released.</p></div><Link className="sv-text-link" to="/admin/reviews">Review content<Icon name="arrow_forward"/></Link></div>{approved.map(d=><div className="sv-admin-task sv-admin-release-task" key={d.id}><span className="sv-admin-version">#{d.version_no}</span><div><strong>{d.label}</strong><small>Approved {dateLabel(d.reviewedAt||d.updatedAt)} · {d.reviewedBy||'Admin'}</small></div><div className="sv-row-actions"><button className="sv-button" onClick={()=>setDetail(d.id)}>View changes</button><button className="sv-button sv-button-primary" disabled={busy} onClick={()=>{setError('');setReason('');setConfirm({type:'publish',id:d.id,revision:d.revision});}}><Icon name="deployed_code"/>Publish version</button></div></div>)}{!approved.length&&<Empty title="No approved content waiting" description="Review a designer submission first. Approved versions will appear here."/>}</section>}
    <section className="sv-panel sv-admin-version-library">
      <div className="sv-admin-library-tabs" role="group" aria-label="Version information">{([['versions','Published versions'],...(admin?[['history','Publication history']]:[]),['compare','Compare versions']] as [typeof tab,string][]).map(([value,label])=><button key={value} className={tab===value?'is-active':''} aria-pressed={tab===value} onClick={()=>{setTab(value);if(params.get('source')==='game')setParams({source:'content'});}}>{(String(label))}</button>)}{admin&&<button className="sv-admin-git-toggle" onClick={()=>setParams({source:params.get('source')==='game'?'content':'game'})}><Icon name="account_tree"/>Game assets</button>}</div>
      {tab==='versions'?<>
        <div className="sv-admin-table-filters sv-form"><label>Find version<input type="search" value={search} placeholder="Version number or title" onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label><label>Status<select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="all">All published versions</option><option value="published">Live</option><option value="archived">Archived</option></select></label><span>{filtered.length} versions</span></div>
        <div className="sv-table-wrap"><table className="sv-table sv-admin-version-table"><thead><tr><th>Version</th><th>Status</th><th>Published</th><th>Actions</th></tr></thead><tbody>{entries.map(r=><tr key={r.id}><td><strong>#{r.version_no} · {r.label}</strong><small>{r.publishedBy}</small></td><td><Status value={r.status}/></td><td>{dateLabel(r.publishedAt)}</td><td><div className="sv-row-actions"><button className="sv-button sv-button-small" onClick={()=>setDetail(r.id)}>View changes</button>{canBundle&&<button className="sv-button sv-button-small" disabled={!!downloading} aria-label={"Download JSON for version "+r.version_no} onClick={()=>void download(r.id,r.version_no)}><Icon name="download"/>JSON</button>}{admin&&r.status==='archived'&&<button className="sv-button sv-button-small" disabled={busy} onClick={()=>{setError('');setReason('');setConfirm({type:'rollback',id:r.id});}}>Rollback</button>}</div></td></tr>)}</tbody></table></div>{!entries.length&&<Empty title="No matching versions"/>}{filtered.length>20&&<Pager page={page} setPage={setPage} total={filtered.length}/>}
      </>:tab==='history'?<>
        <div className="sv-panel-heading"><div><h2>Publication history</h2><p>Recorded publish and rollback decisions</p></div></div><div className="sv-table-wrap"><table className="sv-table"><thead><tr><th>Action</th><th>Version</th><th>Previous</th><th>Reason</th><th>Actor</th><th>Occurred</th></tr></thead><tbody>{state.publications.slice((historyPage-1)*20,historyPage*20).map(h=><tr key={h.id}><td>{h.action==='publish'?"Publish":"Rollback"}</td><td>#{state.drafts.find(d=>d.id===h.content_version_id)?.version_no||h.content_version_id}</td><td>{h.previous_version_id?'#'+(state.drafts.find(d=>d.id===h.previous_version_id)?.version_no||h.previous_version_id):'—'}</td><td>{h.reason}</td><td>{h.actor_id}</td><td>{dateLabel(h.occurred_at)}</td></tr>)}</tbody></table></div>{!state.publications.length&&<Empty title="No publication history"/>}{state.publications.length>20&&<Pager page={historyPage} setPage={setHistoryPage} total={state.publications.length}/>}
      </>:<><div className="sv-panel-heading"><div><h2>Compare versions</h2><p>Choose a baseline and a target version.</p></div></div><div className="sv-compare-controls sv-form" style={{padding:24}}>{[['Baseline',before,setBefore],['Target',after,setAfter]].map(([label,value,set])=><label key={(String(label))}>{(String(label))}<select value={String(value)} onChange={e=>(set as (s:string)=>void)(e.target.value)}><option value="">Choose version</option>{state.drafts.map(d=><option key={d.id} value={d.id}>#{d.version_no} · {d.label}</option>)}</select></label>)}</div>{before&&after?<ApiCompare key={before+after} beforeId={before} afterId={after}/>:<Empty title="Choose two versions" description="The comparison shows additions, removals and field changes."/>}</>}
    </section>
    {selected&&<Modal wide scrollable eyebrow="VERSION DETAILS" title={'#'+selected.version_no+' · '+selected.label} onClose={()=>setDetail('')}><ApiCompare key={detail+':'+baseline} beforeId={baseline} afterId={detail}/></Modal>}
    {confirm&&<Modal title={(confirm.type==='publish'?'Publish':'Rollback to')+' #'+target?.version_no+'?'} busy={busy} onClose={()=>setConfirm(null)}>
      <span className="sv-eyebrow">{(confirm.type==='publish'?'RELEASE CONTENT':'RESTORE A RELEASE')}</span>
      <p>{target?.label}</p><p>{(confirm.type==='publish'?'This becomes the live content version available to the game.':'This restores the previously published bundle and archives the current live version.')}</p>
      <form className="sv-form" onSubmit={e=>{e.preventDefault();void action();}}><label>{(confirm.type==='publish'?'Release note':'Rollback reason')}<textarea disabled={busy} maxLength={500} required rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required · explain this publication decision"/></label>{error&&<div className="sv-alert sv-alert-error" role="alert">{error}</div>}<div className="sv-modal-actions"><button type="button" className="sv-button" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button><button className="sv-button sv-button-primary" disabled={busy||!reason.trim()}>{(busy?'Processing…':confirm.type==='publish'?'Publish version':'Confirm rollback')}</button></div></form>
    </Modal>}
  </div>;
}

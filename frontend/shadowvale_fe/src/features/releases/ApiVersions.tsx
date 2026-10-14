import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useWorkspace } from '../content/workspaceContext';
import { useAuth } from '../../hooks/useAuth';
import { contentApi, downloadRaw } from '../content/contentApi';
import { Modal } from '../shared/Modal';
import { BundleSnapshot } from '../content/BundleDetails';
import { ComparisonView, type Change } from '../content/DiffList';
import { collections } from '../content/types';
import type { ContentBundle } from '../content/types';
import { errorMessage } from '../../services/api/errors';
import { Empty, Icon, PageHeading, Panel, Status, panelTable } from '../shared/ui';
import { dateLabel } from '../shared/format';
export function Pager({page,setPage,total}: {page:number;setPage:(n:number)=>void;total:number}) {
  const pages=Math.max(1,Math.ceil(total/20));
  return <div className="flex items-center justify-center gap-4 border-t p-4 text-xs text-muted-foreground"><Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</Button><span>Page {page} / {pages} · {total} records</span><Button variant="outline" size="sm" disabled={page>=pages} onClick={()=>setPage(page+1)}>Next</Button></div>;
}
function changeName(path:string) {
  const parts=path.split('/').slice(1).map(p=>p.replaceAll('~1','/').replaceAll('~0','~'));
  const section=collections.find(c=>c.key===parts[0]);
  let identity=parts[1]||'';
  try {const value=JSON.parse(identity);if(Array.isArray(value))identity=value.join(' · ');} catch { /* A section-wide change has no code identity. */ }
  return [section?.label||parts[0],identity,parts.slice(2).join(' · ')].filter(Boolean).join(' · ');
}
async function loadComparison(afterId:string,beforeId?:string,expectedRevision?:number){
  const [after,diff]=await Promise.all([contentApi.details(afterId),beforeId?contentApi.compare(beforeId,afterId):Promise.resolve(null)]);
  if(expectedRevision!==undefined&&(Number(after.version.revision)!==expectedRevision||diff&&Number(diff.targetRevision)!==expectedRevision))throw new Error('This version changed. Refresh submissions and review it again.');
  const bundle=after.bundle as ContentBundle;
  if(!bundle || typeof bundle!=='object')throw new Error('Content is unavailable for this version. Refresh or ask the designer to save the content again.');
  const differences=diff?.differences||collections.flatMap(c=>(bundle[c.key]||[]).map((row,i)=>({path:'/'+c.key+'/'+String(row.code||row.item_code||i+1),before:null,after:row})));
  const changes:Change[]=differences.map((d,i)=>({key:d.path+':'+i,path:d.path,title:changeName(d.path),kind:d.before===null?'Added':d.after===null?'Removed':'Updated',before:d.before,after:d.after}));
  return {bundle,changes,revision:Number(after.version.revision)};
}
export function ApiCompare({beforeId,afterId,onReady,expectedRevision}: {beforeId?:string;afterId:string;onReady?:(ready:boolean)=>void;expectedRevision?:number}) {
  const comparison=useQuery({queryKey:['content-compare',afterId,beforeId,expectedRevision],queryFn:()=>loadComparison(afterId,beforeId,expectedRevision)});
  const ready=comparison.isSuccess&&!comparison.isFetching;
  useEffect(()=>{onReady?.(ready);},[ready,onReady]);
  if(comparison.error)return <Alert variant="destructive" className="m-6 w-auto"><AlertDescription className="flex items-center justify-between gap-4">{errorMessage(comparison.error)}<Button variant="outline" size="sm" onClick={()=>void comparison.refetch()}>Retry</Button></AlertDescription></Alert>;
  if(!comparison.data)return <div role="status" className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Spinner/>Loading version and changes…</div>;
  const result=comparison.data;
  return <ComparisonView summary changes={result.changes} beforeLabel={'Before · '+(beforeId?'Baseline version':'First release')} afterLabel={'After · Version #'+result.bundle.version_no+' · Revision '+result.revision} content={section=><BundleSnapshot bundle={result.bundle} section={section}/>}/>;
}

function QueueItem({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}){
  return <button onClick={onClick} aria-current={active||undefined} className={cn('grid w-full gap-1 border-b border-l-2 border-l-transparent px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/50',active&&'border-l-primary bg-primary/5')}>{children}</button>;
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
    const p=new URLSearchParams(params);p.delete('draft');p.set('status',next);setParams(p,{replace:true});
  }
  function chooseDraft(id:string){
    const p=new URLSearchParams(params);p.set('draft',id);setParams(p,{replace:true});setNote('');setError('');
  }
  async function review(approve:boolean){
    if(!draft)return;setError('');
    try{await execute({type:'reviewDraft',id:draft.id,revision:draft.revision,approve,note});setNote('');}catch(e){setError(errorMessage(e));}
  }
  const valid=!!draft?.validated_at&&!!draft?.bundle_checksum&&!draft?.validation_errors?.length;
  return <div className="sv-page">
    <PageHeading eyebrow="STEP 1 · REVIEW" title="Review content" description="Inspect the changes before approving a version for publication." action={<Button variant="outline" disabled={busy} onClick={()=>void reload()}><Icon name="sync"/>Refresh</Button>}/>
    <Tabs value={status} onValueChange={chooseStatus} className="overflow-x-auto">
      <TabsList variant="line" aria-label="Submission status">{([['in_review','Awaiting review',pending.length],['approved','Approved',all.filter(d=>d.status==='approved').length],['rejected','Returned',all.filter(d=>d.status==='rejected').length],['all','All submissions',all.length]] as const).map(([value,label,count])=><TabsTrigger key={value} value={value} className="flex-none">{label}<Badge variant="secondary">{count}</Badge></TabsTrigger>)}</TabsList>
    </Tabs>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
      <Panel title="Submission queue" description={submissions.length+' matching versions'} action={<Badge variant="secondary">{pending.length} pending</Badge>}>
        <Field className="border-b p-5"><FieldLabel htmlFor="review-search">Find submission</FieldLabel><Input id="review-search" type="search" value={search} placeholder="Version, title or author" onChange={e=>{setSearch(e.target.value);setPage(1);setNote('');setError('');}}/></Field>
        <div>{visible.map(d=><QueueItem key={d.id} active={draft?.id===d.id} onClick={()=>chooseDraft(d.id)}><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-muted-foreground">#{d.version_no}</span><Status value={d.status}/></div><strong className="text-sm font-medium">{d.label}</strong><small className="text-xs text-muted-foreground">{d.authorName} · Submitted {dateLabel(d.submitted_at||d.updatedAt)}</small></QueueItem>)}</div>
        {submissions.length>20&&<Pager page={page} setPage={setPage} total={submissions.length}/>}
        {!visible.length&&<Empty title={status==='in_review'&&!search?"No pending submissions":"No matching submissions"} description="Choose another status or adjust your search."/>}
      </Panel>
      {draft?<Panel title={<><span className="sv-eyebrow block">SUBMISSION #{draft.version_no}</span>{draft.label}</>} description={draft.authorName+' · Revision '+draft.revision} action={<Status value={draft.status}/>}>
        <dl className="grid gap-4 border-b p-6 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-muted-foreground">Submitted</dt><dd>{dateLabel(draft.submitted_at||draft.updatedAt)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Compared with</dt><dd>{baseline?'Version #'+(state.drafts.find(d=>d.id===baseline)?.version_no||'—'):'First release · empty baseline'}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Validation</dt><dd className={valid?'text-success':'text-warning'}>{valid?'Passed':'Requires validation'}</dd></div>
        </dl>
        {draft.changelog&&<div className="border-b p-6"><span className="sv-eyebrow">DESIGNER SUMMARY</span><p className="mt-1 text-sm">{draft.changelog}</p></div>}
        {(!valid||error)&&<div className="grid gap-3 border-b p-6">
          {!valid&&<Alert variant="destructive" role="status"><AlertDescription className="whitespace-pre-wrap">{draft.validation_errors?.join('\n')||'No valid snapshot recorded. The designer must validate this version before it can be approved.'}</AlertDescription></Alert>}
          {error&&<Alert variant="destructive"><AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription></Alert>}
        </div>}
        <ApiCompare key={draft.id+':'+draft.revision+':'+baseline} beforeId={baseline} afterId={draft.id} expectedRevision={draft.revision} onReady={reviewReady}/>
        {draft.status==='in_review'?<div className="grid gap-4 border-t p-6">
          <div><h3 className="font-medium">Review decision</h3><p className="text-sm text-muted-foreground">Approve to move this version to the publish queue, or return it with a reason.</p></div>
          <Field><FieldLabel htmlFor="review-note">Feedback to designer</FieldLabel><Textarea id="review-note" rows={2} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Explain what needs changing. Required when returning a submission."/></Field>
          <div className="flex flex-wrap items-center justify-between gap-3"><small className="text-xs text-muted-foreground">{ready!==reviewKey?"Changes must finish loading before approval.":!valid?"Approval requires a validated snapshot.":"Changes loaded · review this version before approving."}</small><div className="flex gap-2"><Button variant="outline" disabled={busy||!note.trim()} onClick={()=>void review(false)}><Icon name="undo"/>Return to designer</Button><Button disabled={busy||ready!==reviewKey||!valid} onClick={()=>void review(true)}><Icon name="check"/>Approve content</Button></div></div>
        </div>:<div className="grid gap-2 border-t p-6"><strong className="font-medium">{draft.status==='approved'?"Approved for publication":"Review status: "+draft.status}</strong>{draft.note&&<p className="text-sm text-muted-foreground">{draft.note}</p>}{draft.status==='approved'&&<Button asChild className="w-fit"><Link to="/admin/releases">Go to publish queue<Icon name="arrow_forward"/></Link></Button>}</div>}
      </Panel>:<Panel><Empty title="Select a submission" description="Changes and review actions appear here when a submission is available."/></Panel>}
    </div>
  </div>;
}
export function ApiReleasesPage(){
  const {state,execute,busy,reload}=useWorkspace(),{user}=useAuth();
  const admin=user?.role==='admin',canBundle=user?.role!=='analyst';
  const active=state.releases.find(r=>r.id===state.activeReleaseId);
  const [tab,setTab]=useState<'versions'|'history'|'compare'>('versions');
  const [search,setSearch]=useState(''),[status,setStatus]=useState('all');
  const [detail,setDetail]=useState(''),[before,setBefore]=useState(''),[after,setAfter]=useState(''),[page,setPage]=useState(1),[historyPage,setHistoryPage]=useState(1);
  const [confirm,setConfirm]=useState<{id:string;type:'publish'|'rollback';revision?:number}|null>(null),[reason,setReason]=useState(''),[error,setError]=useState('');
  const approved=state.drafts.filter(d=>d.status==='approved');
  const download=useMutation({mutationFn:async({id,no}:{id:string;no:number})=>downloadRaw(await contentApi.rawBundle(id),'shadowvale-content-'+no+'.json'),onMutate:()=>setError(''),onError:e=>setError(errorMessage(e))});
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
  const versionNo=(id:string|null)=>id?'#'+(state.drafts.find(d=>d.id===id)?.version_no||id):'—';
  if(user?.role==='analyst')return <div className="sv-page"><PageHeading title="Versions"/><Empty title="Content version API is restricted" description="Metadata and content comparison require Admin/Designer; publication history requires Admin. Analyst can compare game analytics by entering version GUIDs in Analytics."/></div>;
  return <div className="sv-page">
    <PageHeading eyebrow={admin?'STEP 2 · PUBLISH':undefined} title={admin?"Publish versions":"Versions"} description="Publish approved content and keep track of the version running in the game." action={<Button variant="outline" disabled={busy} onClick={()=>void reload()}><Icon name="sync"/>Refresh</Button>}/>
    {error&&!confirm&&<Alert variant="destructive"><AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription></Alert>}
    <Panel><div className="flex flex-wrap items-center justify-between gap-4 p-6">
      <div className="flex items-center gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon name="public" className="size-5"/></span><div><span className="sv-eyebrow">LIVE GAME CONTENT</span><h2 className="text-lg font-semibold">{active?'#'+active.version_no+' · '+active.label:"No published version"}</h2><p className="text-sm text-muted-foreground">{active?"Published "+dateLabel(active.publishedAt)+' · '+active.publishedBy:"Publish an approved version to make content available to the game."}</p></div></div>
      {active&&<div className="flex items-center gap-2"><Status value="published"/>{canBundle&&<Button variant="outline" disabled={download.isPending} onClick={()=>download.mutate({id:active.id,no:active.version_no})}><Icon name="download"/>Download JSON</Button>}</div>}
    </div></Panel>
    {admin&&<Panel title={<>Ready to publish <Badge variant="secondary" className="ml-1">{approved.length}</Badge></>} description="Only approved submissions can be released." action={<Button asChild variant="ghost" size="sm"><Link to="/admin/reviews">Review content<Icon name="arrow_forward"/></Link></Button>}>
      {approved.map(d=><div className="flex flex-wrap items-center gap-4 border-b px-6 py-4 last:border-b-0" key={d.id}><span className="font-mono text-xs text-muted-foreground">#{d.version_no}</span><div className="min-w-0 flex-1"><strong className="block text-sm font-medium">{d.label}</strong><small className="text-xs text-muted-foreground">Approved {dateLabel(d.reviewedAt||d.updatedAt)} · {d.reviewedBy||'Admin'}</small></div><div className="flex gap-2"><Button variant="outline" onClick={()=>setDetail(d.id)}>View changes</Button><Button disabled={busy} onClick={()=>{setError('');setReason('');setConfirm({type:'publish',id:d.id,revision:d.revision});}}><Icon name="deployed_code"/>Publish version</Button></div></div>)}
      {!approved.length&&<Empty title="No approved content waiting" description="Review a designer submission first. Approved versions will appear here."/>}
    </Panel>}
    <Panel>
      <Tabs value={tab} onValueChange={value=>setTab(value as typeof tab)} className="overflow-x-auto border-b px-4">
        <TabsList variant="line" aria-label="Version information" className="h-12">{([['versions','Published versions'],...(admin?[['history','Publication history']]:[]),['compare','Compare versions']] as [typeof tab,string][]).map(([value,label])=><TabsTrigger key={value} value={value} className="flex-none">{label}</TabsTrigger>)}</TabsList>
      </Tabs>
      {tab==='versions'?<>
        <div className="grid grid-cols-2 items-end gap-4 border-b p-5 md:grid-cols-[minmax(220px,2fr)_minmax(160px,1fr)_auto]"><Field className="col-span-2 md:col-span-1"><FieldLabel htmlFor="release-search">Find version</FieldLabel><Input id="release-search" type="search" value={search} placeholder="Version number or title" onChange={e=>{setSearch(e.target.value);setPage(1);}}/></Field><Field><FieldLabel htmlFor="release-status">Status</FieldLabel><NativeSelect id="release-status" className="w-full" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><NativeSelectOption value="all">All published versions</NativeSelectOption><NativeSelectOption value="published">Live</NativeSelectOption><NativeSelectOption value="archived">Archived</NativeSelectOption></NativeSelect></Field><span className="pb-2 text-xs text-muted-foreground">{filtered.length} versions</span></div>
        <Table className={panelTable}><TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead>Published</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{entries.map(r=><TableRow key={r.id}><TableCell><div className="font-medium">#{r.version_no} · {r.label}</div><div className="text-xs text-muted-foreground">{r.publishedBy}</div></TableCell><TableCell><Status value={r.status}/></TableCell><TableCell>{dateLabel(r.publishedAt)}</TableCell><TableCell><div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>setDetail(r.id)}>View changes</Button>{canBundle&&<Button variant="outline" size="sm" disabled={download.isPending} aria-label={"Download JSON for version "+r.version_no} onClick={()=>download.mutate({id:r.id,no:r.version_no})}><Icon name="download"/>JSON</Button>}{admin&&r.status==='archived'&&<Button variant="outline" size="sm" disabled={busy} onClick={()=>{setError('');setReason('');setConfirm({type:'rollback',id:r.id});}}>Rollback</Button>}</div></TableCell></TableRow>)}</TableBody></Table>
        {!entries.length&&<Empty title="No matching versions"/>}{filtered.length>20&&<Pager page={page} setPage={setPage} total={filtered.length}/>}
      </>:tab==='history'?<>
        <div className="border-b px-6 py-4"><h2 className="font-semibold">Publication history</h2><p className="text-xs text-muted-foreground">Recorded publish and rollback decisions</p></div>
        <Table className={panelTable}><TableHeader><TableRow>{['Action','Version','Previous','Reason','Actor','Occurred'].map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{state.publications.slice((historyPage-1)*20,historyPage*20).map(h=><TableRow key={h.id}><TableCell>{h.action==='publish'?"Publish":"Rollback"}</TableCell><TableCell>{versionNo(h.content_version_id)}</TableCell><TableCell>{versionNo(h.previous_version_id)}</TableCell><TableCell className="max-w-80 whitespace-normal">{h.reason}</TableCell><TableCell>{h.actor_id}</TableCell><TableCell>{dateLabel(h.occurred_at)}</TableCell></TableRow>)}</TableBody></Table>
        {!state.publications.length&&<Empty title="No publication history"/>}{state.publications.length>20&&<Pager page={historyPage} setPage={setHistoryPage} total={state.publications.length}/>}
      </>:<>
        <div className="border-b px-6 py-4"><h2 className="font-semibold">Compare versions</h2><p className="text-xs text-muted-foreground">Choose a baseline and a target version.</p></div>
        <div className="grid gap-4 border-b p-6 sm:grid-cols-2">{([['Baseline',before,setBefore],['Target',after,setAfter]] as const).map(([label,value,set])=><Field key={label}><FieldLabel htmlFor={'compare-'+label}>{label}</FieldLabel><NativeSelect id={'compare-'+label} className="w-full" value={value} onChange={e=>set(e.target.value)}><NativeSelectOption value="">Choose version</NativeSelectOption>{state.drafts.map(d=><NativeSelectOption key={d.id} value={d.id}>#{d.version_no} · {d.label}</NativeSelectOption>)}</NativeSelect></Field>)}</div>
        {before&&after?<ApiCompare key={before+after} beforeId={before} afterId={after}/>:<Empty title="Choose two versions" description="The comparison shows additions, removals and field changes."/>}
      </>}
    </Panel>
    {selected&&<Modal wide scrollable eyebrow="VERSION DETAILS" title={'#'+selected.version_no+' · '+selected.label} onClose={()=>setDetail('')}><ApiCompare key={detail+':'+baseline} beforeId={baseline} afterId={detail}/></Modal>}
    {confirm&&<Modal eyebrow={confirm.type==='publish'?'RELEASE CONTENT':'RESTORE A RELEASE'} title={(confirm.type==='publish'?'Publish':'Rollback to')+' #'+target?.version_no+'?'} description={<>{target?.label}<br/>{confirm.type==='publish'?'This becomes the live content version available to the game.':'This restores the previously published bundle and archives the current live version.'}</>} busy={busy} onClose={()=>setConfirm(null)}>
      <form className="grid gap-4" onSubmit={e=>{e.preventDefault();void action();}}>
        <Field><FieldLabel htmlFor="release-reason">{confirm.type==='publish'?'Release note':'Rollback reason'}</FieldLabel><Textarea id="release-reason" disabled={busy} maxLength={500} required rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required · explain this publication decision"/></Field>
        {error&&<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</Button><Button disabled={busy||!reason.trim()}>{busy&&<Spinner/>}{busy?'Processing…':confirm.type==='publish'?'Publish version':'Confirm rollback'}</Button></div>
      </form>
    </Modal>}
  </div>;
}

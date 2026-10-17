import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '../../hooks/useAuth';
import { can } from '../auth/access';
import { analyticsApi } from './analyticsApi';
import { solverSpecs,defaultWeights } from './solverSpecs';
import type { SolverConfigurationDto,EnumsDto,JsonValue } from '../../services/api/contracts';
import { errorMessage } from '../../services/api/errors';
import { Empty, Icon, Panel, Status, panelTable } from '../shared/ui';
import { Modal } from '../shared/Modal';
import { useConfirm } from '../shared/confirmContext';
import { NumericControl } from '../shared/NumericControl';
type Form={mode:'create'|'edit'|'clone';row?:SolverConfigurationDto;code:string;name:string;algorithm:string;library:string;budget:number;params:Record<string,JsonValue>;weights:Record<string,JsonValue>};
const solversKey=['solver-configurations'];
function asObject(value:JsonValue):Record<string,JsonValue>{return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
const formFrom=(row:SolverConfigurationDto,mode:'edit'|'clone'):Form=>({mode,row,code:mode==='clone'?row.code+'_copy':row.code,name:mode==='clone'?row.name+' copy':row.name,algorithm:row.algorithm,library:row.library||'',budget:Number(row.timeBudgetMs),params:asObject(row.params),weights:asObject(row.quboWeights)});
const select=(id:string,label:string,value:string,set:(v:string)=>void,all:string,options:string[]=[],disabled=false)=><Field key={id}><FieldLabel htmlFor={id}>{label}</FieldLabel><NativeSelect id={id} className="w-full" disabled={disabled} value={value} onChange={e=>set(e.target.value)}>{all&&<NativeSelectOption value="">{all}</NativeSelectOption>}{options.map(v=><NativeSelectOption key={v} value={v}>{v}</NativeSelectOption>)}</NativeSelect></Field>;
export function SolverConfigurations({enums}:{enums?:EnumsDto}){
 const {user}=useAuth(),canManage=!!user&&can(user.role,'solverEdit'),queryClient=useQueryClient(),confirm=useConfirm();
 const list=useQuery({queryKey:solversKey,queryFn:({signal})=>analyticsApi.solvers(signal)});
 const [form,setForm]=useState<Form|null>(null),[error,setError]=useState(''),[inputErrors,setInputErrors]=useState<Record<string,string>>({});
 const [family,setFamily]=useState(''),[algorithm,setAlgorithm]=useState(''),[active,setActive]=useState('all');
 const refresh=()=>queryClient.invalidateQueries({queryKey:solversKey});
 const fail=(e:Error)=>{if(form)setError(errorMessage(e));else toast.error(errorMessage(e));};
 // Edit and clone start from the latest server copy.
 const open=useMutation({mutationFn:({row}:{row:SolverConfigurationDto;mode:'edit'|'clone'})=>analyticsApi.solver(row.id),onSuccess:(row,{mode})=>{setError('');setInputErrors({});setForm(formFrom(row,mode));},onError:fail});
 const save=useMutation({
  mutationFn:async(f:Form)=>{
   if(f.mode==='clone')return analyticsApi.clone(f.row!.id,f.code,f.name);
   const data={name:f.name,library:f.library||null,timeBudgetMs:f.budget,params:f.params,quboWeights:f.weights};
   if(f.mode==='create')await analyticsApi.create({...data,code:f.code,algorithm:f.algorithm});else await analyticsApi.update(f.row!.id,data);
  },
  onSuccess:(clone,f)=>{void refresh();if(f.mode==='clone'&&clone)setForm(formFrom(clone,'edit'));else{setForm(null);toast.success('Configuration saved.');}},
  onError:fail,
 });
 const toggle=useMutation({mutationFn:(row:SolverConfigurationDto)=>analyticsApi.active(row.id,!row.isActive),onSuccess:()=>void refresh(),onError:fail});
 const remove=useMutation({mutationFn:(row:SolverConfigurationDto)=>analyticsApi.remove(row.id),onSuccess:()=>void refresh(),onError:fail});
 const busy=open.isPending||save.isPending||toggle.isPending||remove.isPending;
 function patch(value:Partial<Form>){setForm(f=>f?{...f,...value}:f);}
 function report(key:string,value:string){setInputErrors(e=>({...e,[key]:value}));}
 const used=!!form?.row&&(Number(form.row.sessionCount)>0||Number(form.row.resultCount)>0);
 const frozen=form?.mode==='clone'||form?.mode==='edit'&&used;
 const rows=list.data??[];
 const visible=rows.filter(r=>(!family||r.family===family)&&(!algorithm||r.algorithm===algorithm)&&(active==='all'||r.isActive===(active==='active')));
 return <>
  <Panel title="Solver configurations" action={<><Button variant="outline" disabled={busy||list.isFetching} onClick={()=>void list.refetch()}><Icon name="sync"/>Refresh</Button>{canManage&&<Button disabled={busy||!enums} onClick={()=>{setError('');setInputErrors({});setForm({mode:'create',code:'',name:'',algorithm:enums!.solverAlgorithms[0],library:'',budget:250,params:{},weights:{...defaultWeights}});}}><Icon name="add"/>New configuration</Button>}</>}>
   <div className="grid gap-4 border-b p-5 sm:grid-cols-3">
    {select('solver-family','Family',family,setFamily,'All families',enums?.solverFamilies)}
    {select('solver-algorithm','Algorithm',algorithm,setAlgorithm,'All algorithms',enums?.solverAlgorithms)}
    <Field><FieldLabel htmlFor="solver-status">Status</FieldLabel><NativeSelect id="solver-status" className="w-full" value={active} onChange={e=>setActive(e.target.value)}><NativeSelectOption value="all">All</NativeSelectOption><NativeSelectOption value="active">Active</NativeSelectOption><NativeSelectOption value="inactive">Inactive</NativeSelectOption></NativeSelect></Field>
   </div>
   {list.error&&<Alert variant="destructive" className="m-5 w-auto"><AlertDescription className="flex items-center justify-between gap-4">{errorMessage(list.error)}<Button variant="outline" size="sm" onClick={()=>void list.refetch()}>Retry</Button></AlertDescription></Alert>}
   {list.isPending?<div role="status" className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Spinner/>Loading configurations…</div>:<>
    <Table className={panelTable}><TableHeader><TableRow>{['Configuration','Algorithm / family','Budget','Usage','Status','Actions'].map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{visible.map(r=><TableRow key={r.id}>
     <TableCell><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.code} · {r.variant}</div></TableCell>
     <TableCell>{r.algorithm}<div className="text-xs text-muted-foreground">{r.family}</div></TableCell>
     <TableCell>{r.timeBudgetMs} ms</TableCell><TableCell>{r.sessionCount} sessions · {r.resultCount} results</TableCell>
     <TableCell><Status value={r.isActive?'active':'inactive'}/><div className="text-xs text-muted-foreground">{r.isAbArm?'Human A/B arm':'Outside human A/B'}</div></TableCell>
     <TableCell><div className="flex gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={()=>open.mutate({row:r,mode:'edit'})}>{canManage?"Edit":"View"}</Button>{canManage&&<>
      <Button variant="outline" size="sm" disabled={busy} onClick={()=>open.mutate({row:r,mode:'clone'})}>Clone</Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={()=>toggle.mutate(r)}>{r.isActive?"Deactivate":"Activate"}</Button>
      <Button variant="outline" size="sm" disabled={busy||Number(r.sessionCount)>0||Number(r.resultCount)>0} onClick={async()=>{if(await confirm({title:'Delete configuration '+r.code+'?',description:'It has no recorded sessions or results.',action:'Delete',destructive:true}))remove.mutate(r);}}>Delete</Button></>}
     </div></TableCell>
    </TableRow>)}</TableBody></Table>
    {!visible.length&&<Empty title="No configurations"/>}
   </>}
   <p className="px-6 py-4 text-xs text-muted-foreground">New and cloned configurations start inactive. Active configurations must share time budget and all six QUBO weights. Quantum hardware is excluded from human A/B assignment.</p>
  </Panel>
  {form&&<Modal wide title={(!canManage?"View":form.mode==='clone'?"Clone":form.mode==='create'?"New":"Edit")+" configuration"} busy={save.isPending} onClose={()=>setForm(null)}>
   <form className="grid max-h-[70dvh] gap-5 overflow-y-auto pr-1" onSubmit={e=>{e.preventDefault();setError('');save.mutate(form);}}><fieldset className="grid gap-5" disabled={save.isPending||!canManage}>
    {used&&form.mode==='edit'&&<Alert><AlertDescription>This configuration has recorded sessions/results. Only its name can change; clone it to tune parameters.</AlertDescription></Alert>}
    <div className="sv-form grid gap-5 sm:grid-cols-2">
     <Field><FieldLabel htmlFor="solver-code">Code</FieldLabel><Input id="solver-code" autoFocus required maxLength={64} pattern="^[a-z][a-z0-9_]*$" disabled={form.mode==='edit'} value={form.code} onChange={e=>patch({code:e.target.value})}/></Field>
     <Field><FieldLabel htmlFor="solver-name">Name</FieldLabel><Input id="solver-name" required maxLength={100} value={form.name} onChange={e=>patch({name:e.target.value})}/></Field>
     {select('solver-form-algorithm','Algorithm',form.algorithm,v=>{patch({algorithm:v,params:{}});setInputErrors({});},'',enums?.solverAlgorithms,form.mode!=='create')}
     <Field><FieldLabel htmlFor="solver-library">Library</FieldLabel><Input id="solver-library" maxLength={50} disabled={frozen} value={form.library} onChange={e=>patch({library:e.target.value})}/></Field>
     <NumericControl label="Time budget" value={form.budget} min={1} max={10000} step={1} sliderMin={1} sliderMax={1000} unit="ms" disabled={frozen} onChange={v=>patch({budget:v!})} onError={e=>report('budget',e)}/>
    </div>
    <h3 className="font-semibold">Algorithm parameters</h3>
    {Object.keys(solverSpecs[form.algorithm]||{}).length?<div className="sv-form grid gap-5 sm:grid-cols-2">{Object.entries(solverSpecs[form.algorithm]).map(([key,spec])=>spec.options
     ?select('solver-param-'+key,key,String(form.params[key]||''),v=>{const params={...form.params};if(v)params[key]=v;else delete params[key];patch({params});},'Default',spec.options,frozen)
     :<NumericControl key={form.algorithm+key} label={key} value={form.params[key]==null?null:Number(form.params[key])} nullable min={spec.min} max={spec.max} step={spec.step} sliderMin={spec.min} sliderMax={Math.min(spec.max,Math.max(spec.min+1,100))} disabled={frozen} onChange={v=>{const params={...form.params};if(v===null)delete params[key];else params[key]=v;patch({params});}} onError={e=>report(key,e)}/>)}</div>
     :<p className="text-sm text-muted-foreground">No configurable parameters for this algorithm.</p>}
    <h3 className="font-semibold">QUBO weights</h3>
    <div className="sv-form grid gap-5 sm:grid-cols-2">{Object.keys(defaultWeights).map(key=><NumericControl key={key} label={key.replace('weight_','').replace('penalty_','Penalty ')} value={Number(form.weights[key]??defaultWeights[key])} min={0} max={1000} step={0.000001} sliderMin={0} sliderMax={10} disabled={frozen} onChange={v=>patch({weights:{...form.weights,[key]:v!}})} onError={e=>report(key,e)}/>)}</div>
    {error&&<Alert variant="destructive"><AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription></Alert>}
   </fieldset>
    <div className="flex justify-end gap-2">{canManage?<><Button type="button" variant="outline" disabled={save.isPending} onClick={()=>setForm(null)}>Cancel</Button><Button disabled={save.isPending||!form.name.trim()||!form.code.trim()||Object.values(inputErrors).some(Boolean)}>{save.isPending&&<Spinner/>}{save.isPending?"Saving…":form.mode==='clone'?"Create inactive clone":"Save configuration"}</Button></>:<Button type="button" variant="outline" onClick={()=>setForm(null)}>Close</Button>}</div>
   </form>
  </Modal>}
 </>;
}

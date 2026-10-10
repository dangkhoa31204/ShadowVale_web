import { axiosClient } from '../../services/api/axiosClient';
import { storageService } from '../../services/storage/storageService';
import { errorMessage } from '../../services/api/errors';
import type { ContentVersionDto, ContentVersionDetailsDto, EnumsDto, ContentValidationResultDto, ContentComparisonDto, ContentPublicationDto } from '../../services/api/contracts';
import { resources, draftFromApi, editorToEntities, entitiesToEditor, type Entity, type EntitySet } from './apiModel';
import { planSave, runSavePlan, payload } from './savePlan';
import type { Command, ContentBundle, Draft, Workspace } from './types';
export interface Page<T> { items:T[]; page:number; pageSize:number; totalCount:number; totalPages:number }
export async function allPages<T>(read:(page:number)=>Promise<Page<T>>):Promise<T[]> {
  const rows:T[]=[];let page=1;
  for(;;){const result=await read(page);rows.push(...result.items);if(page>=Number(result.totalPages)) return rows;page++;}
}
const root='/content-versions';
type Snapshot={ version:ContentVersionDto; entities:EntitySet };
const snapshots=new Map<string,Snapshot>();
const actor=(id:string|null|undefined)=>id===storageService.getUser()?.id?storageService.getUser()!.callsign:id||'—';
export const contentApi={
  enums:async()=> (await axiosClient.get<EnumsDto>('/meta/enums')).data,
  versions:async()=>{
    // BE intentionally excludes Archived from the unfiltered list.
    const groups=await Promise.all([undefined,'Archived'].map(status=>allPages<ContentVersionDto>(async page=>(await axiosClient.get<Page<ContentVersionDto>>(root,{params:{page,pageSize:100,status}})).data)));
    return [...new Map(groups.flat().map(v=>[v.id,v])).values()];
  },
  details:async(id:string)=> (await axiosClient.get<ContentVersionDetailsDto>(root+'/'+id)).data,
  async version(id:string){return (await this.details(id)).version;},
  async deleteVersion(id:string,revision:number){await axiosClient.delete(root+'/'+id,{data:{revision}});snapshots.delete(id);},
  history:async()=>allPages<ContentPublicationDto>(async page=>(await axiosClient.get<Page<ContentPublicationDto>>('/content-publications',{params:{page,pageSize:100}})).data),
  compare:async(a:string,b:string)=> (await axiosClient.get<ContentComparisonDto>(root+'/'+a+'/compare',{params:{targetId:b}})).data,
  rawBundle:async(id:string)=> (await axiosClient.get<string>(root+'/'+id+'/bundle',{responseType:'text',transformResponse:[data=>data]})).data,
  async validate(id:string,revision:number):Promise<ContentValidationResultDto>{
    const result=(await axiosClient.post<ContentValidationResultDto>(root+'/'+id+'/validate',{revision})).data;
    const snapshot=snapshots.get(id);
    if(snapshot) snapshot.version=await this.version(id);
    return result;
  },
  async editor(id:string):Promise<Draft> {
    const version=await this.version(id);
    const entities={} as EntitySet;
    await Promise.all(resources.map(async([key,route])=>{
      const list=(await axiosClient.get<Entity[]>(root+'/'+id+'/'+route)).data;
      entities[key]=key==='maps'?await Promise.all(list.map(async row=>(await axiosClient.get<Entity>(root+'/'+id+'/'+route+'/'+row.id)).data)):list;
    }));
    const bundle=entitiesToEditor(version,entities);
    snapshots.set(id,{version:structuredClone(version),entities:editorToEntities(bundle)});
    return draftFromApi(version,bundle);
  },
  async save(id:string,bundle:ContentBundle,label:string,changelog:string):Promise<void>{
    const snapshot=snapshots.get(id);
    if(!snapshot) throw new Error('Reload this content before saving.');
    const latest=await this.version(id);
    if(Number(latest.revision)!==Number(snapshot.version.revision)) throw new Error('Content changed on the server. Keep your edits and reload a copy before saving.');
    const operations=planSave(snapshot.entities,editorToEntities(bundle));
    if(latest.status==='Rejected'&&!operations.length&&(latest.label!==label||latest.changelog!==changelog))
      throw new Error('Edit a content resource to return this rejected version to Draft, or clone it. The backend cannot save metadata alone while Rejected.');
    await runSavePlan(operations,async op=>{
      const url=root+'/'+id+'/'+op.route+(op.method==='post'?'':'/'+op.id);
      try{
        if(op.method==='delete'){await axiosClient.delete(url);snapshot.entities[op.resource]=snapshot.entities[op.resource].filter(x=>x.code!==op.code);}
        else{
          const row=(await axiosClient[op.method]<Entity>(url,op.data)).data;
          const saved={...op.data!,id:row.id,code:op.code} as Entity;
          snapshot.entities[op.resource]=[...snapshot.entities[op.resource].filter(x=>x.code!==op.code),saved];
        }
        snapshot.version=await this.version(id);
      }catch(error){throw new Error(errorMessage(error),{cause:error});}
    });
    if(latest.label!==label||latest.changelog!==changelog){
      try{snapshot.version=(await axiosClient.put<ContentVersionDto>(root+'/'+id,{label,changelog,schemaVersion:latest.schemaVersion,revision:Number(snapshot.version.revision)})).data;}
      catch(error){throw new Error('Save stopped. Saved: '+(operations.map(op=>op.resource+'/'+op.code).join(', ')||'none')+'. Remaining: version metadata.\n'+errorMessage(error),{cause:error});}
    }
  },
  async execute(command:Command):Promise<Workspace>{
    let createdId:string|undefined;
    if(command.type==='createDraft'){
      const published=(await this.versions()).find(v=>v.status==='Published');
      createdId=(await axiosClient.post<ContentVersionDto>(root,{label:command.label||command.title,changelog:command.changelog||'',parentVersionId:command.sourceReleaseId||published?.id||null,schemaVersion:'1.0'})).data.id;
    }else if(command.type==='saveDraft'){
      if(command.changeReport)throw new Error('Reports are local only; save them in Change reports.');
      await this.save(command.id,command.bundle,command.label||command.title,command.changelog||'');
    }else if(['submitDraft','reviewDraft','publishDraft','restoreRelease'].includes(command.type)){
      if(!('id'in command))throw new Error('Missing version.');
      const current=await this.version(command.id);
      if('revision'in command&&Number(current.revision)!==command.revision)throw new Error('This version changed. Refresh and review it again.');
      if(command.type==='submitDraft'){
        let revision=Number(current.revision);
        if(!current.validatedAt||!current.bundleChecksum||current.validationErrors.length){
          const report=await this.validate(command.id,revision);
          if(!report.isValid)throw new Error(report.errors.map(x=>x.path+': '+x.message).join('\n'));
          revision=Number(report.revision);
        }
        await axiosClient.post(root+'/'+command.id+'/submit',{revision});
      }else if(command.type==='reviewDraft'){
        if(current.status!=='InReview')throw new Error('This version is no longer in review.');
        await axiosClient.post(root+'/'+command.id+(command.approve?'/approve':'/reject'),{revision:Number(current.revision),reviewNote:command.note});
      }else if(command.type==='publishDraft')await axiosClient.post(root+'/'+command.id+'/publish',{revision:Number(current.revision),reason:command.reason});
      else if(command.type==='restoreRelease')await axiosClient.post(root+'/'+command.id+'/rollback',{revision:Number(current.revision),reason:command.reason});
    }else throw new Error('This action has no supported backend endpoint.');
    const workspace=await this.workspace();
    if(createdId)workspace.drafts.sort((a,b)=>a.id===createdId?-1:b.id===createdId?1:0);
    return workspace;
  },
  async workspace():Promise<Workspace>{
    const user=storageService.getUser();
    const [versions,history]=await Promise.all([user?.role==='analyst'?Promise.resolve([]):this.versions(),user?.role==='admin'?this.history():Promise.resolve([])]);
    const drafts=versions.sort((a,b)=>Number(b.versionNo)-Number(a.versionNo)).map(v=>draftFromApi(v));
    // Soft-deleted drafts are Archived too, but have never been published.
    const releases=drafts.filter(d=>d.status==='published'||d.status==='archived'&&!!d.published_at).map(d=>({id:d.id,version_no:d.version_no,label:d.label,changelog:d.changelog,status:d.status as 'published'|'archived',version:String(d.version_no),publishedAt:d.published_at||d.updatedAt,publishedBy:actor(d.published_by),bundle:d.bundle,sourceDraftId:d.id,revision:d.revision}));
    return {storageVersion:2,drafts,releases,activeReleaseId:releases.find(r=>r.status==='published')?.id||'',publications:history.map((h,i)=>({id:i,content_version_id:h.contentVersionId,previous_version_id:h.previousVersionId,action:h.action.toLowerCase() as 'publish'|'rollback',actor_id:h.actorUsername||h.actorId||'—',reason:h.reason,occurred_at:h.createdAt})),users:user?[{...user,active:true}]:[],audit:history.map(h=>({id:h.id,at:h.createdAt,actor:h.actorUsername||h.actorId||'—',action:h.action,target:h.versionLabel||h.contentVersionId})),config:{reviewRequired:true,telemetryEnabled:false}};
  },
};
export function downloadRaw(text:string,filename:string,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export { payload };

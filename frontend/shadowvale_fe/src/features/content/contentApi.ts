import { axiosClient } from '../../services/api/axiosClient';
import { storageService } from '../../services/storage/storageService';
import { errorMessage, statusOf } from '../../services/api/errors';
import type { ContentVersionDto, ContentVersionDetailsDto, EnumsDto, ContentValidationResultDto, ContentComparisonDto, ContentPublicationDto } from '../../services/api/contracts';
import { resources, draftFromApi, editorToEntities, entitiesToEditor, emptyBundle, importToVersion, validateEditor, type Entity, type EntitySet } from './apiModel';
import { canonical, planSave, runSavePlan, payload } from './savePlan';
import type { Command, ContentBundle, Draft, Workspace } from './types';
export interface Page<T> { items:T[]; page:number; pageSize:number; totalCount:number; totalPages:number }
export async function allPages<T>(read:(page:number)=>Promise<Page<T>>):Promise<T[]> {
  const rows:T[]=[];let page=1;
  for(;;){const result=await read(page);rows.push(...result.items);if(page>=Number(result.totalPages)) return rows;page++;}
}
const root='/content-versions';
const unityImportNote=(hash:string)=>'Imported Unity source '+hash+'. Review before publish.';
export function isUnityImport(changelog: string | null | undefined, sourceHash: string) {
  return !!changelog && (changelog.includes(unityImportNote(sourceHash)) ||
    /(?:^|\r?\n)Imported Unity source [a-f0-9]{64}\. Review before publish\.(?=\r?\n|$)/i.test(changelog));
}

export function missingUnityContent(source: ContentBundle, draft: ContentBundle) {
  const missing = resources.flatMap(([key]) => source[key]
    .filter(row => !draft[key]?.some(saved => saved.code === row.code))
    .map(row => key + '/' + row.code));
  const recipesWithIngredients = new Set(source.crafting_recipe_ingredients.map(row => row.recipe_code));
  for (const recipe of draft.crafting_recipes ?? []) {
    if (recipesWithIngredients.has(recipe.code) && !draft.crafting_recipe_ingredients?.some(row => row.recipe_code === recipe.code))
      missing.push('crafting_recipe_ingredients/' + recipe.code);
  }
  return missing;
}

function recipeIngredients(bundle: ContentBundle, code: string) {
  return bundle.crafting_recipe_ingredients.filter(row => row.recipe_code === code)
    .map(row => [row.item_code, row.quantity]).sort(([left], [right]) => String(left).localeCompare(String(right)));
}
type Snapshot={ version:ContentVersionDto; entities:EntitySet };
const snapshots=new Map<string,Snapshot>();
const actor=(id:string|null|undefined)=>id===storageService.getUser()?.id?storageService.getUser()!.callsign:id||'—';
export class UnityImportError extends Error {
  readonly draftId: string;
  constructor(draftId: string, cause: unknown) {
    super('Unity import stopped in Draft ' + draftId + '. Retry resumes this draft. ' + errorMessage(cause), { cause });
    this.draftId=draftId;
  }
}
export const contentApi={
  async importUnity(source:ContentBundle,sourceHash:string,existingId?:string,label?:string):Promise<string>{
    const errors=validateEditor(source);
    if(errors.length)throw new Error('Unity source is invalid: '+errors.slice(0,5).join('; '));
    let id=existingId;
    try{
      const changelog=unityImportNote(sourceHash);
      const previous=existingId?await this.details(existingId):null;
      const version=previous?.version??
        (await axiosClient.post<ContentVersionDto>(root,{label:label?.trim() || 'Unity import '+sourceHash.slice(0,12),changelog,parentVersionId:null,schemaVersion:'1.0'})).data;
      id=version.id;
      if(version.status!=='Draft'||version.submittedAt||!isUnityImport(version.changelog,sourceHash))throw new Error('Choose an unsubmitted Draft created from Unity Catalog.');
      if(existingId && version.authoredById!==storageService.getUser()?.id)throw new Error('Only the author can resume this Unity import.');
      const current=editorToEntities({...emptyBundle(version),...previous?.bundle as Partial<ContentBundle>});
      const imported=editorToEntities(importToVersion(source,version));
      const sourceRecipes = new Map(imported.crafting_recipes.map(recipe => [recipe.code, recipe]));
      for(const [key] of resources){
        const existing=new Set(current[key].map(row=>row.code));
        const retained = key !== 'crafting_recipes' ? current[key] : current[key].map(recipe => {
          const defaults = sourceRecipes.get(recipe.code);
          return defaults && defaults.outputItemCode === recipe.outputItemCode && Array.isArray(defaults.ingredients) &&
            (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0)
            ? { ...recipe, ingredients: defaults.ingredients } : recipe;
        });
        imported[key]=[...retained,...imported[key].filter(row=>!existing.has(row.code))];
      }
      const operations=planSave(current,imported);
      await runSavePlan(operations,async op=>{
        const route = root+'/'+version.id+'/'+op.route;
        const write = () => op.method === 'put' ? axiosClient.put(route+'/'+op.id,op.data) : axiosClient.post(route,op.data);
        try { await write(); }
        catch (error) {
          // A lost response may follow a successful write. Read the draft before retrying.
          const status = statusOf(error);
          if (status !== undefined && ![502,503,504].includes(status)) throw error;
          const latest = await this.details(version.id);
          if (latest.version.status !== 'Draft' || latest.version.submittedAt) throw error;
          const persisted = {...emptyBundle(latest.version),...latest.bundle as Partial<ContentBundle>};
          const row = persisted[op.resource].find(row => row.code === op.code);
          const saved = op.method === 'post' ? !!row : persisted.crafting_recipe_ingredients.some(row => row.recipe_code === op.code);
          if (saved) return;
          await write();
        }
      });
      snapshots.delete(version.id);
      const persisted = await this.details(version.id);
      const completed = {...emptyBundle(persisted.version),...persisted.bundle as Partial<ContentBundle>};
      const missing = missingUnityContent(source,completed);
      if (missing.length) throw new Error('Draft is still missing: '+missing.join(', '));
      const incompleteRecipes = operations.filter(op => op.resource === 'crafting_recipes' &&
        canonical(recipeIngredients(source, op.code)) !== canonical(recipeIngredients(completed, op.code)));
      if (incompleteRecipes.length) throw new Error('Could not verify ingredients for: '+incompleteRecipes.map(op => op.code).join(', '));
      return version.id;
    }catch(error){if(id)throw new UnityImportError(id,error);throw error;}
  },
  enums:async()=> (await axiosClient.get<EnumsDto>('/meta/enums')).data,
  versions:async()=>{
    // BE intentionally excludes Archived from the unfiltered list.
    const groups=await Promise.all([undefined,'Archived'].map(status=>allPages<ContentVersionDto>(async page=>(await axiosClient.get<Page<ContentVersionDto>>(root,{params:{page,pageSize:100,status}})).data)));
    return [...new Map(groups.flat().map(v=>[v.id,v])).values()];
  },
  details:async(id:string)=> (await axiosClient.get<ContentVersionDetailsDto>(root+'/'+id)).data,
  async version(id:string){return (await this.details(id)).version;},
  history:async()=>allPages<ContentPublicationDto>(async page=>(await axiosClient.get<Page<ContentPublicationDto>>('/content-publications',{params:{page,pageSize:100}})).data),
  compare:async(a:string,b:string)=> (await axiosClient.get<ContentComparisonDto>(root+'/'+a+'/compare',{params:{targetId:b}})).data,
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
      }else if(command.type==='publishDraft')await axiosClient.post(root+'/'+command.id+'/publish',{revision:Number(current.revision),...(command.reason?{reason:command.reason}:{})});
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
export { payload };

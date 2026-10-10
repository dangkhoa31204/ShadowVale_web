import { storageService } from '../../services/storage/storageService';
import type { ChangeReport } from './types';
function key(versionId:string) {
  const user=storageService.getUser();
  if(!user) throw new Error('Sign in to store a local report.');
  return 'shadowvale_local_report:'+user.id+':'+versionId;
}
export const localReports={
  load(versionId:string):ChangeReport|undefined { const raw=localStorage.getItem(key(versionId)); return raw?JSON.parse(raw) as ChangeReport:undefined; },
  save(versionId:string,report:ChangeReport) { localStorage.setItem(key(versionId),JSON.stringify(report)); },
};

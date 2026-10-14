import { axiosClient } from '../../services/api/axiosClient';
import type { FunnelDto, WeaponUsageDto, PlaystyleDto, HeatmapDto, AiComparisonRowDto, SolverConfigurationDto, CreateSolverConfigurationRequest, UpdateSolverConfigurationRequest } from '../../services/api/contracts';
export interface AnalyticsFilters { source:'human'|'replay';from:string;to:string;contentVersionId?:string;mapCode?:string;solverConfigurationId?:string;family?:string }
export const analyticsApi={
  gameplay:async(q:AnalyticsFilters,signal?:AbortSignal)=>{const [funnel,weapons,playstyle]=await Promise.all([
    axiosClient.get<FunnelDto>('/analytics/funnel',{params:q,signal}),
    axiosClient.get<WeaponUsageDto>('/analytics/weapons',{params:q,signal}),
    axiosClient.get<PlaystyleDto>('/analytics/playstyle',{params:q,signal}),
  ]);return {funnel:funnel.data,weapons:weapons.data,playstyle:playstyle.data};},
  heatmap:async(q:AnalyticsFilters,cellSize:number,eventTypes:string[],signal?:AbortSignal)=>(await axiosClient.get<HeatmapDto>('/analytics/heatmap',{params:{...q,cellSize,eventTypes},paramsSerializer:{indexes:null},signal})).data,
  comparison:async(q:AnalyticsFilters,groupBy:string,signal?:AbortSignal)=>(await axiosClient.get<AiComparisonRowDto[]>('/analytics/ai/comparison',{params:{...q,groupBy},signal})).data,
  solvers:async(signal?:AbortSignal)=>(await axiosClient.get<SolverConfigurationDto[]>('/solver-configurations',{signal})).data,
  solver:async(id:string)=>(await axiosClient.get<SolverConfigurationDto>('/solver-configurations/'+id)).data,
  create:async(data:CreateSolverConfigurationRequest)=>(await axiosClient.post<SolverConfigurationDto>('/solver-configurations',data)).data,
  update:async(id:string,data:UpdateSolverConfigurationRequest)=>(await axiosClient.put<SolverConfigurationDto>('/solver-configurations/'+id,data)).data,
  clone:async(id:string,code:string,name:string)=>(await axiosClient.post<SolverConfigurationDto>('/solver-configurations/'+id+'/clone',{code,name})).data,
  active:async(id:string,isActive:boolean)=>(await axiosClient.patch<SolverConfigurationDto>('/solver-configurations/'+id+'/active',{isActive})).data,
  remove:async(id:string)=>{await axiosClient.delete('/solver-configurations/'+id);},
};

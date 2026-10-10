export interface ParamSpec { min:number;max:number;step:number;options?:string[] }
const int=(min:number,max:number):ParamSpec=>({min,max,step:1});
const real=(min:number,max:number):ParamSpec=>({min,max,step:0.000001});
const fraction=real(0.01,1);
export const solverSpecs:Record<string,Record<string,ParamSpec>>={
 Greedy:{},QpuDwave:{},
 Genetic:{population:int(4,10000),generations:int(1,100000),mutation:real(0,1),elite:int(1,10000),tournament:int(2,1000),time_fraction:fraction},
 ClassicalSa:{num_sweeps:int(1,1000000),num_reads:int(1,10000),batch:int(1,10000),beta_hot:real(0.000001,1000000),beta_cold:real(0.000001,1000000),time_fraction:fraction},
 Sqa:{trotter:int(2,1024),sweeps:int(1,1000000),temperature:real(0.000001,1000),gamma_start:real(0,1000),gamma_end:real(0,1000),time_fraction:fraction,normalise:{min:0,max:0,step:1,options:['lambda','max']}},
 Qiea:{population:int(2,10000),generations:int(1,1000000),delta:real(0.000001,Math.PI/2),margin:real(0,Math.PI/4-0.000001),time_fraction:fraction},
 Qaoa:{layers:int(1,20),shots:int(1,1000000),grid:int(2,1000),max_qubits:int(1,30),refine_iterations:int(0,100000),time_fraction:fraction},
};
export const defaultWeights:Record<string,number>={weight_coverage:1,weight_redundancy:0.5,weight_flanking:1,weight_cover:0.5,weight_distance:0.1,penalty_conflict:0};

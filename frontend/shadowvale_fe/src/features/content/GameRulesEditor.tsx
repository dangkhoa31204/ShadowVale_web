import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { ContentBundle, JsonValue } from './types';

type Offer={gun:string;ammo:string;rounds:number};
type Rules={trade_offers?:Offer[];tier_odds?:number[];adaptive?:Record<string,number>;logistics?:{materialTrade?:{id:string;points:number}[];[key:string]:unknown};[key:string]:unknown};
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function GameRulesEditor({layout,bundle,editable,onChange}:{layout:JsonValue|undefined;bundle:ContentBundle;editable:boolean;onChange:(value:JsonValue)=>void}) {
  const current=object(layout),rules=object(current.game_rules) as Rules;
  const invalid=current.game_rules!==undefined&&(typeof current.game_rules!=='object'||current.game_rules===null||Array.isArray(current.game_rules))
    ||rules.trade_offers!==undefined&&(!Array.isArray(rules.trade_offers)||rules.trade_offers.some(o=>!o||typeof o.gun!=='string'||typeof o.ammo!=='string'||typeof o.rounds!=='number'))
    ||rules.tier_odds!==undefined&&(!Array.isArray(rules.tier_odds)||rules.tier_odds.some(n=>typeof n!=='number'))
    ||rules.logistics?.materialTrade!==undefined&&(!Array.isArray(rules.logistics.materialTrade)||rules.logistics.materialTrade.some(e=>!e||typeof e.id!=='string'||typeof e.points!=='number'));
  const change=(next:Rules)=>onChange({...current,game_rules:next} as JsonValue);
  const weapons=bundle.items.filter(i=>i.item_type==='weapon'),ammo=bundle.items.filter(i=>i.item_type==='ammo');
  const offers=rules.trade_offers??[];
  const update=(index:number,patch:Partial<Offer>)=>change({...rules,trade_offers:offers.map((o,i)=>i===index?{...o,...patch}:o)});
  if(invalid)return <p role="alert" className="text-sm text-destructive">Game rules have an invalid structure. Correct layout.game_rules in Advanced JSON before using the form.</p>;
  return <section className="space-y-4 border-t pt-5 text-sm"><h3 className="font-semibold">Trade and game rules</h3><p className="text-muted-foreground">Saved in this map's database configuration. Prices use each item's Base value. Changes reach supported Unity builds after this draft is validated, approved and published.</p>
    <div className="space-y-3">{offers.map((o,index)=><div key={index} className="grid gap-3 md:grid-cols-4">
      <label>Weapon<NativeSelect className="w-full" value={o.gun} disabled={!editable} onChange={e=>update(index,{gun:e.target.value})}><NativeSelectOption value="">Choose weapon</NativeSelectOption>{weapons.map(i=><NativeSelectOption key={String(i.code)} value={String(i.code)}>{String(i.name)} ({String(i.code)})</NativeSelectOption>)}</NativeSelect></label>
      <label>Bundled ammo<NativeSelect className="w-full" value={o.ammo} disabled={!editable} onChange={e=>update(index,{ammo:e.target.value})}><NativeSelectOption value="">Choose ammo</NativeSelectOption>{ammo.map(i=><NativeSelectOption key={String(i.code)} value={String(i.code)}>{String(i.name)} ({String(i.code)})</NativeSelectOption>)}</NativeSelect></label>
      <label>Rounds<Input type="number" min={1} max={9999} step={1} value={o.rounds} disabled={!editable} onChange={e=>update(index,{rounds:Number(e.target.value)})}/></label>
      <Button className="self-end" variant="outline" disabled={!editable} onClick={()=>change({...rules,trade_offers:offers.filter((_,i)=>i!==index)})}>Remove offer</Button>
    </div>)}</div>
    {editable&&<Button variant="outline" disabled={!weapons.length||!ammo.length} onClick={()=>change({...rules,trade_offers:[...offers,{gun:String(weapons[0]?.code??''),ammo:String(ammo[0]?.code??''),rounds:1}]})}>Add trade offer</Button>}
    {rules.tier_odds&&<div className="grid gap-3 sm:grid-cols-4">{rules.tier_odds.map((n,index)=><label key={index}>Tier {index+1} weight<Input type="number" min={0} value={n} disabled={!editable} onChange={e=>change({...rules,tier_odds:rules.tier_odds!.map((v,i)=>i===index?Number(e.target.value):v)})}/></label>)}</div>}
    {rules.adaptive&&<div className="grid gap-3 sm:grid-cols-3">{Object.entries(rules.adaptive).map(([key,n])=><label key={key}>{key}<Input type="number" min={key==='medkitPity'?1:0} max={key==='lowHealth'?1:undefined} step={key==='lowHealth'?0.01:key.endsWith('Boost')?0.1:1} value={n} disabled={!editable} onChange={e=>change({...rules,adaptive:{...rules.adaptive,[key]:Number(e.target.value)}})}/></label>)}</div>}
    {rules.logistics?.materialTrade&&<><h4 className="font-medium">Material turn-in</h4>{rules.logistics.materialTrade.map((entry,index)=><div key={index} className="grid gap-3 sm:grid-cols-3"><label>Item<NativeSelect className="w-full" value={entry.id} disabled={!editable} onChange={e=>change({...rules,logistics:{...rules.logistics,materialTrade:rules.logistics!.materialTrade!.map((v,i)=>i===index?{...v,id:e.target.value}:v)}})}>{bundle.items.map(i=><NativeSelectOption key={String(i.code)} value={String(i.code)}>{String(i.name)}</NativeSelectOption>)}</NativeSelect></label><label>Points<Input type="number" min={0} step={1} value={entry.points} disabled={!editable} onChange={e=>change({...rules,logistics:{...rules.logistics,materialTrade:rules.logistics!.materialTrade!.map((v,i)=>i===index?{...v,points:Number(e.target.value)}:v)}})}/></label><Button className="self-end" disabled={!editable} variant="outline" onClick={()=>change({...rules,logistics:{...rules.logistics,materialTrade:rules.logistics!.materialTrade!.filter((_,i)=>i!==index)}})}>Remove material</Button></div>)}{editable&&<Button variant="outline" onClick={()=>change({...rules,logistics:{...rules.logistics,materialTrade:[...rules.logistics!.materialTrade!,{id:String(bundle.items[0]?.code??''),points:1}]}})}>Add material turn-in</Button>}</>}
    <p className="text-muted-foreground">Repair, field crafting and other supported rules are available in Advanced JSON → layout.game_rules. Validation checks types, ranges and item/recipe references before publication.</p>
  </section>;
}

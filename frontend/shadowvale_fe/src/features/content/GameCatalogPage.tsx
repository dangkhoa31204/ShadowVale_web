import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Empty, Icon, PageHeading, Panel, panelTable } from '../shared/ui';
import { errorMessage } from '../../services/api/errors';
import { gameCatalogApi } from './gameCatalogApi';
import { useAuth } from '../../hooks/useAuth';
import { can } from '../auth/access';
import { contentApi } from './contentApi';
import { useWorkspace } from './workspaceContext';
import { contentNavigation, ruleTabs, type RuleSection } from './designerPresentation';
import { BundleSnapshot } from './BundleDetails';
import { jsonObject } from './mapDifficulty';
import type { CollectionKey } from './types';

type Section = CollectionKey | RuleSection;
const number = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 3 });
const percent = (n: number) => `${(n * 100).toFixed(2)}%`;
function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return rows.length ? <div className="overflow-x-auto"><Table className={panelTable}><TableHeader><TableRow>{headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((r, i) => <TableRow key={i}>{r.map((v, j) => <TableCell key={j} className="align-top whitespace-normal">{v}</TableCell>)}</TableRow>)}</TableBody></Table></div> : <Empty title="No matching content" />;
}

export function GameCatalogPage({ embedded = false }: { embedded?: boolean }) {
  const {user}=useAuth(),{reload}=useWorkspace(),navigate=useNavigate();
  const [section, setSection] = useState<Section>('weapons');
  const [search, setSearch] = useState('');
  const group = contentNavigation.find(group => group.records.some(record => record.key === section) || group.rules?.section === section)!;
  function chooseSection(value: string) {
    setSection(value as Section);
    setSearch('');
  }
  const catalog = useQuery({ queryKey: ['game-catalog'], queryFn: ({ signal }) => gameCatalogApi.get(signal), staleTime: 60_000 });
  const comparison = useQuery({ queryKey: ['game-catalog-comparison'], queryFn: ({ signal }) => gameCatalogApi.compare(signal), staleTime: 30_000 });
  const data = catalog.data;
  const canImport=!!user&&can(user.role,'author');
  const unfinished=useQuery({
    queryKey:['unfinished-unity-imports',data?.sourceHash,user?.id],
    enabled:canImport&&!!data?.authoringBundle,
    queryFn:()=>contentApi.unfinishedUnityImports(data!.authoringBundle!,data!.sourceHash,user!.id),
  });
  const importDraft=useMutation({mutationFn:async(draftId?:string)=>{
    if(!data?.authoringBundle)throw new Error('The API does not have an importable Unity bundle yet. Deploy the updated API.');
    return contentApi.importUnity(data.authoringBundle,data.sourceHash,draftId);
  },onSuccess:async id=>{await reload();navigate('/admin/content/'+id);},
  onError:()=>{void unfinished.refetch();}});
  const match = (...values: unknown[]) => values.some(v => String(v ?? '').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const sourceBundle = data?.authoringBundle;
  const repair = jsonObject(jsonObject(jsonObject(sourceBundle?.maps.find(map => map.code === 'map01')?.layout).game_rules).repair);
  const referenceSection = group.records.find(record => record.key === section && ['skills', 'consumables', 'enemy_types', 'enemy_placements'].includes(record.key));
  const name = (code: string) => data?.items.find(i => i.code === code)?.name ?? code;
  const item = (code: string) => <span>{name(code)}<code className="block text-xs text-muted-foreground">{code}</code></span>;
  const refresh = <Button variant="outline" disabled={catalog.isFetching || comparison.isFetching} onClick={() => { void catalog.refetch(); void comparison.refetch(); }}>Refresh</Button>;
  return <div className="sv-page">
    {!embedded && <PageHeading title="Unity Catalog" description="Compare Unity source data or import it into a draft for editing." action={refresh} />}
    {embedded && <div className="flex justify-end">{refresh}</div>}
    {catalog.error ? <Alert variant="destructive"><AlertDescription>{errorMessage(catalog.error)}</AlertDescription></Alert> : !data ? <p role="status">Loading Unity Catalog…</p> : <>
      {canImport&&<Panel title="Import from Unity" description="Import into a draft to edit. Publishing requires Admin review.">
        <div className="flex flex-wrap gap-3 p-6">
          {data.authoringBundle && <p className="basis-full text-sm text-muted-foreground">
            Import includes {data.authoringBundle.maps.map(map => map.name).join(', ')} · {data.authoringBundle.crafting_recipes.length} recipes · {data.authoringBundle.crafting_recipe_ingredients.length} ingredient rows.
          </p>}
          {data.authoringBundle&&unfinished.isPending&&<p role="status">Checking for unfinished imports…</p>}
          {unfinished.error&&<Button variant="outline" onClick={()=>void unfinished.refetch()}>Retry loading drafts</Button>}
          {unfinished.data?.map(draft=><Button key={draft.id} disabled={importDraft.isPending} onClick={()=>importDraft.mutate(draft.id)}>
            Complete import into Draft #{draft.versionNo}
          </Button>)}
          {!!unfinished.data?.length && <p className="basis-full text-sm text-muted-foreground">Adds missing records from the current Unity snapshot and keeps existing draft edits.</p>}
          {!unfinished.data?.length&&<Button disabled={importDraft.isPending||!data.authoringBundle||unfinished.isPending||!!unfinished.error} onClick={()=>importDraft.mutate(undefined)}>
            Import Unity as new draft
          </Button>}
          {importDraft.isPending&&<p role="status">Importing Unity content…</p>}
        </div>
        {(importDraft.error||unfinished.error)&&<p role="alert" className="px-6 pb-6 text-sm text-destructive">{errorMessage(importDraft.error||unfinished.error)}</p>}
        {!!data.importNotes?.length&&<details className="px-6 pb-6 text-sm"><summary className="cursor-pointer">Import coverage and defaults to review</summary><ul className="list-disc pl-5 pt-3 space-y-2">{data.importNotes.map(n=><li key={n}>{n}</li>)}</ul></details>}
      </Panel>}
      <Panel title="Source snapshot" description="Read-only Unity content. Authoring versions and player telemetry are tracked separately.">
        <div className="grid gap-3 p-6 text-sm">
          <p>{data.items.length} items · {data.weapons.filter(w => w.playable).length} playable weapons · {data.recipes.length} recipes · {data.maps.length} maps · {data.quests.reduce((n, q) => n + q.objectives.length, 0)} mission objectives</p>
          <p>Exported {new Date(data.generatedAt).toLocaleString()} · Unity commit <code>{data.unityCommit?.slice(0, 12) ?? 'unavailable'}</code></p>
          <details><summary className="cursor-pointer">Provenance and coverage</summary><p className="mt-3 break-all">Source SHA-256: {data.sourceHash}</p><ul className="list-disc space-y-2 pl-5 py-3">{data.limitations.map(n => <li key={n}>{n}</li>)}</ul><ul className="space-y-1">{data.sources.map(s => <li key={s.path}><code className="break-all">{s.path}</code></li>)}</ul></details>
        </div>
      </Panel>
      <Panel title="Published comparison" description="A difference can be an intentional balance change. This comparison never changes the database.">
        <div className="p-6 text-sm" role="status">{comparison.error ? errorMessage(comparison.error) : !comparison.data ? 'Loading published comparison…' : comparison.data.status === 'nothing_published' ? 'No published version yet.' : comparison.data.status === 'bundle_unavailable' ? 'Published bundle is unavailable. Refresh to try again.' : <>
          <p>#{comparison.data.versionNo} · {comparison.data.label} · {comparison.data.differences.length} differences in covered fields</p>
          <p className="mt-2 text-muted-foreground">{comparison.data.scope}</p>
          {!!comparison.data.differences.length && <details className="mt-3"><summary className="cursor-pointer">Review differences</summary><DataTable headers={['Collection / key', 'Status / field', 'Unity default', 'Published']} rows={comparison.data.differences.map(d => [<span className="break-all">{d.collection}<code className="block">{d.key}</code></span>, `${d.kind}${d.field ? ' · ' + d.field : ''}`, <code className="break-all">{JSON.stringify(d.unity)}</code>, <code className="break-all">{JSON.stringify(d.published)}</code>])} /></details>}
        </>}</div>
      </Panel>
      <div className="rounded-lg border">
        <Tabs value={group.key} onValueChange={chooseSection} className="overflow-x-auto px-3">
          <TabsList variant="line" aria-label="Unity content groups" className="h-12">{contentNavigation.map(entry =>
            <TabsTrigger key={entry.key} value={entry.key} className="flex-none px-2.5" onClick={() => { if (group.key === entry.key && section !== entry.key) chooseSection(entry.key); }}><Icon name={entry.icon} />{entry.label}</TabsTrigger>
          )}</TabsList>
        </Tabs>
        {(group.records.length > 1 || group.rules) && <Tabs value={section} onValueChange={chooseSection} className="overflow-x-auto border-t bg-muted/20 px-3">
          <TabsList variant="line" aria-label="Unity content table" className="h-10">{group.records.map(({ key, label, icon }) =>
            <TabsTrigger key={key} value={key} className="flex-none px-2.5"><Icon name={icon} />{label}</TabsTrigger>
          )}{group.rules && <TabsTrigger value={group.rules.section} className="flex-none px-2.5">{group.rules.label}</TabsTrigger>}</TabsList>
        </Tabs>}
      </div>
      <Input aria-label="Search Unity content" placeholder="Search name, code, map or table…" value={search} onChange={e => setSearch(e.target.value)} />
      {referenceSection && (sourceBundle ? <BundleSnapshot bundle={{ ...sourceBundle, [referenceSection.key]: (sourceBundle[referenceSection.key] ?? []).filter(row => match(...Object.values(row))) }} section={referenceSection.key} />
        : <Empty title="Unavailable in this Unity snapshot" />)}
      {section === 'weapons' && <Panel title="Implemented weapons" description="Weapons supported by the current game. Knife values come from the Unity prefab. The attack interval applies to normal swings."><DataTable headers={['Weapon', 'Runtime', 'Ammo', 'Damage / range', 'Rate / magazine', 'Reload', 'Durability / shot']} rows={data.weapons.filter(w => w.playable && match(w.id, w.name)).map(w => [item(w.id), <Badge variant="secondary">{w.class === 'melee' ? 'Melee' : 'Playable'}</Badge>, w.ammo_type ? item(w.ammo_type) : '—', `${number(w.damage)} / ${number(w.range)} m`, w.class === "melee" ? `${number(w.cooldown_seconds)} s / swing` : `${number(w.fire_rate)} shots/s / ${number(w.magazine_size)}`, `${number(w.reload_seconds)} s`, `${number(w.durability_max)} / ${number(w.durability_per_shot)}`])} /></Panel>}
      {section === 'items' && <Panel title="Items"><DataTable headers={['Item', 'Type', 'Stack', 'Weight (kg)', 'Base value', 'Runtime inventory']} rows={data.items.filter(i => match(i.code, i.name, i.type)).sort((a, b) => Number(b.type === 'ammo') - Number(a.type === 'ammo')).map(i => [item(i.code), i.type, number(i.maxStack), number(i.weight), number(i.baseValue), i.inRuntimeInventory ? 'Listed' : 'Catalog only'])} /></Panel>}
      {section === 'loot' && <>
        <Alert><AlertDescription>Baseline per random roll: tier odds {data.tierOdds.join(' / ')}. Missing tiers fall to the nearest lower available tier, then the lowest higher tier. Tier 5 entries are guaranteed once per container. Multiple rolls can repeat items.</AlertDescription></Alert>
        <Panel title="Adaptive rules"><div className="p-6 text-sm">Ammo below {data.adaptive.lowAmmo}: ×{data.adaptive.ammoBoost} ammo weight. Health below {percent(data.adaptive.lowHealth)}: ×{data.adaptive.medkitBoost} medkit weight. After {data.adaptive.medkitPity} dry guard packs, a medkit is added when the bag has fewer than 2. Guard rifle ammo is replaced with ammo for the guard's held rifle. Displayed probabilities precede these changes.</div></Panel>
      </>}
      {section === 'loot_tables' && data.lootTables.filter(t => match(t.code, t.name, ...t.entries.map(e => name(e.item)), ...t.entries.map(e => e.item))).map(t => <Panel key={t.code} title={t.name} description={`${t.code} · ${t.rollsMin}–${t.rollsMax} random rolls + guaranteed entries`}><DataTable headers={['Item', 'Tier', 'Weight', 'Quantity', 'Baseline / random roll']} rows={t.entries.map(e => [item(e.item), e.tier, e.weight, `${e.min}–${e.max}`, e.guaranteed ? 'Guaranteed / container' : percent(e.baselineChance ?? 0)])} /></Panel>)}
      {section === 'map_loot_tables' && <Panel title="Map loot"><DataTable headers={['Map', 'Container tag', 'Loot table']} rows={data.maps.flatMap(map => map.containers.filter(container => match(map.name, map.code, container.tag, container.lootTable)).map(container => [map.name, container.tag, container.lootTable]))} /></Panel>}
      {section === 'crafting_recipes' && <Panel title="Crafting recipes" description="Bench and field can both be available. Required skill metadata is not enforced by the current crafting runtime."><DataTable headers={['Recipe', 'Ingredients', 'Output', 'Workbench', 'Field', 'Skill metadata']} rows={data.recipes.filter(r => match(r.id, name(r.output_item_id), ...r.inputs.map(i => name(i.item_id)))).map(r => [<code>{r.id}</code>, <div className="space-y-2">{r.inputs.map(i => <div key={i.item_id}>{i.count} × {item(i.item_id)}</div>)}</div>, <span>{r.output_count} × {item(r.output_item_id)}</span>, r.benchAvailable ? `${r.craft_seconds} s` : 'Not listed', r.fieldAvailable ? `${r.field_seconds} s · max batch ${r.field_max_batch ?? 1}` : 'Unavailable', r.required_skill ? `${r.required_skill} ${r.required_skill_level} (not enforced)` : '—'])} /></Panel>}
      {section === 'crafting' && <Panel title={ruleTabs.crafting_recipes.label}>
        <DataTable headers={['Recipe', 'Field time', 'Max batch']} rows={data.recipes.filter(recipe => recipe.fieldAvailable && match(recipe.id, name(recipe.output_item_id))).map(recipe => [name(recipe.output_item_id), `${recipe.field_seconds} s`, recipe.field_max_batch ?? 1])} />
        {!!Object.keys(repair).length && <dl className="grid gap-3 border-t p-6 text-sm sm:grid-cols-3">
          {([['fieldSeconds', 'Field repair time', ' s'], ['fieldFraction', 'Field repair fraction', ''], ['salvageSeconds', 'Salvage time', ' s']] as const).map(([key, label, unit]) =>
            <div key={key}><dt className="text-muted-foreground">{label}</dt><dd>{typeof repair[key] === 'number' ? number(repair[key]) + unit : '—'}</dd></div>)}
        </dl>}
      </Panel>}
      {section === 'trade' && <>
        <Alert><AlertDescription>Edit offers in Drafts → Items → Trade and prices under Items → Base value. Player balances and transaction history remain local saves.</AlertDescription></Alert>
        <Panel title="Quartermaster stock"><DataTable headers={['Map', 'Weapon (100% condition)', 'Bundled ammo', 'Logistics points']} rows={data.trade.offers.filter(o => match(o.mapCode, o.gun, name(o.gun), o.ammo)).map(o => [o.mapCode, item(o.gun), <span>{o.rounds} × {item(o.ammo)}</span>, o.price])} /></Panel>
        <Panel title="Material turn-in"><DataTable headers={['Material (1 unit)', 'Points']} rows={data.trade.materials.filter(m => match(m.id, name(m.id))).map(m => [item(m.id), m.points])} /></Panel>
        <Panel title="Weapon turn-in"><div className="p-6 text-sm">Weapon credit = round(base value × lerp({data.trade.logistics.turnInFloor}, {data.trade.logistics.turnInCeiling}, condition fraction)). Only unequipped guns can be turned in.</div></Panel>
      </>}
      {section === 'maps' && data.maps.filter(m => match(m.code, m.name, m.scene)).map(m => <Panel key={m.code} title={`${m.name} · ${m.code}`} description={`Scene: ${m.scene} · ${m.nodeCount} graph nodes · ${m.objectiveCount} exported objectives`}>
        <div className="p-6 text-sm"><p>Graph bounds X {number(m.bounds.minX)}–{number(m.bounds.maxX)} m · Z {number(m.bounds.minZ)}–{number(m.bounds.maxZ)} m</p><p className="mt-2">{m.escapeRoutes.length} escape routes · {m.spawnGroups.length} spawn groups in graph export</p><p className="mt-2 text-muted-foreground">{m.note}</p>{m.code === 'map00_tutorial' && <p className="mt-2">Tutorial mission steps are not covered by this export.</p>}</div>
        {!!m.fieldCaches.length && <DataTable headers={['Field cache', 'X / Z', 'Minimum stage index']} rows={m.fieldCaches.map(c => [c.label, `${c.x} / ${c.z}`, c.minStage])} />}
      </Panel>)}
      {section === 'quests' && data.quests.filter(q => match(q.code, q.title, q.mapCode, ...q.objectives.map(o => o.title), ...q.objectives.map(o => o.id))).map(q => <Panel key={q.code} title={q.title} description={`${q.mapCode} · stable telemetry index is preserved; displayed in gameplay order`}><DataTable headers={['Index / ID', 'Objective', 'Requirements', 'Details', 'Credit']} rows={[...q.objectives].sort((a, b) => a.playOrder - b.playOrder).map(o => [<span>{o.index}<code className="block">{o.id}</code></span>, <span>{o.title}{o.purpose && <span className="block mt-2 text-muted-foreground">{o.purpose}</span>}</span>, o.requires.join(', ') || (q.mapCode === 'map01' ? 'C# stage flow' : 'None'), [o.phase != null ? `phase ${o.phase}` : '', o.kind, o.site, `count ${o.count}`].filter(Boolean).join(' · '), o.credit ?? '—'])} /></Panel>)}
      {section === 'missions' && <Panel title={ruleTabs.quests.label}>
        <p className="p-6 text-sm">Map 1 operation credits · {data.trade.logistics.operationCredit.join(', ')}</p>
        <DataTable headers={['Map 2 objective', 'Points']} rows={(data.trade.logistics.mapTwoRewards ?? []).map(row => ({
          ...row, title: data.quests.find(quest => quest.mapCode === 'map02')?.objectives.find(objective => objective.id === row.id)?.title,
        })).filter(row => match(row.id, row.title)).map(row => [<span>{row.title || row.id}{row.title && <code className="block text-xs text-muted-foreground">{row.id}</code>}</span>, row.points])} />
      </Panel>}
      <details className="rounded-lg border px-5 py-3">
        <summary className="cursor-pointer text-sm font-medium">Database audit</summary>
        <div className="mt-3 grid gap-3">
        <Alert><AlertDescription>Source audit only. No table has been proven safe to drop. Empty tables can still support versioning and foreign keys. Run the read-only SQL audit against the target database before planning cleanup.</AlertDescription></Alert>
        <Panel title="Database retention decisions"><DataTable headers={['Table', 'Decision', 'Reason', 'Evidence']} rows={data.databaseAudit.filter(t => match(t.table, t.decision, t.reason)).map(t => [<code>{t.table}</code>, t.decision, t.reason, <code className="break-all text-xs">{t.evidence}</code>])} /></Panel>
        </div>
      </details>
      {!embedded && <p className="text-sm"><Link className="underline" to="/admin/analytics">View gameplay analytics</Link></p>}
    </>}
  </div>;
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { NumericControl } from '../shared/NumericControl';
import type { GameCatalog } from './gameCatalogApi';
import { jsonObject } from './mapDifficulty';
import { detailLabel, lootChances, type RelatedSection } from './recordDetails';
import { schemaFields, recordIdentity } from './schemaFields';
import type { ContentBundle, ContentRecord, JsonValue } from './types';

export function RelatedRows({ section, code, bundle, savedBundle, catalog, editable, forRuntimeLoot, outputItem, rollsMax, onChange, onError }: {
  section: RelatedSection; code: JsonValue; bundle: ContentBundle; savedBundle: ContentBundle; catalog?: GameCatalog; editable: boolean;
  forRuntimeLoot?: boolean; outputItem?: JsonValue; rollsMax?: JsonValue;
  onChange: (rows: ContentRecord[]) => void; onError: (key: string, message: string) => void;
}) {
  const rows = bundle[section.collection].filter(row => row[section.parentKey] === code);
  const loot = section.collection === 'loot_table_entries';
  const odds = loot ? lootChances(rows, bundle.maps.find(row => row.code === 'map01')?.layout, catalog?.tierOdds) : [];
  const fields = schemaFields[section.collection].filter(field => (section.fields as readonly string[]).includes(field.key));
  const knownLoot = forRuntimeLoot && catalog ? new Set(catalog.items.filter(item => item.loot).map(item => item.code)) : null;
  const itemOptions = (row?: ContentRecord, tier = row?.tier ?? 1) => bundle.items.filter(item =>
    item.code !== outputItem && (!knownLoot || knownLoot.has(String(item.code))) &&
    !rows.some(entry => entry !== row && entry.item_code === item.code && (!loot || entry.tier === tier)));
  const nextTier = (loot ? [1, 2, 3, 4, 5] : [1]).find(tier => itemOptions(undefined, tier).length > 0);
  const nextItem = nextTier === undefined ? undefined : itemOptions(undefined, nextTier)[0];
  const add = () => {
    if (!nextItem) return;
    const defaults = Object.fromEntries(fields.map(field => [field.key, field.defaultValue ?? 1]));
    onChange([...rows, { ...defaults, [section.parentKey]: code, item_code: nextItem.code, ...(loot ? { tier: nextTier ?? 1 } : {}) }]);
  };
  return <section className="my-5 space-y-3" aria-label={section.title}>
    <h3 className="font-semibold">{section.title} <span className="text-sm text-muted-foreground">({rows.length})</span></h3>
    {!rows.length && <p className="text-sm text-muted-foreground">Chưa có vật phẩm.</p>}
    {rows.map((row, index) => {
      const identity = recordIdentity(section.collection, row);
      const saved = savedBundle[section.collection].find(entry => recordIdentity(section.collection, entry) === identity);
      const update = (key: string, value: JsonValue) => onChange(rows.map((entry, i) => i === index ? { ...entry, [key]: value } : entry));
      const options = itemOptions(row);
      const clearErrors = () => fields.forEach(field => onError(identity + field.key, ''));
      return <div className="space-y-3 rounded-lg border bg-muted/10 p-4" key={identity}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 text-sm">Vật phẩm
            <NativeSelect className="mt-1 w-full" value={String(row.item_code)} disabled={!editable} onChange={event => { clearErrors(); update('item_code', event.target.value); }}>
              {!options.some(item => item.code === row.item_code) && <NativeSelectOption value={String(row.item_code)}>{String(row.item_code)}</NativeSelectOption>}
              {options.map(item => <NativeSelectOption key={String(item.code)} value={String(item.code)}>{String(item.name ?? item.code)}</NativeSelectOption>)}
            </NativeSelect>
          </label>
          {loot && <div className="self-center text-sm font-medium">{row.tier === 5 ? 'Đảm bảo mỗi lần nhận loot' : rollsMax === 0 ? 'Bảng có 0 lượt quay' : odds[index] == null ? 'Chưa có tỉ lệ cơ sở' : `${new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 2 }).format(odds[index])} / lượt quay`}</div>}
          {editable && <Button variant="outline" size="sm" disabled={section.collection === 'crafting_recipe_ingredients' && rows.length === 1} onClick={() => { clearErrors(); onChange(rows.filter((_, i) => i !== index)); }}>Xóa dòng</Button>}
        </div>
        <div className={loot ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4' : 'max-w-xs'}>
          {fields.map(field => {
            if (field.key === 'tier') return <label key={field.key} className="text-sm">Bậc rơi<NativeSelect className="mt-1 w-full" value={String(row.tier)} disabled={!editable} onChange={event => { clearErrors(); update('tier', Number(event.target.value)); }}>
              {[1, 2, 3, 4, 5].filter(tier => tier === row.tier || !rows.some(entry => entry !== row && entry.item_code === row.item_code && entry.tier === tier)).map(tier => <NativeSelectOption key={tier} value={tier}>{tier === 5 ? '5 · Đảm bảo' : `Bậc ${tier}`}</NativeSelectOption>)}
            </NativeSelect></label>;
            const value = row[field.key], before = saved?.[field.key];
            return <NumericControl key={field.key} label={detailLabel(field)} value={typeof value === 'number' ? value : null} savedValue={editable ? typeof before === 'number' ? before : null : undefined}
              disabled={!editable || field.key === 'weight' && row.tier === 5} min={field.min} max={field.max} step={field.step} sliderMin={field.sliderMin} sliderMax={field.sliderMax}
              onChange={value => update(field.key, value)} onError={message => onError(identity + field.key, message)} />;
          })}
        </div>
      </div>;
    })}
    {editable && <Button variant="outline" size="sm" disabled={!nextItem} onClick={add}>Thêm vật phẩm</Button>}
  </section>;
}

export function QuestObjectives({ value, editable, onChange }: { value: JsonValue; editable: boolean; onChange: (value: JsonValue) => void }) {
  const entries = Array.isArray(value) ? value : [];
  const objectives = entries.map((entry, index) => ({ row: jsonObject(entry), entry, index })).sort((a, b) =>
    Number(a.row.playOrder ?? a.index) - Number(b.row.playOrder ?? b.index));
  return <section className="my-5 space-y-3" aria-label="Mục tiêu nhiệm vụ">
    <h3 className="font-semibold">Mục tiêu nhiệm vụ ({entries.length})</h3>
    {!entries.length && <p className="text-sm text-muted-foreground">Chưa có mục tiêu trong bản này.</p>}
    {objectives.map(({ row, entry, index }, position) => {
      const code = String(row.id ?? row.target_id ?? `#${index + 1}`);
      const period = /^([DN])(\d+)_/.exec(code);
      const chapter = period ? `${period[1] === 'D' ? 'Ngày' : 'Đêm'} ${period[2]}` : null;
      const required = Array.isArray(row.requires) ? row.requires.map(id => {
        const target = objectives.find(objective => objective.row.id === id);
        return typeof target?.row.title === 'string' ? `${target.row.title} (${id})` : String(id);
      }) : [];
      const patch = (key: string, next: string) => onChange(entries.map((current, i) => i === index ? { ...row, [key]: next } : current));
      return <details className="rounded-lg border p-4" key={`${code}:${index}`}>
        <summary className="cursor-pointer text-sm font-medium">{position + 1}. {String(row.title ?? (typeof entry === 'string' ? entry : code))} <span className="text-muted-foreground">· {code}</span></summary>
        <div className="mt-3 grid gap-3 text-sm">
          {entry && typeof entry === 'object' && !Array.isArray(entry) && <>
            <label>Tên mục tiêu<Input value={String(row.title ?? '')} disabled={!editable} onChange={event => patch('title', event.target.value)} /></label>
            <label>Mô tả mục đích<Textarea rows={2} value={String(row.purpose ?? '')} disabled={!editable} onChange={event => patch('purpose', event.target.value)} /></label>
          </>}
          <p className="text-muted-foreground">{[chapter, row.site ? `Khu vực: ${row.site}` : null, typeof row.phase === 'number' && typeof row.count === 'number' ? `Số lần: ${row.count}` : null, Number(row.seconds) > 0 ? `${row.seconds} giây` : null].filter(Boolean).join(' · ')}</p>
          {!!required.length && <p className="text-muted-foreground">Cần hoàn thành trước: {required.join(', ')}</p>}
        </div>
      </details>;
    })}
  </section>;
}

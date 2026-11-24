import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { NumericComparison } from '../shared/NumericComparison';
import { parseNumericInput, type NumericRules } from '../shared/numericRules';
import { jsonObject } from './mapDifficulty';
import { itemStatKeys, itemStatsErrors, patchValue, skillColumns, skillTableErrors, updateSkillLevels, values } from './structuredContent';
import type { ContentRecord, JsonValue } from './types';

type ReportError = (key: string, message: string) => void;
const numeric = (value: JsonValue | undefined) => typeof value === 'number' ? value : null;

function NumberBox({ label, value, before, editable, unit, onChange, onError, ...rules }: NumericRules & {
  label: string; value: number | null; before?: number | null; editable: boolean; unit?: string;
  onChange: (value: number | null) => void; onError: (error: string) => void;
}) {
  const [edit, setEdit] = useState({ value, text: String(value ?? ''), error: '' });
  if (edit.value !== value) setEdit({ value, text: String(value ?? ''), error: '' });
  return <div className="min-w-0 space-y-1">
    <Input aria-label={label} aria-invalid={!!edit.error} inputMode={rules.step === 1 ? 'numeric' : 'decimal'} placeholder={rules.nullable ? 'Mặc định' : undefined}
      value={edit.text} disabled={!editable} onChange={event => {
        const text = event.target.value, result = parseNumericInput(text.replace(',', '.'), rules);
        const error = result.valid ? '' : result.error;
        setEdit({ value: result.valid ? result.value : value, text, error });
        onError(error);
        if (result.valid) onChange(result.value);
      }} />
    {edit.error && <p role="alert" className="text-xs text-destructive">{edit.error}</p>}
    {before !== undefined && before !== value && <NumericComparison before={before} after={value} unit={unit} beforeLabel="Đã lưu" afterLabel="Đang chỉnh" announce />}
  </div>;
}

function TechnicalValue({ value }: { value: JsonValue }) {
  if (value && typeof value === 'object') {
    return <dl className="space-y-1 border-l pl-3">{Object.entries(value).map(([key, entry]) => <div key={key}><dt className="text-muted-foreground">{Array.isArray(value) ? Number(key) + 1 : key}</dt><dd><TechnicalValue value={entry} /></dd></div>)}</dl>;
  }
  return <span className="wrap-anywhere">{value === null ? '—' : typeof value === 'boolean' ? value ? 'Có' : 'Không' : value}</span>;
}

function TechnicalFields({ fields }: { fields: ContentRecord }) {
  if (!Object.keys(fields).length) return null;
  return <details className="my-4 rounded-lg border p-3 text-sm">
    <summary className="cursor-pointer font-medium">Dữ liệu kỹ thuật · chỉ đọc</summary>
    <div className="mt-3"><TechnicalValue value={fields} /></div>
  </details>;
}

const itemNumbers = { found_min: 'Độ bền tối thiểu khi nhặt', found_max: 'Độ bền tối đa khi nhặt', salvage_good: 'Ngưỡng độ bền để nhận thêm vật liệu' };
const percent = (value: JsonValue | undefined) => typeof value === 'number' ? Number((value * 100).toPrecision(12)) : null;

function ItemSelect({ label, value, items, editable, onChange, empty }: {
  label: string; value: JsonValue; items: ContentRecord[]; editable: boolean; onChange: (value: string) => void; empty?: string;
}) {
  const selected = String(value ?? '');
  return <label className="grid gap-1 text-sm">{label}<NativeSelect className="w-full" disabled={!editable} value={selected} onChange={event => onChange(event.target.value)}>
    {empty && <NativeSelectOption value="">{empty}</NativeSelectOption>}
    {selected && !items.some(item => item.code === selected) && <NativeSelectOption value={selected}>{selected}</NativeSelectOption>}
    {items.map(item => <NativeSelectOption key={String(item.code)} value={String(item.code)}>{String(item.name || item.code)}</NativeSelectOption>)}
  </NativeSelect></label>;
}

export function ItemStatsEditor({ record, saved, items, editable, onChange, onError }: {
  record: ContentRecord; saved?: ContentRecord; items: ContentRecord[]; editable: boolean;
  onChange: (stats: ContentRecord) => void; onError: ReportError;
}) {
  const stats = jsonObject(record.stats), before = jsonObject(saved?.stats);
  const rows = values(stats.salvage);
  const eligible = (current?: JsonValue) => items.filter(item => item.code !== record.code && !rows.some(row => jsonObject(row).item === item.code && item.code !== current));
  const hidden = Object.fromEntries(Object.entries(stats).filter(([key]) => !itemStatKeys.includes(key) && key !== 'melee_cooldown_s'));
  const set = (key: string, value: JsonValue) => onChange(patchValue(stats, key, value));
  const support = (record.item_type === 'weapon' && record.code !== 'knife') || itemStatKeys.some(key => Object.hasOwn(stats, key));
  return <>
    {record.code === 'knife' && <p className="my-4 text-sm text-muted-foreground">Thời gian giữa hai đòn chỉnh trong Items → Weapons → Dao.</p>}
    {support && <section className="my-4 space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">Độ bền khi nhặt &amp; tháo dỡ</h3>
      <p className="text-sm text-muted-foreground">Để trống ô độ bền để dùng giá trị mặc định của Unity.</p>
      <div className="grid gap-3 sm:grid-cols-2">{Object.entries(itemNumbers).map(([key, label]) => <div key={key} className="space-y-1 text-sm">
        <div>{label} (%)</div><NumberBox label={label} value={percent(stats[key])} before={editable ? percent(before[key]) : undefined} unit="%" editable={editable}
          nullable min={0} max={100} step={.0001} onError={error => onError(label, error)} onChange={value => set(key, value === null ? null : value / 100)} />
      </div>)}
      <ItemSelect label="Vật liệu nhận thêm" items={items.filter(item => item.code !== record.code)} value={stats.salvage_good_item} editable={editable} empty="Theo mặc định Unity" onChange={value => set('salvage_good_item', value || null)} /></div>
      <section className="space-y-3"><h4 className="text-sm font-medium">Vật liệu thu được khi tháo dỡ</h4>
        {!rows.length && <p className="text-sm text-muted-foreground">Chưa có dòng vật liệu.</p>}
        {rows.map((entry, index) => {
          const row = jsonObject(entry), savedRow = jsonObject(values(before.salvage).find(candidate => jsonObject(candidate).item === row.item));
          const replace = (key: string, value: JsonValue) => set('salvage', rows.map((current, i) => i === index ? { ...row, [key]: value } : current));
          const clearErrors = (rowIndex: number) => ['min', 'max'].forEach(key => onError(`Tháo dỡ ${rowIndex + 1} · ${key}`, ''));
          return <div key={`${row.item}:${index}`} className="grid items-start gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
            <ItemSelect label="Vật liệu" items={eligible(row.item)} value={row.item} editable={editable} onChange={value => { clearErrors(index); replace('item', value); }} />
            {(['min', 'max'] as const).map(key => <div key={key} className="space-y-1 text-sm"><div>{key === 'min' ? 'SL tối thiểu' : 'SL tối đa'}</div>
              <NumberBox label={`Tháo dỡ ${index + 1} · ${key === 'min' ? 'SL tối thiểu' : 'SL tối đa'}`} value={numeric(row[key])} before={editable ? numeric(savedRow[key]) : undefined}
                editable={editable} min={0} max={100000} step={1} onError={error => onError(`Tháo dỡ ${index + 1} · ${key}`, error)} onChange={value => replace(key, value)} />
            </div>)}
            {editable && <Button variant="outline" size="sm" className="self-start sm:mt-6" onClick={() => { rows.slice(index).forEach((_, offset) => clearErrors(index + offset)); set('salvage', rows.filter((_, i) => i !== index)); }}>Xóa dòng</Button>}
          </div>;
        })}
        {editable && eligible().length > 0 && <Button variant="outline" size="sm" onClick={() => set('salvage', [...rows, { item: eligible()[0].code, min: 1, max: 1 }])}>Thêm vật liệu</Button>}
        {itemStatsErrors(stats).map(error => <p key={error} className="text-sm text-destructive">{error}</p>)}
      </section>
    </section>}
    <TechnicalFields fields={hidden} />
  </>;
}

export function SkillLevelsEditor({ record, saved, source, editable, onChange, onError }: {
  record: ContentRecord; saved?: ContentRecord; source?: ContentRecord; editable: boolean;
  onChange: (record: ContentRecord) => void; onError: ReportError;
}) {
  const effects = skillColumns(record.skill_type);
  const known = Object.keys(effects).length > 0;
  const xp = values(record.xp_curve), defaultXp = values(source?.xp_curve);
  const thresholds = xp.length ? xp : defaultXp;
  const columns = { xp_curve: 'Ngưỡng XP', ...effects };
  const existing = jsonObject(record.effects), savedEffects = jsonObject(saved?.effects), sourceEffects = jsonObject(source?.effects);
  const fallback = (key: string) => key === 'repair_bonus_fractions' ? 0 : key === 'field_repair_caps' ? .8 : 1;
  const table: Record<string, JsonValue[]> = { xp_curve: thresholds };
  for (const key of Object.keys(effects)) {
    const series = values(existing[key]), defaults = values(sourceEffects[key]);
    table[key] = thresholds.map((_, index) => series[index] ?? defaults[index] ?? fallback(key));
  }
  function resize(add: boolean) {
    const length = thresholds.length;
    if (!add) Object.keys(columns).forEach(key => onError(`skill:${key}:${length - 1}`, ''));
    const next = Object.fromEntries(Object.entries(table).map(([key, series]) => [key, add
      ? [...series, key === 'xp_curve' ? length ? Number(thresholds.at(-1)) + 1 : 0 : series.at(-1) ?? fallback(key)]
      : series.slice(0, -1)]));
    onChange(updateSkillLevels(record, next, known));
  }
  const hidden = Object.fromEntries(Object.entries(existing).filter(([key]) => !Object.hasOwn(effects, key)));
  const errors = thresholds.length ? skillTableErrors(updateSkillLevels(record, table)) : [];
  return <section className="my-4 space-y-3 rounded-lg border p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Kỹ năng theo cấp</h3>
      {editable && <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={known ? thresholds.length >= 5 : thresholds.length >= Number(record.max_level ?? 100)} onClick={() => resize(true)}>Thêm cấp</Button>
        <Button size="sm" variant="outline" disabled={!thresholds.length || known && thresholds.length <= 2} onClick={() => resize(false)}>Xóa cấp cuối</Button>
      </div>}
    </div>
    {known && <p className="text-sm text-muted-foreground">Cấp 0 bắt đầu ở 0 XP. Các cấp sau cần nhiều XP hơn cấp trước.</p>}
    {!thresholds.length ? <p className="text-sm text-muted-foreground">Chưa có cấp kỹ năng.</p> : <div className="overflow-x-auto">
      <table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th scope="col" className="p-2 font-medium">Cấp</th>
        {Object.entries(columns).map(([key, name]) => <th scope="col" key={key} className="min-w-28 p-2 font-medium">{name}</th>)}
      </tr></thead><tbody>{thresholds.map((_, index) => <tr key={index} className="border-b last:border-0">
        <th scope="row" className="p-2 align-top font-medium">{index}</th>
        {Object.entries(columns).map(([key, name]) => {
          const before = key === 'xp_curve' ? values(saved?.xp_curve)[index] : values(savedEffects[key])[index];
          return <td key={key} className="p-2 align-top"><NumberBox label={`${name} · cấp ${index}`} value={numeric(table[key][index])}
            before={editable ? numeric(before) ?? numeric(key === 'xp_curve' ? defaultXp[index] : values(sourceEffects[key])[index]) : undefined}
            editable={editable && (!known || index !== 0 || key === 'field_repair_caps' || table[key][0] !== (key === 'xp_curve' ? 0 : fallback(key)))}
            min={key === 'field_repair_caps' ? .0000000001 : 0} max={key === 'xp_curve' ? 2147483647 : ['repair_bonus_fractions', 'field_repair_caps'].includes(key) ? 1 : undefined} step={key === 'xp_curve' && known ? 1 : .0000000001}
            onError={error => onError(`skill:${key}:${index}`, error)} onChange={value => onChange(updateSkillLevels(record, { ...table, [key]: table[key].map((current, i) => i === index ? value : current) }, known))} /></td>;
        })}
      </tr>)}</tbody></table>
    </div>}
    {errors.map(error => <p key={error} className="text-sm text-destructive">{error}</p>)}
    <TechnicalFields fields={hidden} />
  </section>;
}

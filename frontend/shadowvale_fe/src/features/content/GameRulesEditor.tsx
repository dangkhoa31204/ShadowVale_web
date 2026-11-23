import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { NumericControl } from '../shared/NumericControl';
import { jsonObject } from './mapDifficulty';
import type { ContentBundle, ContentRecord, JsonValue } from './types';

type NumberField = [key: string, label: string, min: number, max: number, step: number];
const adaptiveFields: NumberField[] = [
  ['lowAmmo', 'Ngưỡng thiếu đạn', 0, 10000, 1],
  ['ammoBoost', 'Hệ số tăng rơi đạn', 0.01, 1000, 0.01],
  ['lowHealth', 'Ngưỡng máu thấp', 0, 1, 0.01],
  ['medkitBoost', 'Hệ số tăng rơi băng cứu thương', 0.01, 1000, 0.01],
  ['medkitPity', 'Số lượt để đảm bảo băng cứu thương', 1, 10000, 1],
];
const repairFields: NumberField[] = [
  ['fieldFraction', 'Tỉ lệ độ bền khi sửa dã chiến', 0, 1, 0.01],
  ['fieldSeconds', 'Thời gian sửa dã chiến (giây)', 0.01, 600, 0.01],
  ['salvageSeconds', 'Thời gian tháo đồ (giây)', 0.01, 600, 0.01],
  ['benchQuarterParts', 'Linh kiện mỗi 25% độ bền', 1, 10000, 1],
  ['benchOilFrom', 'Ngưỡng dùng dầu súng', 0, 1, 0.01],
  ['benchDiscountLevel', 'Cấp kỹ thuật được giảm chi phí', 0, 10000, 1],
  ['salvageBonusLevel', 'Cấp kỹ thuật được thưởng tháo đồ', 0, 10000, 1],
];
const logisticsFields: NumberField[] = [
  ['turnInFloor', 'Hệ số đổi súng tối thiểu', 0, 1, 0.01],
  ['turnInCeiling', 'Hệ số đổi súng tối đa', 0, 1, 0.01],
];

const list = (value: JsonValue | undefined) => Array.isArray(value) ? value : [];
const itemOptions = (items: ContentRecord[]) => items.map(item => ({ value: String(item.code), label: String(item.name || item.code) }));

export function GameRulesEditor({ layout, bundle, mapCode, editable, onChange, onError }: {
  layout: JsonValue | undefined; bundle: ContentBundle; mapCode: string; editable: boolean;
  onChange: (value: JsonValue) => void; onError: (key: string, message: string) => void;
}) {
  const current = jsonObject(layout), rules = jsonObject(current.game_rules);
  const repair = jsonObject(rules.repair), adaptive = jsonObject(rules.adaptive);
  const logistics = jsonObject(rules.logistics), crafting = jsonObject(rules.field_crafting);
  const weapons = itemOptions(bundle.items.filter(item => item.item_type === 'weapon'));
  const ammo = itemOptions(bundle.items.filter(item => item.item_type === 'ammo'));
  const items = itemOptions(bundle.items);
  const change = (key: string, value: JsonValue) => onChange({ ...current, game_rules: { ...rules, [key]: value } });
  const update = (key: string, value: Record<string, JsonValue>, field: string, next: JsonValue) => {
    const updated = { ...value, [field]: next };
    if (next === null) delete updated[field];
    change(key, updated);
  };

  function number([key, label, min, max, step]: NumberField, value: JsonValue | undefined,
    save: (value: number | null) => void, prefix: string, nullable = false) {
    return <NumericControl key={key + ':' + prefix} label={label} value={typeof value === 'number' ? value : null}
      min={min} max={max} step={step} nullable={nullable} disabled={!editable}
      onError={message => onError(prefix + ' · ' + label, message)} onChange={save} />;
  }
  function select(label: string, value: JsonValue | undefined, options: { value: string; label: string }[], save: (value: string) => void) {
    const selected = typeof value === 'string' ? value : '';
    return <label>{label}<NativeSelect className="mt-1 w-full" value={selected} disabled={!editable}
      onChange={event => save(event.target.value)}>
      {!selected && <NativeSelectOption value="" disabled>Chọn {label.toLowerCase()}</NativeSelectOption>}
      {selected && !options.some(option => option.value === selected) && <NativeSelectOption value={selected}>{selected}</NativeSelectOption>}
      {options.map(option => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
    </NativeSelect></label>;
  }
  function replace(rows: JsonValue[], index: number, patch: Record<string, JsonValue>) {
    return rows.map((row, i) => i === index ? { ...jsonObject(row), ...patch } : row);
  }
  const offers = list(rules.trade_offers);
  const weights = list(rules.tier_odds);
  const turnIn = list(logistics.materialTrade);
  const availableRecipe = bundle.crafting_recipes.find(recipe => !Object.hasOwn(crafting, String(recipe.code)));
  const questOptions = bundle.quests.flatMap(quest => list(quest.objectives).map(objective => {
    const row = jsonObject(objective);
    return { value: String(row.id ?? ''), label: String(row.title ?? row.id ?? '') };
  })).filter((option, index, options) => !!option.value && options.findIndex(other => other.value === option.value) === index);
  const rewards = list(logistics.mapTwoRewards);
  const nextWeapon = weapons.find(option => !offers.some(row => jsonObject(row).gun === option.value));
  const nextMaterial = items.find(option => !turnIn.some(row => jsonObject(row).id === option.value));
  const nextObjective = questOptions.find(option => !rewards.some(row => jsonObject(row).id === option.value));

  return <div className="space-y-3 text-sm">
    <details className="rounded-lg border p-4" open><summary className="cursor-pointer font-semibold">Loot &amp; trao đổi</summary>
      <div className="mt-4 space-y-4">
        <h4 className="font-medium">Hàng ở trại</h4>
        {offers.map((entry, index) => {
          const row = jsonObject(entry), prefix = 'Hàng ở trại ' + (index + 1);
          const edit = (patch: Record<string, JsonValue>) => change('trade_offers', replace(offers, index, patch));
          return <div key={index} className="grid items-start gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            {select('Súng', row.gun, weapons, gun => edit({ gun }))}
            {select('Đạn đi kèm', row.ammo, ammo, value => edit({ ammo: value }))}
            {number(['rounds', 'Số viên đạn', 1, 9999, 1], row.rounds, value => edit({ rounds: value }), prefix)}
            {editable && <Button type="button" variant="outline" onClick={() => {
              onError(prefix + ' · Số viên đạn', '');
              change('trade_offers', offers.filter((_, i) => i !== index));
            }}>Xóa</Button>}
          </div>;
        })}
        {editable && nextWeapon && ammo[0] && <Button type="button" variant="outline"
          onClick={() => change('trade_offers', [...offers, { gun: nextWeapon.value, ammo: ammo[0].value, rounds: 1 }])}>Thêm hàng</Button>}
        {(mapCode === 'map01' || weights.length > 0) && <>
          <h4 className="font-medium">Trọng số cấp loot</h4>
          {weights.length === 4
            ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{weights.map((value, index) =>
              number([String(index), 'Cấp ' + (index + 1), 0, 100000, 0.01], value,
                next => change('tier_odds', weights.map((old, i) => i === index ? next : old)), 'Loot'))}</div>
            : editable && <Button type="button" variant="outline" onClick={() => change('tier_odds', [52, 38, 8, 2])}>Đặt trọng số</Button>}
          <h4 className="font-medium">Hỗ trợ rơi đồ</h4>
          <div className="grid gap-3 sm:grid-cols-2">{adaptiveFields.map(field =>
            number(field, adaptive[field[0]], value => update('adaptive', adaptive, field[0], value), 'Hỗ trợ loot', true))}</div>
        </>}
        {(mapCode === 'map01' || Object.keys(logistics).length > 0) && <>
        <h4 className="font-medium">Đổi vật liệu lấy điểm</h4>
        {turnIn.map((entry, index) => {
          const row = jsonObject(entry), prefix = 'Đổi vật liệu ' + (index + 1);
          const edit = (patch: Record<string, JsonValue>) => update('logistics', logistics, 'materialTrade', replace(turnIn, index, patch));
          return <div key={index} className="grid items-start gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]">
            {select('Vật liệu', row.id, items, id => edit({ id }))}
            {number(['points', 'Điểm', 0, 1000000, 1], row.points, value => edit({ points: value }), prefix)}
            {editable && <Button type="button" variant="outline" onClick={() => {
              onError(prefix + ' · Điểm', '');
              update('logistics', logistics, 'materialTrade', turnIn.filter((_, i) => i !== index));
            }}>Xóa</Button>}
          </div>;
        })}
        {editable && nextMaterial && <Button type="button" variant="outline"
          onClick={() => update('logistics', logistics, 'materialTrade', [...turnIn, { id: nextMaterial.value, points: 1 }])}>Thêm vật liệu</Button>}
        <div className="grid gap-3 sm:grid-cols-2">{logisticsFields.map(field =>
          number(field, logistics[field[0]], value => update('logistics', logistics, field[0], value), 'Đổi đồ', true))}</div>
        {list(logistics.operationCredit).length === 4 && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {list(logistics.operationCredit).map((value, index) =>
            number([String(index), 'Điểm chiến dịch ' + (index + 1), 0, 1000000, 1], value,
              next => update('logistics', logistics, 'operationCredit', list(logistics.operationCredit).map((old, i) => i === index ? next : old)), 'Điểm chiến dịch'))}
        </div>}
        {(rewards.length > 0 || mapCode === 'map01' && questOptions.length > 0) && <>
          <h4 className="font-medium">Điểm nhiệm vụ Map 2</h4>
          {rewards.map((entry, index) => {
            const row = jsonObject(entry), prefix = 'Điểm nhiệm vụ ' + (index + 1);
            const edit = (patch: Record<string, JsonValue>) => update('logistics', logistics, 'mapTwoRewards', replace(rewards, index, patch));
            return <div key={index} className="grid items-start gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]">
              {select('Mục tiêu', row.id, questOptions, id => edit({ id }))}
              {number(['points', 'Điểm', 0, 1000000, 1], row.points, value => edit({ points: value }), prefix)}
              {editable && <Button type="button" variant="outline" onClick={() => {
                onError(prefix + ' · Điểm', '');
                update('logistics', logistics, 'mapTwoRewards', rewards.filter((_, i) => i !== index));
              }}>Xóa</Button>}
            </div>;
          })}
          {editable && nextObjective && <Button type="button" variant="outline"
            onClick={() => update('logistics', logistics, 'mapTwoRewards', [...rewards, { id: nextObjective.value, points: 1 }])}>Thêm điểm nhiệm vụ</Button>}
        </>}
        </>}
      </div>
    </details>
    {(mapCode === 'map01' || Object.keys(repair).length > 0 || Object.keys(crafting).length > 0) &&
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Sửa đồ &amp; chế tạo</summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">{repairFields.map(field =>
            number(field, repair[field[0]], value => update('repair', repair, field[0], value), 'Sửa đồ', true))}</div>
          <h4 className="font-medium">Chế tạo dã chiến</h4>
          {Object.entries(crafting).map(([code, settings]) => {
            const row = jsonObject(settings);
            const edit = (patch: Record<string, JsonValue>) => update('field_crafting', crafting, code, { ...row, ...patch });
            return <fieldset key={code} className="grid items-start gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]">
              <legend>{String(bundle.crafting_recipes.find(recipe => recipe.code === code)?.name || code)}</legend>
              {number(['seconds', 'Thời gian (giây)', 0, 600, 0.01], row.seconds, value => edit({ seconds: value }), code)}
              {number(['max_batch', 'Số món mỗi lần', 1, 1000, 1], row.max_batch, value => edit({ max_batch: value }), code)}
              {editable && <Button type="button" variant="outline" onClick={() => {
                onError(code + ' · Thời gian (giây)', '');
                onError(code + ' · Số món mỗi lần', '');
                update('field_crafting', crafting, code, null);
              }}>Xóa</Button>}
            </fieldset>;
          })}
          {editable && availableRecipe && select('Thêm công thức dã chiến', '', bundle.crafting_recipes
            .filter(recipe => !Object.hasOwn(crafting, String(recipe.code))).map(recipe => ({ value: String(recipe.code), label: String(recipe.name || recipe.code) })),
          code => update('field_crafting', crafting, code, { seconds: 5, max_batch: 1 }))}
        </div>
      </details>}
  </div>;
}

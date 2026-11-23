import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { NumericControl } from '../shared/NumericControl';
import { jsonObject } from './mapDifficulty';
import type { RuleSection } from './designerPresentation';
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

export function GameRulesEditor({ section, layout, stockLayout, savedLayout, savedStockLayout, hasSharedRules, bundle, editable, onChange, onStockChange, onError }: {
  section: RuleSection; layout: JsonValue | undefined; stockLayout: JsonValue | undefined; savedLayout?: JsonValue; savedStockLayout?: JsonValue; hasSharedRules: boolean;
  bundle: ContentBundle; editable: boolean;
  onChange: (value: JsonValue) => void; onStockChange: (value: JsonValue) => void; onError: (message: string) => void;
}) {
  const fieldErrors = useRef<Record<string, string>>({});
  const report = (key: string, message: string) => {
    fieldErrors.current[key] = message;
    onError(Object.entries(fieldErrors.current).filter(([, error]) => error).map(([field, error]) => field + ': ' + error).join(' '));
  };
  const current = jsonObject(layout), rules = jsonObject(current.game_rules);
  const stock = jsonObject(stockLayout), stockRules = jsonObject(stock.game_rules);
  const changeStock = (offers: JsonValue[]) => onStockChange({ ...stock, game_rules: { ...stockRules, trade_offers: offers } });
  const repair = jsonObject(rules.repair), adaptive = jsonObject(rules.adaptive);
  const logistics = jsonObject(rules.logistics), crafting = jsonObject(rules.field_crafting);
  const savedRules = jsonObject(jsonObject(savedLayout).game_rules);
  const savedStockRules = jsonObject(jsonObject(savedStockLayout).game_rules);
  const savedLogistics = jsonObject(savedRules.logistics);
  const savedRow = (rows: JsonValue | undefined, key: string, value: JsonValue | undefined) =>
    jsonObject(list(rows).find(row => jsonObject(row)[key] === value));
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
    save: (value: number | null) => void, prefix: string, saved: JsonValue | undefined, nullable = false) {
    return <NumericControl key={key + ':' + prefix} label={label} value={typeof value === 'number' ? value : null}
      savedValue={editable ? (typeof saved === 'number' ? saved : null) : undefined}
      min={min} max={max} step={step} nullable={nullable} disabled={!editable}
      onError={message => report(prefix + ' · ' + label, message)} onChange={save} />;
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
  const offers = list(stockRules.trade_offers);
  const weights = list(rules.tier_odds);
  const turnIn = list(logistics.materialTrade);
  const availableRecipe = bundle.crafting_recipes.find(recipe => !Object.hasOwn(crafting, String(recipe.code)));
  const questOptions = bundle.quests.filter(quest => quest.code === 'map02_chapter').flatMap(quest => list(quest.objectives).map(objective => {
    const row = jsonObject(objective);
    return { value: String(row.id ?? ''), label: String(row.title ?? row.id ?? '') };
  })).filter((option, index, options) => !!option.value && options.findIndex(other => other.value === option.value) === index);
  const rewards = list(logistics.mapTwoRewards);
  const nextWeapon = weapons.find(option => !offers.some(row => jsonObject(row).gun === option.value));
  const nextMaterial = items.find(option => !turnIn.some(row => jsonObject(row).id === option.value));
  const nextObjective = questOptions.find(option => !rewards.some(row => jsonObject(row).id === option.value));

  return <div className="space-y-4 text-sm">
    {section === 'trade' && <>
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="font-semibold">Hàng ở trại</h3>
        <p className="text-muted-foreground">Chọn súng và đạn bán kèm. Giá lấy từ giá cơ bản của vật phẩm.</p>
        {offers.map((entry, index) => {
          const row = jsonObject(entry), prefix = 'Hàng ở trại ' + (index + 1);
          const edit = (patch: Record<string, JsonValue>) => changeStock(replace(offers, index, patch));
          return <div key={index} className="grid items-start gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            {select('Súng', row.gun, weapons, gun => edit({ gun }))}
            {select('Đạn đi kèm', row.ammo, ammo, value => edit({ ammo: value }))}
            {number(['rounds', 'Số viên đạn', 1, 9999, 1], row.rounds, value => edit({ rounds: value }), prefix, savedRow(savedStockRules.trade_offers, 'gun', row.gun).rounds)}
            {editable && <Button type="button" variant="outline" onClick={() => {
              report(prefix + ' · Số viên đạn', '');
              changeStock(offers.filter((_, i) => i !== index));
            }}>Xóa</Button>}
          </div>;
        })}
        {editable && nextWeapon && ammo[0] && <Button type="button" variant="outline"
          onClick={() => changeStock([...offers, { gun: nextWeapon.value, ammo: ammo[0].value, rounds: 1 }])}>Thêm hàng</Button>}
      </section>
    </>}
    {section === 'loot' && <section className="space-y-4 rounded-lg border p-4">
          <p className="text-muted-foreground">Trọng số cấp quyết định chọn cấp loot. Trọng số từng vật phẩm chỉnh trong mục Loot entries.</p>
          <h4 className="font-medium">Trọng số cấp loot</h4>
          {weights.length === 4
            ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{weights.map((value, index) =>
              number([String(index), 'Cấp ' + (index + 1), 0, 100000, 0.01], value,
                next => change('tier_odds', weights.map((old, i) => i === index ? next : old)), 'Loot', list(savedRules.tier_odds)[index]))}</div>
            : editable && <Button type="button" variant="outline" onClick={() => change('tier_odds', [52, 38, 8, 2])}>Đặt trọng số</Button>}
          <h4 className="font-medium">Hỗ trợ rơi đồ</h4>
          <div className="grid gap-3 sm:grid-cols-2">{adaptiveFields.map(field =>
            number(field, adaptive[field[0]], value => update('adaptive', adaptive, field[0], value), 'Hỗ trợ loot', jsonObject(savedRules.adaptive)[field[0]], true))}</div>
    </section>}
    {section === 'trade' && hasSharedRules && <section className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">Đổi vật liệu lấy điểm</h3>
        {turnIn.map((entry, index) => {
          const row = jsonObject(entry), prefix = 'Đổi vật liệu ' + (index + 1);
          const edit = (patch: Record<string, JsonValue>) => update('logistics', logistics, 'materialTrade', replace(turnIn, index, patch));
          return <div key={index} className="grid items-start gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]">
            {select('Vật liệu', row.id, items, id => edit({ id }))}
            {number(['points', 'Điểm', 0, 1000000, 1], row.points, value => edit({ points: value }), prefix, savedRow(savedLogistics.materialTrade, 'id', row.id).points)}
            {editable && <Button type="button" variant="outline" onClick={() => {
              report(prefix + ' · Điểm', '');
              update('logistics', logistics, 'materialTrade', turnIn.filter((_, i) => i !== index));
            }}>Xóa</Button>}
          </div>;
        })}
        {editable && nextMaterial && <Button type="button" variant="outline"
          onClick={() => update('logistics', logistics, 'materialTrade', [...turnIn, { id: nextMaterial.value, points: 1 }])}>Thêm vật liệu</Button>}
        <div className="grid gap-3 sm:grid-cols-2">{logisticsFields.map(field =>
          number(field, logistics[field[0]], value => update('logistics', logistics, field[0], value), 'Đổi đồ', savedLogistics[field[0]], true))}</div>
    </section>}
    {section === 'missions' && <section className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">Điểm chiến dịch Map 1</h3>
        {list(logistics.operationCredit).length === 4 && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {list(logistics.operationCredit).map((value, index) =>
            number([String(index), 'Điểm chiến dịch ' + (index + 1), 0, 1000000, 1], value,
              next => update('logistics', logistics, 'operationCredit', list(logistics.operationCredit).map((old, i) => i === index ? next : old)), 'Điểm chiến dịch', list(savedLogistics.operationCredit)[index]))}
        </div>}
        {(rewards.length > 0 || questOptions.length > 0) && <>
          <h4 className="font-medium">Điểm nhiệm vụ Map 2</h4>
          {rewards.map((entry, index) => {
            const row = jsonObject(entry), prefix = 'Điểm nhiệm vụ ' + (index + 1);
            const edit = (patch: Record<string, JsonValue>) => update('logistics', logistics, 'mapTwoRewards', replace(rewards, index, patch));
            return <div key={index} className="grid items-start gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]">
              {select('Mục tiêu', row.id, questOptions, id => edit({ id }))}
              {number(['points', 'Điểm', 0, 1000000, 1], row.points, value => edit({ points: value }), prefix, savedRow(savedLogistics.mapTwoRewards, 'id', row.id).points)}
              {editable && <Button type="button" variant="outline" onClick={() => {
                report(prefix + ' · Điểm', '');
                update('logistics', logistics, 'mapTwoRewards', rewards.filter((_, i) => i !== index));
              }}>Xóa</Button>}
            </div>;
          })}
          {editable && nextObjective && <Button type="button" variant="outline"
            onClick={() => update('logistics', logistics, 'mapTwoRewards', [...rewards, { id: nextObjective.value, points: 1 }])}>Thêm điểm nhiệm vụ</Button>}
        </>}
    </section>}
    {section === 'crafting' &&
      <section className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Sửa và tháo đồ</h3>
          <div className="grid gap-3 sm:grid-cols-2">{repairFields.map(field =>
            number(field, repair[field[0]], value => update('repair', repair, field[0], value), 'Sửa đồ', jsonObject(savedRules.repair)[field[0]], true))}</div>
          <h4 className="font-medium">Chế tạo dã chiến</h4>
          {Object.entries(crafting).map(([code, settings]) => {
            const row = jsonObject(settings);
            const edit = (patch: Record<string, JsonValue>) => update('field_crafting', crafting, code, { ...row, ...patch });
            return <fieldset key={code} className="grid items-start gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]">
              <legend>{String(bundle.crafting_recipes.find(recipe => recipe.code === code)?.name || code)}</legend>
              {number(['seconds', 'Thời gian (giây)', 0, 600, 0.01], row.seconds, value => edit({ seconds: value }), code, jsonObject(jsonObject(savedRules.field_crafting)[code]).seconds)}
              {number(['max_batch', 'Số món mỗi lần', 1, 1000, 1], row.max_batch, value => edit({ max_batch: value }), code, jsonObject(jsonObject(savedRules.field_crafting)[code]).max_batch)}
              {editable && <Button type="button" variant="outline" onClick={() => {
                report(code + ' · Thời gian (giây)', '');
                report(code + ' · Số món mỗi lần', '');
                update('field_crafting', crafting, code, null);
              }}>Xóa</Button>}
            </fieldset>;
          })}
          {editable && availableRecipe && select('Thêm công thức dã chiến', '', bundle.crafting_recipes
            .filter(recipe => !Object.hasOwn(crafting, String(recipe.code))).map(recipe => ({ value: String(recipe.code), label: String(recipe.name || recipe.code) })),
          code => update('field_crafting', crafting, code, { seconds: 5, max_batch: 1 }))}
      </section>}
  </div>;
}

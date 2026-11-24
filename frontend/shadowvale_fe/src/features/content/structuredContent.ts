import { jsonObject } from './mapDifficulty';
import type { ContentBundle, ContentRecord, JsonValue } from './types';

export const skillEffects = {
  shooting: { recoil_multipliers: 'Hệ số độ giật', reload_multipliers: 'Hệ số thời gian nạp' },
  stealth: { takedown_multipliers: 'Hệ số tầm kết liễu' },
  engineering: { repair_bonus_fractions: 'Phần độ bền cộng thêm', field_repair_caps: 'Giới hạn sửa dã chiến' },
} satisfies Record<string, Record<string, string>>;

export function skillColumns(type: JsonValue) {
  return (skillEffects as Record<string, Record<string, string>>)[String(type)] ?? {};
}

export const itemStatKeys = ['found_min', 'found_max', 'salvage_good', 'salvage_good_item', 'salvage'];
export const values = (value: JsonValue | undefined) => Array.isArray(value) ? value : [];

export function patchValue(object: ContentRecord, key: string, value: JsonValue) {
  const next = { ...object };
  if (value === null) delete next[key];
  else next[key] = value;
  return next;
}

export function updateSkillLevels(record: ContentRecord, columns: Record<string, JsonValue[]>, syncLevelCount = false): ContentRecord {
  const { xp_curve, ...modifiers } = columns;
  return { ...record, xp_curve, effects: { ...jsonObject(record.effects), ...modifiers }, ...(syncLevelCount ? { max_level: xp_curve.length } : {}) };
}

export function skillTableErrors(record: ContentRecord) {
  const columns = skillColumns(record.skill_type);
  if (!Object.keys(columns).length) return [];
  const curve = values(record.xp_curve), effects = jsonObject(record.effects);
  const errors: string[] = [];
  if (curve.length < 2 || curve.length > 5 || curve[0] !== 0 || curve.some((xp, i) => typeof xp !== 'number' || !Number.isInteger(xp) || xp < 0 || xp > 2147483647 || (i > 0 && xp <= Number(curve[i - 1]))))
    errors.push('Ngưỡng XP cần từ 2–5 cấp, bắt đầu bằng 0 và tăng dần theo từng cấp.');
  for (const [key, label] of Object.entries(columns)) {
    const series = values(effects[key]);
    if (!series.length && (key === 'reload_multipliers' || key === 'field_repair_caps')) continue;
    const fraction = key === 'repair_bonus_fractions' || key === 'field_repair_caps';
    const decreases = record.skill_type === 'shooting';
    const first = key === 'repair_bonus_fractions' ? 0 : key === 'field_repair_caps' ? undefined : 1;
    if (series.length !== curve.length || (first !== undefined && series[0] !== first) || series.some((value, i) =>
      typeof value !== 'number' || !Number.isFinite(value) || (key === 'repair_bonus_fractions' ? value < 0 : value <= 0) ||
      (fraction && value > 1) || (i > 0 && (decreases ? value > Number(series[i - 1]) : value < Number(series[i - 1]))))) {
      errors.push(`${label} cần đủ giá trị cho từng cấp, ${decreases ? 'không tăng' : 'không giảm'} dần${first === undefined ? '' : ` và bắt đầu ở ${first}`}.`);
    }
  }
  return errors;
}

export function itemStatsErrors(stats: ContentRecord) {
  const errors: string[] = [];
  if (typeof stats.found_min === 'number' && typeof stats.found_max === 'number' && stats.found_min > stats.found_max)
    errors.push('Độ bền tối thiểu khi nhặt phải nhỏ hơn hoặc bằng độ bền tối đa.');
  for (const row of values(stats.salvage)) {
    const { item, min, max } = jsonObject(row);
    if (typeof min === 'number' && typeof max === 'number' && min > max)
      errors.push(`Tháo dỡ ${String(item ?? '')}: số lượng tối thiểu phải nhỏ hơn hoặc bằng tối đa.`);
  }
  return errors;
}

export function structuredContentErrors(current: ContentBundle, saved: ContentBundle) {
  const changes = (key: 'items' | 'skills', fields: string[], validate: (row: ContentRecord) => string[]) => current[key].flatMap(row => {
    const previous = saved[key].find(candidate => candidate.code === row.code);
    return fields.some(field => JSON.stringify(row[field]) !== JSON.stringify(previous?.[field]))
      ? validate(row).map(message => `${row.name || row.code}: ${message}`) : [];
  });
  return [...changes('items', ['stats'], row => itemStatsErrors(jsonObject(row.stats))),
    ...changes('skills', ['skill_type', 'xp_curve', 'effects'], skillTableErrors)];
}

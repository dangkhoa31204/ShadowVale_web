import type { CollectionKey, ContentBundle, ContentRecord, JsonValue } from './types';
import { jsonObject } from './mapDifficulty';

export const relatedSections = {
  crafting_recipes: { collection: 'crafting_recipe_ingredients', parentKey: 'recipe_code', title: 'Nguyên liệu đầu vào', fields: ['quantity'] },
  loot_tables: { collection: 'loot_table_entries', parentKey: 'loot_table_code', title: 'Vật phẩm có thể nhận', fields: ['tier', 'weight', 'min_qty', 'max_qty'] },
  quests: { collection: 'quest_rewards', parentKey: 'quest_code', title: 'Phần thưởng trong bản nội dung', fields: ['quantity'] },
} as const satisfies Partial<Record<CollectionKey, { collection: CollectionKey; parentKey: string; title: string; fields: readonly string[] }>>;

export type RelatedSection = typeof relatedSections[keyof typeof relatedSections];

export function setKnifeAttackInterval(bundle: ContentBundle, seconds: number): ContentBundle {
  return {
    ...bundle,
    items: bundle.items.map(item => item.code === 'knife' ? { ...item, stats: { ...jsonObject(item.stats), melee_cooldown_s: seconds } } : item),
    weapons: bundle.weapons.map(weapon => weapon.item_code === 'knife' ? { ...weapon, fire_rate: Number((1 / seconds).toFixed(2)) } : weapon),
  };
}

export function relatedSection(collection: CollectionKey): RelatedSection | undefined {
  return relatedSections[collection as keyof typeof relatedSections];
}

export function replaceRelatedRows(bundle: ContentBundle, section: RelatedSection, code: JsonValue, rows: ContentRecord[]): ContentBundle {
  return { ...bundle, [section.collection]: [...bundle[section.collection].filter(row => row[section.parentKey] !== code), ...rows] };
}

export function lootChances(entries: ContentRecord[], layout: JsonValue | undefined, defaultOdds?: number[]): (number | null)[] {
  const rules = jsonObject(jsonObject(layout).game_rules);
  const odds = rules.tier_odds ?? defaultOdds;
  if (!Array.isArray(odds) || odds.length !== 4 || !odds.every((value): value is number => typeof value === 'number' && value >= 0)) return entries.map(() => null);
  const tiers = [...new Set(entries.map(row => Number(row.tier)).filter(tier => tier >= 1 && tier <= 4))].sort((a, b) => a - b);
  const total = odds.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) return entries.map(() => null);
  const chances = new Map<number, number>();
  odds.forEach((weight, index) => {
    const tier = tiers.filter(value => value <= index + 1).at(-1) ?? tiers[0];
    if (tier !== undefined) chances.set(tier, (chances.get(tier) ?? 0) + weight / total);
  });
  return entries.map((row, index) => {
    if (row.tier === 5) return null;
    const pool = entries.filter(entry => entry.tier === row.tier);
    const weight = pool.reduce((sum, entry) => sum + Number(entry.weight), 0);
    return (chances.get(Number(row.tier)) ?? 0) * (weight > 0 ? Number(row.weight) / weight : entries.indexOf(pool[0]) === index ? 1 : 0);
  });
}
const labels: Record<string, string> = {
  quantity: 'Số lượng', tier: 'Bậc rơi', weight: 'Trọng số', min_qty: 'SL tối thiểu', max_qty: 'SL tối đa',
  output_item_code: 'Thành phẩm', output_quantity: 'Số lượng thành phẩm', craft_time_s: 'Thời gian chế tạo',
  rolls_min: 'Số lượt quay tối thiểu', rolls_max: 'Số lượt quay tối đa',
  max_hp: 'Máu tối đa', move_speed: 'Tốc độ di chuyển', vision_range: 'Tầm nhìn', vision_angle_deg: 'Góc nhìn', hearing_range: 'Tầm nghe', loot_table_code: 'Bảng rơi đồ',
  title: 'Tên nhiệm vụ', description: 'Mô tả nhiệm vụ',
};

export function detailLabel(field: { key: string; label: string }) {
  return labels[field.key] ?? field.label;
}


export function enemyReadOnly(code: string, field: string) {
  if (['m1_patrol', 'm1_camp_guard', 'm1_operation_guard', 'm1_commander'].includes(code)) return !['name', 'loot_table_code'].includes(field);
  if (code === 'boss_commander') return !['name', 'max_hp', 'move_speed', 'vision_range', 'vision_angle_deg'].includes(field);
  return code === 'grunt' || ['scout', 'heavy'].includes(code);
}

import { axiosClient } from '../../services/api/axiosClient';
import type { ContentBundle } from './types';
import type { LayoutPreset } from './mapDifficulty';

export interface CatalogItem { code: string; name: string; type: string; maxStack: number | null; weight: number | null; baseValue: number | null; inRuntimeInventory: boolean }
export interface CatalogWeapon { id: string; name: string; playable: boolean; scripted?: boolean; damage?: number; fire_rate?: number; range?: number; magazine_size?: number; ammo_type?: string; reload_seconds?: number; durability_max?: number; durability_per_shot?: number }
export interface CatalogObjective { id: string; index: number; title: string; requires: string[]; count: number; playOrder: number; phase?: number; kind?: string; site?: string; purpose?: string; seconds?: number; credit?: number }
export interface CatalogMap { code: string; name: string; scene: string; nodeCount: number; objectiveCount: number; bounds: { minX: number; maxX: number; minZ: number; maxZ: number }; escapeRoutes: unknown[]; spawnGroups: unknown[]; containers: { tag: string; lootTable: string }[]; fieldCaches: { id: string; label: string; x: number; z: number; minStage: number }[]; note: string }
export interface GameCatalog {
  authoringBundle?: ContentBundle; importNotes?: string[]; layoutPresets?: Record<string, LayoutPreset[]>;
  schemaVersion: number; generatedAt: string; unityCommit: string | null; sourceHash: string;
  sources: { path: string; sha256: string }[]; limitations: string[];
  items: CatalogItem[]; weapons: CatalogWeapon[];
  lootTables: { code: string; name: string; rollsMin: number; rollsMax: number; entries: { item: string; tier: number; weight: number; min: number; max: number; baselineChance: number | null; guaranteed: boolean }[] }[];
  recipes: { id: string; output_item_id: string; output_count: number; craft_seconds: number; field_seconds?: number; field_max_batch?: number; benchAvailable: boolean; fieldAvailable: boolean; required_skill?: string; required_skill_level?: number; inputs: { item_id: string; count: number }[] }[];
  trade: { offers: { mapCode: string; gun: string; ammo: string; rounds: number; price: number }[]; materials: { id: string; points: number }[]; logistics: { turnInFloor: number; turnInCeiling: number; operationCredit: number[]; mapTwoRewards: { id: string; points: number }[] } };
  maps: CatalogMap[]; quests: { code: string; mapCode: string; title: string; objectives: CatalogObjective[] }[];
  tierOdds: number[]; adaptive: { lowAmmo: number; ammoBoost: number; lowHealth: number; medkitBoost: number; medkitPity: number };
  databaseAudit: { table: string; decision: string; reason: string; evidence: string }[];
}
export interface CatalogComparison { status: 'nothing_published' | 'bundle_unavailable' | 'covered_fields_match' | 'different'; versionId?: string; versionNo?: number; label?: string; scope?: string; differences: { collection: string; key: string; kind: string; field: string | null; unity: unknown; published: unknown }[] }
export const gameCatalogApi = {
  get: async (signal?: AbortSignal) => (await axiosClient.get<GameCatalog>('/game-catalog', { signal })).data,
  compare: async (signal?: AbortSignal) => (await axiosClient.get<CatalogComparison>('/game-catalog/comparison', { signal })).data,
};

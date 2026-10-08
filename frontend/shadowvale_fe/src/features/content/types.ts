import type { User, Role } from '../../types/user';
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type ContentRecord = { [key: string]: JsonValue };
export const collections = [
  { key: 'weapons', label: 'Weapons', icon: 'swords', description: 'Damage, ammunition, durability and noise.' },
  { key: 'enemy_archetypes', label: 'Enemies', icon: 'smart_toy', description: 'Health, perception and combat behavior.' },
  { key: 'loot_tables', label: 'Loot tables', icon: 'inventory_2', description: 'Weighted drops and container tiers.' },
  { key: 'craft_recipes', label: 'Recipes', icon: 'construction', description: 'Ingredients, outputs and skill requirements.' },
  { key: 'quests', label: 'Quests', icon: 'flag', description: 'Objectives, rewards and mission progression.' },
  { key: 'maps', label: 'Maps', icon: 'map', description: 'Scenes, spawns and tactical navigation graphs.' },
  { key: 'items', label: 'Items', icon: 'category', description: 'Ammunition, materials, consumables and tools.' },
] as const;
export type CollectionKey = typeof collections[number]['key'];
export interface ContentBundle {
  bundle_version: string; schema_version: number; published_at?: string; checksum?: string;
  items: ContentRecord[]; weapons: ContentRecord[]; enemy_archetypes: ContentRecord[];
  loot_tables: ContentRecord[]; craft_recipes: ContentRecord[]; quests: ContentRecord[];
  maps: ContentRecord[]; ai_settings: ContentRecord;
}
export type DraftStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'published';
export interface Draft {
  id: string; title: string; authorId: string; authorName: string; status: DraftStatus;
  revision: number; updatedAt: string; bundle: ContentBundle; note: string;
  reviewedBy?: string; reviewedAt?: string;
}
export interface Release {
  id: string; version: string; publishedAt: string; publishedBy: string;
  bundle: ContentBundle; sourceDraftId: string; restoredFrom?: string;
}
export interface TeamUser extends User { active: boolean }
export interface AuditEvent { id: string; at: string; actor: string; action: string; target: string }
export interface Workspace {
  storageVersion: 1; drafts: Draft[]; releases: Release[]; activeReleaseId: string;
  users: TeamUser[]; audit: AuditEvent[]; config: { reviewRequired: true; telemetryEnabled: boolean };
}
export type Command =
  | { type: 'createDraft'; title: string; sourceReleaseId?: string }
  | { type: 'saveDraft'; id: string; revision: number; title: string; bundle: ContentBundle }
  | { type: 'submitDraft'; id: string; revision: number }
  | { type: 'reviewDraft'; id: string; revision: number; approve: boolean; note: string }
  | { type: 'publishDraft'; id: string; revision: number }
  | { type: 'restoreRelease'; id: string }
  | { type: 'createUser'; email: string; name: string; role: Role }
  | { type: 'updateUser'; id: string; role: Role; active: boolean }
  | { type: 'deleteUser'; id: string }
  | { type: 'saveConfig'; telemetryEnabled: boolean };

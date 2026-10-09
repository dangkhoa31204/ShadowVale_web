import type { User, Role } from '../../types/user';
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type ContentRecord = { [key: string]: JsonValue };
export const collections = [
  { key: 'items', label: 'Items', icon: 'category', description: 'Inventory definitions.' },
  { key: 'weapons', label: 'Weapons', icon: 'swords', description: 'Weapon statistics.' },
  { key: 'consumables', label: 'Consumables', icon: 'healing', description: 'Healing and effects.' },
  { key: 'skills', label: 'Skills', icon: 'school', description: 'Skill definitions and progression.' },
  { key: 'loot_tables', label: 'Loot tables', icon: 'inventory_2', description: 'Loot roll definitions.' },
  { key: 'loot_table_entries', label: 'Loot entries', icon: 'list_alt', description: 'Weighted items in loot tables.' },
  { key: 'maps', label: 'Maps', icon: 'map', description: 'Scenes and navigation data.' },
  { key: 'map_loot_tables', label: 'Map loot', icon: 'location_on', description: 'Loot tables assigned to map containers.' },
  { key: 'enemy_types', label: 'Enemy types', icon: 'smart_toy', description: 'Enemy statistics and behavior.' },
  { key: 'enemy_placements', label: 'Enemy placements', icon: 'pin_drop', description: 'Enemy spawn locations and squads.' },
  { key: 'crafting_recipes', label: 'Crafting recipes', icon: 'construction', description: 'Crafting outputs and requirements.' },
  { key: 'crafting_recipe_ingredients', label: 'Recipe ingredients', icon: 'handyman', description: 'Items required by each recipe.' },
  { key: 'quests', label: 'Quests', icon: 'flag', description: 'Objectives and prerequisites.' },
  { key: 'quest_rewards', label: 'Quest rewards', icon: 'redeem', description: 'Items awarded for quests.' },
] as const;
export type CollectionKey = typeof collections[number]['key'];
export type ContentBundle = {
  version_no: number; label: string; schema_version: string; changelog?: string | null;
  content_version_id?: string; published_at?: string; checksum?: string;
} & Record<CollectionKey, ContentRecord[]>;
export type DraftStatus = 'draft' | 'in_review' | 'rejected' | 'approved' | 'published' | 'archived';
export interface Draft {
  id: string; version_no: number; label: string; changelog: string; parent_version_id?: string;
  /** UI compatibility aliases; adapters map to content_versions.label/authored_by. */
  title: string; authorId: string; authorName: string; status: DraftStatus;
  revision: number; updatedAt: string; created_at?: string; bundle: ContentBundle; note: string;
  submitted_at?: string; reviewedBy?: string; reviewedAt?: string;
  validation_errors?: string[]; validated_at?: string; bundle_checksum?: string;
  published_by?: string; published_at?: string; archived_at?: string;
}
export interface Release {
  id: string; version_no: number; label: string; changelog: string; status: 'published' | 'archived';
  version: string; publishedAt: string; publishedBy: string;
  bundle: ContentBundle; sourceDraftId: string; restoredFrom?: string;
}
export interface PublicationHistory {
  id: number; content_version_id: string; previous_version_id: string | null;
  action: 'publish' | 'rollback'; actor_id: string | null; reason: string; occurred_at: string;
}
export interface TeamUser extends User { active: boolean }
export interface AuditEvent { id: string; at: string; actor: string; action: string; target: string }
export interface Workspace {
  storageVersion: 2; drafts: Draft[]; releases: Release[]; activeReleaseId: string;
  publications: PublicationHistory[];
  users: TeamUser[]; audit: AuditEvent[]; config: { reviewRequired: true; telemetryEnabled: boolean };
}
export type Command =
  | { type: 'createDraft'; title: string; label?: string; changelog?: string; sourceReleaseId?: string }
  | { type: 'saveDraft'; id: string; revision: number; title: string; label?: string; changelog?: string; bundle: ContentBundle }
  | { type: 'editRejectedDraft'; id: string; revision: number }
  | { type: 'submitDraft'; id: string; revision: number }
  | { type: 'reviewDraft'; id: string; revision: number; approve: boolean; note: string }
  | { type: 'publishDraft'; id: string; revision: number; reason: string }
  | { type: 'restoreRelease'; id: string; reason: string }
  | { type: 'createUser'; email: string; name: string; role: Role }
  | { type: 'updateUser'; id: string; role: Role; active: boolean }
  | { type: 'deleteUser'; id: string }
  | { type: 'saveConfig'; telemetryEnabled: boolean };

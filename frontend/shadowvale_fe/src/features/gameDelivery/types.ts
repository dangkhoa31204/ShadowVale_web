import type { ContentBundle } from '../content/types';
export type GamePlatform = 'windows' | 'linux' | 'macos' | 'android';
export type ChangeCategory = 'maps' | 'models' | 'graphics' | 'missions' | 'audio' | 'code' | 'tools' | 'other';
export interface GameChange {
  path: string; previous_path?: string; action: 'added' | 'modified' | 'removed' | 'renamed'; category: ChangeCategory; import_settings?: boolean;
  summary?: string; details?: { label: string; before: string | null; after: string | null }[];
}
export interface GameArtifact { file: string; kind: 'assetbundle' | 'preview'; url: string; size_bytes: number; sha256: string; dependencies: string[] }
export interface GameBuild {
  id: string; commit: string; parent_commit: string | null; branch: string; title: string; author: string; committed_at: string;
  source: 'git' | 'ci'; status: 'awaiting_build' | 'failed' | 'ready' | 'approved' | 'rejected' | 'published'; revision: number;
  platform: GamePlatform | null; min_client_version: string | null; requires_client_update: boolean;
  stale?: boolean;
  change_count: number; changes: GameChange[]; artifacts: GameArtifact[]; content: ContentBundle | null; baseline_commit?: string | null; baseline_content?: ContentBundle | null;
  previews: { path: string; file: string; source_path?: string; url?: string }[]; note?: string; reviewed_by?: string; reviewed_at?: string; build_error?: string | null;
}
export interface GameManifest {
  manifest_version: 1; release_version: string; platform: GamePlatform; published_at: string; published_by: string;
  source_commit: string; source_build_id: string; min_client_version: string; requires_client_update: boolean;
  delivery: 'assetbundles'; notes: string; checksum: string;
  content: { url: string; sha256: string; size_bytes: number }; artifacts: GameArtifact[];
}
export interface DeliveryState { builds: GameBuild[]; releases: GameManifest[]; active: Record<string, string>; source_error: string | null }
export const categories: { key: ChangeCategory; label: string; icon: string }[] = [
  { key: 'maps', label: 'Maps', icon: 'map' }, { key: 'missions', label: 'Missions', icon: 'route' },
  { key: 'models', label: 'Models', icon: 'deployed_code' }, { key: 'graphics', label: 'Graphics', icon: 'palette' },
  { key: 'audio', label: 'Audio', icon: 'volume_up' }, { key: 'code', label: 'Client code', icon: 'code' },
  { key: 'tools', label: 'Editor / tests', icon: 'build' }, { key: 'other', label: 'Other', icon: 'folder' },
];
export const bytesLabel = (bytes: number) => bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB';

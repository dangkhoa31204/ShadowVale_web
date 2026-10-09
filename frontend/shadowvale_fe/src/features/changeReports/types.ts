/** Review evidence accompanies a content version; it is not part of Unity's runtime schema. */
export const reportCategories = [
  { key: 'interface', label: 'Interface', icon: 'dashboard_customize' },
  { key: 'missions', label: 'Mission routes', icon: 'route' },
  { key: 'logic', label: 'Code / logic', icon: 'code' },
  { key: 'maps', label: 'Maps', icon: 'map' },
  { key: 'models', label: 'Models', icon: 'deployed_code' },
  { key: 'graphics', label: 'Graphics', icon: 'palette' },
  { key: 'other', label: 'Other', icon: 'folder' },
] as const;
export type ReportCategory = typeof reportCategories[number]['key'];
export interface EvidenceImage { id: string; file_name: string; media_type: string; size_bytes: number }
export interface ReportChange {
  id: string; category: ReportCategory; title: string; description: string;
  path: string; previous_behavior: string; verification: string;
  image: EvidenceImage | null; image_caption: string;
}
export interface ChangeReport {
  summary: string;
  source: { kind: 'git' | 'ci'; branch: string; commit: string; build_id?: string; build_title?: string };
  changes: ReportChange[];
}
export function newReportChange(): ReportChange {
  return { id: crypto.randomUUID(), category: 'interface', title: '', description: '', path: '', previous_behavior: '', verification: '', image: null, image_caption: '' };
}
export function newChangeReport(): ChangeReport {
  return { summary: '', source: { kind: 'git', branch: '', commit: '' }, changes: [newReportChange()] };
}

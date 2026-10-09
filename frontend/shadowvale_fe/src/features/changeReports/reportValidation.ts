import { reportCategories, type ChangeReport } from './types.ts';
export const imageMediaTypes = ['image/png', 'image/jpeg', 'image/webp'];
export const maxImageBytes = 2 * 1024 * 1024;
export function validateEvidenceFile(file: { type: string; size: number }) {
  if (!imageMediaTypes.includes(file.type)) return 'Use a PNG, JPG or WebP image.';
  if (!file.size || file.size > maxImageBytes) return 'Each image must be between 1 byte and 2 MB.';
  return '';
}
export function validateChangeReport(report?: ChangeReport): string[] {
  if (!report) return [];
  const errors: string[] = [];
  if (!report.summary.trim()) errors.push('Add a report summary.');
  if (!['git', 'ci'].includes(report.source.kind)) errors.push('Choose a source.');
  if (!report.source.branch.trim()) errors.push('Enter a branch.');
  if (!/^[a-fA-F0-9]{7,64}$/.test(report.source.commit.trim())) errors.push('Enter a Git commit (7–64 hexadecimal characters).');
  if (!report.changes.length) errors.push('Add at least one change.');
  if (report.changes.length > 12) errors.push('A report can contain up to 12 changes.');
  const ids = new Set<string>();
  report.changes.forEach((change, i) => {
    const prefix = 'Change ' + (i + 1) + ': ';
    if (!change.id || ids.has(change.id)) errors.push(prefix + 'duplicate or missing identity.');
    ids.add(change.id);
    if (!reportCategories.some(category => category.key === change.category)) errors.push(prefix + 'choose a category.');
    if (!change.title.trim()) errors.push(prefix + 'enter a title.');
    if (!change.description.trim()) errors.push(prefix + 'describe what changed.');
    if (change.image) {
      const error = validateEvidenceFile({ type: change.image.media_type, size: change.image.size_bytes });
      if (!change.image.id || !change.image.file_name.trim() || error) errors.push(prefix + (error || 'invalid evidence image.'));
    }
  });
  return errors;
}

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const actionLabels: Record<string, string> = {
  createDraft: 'Created draft', saveDraft: 'Saved draft', submitDraft: 'Submitted for review',
  reviewDraft: 'Reviewed content', publishDraft: 'Published version', restoreRelease: 'Rolled back version', editRejectedDraft: 'Resumed draft',
};
/** Readable form of a content field value in diffs and snapshots. */
export function displayValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
}

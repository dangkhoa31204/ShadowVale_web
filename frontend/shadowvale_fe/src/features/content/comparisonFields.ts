import { schemaFields } from './schemaFields';
import type { CollectionKey } from './types';

const internalFields = new Set(['api_id', 'content_version_id', 'created_at', 'updated_at']);

export function fieldLabel(key: string, collection?: CollectionKey) {
  return (collection && schemaFields[collection].find(field => field.key === key)?.label)
    || key.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, first => first.toUpperCase());
}

export function displayFields(value: unknown) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value as Record<string, unknown>).filter(([key]) => !internalFields.has(key))
    : [];
}

interface FieldChange { path: string; label: string; before: unknown; after: unknown }

export function changedFields(before: unknown, after: unknown, path = '', label = ''): FieldChange[] {
  if (before === after) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    return Array.from({ length: Math.max(before.length, after.length) }, (_, index) =>
      changedFields(before[index], after[index], path + '/' + index, [label, 'Entry ' + (index + 1)].filter(Boolean).join(' · '))).flat();
  }
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    const left = new Map(displayFields(before)), right = new Map(displayFields(after));
    return [...new Set([...left.keys(), ...right.keys()])].flatMap(key =>
      changedFields(left.get(key), right.get(key), path + '/' + key.replaceAll('~', '~0').replaceAll('/', '~1'), [label, fieldLabel(key)].filter(Boolean).join(' · ')));
  }
  return [{ path, label, before, after }];
}

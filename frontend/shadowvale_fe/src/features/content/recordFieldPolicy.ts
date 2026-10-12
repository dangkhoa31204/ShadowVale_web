import { collectionIdentity, recordIdentity, type FieldDefinition } from './schemaFields';
import type { CollectionKey, ContentRecord } from './types';

/** Child records (weapons, loot entries, placements...) may not have an API GUID. */
export function isExistingRecord(collection: CollectionKey, record: ContentRecord, savedRecords: ContentRecord[]): boolean {
  return !!record.api_id || savedRecords.some(saved => recordIdentity(collection, saved) === recordIdentity(collection, record));
}

export function recordEditorFields(collection: CollectionKey, fields: FieldDefinition[], existing: boolean): FieldDefinition[] {
  return fields.map(field => ({
    ...field,
    readOnly: !!field.readOnly || existing && (
      collectionIdentity[collection].includes(field.key) || !!field.reference ||
      field.type === 'reference' || field.key === 'item_type'
    ),
  }));
}

/** The raw editor must enforce the same locks as inputs/dropdowns. */
export function assertReadOnlyFields(fields: FieldDefinition[], current: ContentRecord, next: ContentRecord): void {
  if (next.api_id !== current.api_id) throw new Error('API resource ID is read-only.');
  for (const field of fields.filter(field => field.readOnly)) {
    if (JSON.stringify(next[field.key]) !== JSON.stringify(current[field.key])) {
      throw new Error(field.label + ' is read-only.');
    }
  }
}

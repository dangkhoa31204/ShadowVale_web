import { collectionIdentity, recordIdentity, type FieldDefinition } from './schemaFields';
import type { CollectionKey, ContentRecord } from './types';

/** Child records (weapons, loot entries, placements...) may not have an API GUID. */
export function isExistingRecord(collection: CollectionKey, record: ContentRecord, savedRecords: ContentRecord[]): boolean {
  return !!record.api_id || savedRecords.some(saved => recordIdentity(collection, saved) === recordIdentity(collection, record));
}

export function recordEditorFields(collection: CollectionKey, fields: FieldDefinition[], existing: boolean): FieldDefinition[] {
  return fields.map(field => {
    const editableReference = collection === 'crafting_recipes' && field.key === 'output_item_code' ||
      collection === 'enemy_types' && field.key === 'loot_table_code';
    return {
      ...field,
      readOnly: !!field.readOnly || existing && (
        collectionIdentity[collection].includes(field.key) ||
        !editableReference && (!!field.reference || field.type === 'reference') || field.key === 'item_type'
      ),
    };
  });
}

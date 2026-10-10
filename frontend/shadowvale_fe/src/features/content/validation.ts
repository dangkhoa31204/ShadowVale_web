import Ajv from 'ajv';
import type { ContentBundle, ContentRecord, JsonValue } from './types';
import { collectionIdentity, schemaFields } from './schemaFields.ts';

/** Frontend feedback only. Backend remains the authority for persistence and publish validation. */
export function createBundleValidator(schema: object) {
  const validateSchema = new Ajv({ allErrors: true, jsonPointers: true, multipleOfPrecision: 8 }).compile(schema);
  return (input: unknown): string[] => {
    if (!validateSchema(input)) return (validateSchema.errors || []).map(error => `${error.dataPath || '/'} ${error.message}`);
    const bundle = input as ContentBundle;
    const errors: string[] = [];
    for (const collection of Object.keys(collectionIdentity) as (keyof typeof collectionIdentity)[]) {
      const identities = new Set<string>();
      bundle[collection].forEach((record, index) => {
        const path = `/${collection}/${index}`;
        const identity = JSON.stringify(collectionIdentity[collection].map(key => record[key]));
        if (identities.has(identity)) errors.push(`${path}: duplicate primary key ${collectionIdentity[collection].map(key => record[key]).join(' / ')}`);
        identities.add(identity);
        for (const field of schemaFields[collection]) {
          if (!field.reference || record[field.key] === null || record[field.key] === undefined) continue;
          const reference = field.reference;
          const values = field.type === 'string-array' ? record[field.key] as JsonValue[] : [record[field.key]];
          for (const value of values) {
            const target = bundle[reference.collection].find(row => row[reference.valueField || 'code'] === value);
            if (!target) errors.push(`${path}/${field.key}: unknown reference ${String(value)}`);
            else if (reference.filter && target[reference.filter.field] !== reference.filter.value) errors.push(`${path}/${field.key}: must reference ${reference.filter.value} ${reference.collection}`);
          }
        }
        if (record.content_version_id !== undefined && bundle.content_version_id !== undefined && record.content_version_id !== bundle.content_version_id) errors.push(`${path}/content_version_id: belongs to another content version`);
      });
    }
    if (bundle.maps.filter(map => map.is_safe_camp === true).length !== 1) errors.push('/maps: exactly one map must be the Safe Camp');
    bundle.loot_tables.forEach((row, index) => {
      if (Number(row.rolls_min) > Number(row.rolls_max)) errors.push(`/loot_tables/${index}: rolls_min must be <= rolls_max`);
    });
    bundle.loot_table_entries.forEach((row, index) => {
      if (Number(row.min_qty) > Number(row.max_qty)) errors.push(`/loot_table_entries/${index}: min_qty must be <= max_qty`);
    });
    return errors;
  };
}
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, entry]) => JSON.stringify(key) + ':' + canonicalJson(entry)).join(',') + '}';
}
export async function sealBundle(bundle: ContentBundle, publishedAt: string): Promise<ContentBundle> {
  const sealed = { ...structuredClone(bundle), published_at: publishedAt };
  delete sealed.checksum;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(sealed)));
  sealed.checksum = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
  return sealed;
}
export interface Difference { path: string; before: unknown; after: unknown }
export function compareBundles(before: unknown, after: unknown, path = ''): Difference[] {
  if (canonicalJson(before) === canonicalJson(after)) return [];
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    const a = before as Record<string, unknown>, b = after as Record<string, unknown>;
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(key => compareBundles(a[key], b[key], path + '/' + key));
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const collection = path.split('/').at(-1) as keyof typeof collectionIdentity;
    const configured = collectionIdentity[collection];
    const fields = configured || ([...before, ...after].every(value => value && typeof value === 'object' && 'id' in value) ? ['id'] : undefined);
    if (fields && [...before, ...after].every(value => value && typeof value === 'object' && fields.every(field => field in value))) {
      const key = (record: ContentRecord) => fields.map(field => String(record[field])).join(':');
      const a = new Map(before.map(record => [key(record), record])), b = new Map(after.map(record => [key(record), record]));
      return [...new Set([...a.keys(), ...b.keys()])].flatMap(identity => compareBundles(a.get(identity), b.get(identity), path + '/' + identity));
    }
  }
  return [{ path: path || '/', before, after }];
}

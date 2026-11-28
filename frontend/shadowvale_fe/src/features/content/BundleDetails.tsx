import { collections, type CollectionKey, type ContentBundle } from './types';
import { collectionIdentity, recordLabel, schemaFields } from './schemaFields';
import { compareBundles } from './validation';
import { Empty } from '../shared/ui';
import { ComparisonView, type Change } from './DiffList';
import { ContentValue } from './ContentValue';
import { fieldLabel } from './comparisonFields';
import { emptyBundle } from './apiModel';

const metadata = ['/version_no', '/label', '/changelog', '/content_version_id', '/checksum', '/published_at'];
function changeLabel(path: string, before: ContentBundle | undefined, after: ContentBundle) {
  const [, key, identity, field, ...nested] = path.split('/');
  const collection = collections.find(collection => collection.key === key);
  if (!collection) return path;
  const rows = [...after[collection.key], ...(before?.[collection.key] || [])];
  const record = rows.find(row => collectionIdentity[collection.key].map(key => String(row[key])).join(':') === identity);
  const label = schemaFields[collection.key].find(definition => definition.key === field)?.label;
  return [collection.label, record ? recordLabel(collection.key, record, after) : identity, field && (label || fieldLabel(field)), ...nested.map(key => fieldLabel(key))].filter(Boolean).join(' · ');
}

/** Every record of a bundle, grouped by content table. */
export function BundleSnapshot({ bundle, section }: { bundle: ContentBundle; section: string }) {
  return <div className="grid gap-2 p-6">{collections.filter(s => section === 'all' || s.key === section).map(s => {
    const content = bundle[s.key];
    return <details key={s.key} open={section !== 'all'} className="rounded-lg border">
      <summary data-testid={'section-' + s.key} className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium">{s.label}<span className="text-xs text-muted-foreground">{content.length}</span></summary>
      <div className="grid gap-1 border-t p-2">{content.map((record, index) => <details key={index} className="rounded-md">
        <summary data-testid={'record-' + s.key + '-' + index} className="cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-muted">{recordLabel(s.key, record, bundle)}</summary>
        <dl className="grid gap-x-6 gap-y-2 px-3 pt-1 pb-3 text-xs sm:grid-cols-2">{schemaFields[s.key as CollectionKey].filter(field => Object.hasOwn(record, field.key) && !['content_version_id', 'created_at', 'updated_at'].includes(field.key)).map(field => <div key={field.key} className="min-w-0">
          <dt className="text-muted-foreground">{field.label}</dt>
          <dd className="min-w-0"><ContentValue value={record[field.key]} /></dd>
        </div>)}</dl>
      </details>)}{!content.length && <Empty title="No records" />}</div>
    </details>;
  })}</div>;
}

export function BundleDetails({ before, after, compact = false }: { before?: ContentBundle; after: ContentBundle; compact?: boolean }) {
  const baseline = before ?? emptyBundle();
  const changes: Change[] = compareBundles(baseline, after)
    .filter(d => !metadata.includes(d.path) && !['api_id', 'content_version_id', 'created_at', 'updated_at'].includes(d.path.split('/').at(-1) || ''))
    .map(d => ({ key: d.path, path: d.path, title: changeLabel(d.path, before, after), kind: d.before === undefined ? 'Added' : d.after === undefined ? 'Removed' : 'Updated', before: d.before, after: d.after }));
  return <ComparisonView compact={compact} changes={changes} beforeLabel={before ? 'Before · Version #' + before.version_no : 'Before · First release'} afterLabel={'After · Version #' + after.version_no} content={section => <BundleSnapshot bundle={after} section={section} />} />;
}

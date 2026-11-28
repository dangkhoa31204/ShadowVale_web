import { displayValue } from '../shared/format';
import { displayFields, fieldLabel } from './comparisonFields';
import type { CollectionKey } from './types';

export function ContentValue({ value, collection }: { value: unknown; collection?: CollectionKey }) {
  if (Array.isArray(value)) return value.length
    ? <ol className="grid list-decimal gap-2 pl-5">{value.map((entry, index) => <li key={index}><ContentValue value={entry} /></li>)}</ol>
    : <span className="text-muted-foreground">None</span>;
  if (value !== null && typeof value === 'object') {
    const fields = displayFields(value);
    return fields.length ? <dl className="grid gap-2">{fields.map(([key, field]) =>
      <div key={key} className="grid gap-0.5 sm:grid-cols-[minmax(7rem,1fr)_minmax(0,2fr)] sm:gap-3">
        <dt className="text-muted-foreground">{fieldLabel(key, collection)}</dt>
        <dd className="min-w-0"><ContentValue value={field} /></dd>
      </div>
    )}</dl> : <span className="text-muted-foreground">None</span>;
  }
  return <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{displayValue(value)}</span>;
}

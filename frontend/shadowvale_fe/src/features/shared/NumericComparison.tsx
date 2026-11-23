import { formatNumericChange } from './numericRules';

const number = new Intl.NumberFormat('vi-VN', { maximumSignificantDigits: 15 });

export function NumericComparison({ before, after, afterLabel, beforeLabel = 'Hiện tại', unit = '', announce = false }: {
  before: number | null;
  after: number | null;
  afterLabel: string;
  beforeLabel?: string;
  unit?: string;
  announce?: boolean;
}) {
  const change = formatNumericChange(before, after);
  const tone = change.direction === 'increase' ? 'text-success'
    : change.direction === 'decrease' ? 'text-destructive' : 'text-muted-foreground';
  const suffix = unit ? (unit === '%' ? '%' : ' ' + unit) : '';
  const value = (n: number | null) => n === null ? '—' : number.format(n) + suffix;
  return <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/20 px-2.5 py-2 text-xs tabular-nums"
    data-change={change.direction} aria-live={announce ? 'polite' : undefined}>
    <div className="min-w-0">
      <div className="text-muted-foreground">{beforeLabel}</div>
      <strong className="font-medium">{value(before)}</strong>
    </div>
    <div className="min-w-0">
      <div className="text-muted-foreground">{afterLabel}</div>
      <strong className={'font-semibold ' + (change.delta ? tone : 'text-foreground')}>{value(after)}</strong>
      {change.delta !== null && <span className={'ml-1.5 whitespace-nowrap ' + tone}>{change.delta === 0
        ? 'Không đổi'
        : (change.delta > 0 ? '+' : '') + number.format(change.delta) + (unit === '%' ? ' điểm %' : suffix)}</span>}
    </div>
  </div>;
}

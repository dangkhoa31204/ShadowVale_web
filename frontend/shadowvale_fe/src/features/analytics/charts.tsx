import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Empty } from '../shared/ui';

export interface BarRow { label: string; value: number; detail: string }

/**
 * One series compared by magnitude: horizontal bars in a single hue, so no legend is needed.
 * The value sits at each bar's tip and the tooltip repeats it for the hovered bar.
 */
export function HorizontalBars({ rows, unit }: { rows: BarRow[]; unit: string }) {
  if (!rows.length) return <Empty title="No data" />;
  const config = { value: { label: unit, color: 'var(--chart-1)' } } satisfies ChartConfig;
  return <ChartContainer config={config} className="aspect-auto w-full px-6 pb-5" style={{ height: rows.length * 40 + 20 }}>
    <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 132, bottom: 0, left: 0 }} barSize={20} accessibilityLayer>
      <CartesianGrid horizontal={false} stroke="var(--border)" />
      <YAxis dataKey="label" type="category" width={124} tickLine={false} axisLine={false} tick={{ fill: 'var(--foreground)' }} />
      <XAxis type="number" dataKey="value" hide domain={[0, 'dataMax']} />
      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
      <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]}>
        <LabelList dataKey="detail" position="right" offset={8} className="fill-muted-foreground" fontSize={11} />
      </Bar>
    </BarChart>
  </ChartContainer>;
}

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { ScalabilityRowDto } from '../../services/api/contracts';
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

/** Sessions per day: one series over time, as columns on a shared zero baseline. */
export function DailyColumns({ rows, unit }: { rows: { day: string; value: number }[]; unit: string }) {
  if (!rows.length) return <Empty title="No data" />;
  const config = { value: { label: unit, color: 'var(--chart-1)' } } satisfies ChartConfig;
  return <ChartContainer config={config} className="aspect-auto h-64 w-full px-4 pb-4">
    <BarChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
      <CartesianGrid vertical={false} stroke="var(--border)" />
      <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} tickFormatter={(day: string) => day.slice(5)} />
      <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} />
      <ChartTooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltipContent indicator="line" />} />
      <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={32} />
    </BarChart>
  </ChartContainer>;
}

// Six validated categorical slots; more series than that are listed in the table only.
const maxSeries = 6;

/** p95 solver latency against squad size, one line per configuration and node range. */
export function LatencyChart({ rows }: { rows: ScalabilityRowDto[] }) {
  const groups = new Map<string, ScalabilityRowDto[]>();
  for (const row of rows) if (row.latencyP95Ms !== null && row.latencyP95Ms !== undefined) {
    const key = row.code + ' · ' + row.nodesFrom + '–' + row.nodesTo + ' nodes';
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  if (!groups.size) return <Empty title="No latency samples" />;
  const series = [...groups.keys()].slice(0, maxSeries);
  const config = Object.fromEntries(series.map((key, i) => ['s' + i, { label: key, color: `var(--chart-${i + 1})` }])) satisfies ChartConfig;
  // One row per agent count; each series fills its own column.
  const byAgents = new Map<number, Record<string, number>>();
  series.forEach((key, i) => { for (const row of groups.get(key)!) {
    const agents = Number(row.numAgents), point = byAgents.get(agents) ?? { agents };
    point['s' + i] = Number(row.latencyP95Ms); byAgents.set(agents, point);
  } });
  const data = [...byAgents.values()].sort((a, b) => a.agents - b.agents);
  return <div className="grid gap-2 px-4 pb-4">
    <ChartContainer config={config} className="aspect-auto h-80 w-full">
      <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="agents" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} label={{ value: 'Number of agents', position: 'insideBottom', offset: -4, fill: 'var(--muted-foreground)', fontSize: 12 }} />
        <YAxis width={56} tickLine={false} axisLine={false} label={{ value: 'p95 latency (ms)', angle: -90, position: 'insideLeft', fill: 'var(--muted-foreground)', fontSize: 12, dy: 50 }} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(_, payload) => payload?.[0]?.payload.agents + ' agents'} />} />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((_, i) => <Line key={i} dataKey={'s' + i} type="monotone" stroke={`var(--color-s${i})`} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)', fill: `var(--color-s${i})` }} activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)' }} connectNulls />)}
      </LineChart>
    </ChartContainer>
    <p className="px-2 text-xs text-muted-foreground">Each point is one BE aggregate bin; node ranges remain separate series.{groups.size > maxSeries && ` Showing ${maxSeries} of ${groups.size} series · the table lists all.`}</p>
  </div>;
}

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, Scatter, ScatterChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { FunnelDto, HistogramBucketDto, ScalabilityRowDto } from '../../services/api/contracts';
import { Empty } from '../shared/ui';
import { familyNames, num, pct } from './analyticsPresentation';

const sessionsConfig = { sessions: { label: 'Sessions', color: 'var(--chart-1)' } };
const outcomeConfig = {
  completed: { label: 'Completed', color: 'var(--chart-1)' },
  notCompleted: { label: 'Not completed', color: 'var(--chart-4)' },
};
const familyColors: Record<string, string> = {
  classical: 'var(--chart-4)',
  quantum_inspired: 'var(--chart-2)',
  quantum_hardware: 'var(--chart-5)',
};

export function MissionProgressChart({ steps, started }: { steps: { name: string; label: string; sessions: number }[]; started: number }) {
  return <ChartContainer config={sessionsConfig} className="h-64 w-full aspect-auto px-3">
    <AreaChart data={steps} margin={{ left: 0, right: 16, top: 12 }} accessibilityLayer>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="label" minTickGap={18} tickLine={false} axisLine={false} />
      <YAxis width={44} allowDecimals={false} domain={[0, started]} tickLine={false} axisLine={false} />
      <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload[0]?.payload?.name} />} />
      <Area isAnimationActive={false} dataKey="sessions" type="linear" stroke="var(--color-sessions)" fill="var(--color-sessions)" fillOpacity={0.18} strokeWidth={2} activeDot={{ r: 5 }} />
    </AreaChart>
  </ChartContainer>;
}

export function CompletionDonut({ funnel }: { funnel: FunnelDto }) {
  const started = Number(funnel.sessionsStarted);
  if (!started) return <Empty title="No mission starts" />;
  const completed = Number(funnel.missionsCompleted);
  const outcomes = [
    { name: 'completed', sessions: completed, fill: 'var(--color-completed)' },
    { name: 'notCompleted', sessions: started - completed, fill: 'var(--color-notCompleted)' },
  ] as const;
  return <>
    <div className="relative mx-auto w-full max-w-60">
      <ChartContainer config={outcomeConfig} className="h-48 w-full aspect-auto">
        <PieChart accessibilityLayer>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
          <Pie isAnimationActive={false} data={[...outcomes]} dataKey="sessions" nameKey="name" innerRadius="67%" outerRadius="88%" stroke="var(--card)" />
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <span className="text-2xl font-semibold tabular-nums">{pct(funnel.completionRate)}</span>
        <span className="text-xs text-muted-foreground">Completed</span>
      </div>
    </div>
    <ul className="grid gap-2 px-5 pb-5 text-sm">
      {outcomes.map(outcome => <li key={outcome.name} className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: outcomeConfig[outcome.name].color }} />{outcomeConfig[outcome.name].label}</span>
        <span className="tabular-nums text-muted-foreground">{num(outcome.sessions)}</span>
      </li>)}
    </ul>
  </>;
}

export function StealthHistogram({ buckets }: { buckets: HistogramBucketDto[] }) {
  if (!buckets.some(bucket => Number(bucket.sessions) > 0)) return <Empty title="No sessions with kills" />;
  const data = buckets.map(bucket => ({
    label: (Number(bucket.from) * 100).toLocaleString('en-GB') + '–' + (Number(bucket.to) * 100).toLocaleString('en-GB') + '%',
    sessions: Number(bucket.sessions),
  }));
  return <ChartContainer config={{ sessions: { label: 'Sessions', color: 'var(--chart-2)' } }} className="h-60 w-full aspect-auto px-3">
    <BarChart data={data} barCategoryGap="12%" margin={{ top: 12, right: 12, left: 0 }} accessibilityLayer>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="label" minTickGap={10} tickLine={false} axisLine={false} />
      <YAxis width={36} allowDecimals={false} tickLine={false} axisLine={false} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Bar isAnimationActive={false} dataKey="sessions" fill="var(--color-sessions)" radius={[3, 3, 0, 0]} />
    </BarChart>
  </ChartContainer>;
}

export function SolverLatencyScatter({ rows }: { rows: ScalabilityRowDto[] }) {
  const points = rows.filter(row => row.latencyP95Ms != null).map(row => ({
    family: row.family, solver: row.code,
    graphSize: (Number(row.nodesFrom) + Number(row.nodesTo)) / 2,
    nodeRange: row.nodesFrom + '–' + row.nodesTo,
    latency: Number(row.latencyP95Ms), agents: row.numAgents, replans: row.replans,
  }));
  if (!points.length) return <Empty title="No latency samples for these filters" />;
  const families = [...new Set(points.map(point => point.family))];
  return <>
    <ChartContainer config={{ graphSize: { label: 'Graph nodes' }, latency: { label: 'P95 latency' } }} className="h-64 w-full aspect-auto">
      <ScatterChart margin={{ top: 10, right: 18, left: 0, bottom: 20 }} accessibilityLayer>
        <CartesianGrid />
        <XAxis type="number" dataKey="graphSize" name="Graph bucket midpoint" label={{ value: 'Graph nodes (bucket midpoint)', position: 'insideBottom', offset: -10 }} />
        <YAxis type="number" dataKey="latency" unit=" ms" name="P95 latency" width={66} />
        <ChartTooltip cursor={{ strokeDasharray: '4 4' }} content={({ active, payload }) => {
          const point = payload?.[0]?.payload as (typeof points)[number] | undefined;
          if (!active || !point) return null;
          return <div className="grid gap-1 rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
            <strong>{point.solver}</strong>
            <span>{num(point.latency)} ms P95</span>
            <span>{point.nodeRange} nodes · {point.agents} agents · {num(point.replans)} replans</span>
          </div>;
        }} />
        {families.map(family => <Scatter isAnimationActive={false} key={family} name={familyNames[family] ?? family} data={points.filter(point => point.family === family)} fill={familyColors[family] ?? 'var(--chart-1)'} fillOpacity={0.8} />)}
      </ScatterChart>
    </ChartContainer>
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 pb-3 text-xs text-muted-foreground">
      {families.map(family => <li key={family} className="flex items-center gap-2">
        <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: familyColors[family] ?? 'var(--chart-1)' }} />{familyNames[family] ?? family}
      </li>)}
    </ul>
  </>;
}

import { useState, type ReactNode } from 'react';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AiComparisonRowDto, ScalabilityRowDto } from '../../services/api/contracts';
import { Empty, Panel, panelTable } from '../shared/ui';
import type { analyticsApi } from './analyticsApi';
import { familyNames, mapNames, num, pct } from './analyticsPresentation';

type Gameplay = Awaited<ReturnType<typeof analyticsApi.gameplay>>;
const weaponNames: Record<string, string> = { knife: 'Knife', rifle_standard: 'AK47', rifle_m16: 'M16', rifle_mosin: 'Mosin', pistol_k54: 'K-54' };

export function MetricsTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <Empty title="No data for these filters" />;
  return <div className="overflow-x-auto"><Table className={panelTable}>
    <TableHeader><TableRow>{headers.map(header => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader>
    <TableBody>{rows.map((row, index) => <TableRow key={index}>{row.map((value, column) => <TableCell key={column}>{value}</TableCell>)}</TableRow>)}</TableBody>
  </Table></div>;
}

export function MetricTiles({ items }: { items: { label: string; value: string; note: string }[] }) {
  return <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {items.map(item => <div key={item.label} className="rounded-xl border bg-card px-5 py-4">
      <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
      <dd className="my-1 text-3xl font-semibold tracking-tight tabular-nums">{item.value}</dd>
      <dd className="text-xs text-muted-foreground">{item.note}</dd>
    </div>)}
  </dl>;
}

function Distribution({ rows, ceiling }: { rows: { name: string; value: number; text: string; tone?: string }[]; ceiling?: number }) {
  if (!rows.length) return <Empty title="No data for these filters" />;
  const max = Math.max(Number.EPSILON, ceiling ?? 0, ...rows.map(row => row.value));
  return <ul className="grid gap-3 px-5 pt-3 pb-5">
    {rows.map((row, index) => <li key={index} className="grid gap-1.5">
      <div className="flex items-start justify-between gap-3 text-sm"><span className="wrap-anywhere">{row.name}</span><span className="shrink-0 tabular-nums text-muted-foreground">{row.text}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={'h-full rounded-full ' + (row.tone ?? 'bg-chart-1')} style={{ width: Math.max(0, row.value / max * 100) + '%' }} />
      </div>
    </li>)}
  </ul>;
}

export function GameplayPanels({ data, map }: { data: Gameplay; map: string }) {
  const { funnel, weapons, playstyle } = data;
  const steps = funnel.objectives.map(step => ({
    ...step, name: [step.mapCode && !map ? mapNames[step.mapCode] ?? step.mapCode : '', step.objectiveCode || 'Objective ' + step.objectiveIndex].filter(Boolean).join(' · '),
  }));
  const rankedWeapons = [...weapons.weapons].sort((a, b) => Number(b.sessionsUsed) - Number(a.sessionsUsed) || Number(b.shots) - Number(a.shots));
  return <>
    <MetricTiles items={[
      { label: 'Sessions started', value: num(funnel.sessionsStarted), note: 'Matching the active filters' },
      { label: 'Mission completion', value: pct(funnel.completionRate), note: num(funnel.missionsCompleted) + ' completed sessions' },
      { label: 'Average stealth ratio', value: pct(playstyle.avgStealthRatio), note: 'Finished sessions with kills' },
      { label: 'Average detections', value: num(playstyle.avgTimesDetected), note: 'Per finished session' },
    ]} />
    <Panel title="Mission funnel" description={map ? 'Distinct sessions reaching each objective, ordered by telemetry index.' : 'Counts use all matching sessions. Choose a map to follow its objectives.'}>
      <Distribution ceiling={Number(funnel.sessionsStarted)} rows={[
        { name: 'Started', value: Number(funnel.sessionsStarted), text: num(funnel.sessionsStarted) },
        ...(map ? steps.slice(0, 6) : []).map(step => ({ name: step.name, value: Number(step.sessions), text: num(step.sessions) + ' · ' + pct(step.shareOfStarted) })),
        { name: 'Completed', value: Number(funnel.missionsCompleted), text: num(funnel.missionsCompleted) + ' · ' + pct(funnel.completionRate) },
      ]} />
      {!!steps.length && <details className="border-t px-5 py-3 text-sm"><summary className="cursor-pointer font-medium">All recorded objectives ({steps.length})</summary>
        <MetricsTable headers={['Objective', 'Index', 'Sessions', 'Share of starts']} rows={steps.map(step => [step.name, step.objectiveIndex, num(step.sessions), pct(step.shareOfStarted)])} />
      </details>}
    </Panel>
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <Panel title="Weapon usage" description={num(weapons.finishedSessions) + ' finished sessions · Share using each weapon'}>
        <Distribution ceiling={Number(weapons.finishedSessions)} rows={rankedWeapons.slice(0, 6).map(weapon => ({ name: weaponNames[weapon.weapon] ?? weapon.weapon, value: Number(weapon.sessionsUsed), text: pct(weapon.sessionShare) + ' · ' + num(weapon.sessionsUsed) }))} />
        {!!rankedWeapons.length && <details className="border-t px-5 py-3 text-sm"><summary className="cursor-pointer font-medium">Shots and kills by weapon</summary>
          <MetricsTable headers={['Weapon', 'Sessions', 'Shots', 'Kills', 'Kills / shot']} rows={rankedWeapons.map(weapon => [weaponNames[weapon.weapon] ?? weapon.weapon, num(weapon.sessionsUsed), num(weapon.shots), num(weapon.kills), num(weapon.killsPerShot)])} />
        </details>}
      </Panel>
      <Panel title="Stealth vs combat" description={num(playstyle.sessionsWithoutKills) + ' sessions without kills · Excluded from the ratio'}>
        <Distribution rows={playstyle.stealthRatioHistogram.map(bucket => ({ name: pct(bucket.from) + '–' + pct(bucket.to) + ' stealth kills', value: Number(bucket.sessions), text: num(bucket.sessions), tone: 'bg-chart-2' }))} />
      </Panel>
    </div>
  </>;
}

const aiMetrics = {
  captureRate: { label: 'Capture rate', format: pct, detail: 'Captured encounters divided by completed encounters.' },
  avgEscapeSeconds: { label: 'Average escape time', format: (value: number | string | null) => value == null ? '—' : num(value) + ' s', detail: 'Average duration among escapes.' },
  avgCoordinationScore: { label: 'Average coordination score', format: num, detail: 'Average score across recorded replans.' },
} as const;
type AiMetric = keyof typeof aiMetrics;

export function ComparisonPanel({ rows }: { rows: AiComparisonRowDto[] }) {
  const [metric, setMetric] = useState<AiMetric>('captureRate');
  const selected = aiMetrics[metric];
  const versions = [...new Set(rows.map(row => row.contentVersionId))];
  const ceiling = metric === 'captureRate' ? 1 : Math.max(0, ...rows.map(row => Number(row[metric] ?? 0)));
  return <Panel title="AI variant comparison" description={selected.detail} action={<NativeSelect aria-label="Comparison metric" value={metric} onChange={event => setMetric(event.target.value as AiMetric)}>
    {Object.entries(aiMetrics).map(([key, value]) => <NativeSelectOption key={key} value={key}>{value.label}</NativeSelectOption>)}
  </NativeSelect>}>
    {!rows.length && <Empty title="No AI telemetry for these filters" />}
    {versions.map(version => {
      const cohort = rows.filter(row => row.contentVersionId === version);
      return <section key={version ?? 'unversioned'} className="border-t pt-4">
        <h3 className="px-5 pb-3 text-sm font-semibold">{cohort[0].contentVersionLabel ?? (version || 'Unversioned sessions')}</h3>
        <Distribution ceiling={ceiling} rows={cohort.filter(row => row[metric] != null).map(row => ({
          name: familyNames[row.groupLabel] ?? row.groupLabel,
          value: Number(row[metric]), text: selected.format(row[metric]),
          tone: row.family === 'classical' ? 'bg-chart-4' : row.family === 'quantum_inspired' ? 'bg-chart-2' : 'bg-chart-5',
        }))} />
      </section>;
    })}
    {!!rows.length && <details className="border-t px-5 py-3 text-sm"><summary className="cursor-pointer font-medium">Metrics and sample sizes</summary>
      <MetricsTable headers={['Content version', 'Solver group', 'Family', 'Sessions', 'Encounters', 'Captures', 'Escapes', 'Capture rate', 'Escape time (s)', 'Coordination', 'Replans', 'P95 latency (ms)', 'Within budget', 'Fallback']} rows={rows.map(row => [
        row.contentVersionLabel ?? row.contentVersionId ?? 'Unversioned', familyNames[row.groupLabel] ?? row.groupLabel, familyNames[row.family] ?? row.family,
        num(row.sessions), num(row.encounters), num(row.captures), num(row.escapes), pct(row.captureRate), num(row.avgEscapeSeconds), num(row.avgCoordinationScore),
        num(row.replans), num(row.latencyP95Ms), pct(row.withinBudgetRate), pct(row.fallbackRate),
      ])} />
    </details>}
  </Panel>;
}

export function ScalabilityTable({ rows }: { rows: ScalabilityRowDto[] }) {
  return <MetricsTable headers={['Configuration', 'Family', 'Agents', 'Graph nodes', 'Replans', 'P50 (ms)', 'P95 (ms)', 'Objective value', 'Within budget']}
    rows={rows.map(row => [row.code, familyNames[row.family] ?? row.family, row.numAgents, row.nodesFrom + '–' + row.nodesTo, num(row.replans),
      num(row.latencyP50Ms), num(row.latencyP95Ms), num(row.avgObjective), pct(row.withinBudgetRate)])} />;
}

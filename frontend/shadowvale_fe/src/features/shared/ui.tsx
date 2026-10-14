import type { ReactNode } from 'react';
import {
  Archive, ArrowRight, ArrowUpRight, BadgeCheck, Bot, Brain, ChartLine, Check, ChevronDown, ChevronRight, Circle, CircleAlert, CircleUser,
  ClipboardCheck, Copy, Download, Eye, EyeOff, FilePen, Flag, GitBranch, Gift, Globe, GraduationCap, Hammer, HeartPulse, History, Inbox,
  Key, KeyRound, LayoutDashboard, ListChecks, Lock, LogOut, Map as MapIcon, MapPin, MapPinned, Menu, Package, Pencil, Plus, RefreshCw,
  Save, Search, Send, Shapes, ShieldUser, Swords, Trash2, Undo2, User, UserPlus, Users, Wrench, X, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty as EmptyState, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Link } from 'react-router-dom';
import type { DraftStatus } from '../content/types';
import { actionLabels, dateLabel } from './format';

/** Names used by pages, navigation and content collections, mapped to shadcn's icon set (lucide). */
const icons: Record<string, LucideIcon> = {
  account_circle: CircleUser, account_tree: GitBranch, add: Plus, arrow_forward: ArrowRight, arrow_outward: ArrowUpRight, category: Shapes,
  check: Check, chevron_right: ChevronRight, close: X, construction: Hammer, content_copy: Copy, dashboard: LayoutDashboard, delete: Trash2,
  deployed_code: Package, download: Download, edit: Pencil, edit_note: FilePen, error: CircleAlert, expand_more: ChevronDown, fact_check: ClipboardCheck,
  flag: Flag, group: Users, handyman: Wrench, healing: HeartPulse, history: History, inbox: Inbox, inventory_2: Archive, key: Key,
  list_alt: ListChecks, location_on: MapPinned, lock: Lock, lock_reset: KeyRound, logout: LogOut, map: MapIcon, menu: Menu, monitoring: ChartLine,
  neurology: Brain, person: User, person_add: UserPlus, pin_drop: MapPin, public: Globe, redeem: Gift, save: Save, school: GraduationCap,
  search: Search, send: Send, shield_person: ShieldUser, smart_toy: Bot, swords: Swords, sync: RefreshCw, undo: Undo2, verified: BadgeCheck,
  visibility: Eye, visibility_off: EyeOff,
};

export function Icon({ name, className = '' }: { name: string; className?: string }) {
  const Glyph = icons[name] ?? Circle;
  return <Glyph aria-hidden="true" className={cn('sv-icon size-4 shrink-0', className)} />;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="sv-page-heading"><div>{eyebrow && <span className="sv-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="sv-heading-actions">{action}</div>}</div>;
}

/** Card with an optional title row; content is flush so tables and lists reach the edges. */
export function Panel({ title, description, action, className, children }: { title?: ReactNode; description?: ReactNode; action?: ReactNode; className?: string; children?: ReactNode }) {
  return <Card className={cn('gap-0 py-0 [--card-spacing:--spacing(6)]', className)}>
    {(title || action) && <CardHeader className="border-b py-5">
      {title && <CardTitle><h2 className="text-base font-semibold">{title}</h2></CardTitle>}
      {description && <CardDescription className="text-xs">{description}</CardDescription>}
      {action && <CardAction className="flex items-center gap-2">{action}</CardAction>}
    </CardHeader>}
    {children}
  </Card>;
}

/** KPI tile; with `to` the whole tile links to the page that acts on the number. */
export function StatCard({ label, value, detail, icon, to }: { label: string; value: ReactNode; detail?: ReactNode; icon?: string; to?: string }) {
  const body = <Card className={cn('h-full gap-3 px-5', to && 'transition-colors hover:bg-accent')}>
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{label}</span>{icon && <Icon name={icon} />}</div>
    <strong className="text-3xl font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere]">{value}</strong>
    {detail && <small className="truncate text-xs text-muted-foreground">{detail}</small>}
  </Card>;
  return to ? <Link to={to} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">{body}</Link> : body;
}

/** Publication audit trail: newest first. */
export function ActivityList({ items, empty }: { items: { id: string; action: string; target: string; actor: string; at: string }[]; empty: string }) {
  if (!items.length) return <Empty title={empty} />;
  return <ol className="grid gap-5 p-6">{items.map(a => <li key={a.id} className="flex gap-3">
    <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
    <div className="min-w-0"><strong className="block text-sm font-medium">{actionLabels[a.action] || a.action}</strong><p className="truncate text-sm text-muted-foreground">{a.target}</p><small className="text-xs text-muted-foreground">{a.actor} · {dateLabel(a.at)}</small></div>
  </li>)}</ol>;
}

/** Table spacing inside a Panel: cells line up with the panel's 24px padding. */
export const panelTable = '[&_th]:px-6 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:px-6 [&_td]:py-3 [&_tr]:border-border';

type StatusValue = DraftStatus | 'active' | 'inactive' | 'archived';
const statusTone: Record<string, string> = {
  approved: 'bg-success/10 text-success', published: 'bg-success/10 text-success', active: 'bg-success/10 text-success',
  in_review: 'bg-warning/10 text-warning', rejected: 'bg-destructive/10 text-destructive',
};
export function Status({ value }: { value: StatusValue }) {
  const label = value === 'in_review' ? 'In review' : value.charAt(0).toUpperCase() + value.slice(1);
  return <Badge variant="secondary" className={cn('text-muted-foreground', statusTone[value])}>{label}</Badge>;
}

export function Empty({ title, description }: { title: string; description?: string }) {
  return <EmptyState className="py-8">
    <EmptyHeader>
      <EmptyMedia variant="icon"><Icon name="inbox" /></EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      {description && <EmptyDescription>{description}</EmptyDescription>}
    </EmptyHeader>
  </EmptyState>;
}

import type { ReactNode } from 'react';
import {
  Archive, ArrowRight, BadgeCheck, Bot, ChartLine, Check, ChevronDown, ChevronRight, Circle, CircleAlert, CircleUser,
  ClipboardCheck, Copy, Eye, EyeOff, FilePen, Flag, Gift, Globe, GraduationCap, Hammer, HeartPulse, Inbox,
  Key, KeyRound, ListChecks, Lock, LogOut, Map as MapIcon, MapPin, MapPinned, Menu, Package, Pencil, Plus, RefreshCw,
  Save, Search, Send, Shapes, ShieldUser, Swords, Trash2, Undo2, UserPlus, Users, Wrench, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty as EmptyState, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { DraftStatus } from '../content/types';

/** Names used by pages, navigation and content collections, mapped to shadcn's icon set (lucide). */
const icons: Record<string, LucideIcon> = {
  account_circle: CircleUser, add: Plus, arrow_forward: ArrowRight, category: Shapes,
  check: Check, chevron_right: ChevronRight, construction: Hammer, content_copy: Copy, delete: Trash2,
  deployed_code: Package, edit: Pencil, edit_note: FilePen, error: CircleAlert, expand_more: ChevronDown, fact_check: ClipboardCheck,
  flag: Flag, group: Users, handyman: Wrench, healing: HeartPulse, inbox: Inbox, inventory_2: Archive, key: Key,
  list_alt: ListChecks, location_on: MapPinned, lock: Lock, lock_reset: KeyRound, logout: LogOut, map: MapIcon, menu: Menu, monitoring: ChartLine,
  person_add: UserPlus, pin_drop: MapPin, public: Globe, redeem: Gift, save: Save, school: GraduationCap,
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

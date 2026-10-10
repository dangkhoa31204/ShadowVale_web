import type { ReactNode } from 'react';
import type { DraftStatus } from '../content/types';
import { useTranslation } from '../preferences/preferencesContext';
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={'material-symbols-outlined sv-icon ' + className}>{name}</span>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  const t = useTranslation();
  return <div className="sv-page-heading"><div>{eyebrow && <span className="sv-eyebrow">{t(eyebrow)}</span>}<h1>{t(title)}</h1>{description && <p>{t(description)}</p>}</div>{action && <div className="sv-heading-actions">{action}</div>}</div>;
}
export function Status({ value }: { value: DraftStatus | 'active' | 'inactive' | 'archived' | 'awaiting_build' | 'failed' | 'ready' | 'rejected' | 'added' | 'modified' | 'removed' | 'renamed' }) {
  const t = useTranslation();
  const color = ['approved', 'published', 'active', 'added'].includes(value) ? 'success' : ['rejected', 'failed', 'removed'].includes(value) ? 'error' : ['in_review', 'awaiting_build'].includes(value) ? 'warning' : ['draft', 'archived', 'inactive'].includes(value) ? 'light' : 'primary';
  const labels: Record<string, string> = { in_review: 'In review', awaiting_build: 'Awaiting build' };
  return <span className={"sv-status sv-status-" + color}>{t(labels[value] || value.charAt(0).toUpperCase() + value.slice(1))}</span>;
}
export function Empty({ title, description }: { title: string; description?: string }) {
  const t = useTranslation();
  return <div className="sv-empty"><Icon name="inbox" /><h3>{t(title)}</h3>{description && <p>{description}</p>}</div>;
}

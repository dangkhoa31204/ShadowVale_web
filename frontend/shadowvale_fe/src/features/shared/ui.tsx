import type { ReactNode } from 'react';
import type { DraftStatus } from '../content/types';
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={'material-symbols-outlined sv-icon ' + className}>{name}</span>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="sv-page-heading"><div>{eyebrow && <span className="sv-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="sv-heading-actions">{action}</div>}</div>;
}
export function Status({ value }: { value: DraftStatus | 'active' | 'inactive' | 'archived' | 'awaiting_build' | 'failed' | 'ready' | 'rejected' | 'added' | 'modified' | 'removed' | 'renamed' }) {
  return <span className={'sv-status sv-status-' + value}><span />{value.replaceAll('_', ' ')}</span>;
}
export function Empty({ title, description }: { title: string; description?: string }) {
  return <div className="sv-empty"><Icon name="inbox" /><h3>{title}</h3>{description && <p>{description}</p>}</div>;
}

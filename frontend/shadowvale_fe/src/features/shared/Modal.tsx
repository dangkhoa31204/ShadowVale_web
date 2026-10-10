import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './ui';
import { useTranslation } from '../preferences/preferencesContext';
export function Modal({ title, children, onClose, busy = false, wide = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
  const id = useId(), ref = useRef<HTMLElement>(null), t = useTranslation();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; ref.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return createPortal(<div className="portal sv-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <section ref={ref} tabIndex={-1} className={'sv-modal sv-centered-modal ' + (wide ? 'sv-modal-wide' : '')} role="dialog" aria-modal="true" aria-labelledby={id} onKeyDown={e => {
      if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') {
        const nodes = [...(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') || [])].filter(n => n.offsetParent !== null);
        const first = nodes[0], last = nodes.at(-1);
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
      }
    }}><header className="sv-modal-heading"><h2 id={id}>{title}</h2><button className="sv-icon-button" type="button" aria-label={t('Close')} disabled={busy} onClick={onClose}><Icon name="close" /></button></header>{children}</section>
  </div>, document.body);
}

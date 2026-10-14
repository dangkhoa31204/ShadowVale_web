import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** shadcn Dialog with the portal's sizes; it stays open while `busy` so a request is never orphaned. */
export function Modal({ title, description, children, onClose, busy = false, wide = false, scrollable = false, eyebrow }: { title: string; description?: ReactNode; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean; scrollable?: boolean; eyebrow?: string }) {
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent showCloseButton={!busy} className={cn('gap-5 p-6 sm:max-w-xl', wide && 'sm:max-w-6xl', scrollable && 'grid-rows-[auto_minmax(0,1fr)] h-[calc(100dvh-3rem)] p-0 gap-0')}
      onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onInteractOutside={e => { if (busy) e.preventDefault(); }}>
      {/* `contents` keeps the grid layout while legacy portal styles (inherited tokens, sv-* content) apply inside. */}
      <div className="portal contents">
      <DialogHeader className={cn('min-w-0 pr-8', scrollable && 'border-b p-6')}>
        {eyebrow && <span className="sv-eyebrow">{eyebrow}</span>}
        <DialogTitle className="text-xl font-semibold [overflow-wrap:anywhere]">{title}</DialogTitle>
        {description ? <DialogDescription className="[overflow-wrap:anywhere]">{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
      </DialogHeader>
      {scrollable ? <div className="min-h-0 overflow-y-auto overscroll-contain" tabIndex={0} role="region" aria-label={title}>{children}</div> : children}
      </div>
    </DialogContent>
  </Dialog>;
}

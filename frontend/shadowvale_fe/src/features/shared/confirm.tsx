import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ConfirmContext, type Confirm, type ConfirmOptions } from './confirmContext';

/** Promise-based AlertDialog so handlers can `if (!await confirm(...)) return;` like window.confirm. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(undefined);
  const confirm = useCallback<Confirm>(next => new Promise(resolve => { resolver.current?.(false); resolver.current = resolve; setOptions(next); }), []);
  const settle = (value: boolean) => { resolver.current?.(value); resolver.current = undefined; setOptions(null); };
  return <ConfirmContext.Provider value={confirm}>
    {children}
    <AlertDialog open={!!options} onOpenChange={open => { if (!open) settle(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={options?.destructive ? 'destructive' : 'default'} onClick={() => settle(true)}>{options?.action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </ConfirmContext.Provider>;
}


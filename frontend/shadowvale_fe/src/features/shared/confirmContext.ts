import { createContext, useContext } from 'react';

export interface ConfirmOptions { title: string; description?: string; action: string; destructive?: boolean }
export type Confirm = (options: ConfirmOptions) => Promise<boolean>;
export const ConfirmContext = createContext<Confirm | null>(null);

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('ConfirmProvider is missing.');
  return confirm;
}

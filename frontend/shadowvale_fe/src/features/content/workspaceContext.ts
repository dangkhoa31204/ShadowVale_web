import { createContext, useContext } from 'react';
import type { Command, Workspace } from './types';
export interface WorkspaceContextValue {
  state: Workspace; busy: boolean;
  execute: (command: Command) => Promise<Workspace>;
  reload: () => Promise<void>;
}
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('Workspace provider is missing.');
  return context;
}

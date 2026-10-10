import { createContext, useContext } from 'react';
import type { DeliveryState, GameBuild } from './types';
export interface GameDeliveryContextValue {
  state: DeliveryState; loading: boolean; busy: boolean; error: string; refresh: () => Promise<void>;
  resetDemo: () => Promise<void>;
  review: (build: GameBuild, approve: boolean, note: string) => Promise<void>;
  publish: (build: GameBuild, version: string, notes: string) => Promise<void>;
}
export const GameDeliveryContext = createContext<GameDeliveryContextValue | null>(null);
export function useGameDelivery() { const value = useContext(GameDeliveryContext); if (!value) throw new Error('Game delivery provider missing.'); return value; }

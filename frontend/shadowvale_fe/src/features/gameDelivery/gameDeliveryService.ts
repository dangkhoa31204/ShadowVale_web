
import { isDemoMode } from '../../config/environment';
import { storageService } from '../../services/storage/storageService';
import seed from '../content/contracts/demo-bundle.json';
import type { ContentBundle } from '../content/types';
import { createDemoDelivery, reviewDemoBuild, publishDemoBuild } from './demoGameDelivery';
import type { DeliveryState, GameBuild } from './types';
const demoKey = 'shadowvale_game_delivery_demo_v3';
async function loadDemo(): Promise<DeliveryState> {
  try {
    const saved = JSON.parse(localStorage.getItem(demoKey) || 'null') as DeliveryState | null;
    if (saved && Array.isArray(saved.builds) && saved.builds.every(b => typeof b.id === 'string' && typeof b.commit === 'string' && Array.isArray(b.changes) && Array.isArray(b.previews) && Array.isArray(b.artifacts)) && Array.isArray(saved.releases) && saved.active && typeof saved.active === 'object') return saved;
  } catch { /* Outdated or invalid demo data is replaced below. */ }
  const state = await createDemoDelivery(seed as ContentBundle); localStorage.setItem(demoKey, JSON.stringify(state)); return state;
}
function demoActor() { const user = storageService.getUser(); if (user?.role !== 'admin') throw new Error('Admin role required.'); return user.callsign; }
export const gameDeliveryService = {
  resetDemo: async () => { if (!isDemoMode) throw new Error('Demo mode required.'); demoActor(); const state = await createDemoDelivery(seed as ContentBundle); localStorage.setItem(demoKey, JSON.stringify(state)); },
  load: async () => { if (!isDemoMode) throw new Error('Git/CI and game delivery have no backend API yet.'); return loadDemo(); },
  review: async (build: GameBuild, approve: boolean, note: string) => { if (!isDemoMode) throw new Error('Build review has no backend API.'); const state = reviewDemoBuild(await loadDemo(), build, approve, note, demoActor()); localStorage.setItem(demoKey, JSON.stringify(state)); return state; },
  publish: async (build: GameBuild, version: string, notes: string) => { if (!isDemoMode) throw new Error('Game asset publication has no backend API.'); const state = await publishDemoBuild(await loadDemo(), build, version, notes, demoActor()); localStorage.setItem(demoKey, JSON.stringify(state)); return state; },
  preview: async (buildId: string, file: string, signal: AbortSignal, sourcePath?: string) => { if (isDemoMode) { const preview = (await loadDemo()).builds.find(b => b.id === buildId)?.previews.find(p => p.file === file); if (!preview?.url) throw new Error('Preview unavailable.'); const response = await fetch(preview.url, { signal }); if (!response.ok) throw new Error('Preview unavailable.'); return response.blob(); } void sourcePath; throw new Error('Game preview has no backend API.'); },
};

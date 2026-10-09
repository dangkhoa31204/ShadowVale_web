import { axiosClient } from '../../services/api/axiosClient';
import { isDemoMode } from '../../config/environment';
import { storageService } from '../../services/storage/storageService';
import seed from '../content/contracts/demo-bundle.json';
import type { ContentBundle } from '../content/types';
import { createDemoDelivery, reviewDemoBuild, publishDemoBuild } from './demoGameDelivery';
import type { DeliveryState, GameBuild, GameManifest } from './types';
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
  load: async () => isDemoMode ? loadDemo() : (await axiosClient.get<DeliveryState>('/internal/game-builds')).data,
  review: async (build: GameBuild, approve: boolean, note: string) => { if (!isDemoMode) return (await axiosClient.post<GameBuild>('/internal/game-builds/' + encodeURIComponent(build.id) + '/review', { revision: build.revision, approve, note })).data; const state = reviewDemoBuild(await loadDemo(), build, approve, note, demoActor()); localStorage.setItem(demoKey, JSON.stringify(state)); return state; },
  publish: async (build: GameBuild, version: string, notes: string) => { if (!isDemoMode) return (await axiosClient.post<GameManifest>('/internal/game-releases', { build_id: build.id, revision: build.revision, version, notes })).data; const state = await publishDemoBuild(await loadDemo(), build, version, notes, demoActor()); localStorage.setItem(demoKey, JSON.stringify(state)); return state; },
  preview: async (buildId: string, file: string, signal: AbortSignal, sourcePath?: string) => { if (isDemoMode) { const preview = (await loadDemo()).builds.find(b => b.id === buildId)?.previews.find(p => p.file === file); if (!preview?.url) throw new Error('Preview unavailable.'); const response = await fetch(preview.url, { signal }); if (!response.ok) throw new Error('Preview unavailable.'); return response.blob(); } return (await axiosClient.get<Blob>('/internal/game-builds/' + encodeURIComponent(buildId) + (sourcePath ? '/source-preview?path=' + encodeURIComponent(sourcePath) : '/preview/' + encodeURIComponent(file)), { responseType: 'blob', signal })).data; },
};

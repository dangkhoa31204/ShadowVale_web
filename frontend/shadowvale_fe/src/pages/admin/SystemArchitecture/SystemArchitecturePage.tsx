import React from 'react';

export const SystemArchitecturePage: React.FC = () => {
  return (
    <div className="p-margin-page max-w-container-max mx-auto">
      {/* Page Header */}
      <div className="mb-stack-lg border-b border-border-subtle pb-stack-md flex justify-between items-end">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface tracking-tighter uppercase mb-1">SYSTEM_ARCHITECTURE_V4.2</h2>
          <p className="font-data-mono text-data-mono text-on-surface-variant tracking-wider uppercase">Core UI Framework & Component Manifest</p>
        </div>
        <div className="font-data-mono text-data-mono text-outline flex flex-col items-end">
          <span>BUILD_ID: SV-4.2.980-A</span>
          <span>TIMESTAMP: 2024-03-15T09:41:22Z</span>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-stack-md">
        {/* 1. TECHNICAL_NAVIGATION_GROUPS */}
        <section className="col-span-12 lg:col-span-4 bg-surface border border-border-subtle rounded flex flex-col">
          <div className="bg-surface-bright border-b border-border-subtle px-4 py-2 flex items-center gap-2 rounded-t">
            <span className="material-symbols-outlined text-[16px] text-primary">account_tree</span>
            <h3 className="font-label-caps text-label-caps text-on-surface tracking-widest">TECHNICAL_NAVIGATION_GROUPS</h3>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-6">
            <div className="relative pl-4 border-l border-border-subtle ml-2">
              <div className="absolute w-2 h-[1px] bg-border-subtle top-3 -left-[1px]"></div>
              <span className="font-label-caps text-[11px] text-primary mb-2 block tracking-widest">MODULE: CONTENT</span>
              <ul className="font-data-mono text-[12px] text-on-surface-variant space-y-2">
                <li className="flex items-center gap-2 hover:text-on-surface cursor-pointer"><span className="material-symbols-outlined text-[14px]">smart_toy</span> Enemy FSMs</li>
                <li className="flex items-center gap-2 hover:text-on-surface cursor-pointer"><span className="material-symbols-outlined text-[14px]">my_location</span> Weapon Stats</li>
                <li className="flex items-center gap-2 hover:text-on-surface cursor-pointer"><span className="material-symbols-outlined text-[14px]">map</span> Level Geodata</li>
              </ul>
            </div>
            <div className="relative pl-4 border-l border-border-subtle ml-2">
              <div className="absolute w-2 h-[1px] bg-border-subtle top-3 -left-[1px]"></div>
              <span className="font-label-caps text-[11px] text-tertiary mb-2 block tracking-widest">MODULE: BALANCING</span>
              <ul className="font-data-mono text-[12px] text-on-surface-variant space-y-2">
                <li className="flex items-center gap-2 hover:text-on-surface cursor-pointer"><span className="material-symbols-outlined text-[14px]">inventory_2</span> Bundle Configs</li>
                <li className="flex items-center gap-2 hover:text-on-surface cursor-pointer"><span className="material-symbols-outlined text-[14px]">fact_check</span> Stat Validation</li>
              </ul>
            </div>
            <div className="relative pl-4 border-l border-border-subtle ml-2">
              <div className="absolute w-2 h-[1px] bg-border-subtle top-3 -left-[1px]"></div>
              <span className="font-label-caps text-[11px] text-info mb-2 block tracking-widest">MODULE: TELEMETRY</span>
              <ul className="font-data-mono text-[12px] text-on-surface-variant space-y-2">
                <li className="flex items-center gap-2 hover:text-on-surface cursor-pointer"><span className="material-symbols-outlined text-[14px]">grid_on</span> Heatmaps</li>
                <li className="flex items-center gap-2 hover:text-on-surface cursor-pointer"><span className="material-symbols-outlined text-[14px]">analytics</span> Engagement Analytics</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 2. COMPONENT_MANIFEST */}
        <section className="col-span-12 lg:col-span-8 bg-surface border border-border-subtle rounded flex flex-col">
          <div className="bg-surface-bright border-b border-border-subtle px-4 py-2 flex items-center justify-between rounded-t">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">widgets</span>
              <h3 className="font-label-caps text-label-caps text-on-surface tracking-widest">COMPONENT_MANIFEST</h3>
            </div>
            <span className="font-data-mono text-[10px] text-outline px-2 py-0.5 border border-outline/30 rounded bg-surface/50">LIVE_PREVIEW</span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Buttons */}
            <div className="space-y-4">
              <h4 className="font-label-caps text-[11px] text-on-surface-variant tracking-widest border-b border-border-subtle pb-1">ATOMS_BUTTONS</h4>
              <div className="flex flex-wrap gap-3">
                <button className="bg-primary text-on-primary font-label-caps text-[12px] px-4 py-2 rounded font-bold hover:bg-primary-fixed transition-colors shadow-[0_0_10px_rgba(171,202,232,0.1)]">Deploy Patch</button>
                <button className="bg-transparent border border-outline-variant text-on-surface-variant font-label-caps text-[12px] px-4 py-2 rounded hover:bg-surface-bright hover:text-on-surface transition-colors">Cancel</button>
                <button className="bg-error/10 border border-error/30 text-error font-label-caps text-[12px] px-4 py-2 rounded hover:bg-error/20 transition-colors flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Purge Entity (Danger)
                </button>
              </div>
            </div>

            {/* Status Badges */}
            <div className="space-y-4">
              <h4 className="font-label-caps text-[11px] text-on-surface-variant tracking-widest border-b border-border-subtle pb-1">ATOMS_STATUS_BADGES</h4>
              <div className="flex flex-wrap gap-3 font-data-mono text-[11px]">
                <span className="flex items-center gap-1.5 bg-success/10 border border-success/20 text-success px-2 py-1 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-success"></span>STABLE
                </span>
                <span className="flex items-center gap-1.5 bg-warning/10 border border-warning/20 text-warning px-2 py-1 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>BETA
                </span>
                <span className="flex items-center gap-1.5 bg-error/10 border border-error/20 text-error px-2 py-1 rounded">
                  <span className="material-symbols-outlined text-[12px]">block</span>DEPRECATED
                </span>
                <span className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded">
                  <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>DEPLOYING
                </span>
              </div>
            </div>

            {/* Forms */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="font-label-caps text-[11px] text-on-surface-variant tracking-widest border-b border-border-subtle pb-1">ATOMS_FORMS</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="font-data-mono text-[10px] text-outline-variant">ENTITY_SEARCH_QUERY</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2 top-2 text-[16px] text-outline-variant pointer-events-none">search</span>
                    <input className="w-full bg-surface-dim border border-border-subtle rounded py-1.5 pl-8 pr-2 text-data-mono text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" type="text" defaultValue="id:player_mech_v2" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-data-mono text-[10px] text-outline-variant">PATCH_DATE_TARGET</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2 top-2 text-[16px] text-outline-variant pointer-events-none">calendar_today</span>
                    <input className="w-full bg-surface-dim border border-border-subtle rounded py-1.5 pl-8 pr-2 text-data-mono text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" type="text" defaultValue="2024-04-01" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 justify-center mt-4 border border-border-subtle bg-surface-dim rounded px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-data-mono text-[11px] text-on-surface">AI_Logic_Active</span>
                    <button className="w-8 h-4 bg-primary rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface">
                      <span className="absolute right-0.5 top-0.5 w-3 h-3 bg-on-primary rounded-full shadow transition-transform"></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. TELEMETRY_FOUNDATION */}
        <section className="col-span-12 lg:col-span-6 bg-surface border border-border-subtle rounded flex flex-col overflow-hidden relative">
          <div className="bg-surface-bright border-b border-border-subtle px-4 py-2 flex items-center justify-between rounded-t z-10 relative">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-tertiary">query_stats</span>
              <h3 className="font-label-caps text-label-caps text-on-surface tracking-widest">TELEMETRY_FOUNDATION</h3>
            </div>
            <span className="font-data-mono text-[10px] text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>LIVE_STREAM
            </span>
          </div>
          <div className="relative h-48 w-full bg-surface-dim flex items-center justify-center p-4">
            <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(171, 202, 232, 0.1) 0%, transparent 70%)' }}></div>
            <div className="w-full h-full border border-border-subtle/50 rounded flex flex-col relative overflow-hidden bg-surface">
              <div className="absolute inset-0 flex items-end opacity-20">
                <div className="w-1/6 h-[30%] bg-tertiary mx-1 border-t border-tertiary"></div>
                <div className="w-1/6 h-[50%] bg-tertiary mx-1 border-t border-tertiary"></div>
                <div className="w-1/6 h-[40%] bg-tertiary mx-1 border-t border-tertiary"></div>
                <div className="w-1/6 h-[80%] bg-primary mx-1 border-t border-primary relative"><div className="absolute -top-1 w-full h-[1px] bg-primary shadow-[0_0_5px_#abcae8]"></div></div>
                <div className="w-1/6 h-[60%] bg-tertiary mx-1 border-t border-tertiary"></div>
                <div className="w-1/6 h-[70%] bg-tertiary mx-1 border-t border-tertiary"></div>
              </div>
              <div className="p-3 z-10 flex justify-between items-start">
                <div>
                  <span className="font-data-mono text-[10px] text-outline-variant block mb-1">NODE_TRAFFIC_PEAK</span>
                  <span className="font-display-lg text-[24px] text-on-surface leading-none block">14,291</span>
                  <span className="font-data-mono text-[10px] text-success flex items-center gap-0.5 mt-1">
                    <span className="material-symbols-outlined text-[10px]">trending_up</span> +12.4%
                  </span>
                </div>
                <div className="bg-surface-bright/80 border border-outline-variant/50 backdrop-blur-sm rounded p-1.5 flex gap-1">
                  <div className="w-2 h-2 rounded-sm bg-primary" title="Primary Cluster"></div>
                  <div className="w-2 h-2 rounded-sm bg-tertiary" title="Secondary Cluster"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. STATE_LIBRARY */}
        <section className="col-span-12 lg:col-span-6 bg-surface border border-border-subtle rounded flex flex-col">
          <div className="bg-surface-bright border-b border-border-subtle px-4 py-2 flex items-center gap-2 rounded-t">
            <span className="material-symbols-outlined text-[16px] text-primary">layers</span>
            <h3 className="font-label-caps text-label-caps text-on-surface tracking-widest">STATE_LIBRARY</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4 h-full">
            {/* Empty State */}
            <div className="border border-dashed border-border-subtle bg-surface-dim rounded flex flex-col items-center justify-center p-4 text-center group hover:border-outline-variant transition-colors">
              <div className="w-10 h-10 rounded-full bg-surface-bright flex items-center justify-center mb-3 text-outline-variant group-hover:text-primary transition-colors border border-border-subtle">
                <span className="material-symbols-outlined">radar</span>
              </div>
              <span className="font-label-caps text-[11px] text-on-surface mb-1">NO ACTIVE SESSIONS</span>
              <span className="font-data-mono text-[10px] text-outline-variant">Awaiting entity connection...</span>
            </div>
            {/* Error State */}
            <div className="border border-error/20 bg-error/5 rounded flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
              <div className="absolute top-0 w-full h-0.5 bg-error"></div>
              <div className="w-10 h-10 rounded bg-error/10 flex items-center justify-center mb-3 text-error border border-error/20">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <span className="font-label-caps text-[11px] text-on-surface mb-1">SYNC_FAILURE</span>
              <span className="font-data-mono text-[10px] text-error/80">Checksum mismatch at 0x4F2A</span>
              <button className="mt-3 bg-surface border border-error/30 text-error font-data-mono text-[10px] px-3 py-1 rounded hover:bg-error/10 transition-colors">RETRY</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SystemArchitecturePage;

import React from 'react';

const TacticalLabel: React.FC<{ children: React.ReactNode, htmlFor?: string }> = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-on-surface-variant font-label-caps text-label-caps mb-1 uppercase tracking-wider">
    {children}
  </label>
);

const tacticalInputClasses = "w-full bg-surface-dim border border-border-subtle text-on-surface font-data-mono text-data-mono rounded focus:border-primary focus:ring-1 focus:ring-primary transition-colors py-2 px-3 placeholder-on-surface-variant/50 outline-none";

export const SliderForm: React.FC = () => {
  return (
    <div className="xl:col-span-7 flex flex-col gap-gutter">
      {/* Basic Info Card */}
      <section className="bg-surface border border-border-subtle rounded flex flex-col overflow-hidden">
        <div className="bg-surface-bright px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h3 className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">article</span>
            Payload Details
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">Status</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-9 h-5 bg-surface-dim peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface-variant after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success border border-border-subtle"></div>
            </label>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <TacticalLabel htmlFor="slider_title">Designation (Title)</TacticalLabel>
            <input 
              id="slider_title" 
              type="text" 
              defaultValue="Operation Nightfall"
              className={tacticalInputClasses}
            />
          </div>
          
          <div>
            <TacticalLabel htmlFor="slider_desc">Briefing (Description)</TacticalLabel>
            <textarea 
              id="slider_desc" 
              rows={4}
              defaultValue="Deploy under the cover of darkness. Infiltrate sector 7 and extract high-value assets before dawn."
              className={`${tacticalInputClasses} resize-none`}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <TacticalLabel htmlFor="start_date">Commencement (Start Date)</TacticalLabel>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">calendar_today</span>
                <input 
                  id="start_date" 
                  type="datetime-local" 
                  defaultValue="2023-11-15T00:00"
                  className={`${tacticalInputClasses} pl-10`}
                />
              </div>
            </div>
            <div>
              <TacticalLabel htmlFor="end_date">Extraction (End Date)</TacticalLabel>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">event_busy</span>
                <input 
                  id="end_date" 
                  type="datetime-local"
                  className={`${tacticalInputClasses} pl-10`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Media Asset Card */}
      <section className="bg-surface border border-border-subtle rounded flex flex-col overflow-hidden">
        <div className="bg-surface-bright px-4 py-3 border-b border-border-subtle">
          <h3 className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">image</span>
            Visual Asset
          </h3>
        </div>
        <div className="p-6">
          <label className="block text-on-surface-variant font-label-caps text-label-caps mb-3 uppercase tracking-wider">Primary Imagery</label>
          <div className="border-2 border-dashed border-border-subtle bg-surface-dim rounded flex flex-col items-center justify-center p-8 hover:border-primary/50 transition-colors cursor-pointer group relative overflow-hidden">
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 backdrop-blur-sm">
              <span className="font-label-caps text-on-surface flex items-center gap-2 bg-surface px-4 py-2 rounded border border-border-subtle">
                <span className="material-symbols-outlined">upload</span> Replace Asset
              </span>
            </div>
            <img 
              alt="Uploaded Preview" 
              src="https://lh3.googleusercontent.com/aida/AP1WRLvakyq5UQ0q2g4B1D0wwUaxQQUOfWnS7E60Y9N2CMNwiKg50k0a-mRSBkAkmsPMQj0CXbefTDTsKSVvbxpLzRnAQ7bIwQP1D3yFVBAvs2DAjW_REm5VVlidV0Vr2SGkIy3Gc05Jab1UTg9KLpExj4RJZ_Jt00SOG2JwqbhRsoqJRcGix-rCSN06fprl6KxC96GdE8-4oEhvpLKz5y5BpRhoqPjPnx5Lde98aiwGf6sg4zPxBlOFEs8TDZM"
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
            />
            <div className="relative z-0 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[32px] text-primary drop-shadow-md">cloud_done</span>
              <p className="font-data-mono text-data-mono text-on-surface">op_nightfall_bg_v2.webp</p>
              <p className="font-label-caps text-[10px] text-on-surface-variant">1920x1080 • 1.2MB</p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Metrics Card */}
      <section className="bg-surface border border-border-subtle rounded flex flex-col overflow-hidden">
        <div className="bg-surface-bright px-4 py-3 border-b border-border-subtle">
          <h3 className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">touch_app</span>
            Action Directives
          </h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4">
            <TacticalLabel htmlFor="cta_text">Action Label</TacticalLabel>
            <input 
              id="cta_text" 
              type="text" 
              defaultValue="Deploy Now"
              className={tacticalInputClasses}
            />
          </div>
          <div className="md:col-span-8">
            <TacticalLabel htmlFor="cta_url">Target Vector (URL)</TacticalLabel>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-surface-dim border border-r-0 border-border-subtle rounded-l text-on-surface-variant font-data-mono text-[12px]">
                /campaigns/
              </span>
              <input 
                id="cta_url" 
                type="text" 
                defaultValue="op-nightfall"
                className={`${tacticalInputClasses} rounded-l-none`}
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <TacticalLabel htmlFor="display_order">Sequence Priority</TacticalLabel>
            <input 
              id="display_order" 
              type="number" 
              min="1" 
              defaultValue="1"
              className={`${tacticalInputClasses} text-center`}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

import React from 'react';

export const SliderPreview: React.FC = () => {
  return (
    <div className="xl:col-span-5 sticky top-[88px]">
      <div className="flex flex-col h-full bg-surface-container-lowest border border-border-subtle rounded overflow-hidden shadow-2xl relative">
        {/* Preview Header bar */}
        <div className="bg-surface-container-low border-b border-border-subtle p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-error"></div>
            <div className="w-2 h-2 rounded-full bg-warning"></div>
            <div className="w-2 h-2 rounded-full bg-success"></div>
          </div>
          <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">visibility</span>
            Live Canvas Preview
          </span>
        </div>
        
        {/* Actual Preview Area */}
        <div className="relative w-full aspect-video bg-black overflow-hidden group">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img 
              alt="Slider Preview Image" 
              src="https://lh3.googleusercontent.com/aida/AP1WRLvakyq5UQ0q2g4B1D0wwUaxQQUOfWnS7E60Y9N2CMNwiKg50k0a-mRSBkAkmsPMQj0CXbefTDTsKSVvbxpLzRnAQ7bIwQP1D3yFVBAvs2DAjW_REm5VVlidV0Vr2SGkIy3Gc05Jab1UTg9KLpExj4RJZ_Jt00SOG2JwqbhRsoqJRcGix-rCSN06fprl6KxC96GdE8-4oEhvpLKz5y5BpRhoqPjPnx5Lde98aiwGf6sg4zPxBlOFEs8TDZM"
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            {/* Vignette/Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent"></div>
          </div>
          
          {/* Content Overlay */}
          <div className="absolute inset-0 p-6 flex flex-col justify-end">
            <div className="max-w-[80%]">
              <div className="inline-block px-2 py-1 bg-primary/20 backdrop-blur-md border border-primary/50 text-primary font-label-caps text-[10px] mb-3 uppercase">
                Active Campaign
              </div>
              <h2 className="font-display-lg text-display-lg text-white mb-2 leading-none">Operation Nightfall</h2>
              <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-4">
                Deploy under the cover of darkness. Infiltrate sector 7 and extract high-value assets before dawn.
              </p>
              <button className="px-6 py-2 bg-primary text-on-primary font-label-caps text-[12px] uppercase tracking-wider rounded-sm hover:bg-primary-fixed transition-colors flex items-center gap-2 w-fit">
                Deploy Now
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
          
          {/* Mock Navigation Dots */}
          <div className="absolute bottom-4 right-6 flex items-center gap-2">
            <div className="w-6 h-1 bg-primary rounded-full"></div>
            <div className="w-2 h-1 bg-white/30 rounded-full"></div>
            <div className="w-2 h-1 bg-white/30 rounded-full"></div>
          </div>
        </div>
        
        {/* Preview Meta Info */}
        <div className="p-4 bg-surface-dim border-t border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-4 text-on-surface-variant font-data-mono text-[11px]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">desktop_windows</span> 
              1920x1080
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">contrast</span> 
              Contrast: Pass
            </span>
          </div>
          <button className="text-primary hover:text-primary-fixed transition-colors">
            <span className="material-symbols-outlined text-[20px]">fullscreen</span>
          </button>
        </div>
      </div>
    </div>
  );
};

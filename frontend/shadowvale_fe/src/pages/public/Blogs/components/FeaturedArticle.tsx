import React from 'react';

export const FeaturedArticle: React.FC = () => {
  return (
    <div className="relative rounded-lg border border-outline-variant bg-surface overflow-hidden group cursor-pointer">
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-2/3 h-64 lg:h-[400px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent z-10 lg:hidden"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-surface to-transparent z-10 hidden lg:block w-1/2"></div>
          <img 
            alt="Designing Stealth Systems" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA75y8x7cuo56rscL1I8jB2ISk29G2DHIMa8oMMkhCZNGUDr_qcJe6nUdGcNTQsj4P_GqpLEelTRV3rBwXO2BbmlWrUvQuV_2kONn2ZHvH8ERao_YijVXwSB53fqZwy7dX01X45qUhwQNOfS_9rNmgCUvfj8CsxEQPrAw0xjaibTU0H2sfJmyb36X4GJx_s5u7apw94t_aLuuyon9JnkYupKVG86NdWvAnRl3bgdEkcTPJWwdeKzh7a6g"
          />
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <span className="bg-primary/20 backdrop-blur-sm border border-primary/50 text-primary px-2 py-1 rounded font-data-mono text-[10px] uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Priority Intel
            </span>
          </div>
        </div>
        
        <div className="lg:w-1/3 p-6 lg:p-8 flex flex-col justify-center bg-surface relative z-20 -mt-20 lg:mt-0">
          <div className="flex items-center gap-3 text-on-surface-variant font-data-mono text-xs mb-4">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span> 2042.10.24</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> 12 Min Read</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-3 group-hover:text-primary transition-colors">Designing Stealth Systems: The Art of Invisibility</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6 line-clamp-3">Deep dive into the procedural detection algorithms powering ShadowVale's elite infiltrators. We explore how shadow rendering and audio cues interact dynamically.</p>
          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border border-outline-variant bg-surface-container-high overflow-hidden">
                <img 
                  className="w-full h-full object-cover" 
                  alt="DR. A. VANCE"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCslL__P56OqJwUjXgu-AjukhBAr6Uzh2V51cWNIGZLNTKXOivwr1B-kPNrqz6GShq6ritip4f6tN2Q-AZ0EaQO_dKfsBhHnDTZfngGW5LM14x_sPgovHXA-G9Nh8nJNCTzQ61fRFf5ZW78HSRDUHYQu8iQMN1eF-ktRSJ4MFcYkPS_H0xgyHQRXzUiNB8ZPd05oGIdrZbghyTdhStcVLxgp3R9Wezaevc-8HwcLctkxv4yUvvxgVCH6Q"
                />
              </div>
              <div>
                <div className="font-label-caps text-[10px] text-on-surface">DR. A. VANCE</div>
                <div className="font-data-mono text-[9px] text-on-surface-variant">Lead Systems Eng.</div>
              </div>
            </div>
            <button className="flex items-center gap-2 text-primary font-data-mono text-xs uppercase hover:bg-primary/10 px-3 py-1.5 rounded transition-colors border border-transparent hover:border-primary/30">
              Access File <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

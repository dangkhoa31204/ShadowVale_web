import React from 'react';
import { Link } from 'react-router-dom';

const mockSliders = [
  {
    id: 1,
    title: 'Season 4: Shadow Protocol',
    desc: 'Main hero banner for the upcoming season launch. Features new operative classes and weapon unlocks.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1TAveBg2GPcBL31FKmcnmpwrErhznN-Zf2lkQJLuVHVio9i1AbPCSX3mZvNf6dYUYqP-Z4fQCNOvZAsDEYP3DRtkolmvP6OJ4GfYmp5srPNsgI6S5sY9wSuged9aS4DX21tDq-nwSJc2inT6WBFDU2I2Fww59c3VhnllKYieKY59FrhukA09lWZmlecxYtrt3YiHvCmnXf5vYtvtchP-sD3I60rk5iWcMKCfL4CVwHLZ9I58VzJYUeA',
    status: 'ACTIVE',
    order: '1',
    start: '2024-10-15 00:00Z',
    end: '2024-12-15 00:00Z',
  },
  {
    id: 2,
    title: 'Intelligence Briefing: AI Update',
    desc: 'Highlights recent patch notes focusing on enemy AI behavioral adjustments and difficulty scaling.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHGdQOx9E73Z7GfQlJxmbeNj_tR5q-gnSRqhvi6fXdU5EwG5hbqTEeF3ERSKckfN8CWIb_zItsASOYF5KJ6WTswl99MDxm3C40WsCatfh-0q79d_hu2zuOPuMJeDLnwVPGOkxpU8QWnmw30qerjY9XmGYOFnN41YHIOYDmDiqcDnEVe7hMRg4qMGksUp9si_32_AOqel9Kjv-wBnYHVATHCwWLEEQACiNr7XRgn1INOXV7VV1y8IYW0Q',
    status: 'ACTIVE',
    order: '2',
    start: '2024-09-01 12:00Z',
    end: 'NO EXPIRY',
  },
  {
    id: 3,
    title: 'Armory Expansion Pack',
    desc: 'Promotional banner for the Q2 Armory Expansion DLC. Currently archived pending re-run.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTwA19zXscAHdhX-S_TBivSufz7CL4VCKS7IONN50a4fZbjt9l0v2QukSUJTwiIBdxeoq0k3M4pdAunS0h9kqwzUCKfisW7GT8BSF6LmqkXoxstMk-KHESvUOp20rh6ZCBqvbbZKftaBcsFpqmSLejIXakZbvjbszMdZ9MyWRlg2Iu_NB5rjDpeFAFqU0gUGYaEQpwoPepx4wv4P9K3PusMG8WwjBwUxgdJl_OSu0ledJhRTkz-vc2hA',
    status: 'INACTIVE',
    order: '--',
    start: '2024-04-01 00:00Z',
    end: '2024-05-01 00:00Z',
  }
];

export const SlidersGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {mockSliders.map(slider => {
        const isActive = slider.status === 'ACTIVE';
        
        return (
          <article 
            key={slider.id} 
            className={`bg-surface-container border border-border-subtle rounded-lg overflow-hidden flex flex-col transition-colors duration-200 group hover:border-primary-container ${!isActive ? 'opacity-75 hover:opacity-100' : ''}`}
          >
            <div className="relative h-48 border-b border-border-subtle bg-surface-dim">
              <div className="absolute inset-0 z-0">
                <img 
                  alt="Slider Preview" 
                  src={slider.image}
                  className={`w-full h-full object-cover mix-blend-luminosity grayscale transition-all duration-500 ${isActive ? 'opacity-80 group-hover:grayscale-0 group-hover:opacity-100' : 'opacity-40 group-hover:grayscale-0 group-hover:opacity-70'}`} 
                />
              </div>
              
              <div className={`absolute inset-0 z-10 ${isActive ? 'bg-gradient-to-t from-surface-container via-surface-container/50 to-transparent' : 'bg-gradient-to-t from-surface-container via-surface-container/80 to-surface-container/20'}`}></div>
              
              <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start z-20">
                {isActive ? (
                  <div className="bg-success/10 border border-success/30 text-success font-label-caps text-[10px] px-2 py-0.5 rounded flex items-center gap-1.5 backdrop-blur-sm shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                    ACTIVE
                  </div>
                ) : (
                  <div className="bg-surface-variant border border-outline-variant text-on-surface-variant font-label-caps text-[10px] px-2 py-0.5 rounded flex items-center gap-1.5 backdrop-blur-sm shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
                    INACTIVE
                  </div>
                )}
                
                <div className={`border border-border-subtle font-data-mono text-[11px] px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1 ${isActive ? 'bg-surface-container-high/80 text-on-surface' : 'bg-surface-container-high/80 text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined text-[14px]">sort</span>
                  ORDER: {slider.order}
                </div>
              </div>
            </div>
            
            <div className="p-4 flex flex-col flex-1 z-20 bg-surface-container">
              <div className="flex justify-between items-start mb-2 gap-4">
                <Link
                  to={`/marketing/sliders/${slider.id}`}
                  className={`font-title-sm text-title-sm line-clamp-1 transition-colors hover:text-primary ${isActive ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'}`}
                >
                  {slider.title}
                </Link>
                <button className="text-on-surface-variant hover:text-primary transition-colors cursor-grab active:cursor-grabbing shrink-0">
                  <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
                </button>
              </div>
              
              <p className="font-body-md text-body-md text-on-surface-variant mb-4 line-clamp-2 text-sm">
                {slider.desc}
              </p>
              
              <div className="mt-auto border-t border-border-subtle pt-4 flex flex-col gap-3">
                <div className={`flex justify-between text-[11px] font-data-mono ${isActive ? 'text-on-surface-variant' : 'text-outline'}`}>
                  <span>START: {slider.start}</span>
                  <span>END: {slider.end}</span>
                </div>
                
                <div className="flex items-center justify-between bg-surface p-1.5 rounded border border-border-subtle">
                  <div className="flex gap-1">
                    <Link to={`/marketing/sliders/${slider.id}`} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors" title="Edit">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </Link>
                    {isActive ? (
                      <button className="p-1.5 text-success hover:bg-success/10 rounded transition-colors" title="Deactivate">
                        <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                      </button>
                    ) : (
                      <button className="p-1.5 text-on-surface-variant hover:text-success hover:bg-success/10 rounded transition-colors" title="Activate">
                        <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                      </button>
                    )}
                  </div>
                  <button className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors" title="Delete">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

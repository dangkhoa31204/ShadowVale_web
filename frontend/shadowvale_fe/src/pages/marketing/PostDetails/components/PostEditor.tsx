import React from 'react';

export const PostEditor: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col gap-6 w-full xl:max-w-[800px]">
      <div className="flex flex-col gap-1">
        <input 
          type="text" 
          defaultValue="Enemy AI Development: Neural Networks in the Shadows"
          placeholder="Briefing Title..." 
          className="bg-transparent border-b-2 border-border-subtle focus:border-primary outline-none font-headline-md text-headline-md text-on-surface py-2 w-full transition-colors placeholder:text-on-surface-variant placeholder:opacity-50" 
        />
        <div className="flex items-center gap-2 font-data-mono text-data-mono text-on-surface-variant mt-1">
          <span className="material-symbols-outlined text-[14px]">link</span>
          <span>shadowvale.sys/briefing/enemy-ai-dev</span>
          <button className="hover:text-primary ml-2"><span className="material-symbols-outlined text-[14px]">edit</span></button>
        </div>
      </div>
      
      <div className="flex flex-col">
        <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2 uppercase">Briefing Summary</label>
        <textarea 
          placeholder="Enter a short overview of this intelligence briefing..."
          className="bg-surface-container-lowest border border-border-subtle text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors w-full rounded font-body-md text-body-md px-3 py-2 resize-none h-20"
          defaultValue="An in-depth analysis of the new adversarial neural network logic deployed in the ShadowVale v0.4.2 update, focusing on stealth detection and pack-hunting behaviors."
        />
      </div>
      
      <div className="bg-surface border border-border-subtle rounded-lg flex flex-col overflow-hidden flex-1 min-h-[500px]">
        <div className="bg-surface-bright border-b border-border-subtle px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant hover:text-on-surface transition-colors" title="Bold">
              <span className="material-symbols-outlined text-[18px]">format_bold</span>
            </button>
            <button className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant hover:text-on-surface transition-colors" title="Italic">
              <span className="material-symbols-outlined text-[18px]">format_italic</span>
            </button>
            <div className="w-px h-4 bg-border-subtle mx-1"></div>
            <button className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant hover:text-on-surface transition-colors" title="Heading 1">
              <span className="material-symbols-outlined text-[18px]">format_h1</span>
            </button>
            <button className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant hover:text-on-surface transition-colors" title="Heading 2">
              <span className="material-symbols-outlined text-[18px]">format_h2</span>
            </button>
            <div className="w-px h-4 bg-border-subtle mx-1"></div>
            <button className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant hover:text-on-surface transition-colors" title="Code Block">
              <span className="material-symbols-outlined text-[18px]">code</span>
            </button>
            <button className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant hover:text-on-surface transition-colors" title="Insert Link">
              <span className="material-symbols-outlined text-[18px]">link</span>
            </button>
            <button className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant hover:text-on-surface transition-colors" title="Insert Image">
              <span className="material-symbols-outlined text-[18px]">image</span>
            </button>
          </div>
          <div className="font-data-mono text-[10px] text-on-surface-variant uppercase tracking-wider">Markdown Supported</div>
        </div>
        
        <div className="p-0 flex-1 relative bg-surface-container-lowest">
          <textarea 
            spellCheck="false"
            className="w-full h-full bg-transparent border-none outline-none p-6 font-body-md text-body-md text-on-surface resize-none leading-relaxed"
            defaultValue={`## Overview of Neural Sub-Routines\n\nThe latest deployment of the Aethelwood adversaries utilizes a modified recurrent neural network (RNN) for spatial awareness and pathfinding. Unlike previous iterations, these entities do not rely on static nav-meshes.\n\n### Detection Mechanics\n\nWhen a player enters a 50-meter radius, the AI begins a 'scent-tracking' subroutine. The probability of detection (Pd) is calculated as follows:`}
          />
        </div>
      </div>
    </div>
  );
};

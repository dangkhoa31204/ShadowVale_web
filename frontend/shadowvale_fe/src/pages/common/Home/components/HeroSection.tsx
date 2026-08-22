import React from 'react';
import { Link } from 'react-router-dom';

export const HeroSection: React.FC = () => {
  return (
    <header className="relative w-full border-b border-border-subtle overflow-hidden flex flex-col justify-center min-h-[55vh] lg:min-h-[65vh]">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 bg-surface-container-lowest">
        <div
          className="w-full h-full bg-cover bg-center opacity-30 mix-blend-luminosity grayscale"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80')",
          }}
        ></div>
        {/* Tactical Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent opacity-80"></div>
      </div>
      {/* Content Layer */}
      <div className="relative z-10 w-full max-w-container-max mx-auto px-gutter py-stack-lg flex flex-col items-start gap-stack-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container border border-border-subtle rounded-full mb-2">
          <div className="w-2 h-2 rounded-full bg-success"></div>
          <span className="font-data-mono text-label-caps text-on-surface-variant">
            Core Systems Operational
          </span>
        </div>
        <h1 className="font-display-lg text-[48px] leading-[56px] font-bold text-on-surface tracking-tight uppercase shadow-sm">
          ShadowVale
        </h1>
        <p className="font-headline-md text-title-sm text-on-surface-variant max-w-2xl mt-2 border-l-2 border-primary pl-4">
          Data-driven content management and player telemetry for tactical stealth-survival game development.
        </p>
        <div className="flex flex-wrap gap-4 mt-stack-md">
          <Link
            to="/authorization"
            className="bg-primary text-on-primary font-data-mono text-label-caps px-6 py-3 rounded font-bold hover:bg-primary-fixed transition-colors duration-200 flex items-center gap-2 group"
          >
            Explore Platform
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
          <Link
            to="/blogs"
            className="border border-outline-variant bg-surface/50 backdrop-blur-sm text-on-surface font-data-mono text-label-caps px-6 py-3 rounded hover:bg-surface-variant hover:border-outline transition-colors duration-200"
          >
            Learn About ShadowVale
          </Link>
        </div>
      </div>
    </header>
  );
};

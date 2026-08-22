import React from 'react';
import { Link } from 'react-router-dom';

export const FeatureGrid: React.FC = () => {
  return (
    <section className="w-full max-w-container-max mx-auto px-gutter py-stack-lg flex-1 mt-8 mb-16">
      <div className="mb-stack-md flex items-center gap-4">
        <h2 className="font-data-mono text-label-caps text-on-surface-variant uppercase tracking-widest">
          Platform Capabilities
        </h2>
        <div className="h-px bg-border-subtle flex-1"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Content Management Card */}
        <Link
          to="/blogs"
          className="bg-surface border border-border-subtle p-6 rounded flex flex-col gap-5 hover:border-primary/50 transition-colors duration-300 group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center border border-border-subtle group-hover:border-primary/50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-primary text-[24px]">inventory_2</span>
          </div>
          <div>
            <h3 className="font-title-sm text-title-sm text-on-surface font-bold uppercase tracking-wider mb-1">
              Content Management
            </h3>
            <p className="font-data-mono text-label-caps text-on-surface-variant/70">
              Centralized Asset Control
            </p>
          </div>
          <ul className="font-body-md text-body-md text-on-surface-variant space-y-3 mt-2 flex-1">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline-variant text-[18px] mt-0.5 group-hover:text-primary transition-colors">
                arrow_right
              </span>
              Create and edit game content
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline-variant text-[18px] mt-0.5 group-hover:text-primary transition-colors">
                arrow_right
              </span>
              Validate configurations
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline-variant text-[18px] mt-0.5 group-hover:text-primary transition-colors">
                arrow_right
              </span>
              Manage versions
            </li>
          </ul>
        </Link>

        {/* Balancing Card */}
        <Link
          to="/marketing/posts"
          className="bg-surface border border-border-subtle p-6 rounded flex flex-col gap-5 hover:border-primary/50 transition-colors duration-300 group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center border border-border-subtle group-hover:border-primary/50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-primary text-[24px]">balance</span>
          </div>
          <div>
            <h3 className="font-title-sm text-title-sm text-on-surface font-bold uppercase tracking-wider mb-1">
              Balancing
            </h3>
            <p className="font-data-mono text-label-caps text-on-surface-variant/70">
              Evidence-Based Tuning
            </p>
          </div>
          <ul className="font-body-md text-body-md text-on-surface-variant space-y-3 mt-2 flex-1">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline-variant text-[18px] mt-0.5 group-hover:text-primary transition-colors">
                arrow_right
              </span>
              Publish validated content bundles
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline-variant text-[18px] mt-0.5 group-hover:text-primary transition-colors">
                arrow_right
              </span>
              Compare versions
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline-variant text-[18px] mt-0.5 group-hover:text-primary transition-colors">
                arrow_right
              </span>
              Improve game balance using evidence
            </li>
          </ul>
        </Link>

        {/* Player Telemetry Card */}
        <Link
          to="/authorization"
          className="bg-surface border border-border-subtle p-6 rounded flex flex-col gap-5 hover:border-primary/50 transition-colors duration-300 group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center border border-border-subtle group-hover:border-primary/50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-primary text-[24px]">monitoring</span>
          </div>
          <div>
            <h3 className="font-title-sm text-title-sm text-on-surface font-bold uppercase tracking-wider mb-1">
              Player Telemetry
            </h3>
            <p className="font-data-mono text-label-caps text-on-surface-variant/70">
              Live Session Analytics
            </p>
          </div>
          <ul className="font-body-md text-body-md text-on-surface-variant space-y-3 mt-2 flex-1">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline-variant text-[18px] mt-0.5 group-hover:text-primary transition-colors">
                arrow_right
              </span>
              Analyze player behavior
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline-variant text-[18px] mt-0.5 group-hover:text-primary transition-colors">
                arrow_right
              </span>
              Track deaths and completion
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline-variant text-[18px] mt-0.5 group-hover:text-primary transition-colors">
                arrow_right
              </span>
              Compare gameplay metrics
            </li>
          </ul>
        </Link>
      </div>
    </section>
  );
};

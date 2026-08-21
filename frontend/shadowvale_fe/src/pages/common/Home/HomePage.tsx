import React from 'react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  return (
    <div className="w-full max-w-[900px] text-center p-8">
      <div className="mb-8">
        <h1 className="font-display-lg text-4xl text-primary brand-glow flex items-center justify-center gap-3 font-bold">
          <span className="material-symbols-outlined text-5xl">terminal</span>
          ShadowVale Command Network
        </h1>
        <p className="font-label-caps text-sm text-on-surface-variant mt-3 tracking-widest uppercase">
          Tactical Cyberpunk Web Platform Architecture
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-left">
        <Link to="/login" className="bg-surface border border-border-subtle hover:border-primary p-5 rounded transition-all group">
          <span className="material-symbols-outlined text-primary text-3xl mb-2 group-hover:scale-110 transition-transform">login</span>
          <h3 className="font-display-lg text-lg text-on-surface font-bold">User Login</h3>
          <p className="font-data-mono text-xs text-on-surface-variant mt-1">Operative Authentication & Access</p>
        </Link>

        <Link to="/register" className="bg-surface border border-border-subtle hover:border-primary p-5 rounded transition-all group">
          <span className="material-symbols-outlined text-primary text-3xl mb-2 group-hover:scale-110 transition-transform">person_add</span>
          <h3 className="font-display-lg text-lg text-on-surface font-bold">User Register</h3>
          <p className="font-data-mono text-xs text-on-surface-variant mt-1">Operative Profile Initialization</p>
        </Link>

        <Link to="/authorization" className="bg-surface border border-border-subtle hover:border-primary p-5 rounded transition-all group">
          <span className="material-symbols-outlined text-primary text-3xl mb-2 group-hover:scale-110 transition-transform">verified_user</span>
          <h3 className="font-display-lg text-lg text-on-surface font-bold">Authorization</h3>
          <p className="font-data-mono text-xs text-on-surface-variant mt-1">Command Center Telemetry</p>
        </Link>

        <Link to="/blogs" className="bg-surface border border-border-subtle hover:border-primary p-5 rounded transition-all group">
          <span className="material-symbols-outlined text-primary text-3xl mb-2 group-hover:scale-110 transition-transform">article</span>
          <h3 className="font-display-lg text-lg text-on-surface font-bold">Blogs List</h3>
          <p className="font-data-mono text-xs text-on-surface-variant mt-1">Public Intelligence Dispatches</p>
        </Link>

        <Link to="/marketing/posts" className="bg-surface border border-border-subtle hover:border-primary p-5 rounded transition-all group">
          <span className="material-symbols-outlined text-primary text-3xl mb-2 group-hover:scale-110 transition-transform">campaign</span>
          <h3 className="font-display-lg text-lg text-on-surface font-bold">Marketing Posts</h3>
          <p className="font-data-mono text-xs text-on-surface-variant mt-1">Public Campaign Broadcasts</p>
        </Link>

        <Link to="/admin/users" className="bg-surface border border-border-subtle hover:border-tertiary p-5 rounded transition-all group">
          <span className="material-symbols-outlined text-tertiary text-3xl mb-2 group-hover:scale-110 transition-transform">group</span>
          <h3 className="font-display-lg text-lg text-tertiary font-bold">Admin Panel</h3>
          <p className="font-data-mono text-xs text-on-surface-variant mt-1">Users Management & Access</p>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;

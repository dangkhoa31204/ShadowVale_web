import React from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { FeatureGrid } from './components/FeatureGrid';

export const HomePage: React.FC = () => {
  return (
    <div className="w-full flex flex-col min-h-screen bg-background text-on-surface">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <HeroSection />
        <FeatureGrid />
      </main>
    </div>
  );
};

export default HomePage;

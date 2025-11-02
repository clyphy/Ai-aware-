

import React from 'react';
import { Shield, ShieldAlert, Image, Film, Mic, Heart, Palette, Cpu, BrainCircuit, Headphones, FileText } from 'lucide-react';
import type { Tab } from '../App';

interface FeatureTabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'map', label: 'Anomaly Map', icon: Shield },
  { id: 'chat', label: 'Confessor', icon: ShieldAlert },
  { id: 'image', label: 'Image Tools', icon: Image },
  { id: 'video', label: 'Video Gen', icon: Film },
  { id: 'live', label: 'Live Agent', icon: Mic },
  { id: 'memory', label: 'Memory', icon: Heart },
  { id: 'dahlia', label: 'Dahlia', icon: Palette },
  { id: 'ghost-mine', label: 'Ghost Mine', icon: Cpu },
  { id: 'oracle', label: 'Oracle', icon: BrainCircuit },
  { id: 'sanctum', label: 'Sanctum', icon: Headphones },
  { id: 'stewardship', label: 'Stewardship', icon: FileText },
];

const FeatureTabs: React.FC<FeatureTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="flex flex-wrap justify-center space-x-1 md:space-x-2 p-2 rounded-lg border border-cyan-500/30 bg-black/20 backdrop-blur-sm">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`holographic-button px-3 py-2 text-xs md:px-4 md:text-base rounded-md flex items-center space-x-2 ${
            activeTab === id ? 'bg-cyan-400/30 shadow-[0_0_15px_rgba(0,255,255,0.5)]' : ''
          }`}
          aria-current={activeTab === id ? 'page' : undefined}
        >
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden md:inline">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default FeatureTabs;

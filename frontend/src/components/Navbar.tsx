import React from 'react';
import {
  Navigation,
  MapPin,
  Share2,
  BarChart3,
  Car,
  Play,
  Pause,
  RefreshCw,
  Database,
  Layers,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'map' | 'rentals' | 'graph' | 'analytics';
  setActiveTab: (tab: 'map' | 'rentals' | 'graph' | 'analytics') => void;
  health: { mongodb: string; neo4j: string } | null;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onTickSimulation: () => void;
  vehicleCount: number;
  activeRentalsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  health,
  isSimulating,
  onToggleSimulation,
  onTickSimulation,
  vehicleCount,
  activeRentalsCount,
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Project Info */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white m-0">SmartFleet</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                Big Data IoT
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0">
              Polyglot Persistence: <span className="text-emerald-400 font-medium">MongoDB</span> + <span className="text-blue-400 font-medium">Neo4j</span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 text-sm">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'map'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Live Fleet</span>
            <span className="text-xs bg-black/30 px-1.5 py-0.5 rounded-full text-slate-200">
              {vehicleCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rentals')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'rentals'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>Route & Rentals</span>
            {activeRentalsCount > 0 && (
              <span className="text-xs bg-amber-500/30 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-full font-semibold">
                {activeRentalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'graph'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Neo4j Graph</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Big Data Analytics</span>
          </button>
        </nav>

        {/* Database Badges & Simulation Control */}
        <div className="flex items-center gap-3">
          {/* DB Health */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">Mongo:</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.mongodb === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300">Neo4j:</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.neo4j === 'CONNECTED' ? 'bg-blue-400 animate-pulse' : 'bg-red-400'
                }`}
              />
            </div>
          </div>

          {/* IoT Telemetry Simulation Toggle */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700">
            <button
              onClick={onToggleSimulation}
              title={isSimulating ? 'Pause IoT Simulation' : 'Start IoT Simulation'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition ${
                isSimulating
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulating ? 'Sim Active' : 'Sim Paused'}</span>
            </button>

            <button
              onClick={onTickSimulation}
              title="Step Single Simulation Tick"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { GraphData, RebalancingItem } from '../types';
import { api } from '../services/api';
import {
  Share2,
  RefreshCw,
  Info,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface SimulatedNode {
  id: string;
  label: string;
  type: 'Hub' | 'Vehicle' | 'Customer' | 'Technician';
  properties: Record<string, any>;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const Neo4jGraphPage: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [rebalancing, setRebalancing] = useState<RebalancingItem[]>([]);
  const [hubStats, setHubStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SimulatedNode | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [activeSubTab, setActiveSubTab] = useState<'graph' | 'inventory' | 'rebalance'>('graph');

  // Simulated node physics layout
  const [simNodes, setSimNodes] = useState<SimulatedNode[]>([]);
  const animRef = useRef<number | null>(null);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const [g, reb, inv] = await Promise.all([
        api.getNetworkGraph(35),
        api.getRebalancingRecommendations(),
        api.getHubInventory(),
      ]);
      setGraphData(g);
      setRebalancing(reb);
      setHubStats(inv);

      // Initialize initial radial/distributed positions
      const width = 800;
      const height = 600;
      const initialized: SimulatedNode[] = g.nodes.map((n, i) => {
        const angle = (i / g.nodes.length) * 2 * Math.PI;
        const radius = n.type === 'Hub' ? 140 : n.type === 'Vehicle' ? 240 : 320;
        return {
          ...n,
          x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
          y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
        };
      });
      setSimNodes(initialized);
    } catch (err) {
      console.error('Failed to load graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  // Simple Force-Simulation step for smooth organic positioning
  useEffect(() => {
    if (simNodes.length === 0) return;

    let step = 0;
    const interval = setInterval(() => {
      if (step > 40) {
        clearInterval(interval);
        return;
      }
      step++;

      setSimNodes((prevNodes) => {
        const next = prevNodes.map((n) => ({ ...n }));
        const nodeMap = new Map(next.map((n) => [n.id, n]));

        // 1. Repulsion between all nodes
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const n1 = next[i];
            const n2 = next[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 180) {
              const force = (180 - dist) * 0.04;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.x -= fx;
              n1.y -= fy;
              n2.x += fx;
              n2.y += fy;
            }
          }
        }

        // 2. Attraction along edges
        graphData.edges.forEach((e) => {
          const s = nodeMap.get(e.source);
          const t = nodeMap.get(e.target);
          if (s && t) {
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = e.label === 'CONNECTED_TO' ? 130 : 90;
            const force = (dist - targetDist) * 0.03;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            s.x += fx;
            s.y += fy;
            t.x -= fx;
            t.y -= fy;
          }
        });

        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [graphData]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const nodeColorMap = {
    Hub: '#06b6d4', // Cyan
    Vehicle: '#10b981', // Emerald
    Customer: '#f59e0b', // Amber
    Technician: '#a855f7', // Purple
  };

  const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-4">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white m-0">Neo4j Network & Knowledge Graph</h2>
          <p className="text-xs text-slate-400 m-0">
            Real-time road topology, station inventory graphs, and customer-vehicle lineages
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveSubTab('graph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'graph'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Graph View
            </button>
            <button
              onClick={() => setActiveSubTab('inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'inventory'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hub Inventory
            </button>
            <button
              onClick={() => setActiveSubTab('rebalance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'rebalance'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Rebalancing</span>
              {rebalancing.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 text-[10px]">
                  {rebalancing.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={loadGraph}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Refresh Graph"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {activeSubTab === 'graph' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[680px]">
          {/* Main SVG Graph Canvas */}
          <div
            className="lg:col-span-8 bg-slate-900/90 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Canvas Controls */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700 backdrop-blur">
              <button
                onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
                className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
                className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                title="Reset View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Legend */}
            <div className="absolute top-4 right-4 z-20 bg-slate-900/90 border border-slate-700/80 backdrop-blur px-3 py-2 rounded-lg text-xs space-y-1 shadow-lg">
              <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Graph Labels
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
                <span className="text-slate-300">:Hub Node</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                <span className="text-slate-300">:Vehicle Node</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="text-slate-300">:Customer Node</span>
              </div>
            </div>

            {/* SVG Visualizer */}
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 800 600"
              className="w-full h-full"
            >
              <g
                transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                transform-origin="400 300"
              >
                {/* Edges */}
                {graphData.edges.map((edge) => {
                  const source = nodeMap.get(edge.source);
                  const target = nodeMap.get(edge.target);
                  if (!source || !target) return null;

                  const strokeColor =
                    edge.label === 'CONNECTED_TO'
                      ? '#3b82f6'
                      : edge.label === 'RENTED'
                      ? '#f59e0b'
                      : '#10b981';

                  const isDashed = edge.label === 'RENTED';

                  return (
                    <g key={edge.id}>
                      <line
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={strokeColor}
                        strokeWidth={edge.label === 'CONNECTED_TO' ? 2 : 1.5}
                        strokeDasharray={isDashed ? '4,4' : undefined}
                        strokeOpacity={0.6}
                      />
                    </g>
                  );
                })}

                {/* Nodes */}
                {simNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const color = nodeColorMap[node.type] || '#94a3b8';
                  const radius = node.type === 'Hub' ? 18 : node.type === 'Vehicle' ? 13 : 11;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node);
                      }}
                      className="cursor-pointer"
                    >
                      {/* Selection ring */}
                      {isSelected && (
                        <circle
                          r={radius + 6}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={2}
                          strokeDasharray="3,3"
                        />
                      )}

                      {/* Node Circle */}
                      <circle
                        r={radius}
                        fill={color}
                        stroke="#0f172a"
                        strokeWidth={2}
                        className="transition hover:opacity-80"
                      />

                      {/* Icon or Initials */}
                      <text
                        textAnchor="middle"
                        dy=".3em"
                        fill="#0f172a"
                        fontSize={node.type === 'Hub' ? '11px' : '9px'}
                        fontWeight="bold"
                      >
                        {node.type === 'Hub' ? 'H' : node.type === 'Vehicle' ? 'V' : 'C'}
                      </text>

                      {/* Label under node */}
                      <text
                        y={radius + 12}
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="9px"
                        fontWeight="500"
                        className="pointer-events-none"
                      >
                        {node.label.length > 18 ? `${node.label.slice(0, 16)}...` : node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Node Inspector Panel */}
          <div className="lg:col-span-4 bg-slate-900/90 rounded-xl border border-slate-800 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <Info className="w-4 h-4" /> Graph Node Inspector
              </div>

              {selectedNode ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold uppercase"
                        style={{
                          backgroundColor: `${nodeColorMap[selectedNode.type]}22`,
                          color: nodeColorMap[selectedNode.type],
                        }}
                      >
                        :{selectedNode.type}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {selectedNode.id}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white m-0">{selectedNode.label}</h3>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Node Cypher Properties
                    </h4>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs overflow-x-auto">
                      {Object.entries(selectedNode.properties || {}).map(([k, v]) => (
                        <div key={k} className="flex justify-between py-0.5 border-b border-slate-900">
                          <span className="text-cyan-400">{k}:</span>
                          <span className="text-slate-300">
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Connected Relationships
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {graphData.edges
                        .filter(
                          (e) => e.source === selectedNode.id || e.target === selectedNode.id
                        )
                        .map((e, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-slate-800/40 border border-slate-700/50 text-xs flex items-center justify-between"
                          >
                            <span className="text-blue-400 font-mono">[:{e.label}]</span>
                            <span className="text-slate-400 text-[11px]">
                              {e.source === selectedNode.id ? `→ ${e.target}` : `← ${e.source}`}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-800/20 rounded-xl border border-slate-800">
                  Click on any Hub, Vehicle, or Customer node in the graph to inspect its Cypher
                  properties and connections.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
              Graph network updates automatically when vehicles travel or rentals are booked.
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'inventory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {hubStats.map((h) => (
            <div
              key={h.hubId}
              className="bg-slate-900/90 rounded-xl border border-slate-800 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {h.hubId}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    h.status === 'SURPLUS'
                      ? 'bg-amber-500/20 text-amber-400'
                      : h.status === 'DEFICIT'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {h.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white m-0">{h.hubName}</h3>
                <p className="text-xs text-slate-400 m-0">{h.city}</p>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Occupancy</span>
                  <span className="font-bold text-white">
                    {h.availableCount} / {h.capacity} ({h.occupancyPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      h.occupancyPct > 75
                        ? 'bg-amber-400'
                        : h.occupancyPct < 30
                        ? 'bg-red-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, h.occupancyPct)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'rebalance' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 flex items-center gap-3 text-xs text-cyan-300">
            <TrendingUp className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>
              Neo4j Graph Rebalancing analyzes hub connectivity, transit distances, and current
              station capacity deficits to recommend optimal vehicle redistribution transfers.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rebalancing.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/90 rounded-xl border border-slate-800 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Recommended: Transfer {item.recommendedVehicles} Vehicles
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{item.distanceKm} km</span>
                </div>

                <div className="flex items-center gap-3 text-sm font-semibold">
                  <div className="p-2.5 bg-slate-800 rounded-lg text-white">
                    {item.fromHubName}
                  </div>
                  <ArrowRight className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div className="p-2.5 bg-slate-800 rounded-lg text-white">
                    {item.toHubName}
                  </div>
                </div>

                <p className="text-xs text-slate-400 m-0">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

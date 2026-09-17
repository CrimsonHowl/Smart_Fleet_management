import React, { useState, useEffect } from 'react';
import { AnalyticsData } from '../types';
import { api } from '../services/api';
import {
  BarChart3,
  DollarSign,
  Activity,
  AlertTriangle,
  Radio,
  Zap,
  RefreshCw,
  Database,
  Layers,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const AnalyticsDashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!analytics && loading) {
    return (
      <div className="p-12 text-center text-slate-400">Loading Big Data Analytics...</div>
    );
  }

  const typeChartData = (analytics?.typeMetrics || []).map((m) => ({
    name: m._id,
    'Avg Battery %': Math.round(m.avgBattery || 0),
    'Avg Fuel %': Math.round(m.avgFuel || 0),
    'Avg Odometer (x1000 km)': Math.round((m.avgMileage || 0) / 1000),
  }));

  const totalRevenue = (analytics?.rentalRevenue || []).reduce(
    (sum, r) => sum + (r.totalRevenue || 0),
    0
  );
  const totalDistance = (analytics?.rentalRevenue || []).reduce(
    (sum, r) => sum + (r.totalDistanceKm || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white m-0">Big Data & IoT Telemetry Analytics</h2>
          <p className="text-xs text-slate-400 m-0">
            Real-time MongoDB Aggregation Pipelines & Geospatial Event Telemetry
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Aggregations</span>
        </button>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800/50">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Rental Contract Volume</div>
            <div className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-cyan-950 text-cyan-400 rounded-xl border border-cyan-800/50">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Distance Tracked</div>
            <div className="text-2xl font-bold text-white">{totalDistance.toFixed(1)} km</div>
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-amber-950 text-amber-400 rounded-xl border border-amber-800/50">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Telemetry Anomaly Alerts</div>
            <div className="text-2xl font-bold text-amber-400">
              {(analytics?.alertMetrics || []).reduce((acc, a) => acc + a.count, 0)}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-blue-950 text-blue-400 rounded-xl border border-blue-800/50">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">IoT Stream Status</div>
            <div className="text-2xl font-bold text-emerald-400">Active Live</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Aggregated Vehicle Class Metrics */}
        <div className="lg:col-span-8 bg-slate-900/90 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white m-0 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" /> Fleet Energy & Mileage by Category
              </h3>
              <p className="text-xs text-slate-400 m-0">
                Computed via <code>db.vehicles.aggregate()</code> pipeline
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Avg Battery %" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Avg Fuel %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Avg Odometer (x1000 km)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Telemetry Anomalies Log */}
        <div className="lg:col-span-4 bg-slate-900/90 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white m-0 flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> IoT Anomaly Stream
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Geofence violations & harsh braking events logged in MongoDB
            </p>

            <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
              {(analytics?.recentAlerts || []).map((alert, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">{alert.alertType}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-slate-300 font-mono text-[11px]">
                    VIN: {alert.vin} · Speed: {alert.speedKmH} km/h
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    Location: [{alert.location.coordinates[1].toFixed(4)},{' '}
                    {alert.location.coordinates[0].toFixed(4)}]
                  </div>
                </div>
              ))}

              {(analytics?.recentAlerts || []).length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500">
                  No critical telemetry anomalies recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
            Indexed with MongoDB <code>2dsphere</code> & time-series indices.
          </div>
        </div>
      </div>

      {/* Educational Architecture Explanation for College Project Evaluation */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-cyan-300 m-0 flex items-center gap-2">
          🎓 Polyglot Persistence Architectural Division (Big Data Highlights)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 bg-slate-800/40 rounded-lg border border-slate-700/50 space-y-1">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Database className="w-4 h-4" /> Why MongoDB for Telemetry & Contracts?
            </div>
            <p className="text-slate-400 m-0">
              MongoDB excels at high-throughput time-series sensor ingestion, dynamic document
              schemas for variable vehicle types, and geospatial querying (<code>2dsphere</code>{' '}
              indexing for geofence boundaries and radius searches).
            </p>
          </div>

          <div className="p-3.5 bg-slate-800/40 rounded-lg border border-slate-700/50 space-y-1">
            <div className="font-bold text-blue-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> Why Neo4j for Hub Network & Fleet Allocation?
            </div>
            <p className="text-slate-400 m-0">
              Neo4j excels at graph traversals, route pathfinding (Dijkstra / shortestPath Cypher
              queries across multi-hub transit networks), station inventory graphs, and customer
              rental relationship networks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

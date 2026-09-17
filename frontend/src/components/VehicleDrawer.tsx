import React from 'react';
import { Vehicle, TelemetryPoint, Hub } from '../types';
import {
  X,
  Battery,
  Fuel,
  Gauge,
  Thermometer,
  MapPin,
  Clock,
  AlertTriangle,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface VehicleDrawerProps {
  vehicle: Vehicle | null;
  currentHub: Hub | null;
  telemetryHistory: TelemetryPoint[];
  onClose: () => void;
}

export const VehicleDrawer: React.FC<VehicleDrawerProps> = ({
  vehicle,
  currentHub,
  telemetryHistory,
  onClose,
}) => {
  if (!vehicle) return null;

  const chartData = telemetryHistory.map((t, idx) => ({
    time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    speed: t.speedKmH,
    battery: t.batteryPct,
    temp: t.engineTempC,
  }));

  const statusColors = {
    AVAILABLE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    ON_RENT: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    MAINTENANCE: 'bg-red-500/20 text-red-400 border-red-500/40',
    TRANSIT: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-slate-900 border-l border-slate-800 shadow-2xl z-[100] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                statusColors[vehicle.status] || 'bg-slate-700 text-slate-300'
              }`}
            >
              {vehicle.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-400 font-mono">{vehicle.licensePlate}</span>
          </div>
          <h2 className="text-lg font-bold text-white m-0">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>
          <p className="text-xs text-slate-400 font-mono m-0">VIN: {vehicle.vin}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Real-time Diagnostics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>Current Speed</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {vehicle.speedKmH}{' '}
              <span className="text-xs font-normal text-slate-400">km/h</span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              {vehicle.type === 'ELECTRIC' ? (
                <Battery className="w-4 h-4 text-emerald-400" />
              ) : (
                <Fuel className="w-4 h-4 text-amber-400" />
              )}
              <span>{vehicle.type === 'ELECTRIC' ? 'Battery' : 'Fuel'} Level</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {vehicle.type === 'ELECTRIC' ? vehicle.batteryPct : vehicle.fuelPct}%
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  (vehicle.type === 'ELECTRIC' ? vehicle.batteryPct : vehicle.fuelPct) < 20
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${vehicle.type === 'ELECTRIC' ? vehicle.batteryPct : vehicle.fuelPct}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Thermometer className="w-4 h-4 text-red-400" />
              <span>Engine Temp</span>
            </div>
            <div className="text-xl font-bold text-white">
              {vehicle.engineTempC}°C
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Odometer</span>
            </div>
            <div className="text-xl font-bold text-white">
              {vehicle.odometerKm.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">km</span>
            </div>
          </div>
        </div>

        {/* Station / Hub Node (Neo4j link) */}
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5" /> Neo4j Hub Assignment
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">
              {vehicle.currentHubId}
            </span>
          </div>
          <div className="font-semibold text-white">
            {currentHub?.name || 'In Transit between Hubs'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Coordinates: [{vehicle.currentLocation.coordinates[1].toFixed(4)},{' '}
            {vehicle.currentLocation.coordinates[0].toFixed(4)}]
          </div>
        </div>

        {/* Telemetry Chart: Speed & Battery Trends (from MongoDB Time-Series) */}
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5" /> MongoDB IoT Telemetry Stream
            </span>
            <span className="text-xs text-slate-400">{telemetryHistory.length} data points</span>
          </div>

          {chartData.length > 0 ? (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 'auto']} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="speed"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                    name="Speed (km/h)"
                  />
                  <Line
                    type="monotone"
                    dataKey="battery"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Battery %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-6 text-center">
              No historical telemetry recorded yet for this vehicle.
            </div>
          )}
        </div>

        {/* Alerts & Events */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Recent Telemetry Events
          </h3>
          <div className="space-y-2">
            {telemetryHistory.filter((t) => t.harshBraking || t.geofenceViolation).length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/30 border border-slate-700/40 text-xs text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No harsh braking or geofence breaches detected.</span>
              </div>
            ) : (
              telemetryHistory
                .filter((t) => t.harshBraking || t.geofenceViolation)
                .slice(-3)
                .map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">
                        {ev.harshBraking ? 'Harsh Braking Event' : 'Geofence Boundary Alert'}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Recorded at {new Date(ev.timestamp).toLocaleTimeString()} · Speed:{' '}
                        {ev.speedKmH} km/h
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

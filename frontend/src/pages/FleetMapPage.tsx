import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Vehicle, Hub } from '../types';
import {
  Car,
  Battery,
  Fuel,
  Filter,
  Search,
  ChevronRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';

// Fix Leaflet default icon issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom vehicle icons using HTML/SVG DivIcon
function createVehicleIcon(status: string, type: string) {
  const color =
    status === 'ON_RENT'
      ? '#f59e0b'
      : status === 'AVAILABLE'
      ? '#10b981'
      : '#ef4444';

  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px ${color}88;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 13px;
        font-weight: bold;
      ">
        🚗
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// Custom Hub icon
function createHubIcon() {
  return L.divIcon({
    className: 'custom-hub-marker',
    html: `
      <div style="
        background: linear-gradient(135deg, #06b6d4, #2563eb);
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px rgba(6, 182, 212, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 15px;
      ">
        🏢
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

interface FleetMapPageProps {
  vehicles: Vehicle[];
  hubs: Hub[];
  onSelectVehicle: (v: Vehicle) => void;
  selectedVehicle: Vehicle | null;
}

export const FleetMapPage: React.FC<FleetMapPageProps> = ({
  vehicles,
  hubs,
  onSelectVehicle,
  selectedVehicle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Filtered vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vin.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || v.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const availableCount = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const onRentCount = vehicles.filter((v) => v.status === 'ON_RENT').length;
  const maintenanceCount = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
  const avgBattery = Math.round(
    vehicles.reduce((sum, v) => sum + (v.batteryPct || 0), 0) / (vehicles.length || 1)
  );

  return (
    <div className="space-y-4">
      {/* Fleet Quick Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex items-center gap-3">
          <div className="p-3 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-800/40">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Fleet</div>
            <div className="text-2xl font-bold text-white">{vehicles.length}</div>
          </div>
        </div>

        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex items-center gap-3">
          <div className="p-3 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Available Now</div>
            <div className="text-2xl font-bold text-emerald-400">{availableCount}</div>
          </div>
        </div>

        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex items-center gap-3">
          <div className="p-3 bg-amber-950 text-amber-400 rounded-lg border border-amber-800/40">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">On Active Rent</div>
            <div className="text-2xl font-bold text-amber-400">{onRentCount}</div>
          </div>
        </div>

        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex items-center gap-3">
          <div className="p-3 bg-blue-950 text-blue-400 rounded-lg border border-blue-800/40">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Avg Fleet Battery</div>
            <div className="text-2xl font-bold text-cyan-400">{avgBattery}%</div>
          </div>
        </div>
      </div>

      {/* Main Map & Fleet List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px]">
        {/* Left Side: Fleet Filter & List */}
        <div className="lg:col-span-4 bg-slate-900/90 rounded-xl border border-slate-800 p-4 flex flex-col h-full overflow-hidden">
          {/* Search and Filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search make, model, plate, VIN..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ON_RENT">On Rent</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Types</option>
                <option value="ELECTRIC">Electric</option>
                <option value="SEDAN">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="TRUCK">Truck</option>
                <option value="VAN">Van</option>
              </select>
            </div>
          </div>

          {/* Vehicle List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredVehicles.map((v) => {
              const isSelected = selectedVehicle?.vin === v.vin;
              return (
                <div
                  key={v.vin}
                  onClick={() => onSelectVehicle(v)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50'
                      : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            v.status === 'AVAILABLE'
                              ? 'bg-emerald-400'
                              : v.status === 'ON_RENT'
                              ? 'bg-amber-400 animate-ping'
                              : 'bg-red-400'
                          }`}
                        />
                        <span className="text-xs font-semibold text-white">
                          {v.year} {v.make} {v.model}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {v.licensePlate} · {v.type}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-cyan-400">${v.dailyRate}/day</span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {v.status === 'ON_RENT' ? `${v.speedKmH} km/h` : 'Parked'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/40 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        {v.type === 'ELECTRIC' ? (
                          <Battery className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Fuel className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>{v.type === 'ELECTRIC' ? v.batteryPct : v.fuelPct}%</span>
                      </span>
                      <span>·</span>
                      <span>{v.currentHubId}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Leaflet Interactive Map */}
        <div className="lg:col-span-8 bg-slate-900/90 rounded-xl border border-slate-800 p-2 relative h-full overflow-hidden">
          {/* Map Legend */}
          <div className="absolute top-4 right-4 z-20 bg-slate-900/90 border border-slate-700 backdrop-blur px-3 py-2 rounded-lg text-xs space-y-1.5 shadow-xl">
            <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Map Legend
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-300">Available Vehicle</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="text-slate-300">Moving / On-Rent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
              <span className="text-slate-300">Neo4j Hub / Station</span>
            </div>
          </div>

          <MapContainer
            center={[37.65, -122.25]}
            zoom={10}
            scrollWheelZoom={true}
            className="w-full h-full rounded-lg"
          >
            {/* CartoDB Dark Matter Tiles */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Render Hub Markers */}
            {hubs.map((hub) => (
              <Marker
                key={hub.id}
                position={[hub.latitude, hub.longitude]}
                icon={createHubIcon()}
              >
                <Popup className="dark-popup">
                  <div className="p-1 text-slate-900">
                    <div className="font-bold text-sm">{hub.name}</div>
                    <div className="text-xs text-slate-600">
                      City: {hub.city} · Capacity: {hub.capacity}
                    </div>
                    <div className="text-[11px] font-mono text-cyan-700 mt-1">
                      ID: {hub.id}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render Vehicle Markers */}
            {vehicles.map((vehicle) => {
              const [lng, lat] = vehicle.currentLocation.coordinates;
              return (
                <Marker
                  key={vehicle.vin}
                  position={[lat, lng]}
                  icon={createVehicleIcon(vehicle.status, vehicle.type)}
                  eventHandlers={{
                    click: () => onSelectVehicle(vehicle),
                  }}
                >
                  <Popup>
                    <div className="p-1 text-slate-900">
                      <div className="font-bold text-sm">
                        {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-xs text-slate-600">
                        Plate: {vehicle.licensePlate} · Status: {vehicle.status}
                      </div>
                      <div className="text-xs text-slate-600">
                        Speed: {vehicle.speedKmH} km/h · Battery: {vehicle.batteryPct}%
                      </div>
                      <button
                        onClick={() => onSelectVehicle(vehicle)}
                        className="mt-2 text-xs px-2 py-1 bg-cyan-600 text-white rounded font-medium cursor-pointer"
                      >
                        Inspect Telemetry & IoT
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Hub, Vehicle, RoutePlan, Rental } from '../types';
import { api } from '../services/api';
import {
  Navigation,
  MapPin,
  Car,
  Calendar,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface RentalPlannerPageProps {
  hubs: Hub[];
  vehicles: Vehicle[];
  onRefresh: () => void;
}

export const RentalPlannerPage: React.FC<RentalPlannerPageProps> = ({
  hubs,
  vehicles,
  onRefresh,
}) => {
  const [originHubId, setOriginHubId] = useState<string>(hubs[0]?.id || 'hub-sf-dntn');
  const [destHubId, setDestHubId] = useState<string>(hubs[1]?.id || 'hub-sjc-apt');
  const [selectedVin, setSelectedVin] = useState<string>('');
  const [customerName, setCustomerName] = useState('John Carter');
  const [customerPhone, setCustomerPhone] = useState('+1-415-555-0921');
  const [durationDays, setDurationDays] = useState(2);
  const [insuranceTier, setInsuranceTier] = useState<'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('PREMIUM');

  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [activeTab, setActiveTab] = useState<'plan' | 'active'>('plan');

  // Load active rentals
  const loadRentals = async () => {
    try {
      const data = await api.getRentals();
      setRentals(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRentals();
  }, []);

  // Compute Neo4j Shortest Route whenever origin or destination changes
  useEffect(() => {
    if (originHubId && destHubId) {
      setLoadingRoute(true);
      api
        .calculateRoute(originHubId, destHubId)
        .then((res) => {
          setRoutePlan(res);
        })
        .catch((err) => {
          console.error('Route calculation error:', err);
          setRoutePlan(null);
        })
        .finally(() => setLoadingRoute(false));
    }
  }, [originHubId, destHubId]);

  // Filter available vehicles at the chosen origin hub
  const availableAtOrigin = vehicles.filter(
    (v) => v.status === 'AVAILABLE' && v.currentHubId === originHubId
  );

  // Auto-select first available vehicle at hub if none selected
  useEffect(() => {
    if (availableAtOrigin.length > 0 && (!selectedVin || !availableAtOrigin.some((v) => v.vin === selectedVin))) {
      setSelectedVin(availableAtOrigin[0].vin);
    }
  }, [originHubId, vehicles]);

  const chosenVehicle = vehicles.find((v) => v.vin === selectedVin);
  const estimatedVehicleCost = chosenVehicle ? chosenVehicle.dailyRate * durationDays : 0;
  const totalEstimatedCost = estimatedVehicleCost + (routePlan?.totalTollFee || 0);

  const handleBookRental = async () => {
    if (!chosenVehicle || !originHubId || !destHubId) return;

    setBookingLoading(true);
    try {
      const result = await api.createRental({
        customerId: `CUST-${Math.floor(100 + Math.random() * 900)}`,
        customerName,
        customerPhone,
        vin: chosenVehicle.vin,
        originHubId,
        destinationHubId: destHubId,
        durationDays,
        insuranceTier,
      });

      setBookingSuccess(
        `Rental ${result.rental.rentalId} confirmed! Synchronized with MongoDB and Neo4j graph.`
      );
      loadRentals();
      onRefresh();
      setTimeout(() => setBookingSuccess(null), 5000);
    } catch (err: any) {
      alert(`Booking failed: ${err.message}`);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCompleteRental = async (rentalId: string) => {
    if (!confirm('Confirm return and vehicle check-in?')) return;
    try {
      await api.completeRental(rentalId);
      loadRentals();
      onRefresh();
    } catch (err: any) {
      alert(`Return failed: ${err.message}`);
    }
  };

  const activeRentals = rentals.filter((r) => r.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Tab Switcher: Plan Route vs Active Contracts */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white m-0">Rental & Route Planner</h2>
          <p className="text-xs text-slate-400 m-0">
            Powered by <span className="text-blue-400 font-medium">Neo4j Cypher Pathfinding</span> &{' '}
            <span className="text-emerald-400 font-medium">MongoDB Contract Store</span>
          </p>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'plan'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            New Rental Booking
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'active'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Active Contracts</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-cyan-300 text-[10px]">
              {activeRentals.length}
            </span>
          </button>
        </div>
      </div>

      {bookingSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-3 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{bookingSuccess}</span>
        </div>
      )}

      {activeTab === 'plan' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Route Selector & Parameters */}
          <div className="lg:col-span-6 space-y-5">
            {/* Hub Selection Card */}
            <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                <Navigation className="w-4 h-4" /> 1. Select Pick-up & Return Hubs
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Origin Pick-up Hub
                  </label>
                  <select
                    value={originHubId}
                    onChange={(e) => setOriginHubId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Destination Drop-off Hub
                  </label>
                  <select
                    value={destHubId}
                    onChange={(e) => setDestHubId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Neo4j Calculated Route Box */}
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 mt-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-blue-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Neo4j Shortest Path Traversal
                  </span>
                  {loadingRoute && <span className="text-cyan-400 animate-pulse">Calculating...</span>}
                </div>

                {routePlan ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-700/40">
                        <div className="text-[11px] text-slate-400">Distance</div>
                        <div className="text-sm font-bold text-white">{routePlan.totalDistanceKm} km</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-700/40">
                        <div className="text-[11px] text-slate-400">Est. Time</div>
                        <div className="text-sm font-bold text-white">{routePlan.totalDurationMin} min</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-700/40">
                        <div className="text-[11px] text-slate-400">Bridge Tolls</div>
                        <div className="text-sm font-bold text-white">${routePlan.totalTollFee.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Step-by-step Waypoint Nodes */}
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1.5 font-medium">
                        Checkpoint Waypoints:
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {routePlan.path.map((node, i) => (
                          <React.Fragment key={node.id}>
                            <span className="px-2 py-1 rounded bg-slate-900 text-slate-200 border border-slate-700 font-medium">
                              {node.name}
                            </span>
                            {i < routePlan.path.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center py-2">
                    Select origin and destination to calculate path.
                  </div>
                )}
              </div>
            </div>

            {/* Customer Details Card */}
            <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                2. Customer & Rental Specifications
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Rental Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Insurance Tier
                  </label>
                  <select
                    value={insuranceTier}
                    onChange={(e) => setInsuranceTier(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="BASIC">Basic ($0/day deductible $1000)</option>
                    <option value="PREMIUM">Premium Full Coverage ($15/day)</option>
                    <option value="ENTERPRISE">Enterprise Zero Liability ($30/day)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Vehicle Selection & Checkout */}
          <div className="lg:col-span-6 space-y-5">
            {/* Vehicle Selection at Selected Hub */}
            <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                  3. Select Vehicle at Pick-up Hub
                </span>
                <span className="text-xs text-slate-400">
                  {availableAtOrigin.length} available at this station
                </span>
              </div>

              {availableAtOrigin.length === 0 ? (
                <div className="p-6 text-center text-xs text-amber-300 bg-amber-950/20 border border-amber-800/40 rounded-xl">
                  No available vehicles at this hub right now. Please select another pick-up hub.
                </div>
              ) : (
                <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                  {availableAtOrigin.map((v) => {
                    const isSelected = selectedVin === v.vin;
                    return (
                      <div
                        key={v.vin}
                        onClick={() => setSelectedVin(v.vin)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50'
                            : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm text-white">
                            {v.year} {v.make} {v.model}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {v.licensePlate} · {v.type} · Battery: {v.batteryPct}%
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold text-cyan-400">${v.dailyRate}/day</div>
                          <div className="text-[11px] text-slate-400">
                            {isSelected ? '✓ Selected' : 'Click to select'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Price Breakdown & Instant Dual-Store Sync Button */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 shadow-xl">
              <div className="font-semibold text-sm text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Contract & Pricing Summary
              </div>

              <div className="space-y-2 text-xs border-b border-slate-800 pb-3">
                <div className="flex justify-between text-slate-300">
                  <span>
                    Vehicle Rate (${chosenVehicle?.dailyRate || 0} × {durationDays} days):
                  </span>
                  <span className="font-mono text-white">${estimatedVehicleCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Network Road & Bridge Tolls:</span>
                  <span className="font-mono text-white">
                    ${(routePlan?.totalTollFee || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Insurance Tier ({insuranceTier}):</span>
                  <span className="font-mono text-white">Included</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Total Estimated Cost</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    ${totalEstimatedCost.toFixed(2)}
                  </div>
                </div>

                <button
                  disabled={!chosenVehicle || bookingLoading}
                  onClick={handleBookRental}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/30 transition flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{bookingLoading ? 'Processing...' : 'Confirm & Sync Booking'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 text-center">
                Dual persistence: writes rental invoice to <strong>MongoDB</strong> & creates{' '}
                <code>(Customer)-[:RENTED]-&gt;(Vehicle)</code> graph relationship in{' '}
                <strong>Neo4j</strong>.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Contracts View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRentals.map((r) => (
              <div
                key={r.rentalId}
                className="bg-slate-900/90 rounded-xl border border-slate-800 p-5 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                      {r.rentalId}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                      ACTIVE
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white m-0">{r.vehicleModel}</h3>
                  <div className="text-xs text-slate-400 font-mono">VIN: {r.vehicleVin}</div>

                  <div className="mt-3 p-3 bg-slate-800/50 rounded-lg space-y-1.5 text-xs text-slate-300 border border-slate-700/50">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Customer:</span>
                      <span className="font-semibold text-white">{r.customerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Route:</span>
                      <span className="text-cyan-300">
                        {r.originHubName} → {r.destinationHubName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Distance:</span>
                      <span>{r.estimatedDistanceKm} km</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400">Total Price</div>
                    <div className="text-base font-bold text-white">${r.estimatedCost}</div>
                  </div>

                  <button
                    onClick={() => handleCompleteRental(r.rentalId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Return Vehicle</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {activeRentals.length === 0 && (
            <div className="p-12 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400">
              No active rentals right now. Use the "New Rental Booking" tab to create one!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import {
  Vehicle,
  TelemetryPoint,
  Hub,
  RoutePlan,
  Rental,
  GraphData,
  AnalyticsData,
  RebalancingItem,
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async getVehicles(filter?: { status?: string; type?: string; hubId?: string }): Promise<Vehicle[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.append('status', filter.status);
    if (filter?.type) params.append('type', filter.type);
    if (filter?.hubId) params.append('hubId', filter.hubId);

    const res = await fetch(`${API_BASE}/fleet?${params.toString()}`);
    const data = await res.json();
    return data.data || [];
  },

  async getVehicleDetails(vin: string): Promise<{
    vehicle: Vehicle;
    currentHub: Hub | null;
    telemetryHistory: TelemetryPoint[];
  }> {
    const res = await fetch(`${API_BASE}/fleet/${vin}`);
    const data = await res.json();
    return data.data;
  },

  async getHubs(): Promise<Hub[]> {
    const res = await fetch(`${API_BASE}/graph/hubs`);
    const data = await res.json();
    return data.data || [];
  },

  async calculateRoute(originId: string, destinationId: string): Promise<RoutePlan> {
    const res = await fetch(`${API_BASE}/graph/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originId, destinationId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to calculate route');
    return data.data;
  },

  async getNetworkGraph(limit = 40): Promise<GraphData> {
    const res = await fetch(`${API_BASE}/graph/network?limit=${limit}`);
    const data = await res.json();
    return data.data || { nodes: [], edges: [] };
  },

  async getHubInventory(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/graph/inventory`);
    const data = await res.json();
    return data.data || [];
  },

  async getRebalancingRecommendations(): Promise<RebalancingItem[]> {
    const res = await fetch(`${API_BASE}/graph/rebalance`);
    const data = await res.json();
    return data.data || [];
  },

  async getRentals(status?: string): Promise<Rental[]> {
    const url = status ? `${API_BASE}/rentals?status=${status}` : `${API_BASE}/rentals`;
    const res = await fetch(url);
    const data = await res.json();
    return data.data || [];
  },

  async createRental(payload: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    vin: string;
    originHubId: string;
    destinationHubId: string;
    durationDays: number;
    insuranceTier: string;
  }): Promise<{ rental: Rental; routePlan: RoutePlan }> {
    const res = await fetch(`${API_BASE}/rentals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create rental');
    return data.data;
  },

  async completeRental(rentalId: string, returnHubId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/rentals/${rentalId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnHubId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to complete rental');
    return data.data;
  },

  async getLiveTelemetry(): Promise<Vehicle[]> {
    const res = await fetch(`${API_BASE}/telemetry/live`);
    const data = await res.json();
    return data.data || [];
  },

  async triggerSimulationTick(): Promise<any> {
    const res = await fetch(`${API_BASE}/telemetry/simulate/tick`, { method: 'POST' });
    return res.json();
  },

  async toggleSimulation(start: boolean): Promise<any> {
    const endpoint = start ? 'start' : 'stop';
    const res = await fetch(`${API_BASE}/telemetry/simulate/${endpoint}`, { method: 'POST' });
    return res.json();
  },

  async getSimulationStatus(): Promise<{ isRunning: boolean; intervalMs: number }> {
    const res = await fetch(`${API_BASE}/telemetry/simulate/status`);
    const data = await res.json();
    return data.data;
  },

  async getAnalytics(): Promise<AnalyticsData> {
    const res = await fetch(`${API_BASE}/analytics`);
    const data = await res.json();
    return data.data;
  },
};

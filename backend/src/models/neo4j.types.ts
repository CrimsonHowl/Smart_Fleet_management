export interface HubNode {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  capacity: number;
  type: string; // 'AIRPORT' | 'CENTRAL' | 'SUBURB' | 'PORT'
}

export interface HubConnection {
  source: string;
  target: string;
  distanceKm: number;
  durationMinutes: number;
  tollFee: number;
}

export interface GraphVisualNode {
  id: string;
  label: string;
  type: 'Hub' | 'Vehicle' | 'Customer' | 'Technician';
  properties: Record<string, any>;
}

export interface GraphVisualEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  properties?: Record<string, any>;
}

export interface RoutePathResult {
  origin: HubNode;
  destination: HubNode;
  path: HubNode[];
  totalDistanceKm: number;
  totalDurationMin: number;
  totalTollFee: number;
  segments: {
    from: string;
    to: string;
    distanceKm: number;
    durationMinutes: number;
    tollFee: number;
  }[];
}

export interface HubInventoryStats {
  hubId: string;
  hubName: string;
  city: string;
  capacity: number;
  availableCount: number;
  occupancyPct: number;
  status: 'OPTIMAL' | 'SURPLUS' | 'DEFICIT';
}

export interface RebalancingRecommendation {
  fromHubId: string;
  fromHubName: string;
  toHubId: string;
  toHubName: string;
  recommendedVehicles: number;
  distanceKm: number;
  reason: string;
}

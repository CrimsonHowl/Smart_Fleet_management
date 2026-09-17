import { VehicleModel, IVehicle } from '../models/Vehicle';
import { TelemetryModel } from '../models/Telemetry';
import { RentalModel } from '../models/Rental';
import { neo4jGraphService } from './neo4jGraphService';

interface ActiveSimulationTrack {
  vin: string;
  targetHubId: string;
  targetCoords: [number, number]; // [lng, lat]
  progressPct: number;
  speed: number;
}

export class TelemetrySimulatorService {
  private isRunning: boolean = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private simulationIntervalMs: number = 3000; // default 3s per tick

  /**
   * Run a single step of simulation across active/rented vehicles
   */
  async tickSimulation(): Promise<{ updatedCount: number; logsCreated: number }> {
    // Find all vehicles currently ON_RENT or AVAILABLE that can simulate subtle movement/jitter
    const vehicles = await VehicleModel.find({
      status: { $in: ['ON_RENT', 'AVAILABLE'] },
    }).limit(20);

    if (vehicles.length === 0) {
      return { updatedCount: 0, logsCreated: 0 };
    }

    const hubs = await neo4jGraphService.getAllHubs();
    const hubMap = new Map(hubs.map((h) => [h.id, h]));

    let logsCreated = 0;

    for (const vehicle of vehicles) {
      const isRented = vehicle.status === 'ON_RENT';
      let [lng, lat] = vehicle.currentLocation.coordinates;

      let speedKmH = 0;
      let harshBraking = false;
      let geofenceViolation = false;
      let alertType: string | null = null;

      if (isRented) {
        // Vehicle is moving between hubs
        // Add realistic drift towards its destination or along road vectors
        const targetHub = hubs[(hubs.findIndex((h) => h.id === vehicle.currentHubId) + 1) % hubs.length];
        const targetLng = targetHub ? targetHub.longitude : lng + 0.05;
        const targetLat = targetHub ? targetHub.latitude : lat + 0.05;

        // Step coordinates by a fraction (~40-90 km/h step)
        const step = 0.005; // ~500m per tick
        const dLng = targetLng - lng;
        const dLat = targetLat - lat;
        const dist = Math.sqrt(dLng * dLng + dLat * dLat);

        if (dist > 0.005) {
          lng += (dLng / dist) * step;
          lat += (dLat / dist) * step;
        } else {
          // Arrived close to target
          lng = targetLng;
          lat = targetLat;
        }

        speedKmH = Math.floor(45 + Math.random() * 45); // 45 to 90 km/h

        // Random harsh braking event (2% chance)
        if (Math.random() < 0.03) {
          harshBraking = true;
          speedKmH = Math.floor(speedKmH * 0.3);
          alertType = 'HARSH_BRAKING_EVENT';
        }

        // Random geofence violation (1% chance)
        if (Math.random() < 0.015) {
          geofenceViolation = true;
          alertType = 'GEOFENCE_BOUNDARY_BREACH';
        }

        // Drain battery or fuel
        if (vehicle.type === 'ELECTRIC') {
          vehicle.batteryPct = Math.max(5, Math.round((vehicle.batteryPct - 0.2) * 10) / 10);
        } else {
          vehicle.fuelPct = Math.max(5, Math.round((vehicle.fuelPct - 0.15) * 10) / 10);
        }

        // Increment odometer
        vehicle.odometerKm += Math.round((speedKmH / 3600) * 3 * 10) / 10;
      } else {
        // Available vehicle stationary at Hub - small GPS jitter
        speedKmH = 0;
        lng += (Math.random() - 0.5) * 0.0001;
        lat += (Math.random() - 0.5) * 0.0001;
      }

      vehicle.currentLocation = {
        type: 'Point',
        coordinates: [Math.round(lng * 100000) / 100000, Math.round(lat * 100000) / 100000],
      };
      vehicle.speedKmH = speedKmH;
      vehicle.engineTempC = isRented ? Math.floor(88 + Math.random() * 8) : 75;
      vehicle.lastSeen = new Date();

      await vehicle.save();

      // Write telemetry point to MongoDB
      await TelemetryModel.create({
        vin: vehicle.vin,
        vehicleId: vehicle._id,
        rentalId: vehicle.activeRentalId || null,
        timestamp: new Date(),
        location: vehicle.currentLocation,
        speedKmH,
        batteryPct: vehicle.batteryPct,
        fuelPct: vehicle.fuelPct,
        engineTempC: vehicle.engineTempC,
        harshBraking,
        geofenceViolation,
        alertType,
      });

      logsCreated++;
    }

    return { updatedCount: vehicles.length, logsCreated };
  }

  /**
   * Start automatic continuous simulation
   */
  startSimulation(intervalMs = 3000): void {
    if (this.isRunning) return;
    this.simulationIntervalMs = intervalMs;
    this.isRunning = true;
    this.intervalTimer = setInterval(async () => {
      try {
        await this.tickSimulation();
      } catch (err) {
        console.error('[Simulator] Tick error:', err);
      }
    }, this.simulationIntervalMs);
    console.log(`[Simulator] Started simulation with ${intervalMs}ms interval`);
  }

  /**
   * Stop continuous simulation
   */
  stopSimulation(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
    console.log('[Simulator] Stopped simulation');
  }

  getStatus(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.simulationIntervalMs,
    };
  }
}

export const telemetrySimulatorService = new TelemetrySimulatorService();

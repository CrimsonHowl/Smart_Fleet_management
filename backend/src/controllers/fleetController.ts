import { Request, Response } from 'express';
import { VehicleModel } from '../models/Vehicle';
import { TelemetryModel } from '../models/Telemetry';
import { neo4jGraphService } from '../services/neo4jGraphService';

export async function getVehicles(req: Request, res: Response) {
  try {
    const { status, type, hubId } = req.query;
    const filter: Record<string, any> = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (hubId) filter.currentHubId = hubId;

    const vehicles = await VehicleModel.find(filter).sort({ status: 1, make: 1 });
    return res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (err: any) {
    console.error('getVehicles error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getVehicleByVin(req: Request, res: Response) {
  try {
    const { vin } = req.params;
    const vehicle = await VehicleModel.findOne({ vin });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    // Fetch recent 50 telemetry points from MongoDB
    const recentTelemetry = await TelemetryModel.find({ vin })
      .sort({ timestamp: -1 })
      .limit(50);

    // Fetch Hub details from Neo4j
    const hubs = await neo4jGraphService.getAllHubs();
    const currentHub = hubs.find((h) => h.id === vehicle.currentHubId) || null;

    return res.json({
      success: true,
      data: {
        vehicle,
        currentHub,
        telemetryHistory: recentTelemetry.reverse(),
      },
    });
  } catch (err: any) {
    console.error('getVehicleByVin error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function findNearbyVehicles(req: Request, res: Response) {
  try {
    const lng = parseFloat(req.query.lng as string);
    const lat = parseFloat(req.query.lat as string);
    const maxDistanceMeters = parseFloat((req.query.maxDistance as string) || '30000'); // 30km default

    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({ success: false, error: 'Valid lng and lat required' });
    }

    const nearbyVehicles = await VehicleModel.find({
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    });

    return res.json({
      success: true,
      count: nearbyVehicles.length,
      data: nearbyVehicles,
    });
  } catch (err: any) {
    console.error('findNearbyVehicles error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

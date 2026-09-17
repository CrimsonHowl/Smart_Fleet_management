import { Request, Response } from 'express';
import { VehicleModel } from '../models/Vehicle';
import { TelemetryModel } from '../models/Telemetry';
import { RentalModel } from '../models/Rental';
import { neo4jGraphService } from '../services/neo4jGraphService';

export async function getDashboardAnalytics(req: Request, res: Response) {
  try {
    // 1. Vehicle status counts via Mongo Aggregation
    const statusCounts = await VehicleModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // 2. Average battery & fuel by vehicle type
    const typeMetrics = await VehicleModel.aggregate([
      {
        $group: {
          _id: '$type',
          avgBattery: { $avg: '$batteryPct' },
          avgFuel: { $avg: '$fuelPct' },
          totalVehicles: { $sum: 1 },
          avgMileage: { $avg: '$odometerKm' },
        },
      },
    ]);

    // 3. Telemetry alerts summary (harsh braking, geofence breaches)
    const alertMetrics = await TelemetryModel.aggregate([
      {
        $match: {
          $or: [{ harshBraking: true }, { geofenceViolation: true }],
        },
      },
      {
        $group: {
          _id: {
            harshBraking: '$harshBraking',
            geofenceViolation: '$geofenceViolation',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // 4. Rental summary
    const rentalRevenue = await RentalModel.aggregate([
      {
        $group: {
          _id: '$status',
          totalRevenue: { $sum: '$estimatedCost' },
          totalDistanceKm: { $sum: '$estimatedDistanceKm' },
          count: { $sum: 1 },
        },
      },
    ]);

    // 5. Hub capacity stats from Neo4j
    const hubStats = await neo4jGraphService.getHubInventoryStats();

    // 6. Recent alert logs from MongoDB
    const recentAlerts = await TelemetryModel.find({
      alertType: { $ne: null },
    })
      .sort({ timestamp: -1 })
      .limit(10);

    return res.json({
      success: true,
      data: {
        statusCounts,
        typeMetrics,
        alertMetrics,
        rentalRevenue,
        hubStats,
        recentAlerts,
      },
    });
  } catch (err: any) {
    console.error('getDashboardAnalytics error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

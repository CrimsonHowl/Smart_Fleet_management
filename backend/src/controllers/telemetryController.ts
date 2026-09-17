import { Request, Response } from 'express';
import { TelemetryModel } from '../models/Telemetry';
import { VehicleModel } from '../models/Vehicle';
import { telemetrySimulatorService } from '../services/telemetrySimulatorService';

export async function getLiveTelemetry(req: Request, res: Response) {
  try {
    const vehicles = await VehicleModel.find({}, {
      vin: 1,
      licensePlate: 1,
      make: 1,
      model: 1,
      type: 1,
      status: 1,
      batteryPct: 1,
      fuelPct: 1,
      currentLocation: 1,
      speedKmH: 1,
      engineTempC: 1,
      currentHubId: 1,
      lastSeen: 1,
    });
    return res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (err: any) {
    console.error('getLiveTelemetry error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getVehicleTelemetryHistory(req: Request, res: Response) {
  try {
    const { vin } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 60;

    const logs = await TelemetryModel.find({ vin })
      .sort({ timestamp: -1 })
      .limit(limit);

    return res.json({ success: true, count: logs.length, data: logs.reverse() });
  } catch (err: any) {
    console.error('getVehicleTelemetryHistory error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function triggerSimulationTick(req: Request, res: Response) {
  try {
    const result = await telemetrySimulatorService.tickSimulation();
    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('triggerSimulationTick error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function startSimulation(req: Request, res: Response) {
  try {
    const intervalMs = req.body.intervalMs || 3000;
    telemetrySimulatorService.startSimulation(intervalMs);
    return res.json({ success: true, message: 'Simulation started', intervalMs });
  } catch (err: any) {
    console.error('startSimulation error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function stopSimulation(req: Request, res: Response) {
  try {
    telemetrySimulatorService.stopSimulation();
    return res.json({ success: true, message: 'Simulation stopped' });
  } catch (err: any) {
    console.error('stopSimulation error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getSimulationStatus(req: Request, res: Response) {
  try {
    const status = telemetrySimulatorService.getStatus();
    return res.json({ success: true, data: status });
  } catch (err: any) {
    console.error('getSimulationStatus error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

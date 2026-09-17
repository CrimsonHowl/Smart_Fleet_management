import { Router } from 'express';
import {
  getLiveTelemetry,
  getVehicleTelemetryHistory,
  triggerSimulationTick,
  startSimulation,
  stopSimulation,
  getSimulationStatus,
} from '../controllers/telemetryController';

const router = Router();

router.get('/live', getLiveTelemetry);
router.get('/history/:vin', getVehicleTelemetryHistory);
router.post('/simulate/tick', triggerSimulationTick);
router.post('/simulate/start', startSimulation);
router.post('/simulate/stop', stopSimulation);
router.get('/simulate/status', getSimulationStatus);

export default router;

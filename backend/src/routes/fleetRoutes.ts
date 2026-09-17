import { Router } from 'express';
import { getVehicles, getVehicleByVin, findNearbyVehicles } from '../controllers/fleetController';

const router = Router();

router.get('/', getVehicles);
router.get('/nearby', findNearbyVehicles);
router.get('/:vin', getVehicleByVin);

export default router;
